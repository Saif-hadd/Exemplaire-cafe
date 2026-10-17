import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { chromium } from "@playwright/test";
import { PGlite } from "@electric-sql/pglite";
import { menuProducts } from "../lib/data.ts";

// Browser requests are intercepted and executed against the same SQL migration
// in a local Postgres engine. Hosted Supabase and real production data are untouched.
let db, browser, guest, admin, visit, table, owner;
let queue = Promise.resolve();
const q = async (sql, params = []) => (await db.query(sql, params)).rows;
const act = async (action, payload) =>
  (
    await q("select staff_action($1,$2::jsonb) as result", [
      action,
      JSON.stringify(payload),
    ])
  )[0].result;
const errors = [];
let loseFirstOrderResponse = true;
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
async function intercept(context) {
  await context.routeWebSocket(/wss?:\/\//, (socket) => socket.close());
  await context.route(
    /https?:\/\/[^/]+\/(rest\/v1|auth\/v1)\//,
    async (route) => {
      const execute = async () => {
        const req = route.request();
        const url = new URL(req.url());
        const path = url.pathname;
        const body = req.postDataJSON?.() || {};
        const cors = {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "*",
          "access-control-allow-methods": "*",
          "content-type": "application/json",
        };
        const respond = (body, status = 200) =>
          route.fulfill({
            status,
            headers: cors,
            body: JSON.stringify(body, (key, value) =>
              key === "business_date" && typeof value === "string"
                ? value.slice(0, 10)
                : value,
            ),
          });
        if (req.method() === "OPTIONS") return respond({});
        if (path.includes("/auth/v1/")) {
          const jwt = [
            { alg: "HS256", typ: "JWT" },
            {
              sub: owner,
              role: "authenticated",
              aud: "authenticated",
              exp: Math.floor(Date.now() / 1000) + 3600,
            },
            {},
          ]
            .map((v) => Buffer.from(JSON.stringify(v)).toString("base64url"))
            .join(".");
          const user = {
            id: owner,
            email: "owner@example.test",
            aud: "authenticated",
            role: "authenticated",
            app_metadata: {},
            user_metadata: {},
            created_at: new Date().toISOString(),
          };
          return respond(
            path.endsWith("/user")
              ? user
              : {
                  access_token: jwt,
                  refresh_token: "local-test-refresh",
                  token_type: "bearer",
                  expires_in: 3600,
                  expires_at: Math.floor(Date.now() / 1000) + 3600,
                  user,
                },
          );
        }
        const auth = req.headers().authorization || "";
        const isStaff =
          auth.includes(".") &&
          (() => {
            try {
              return (
                JSON.parse(
                  Buffer.from(auth.split(".")[1], "base64url").toString(),
                ).sub === owner
              );
            } catch {
              return false;
            }
          })();
        await db.exec("reset role");
        await q("select set_config('request.jwt.claim.sub',$1,false)", [
          isStaff ? owner : "",
        ]);
        await db.exec(`set role ${isStaff ? "authenticated" : "anon"}`);
        try {
          if (path.includes("/rpc/")) {
            const name = path.split("/").at(-1);
            if (!/^[a-z_]+$/.test(name)) throw Error("Invalid RPC");
            const entries = Object.entries(body);
            const args = entries.map(([key, value], i) => {
              if (!/^p_[a-z_]+$/.test(key)) throw Error("Invalid argument");
              return `${key}=>$${i + 1}`;
            });
            const vals = entries.map(([, v]) =>
              typeof v === "object" && v !== null ? JSON.stringify(v) : v,
            );
            const data = (
              await q(
                `select public.${name}(${args.join(",")}) as result`,
                vals,
              )
            )[0].result;
            if (name === "place_order" && loseFirstOrderResponse) {
              loseFirstOrderResponse = false;
              return route.abort("failed");
            }
            return respond(data);
          }
          const name = path.split("/").at(-1);
          if (!/^[a-z_]+$/.test(name)) throw Error("Invalid table");
          const vals = [];
          const conditions = [];
          for (const [key, value] of url.searchParams) {
            if (["select", "order", "limit", "offset"].includes(key)) continue;
            if (!/^[a-z_]+$/.test(key)) continue;
            if (value.startsWith("eq.")) {
              vals.push(value.slice(3));
              conditions.push(`"${key}"=$${vals.length}`);
            } else if (value === "is.null") conditions.push(`"${key}" is null`);
          }
          const where = conditions.length
            ? " where " + conditions.join(" and ")
            : "";
          let rows;
          if (req.method() === "GET") {
            let select = url.searchParams.get("select") || "*";
            if (!/^[a-z_*,]+$/.test(select))
              throw Error("Unsupported test selection");
            let sort = "";
            const order = url.searchParams.get("order");
            if (order) {
              const [column, dir] = order.split(".");
              if (/^[a-z_]+$/.test(column))
                sort = ` order by "${column}" ${dir === "desc" ? "desc" : "asc"}`;
            }
            const limit = Number(url.searchParams.get("limit") || 10000);
            const offset = Number(url.searchParams.get("offset") || 0);
            rows = await q(
              `select ${select} from "${name}"${where}${sort} limit ${Math.min(limit, 10000)} offset ${offset}`,
              vals,
            );
          } else if (req.method() === "PATCH") {
            const entries = Object.entries(body);
            const sets = entries.map(([key, value]) => {
              if (!/^[a-z_]+$/.test(key)) throw Error("Invalid column");
              vals.push(value);
              return `"${key}"=$${vals.length}`;
            });
            rows = await q(
              `update "${name}" set ${sets.join(",")}${where} returning *`,
              vals,
            );
          } else if (req.method() === "POST") {
            const entries = Object.entries(body);
            const columns = entries.map(([key]) => {
              if (!/^[a-z_]+$/.test(key)) throw Error("Invalid column");
              return '"' + key + '"';
            });
            rows = await q(
              `insert into "${name}"(${columns.join(",")}) values(${entries.map((_, i) => "$" + (i + 1)).join(",")})${req.headers().prefer?.includes('return=representation') ? ' returning *' : ''}`,
              entries.map(([, v]) =>
                typeof v === "object" && v !== null ? JSON.stringify(v) : v,
              ),
            );
          } else return respond({ message: "Unsupported test operation" }, 400);
          const object = req.headers().accept?.includes("vnd.pgrst.object");
          return respond(object ? rows[0] || null : rows);
        } catch (e) {
          return respond(
            { message: e.message, code: e.code || "TEST_ERROR" },
            400,
          );
        }
      };
      const next = queue.then(execute, execute);
      queue = next.catch(() => {});
      await next;
    },
  );
  context.on("page", (page) =>
    page.on("pageerror", (e) => errors.push(e.message)),
  );
}
before(async () => {
  await mkdir("test-results", { recursive: true });
  db = new PGlite();
  await db.exec(
    `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema public,auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated; alter default privileges in schema public grant select,insert,update,delete on tables to anon,authenticated;`,
  );
  for (const file of [
    "supabase/migrations/20261013102938_001_restaurant_platform_schema.sql",
    "supabase/migrations/20261017000100_restaurant_operations.sql",
  ])
    await db.exec(await readFile(file, "utf8"));
  owner = randomUUID();
  await q("insert into auth.users values($1)", [owner]);
  await q(
    "insert into staff_users(id,display_name,role) values($1,'Test Owner','owner')",
    [owner],
  );
  const categories = await q("select id,name from menu_categories");
  for (const p of menuProducts) {
    const names = {
      coffee: "Coffee",
      tea: "Tea",
      juices: "Fresh Juices",
      mocktails: "Mocktails",
      breakfast: "Breakfast",
      starters: "Starters",
      mains: "Main Courses",
      burgers: "Burgers",
      pizza: "Pizza",
      desserts: "Desserts",
    };
    const category = categories.find((c) => c.name === names[p.categoryId]);
    await q(
      "insert into menu_products(category_id,name,description,price,image,available,featured,bestseller,ingredients,allergens,dietary) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
      [
        category.id,
        p.name,
        p.description,
        p.id === "c1" ? 30 : p.price,
        p.image,
        p.available,
        p.featured,
        p.bestseller,
        JSON.stringify(p.ingredients || []),
        JSON.stringify(p.allergens || []),
        JSON.stringify(p.dietary || []),
      ],
    );
  }
  await q(
    "insert into menu_products(category_id,name,description,price,available) values($1,'Cheesecake','A beautifully simple house cheesecake.',45,true)",
    [categories.find((c) => c.name === "Desserts").id],
  );
  await q("select set_config('request.jwt.claim.sub',$1,false)", [owner]);
  table = (await act("create_table", { number: 5, seats: 4 })).id;
  await act("open_session", { id: table });
  visit = (
    await q("select * from table_sessions where table_id=$1", [table])
  )[0];
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const guestContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const adminContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await intercept(guestContext);
  await intercept(adminContext);
  guest = await guestContext.newPage();
  admin = await adminContext.newPage();
});
after(async () => {
  await browser?.close();
  await db?.close();
});
test("guest portal: table identification, customized quantity, cart, and 105 MAD order", async () => {
  await guest.goto(base);
  await guest.getByRole("button", { name: "Your table", exact: true }).click();
  await guest.getByRole("spinbutton").fill("5");
  await guest
    .getByPlaceholder("6-character code from your waiter")
    .fill(visit.join_code);
  await guest.getByRole("button", { name: "Confirm my table" }).click();
  await guest.getByRole("button", { name: "Table 05", exact: true }).waitFor();
  await guest.screenshot({
    path: "test-results/portal-desktop.png",
    fullPage: true,
  });
  await guest
    .getByRole("link", { name: "Explore the menu", exact: true })
    .first()
    .click();
  await guest
    .getByRole("button", { name: "Customize Cappuccino", exact: true })
    .click();
  await guest
    .getByRole("button", { name: "Increase quantity", exact: true })
    .click();
  await guest.getByRole("button", { name: /Add to selection/ }).click();
  await guest
    .getByRole("textbox", { name: "Search", exact: true })
    .fill("Cheesecake");
  await guest
    .getByRole("button", { name: "Customize Cheesecake", exact: true })
    .click();
  await guest.getByRole("button", { name: /Add to selection/ }).click();
  await guest.getByRole("button", { name: /View your selection/ }).click();
  await guest
    .getByRole("dialog")
    .getByText("105 MAD", { exact: true })
    .last()
    .waitFor();
  await guest
    .getByRole("button", { name: "Confirm order", exact: true })
    .click();
  await guest.getByRole("dialog").getByRole("alert").waitFor();
  await guest
    .getByRole("button", { name: "Confirm order", exact: true })
    .click();
  await guest.getByText("A lovely choice.", { exact: true }).waitFor();
  await guest.getByRole("link", { name: "Track my order" }).click();
  await guest
    .getByRole("heading", { name: "New order", exact: true })
    .waitFor();
});
test("staff login, live order lifecycle, offline partial payments, report and close visit", async () => {
  await admin.goto(base + "/admin/login");
  await admin.getByPlaceholder("admin@maisonor.com").fill("owner@example.test");
  await admin.locator("input[type=password]").fill("local-test-password");
  await admin.getByRole("button", { name: /Sign In/i }).click();
  await admin
    .getByRole("heading", { name: "A good day starts here." })
    .waitFor();
  await admin.locator(".kpi-card").first().waitFor();
  await admin.screenshot({
    path: "test-results/workspace-desktop.png",
    fullPage: true,
  });
  await admin.getByRole("link", { name: /Live orders/ }).click();
  await admin
    .getByRole("button", { name: "Accept order", exact: true })
    .click();
  await admin
    .getByRole("button", { name: "Start preparing", exact: true })
    .click();
  await admin.getByRole("button", { name: "Mark ready", exact: true }).click();
  await admin.getByRole("button", { name: "Mark served", exact: true }).click();
  await admin
    .getByRole("button", { name: "Complete order", exact: true })
    .click();
  await guest
    .getByRole("heading", { name: "Completed", exact: true })
    .waitFor({ timeout: 12000 });
  await guest
    .getByRole("button", { name: "Request your bill or a little assistance" })
    .click();
  await guest
    .getByRole("button", { name: "Request the bill", exact: true })
    .click();
  await admin.getByRole("link", { name: "Payments", exact: true }).click();
  await admin
    .getByRole("button", { name: "Confirm payment", exact: true })
    .first()
    .click();
  await admin
    .getByRole("textbox", { name: "Amount received", exact: true })
    .fill("40");
  await admin.getByRole("checkbox").check();
  await admin
    .getByRole("button", { name: "Confirm payment", exact: true })
    .last()
    .click();
  await admin
    .getByRole("button", { name: "Confirm payment", exact: true })
    .first()
    .click();
  await admin.getByRole("button", { name: "Use remaining balance" }).click();
  await admin.getByRole("checkbox").check();
  await admin
    .getByRole("button", { name: "Confirm payment", exact: true })
    .last()
    .click();
  await admin.getByRole("link", { name: "Overview", exact: true }).click();
  await admin.locator(".kpi-card.featured h2").waitFor();
  assert.match(await admin.locator(".kpi-card.featured h2").innerText(), /105/);
  await admin.locator(".recharts-surface").first().waitFor();
  await admin.screenshot({
    path: "test-results/workspace-settled.png",
    fullPage: true,
  });
  await admin
    .getByRole("link", { name: "Tables & sessions", exact: true })
    .click();
  await admin.locator(".floor-table").first().click();
  await admin.getByRole("button", { name: "Close settled visit" }).click();
  await admin.getByRole("dialog").waitFor({ state: "hidden" });
});
test("reports close a business day, QR cards download locally, and existing integrations persist real feedback", async () => {
  await admin
    .getByRole("link", { name: "Reports & closing", exact: true })
    .click();
  await admin
    .getByRole("textbox", { name: "Counted cash", exact: true })
    .fill("105");
  await admin.getByRole("checkbox").check();
  await admin
    .getByRole("button", { name: "Confirm daily close", exact: true })
    .click();
  await admin.getByText("Closing recorded", { exact: true }).waitFor();
  await admin.getByRole("link", { name: "QR codes", exact: true }).click();
  await admin.getByAltText("Scannable QR code").waitFor();
  const downloading = admin.waitForEvent("download");
  await admin.getByRole("button", { name: "Download QR", exact: true }).click();
  const download = await downloading;
  assert.match(download.suggestedFilename(), /\.png$/);
  await guest.goto(base + "/feedback");
  await guest
    .getByRole("button", { name: "Rate 1 stars", exact: true })
    .click();
  await guest.locator('a[href*="g.page"]').first().waitFor();
  await guest.locator("form input[type=text]").fill("Browser guest");
  await guest.locator("form textarea").fill("Local integration test.");
  await guest
    .getByRole("button", { name: "Submit Feedback", exact: true })
    .click();
  await guest
    .getByRole("heading", { name: "Thank You", exact: true })
    .waitFor();
  await admin
    .getByRole("link", { name: "Guest feedback", exact: true })
    .click();
  await admin.getByText("Browser guest", { exact: true }).waitFor();
  for (const label of [
    "Analytics",
    "Portal activity",
    "Kitchen display",
    "Service requests",
    "Menu products",
    "Categories",
    "Modifiers & pairings",
    "Guest Wi-Fi",
    "Restaurant settings",
    "Staff & permissions",
  ]) {
    await admin.getByRole('navigation',{name:'Staff navigation'}).getByRole("link", { name: label, exact: true }).click();
    await admin.locator("main h1").waitFor();
    assert.ok(
      !(await admin.getByText("Page not found", { exact: true }).count()),
    );
  }
});
test("mobile portal fits viewport; cart, Wi-Fi QR, language RTL, and integrations work", async () => {
  await guest.setViewportSize({ width: 390, height: 844 });
  await guest.goto(base);
  await guest.evaluate(async () => {
    document.querySelectorAll("img").forEach((img) => (img.loading = "eager"));
    await Promise.all(
      Array.from(document.images).map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              img.onload = resolve;
              img.onerror = resolve;
            }),
      ),
    );
  });
  await guest.screenshot({
    path: "test-results/portal-mobile.png",
    fullPage: true,
  });
  assert.ok(
    await guest.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  await guest.getByRole("link", { name: "Connect", exact: true }).click();
  await guest.getByAltText("Scannable QR code").waitFor();
  assert.match(
    await guest.getByAltText("Scannable QR code").getAttribute("src"),
    /^data:image\/png/,
  );
  await guest.goto(base + "/feedback");
  await guest.locator('a[href*="g.page"]').first().waitFor();
  await guest.locator('a[href*="wa.me"]').first().waitFor();
  await guest.goto(base + "/menu");
  await guest.getByRole("button", { name: "Select language" }).click();
  await guest.locator(".header-actions .absolute button").last().click();
  assert.equal(await guest.locator("html").getAttribute("dir"), "rtl");
  assert.deepEqual(errors, []);
});
