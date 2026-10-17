"use client";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ChefHat,
  Clock3,
  Printer,
  Search,
  UtensilsCrossed,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOperations } from "@/components/providers/operations-provider";
import { useRestaurant } from "@/components/providers/restaurant-provider";
import {
  Order,
  money,
  nextStatus,
  statusAction,
  statusLabel,
} from "@/lib/restaurant";
import { useStaffCommand } from "./operations-screen";
export function OrdersBoard({ kitchen = false }: { kitchen?: boolean }) {
  const ops = useOperations();
  const { settings } = useRestaurant();
  const { run, busy } = useStaffCommand();
  const [filter, setFilter] = useState(kitchen ? "kitchen" : "active");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);
  const [cancel, setCancel] = useState<{ order: Order; status: string } | null>(
    null,
  );
  const [reason, setReason] = useState("");
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const tableOf = (o: Order) =>
    ops.tables.find(
      (t) => t.id === ops.sessions.find((s) => s.id === o.session_id)?.table_id,
    )?.number;
  const paid = (o: Order) =>
    ops.allocations
      .filter(
        (a) =>
          a.order_id === o.id &&
          !ops.adjustments.some((r) => r.payment_id === a.payment_id),
      )
      .reduce((s, a) => s + a.amount_minor, 0);
  const filtered = ops.orders
    .filter(
      (o) =>
        (filter === "all" ||
          (filter === "active" &&
            !["completed", "cancelled", "rejected"].includes(o.status)) ||
          (filter === "kitchen" &&
            ["pending", "accepted", "preparing", "ready"].includes(o.status)) ||
          filter === o.status) &&
        `#${o.reference} ${tableOf(o)} ${ops.items
          .filter((i) => i.order_id === o.id)
          .map((i) => i.name)
          .join(" ")}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const transition = (o: Order) =>
    run(
      "order_status",
      { id: o.id, status: nextStatus[o.status] },
      `Order #${o.reference}: ${statusLabel[nextStatus[o.status]]}`,
    );
  const canAdvance = (o: Order) =>
    !!nextStatus[o.status] &&
    (ops.profile?.role !== "kitchen" ||
      ["accepted", "preparing"].includes(o.status));
  return (
    <div className="space-y-6">
      <div className="board-toolbar no-print">
        <div className="period-tabs">
          {(kitchen
            ? [
                ["kitchen", "All tickets"],
                ["accepted", "Accepted"],
                ["preparing", "Preparing"],
                ["ready", "Ready"],
              ]
            : [
                ["active", "Active orders"],
                ["pending", "New orders"],
                ["ready", "Ready to serve"],
                ["all", "History"],
              ]
          ).map(([value, label]) => (
            <button
              key={value}
              className={filter === value ? "active" : ""}
              onClick={() => setFilter(value)}
            >
              {label}
              <span>
                {
                  ops.orders.filter((o) =>
                    value === "active"
                      ? !["completed", "cancelled", "rejected"].includes(
                          o.status,
                        )
                      : value === "all"
                        ? true
                        : value === "kitchen"
                          ? [
                              "pending",
                              "accepted",
                              "preparing",
                              "ready",
                            ].includes(o.status)
                          : o.status === value,
                  ).length
                }
              </span>
            </button>
          ))}
        </div>
        <div className="menu-search !max-w-xs">
          <Search size={15} />
          <input
            aria-label="Search orders"
            placeholder="Order, table, or dish…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className={`order-board ${kitchen ? "kitchen-board" : ""}`}>
        {filtered.map((o) => {
          const items = ops.items.filter((i) => i.order_id === o.id);
          const minutes = Math.max(
            0,
            Math.floor((now - Date.parse(o.created_at)) / 60000),
          );
          return (
            <article
              key={o.id}
              className={`order-ticket ${minutes >= 20 && ["pending", "accepted", "preparing"].includes(o.status) ? "ticket-priority" : ""}`}
            >
              <div className="ticket-heading">
                <div>
                  <span className="eyebrow">ORDER #{o.reference}</span>
                  <h2>Table {String(tableOf(o) || "—").padStart(2, "0")}</h2>
                </div>
                <span className={`status-badge status-${o.status}`}>
                  {statusLabel[o.status]}
                </span>
              </div>
              <div className="ticket-time">
                <Clock3 size={12} />
                {minutes} min ago
                <span>
                  {new Date(o.created_at).toLocaleTimeString("en-GB", {
                    timeZone: settings.timezone,
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="ticket-items">
                {items.map((i) => (
                  <div key={i.id}>
                    <b>{i.quantity}</b>
                    <div>
                      <h3>{i.name}</h3>
                      {i.modifiers.length > 0 && (
                        <p>{i.modifiers.map((m) => m.name).join(" · ")}</p>
                      )}
                      {i.notes && (
                        <p className="ticket-instructions">{i.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {o.notes && (
                <div className="ticket-note">
                  <strong>Guest note</strong>
                  {o.notes}
                </div>
              )}
              {o.reason && <p className="form-error">{o.reason}</p>}
              {!kitchen && ops.profile?.role !== "kitchen" && (
                <div className="ticket-total">
                  <span>
                    {money(o.total_minor)} <small>MAD</small>
                  </span>
                  <span
                    className={`payment-badge ${paid(o) >= o.total_minor ? "paid" : ""}`}
                  >
                    {paid(o) >= o.total_minor
                      ? "Paid"
                      : paid(o) > 0
                        ? "Partially paid"
                        : "Unpaid"}
                  </span>
                </div>
              )}
              <div className="ticket-actions no-print">
                {canAdvance(o) ? (
                  <button
                    className="lux-button w-full"
                    disabled={busy}
                    onClick={() => transition(o)}
                  >
                    {statusAction[o.status]}
                    <ArrowRight size={14} />
                  </button>
                ) : (
                  <button
                    className="lux-button secondary w-full"
                    onClick={() => setSelected(o)}
                  >
                    View order
                  </button>
                )}
                <div>
                  <button onClick={() => setSelected(o)}>
                    Details & ticket <Printer size={12} />
                  </button>
                  {["pending", "accepted", "preparing"].includes(o.status) &&
                    ops.profile?.role !== "kitchen" && (
                      <button
                        onClick={() => {
                          setReason("");
                          setCancel({
                            order: o,
                            status:
                              o.status === "pending" ? "rejected" : "cancelled",
                          });
                        }}
                      >
                        {o.status === "pending" ? "Reject" : "Cancel"}
                      </button>
                    )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {!filtered.length && (
        <div className="ops-panel empty-state">
          <ChefHat size={35} />
          <h3>
            {kitchen
              ? "A clear pass. A fresh start."
              : "Everything is in hand."}
          </h3>
          <p>
            {kitchen
              ? "New orders appear here as your guests order."
              : "No orders match your current view."}
          </p>
        </div>
      )}
      <Dialog
        open={!!cancel}
        onOpenChange={(v) => {
          if (!v) setCancel(null);
        }}
      >
        <DialogContent className="guest-dialog">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              {cancel?.status === "rejected" ? "Reject" : "Cancel"} order #
              {cancel?.order.reference}
            </DialogTitle>
            <DialogDescription>
              A reason will be recorded and shown to the guest.
            </DialogDescription>
          </DialogHeader>
          <label className="field-label">
            Reason
            <textarea
              className="lux-input"
              value={reason}
              maxLength={500}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <button
            className="lux-button"
            disabled={busy || reason.trim().length < 3}
            onClick={async () => {
              if (
                cancel &&
                (await run("order_status", {
                  id: cancel.order.id,
                  status: cancel.status,
                  reason,
                }))
              )
                setCancel(null);
            }}
          >
            Confirm{" "}
            {cancel?.status === "rejected" ? "rejection" : "cancellation"}
          </button>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!selected}
        onOpenChange={(v) => {
          if (!v) setSelected(null);
        }}
      >
        <DialogContent className="guest-dialog print-ticket">
          <DialogHeader>
            <DialogTitle className="font-serif text-3xl">
              Kitchen ticket · #{selected?.reference}
            </DialogTitle>
            <DialogDescription>
              Table {selected && tableOf(selected)} ·{" "}
              {selected && statusLabel[selected.status]}
            </DialogDescription>
          </DialogHeader>
          <div className="ticket-items">
            {ops.items
              .filter((i) => i.order_id === selected?.id)
              .map((i) => (
                <div key={i.id}>
                  <b>{i.quantity}</b>
                  <div>
                    <h3>{i.name}</h3>
                    <p>{i.modifiers.map((m) => m.name).join(" · ")}</p>
                    <p>{i.notes}</p>
                  </div>
                </div>
              ))}
          </div>
          {selected?.notes && <p className="ticket-note">{selected.notes}</p>}
          <button
            className="lux-button no-print"
            onClick={() => window.print()}
          >
            <Printer size={16} />
            Print kitchen ticket
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export function ServiceBoard() {
  const ops = useOperations();
  const { run, busy } = useStaffCommand();
  const [history, setHistory] = useState(false);
  return (
    <div className="space-y-5">
      <div className="period-tabs no-print">
        <button
          className={!history ? "active" : ""}
          onClick={() => setHistory(false)}
        >
          Open requests
        </button>
        <button
          className={history ? "active" : ""}
          onClick={() => setHistory(true)}
        >
          Resolved
        </button>
      </div>
      <div className="order-board">
        {ops.requests
          .filter((r) =>
            history ? r.status === "resolved" : r.status !== "resolved",
          )
          .sort((a, b) => a.created_at.localeCompare(b.created_at))
          .map((r) => {
            const table = ops.tables.find(
              (t) =>
                t.id ===
                ops.sessions.find((s) => s.id === r.session_id)?.table_id,
            );
            return (
              <article className="ops-panel !p-6" key={r.id}>
                <span className="eyebrow">
                  TABLE {table?.number.toString().padStart(2, "0")}
                </span>
                <h2 className="font-serif text-3xl mt-3 capitalize">
                  {r.type === "bill"
                    ? "Bill requested"
                    : r.type === "waiter"
                      ? "Waiter requested"
                      : r.type}
                </h2>
                <p className="text-xs text-muted-foreground mt-3">
                  {new Date(r.created_at).toLocaleString()} · {r.status}
                </p>
                {r.status !== "resolved" && (
                  <button
                    className="lux-button mt-7 w-full"
                    disabled={busy}
                    onClick={() =>
                      run(
                        "request_status",
                        {
                          id: r.id,
                          status:
                            r.status === "pending"
                              ? "acknowledged"
                              : "resolved",
                        },
                        "Guest request updated",
                      )
                    }
                  >
                    {r.status === "pending"
                      ? "Acknowledge request"
                      : "Mark resolved"}
                    <CheckIcon />
                  </button>
                )}
              </article>
            );
          })}
      </div>
      {!ops.requests.some((r) =>
        history ? r.status === "resolved" : r.status !== "resolved",
      ) && (
        <div className="ops-panel empty-state">
          <UtensilsCrossed size={30} />
          <h3>Every little thing, taken care of.</h3>
          <p>No {history ? "resolved" : "open"} guest requests.</p>
        </div>
      )}
    </div>
  );
}
function CheckIcon() {
  return <ArrowRight size={14} />;
}
