"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  ChefHat,
  Clock3,
  RefreshCw,
  UtensilsCrossed,
} from "lucide-react";
import { CustomerHeader } from "@/components/shared/customer-header";
import { CustomerFooter } from "@/components/shared/customer-footer";
import { OrderItem, money, rpc, statusLabel } from "@/lib/restaurant";
import { openGuest } from "@/components/shared/guest-tools";
type Tracked = {
  id: string;
  reference: number;
  status: string;
  reason?: string;
  total_minor: number;
  paid_minor: number;
  table: number;
  created_at: string;
  items: OrderItem[];
  history: { status: string; created_at: string }[];
};
export default function OrdersPage() {
  const [orders, setOrders] = useState<Tracked[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState("");
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const saved = JSON.parse(
          localStorage.getItem("maison-orders") || "[]",
        ) as { token: string }[];
        const rows = await Promise.all(
          saved.map((o) =>
            rpc<Tracked | null>("track_order", { p_token: o.token }),
          ),
        );
        if (active) {
          setOrders(rows.filter((o): o is Tracked => !!o));
          setError("");
          setUpdated(
            new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          );
        }
      } catch {
        if (active)
          setError(
            "Connection interrupted. Your order is safe; we’ll reconnect automatically.",
          );
      } finally {
        if (active) setLoading(false);
      }
    };
    refresh();
    const timer = setInterval(refresh, 5000);
    window.addEventListener("online", refresh);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("online", refresh);
    };
  }, []);
  const steps = [
    "pending",
    "accepted",
    "preparing",
    "ready",
    "served",
    "completed",
  ];
  return (
    <div className="hospitality-page">
      <CustomerHeader page="orders" />
      <main className="section-container pb-20">
        <section className="menu-heading !px-0">
          <span className="eyebrow">FROM OUR KITCHEN TO YOUR TABLE</span>
          <h1>Good things are on their way.</h1>
          <p>
            {orders.length
              ? `Your visit, at a glance. Last checked ${updated}.`
              : "Your orders will appear here after you confirm your selection."}
          </p>
        </section>
        {error && (
          <p className="form-error" role="status">
            {error}
          </p>
        )}
        {loading ? (
          <div className="h-52 animate-pulse rounded bg-secondary" />
        ) : !orders.length ? (
          <div className="empty-state">
            <UtensilsCrossed size={38} />
            <h3>A delicious beginning.</h3>
            <p>
              Your order history stays on this device. Ready to find something
              lovely?
            </p>
            <Link className="lux-button" href="/menu">
              Explore the menu
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((o) => (
              <article className="tracking-card" key={o.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="eyebrow">
                      TABLE {String(o.table).padStart(2, "0")} · ORDER #
                      {o.reference}
                    </span>
                    <h2 className="font-serif text-3xl mt-1">
                      {statusLabel[o.status]}
                    </h2>
                  </div>
                  <span className={`status-badge status-${o.status}`}>
                    {o.status === "preparing" ? (
                      <ChefHat size={13} />
                    ) : (
                      <Clock3 size={13} />
                    )}{" "}
                    {statusLabel[o.status]}
                  </span>
                </div>
                {!["cancelled", "rejected"].includes(o.status) ? (
                  <ol className="order-progress">
                    {steps.map((s, i) => (
                      <li
                        key={s}
                        className={i <= steps.indexOf(o.status) ? "done" : ""}
                      >
                        <span>
                          {i < steps.indexOf(o.status) ? (
                            <Check size={13} />
                          ) : (
                            i + 1
                          )}
                        </span>
                        <small>{statusLabel[s]}</small>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="form-error mt-5">{o.reason}</p>
                )}
                <div className="mt-6 space-y-3">
                  {o.items.map((i) => (
                    <div
                      className="flex justify-between text-sm gap-4"
                      key={i.id}
                    >
                      <div>
                        <span>
                          {i.quantity} × {i.name}
                        </span>
                        {i.modifiers.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {i.modifiers.map((m) => m.name).join(" · ")}
                          </p>
                        )}
                        {i.notes && (
                          <p className="text-xs text-muted-foreground">
                            {i.notes}
                          </p>
                        )}
                      </div>
                      <span>{money(i.line_minor)} MAD</span>
                    </div>
                  ))}
                </div>
                <div className="bill-totals">
                  <p className="total">
                    <span>Order total</span>
                    <span>{money(o.total_minor)} MAD</span>
                  </p>
                  <p>
                    <span>
                      {o.paid_minor >= o.total_minor
                        ? "Paid"
                        : o.paid_minor > 0
                          ? "Partially paid"
                          : "Pay in person"}
                    </span>
                    <span>
                      {money(Math.max(0, o.total_minor - o.paid_minor))} MAD
                      remaining
                    </span>
                  </p>
                </div>
              </article>
            ))}
            <button
              className="lux-button secondary"
              onClick={() => openGuest("service")}
            >
              Request your bill or a little assistance
            </button>
          </div>
        )}
      </main>
      <CustomerFooter />
    </div>
  );
}
