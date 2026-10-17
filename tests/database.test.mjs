import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

// A real local Postgres engine. No connection to the user's Supabase project.
let db, table, visit, cappuccino, cheesecake, order, tracking, firstPayment;
const owner = randomUUID(),
  kitchen = randomUUID(),
  waiter = randomUUID(),
  stranger = randomUUID();
const q = async (sql, params = []) => (await db.query(sql, params)).rows;
const rpc = async (name, args) =>
  (
    await q(
      `select public.${name}(${args.map((_, i) => "$" + (i + 1)).join(",")}) as result`,
      args,
    )
  )[0].result;
const as = async (id, role = "authenticated") => {
  await db.exec("reset role");
  await q("select set_config('request.jwt.claim.sub',$1,false)", [id || ""]);
  await db.exec(`set role ${role}`);
};
const command = (action, payload) =>
  rpc("staff_action", [action, JSON.stringify(payload)]);
const rejection = async (fn, pattern) => assert.rejects(fn, pattern);

before(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema public,auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated; alter default privileges in schema public grant select,insert,update,delete on tables to anon,authenticated;`,
  );
  for (const path of [
    "supabase/migrations/20261013102938_001_restaurant_platform_schema.sql",
    "supabase/migrations/20261017000100_restaurant_operations.sql",
  ])
    await db.exec(await readFile(path, "utf8"));
  for (const id of [owner, kitchen, waiter, stranger])
    await q("insert into auth.users(id) values($1)", [id]);
  await q(
    "insert into staff_users(id,display_name,role) values($1,'Owner','owner'),($2,'Kitchen','kitchen'),($3,'Waiter','waiter')",
    [owner, kitchen, waiter],
  );
  const category = (
    await q("select id from menu_categories where name='Coffee' limit 1")
  )[0].id;
  cappuccino = (
    await q(
      "insert into menu_products(category_id,name,price) values($1,'Cappuccino',30) returning id",
      [category],
    )
  )[0].id;
  cheesecake = (
    await q(
      "insert into menu_products(category_id,name,price) values($1,'Cheesecake',45) returning id",
      [category],
    )
  )[0].id;
  await as(owner);
  table = (await command("create_table", { number: 5, seats: 4 })).id;
  await command("open_session", { id: table });
  visit = (
    await q("select * from table_sessions where table_id=$1", [table])
  )[0];
});
after(async () => {
  await db?.close();
});

test("empty and null orders are rejected without creating financial records", async () => {
  await as(null, "anon");
  await rejection(
    () => rpc("place_order", [visit.access_token, randomUUID(), null, ""]),
    /Invalid order/,
  );
  await rejection(
    () => rpc("place_order", [visit.access_token, randomUUID(), "[]", ""]),
    /Invalid order/,
  );
});

test("migration preserves original restaurant, categories, and Wi-Fi records", async () => {
  await as(owner);
  assert.equal((await q("select * from restaurant_settings")).length, 1);
  assert.equal((await q("select * from menu_categories")).length, 10);
  assert.equal((await q("select * from wifi_settings")).length, 1);
});
test("table QR resolves only an active visit; invalid QR and codes cannot join", async () => {
  await as(null, "anon");
  await rejection(
    () => rpc("join_table", [randomUUID(), null, null]),
    /Table unavailable/,
  );
  const bad = await rpc("join_table", [null, 5, "BADBAD"]);
  assert.match(bad.error, /invalid table code/);
  const result = await rpc("join_table", [null, 5, visit.join_code]);
  assert.equal(result.id, visit.id);
  assert.equal(result.table, 5);
});
test("Table 05: server prices two cappuccinos and one cheesecake at 105 MAD, snapshots items, and prevents duplicate orders", async () => {
  await as(null, "anon");
  const key = randomUUID();
  const items = JSON.stringify([
    { product_id: cappuccino, quantity: 2, price: 1 },
    { product_id: cheesecake, quantity: 1 },
  ]);
  order = await rpc("place_order", [
    visit.access_token,
    key,
    items,
    "Acceptance scenario",
  ]);
  tracking = order.token;
  const again = await rpc("place_order", [
    visit.access_token,
    key,
    items,
    "Acceptance scenario",
  ]);
  assert.equal(again.id, order.id);
  const tracked = await rpc("track_order", [tracking]);
  assert.equal(tracked.total_minor, 10500);
  assert.equal(tracked.items.length, 2);
  assert.equal(tracked.paid_minor, 0);
  assert.equal(await rpc("track_order", [randomUUID()]), null);
});
test("anonymous customers cannot read all orders or confirm payments", async () => {
  await as(null, "anon");
  await rejection(() => q("select * from orders"), /permission denied/);
  await rejection(
    () =>
      command("payment", {
        session_id: visit.id,
        amount_minor: 10500,
        method: "cash",
        key: randomUUID(),
      }),
    /permission denied/,
  );
});
test("unprovisioned authenticated accounts cannot write menus or see orders", async () => {
  await as(stranger);
  assert.equal((await q("select * from orders")).length, 0);
  await rejection(
    () => q("insert into menu_products(name,price) values('Unauthorized',1)"),
    /row-level security/,
  );
  await rejection(
    () =>
      command("payment", {
        session_id: visit.id,
        amount_minor: 10500,
        method: "cash",
        key: randomUUID(),
      }),
    /Not authorized/,
  );
});
test("owner accepts; kitchen prepares and marks ready but cannot serve, collect, or read payment records", async () => {
  await as(owner);
  await command("order_status", { id: order.id, status: "accepted" });
  await as(kitchen);
  await command("order_status", { id: order.id, status: "preparing" });
  await command("order_status", { id: order.id, status: "ready" });
  await rejection(
    () => command("order_status", { id: order.id, status: "served" }),
    /Kitchen permission/,
  );
  await rejection(
    () =>
      command("payment", {
        session_id: visit.id,
        amount_minor: 10500,
        method: "cash",
        key: randomUUID(),
      }),
    /Not authorized/,
  );
  assert.equal((await q("select * from payments")).length, 0);
});
test("served and completed orders remain unpaid until a physical payment is confirmed", async () => {
  await as(owner);
  await command("order_status", { id: order.id, status: "served" });
  await command("order_status", { id: order.id, status: "completed" });
  const tracked = await rpc("track_order", [tracking]);
  assert.equal(tracked.status, "completed");
  assert.equal(tracked.paid_minor, 0);
  await rejection(
    () => command("close_session", { session_id: visit.id }),
    /Settle the bill/,
  );
});
test("duplicate bill requests are deduplicated and waiter access is scoped to assigned tables", async () => {
  await as(null, "anon");
  const first = await rpc("request_service", [visit.access_token, "bill"]);
  assert.equal(
    await rpc("request_service", [visit.access_token, "bill"]),
    first,
  );
  await as(waiter);
  assert.equal((await q("select * from service_requests")).length, 0);
  await rejection(
    () => command("request_status", { id: first, status: "acknowledged" }),
    /Table not assigned/,
  );
  await as(owner);
  await command("assign_table", { id: table, staff_id: waiter });
  await as(waiter);
  assert.equal((await q("select * from service_requests")).length, 1);
  await command("request_status", { id: first, status: "acknowledged" });
  await command("request_status", { id: first, status: "resolved" });
  await rejection(
    () =>
      command("payment", {
        session_id: visit.id,
        amount_minor: 10500,
        method: "cash",
        key: randomUUID(),
      }),
    /Payment permission/,
  );
});
test("partial payment, duplicate retry, overpayment validation, and final cash settlement", async () => {
  await as(owner);
  const key = randomUUID();
  firstPayment = await command("payment", {
    session_id: visit.id,
    amount_minor: 4000,
    method: "cash",
    key,
  });
  assert.equal(
    (
      await command("payment", {
        session_id: visit.id,
        amount_minor: 4000,
        method: "cash",
        key,
      })
    ).id,
    firstPayment.id,
  );
  assert.equal((await rpc("track_order", [tracking])).paid_minor, 4000);
  await rejection(
    () =>
      command("payment", {
        session_id: visit.id,
        amount_minor: 6501,
        method: "cash",
        key: randomUUID(),
      }),
    /exceeds remaining/,
  );
  await command("payment", {
    session_id: visit.id,
    amount_minor: 6500,
    method: "cash",
    key: randomUUID(),
  });
  assert.equal((await rpc("track_order", [tracking])).paid_minor, 10500);
  assert.equal(
    Number((await q("select sum(amount_minor) as n from payments"))[0].n),
    10500,
  );
  await command("close_session", { session_id: visit.id });
  assert.ok(
    (await q("select closed_at from table_sessions where id=$1", [visit.id]))[0]
      .closed_at,
  );
});
test("new visits do not share balances or capabilities with previous visits", async () => {
  await as(owner);
  await command("table_state", { id: table, state: "available" });
  await command("open_session", { id: table });
  const current = (
    await q(
      "select * from table_sessions where table_id=$1 and closed_at is null",
      [table],
    )
  )[0];
  assert.notEqual(current.id, visit.id);
  await as(null, "anon");
  await rejection(
    () =>
      rpc("place_order", [
        visit.access_token,
        randomUUID(),
        JSON.stringify([{ product_id: cappuccino, quantity: 1 }]),
        "",
      ]),
    /visit has ended/,
  );
  const result = await rpc("place_order", [
    current.access_token,
    randomUUID(),
    JSON.stringify([{ product_id: cappuccino, quantity: 1 }]),
    "",
  ]);
  await as(owner);
  assert.equal(
    (
      await q(
        "select count(*) as n from payment_allocations where order_id=$1",
        [result.id],
      )
    )[0].n,
    0,
  );
  await command("order_status", {
    id: result.id,
    status: "cancelled",
    reason: "Guest changed plans",
  });
  assert.equal((await rpc("track_order", [result.token])).status, "cancelled");
});
test("order creation rolls back all lines when a product is unavailable or modifier is invalid", async () => {
  await as(owner);
  const current = (
    await q(
      "select * from table_sessions where table_id=$1 and closed_at is null",
      [table],
    )
  )[0];
  await q("update menu_products set available=false where id=$1", [cheesecake]);
  const before = Number((await q("select count(*) as n from orders"))[0].n);
  await as(null, "anon");
  await rejection(
    () =>
      rpc("place_order", [
        current.access_token,
        randomUUID(),
        JSON.stringify([
          { product_id: cappuccino, quantity: 1 },
          { product_id: cheesecake, quantity: 1 },
        ]),
        "",
      ]),
    /unavailable/,
  );
  await rejection(
    () =>
      rpc("place_order", [
        current.access_token,
        randomUUID(),
        JSON.stringify([
          { product_id: cappuccino, quantity: 1, modifiers: [randomUUID()] },
        ]),
        "",
      ]),
    /option is unavailable/,
  );
  await as(owner);
  assert.equal(
    Number((await q("select count(*) as n from orders"))[0].n),
    before,
  );
});
test("refunds retain original receipt, reopen its balance, and cannot be duplicated", async () => {
  await as(owner);
  await command("refund", {
    id: firstPayment.id,
    reason: "Receipt correction",
  });
  await rejection(
    () =>
      command("refund", { id: firstPayment.id, reason: "Duplicate refund" }),
    /duplicate key/,
  );
  assert.equal((await rpc("track_order", [tracking])).paid_minor, 6500);
  assert.equal(
    (await q("select * from payments where id=$1", [firstPayment.id])).length,
    1,
  );
  assert.ok((await q("select * from audit_log where action='refund'")).length);
});
test("owner protection and immutable financial records are enforced in Postgres", async () => {
  await as(owner);
  await rejection(
    () =>
      command("staff", {
        id: owner,
        display_name: "Owner",
        role: "waiter",
        active: true,
        can_collect: false,
      }),
    /Keep at least one/,
  );
  await rejection(() => q("delete from payments"), /permission denied/);
  await rejection(
    () => q("update payment_allocations set amount_minor=1"),
    /permission denied/,
  );
});

test("multiple orders allocate one receipt oldest first and preserve exact modifier/tax calculations", async () => {
  await as(owner);
  const current = (
    await q(
      "select * from table_sessions where table_id=$1 and closed_at is null",
      [table],
    )
  )[0];
  const option = (
    await command("modifier", {
      product_id: cappuccino,
      name: "Extra espresso",
      group_name: "Extras",
      price_minor: 500,
    })
  ).id;
  await q("update restaurant_settings set tax_bps=1000");
  await as(null, "anon");
  await rejection(
    () =>
      rpc("place_order", [
        current.access_token,
        randomUUID(),
        JSON.stringify([
          { product_id: cappuccino, quantity: 1, modifiers: [option] },
        ]),
        "",
        3500,
      ]),
    /Prices have changed/,
  );
  const a = await rpc("place_order", [
    current.access_token,
    randomUUID(),
    JSON.stringify([
      { product_id: cappuccino, quantity: 1, modifiers: [option, option] },
    ]),
    "",
    3850,
  ]);
  const b = await rpc("place_order", [
    current.access_token,
    randomUUID(),
    JSON.stringify([{ product_id: cappuccino, quantity: 1 }]),
    "",
    3300,
  ]);
  assert.equal((await rpc("track_order", [a.token])).total_minor, 3850);
  await as(owner);
  const payment = await command("payment", {
    session_id: current.id,
    amount_minor: 5000,
    method: "terminal",
    key: randomUUID(),
  });
  const allocations = await q(
    "select order_id,amount_minor from payment_allocations where payment_id=$1 order by amount_minor desc",
    [payment.id],
  );
  assert.equal(allocations.length, 2);
  assert.equal(allocations.find((x) => x.order_id === a.id).amount_minor, 3850);
  assert.equal(allocations.find((x) => x.order_id === b.id).amount_minor, 1150);
  await q("update restaurant_settings set tax_bps=0");
});
test("a refunded historic visit can receive a corrective payment without reopening guest access", async () => {
  await as(owner);
  await command("payment", {
    session_id: visit.id,
    amount_minor: 4000,
    method: "cash",
    key: randomUUID(),
  });
  assert.equal((await rpc("track_order", [tracking])).paid_minor, 10500);
  const historic = (
    await q("select * from table_sessions where id=$1", [visit.id])
  )[0];
  assert.ok(historic.closed_at);
  await as(null, "anon");
  await rejection(
    () => rpc("request_service", [historic.access_token, "water"]),
    /identify your active table/,
  );
});
test("revoked table QR and expired visits reject guest access", async () => {
  await as(owner);
  const current = (
    await q(
      "select * from table_sessions where table_id=$1 and closed_at is null",
      [table],
    )
  )[0];
  const qr = (
    await q("select qr_token from restaurant_tables where id=$1", [table])
  )[0].qr_token;
  await command("table_state", {
    id: table,
    state: "occupied",
    qr_active: false,
  });
  await as(null, "anon");
  await rejection(
    () => rpc("join_table", [qr, null, null]),
    /Table unavailable/,
  );
  await rejection(
    () =>
      rpc("place_order", [
        current.access_token,
        randomUUID(),
        JSON.stringify([{ product_id: cappuccino, quantity: 1 }]),
        "",
      ]),
    /Ordering is unavailable/,
  );
  await as(owner);
  await command("table_state", {
    id: table,
    state: "occupied",
    qr_active: true,
  });
  await db.exec('reset role');
  await q(
    "update table_sessions set expires_at=now()-interval '1 minute' where id=$1",
    [current.id],
  );
  await as(null, "anon");
  assert.match(
    (await rpc("join_table", [qr, null, null])).error,
    /No active visit/,
  );
  await rejection(
    () =>
      rpc("place_order", [
        current.access_token,
        randomUUID(),
        JSON.stringify([{ product_id: cappuccino, quantity: 1 }]),
        "",
      ]),
    /visit has ended/,
  );
});
test("invalid table-code attempts persist and are rate limited", async () => {
  await db.exec("reset role");
  await q("delete from guest_rate_limits where key=$1", ["join:" + table]);
  await as(null, "anon");
  for (let i = 0; i < 40; i++) await rpc("join_table", [null, 5, "000000"]);
  await rejection(
    () => rpc("join_table", [null, 5, "000000"]),
    /wait a minute/,
  );
});
test("daily closing uses net cash, saves an immutable variance, and rejects duplicate closes", async () => {
  await as(owner);
  const date = (
    await q("select (now() at time zone 'Africa/Casablanca')::date as date")
  )[0].date;
  const payments = await q(
    "select coalesce(sum(amount_minor),0) as n from payments where method='cash'",
  );
  const refunds = await q(
    "select coalesce(sum(a.amount_minor),0) as n from payment_adjustments a join payments p on p.id=a.payment_id where p.method='cash'",
  );
  const expected = Number(payments[0].n) - Number(refunds[0].n);
  const result = await command("daily_close", {
    date,
    counted_minor: expected - 100,
    notes: "One dirham variance",
  });
  const closing = (
    await q("select * from daily_closings where id=$1", [result.id])
  )[0];
  assert.equal(Number(closing.expected_cash_minor), expected);
  assert.equal(Number(closing.difference_minor), -100);
  await rejection(
    () => command("daily_close", { date, counted_minor: expected }),
    /duplicate key/,
  );
  await rejection(() => q("delete from daily_closings"), /permission denied/);
});
