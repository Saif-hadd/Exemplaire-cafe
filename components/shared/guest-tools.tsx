"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  CheckCircle2,
  ConciergeBell,
  Minus,
  Plus,
  Receipt,
  ShoppingBag,
  UtensilsCrossed,
  Droplets,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRestaurant } from "@/components/providers/restaurant-provider";
import { Visit, lineTotal, money, rpc } from "@/lib/restaurant";
export const openGuest = (panel: "cart" | "table" | "service") =>
  window.dispatchEvent(new CustomEvent("maison:guest", { detail: panel }));
export function GuestTools() {
  const r = useRestaurant();
  const [panel, setPanel] = useState<string | null>(null);
  const [number, setNumber] = useState("");
  const [code, setCode] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState<{
    reference: number;
    token: string;
  } | null>(null);
  const key = useRef("");
  useEffect(() => {
    const show = (e: Event) => {
      setError("");
      setPanel((e as CustomEvent).detail);
      setConfirmed(null);
    };
    window.addEventListener("maison:guest", show);
    const token = new URLSearchParams(window.location.search).get("table");
    if (token) {
      setBusy(true);
      rpc<Visit>("join_table", { p_qr_token: token })
        .then((v) => {
          r.setVisit(v);
          toast.success(`Welcome to table ${v.table}`);
        })
        .catch((e) => {
          setError(e.message);
          setPanel("table");
        })
        .finally(() => setBusy(false));
    }
    return () => window.removeEventListener("maison:guest", show);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!key.current) key.current = crypto.randomUUID();
  }, []);
  const identify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const v = await rpc<Visit>("join_table", {
        p_number: Number(number),
        p_code: code,
      });
      r.setVisit(v);
      toast.success(`You're at table ${v.table}`);
      setPanel(r.count ? "cart" : null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const submit = async () => {
    if (!r.visit || busy) return;
    setBusy(true);
    setError("");
    try {
      const fingerprint = JSON.stringify({
        session: r.visit.id,
        items: r.cart.map((i) => [
          i.product.id,
          i.quantity,
          i.modifiers.map((m) => m.id).sort(),
          i.notes,
        ]),
        notes,
      });
      const saved = JSON.parse(
        localStorage.getItem("maison-submission") || "null",
      );
      if (!saved || saved.fingerprint !== fingerprint)
        localStorage.setItem(
          "maison-submission",
          JSON.stringify({ fingerprint, key: key.current }),
        );
      const idempotency =
        saved?.fingerprint === fingerprint ? saved.key : key.current;
      const order = await rpc<{ id: string; reference: number; token: string }>(
        "place_order",
        {
          p_token: r.visit.token,
          p_key: idempotency,
          p_items: r.cart.map((i) => ({
            product_id: i.product.id,
            quantity: i.quantity,
            modifiers: i.modifiers.map((m) => m.id),
            notes: i.notes,
          })),
          p_notes: notes,
          p_expected_minor:
            r.total + Math.round((r.total * r.settings.tax_bps) / 10000),
        },
      );
      const history = JSON.parse(localStorage.getItem("maison-orders") || "[]");
      if (!history.some((o: { token: string }) => o.token === order.token))
        localStorage.setItem(
          "maison-orders",
          JSON.stringify([order, ...history].slice(0, 50)),
        );
      r.clear();
      setNotes("");
      setConfirmed(order);
      key.current = crypto.randomUUID();
      localStorage.removeItem("maison-submission");
    } catch (e) {
      setError((e as Error).message);
      r.refresh();
    } finally {
      setBusy(false);
    }
  };
  const request = async (type: string) => {
    if (!r.visit) {
      setPanel("table");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await rpc("request_service", { p_token: r.visit.token, p_type: type });
      toast.success(
        type === "bill"
          ? "Your bill has been requested. Pay your waiter or at the cashier."
          : "Your request is with our team. We’ll be right with you.",
      );
      setPanel(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const tax = Math.round((r.total * r.settings.tax_bps) / 10000);
  const unavailable = r.cart.some(
    (i) => !i.product.available || i.modifiers.some((m) => !m.available),
  );
  const pairings = r.products
    .filter(
      (p) =>
        p.available &&
        !r.cart.some((i) => i.product.id === p.id) &&
        r.rules.some(
          (rule) =>
            rule.recommended_product_id === p.id &&
            r.cart.some((i) => i.product.categoryId === rule.category_id),
        ),
    )
    .slice(0, 2);
  return (
    <Dialog
      open={!!panel}
      onOpenChange={(v) => {
        if (!v && !busy) setPanel(null);
      }}
    >
      <DialogContent className="guest-dialog max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <span className="eyebrow">MAISON OR · AT YOUR SERVICE</span>
          <DialogTitle className="!font-serif !text-3xl">
            {confirmed
              ? "A lovely choice."
              : panel === "cart"
                ? "Your table, your taste."
                : panel === "table"
                  ? "Make yourself at home."
                  : "A little assistance?"}
          </DialogTitle>
          <DialogDescription>
            {confirmed
              ? `Order #${confirmed.reference} has been sent to our team.`
              : panel === "table"
                ? "Scan your table QR or enter the table number and visit code from your waiter."
                : panel === "cart"
                  ? r.visit
                    ? `Your selection for table ${String(r.visit.table).padStart(2, "0")}.`
                    : "Review your selection, then identify your table."
                  : "Our team is always close by."}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {confirmed ? (
          <div className="confirmation-state">
            <CheckCircle2 size={52} />
            <p>We’ll take care of the rest.</p>
            <p className="text-sm text-muted-foreground">
              Payment is made in person after your meal.
            </p>
            <Link
              className="lux-button w-full"
              href="/orders"
              onClick={() => setPanel(null)}
            >
              Track my order <UtensilsCrossed size={16} />
            </Link>
          </div>
        ) : panel === "table" ? (
          <form className="space-y-5" onSubmit={identify}>
            {r.visit && (
              <div className="visit-note">
                <span className="live-dot" /> Currently seated at table{" "}
                {r.visit.table}
                <button type="button" onClick={() => r.setVisit(null)}>
                  Leave
                </button>
              </div>
            )}
            <label className="field-label">
              Table number
              <input
                className="lux-input"
                type="number"
                min="1"
                max="999"
                required
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="e.g. 05"
              />
            </label>
            <label className="field-label">
              Visit code
              <input
                className="lux-input uppercase"
                required
                minLength={6}
                maxLength={6}
                autoComplete="off"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6-character code from your waiter"
              />
            </label>
            <button className="lux-button w-full" disabled={busy}>
              {busy ? "Finding your table…" : "Confirm my table"}
              <Check size={16} />
            </button>
          </form>
        ) : panel === "cart" ? (
          <div>
            {!r.cart.length ? (
              <div className="empty-state">
                <ShoppingBag size={34} />
                <h3>Something delicious awaits.</h3>
                <p>Explore the menu to start your order.</p>
                <Link
                  href="/menu"
                  className="lux-button"
                  onClick={() => setPanel(null)}
                >
                  Explore the menu
                </Link>
              </div>
            ) : (
              <>
                <div className="cart-lines">
                  {r.cart.map((i) => (
                    <div className="cart-line" key={i.key}>
                      {i.product.image && <img src={i.product.image} alt="" />}
                      <div className="flex-1">
                        <h3>{i.product.name}</h3>
                        <p>{i.modifiers.map((m) => m.name).join(" · ")}</p>
                        {i.notes && <p>{i.notes}</p>}
                        <div className="quantity-control">
                          <button
                            aria-label={`Reduce ${i.product.name}`}
                            onClick={() => r.update(i.key, i.quantity - 1)}
                          >
                            <Minus size={13} />
                          </button>
                          <span>{i.quantity}</span>
                          <button
                            aria-label={`Increase ${i.product.name}`}
                            disabled={i.quantity >= 50}
                            onClick={() => r.update(i.key, i.quantity + 1)}
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      </div>
                      <span className="whitespace-nowrap text-sm">
                        {money(lineTotal(i))} <small>MAD</small>
                      </span>
                    </div>
                  ))}
                </div>
                {pairings.length > 0 && (
                  <div className="cart-pairings">
                    <span className="eyebrow">A LOVELY PAIRING</span>
                    {pairings.map((p) => (
                      <button
                        key={p.id}
                        onClick={() =>
                          r.add({
                            key: JSON.stringify([p.id, [], ""]),
                            product: p,
                            quantity: 1,
                            modifiers: [],
                            notes: "",
                          })
                        }
                      >
                        <span>
                          {p.name}
                          <small>{money(Math.round(p.price * 100))} MAD</small>
                        </span>
                        <Plus size={15} />
                      </button>
                    ))}
                  </div>
                )}
                <label className="field-label mt-5">
                  A note for our team{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                  <textarea
                    className="lux-input"
                    maxLength={1000}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anything we should know?"
                  />
                </label>
                <div className="bill-totals">
                  <p>
                    <span>Subtotal</span>
                    <span>{money(r.total)} MAD</span>
                  </p>
                  {tax > 0 && (
                    <p>
                      <span>Tax ({r.settings.tax_bps / 100}%)</span>
                      <span>{money(tax)} MAD</span>
                    </p>
                  )}
                  <p className="total">
                    <span>Total</span>
                    <span>{money(r.total + tax)} MAD</span>
                  </p>
                </div>
                {!r.ordering && (
                  <p className="form-error">
                    Ordering is currently unavailable. Please ask your waiter.
                  </p>
                )}
                {unavailable && (
                  <p className="form-error">
                    An item or option is no longer available. Please remove it
                    and review the menu.
                  </p>
                )}
                <button
                  className="lux-button w-full"
                  disabled={busy || !r.ordering || unavailable}
                  onClick={r.visit ? submit : () => setPanel("table")}
                >
                  {busy
                    ? "Sending your order…"
                    : r.visit
                      ? "Confirm order"
                      : "Identify my table"}
                  <UtensilsCrossed size={16} />
                </button>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Pay in person · Cash or card terminal · No account needed
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="service-options">
            {[
              { type: "waiter", label: "Call a waiter", icon: ConciergeBell },
              { type: "bill", label: "Request the bill", icon: Receipt },
              { type: "water", label: "A little water", icon: Droplets },
              {
                type: "assistance",
                label: "General assistance",
                icon: UtensilsCrossed,
              },
              { type: "cleaning", label: "Refresh the table", icon: Sparkles },
            ].map((x) => (
              <button
                disabled={busy}
                key={x.type}
                onClick={() => request(x.type)}
              >
                <x.icon size={20} />
                <span>{x.label}</span>
                <Plus size={15} />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
