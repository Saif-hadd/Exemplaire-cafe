"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  ChefHat,
  ChevronDown,
  CircleHelp,
  CreditCard,
  FolderTree,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Menu,
  QrCode,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  Star,
  Users,
  UtensilsCrossed,
  Wifi,
  X,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useOperations } from "@/components/providers/operations-provider";
import { Brand } from "@/components/shared/customer-header";
const groups = [
  {
    name: "WORKSPACE",
    items: [
      {
        label: "Overview",
        href: "/admin",
        icon: LayoutDashboard,
        roles: ["owner", "manager", "cashier"],
      },
      {
        label: "Live orders",
        href: "/admin/orders",
        icon: ShoppingBag,
        roles: ["owner", "manager", "waiter", "kitchen"],
      },
      {
        label: "Analytics",
        href: "/admin/analytics",
        icon: BarChart3,
        roles: ["owner", "manager"],
      },
      {
        label: "Portal activity",
        href: "/admin/activity",
        icon: BarChart3,
        roles: ["owner", "manager"],
      },
    ],
  },
  {
    name: "THE FLOOR",
    items: [
      {
        label: "Tables & sessions",
        href: "/admin/tables",
        icon: LayoutGrid,
        roles: ["owner", "manager", "waiter", "cashier"],
      },
      {
        label: "Kitchen display",
        href: "/admin/kitchen",
        icon: ChefHat,
        roles: ["owner", "manager", "kitchen"],
      },
      {
        label: "Payments",
        href: "/admin/payments",
        icon: CreditCard,
        roles: ["owner", "manager", "cashier", "waiter"],
      },
      {
        label: "Service requests",
        href: "/admin/service",
        icon: Bell,
        roles: ["owner", "manager", "waiter"],
      },
    ],
  },
  {
    name: "THE EXPERIENCE",
    items: [
      {
        label: "Menu products",
        href: "/admin/products",
        icon: UtensilsCrossed,
        roles: ["owner", "manager"],
      },
      {
        label: "Categories",
        href: "/admin/categories",
        icon: FolderTree,
        roles: ["owner", "manager"],
      },
      {
        label: "Modifiers & pairings",
        href: "/admin/modifiers",
        icon: SlidersHorizontal,
        roles: ["owner", "manager"],
      },
      {
        label: "Guest feedback",
        href: "/admin/feedback",
        icon: Star,
        roles: ["owner", "manager"],
      },
      {
        label: "QR codes",
        href: "/admin/qr-code",
        icon: QrCode,
        roles: ["owner", "manager"],
      },
      {
        label: "Guest Wi-Fi",
        href: "/admin/wifi",
        icon: Wifi,
        roles: ["owner", "manager"],
      },
    ],
  },
  {
    name: "MANAGEMENT",
    items: [
      {
        label: "Staff & permissions",
        href: "/admin/staff",
        icon: Users,
        roles: ["owner"],
      },
      {
        label: "Reports & closing",
        href: "/admin/reports",
        icon: BarChart3,
        roles: ["owner", "manager", "cashier"],
      },
      {
        label: "Restaurant settings",
        href: "/admin/settings",
        icon: Settings,
        roles: ["owner", "manager"],
      },
    ],
  },
];
export function AdminSidebar() {
  const path = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const ops = useOperations();
  const [mobile, setMobile] = useState(false);
  const count = ops.orders.filter((o) => o.status === "pending").length;
  const role = ops.profile?.role || "";
  const content = (
    <>
      <div className="admin-brand">
        <Brand inverse />
        <span>HOSPITALITY, IN HARMONY.</span>
      </div>
      <div className="restaurant-switch">
        <span className="live-dot" />
        <div>
          Casablanca<small>Restaurant workspace</small>
        </div>
        <ChevronDown size={14} />
      </div>
      <nav aria-label="Staff navigation">
        {groups.map((g) => (
          <div className="admin-nav-group" key={g.name}>
            <span>{g.name}</span>
            {g.items
              .filter((i) => !role || i.roles.includes(role))
              .map((i) => (
                <Link
                  onClick={() => setMobile(false)}
                  className={path === i.href ? "active" : ""}
                  href={i.href}
                  key={i.href}
                >
                  <i.icon size={17} />
                  <span>{i.label}</span>
                  {i.href === "/admin/orders" && count > 0 && <b>{count}</b>}
                </Link>
              ))}
          </div>
        ))}
      </nav>
      <div className="admin-sidebar-footer">
        <Link href="/" target="_blank">
          View guest experience
          <ArrowUpRight size={15} />
        </Link>
        <div>
          <span className="staff-avatar">
            {ops.profile?.display_name?.slice(0, 1) || "M"}
          </span>
          <span>
            {ops.profile?.display_name || "Staff account"}
            <small>{role || "Access verification"}</small>
          </span>
          <button
            aria-label="Sign out"
            onClick={async () => {
              await signOut();
              router.push("/admin/login");
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </>
  );
  return (
    <>
      <button
        className="admin-mobile-toggle no-print"
        aria-label="Open staff navigation"
        onClick={() => setMobile(true)}
      >
        <Menu size={20} />
      </button>
      <aside className="admin-sidebar no-print">{content}</aside>
      {mobile && (
        <div className="fixed inset-0 z-50 bg-black/50 lg:hidden">
          <aside className="admin-sidebar !flex">
            <button
              className="absolute right-3 top-3 text-white"
              onClick={() => setMobile(false)}
              aria-label="Close navigation"
            >
              <X size={18} />
            </button>
            {content}
          </aside>
          <button
            className="absolute right-5 top-5 text-white"
            onClick={() => setMobile(false)}
            aria-label="Close navigation"
          >
            <X />
          </button>
        </div>
      )}
    </>
  );
}
