"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import { useOperations } from "@/components/providers/operations-provider";
import { useRestaurant } from "@/components/providers/restaurant-provider";
import { staffAction } from "@/lib/restaurant";
import { Overview } from "./overview";
import { OrdersBoard, ServiceBoard } from "./orders-board";
import { TablesBoard, PaymentsBoard } from "./tables-board";
import { Configuration } from "./configuration";
import { PortalActivity } from "./portal-activity";
const pages: Record<
  string,
  { title: string; description: string; roles: string[] }
> = {
  overview: {
    title: "A good day starts here.",
    description: "A little perspective on everything happening at Maison Or.",
    roles: ["owner", "manager", "cashier"],
  },
  activity: {
    title: "The guest experience, in view.",
    description:
      "Your existing portal activity and private feedback, thoughtfully followed.",
    roles: ["owner", "manager"],
  },
  orders: {
    title: "Live orders",
    description:
      "From the first selection to the final bite. Keep every moment moving.",
    roles: ["owner", "manager", "waiter", "kitchen"],
  },
  kitchen: {
    title: "Behind the pass.",
    description: "Fresh orders. Clear priorities. Beautifully prepared.",
    roles: ["owner", "manager", "kitchen"],
  },
  tables: {
    title: "A place for every guest.",
    description: "Your floor, your tables, and every visit in between.",
    roles: ["owner", "manager", "waiter", "cashier"],
  },
  payments: {
    title: "Every detail, accounted for.",
    description: "In-person payments, clear balances, and a complete record.",
    roles: ["owner", "manager", "cashier", "waiter"],
  },
  service: {
    title: "A thoughtful little touch.",
    description: "Your guests have a request. Your team has it covered.",
    roles: ["owner", "manager", "waiter"],
  },
  analytics: {
    title: "The bigger picture.",
    description: "Real performance, thoughtfully presented.",
    roles: ["owner", "manager"],
  },
  reports: {
    title: "Close the day with clarity.",
    description:
      "Sales, collections, and outstanding balances, all in one place.",
    roles: ["owner", "manager", "cashier"],
  },
  "qr-code": {
    title: "One scan. A warm welcome.",
    description: "Branded QR cards for your restaurant and every table.",
    roles: ["owner", "manager"],
  },
  staff: {
    title: "The people behind the moments.",
    description: "Manage your team and give each person the right access.",
    roles: ["owner"],
  },
  wifi: {
    title: "A seamless connection.",
    description: "Configure the complimentary network your guests enjoy.",
    roles: ["owner", "manager"],
  },
  settings: {
    title: "Make it unmistakably yours.",
    description:
      "Your restaurant, your identity, and all the thoughtful details.",
    roles: ["owner", "manager"],
  },
  modifiers: {
    title: "Made just the way they like.",
    description:
      "Thoughtful extras, preparation choices, and perfect pairings.",
    roles: ["owner", "manager"],
  },
};
export function useStaffCommand() {
  const ops = useOperations();
  const [busy, setBusy] = useState(false);
  const run = async (
    action: string,
    payload: Record<string, unknown>,
    message = "Saved",
  ) => {
    if (busy) return false;
    setBusy(true);
    try {
      await staffAction(action, payload);
      await ops.refresh();
      toast.success(message);
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { run, busy };
}
export function OperationsScreen({ section }: { section: string }) {
  const ops = useOperations();
  const { settings } = useRestaurant();
  const page = pages[section];
  const [sound, setSound] = useState(false);
  if (!page)
    return (
      <div className="empty-state">
        <h1>Page not found</h1>
        <Link className="lux-button" href="/admin">
          Back to your workspace
        </Link>
      </div>
    );
  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: settings.timezone,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());
  return (
    <>
      <header className="operations-topbar no-print">
        <span>
          Workspace <ChevronRight size={12} />{" "}
          {section === "overview" ? "Overview" : section.replace("-", " ")}
        </span>
        <div>
          <span className={`connection-state ${ops.connected ? "online" : ""}`}>
            <i />
            {ops.connected ? "Live updates" : "Checking for updates"}
          </span>
          <button
            aria-label={
              sound ? "Mute notifications" : "Enable notification sounds"
            }
            onClick={() => {
              const next = !sound;
              setSound(next);
              localStorage.setItem("maison-sound", next ? "on" : "off");
            }}
          >
            {sound ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>
          <Link
            href="/admin/service"
            className="notification-button"
            aria-label="Service requests"
          >
            <Bell size={18} />
            {ops.requests.some((r) => r.status === "pending") && <i />}
          </Link>
          <span className="staff-avatar small">
            {ops.profile?.display_name.slice(0, 1) || "M"}
          </span>
        </div>
      </header>
      <div className="operations-content">
        <div className="operations-heading">
          <div>
            <span className="eyebrow">
              MAISON OR · YOUR RESTAURANT, IN HARMONY
            </span>
            <h1>{page.title}</h1>
            <p>{page.description}</p>
          </div>
          <div className="operations-date">
            <CalendarDays size={14} />
            {date}
            <button
              aria-label="Refresh restaurant data"
              onClick={() => ops.refresh()}
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>
        {ops.error && (
          <div role="alert" className="form-error">
            {ops.error}
          </div>
        )}
        {ops.loading ? (
          <div className="grid grid-cols-2 gap-5">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-36 animate-pulse rounded bg-secondary"
              />
            ))}
          </div>
        ) : !ops.profile ? (
          <div className="ops-panel empty-state">
            <h3>Staff setup is required.</h3>
            <p>
              Your Supabase account is signed in. Apply the operations migration
              and provision a staff role to continue.
            </p>
          </div>
        ) : !page.roles.includes(ops.profile.role) ? (
          <div className="ops-panel empty-state">
            <h3>This page requires another role.</h3>
            <p>Your account is authorized for {ops.profile.role} operations.</p>
            <Link
              className="lux-button"
              href={
                ops.profile.role === "kitchen"
                  ? "/admin/kitchen"
                  : "/admin/tables"
              }
            >
              Open my workspace
            </Link>
          </div>
        ) : section === "overview" ||
          section === "analytics" ||
          section === "reports" ? (
          <Overview mode={section} />
        ) : section === "activity" ? (
          <PortalActivity />
        ) : section === "orders" || section === "kitchen" ? (
          <OrdersBoard kitchen={section === "kitchen"} />
        ) : section === "tables" ? (
          <TablesBoard />
        ) : section === "payments" ? (
          <PaymentsBoard />
        ) : section === "service" ? (
          <ServiceBoard />
        ) : (
          <Configuration section={section} />
        )}
      </div>
    </>
  );
}
