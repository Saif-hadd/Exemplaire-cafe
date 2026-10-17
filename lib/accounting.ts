// Pure calculations in integer minor units. Postgres remains authoritative for mutations.
type Sale = {
  id: string;
  status: string;
  created_at: string;
  recognized_at: string | null;
  subtotal_minor: number;
  tax_minor: number;
  total_minor: number;
};
type Receipt = {
  id: string;
  amount_minor: number;
  method: string;
  created_at: string;
};
type Refund = { payment_id: string; amount_minor: number; created_at: string };
export function businessDate(iso: string, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}
export function financialSummary(
  orders: Sale[],
  payments: Receipt[],
  refunds: Refund[],
  from: string,
  to: string,
  timezone: string,
) {
  const inRange = (iso: string) => {
    const d = businessDate(iso, timezone);
    return d >= from && d <= to;
  };
  const sales = orders.filter(
    (o) =>
      o.recognized_at &&
      inRange(o.recognized_at) &&
      !["cancelled", "rejected"].includes(o.status),
  );
  const receipts = payments.filter((p) => inRange(p.created_at));
  const corrections = refunds.filter((r) => inRange(r.created_at));
  const sum = (rows: { amount_minor: number }[]) =>
    rows.reduce((s, r) => s + r.amount_minor, 0);
  const byMethod = (method: string) =>
    sum(receipts.filter((p) => p.method === method)) -
    sum(
      corrections.filter(
        (r) => payments.find((p) => p.id === r.payment_id)?.method === method,
      ),
    );
  return {
    gross: sales.reduce((s, o) => s + o.subtotal_minor, 0),
    net: sales.reduce((s, o) => s + o.subtotal_minor, 0),
    tax: sales.reduce((s, o) => s + o.tax_minor, 0),
    collected: sum(receipts) - sum(corrections),
    cash: byMethod("cash"),
    terminal: byMethod("terminal"),
    other: byMethod("other"),
    refunds: sum(corrections),
    outstanding:
      orders
        .filter((o) => !["cancelled", "rejected"].includes(o.status))
        .reduce((s, o) => s + o.total_minor, 0) -
      sum(payments) +
      sum(refunds),
    count: orders.filter((o) => inRange(o.created_at)).length,
    completed: orders.filter(
      (o) => o.status === "completed" && inRange(o.created_at),
    ).length,
    salesCount: sales.length,
    average: sales.length
      ? Math.round(
          sales.reduce((s, o) => s + o.subtotal_minor, 0) / sales.length,
        )
      : 0,
  };
}
