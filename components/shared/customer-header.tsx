"use client";
import Link from "next/link";
import { ArrowUpRight, ConciergeBell, ShoppingBag, MapPin } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { useRestaurant } from "@/components/providers/restaurant-provider";
import { LanguageSelector } from "./language-selector";
import { openGuest } from "./guest-tools";
export function Brand({ inverse = false }: { inverse?: boolean }) {
  const { settings } = useRestaurant();
  return (
    <Link
      href="/"
      className={`brand ${inverse ? "brand-inverse" : ""}`}
      aria-label={`${settings.name} home`}
    >
      {settings.logo ? (
        <img className="brand-logo" src={settings.logo} alt="" />
      ) : (
        <span className="brand-mark">
          <span>M</span>
          <i />
        </span>
      )}
      <span className="brand-type">
        {settings.name}
        <small>RESTAURANT & CAFÉ</small>
      </span>
    </Link>
  );
}
export function CustomerHeader({
  page,
  transparent = false,
}: {
  page: "home" | "menu" | "feedback" | "wifi" | "orders";
  transparent?: boolean;
}) {
  const { t } = useLanguage();
  const { count, visit, settings } = useRestaurant();
  return (
    <>
      <div className="hospitality-strip">
        <span>A taste of the extraordinary.</span>
        <span>
          <MapPin size={11} /> Casablanca, Morocco <i /> Thoughtfully made.
          Warmly served.
        </span>
        <Link href="/admin">
          Staff entrance <ArrowUpRight size={11} />
        </Link>
      </div>
      <header
        className={`hospitality-header ${transparent ? "header-transparent" : ""}`}
      >
        <div className="hospitality-header-inner">
          <Brand />
          <nav className="desktop-guest-nav" aria-label="Main navigation">
            <Link className={page === "home" ? "active" : ""} href="/">
              {t("home")}
            </Link>
            <Link className={page === "menu" ? "active" : ""} href="/menu">
              {t("menu")}
            </Link>
            <Link className={page === "orders" ? "active" : ""} href="/orders">
              My orders
            </Link>
            <a href={settings.mapsUrl} target="_blank" rel="noreferrer">
              {t("findUs")}
              <ArrowUpRight size={12} />
            </a>
          </nav>
          <div className="header-actions">
            <LanguageSelector variant="dark" />
            <button className="table-pill" onClick={() => openGuest("table")}>
              <span className={visit ? "live-dot" : "neutral-dot"} />
              {visit
                ? `Table ${String(visit.table).padStart(2, "0")}`
                : "Your table"}
            </button>
            <button
              className="bag-button"
              aria-label={`Open cart, ${count} items`}
              onClick={() => openGuest("cart")}
            >
              <ShoppingBag size={19} />
              {count > 0 && <span>{count}</span>}
            </button>
          </div>
        </div>
        <nav className="mobile-guest-nav" aria-label="Mobile navigation">
          <Link href="/">{t("home")}</Link>
          <Link href="/menu">{t("menu")}</Link>
          <Link href="/orders">My orders</Link>
          <button onClick={() => openGuest("service")}>
            <ConciergeBell size={14} /> Assistance
          </button>
        </nav>
      </header>
    </>
  );
}
