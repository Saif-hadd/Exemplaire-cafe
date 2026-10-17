"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ChefHat,
  Clock3,
  CreditCard,
  LayoutGrid,
  Receipt,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useOperations } from "@/components/providers/operations-provider";
import { useRestaurant } from "@/components/providers/restaurant-provider";
import { businessDate, financialSummary } from "@/lib/accounting";
import { money, statusLabel } from "@/lib/restaurant";
import { DailyClosing, OperationalAnalytics } from "./report-details";
export function downloadCsv(name: string, rows: (string | number)[][]) {
  const csv =
    "\uFEFF" +
    rows
      .map((r) =>
        r
          .map(
            (v) =>
              '"' +
              String(v)
                .replace(/"/g, '""')
                .replace(/^[=+@-]/, "'$&") +
              '"',
          )
          .join(","),
      )
      .join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
export function Overview({ mode }: { mode: string }) {
  const ops = useOperations();
  const { settings } = useRestaurant();
  const timezone = settings.timezone;
  const today = businessDate(new Date().toISOString(), timezone);
  const [period, setPeriod] = useState("today");
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo, setCustomTo] = useState(today);
  const shift = (days: number) => {
    const d = new Date(`${today}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString().slice(0, 10);
  };
  const from =
    period === "custom"
      ? customFrom
      : period === "yesterday"
        ? shift(1)
        : period === "7"
          ? shift(6)
          : period === "30"
            ? shift(29)
            : period === "month"
              ? today.slice(0, 8) + "01"
              : today;
  const to =
    period === "custom" ? customTo : period === "yesterday" ? shift(1) : today;
  const k = financialSummary(
    ops.orders,
    ops.payments,
    ops.adjustments,
    from,
    to,
    timezone,
  );
  const active = ops.sessions.filter((s) => !s.closed_at);
  const live = ops.orders.filter(
    (o) => !["completed", "cancelled", "rejected"].includes(o.status),
  );
  const trend = useMemo(() => {
    if (from === to) {
      return Array.from({ length: 24 }, (_, h) => {
        const hour = String(h).padStart(2, "0");
        const receipts = ops.payments.filter(
          (p) =>
            businessDate(p.created_at, timezone) === from &&
            new Intl.DateTimeFormat("en-GB", {
              timeZone: timezone,
              hour: "2-digit",
              hourCycle: "h23",
            }).format(new Date(p.created_at)) === hour,
        );
        const refunds = ops.adjustments.filter(
          (p) =>
            businessDate(p.created_at, timezone) === from &&
            new Intl.DateTimeFormat("en-GB", {
              timeZone: timezone,
              hour: "2-digit",
              hourCycle: "h23",
            }).format(new Date(p.created_at)) === hour,
        );
        return {
          label: `${hour}:00`,
          collected:
            (receipts.reduce((s, p) => s + p.amount_minor, 0) -
              refunds.reduce((s, p) => s + p.amount_minor, 0)) /
            100,
        };
      });
    }
    const result = [];
    let d = new Date(`${from}T12:00:00Z`);
    const end = new Date(`${to}T12:00:00Z`);
    while (d <= end && result.length < 366) {
      const day = d.toISOString().slice(0, 10);
      result.push({
        label: day.slice(5),
        collected:
          financialSummary(
            ops.orders,
            ops.payments,
            ops.adjustments,
            day,
            day,
            timezone,
          ).collected / 100,
      });
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return result;
  }, [ops.orders, ops.payments, ops.adjustments, from, to, timezone]);
  const eligibleIds = new Set(
    ops.orders
      .filter(
        (o) =>
          o.recognized_at &&
          businessDate(o.recognized_at, timezone) >= from &&
          businessDate(o.recognized_at, timezone) <= to &&
          !["cancelled", "rejected"].includes(o.status),
      )
      .map((o) => o.id),
  );
  const leaders = Object.values(
    ops.items
      .filter((i) => eligibleIds.has(i.order_id))
      .reduce(
        (a, i) => {
          const row =
            a[i.name] ||
            (a[i.name] = { name: i.name, quantity: 0, revenue: 0 });
          row.quantity += i.quantity;
          row.revenue += i.line_minor;
          return a;
        },
        {} as Record<
          string,
          { name: string; quantity: number; revenue: number }
        >,
      ),
  )
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);
  const exportReport = () =>
    downloadCsv(`maison-or-${from}-${to}.csv`, [
      ["Maison Or closing report", from, to],
      ["Timezone", timezone],
      ["Metric", "MAD"],
      ["Gross sales", k.gross / 100],
      ["Net sales (excl tax)", k.net / 100],
      ["Tax", k.tax / 100],
      ["Net collections", k.collected / 100],
      ["Cash", k.cash / 100],
      ["Card terminal", k.terminal / 100],
      ["Other", k.other / 100],
      ["Refunds", k.refunds / 100],
      ["Current outstanding", k.outstanding / 100],
      ["Orders", k.count],
      [],
      ["Payment ID", "Date", "Method", "Amount MAD", "Staff"],
      ...ops.payments
        .filter(
          (p) =>
            businessDate(p.created_at, timezone) >= from &&
            businessDate(p.created_at, timezone) <= to,
        )
        .map((p) => [
          p.id,
          p.created_at,
          p.method,
          p.amount_minor / 100,
          p.confirmed_by,
        ]),
      [],
      ["Refund ID", "Payment ID", "Date", "Amount MAD", "Reason"],
      ...ops.adjustments
        .filter(
          (r) =>
            businessDate(r.created_at, timezone) >= from &&
            businessDate(r.created_at, timezone) <= to,
        )
        .map((r) => [
          r.id,
          r.payment_id,
          r.created_at,
          r.amount_minor / 100,
          r.reason,
        ]),
    ]);
  const stats = [
    {
      label: "Payments collected",
      value: money(k.collected),
      unit: "MAD",
      note: "Actual receipts, less refunds",
      icon: Wallet,
      featured: true,
    },
    {
      label: "Recognized sales",
      value: money(k.net),
      unit: "MAD",
      note: "Served orders · excluding tax",
      icon: Receipt,
    },
    {
      label: "Orders placed",
      value: k.count,
      unit: "orders",
      note: `${k.completed} completed in this period`,
      icon: ShoppingBag,
    },
    {
      label: "Active tables",
      value: active.length,
      unit: `/ ${ops.tables.filter((t) => t.state !== "disabled").length}`,
      note: `${live.length} orders on the floor`,
      icon: LayoutGrid,
    },
  ];
  return (
    <div className="space-y-6">
      <div className="overview-toolbar no-print">
        <div className="period-tabs">
          {[
            ["today", "Today"],
            ["yesterday", "Yesterday"],
            ["7", "7 days"],
            ["30", "30 days"],
            ["month", "This month"],
            ["custom", "Custom"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={period === value ? "active" : ""}
              onClick={() => setPeriod(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {mode === "reports" && (
            <button className="outline-action" onClick={() => window.print()}>
              Print / save PDF
            </button>
          )}
          <button className="outline-action" onClick={exportReport}>
            <ArrowDownToLine size={14} /> Export report
          </button>
        </div>
      </div>
      {period === "custom" && (
        <div className="flex flex-wrap gap-4">
          <label className="field-label">
            From
            <input
              aria-label="Report start date"
              className="lux-input"
              type="date"
              value={customFrom}
              max={customTo}
              onChange={(e) => setCustomFrom(e.target.value || today)}
            />
          </label>
          <label className="field-label">
            Through
            <input
              aria-label="Report end date"
              className="lux-input"
              type="date"
              value={customTo}
              min={customFrom}
              onChange={(e) => setCustomTo(e.target.value || today)}
            />
          </label>
        </div>
      )}
      <div className="kpi-grid">
        {stats.map((s) => (
          <article
            className={`kpi-card ${s.featured ? "featured" : ""}`}
            key={s.label}
          >
            <div>
              <span>{s.label}</span>
              <s.icon size={17} />
            </div>
            <h2>
              {s.value}
              <small>{s.unit}</small>
            </h2>
            <p>
              <span className="mini-dot" />
              {s.note}
            </p>
          </article>
        ))}
      </div>
      <div className="overview-main-grid">
        <section className="ops-panel revenue-panel">
          <div className="panel-heading">
            <div>
              <h2>Good business, at a glance.</h2>
              <p>
                Payments collected throughout{" "}
                {from === to ? "the day" : "the period"}
              </p>
            </div>
            <span className="chart-legend">
              <i /> Net collections
            </span>
          </div>
          <div className="revenue-total">
            {money(k.collected)} <small>MAD</small>
            <span>Collected in person</span>
          </div>
          <div className="revenue-chart">
            {ops.payments.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trend}
                  margin={{ top: 12, right: 8, left: -18, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="collectionFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#b6a076" stopOpacity={0.2} />
                      <stop
                        offset="100%"
                        stopColor="#b6a076"
                        stopOpacity={0.01}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 5"
                    vertical={false}
                    stroke="#ece9e1"
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 9, fill: "#a59b88" }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={45}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: "#a59b88" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 11,
                      border: "1px solid #e1d9ca",
                      borderRadius: 3,
                    }}
                    formatter={(v: number) => [
                      `${money(Math.round(v * 100))} MAD`,
                      "Collected",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="collected"
                    stroke="#a28b5f"
                    strokeWidth={2}
                    fill="url(#collectionFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">
                <BarChart3 size={28} />
                <p>Your first collection will start the story.</p>
                <span>Financial figures use actual payment records.</span>
              </div>
            )}
          </div>
          <div className="chart-footer">
            <span>
              Cash <b>{money(k.cash)} MAD</b>
            </span>
            <i />
            <span>
              Card terminal <b>{money(k.terminal)} MAD</b>
            </span>
            <i />
            <span>
              Other <b>{money(k.other)} MAD</b>
            </span>
          </div>
        </section>
        <section className="ops-panel floor-snapshot">
          <div className="panel-heading">
            <div>
              <h2>On the floor</h2>
              <p>A little pulse check on your restaurant</p>
            </div>
            <LayoutGrid size={17} />
          </div>
          <div className="floor-mini-grid">
            {ops.tables.length ? (
              ops.tables
                .slice()
                .sort((a, b) => a.number - b.number)
                .slice(0, 12)
                .map((t) => (
                  <Link
                    href="/admin/tables"
                    className={`floor-mini table-${t.state}`}
                    key={t.id}
                  >
                    <UtensilsIcon />
                    <b>{String(t.number).padStart(2, "0")}</b>
                    <small>{t.state.replace("_", " ")}</small>
                  </Link>
                ))
            ) : (
              <div className="col-span-3 py-10 text-center text-xs text-muted-foreground">
                Create your tables to bring your floor to life.
              </div>
            )}
          </div>
          <div className="floor-key">
            <span>
              <i className="available" />
              Available
            </span>
            <span>
              <i className="occupied" />
              Occupied
            </span>
            <span>
              <i className="awaiting" />
              Bill requested
            </span>
          </div>
          <Link className="panel-footer-link" href="/admin/tables">
            Manage the floor <ArrowRight size={14} />
          </Link>
        </section>
      </div>
      <div className="overview-lower-grid">
        <section className="ops-panel">
          <div className="panel-heading">
            <div>
              <h2>The latest at your tables</h2>
              <p>Every order, thoughtfully followed</p>
            </div>
            <Link href="/admin/orders" className="text-link">
              View all <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="ops-table-wrap">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>ORDER</th>
                  <th>TABLE</th>
                  <th>STATUS</th>
                  <th>AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {ops.orders
                  .slice()
                  .sort((a, b) => b.created_at.localeCompare(a.created_at))
                  .slice(0, 5)
                  .map((o) => {
                    const table = ops.tables.find(
                      (t) =>
                        t.id ===
                        ops.sessions.find((s) => s.id === o.session_id)
                          ?.table_id,
                    );
                    return (
                      <tr key={o.id}>
                        <td>
                          <Link href="/admin/orders">#{o.reference}</Link>
                          <small>
                            {new Date(o.created_at).toLocaleTimeString(
                              "en-GB",
                              {
                                timeZone: timezone,
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </small>
                        </td>
                        <td>
                          <span className="table-number">
                            {table?.number.toString().padStart(2, "0") || "—"}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge status-${o.status}`}>
                            {statusLabel[o.status]}
                          </span>
                        </td>
                        <td>
                          {money(o.total_minor)}{" "}
                          <small className="!inline">MAD</small>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            {!ops.orders.length && (
              <div className="py-12 text-center text-xs text-muted-foreground">
                Your next great service starts with the first order.
              </div>
            )}
          </div>
        </section>
        <section className="ops-panel">
          <div className="panel-heading">
            <div>
              <h2>The guest favorites</h2>
              <p>Most loved in this period</p>
            </div>
            <ChefHat size={18} />
          </div>
          <div className="best-sellers">
            {leaders.length ? (
              leaders.map((p, i) => (
                <div key={p.name}>
                  <span>0{i + 1}</span>
                  <div>
                    <h3>{p.name}</h3>
                    <small>{p.quantity} served</small>
                  </div>
                  <b>
                    {money(p.revenue)}
                    <small>MAD</small>
                  </b>
                </div>
              ))
            ) : (
              <div className="py-10 text-center text-xs text-muted-foreground">
                Favorites emerge as orders are served.
              </div>
            )}
          </div>
          <div className="insight-note">
            <span>◇</span>
            <p>
              Great hospitality begins with the little things.
              <br />
              <strong>
                {ops.requests.filter((r) => r.status === "pending").length}{" "}
                guest requests are waiting for your team.
              </strong>
            </p>
          </div>
        </section>
      </div>
      {mode === "analytics" && <OperationalAnalytics from={from} to={to} />}
      {mode === "reports" && (
        <DailyClosing
          date={from === to ? from : today}
          expectedCash={
            from === to
              ? k.cash
              : financialSummary(
                  ops.orders,
                  ops.payments,
                  ops.adjustments,
                  today,
                  today,
                  timezone,
                ).cash
          }
        />
      )}
      {(mode === "reports" || mode === "analytics") && (
        <section className="ops-panel">
          <div className="panel-heading">
            <div>
              <h2>The numbers behind the service</h2>
              <p>Sales and collections are measured independently.</p>
            </div>
          </div>
          <div className="report-metrics">
            {[
              ["Gross sales", k.gross],
              ["Net sales", k.net],
              ["Tax", k.tax],
              ["Average served order", k.average],
              ["Refunds issued", k.refunds],
              ["Current outstanding", k.outstanding],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{money(Number(value))} MAD</strong>
              </div>
            ))}
          </div>
          <p className="accounting-note">
            Business day: midnight to midnight in {timezone}. Sales are
            recognized when served. No discounts are configured, so gross and
            net sales are equal and exclude tax. Refunding a payment reopens its
            balance; it does not cancel a sale. Outstanding balances include all
            visits, regardless of the selected period.
          </p>
        </section>
      )}
    </div>
  );
}
function UtensilsIcon() {
  return <span className="floor-chair" />;
}
