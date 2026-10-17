"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useOperations } from "@/components/providers/operations-provider";
import { useRestaurant } from "@/components/providers/restaurant-provider";
import { businessDate } from "@/lib/accounting";
import { minor, money } from "@/lib/restaurant";
import { supabase } from "@/lib/supabase";
import { useStaffCommand } from "./operations-screen";
type Closing = {
  id: string;
  business_date: string;
  expected_cash_minor: number;
  counted_cash_minor: number;
  difference_minor: number;
  notes: string;
  created_at: string;
};
export function DailyClosing({
  date,
  expectedCash,
}: {
  date: string;
  expectedCash: number;
}) {
  const ops = useOperations();
  const { run, busy } = useStaffCommand();
  const [counted, setCounted] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [closings, setClosings] = useState<Closing[]>([]);
  useEffect(() => {
    supabase
      .from("daily_closings")
      .select("*")
      .order("business_date", { ascending: false })
      .limit(60)
      .then(({ data, error }) => {
        if (!error) setClosings(data || []);
      });
  }, [ops.updated]);
  const saved = closings.find((c) => c.business_date === date);
  return (
    <section className="ops-panel">
      <div className="panel-heading">
        <div>
          <h2>A considered close to the day.</h2>
          <p>
            {date} · Count cash receipts less cash refunds for this business
            day.
          </p>
        </div>
        <span className="status-badge status-completed">
          {saved ? "Closing recorded" : "Awaiting reconciliation"}
        </span>
      </div>
      {!saved ? (
        <form
          className="p-6 space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              if (
                await run(
                  "daily_close",
                  { date, counted_minor: minor(counted), notes },
                  "Daily closing recorded",
                )
              ) {
                setCounted("");
                setNotes("");
                setConfirmed(false);
              }
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <label className="field-label">
              Expected net cash collections
              <input
                className="lux-input"
                readOnly
                value={`${money(expectedCash)} MAD`}
              />
            </label>
            <label className="field-label">
              Physically counted cash collections (MAD)
              <input
                aria-label="Counted cash"
                className="lux-input"
                required
                inputMode="decimal"
                value={counted}
                onChange={(e) => setCounted(e.target.value)}
              />
            </label>
          </div>
          <label className="field-label">
            Reconciliation notes
            <textarea
              className="lux-input"
              maxLength={1000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Explain any variance; exclude opening float and unrelated cash movements."
            />
          </label>
          <label className="payment-confirm-check">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            I have counted the cash and reviewed today’s receipts and refunds.
          </label>
          <button
            className="lux-button"
            disabled={busy || !confirmed || !counted}
          >
            Confirm daily close
          </button>
        </form>
      ) : (
        <div className="report-metrics">
          <div>
            <span>Expected cash</span>
            <strong>{money(saved.expected_cash_minor)} MAD</strong>
          </div>
          <div>
            <span>Counted cash</span>
            <strong>{money(saved.counted_cash_minor)} MAD</strong>
          </div>
          <div>
            <span>Cash variance</span>
            <strong>{money(saved.difference_minor)} MAD</strong>
          </div>
        </div>
      )}
      <p className="accounting-note">
        Each business day can be closed once. A closing is an immutable snapshot
        at confirmation time. Later payments and corrections remain visible in
        live reports. Outstanding visits remain open until individually settled.
      </p>
      {closings.length > 0 && (
        <div className="ops-table-wrap">
          <table className="ops-table">
            <thead>
              <tr>
                <th>BUSINESS DAY</th>
                <th>EXPECTED CASH</th>
                <th>COUNTED CASH</th>
                <th>VARIANCE</th>
              </tr>
            </thead>
            <tbody>
              {closings.map((c) => (
                <tr key={c.id}>
                  <td>{c.business_date}</td>
                  <td>{money(c.expected_cash_minor)} MAD</td>
                  <td>{money(c.counted_cash_minor)} MAD</td>
                  <td>{money(c.difference_minor)} MAD</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
export function OperationalAnalytics({
  from,
  to,
}: {
  from: string;
  to: string;
}) {
  const ops = useOperations();
  const { settings } = useRestaurant();
  const orders = ops.orders.filter((o) => {
    const d = businessDate(o.created_at, settings.timezone);
    return d >= from && d <= to;
  });
  const durations = (start: string, end: string) =>
    orders.flatMap((o) => {
      const a = ops.history.find(
        (h) => h.order_id === o.id && h.status === start,
      );
      const b = ops.history.find(
        (h) => h.order_id === o.id && h.status === end,
      );
      return a && b
        ? [(Date.parse(b.created_at) - Date.parse(a.created_at)) / 60000]
        : [];
    });
  const average = (values: number[]) =>
    values.length
      ? `${(values.reduce((s, n) => s + n, 0) / values.length).toFixed(1)} min`
      : "—";
  const hours = orders.reduce(
    (a, o) => {
      const h = new Intl.DateTimeFormat("en-GB", {
        timeZone: settings.timezone,
        hour: "2-digit",
        hourCycle: "h23",
      }).format(new Date(o.created_at));
      a[h] = (a[h] || 0) + 1;
      return a;
    },
    {} as Record<string, number>,
  );
  const peak = Object.entries(hours).sort((a, b) => b[1] - a[1])[0];
  const served = new Set(
    orders
      .filter((o) => ["served", "completed"].includes(o.status))
      .map((o) => o.id),
  );
  const categories = Object.entries(
    ops.items
      .filter((i) => served.has(i.order_id))
      .reduce(
        (a, i) => {
          a[i.category_name] = (a[i.category_name] || 0) + i.line_minor;
          return a;
        },
        {} as Record<string, number>,
      ),
  ).sort((a, b) => b[1] - a[1]);
  return (
    <section className="ops-panel">
      <div className="panel-heading">
        <div>
          <h2>The rhythm of your restaurant</h2>
          <p>
            Preparation and service times come from recorded status changes.
          </p>
        </div>
      </div>
      <div className="report-metrics">
        {[
          ["Average preparation", average(durations("preparing", "ready"))],
          ["Average ready-to-served", average(durations("ready", "served"))],
          [
            "Peak ordering hour",
            peak ? `${peak[0]}:00 · ${peak[1]} orders` : "—",
          ],
          [
            "Cancellation rate",
            orders.length
              ? `${((orders.filter((o) => ["cancelled", "rejected"].includes(o.status)).length / orders.length) * 100).toFixed(1)}%`
              : "—",
          ],
          [
            "Unpaid orders",
            String(
              ops.orders.filter(
                (o) =>
                  !["cancelled", "rejected"].includes(o.status) &&
                  ops.allocations
                    .filter(
                      (a) =>
                        a.order_id === o.id &&
                        !ops.adjustments.some(
                          (r) => r.payment_id === a.payment_id,
                        ),
                    )
                    .reduce((s, a) => s + a.amount_minor, 0) < o.total_minor,
              ).length,
            ),
          ],
        ].map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="ops-table-wrap">
        <table className="ops-table">
          <thead>
            <tr>
              <th>CATEGORY</th>
              <th>SERVED ITEM SALES · EXCLUDING TAX</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(([name, value]) => (
              <tr key={name}>
                <td>{name}</td>
                <td>{money(value)} MAD</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
