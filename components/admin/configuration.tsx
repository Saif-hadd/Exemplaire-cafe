"use client";
import { useEffect, useState } from "react";
import {
  Download,
  Plus,
  QrCode,
  RotateCw,
  Save,
  ShieldCheck,
  Wifi,
} from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOperations } from "@/components/providers/operations-provider";
import { useRestaurant } from "@/components/providers/restaurant-provider";
import { supabase } from "@/lib/supabase";
import { Modifier, Staff, minor, money } from "@/lib/restaurant";
import { QrCodeImage } from "@/components/shared/qr-code";
import { useStaffCommand } from "./operations-screen";
import { downloadCsv } from "./overview";
export function Configuration({ section }: { section: string }) {
  return section === "settings" ? (
    <SettingsForm />
  ) : section === "wifi" ? (
    <WifiForm />
  ) : section === "qr-code" ? (
    <QrManager />
  ) : section === "staff" ? (
    <StaffManager />
  ) : (
    <ModifierManager />
  );
}
function SettingsForm() {
  const { settings, refresh } = useRestaurant();
  const [form, setForm] = useState({
    name: settings.name,
    name_fr: settings.nameFr,
    name_ar: settings.nameAr,
    description: settings.description,
    address: settings.address,
    phone: settings.phone,
    whatsapp: settings.whatsapp,
    google_review_url: settings.googleReviewUrl,
    maps_url: settings.mapsUrl,
    cover_image: settings.coverImage,
    logo: settings.logo || "",
    welcome_message: settings.welcome_message,
    timezone: settings.timezone,
    tax_bps: String(settings.tax_bps),
    session_hours: "6",
    opening_hours: JSON.stringify(settings.hours, null, 2),
  });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (settings.id)
      supabase
        .from("restaurant_settings")
        .select("session_hours")
        .eq("id", settings.id)
        .single()
        .then(({ data }) => {
          if (data)
            setForm((old) => ({
              ...old,
              session_hours: String(data.session_hours),
            }));
        });
  }, [settings.id]);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      new Intl.DateTimeFormat("en", { timeZone: form.timezone });
      for (const key of [
        "google_review_url",
        "maps_url",
        "cover_image",
        "logo",
      ] as const) {
        if (
          form[key] &&
          !["http:", "https:"].includes(new URL(form[key]).protocol)
        )
          throw new Error("Links must use HTTPS or HTTP.");
      }
      const hours = JSON.parse(form.opening_hours);
      if (
        !Array.isArray(hours) ||
        !hours.every(
          (h) => typeof h.day === "string" && typeof h.time === "string",
        )
      )
        throw new Error("Opening hours must be a list of day/time objects.");
      const payload = {
        ...form,
        opening_hours: hours,
        tax_bps: Number(form.tax_bps),
        session_hours: Number(form.session_hours),
        logo: form.logo || null,
        updated_at: new Date().toISOString(),
      };
      const { error } = settings.id
        ? await supabase
            .from("restaurant_settings")
            .update(payload)
            .eq("id", settings.id)
        : await supabase.from("restaurant_settings").insert(payload);
      if (error) throw error;
      await refresh();
      toast.success("Your restaurant details are saved.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={save} className="ops-panel configuration-form">
      <div className="panel-heading">
        <div>
          <h2>Your Maison Or</h2>
          <p>These details appear throughout your guest experience.</p>
        </div>
        <ShieldCheck size={20} />
      </div>
      <div className="config-grid">
        {(
          [
            { key: "name", label: "Restaurant name" },
            { key: "name_fr", label: "Name · French" },
            { key: "name_ar", label: "Name · Arabic" },
            { key: "description", label: "Description" },
            { key: "welcome_message", label: "Welcome message" },
            { key: "address", label: "Address" },
            { key: "phone", label: "Phone" },
            {
              key: "whatsapp",
              label: "WhatsApp number · country code, digits only",
            },
            { key: "google_review_url", label: "Google review URL" },
            { key: "maps_url", label: "Google Maps URL" },
            { key: "cover_image", label: "Cover photograph URL" },
            { key: "logo", label: "Logo URL" },
            { key: "timezone", label: "IANA timezone" },
            { key: "tax_bps", label: "Tax in basis points · 100 = 1%" },
            { key: "session_hours", label: "Maximum table visit · hours" },
          ] as const
        ).map((x) => (
          <label className="field-label" key={x.key}>
            {x.label}
            <input
              className="lux-input"
              dir={x.key === "name_ar" ? "rtl" : undefined}
              required={[
                "name",
                "timezone",
                "tax_bps",
                "session_hours",
              ].includes(x.key)}
              value={form[x.key]}
              type={
                ["tax_bps", "session_hours"].includes(x.key) ? "number" : "text"
              }
              min={x.key === "session_hours" ? 1 : 0}
              max={x.key === "session_hours" ? 24 : 10000}
              onChange={(e) => setForm({ ...form, [x.key]: e.target.value })}
            />
          </label>
        ))}
        <label className="field-label col-span-full">
          Opening hours · day/time list
          <textarea
            className="lux-input !min-h-[170px] font-mono"
            value={form.opening_hours}
            onChange={(e) =>
              setForm({ ...form, opening_hours: e.target.value })
            }
          />
        </label>
      </div>
      <div className="config-footer">
        <p>
          Changes apply to future orders. Historical prices and tax totals are
          preserved.
        </p>
        <button className="lux-button" disabled={busy}>
          <Save size={15} />
          {busy ? "Saving…" : "Save restaurant details"}
        </button>
      </div>
    </form>
  );
}
function WifiForm() {
  const r = useRestaurant();
  const [form, setForm] = useState({
    ssid: r.wifi.ssid,
    password: r.wifi.password,
    security: r.wifi.security,
    hidden: r.wifi.hidden,
    enabled: r.wifi.enabled,
  });
  const [id, setId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    supabase
      .from("wifi_settings")
      .select("*")
      .order("created_at")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setId(data.id);
          setForm({
            ssid: data.ssid,
            password: data.password,
            security: data.security,
            hidden: data.hidden,
            enabled: data.enabled,
          });
        }
      });
  }, []);
  const esc = (s: string) => s.replace(/([\\;,:\"])/g, "\\$1");
  const qr = `WIFI:T:${form.security};S:${esc(form.ssid)};P:${esc(form.password)};H:${form.hidden};;`;
  return (
    <div className="config-two-column">
      <form
        className="ops-panel configuration-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const { error } = id
            ? await supabase
                .from("wifi_settings")
                .update({ ...form, updated_at: new Date().toISOString() })
                .eq("id", id)
            : await supabase
                .from("wifi_settings")
                .insert(form)
                .select()
                .single()
                .then((res) => {
                  if (res.data) setId(res.data.id);
                  return res;
                });
          setBusy(false);
          if (error) toast.error(error.message);
          else {
            await r.refresh();
            toast.success("Guest Wi-Fi saved");
          }
        }}
      >
        <div className="panel-heading">
          <div>
            <h2>A little connection</h2>
            <p>QR codes are generated on this device.</p>
          </div>
          <Wifi size={18} />
        </div>
        <div className="space-y-5 p-6">
          <label className="field-label">
            Network name (SSID)
            <input
              className="lux-input"
              value={form.ssid}
              maxLength={32}
              required
              onChange={(e) => setForm({ ...form, ssid: e.target.value })}
            />
          </label>
          <label className="field-label">
            Guest password
            <input
              className="lux-input"
              value={form.password}
              maxLength={63}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>
          <label className="field-label">
            Security
            <select
              className="lux-input"
              value={form.security}
              onChange={(e) => setForm({ ...form, security: e.target.value })}
            >
              <option>WPA</option>
              <option>WEP</option>
              <option value="nopass">Open network</option>
            </select>
          </label>
          <label className="flex gap-3 text-xs">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            />
            Enable guest Wi-Fi access
          </label>
          <label className="flex gap-3 text-xs">
            <input
              type="checkbox"
              checked={form.hidden}
              onChange={(e) => setForm({ ...form, hidden: e.target.checked })}
            />
            Hidden network
          </label>
          <button className="lux-button" disabled={busy}>
            <Save size={15} />
            Save connection details
          </button>
        </div>
      </form>
      <div className="ops-panel flex flex-col items-center justify-center p-8 gap-5">
        <span className="eyebrow">SCAN. CONNECT. MAKE YOURSELF AT HOME.</span>
        <QrCodeImage value={qr} />
        <h2 className="font-serif text-3xl">{form.ssid}</h2>
        <p className="text-xs text-muted-foreground">
          Your credentials stay out of third-party QR services.
        </p>
      </div>
    </div>
  );
}
function QrManager() {
  const ops = useOperations();
  const r = useRestaurant();
  const { run, busy } = useStaffCommand();
  const [origin, setOrigin] = useState("");
  const [selected, setSelected] = useState("general");
  const [fg, setFg] = useState("#30392f");
  const [bg, setBg] = useState("#ffffff");
  const [qrId, setQrId] = useState<string | null>(null);
  const [rotate, setRotate] = useState(false);
  useEffect(() => {
    setOrigin(window.location.origin);
    supabase
      .from("qr_code_settings")
      .select("*")
      .order("created_at")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setQrId(data.id);
          setFg("#" + data.foreground_color.replace("#", ""));
          setBg("#" + data.background_color.replace("#", ""));
        }
      });
  }, []);
  const table = ops.tables.find((t) => t.id === selected);
  const value = table ? `${origin}/?table=${table.qr_token}` : `${origin}/`;
  const download = async () => {
    const url = await QRCode.toDataURL(value, {
      width: 1000,
      margin: 4,
      color: { dark: fg, light: bg },
    });
    const a = document.createElement("a");
    a.href = url;
    a.download = `maison-or-${table ? "table-" + table.number : "welcome"}.png`;
    a.click();
  };
  const save = async () => {
    const payload = {
      foreground_color: fg.slice(1),
      background_color: bg.slice(1),
    };
    const { error } = qrId
      ? await supabase.from("qr_code_settings").update(payload).eq("id", qrId)
      : await supabase.from("qr_code_settings").insert(payload);
    if (error) toast.error(error.message);
    else toast.success("QR card colors saved");
  };
  return (
    <div className="config-two-column">
      <section className="ops-panel configuration-form no-print">
        <div className="panel-heading">
          <div>
            <h2>A welcoming first impression</h2>
            <p>Use your deployed public URL before printing.</p>
          </div>
          <QrCode size={20} />
        </div>
        <div className="p-6 space-y-5">
          <label className="field-label">
            Restaurant URL
            <input
              className="lux-input"
              type="url"
              value={origin}
              onChange={(e) => setOrigin(e.target.value.replace(/\/$/, ""))}
            />
          </label>
          <label className="field-label">
            Card destination
            <select
              className="lux-input"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="general">General restaurant portal</option>
              {ops.tables.map((t) => (
                <option key={t.id} value={t.id}>
                  Table {String(t.number).padStart(2, "0")}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-6">
            <label className="field-label">
              QR color
              <input
                className="block mt-2"
                aria-label="QR foreground color"
                type="color"
                value={fg}
                onChange={(e) => setFg(e.target.value)}
              />
            </label>
            <label className="field-label">
              Background
              <input
                className="block mt-2"
                aria-label="QR background color"
                type="color"
                value={bg}
                onChange={(e) => setBg(e.target.value)}
              />
            </label>
          </div>
          <button className="outline-action" onClick={save}>
            Save appearance
          </button>
          {table && (
            <>
              <div className="visit-note">
                QR {table.qr_active ? "active" : "revoked"}
                <button
                  disabled={busy}
                  onClick={() =>
                    run(
                      "table_state",
                      {
                        id: table.id,
                        state: table.state,
                        qr_active: !table.qr_active,
                      },
                      table.qr_active ? "QR disabled" : "QR enabled",
                    )
                  }
                >
                  {table.qr_active ? "Deactivate" : "Activate"}
                </button>
              </div>
              <button className="text-link" onClick={() => setRotate(true)}>
                <RotateCw size={13} />
                Regenerate table QR token
              </button>
            </>
          )}
          <div className="flex flex-wrap gap-3 pt-2">
            <button className="lux-button" onClick={download}>
              <Download size={15} />
              Download QR
            </button>
            <button className="outline-action" onClick={() => window.print()}>
              Print table card
            </button>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            A table QR opens only an active, staff-controlled visit. Visits
            expire automatically. General QR guests identify their table with a
            visit code.
          </p>
        </div>
      </section>
      <section className="qr-print-card">
        <span className="eyebrow">{r.settings.name.toUpperCase()}</span>
        <div className="font-serif text-6xl my-5 text-[#a88d5d]">M</div>
        <h2>
          A lovely moment
          <br />
          starts here.
        </h2>
        <p>Scan to explore. Order at your pace.</p>
        {origin && (
          <QrCodeImage value={value} foreground={fg} background={bg} />
        )}
        <strong>
          {table
            ? `TABLE ${String(table.number).padStart(2, "0")}`
            : "WELCOME TO OUR TABLE"}
        </strong>
        <small>Good moments. Beautifully served.</small>
      </section>
      <Dialog open={rotate} onOpenChange={setRotate}>
        <DialogContent className="guest-dialog">
          <DialogHeader>
            <DialogTitle>Regenerate table QR?</DialogTitle>
            <DialogDescription>
              The printed card for this table will stop resolving. Download and
              print a new card afterwards. Existing visit access ends when the
              visit closes or expires.
            </DialogDescription>
          </DialogHeader>
          <button
            className="lux-button"
            disabled={busy}
            onClick={async () => {
              if (
                table &&
                (await run(
                  "rotate_qr",
                  { id: table.id },
                  "QR token regenerated",
                ))
              )
                setRotate(false);
            }}
          >
            Regenerate token
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function StaffManager() {
  const ops = useOperations();
  const { run, busy } = useStaffCommand();
  const [open, setOpen] = useState(false);
  const blank = {
    id: "",
    display_name: "",
    role: "waiter",
    active: true,
    can_collect: false,
  };
  const [form, setForm] = useState(blank);
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          className="lux-button"
          onClick={() => {
            setForm(blank);
            setOpen(true);
          }}
        >
          <Plus size={15} />
          Add team member
        </button>
      </div>
      <section className="ops-panel">
        <div className="ops-table-wrap">
          <table className="ops-table">
            <thead>
              <tr>
                <th>TEAM MEMBER</th>
                <th>ROLE</th>
                <th>PAYMENT ACCESS</th>
                <th>STATUS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {ops.staff.map((s) => (
                <tr key={s.id}>
                  <td>
                    {s.display_name}
                    <small>{s.id}</small>
                  </td>
                  <td className="capitalize">{s.role}</td>
                  <td>
                    {["owner", "manager", "cashier"].includes(s.role) ||
                    s.can_collect
                      ? "Can confirm payments"
                      : "No payment access"}
                  </td>
                  <td>
                    <span
                      className={`status-badge ${s.active ? "status-completed" : "status-cancelled"}`}
                    >
                      {s.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <button
                      className="text-link"
                      onClick={() => {
                        setForm(s);
                        setOpen(true);
                      }}
                    >
                      Edit permissions
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="accounting-note">
        Create staff login accounts in Supabase Auth first, then enter their
        user UUID here. Only owners can grant or change roles. Kitchen staff
        cannot access payments or reports. Waiters can access assigned tables;
        payment collection requires explicit permission.
      </p>
      <AuditLog />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="guest-dialog">
          <DialogHeader>
            <DialogTitle className="!font-serif !text-3xl">
              A place on the team.
            </DialogTitle>
            <DialogDescription>
              Link an existing Supabase Auth user. Never enter a password here.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await run("staff", form, "Staff permissions saved"))
                setOpen(false);
            }}
          >
            <label className="field-label">
              Auth user UUID
              <input
                className="lux-input"
                required
                pattern="[0-9a-fA-F-]{36}"
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
              />
            </label>
            <label className="field-label">
              Name
              <input
                className="lux-input"
                required
                maxLength={100}
                value={form.display_name}
                onChange={(e) =>
                  setForm({ ...form, display_name: e.target.value })
                }
              />
            </label>
            <label className="field-label">
              Role
              <select
                className="lux-input"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {["owner", "manager", "waiter", "cashier", "kitchen"].map(
                  (role) => (
                    <option key={role}>{role}</option>
                  ),
                )}
              </select>
            </label>
            <label className="flex gap-3 text-xs">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              Active staff member
            </label>
            <label className="flex gap-3 text-xs">
              <input
                type="checkbox"
                disabled={form.role !== "waiter"}
                checked={form.can_collect}
                onChange={(e) =>
                  setForm({ ...form, can_collect: e.target.checked })
                }
              />
              Allow waiter to collect offline payments
            </label>
            <button className="lux-button w-full" disabled={busy}>
              Save staff permissions
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function AuditLog() {
  const [logs, setLogs] = useState<
    { id: string; actor: string; action: string; created_at: string }[]
  >([]);
  useEffect(() => {
    supabase
      .from("audit_log")
      .select("id,actor,action,created_at")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setLogs(data || []));
  }, []);
  return (
    <section className="ops-panel">
      <div className="panel-heading">
        <div>
          <h2>Recent audit trail</h2>
          <p>Last 50 operational changes, with staff identity.</p>
        </div>
        <button
          className="outline-action"
          onClick={() =>
            downloadCsv("maison-or-audit.csv", [
              ["Timestamp", "Actor UUID", "Action"],
              ...logs.map((l) => [l.created_at, l.actor, l.action]),
            ])
          }
        >
          <Download size={14} />
          Export
        </button>
      </div>
      <div className="ops-table-wrap">
        <table className="ops-table">
          <thead>
            <tr>
              <th>ACTION</th>
              <th>ACTOR</th>
              <th>TIME</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td>{l.action.replaceAll("_", " ")}</td>
                <td>{l.actor}</td>
                <td>{new Date(l.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!logs.length && (
          <p className="p-8 text-center text-xs text-muted-foreground">
            Sensitive staff actions appear here.
          </p>
        )}
      </div>
    </section>
  );
}
function ModifierManager() {
  const r = useRestaurant();
  const { run, busy } = useStaffCommand();
  const [product, setProduct] = useState(r.products[0]?.id || "");
  const [name, setName] = useState("");
  const [group, setGroup] = useState("Extras");
  const [price, setPrice] = useState("0");
  const [cat, setCat] = useState(r.categories[0]?.id || "");
  const [recommended, setRecommended] = useState("");
  const selected = r.modifiers.filter((m) => m.product_id === product);
  return (
    <div className="config-two-column">
      <section className="ops-panel configuration-form">
        <div className="panel-heading">
          <div>
            <h2>Little extras. Just right.</h2>
            <p>Extras allow multiple selections. Other groups allow one.</p>
          </div>
        </div>
        <div className="p-6 space-y-5">
          <label className="field-label">
            Menu product
            <select
              className="lux-input"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
            >
              {r.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <div className="space-y-2">
            {selected.map((m) => (
              <div
                className="flex justify-between items-center p-3 border rounded text-xs"
                key={m.id}
              >
                <span>
                  {m.name}
                  <small className="block text-muted-foreground mt-1">
                    {m.group_name} · +{money(m.price_minor)} MAD
                  </small>
                </span>
                <button
                  className="text-link"
                  disabled={busy}
                  onClick={async () => {
                    if (await run("modifier", { id: m.id })) r.refresh();
                  }}
                >
                  {m.available ? "Disable" : "Enable"}
                </button>
              </div>
            ))}
          </div>
          <form
            className="space-y-4 border-t pt-4"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                if (
                  await run(
                    "modifier",
                    {
                      product_id: product,
                      name,
                      group_name: group,
                      price_minor: minor(price),
                    },
                    "Menu option added",
                  )
                ) {
                  setName("");
                  r.refresh();
                }
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
          >
            <label className="field-label">
              Option name
              <input
                className="lux-input"
                value={name}
                required
                maxLength={100}
                placeholder="e.g. Oat milk"
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="field-label">
              Group
              <input
                className="lux-input"
                value={group}
                required
                maxLength={100}
                placeholder="Extras, Size, Preparation…"
                onChange={(e) => setGroup(e.target.value)}
              />
            </label>
            <label className="field-label">
              Price added (MAD)
              <input
                className="lux-input"
                inputMode="decimal"
                value={price}
                required
                onChange={(e) => setPrice(e.target.value)}
              />
            </label>
            <button className="lux-button" disabled={busy || !product}>
              <Plus size={14} />
              Add option
            </button>
          </form>
        </div>
      </section>
      <section className="ops-panel configuration-form">
        <div className="panel-heading">
          <div>
            <h2>A perfect little pairing.</h2>
            <p>Recommendations, thoughtfully chosen by your team.</p>
          </div>
        </div>
        <form
          className="p-6 space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              await run(
                "recommendation",
                { category_id: cat, product_id: recommended },
                "Pairing saved",
              )
            )
              r.refresh();
          }}
        >
          <label className="field-label">
            When a guest chooses from
            <select
              className="lux-input"
              value={cat}
              onChange={(e) => setCat(e.target.value)}
            >
              {r.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            Recommend
            <select
              className="lux-input"
              required
              value={recommended}
              onChange={(e) => setRecommended(e.target.value)}
            >
              <option value="">Choose a product</option>
              {r.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <button className="lux-button" disabled={busy || !recommended}>
            Save pairing
          </button>
          <div className="space-y-3 pt-5">
            {r.rules.map((rule) => (
              <p
                className="text-xs leading-loose text-muted-foreground"
                key={rule.category_id + rule.recommended_product_id}
              >
                {r.categories.find((c) => c.id === rule.category_id)?.name} →{" "}
                {
                  r.products.find((p) => p.id === rule.recommended_product_id)
                    ?.name
                }
              </p>
            ))}
          </div>
        </form>
      </section>
    </div>
  );
}
