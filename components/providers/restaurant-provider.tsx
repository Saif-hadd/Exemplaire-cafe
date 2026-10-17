"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  CartItem,
  Visit,
  defaults,
  lineTotal,
  loadCatalog,
} from "@/lib/restaurant";
import { menuCategories, menuProducts, wifiSettings } from "@/lib/data";
import { GuestTools } from "@/components/shared/guest-tools";

type Catalog = Awaited<ReturnType<typeof loadCatalog>>;
type Value = Catalog & {
  loading: boolean;
  refresh: () => Promise<void>;
  cart: CartItem[];
  add: (item: CartItem) => void;
  update: (key: string, qty: number) => void;
  clear: () => void;
  total: number;
  count: number;
  visit: Visit | null;
  setVisit: (v: Visit | null) => void;
};
const Context = createContext<Value | null>(null);
export function RestaurantProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [catalog, setCatalog] = useState<Catalog>({
    products: menuProducts,
    categories: menuCategories,
    settings: defaults,
    wifi: { ...wifiSettings, enabled: false },
    modifiers: [],
    rules: [],
    live: false,
    ordering: false,
  });
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [visit, setVisitState] = useState<Visit | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const next = await loadCatalog();
      setCatalog(next);
      if (next.live)
        setCart((old) =>
          old.map((item) => ({
            ...item,
            product: next.products.find((p) => p.id === item.product.id) || {
              ...item.product,
              available: false,
            },
            modifiers: item.modifiers.map(
              (m) =>
                next.modifiers.find((x) => x.id === m.id) || {
                  ...m,
                  available: false,
                },
            ),
          })),
        );
    } catch {
      /* Preserve last successful catalog; ordering stays disabled on initial failure. */
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh();
    try {
      const saved = JSON.parse(localStorage.getItem("maison-visit") || "null");
      if (saved && Date.parse(saved.expires_at) > Date.now())
        setVisitState(saved);
      const lines = JSON.parse(localStorage.getItem("maison-cart") || "[]");
      if (Array.isArray(lines))
        setCart(
          lines.filter(
            (x) => x.product && Number.isInteger(x.quantity) && x.quantity > 0,
          ),
        );
    } catch {
      /* Ignore invalid browser state. */
    }
    setHydrated(true);
    const online = () => refresh();
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, [refresh]);
  useEffect(() => {
    if (hydrated) localStorage.setItem("maison-cart", JSON.stringify(cart));
  }, [cart, hydrated]);
  const setVisit = (v: Visit | null) => {
    setVisitState(v);
    localStorage.setItem("maison-visit", JSON.stringify(v));
  };
  useEffect(() => {
    if (!visit) return;
    const timer = setTimeout(
      () => setVisit(null),
      Math.max(0, Date.parse(visit.expires_at) - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [visit]);
  const add = (item: CartItem) =>
    setCart((old) => {
      const index = old.findIndex((i) => i.key === item.key);
      return index < 0
        ? [...old, item]
        : old.map((i, n) =>
            n === index
              ? { ...i, quantity: Math.min(50, i.quantity + item.quantity) }
              : i,
          );
    });
  const update = (key: string, quantity: number) =>
    setCart((old) =>
      old
        .map((i) =>
          i.key === key ? { ...i, quantity: Math.min(50, quantity) } : i,
        )
        .filter((i) => i.quantity > 0),
    );
  return (
    <Context.Provider
      value={{
        ...catalog,
        loading,
        refresh,
        cart,
        add,
        update,
        clear: () => setCart([]),
        total: cart.reduce((s, i) => s + lineTotal(i), 0),
        count: cart.reduce((s, i) => s + i.quantity, 0),
        visit,
        setVisit,
      }}
    >
      {children}
      <GuestTools />
    </Context.Provider>
  );
}
export function useRestaurant() {
  const value = useContext(Context);
  if (!value) throw new Error("RestaurantProvider missing");
  return value;
}
