import { test } from "node:test";
import assert from "node:assert/strict";
import { businessDate, financialSummary } from "../lib/accounting.ts";
const date = "2026-10-17T12:00:00Z";
const order = {
  id: "1",
  status: "completed",
  created_at: date,
  recognized_at: date,
  subtotal_minor: 10500,
  tax_minor: 0,
  total_minor: 10500,
};
test("completed unpaid orders contribute sales but no collected cash", () => {
  const k = financialSummary(
    [order],
    [],
    [],
    "2026-10-17",
    "2026-10-17",
    "Africa/Casablanca",
  );
  assert.equal(k.net, 10500);
  assert.equal(k.collected, 0);
  assert.equal(k.outstanding, 10500);
});
test("partial receipts, terminal receipts and later refunds are counted independently", () => {
  const k = financialSummary(
    [order],
    [
      { id: "a", amount_minor: 4000, method: "cash", created_at: date },
      { id: "b", amount_minor: 6500, method: "terminal", created_at: date },
    ],
    [{ payment_id: "a", amount_minor: 4000, created_at: date }],
    "2026-10-17",
    "2026-10-17",
    "Africa/Casablanca",
  );
  assert.equal(k.collected, 6500);
  assert.equal(k.cash, 0);
  assert.equal(k.terminal, 6500);
  assert.equal(k.outstanding, 4000);
  assert.equal(k.net, 10500);
});
test("cancelled orders are excluded from sales and outstanding balances", () => {
  const k = financialSummary(
    [{ ...order, status: "cancelled" }],
    [],
    [],
    "2026-10-17",
    "2026-10-17",
    "Africa/Casablanca",
  );
  assert.equal(k.net, 0);
  assert.equal(k.outstanding, 0);
  assert.equal(k.count, 1);
});
test("business-day calculation respects Casablanca local midnight", () => {
  assert.equal(
    businessDate("2026-10-17T23:30:00Z", "Africa/Casablanca"),
    "2026-10-18",
  );
});
test("sales remain on their served day after operational completion on a later day", () => {
  const k = financialSummary(
    [
      {
        ...order,
        created_at: "2026-10-16T20:00:00Z",
        recognized_at: "2026-10-16T21:00:00Z",
      },
    ],
    [],
    [],
    "2026-10-17",
    "2026-10-17",
    "Africa/Casablanca",
  );
  assert.equal(k.net, 0);
  assert.equal(k.outstanding, 10500);
});
