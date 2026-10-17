"use client";
import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  LayoutGrid,
  Plus,
  Receipt,
  Users,
  Wallet,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOperations } from "@/components/providers/operations-provider";
import { Session, Table, money, minor, statusLabel } from "@/lib/restaurant";
import { useStaffCommand } from "./operations-screen";
export function useVisitBill(sid: string) {
  const ops = useOperations();
  const orders = ops.orders.filter((o) => o.session_id === sid);
  const total = orders
    .filter((o) => !["cancelled", "rejected"].includes(o.status))
    .reduce((s, o) => s + o.total_minor, 0);
  const payments = ops.payments.filter((p) => p.session_id === sid);
  const paid =
    payments.reduce((s, p) => s + p.amount_minor, 0) -
    ops.adjustments
      .filter((r) => payments.some((p) => p.id === r.payment_id))
      .reduce((s, r) => s + r.amount_minor, 0);
  return { orders, total, paid, remaining: total - paid, payments };
}
export function PaymentDialog({
  session,
  onClose,
}: {
  session: Session | null;
  onClose: () => void;
}) {
  const ops = useOperations();
  const { run, busy } = useStaffCommand();
  const bill = useVisitBill(session?.id || "");
  const [method, setMethod] = useState("cash");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState("");
  const [key, setKey] = useState("");
  const open = !!session;
  const table = ops.tables.find((t) => t.id === session?.table_id);
  const confirm = async () => {
    try {
      const value = minor(amount);
      if (!checked || value <= 0 || value > bill.remaining)
        throw new Error(
          "Confirm receipt of a positive amount within the remaining balance.",
        );
      const fingerprint = JSON.stringify([
        session!.id,
        value,
        method,
        reference,
      ]);
      const saved = JSON.parse(
        localStorage.getItem("maison-payment") || "null",
      );
      const token =
        saved?.fingerprint === fingerprint
          ? saved.key
          : key || crypto.randomUUID();
      setKey(token);
      localStorage.setItem(
        "maison-payment",
        JSON.stringify({ fingerprint, key: token }),
      );
      if (
        await run(
          "payment",
          {
            session_id: session!.id,
            amount_minor: value,
            method,
            reference,
            key: token,
          },
          "Offline payment recorded",
        )
      ) {
        localStorage.removeItem("maison-payment");
        setAmount("");
        setReference("");
        setChecked(false);
        setKey("");
        onClose();
      }
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !busy) onClose();
      }}
    >
      <DialogContent className="guest-dialog">
        <DialogHeader>
          <span className="eyebrow">OFFLINE PAYMENT CONFIRMATION</span>
          <DialogTitle className="!font-serif !text-3xl">
            Settle a lovely visit.
          </DialogTitle>
          <DialogDescription>
            Table {table?.number} · Record money already received in person.
          </DialogDescription>
        </DialogHeader>
        <div className="bill-totals !py-0">
          <p>
            <span>Table bill</span>
            <span>{money(bill.total)} MAD</span>
          </p>
          <p>
            <span>Already paid</span>
            <span>{money(bill.paid)} MAD</span>
          </p>
          <p className="total">
            <span>Remaining</span>
            <span>{money(bill.remaining)} MAD</span>
          </p>
        </div>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="payment-methods">
          {[
            ["cash", "Cash", Wallet],
            ["terminal", "Card terminal", CreditCard],
            ["other", "Other", Receipt],
          ].map(([value, label, Icon]) => {
            const I = Icon as typeof Wallet;
            return (
              <button
                className={method === value ? "active" : ""}
                key={String(value)}
                onClick={() => setMethod(String(value))}
              >
                <I size={20} />
                {String(label)}
              </button>
            );
          })}
        </div>
        <label className="field-label">
          Amount received (MAD)
          <input
            aria-label="Amount received"
            className="lux-input"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={(bill.remaining / 100).toFixed(2)}
          />
          <button
            className="text-link mt-2"
            onClick={() => setAmount((bill.remaining / 100).toFixed(2))}
          >
            Use remaining balance
          </button>
        </label>
        <label className="field-label">
          Payment reference (optional)
          <input
            className="lux-input"
            maxLength={200}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Receipt or terminal reference — no card details"
          />
        </label>
        <label className="payment-confirm-check">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          I confirm that this amount has been received physically.
        </label>
        <button
          className="lux-button w-full"
          disabled={busy || !checked || !amount}
          onClick={confirm}
        >
          {busy ? "Recording payment…" : "Confirm payment"}
          <CheckCircle2 size={16} />
        </button>
        <p className="text-center text-xs text-muted-foreground">
          Recorded under {ops.profile?.display_name}. An audit record is
          retained.
        </p>
      </DialogContent>
    </Dialog>
  );
}
export function TablesBoard() {
  const ops = useOperations();
  const { run, busy } = useStaffCommand();
  const [zone, setZone] = useState("all");
  const [selected, setSelected] = useState<Table | null>(null);
  const [create, setCreate] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [seats, setSeats] = useState("2");
  const [zoneId, setZoneId] = useState("");
  const [newZone, setNewZone] = useState("");
  const [pay, setPay] = useState<Session | null>(null);
  const session = ops.sessions.find(
    (s) => s.table_id === selected?.id && !s.closed_at,
  );
  const bill = useVisitBill(session?.id || "");
  const manager = ["owner", "manager"].includes(ops.profile?.role || "");
  const collect =
    manager || ops.profile?.role === "cashier" || ops.profile?.can_collect;
  const current = ops.tables.find((t) => t.id === selected?.id) || selected;
  return (
    <div className="space-y-6">
      <div className="board-toolbar">
        <div className="period-tabs">
          <button
            className={zone === "all" ? "active" : ""}
            onClick={() => setZone("all")}
          >
            All spaces
          </button>
          {ops.zones.map((z) => (
            <button
              key={z.id}
              className={zone === z.id ? "active" : ""}
              onClick={() => setZone(z.id)}
            >
              {z.name}
            </button>
          ))}
        </div>
        {manager && (
          <button className="lux-button !py-3" onClick={() => setCreate(true)}>
            <Plus size={15} />
            Add a table
          </button>
        )}
      </div>
      <div className="table-status-legend">
        {[
          "available",
          "occupied",
          "ordering",
          "awaiting_payment",
          "cleaning",
          "disabled",
        ].map((s) => (
          <span key={s}>
            <i className={`table-${s}`} />
            {s.replace("_", " ")}
          </span>
        ))}
      </div>
      <div className="floor-grid">
        {ops.tables
          .filter((t) => zone === "all" || t.zone_id === zone)
          .sort((a, b) => a.number - b.number)
          .map((t) => {
            const visit = ops.sessions.find(
              (s) => s.table_id === t.id && !s.closed_at,
            );
            const due = visit
              ? ops.orders
                  .filter(
                    (o) =>
                      o.session_id === visit.id &&
                      !["cancelled", "rejected"].includes(o.status),
                  )
                  .reduce((s, o) => s + o.total_minor, 0) -
                ops.payments
                  .filter(
                    (p) =>
                      p.session_id === visit.id &&
                      !ops.adjustments.some((a) => a.payment_id === p.id),
                  )
                  .reduce((s, p) => s + p.amount_minor, 0)
              : 0;
            return (
              <button
                className={`floor-table table-${t.state}`}
                onClick={() => setSelected(t)}
                key={t.id}
              >
                <div>
                  <span>
                    {ops.zones.find((z) => z.id === t.zone_id)?.name ||
                      "Dining room"}
                  </span>
                  <Users size={13} />
                  {t.seats}
                </div>
                <span className="table-shape">
                  <b>{String(t.number).padStart(2, "0")}</b>
                  <small>{t.state.replace("_", " ")}</small>
                </span>
                <footer>
                  {visit ? (
                    <>
                      <span className="live-dot" />
                      Active visit <b>{money(due)} MAD</b>
                    </>
                  ) : (
                    <span>
                      {t.state === "available"
                        ? "Ready for a lovely visit"
                        : t.state.replace("_", " ")}
                    </span>
                  )}
                </footer>
              </button>
            );
          })}
      </div>
      {!ops.tables.length && (
        <div className="ops-panel empty-state">
          <LayoutGrid size={34} />
          <h3>Your restaurant starts with a table.</h3>
          <p>
            Add your dining spaces and tables, then open a visit for your first
            guests.
          </p>
        </div>
      )}
      <Dialog open={create} onOpenChange={setCreate}>
        <DialogContent className="guest-dialog">
          <DialogHeader>
            <DialogTitle className="!font-serif !text-3xl">
              A new place at the table.
            </DialogTitle>
            <DialogDescription>
              Table numbers are unique across the restaurant.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await run(
                  "create_table",
                  {
                    number: Number(tableNumber),
                    seats: Number(seats),
                    zone_id: zoneId,
                  },
                  "Table created",
                )
              ) {
                setCreate(false);
                setTableNumber("");
              }
            }}
          >
            <label className="field-label">
              Table number
              <input
                className="lux-input"
                type="number"
                min="1"
                max="999"
                required
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
              />
            </label>
            <label className="field-label">
              Seats
              <input
                className="lux-input"
                type="number"
                min="1"
                max="30"
                required
                value={seats}
                onChange={(e) => setSeats(e.target.value)}
              />
            </label>
            <label className="field-label">
              Space
              <select
                className="lux-input"
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
              >
                <option value="">Dining room</option>
                {ops.zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="lux-button w-full" disabled={busy}>
              Create table
            </button>
          </form>
          <div className="border-t pt-4">
            <label className="field-label">
              Create a space
              <div className="flex gap-2">
                <input
                  className="lux-input"
                  value={newZone}
                  maxLength={100}
                  onChange={(e) => setNewZone(e.target.value)}
                  placeholder="e.g. Outdoor Terrace"
                />
                <button
                  className="outline-action mt-2"
                  disabled={busy || !newZone.trim()}
                  onClick={async () => {
                    if (
                      await run(
                        "zone",
                        { name: newZone.trim() },
                        "Space created",
                      )
                    )
                      setNewZone("");
                  }}
                >
                  Add
                </button>
              </div>
            </label>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!selected}
        onOpenChange={(v) => {
          if (!v) setSelected(null);
        }}
      >
        <DialogContent className="guest-dialog max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <span className="eyebrow">
              THE FLOOR · {current?.state.replace("_", " ")}
            </span>
            <DialogTitle className="!font-serif !text-3xl">
              Table {String(current?.number).padStart(2, "0")}
            </DialogTitle>
            <DialogDescription>
              {session
                ? "An open visit. A complete view."
                : "Ready for your next guests."}
            </DialogDescription>
          </DialogHeader>
          {session ? (
            <>
              <div className="visit-note">
                Visit code{" "}
                <strong className="tracking-widest">{session.join_code}</strong>
                <span className="ml-auto text-[9px]">
                  {Date.parse(session.expires_at) < Date.now()
                    ? "Expired — settle & close"
                    : "Expires " +
                      new Date(session.expires_at).toLocaleTimeString()}
                </span>
              </div>
              <div className="space-y-3">
                {bill.orders.map((o) => (
                  <div
                    className="flex justify-between border-b pb-3 text-xs"
                    key={o.id}
                  >
                    <span>
                      #{o.reference} · {statusLabel[o.status]}
                    </span>
                    <span>{money(o.total_minor)} MAD</span>
                  </div>
                ))}
              </div>
              <div className="bill-totals !py-0">
                <p>
                  <span>Total bill</span>
                  <span>{money(bill.total)} MAD</span>
                </p>
                <p>
                  <span>Received</span>
                  <span>{money(bill.paid)} MAD</span>
                </p>
                <p className="total">
                  <span>Outstanding</span>
                  <span>{money(bill.remaining)} MAD</span>
                </p>
              </div>
              {collect && bill.remaining > 0 && (
                <button
                  className="lux-button w-full"
                  onClick={() => {
                    setPay(session);
                    setSelected(null);
                  }}
                >
                  Record offline payment <CreditCard size={16} />
                </button>
              )}
              <button
                className="lux-button secondary w-full"
                disabled={
                  busy ||
                  bill.remaining !== 0 ||
                  bill.orders.some(
                    (o) =>
                      !["completed", "cancelled", "rejected"].includes(
                        o.status,
                      ),
                  )
                }
                onClick={async () => {
                  if (
                    await run(
                      "close_session",
                      { session_id: session.id },
                      "Visit closed. Table is ready for cleaning.",
                    )
                  )
                    setSelected(null);
                }}
              >
                Close settled visit
              </button>
            </>
          ) : (
            manager && (
              <button
                className="lux-button"
                disabled={
                  busy ||
                  ["disabled", "cleaning"].includes(current?.state || "")
                }
                onClick={() =>
                  run("open_session", { id: current?.id }, "Table visit opened")
                }
              >
                Welcome guests · Open visit <ArrowRight size={15} />
              </button>
            )
          )}
          {manager && (
            <div className="space-y-4 border-t pt-4">
              <label className="field-label">
                Assigned waiter
                <select
                  className="lux-input"
                  value={current?.assigned_to || ""}
                  onChange={(e) =>
                    run("assign_table", {
                      id: current?.id,
                      staff_id: e.target.value,
                    })
                  }
                >
                  <option value="">Unassigned</option>
                  {ops.staff
                    .filter((s) => s.role === "waiter" && s.active)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.display_name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="field-label">
                Table state
                <select
                  className="lux-input"
                  value={current?.state}
                  disabled={busy}
                  onChange={(e) =>
                    run("table_state", {
                      id: current?.id,
                      state: e.target.value,
                    })
                  }
                >
                  {[
                    "available",
                    "occupied",
                    "ordering",
                    "awaiting_payment",
                    "cleaning",
                    "disabled",
                  ].map((s) => (
                    <option key={s} value={s}>
                      {s.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <PaymentDialog
        key={pay?.id || "closed"}
        session={pay}
        onClose={() => setPay(null)}
      />
    </div>
  );
}
export function PaymentsBoard() {
  const ops = useOperations();
  const [selected, setSelected] = useState<Session | null>(null);
  const [refund, setRefund] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const { run, busy } = useStaffCommand();
  return (
    <div className="space-y-6">
      <section className="ops-panel">
        <div className="panel-heading">
          <div>
            <h2>Open table bills</h2>
            <p>One visit. Multiple orders. One clear balance.</p>
          </div>
          <Wallet size={18} />
        </div>
        <div className="open-bills">
          {ops.sessions
            .filter(
              (s) =>
                !s.closed_at ||
                ops.orders
                  .filter(
                    (o) =>
                      o.session_id === s.id &&
                      !["cancelled", "rejected"].includes(o.status),
                  )
                  .reduce((sum, o) => sum + o.total_minor, 0) >
                  ops.payments
                    .filter(
                      (p) =>
                        p.session_id === s.id &&
                        !ops.adjustments.some((r) => r.payment_id === p.id),
                    )
                    .reduce((sum, p) => sum + p.amount_minor, 0),
            )
            .map((s) => (
              <BillRow key={s.id} session={s} onPay={() => setSelected(s)} />
            ))}
          {!ops.sessions.some((s) => !s.closed_at) && (
            <div className="empty-state !py-10">
              <h3>All settled for now.</h3>
              <p>Open visits and their bills appear here.</p>
            </div>
          )}
        </div>
      </section>
      <section className="ops-panel">
        <div className="panel-heading">
          <div>
            <h2>A complete payment record</h2>
            <p>Immutable receipts. Auditable corrections.</p>
          </div>
        </div>
        <div className="ops-table-wrap">
          <table className="ops-table">
            <thead>
              <tr>
                <th>TABLE</th>
                <th>RECEIVED</th>
                <th>METHOD</th>
                <th>RECORDED BY</th>
                <th>DATE</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {ops.payments
                .slice()
                .sort((a, b) => b.created_at.localeCompare(a.created_at))
                .map((p) => {
                  const correction = ops.adjustments.find(
                    (a) => a.payment_id === p.id,
                  );
                  return (
                    <tr key={p.id}>
                      <td>
                        {
                          ops.tables.find(
                            (t) =>
                              t.id ===
                              ops.sessions.find((s) => s.id === p.session_id)
                                ?.table_id,
                          )?.number
                        }
                      </td>
                      <td>
                        {money(p.amount_minor)} MAD
                        {p.reference && <small>{p.reference}</small>}
                      </td>
                      <td className="capitalize">
                        {p.method === "terminal" ? "Card terminal" : p.method}
                      </td>
                      <td>
                        {ops.staff.find((s) => s.id === p.confirmed_by)
                          ?.display_name || p.confirmed_by.slice(0, 8)}
                      </td>
                      <td>{new Date(p.created_at).toLocaleString()}</td>
                      <td>
                        {correction ? (
                          <span
                            className="status-badge status-cancelled"
                            title={correction.reason}
                          >
                            Refunded
                          </span>
                        ) : (
                          <>
                            <span className="status-badge status-completed">
                              Recorded
                            </span>
                            {ops.profile?.role === "owner" && (
                              <button
                                className="ml-3 text-xs text-muted-foreground underline"
                                onClick={() => {
                                  setReason("");
                                  setRefund(p.id);
                                }}
                              >
                                Refund
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          {!ops.payments.length && (
            <p className="p-10 text-center text-xs text-muted-foreground">
              Payment history begins with your first confirmed receipt.
            </p>
          )}
        </div>
      </section>
      <PaymentDialog
        key={selected?.id || "closed"}
        session={selected}
        onClose={() => setSelected(null)}
      />
      <Dialog
        open={!!refund}
        onOpenChange={(v) => {
          if (!v) setRefund(null);
        }}
      >
        <DialogContent className="guest-dialog">
          <DialogHeader>
            <DialogTitle className="!font-serif !text-3xl">
              Record a full refund
            </DialogTitle>
            <DialogDescription>
              Return the money physically first. This correction retains the
              original receipt and reopens the corresponding balance.
            </DialogDescription>
          </DialogHeader>
          <label className="field-label">
            Reason
            <textarea
              className="lux-input"
              maxLength={500}
              minLength={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <button
            className="lux-button"
            disabled={busy || reason.trim().length < 3}
            onClick={async () => {
              if (
                await run("refund", { id: refund, reason }, "Refund recorded")
              )
                setRefund(null);
            }}
          >
            Confirm money returned
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function BillRow({
  session: s,
  onPay,
}: {
  session: Session;
  onPay: () => void;
}) {
  const ops = useOperations();
  const bill = useVisitBill(s.id);
  const table = ops.tables.find((t) => t.id === s.table_id);
  const canPay = ops.profile?.role !== "waiter" || ops.profile.can_collect;
  return (
    <div className="open-bill-row">
      <span className="table-number">
        {String(table?.number).padStart(2, "0")}
      </span>
      <div>
        <h3>
          Table {table?.number}
          {s.closed_at ? " · prior visit correction" : ""}
        </h3>
        <small>
          {bill.orders.length} orders · {money(bill.paid)} MAD received
        </small>
      </div>
      <strong>
        {money(bill.remaining)} <small>MAD</small>
      </strong>
      <button
        className="outline-action"
        disabled={!canPay || bill.remaining <= 0}
        onClick={onPay}
      >
        Confirm payment <ArrowRight size={13} />
      </button>
    </div>
  );
}
