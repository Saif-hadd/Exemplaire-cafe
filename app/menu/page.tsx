"use client";
import { useMemo, useState } from "react";
import {
  Search,
  SlidersHorizontal,
  ShoppingBag,
  ArrowRight,
  X,
  Coffee,
  Leaf,
  CupSoda,
  Wine,
  Croissant,
  Salad,
  UtensilsCrossed,
  Beef,
  Pizza,
  CakeSlice,
  Grid2X2,
} from "lucide-react";
import { CustomerHeader } from "@/components/shared/customer-header";
import { CustomerFooter } from "@/components/shared/customer-footer";
import { ProductCard } from "@/components/shared/product-card";
import { useRestaurant } from "@/components/providers/restaurant-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { openGuest } from "@/components/shared/guest-tools";
import { money } from "@/lib/restaurant";
const icons: Record<string, typeof Coffee> = {
  Coffee,
  Leaf,
  CupSoda,
  Wine,
  Croissant,
  Salad,
  UtensilsCrossed,
  Beef,
  Pizza,
  CakeSlice,
};
export default function MenuPage() {
  const r = useRestaurant();
  const { locale, t } = useLanguage();
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [diet, setDiet] = useState("all");
  const filtered = useMemo(
    () =>
      r.products.filter(
        (p) =>
          (category === "all" || p.categoryId === category) &&
          (diet === "all" || p.dietary?.includes(diet)) &&
          `${p.name} ${p.nameFr || ""} ${p.nameAr || ""} ${p.description}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [r.products, category, search, diet],
  );
  return (
    <div className="hospitality-page">
      <CustomerHeader page="menu" />
      <main>
        <section className="menu-heading section-container">
          <span className="eyebrow">SEASONAL FLAVORS · TIMELESS PLEASURES</span>
          <h1>
            {locale === "fr"
              ? "À la carte."
              : locale === "ar"
                ? "قائمتنا، بكل حب."
                : "Something for every mood."}
          </h1>
          <p>From your first sip to your last bite. Make it a moment.</p>
        </section>
        <div className="menu-toolbar section-container">
          <div className="menu-search">
            <Search size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={t("search")}
            />
            {search && (
              <button aria-label="Clear search" onClick={() => setSearch("")}>
                <X size={15} />
              </button>
            )}
          </div>
          <label className="diet-filter">
            <SlidersHorizontal size={15} />
            <select
              aria-label="Dietary preference"
              value={diet}
              onChange={(e) => setDiet(e.target.value)}
            >
              <option value="all">All preferences</option>
              <option>Vegetarian</option>
              <option>Vegan</option>
              <option>Gluten-free</option>
            </select>
          </label>
          <div className="menu-table">
            <span className={r.visit ? "live-dot" : "neutral-dot"} />
            <button onClick={() => openGuest("table")}>
              {r.visit
                ? `Ordering for table ${String(r.visit.table).padStart(2, "0")}`
                : "Choose your table"}
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
        <div className="category-nav section-container">
          <button
            className={category === "all" ? "active" : ""}
            onClick={() => setCategory("all")}
          >
            <Grid2X2 size={17} />
            {t("all")}
          </button>
          {r.categories.map((c) => {
            const Icon = icons[c.icon] || UtensilsCrossed;
            return (
              <button
                className={category === c.id ? "active" : ""}
                key={c.id}
                onClick={() => setCategory(c.id)}
              >
                <Icon size={18} />
                {locale === "fr"
                  ? c.nameFr || c.name
                  : locale === "ar"
                    ? c.nameAr || c.name
                    : c.name}
              </button>
            );
          })}
        </div>
        <section className="menu-results section-container">
          <div className="menu-results-heading">
            <h2>
              {category === "all"
                ? "The full collection"
                : r.categories.find((c) => c.id === category)?.name}
            </h2>
            <span>{filtered.length} thoughtfully crafted choices</span>
          </div>
          {r.loading ? (
            <div className="dish-grid">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="dish-skeleton animate-pulse" />
              ))}
            </div>
          ) : filtered.length ? (
            <div className="dish-grid">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <UtensilsCrossed size={32} />
              <h3>No dishes found.</h3>
              <p>Try another category or a different search.</p>
              <button
                className="text-link"
                onClick={() => {
                  setSearch("");
                  setCategory("all");
                  setDiet("all");
                }}
              >
                Reset filters <ArrowRight size={16} />
              </button>
            </div>
          )}
          {!r.loading && !r.live && (
            <p className="catalog-notice">
              Sample menu · Online ordering is unavailable until the restaurant
              database is connected.
            </p>
          )}
        </section>
      </main>
      <CustomerFooter />
      {r.count > 0 && (
        <button className="floating-cart" onClick={() => openGuest("cart")}>
          <span>
            <ShoppingBag size={18} />
            <b>{r.count}</b>View your selection
          </span>
          <span>
            {money(r.total)} MAD <ArrowRight size={17} />
          </span>
        </button>
      )}
    </div>
  );
}
