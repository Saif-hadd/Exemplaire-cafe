"use client";

import { supabase } from "./supabase";
import { imageSource } from "./images";
import {
  MenuCategory,
  MenuProduct,
  menuCategories,
  menuProducts,
  restaurantInfo,
  wifiSettings,
} from "./data";

export type Modifier = {
  id: string;
  product_id: string;
  name: string;
  group_name: string;
  price_minor: number;
  available: boolean;
};
export type Settings = typeof restaurantInfo & {
  timezone: string;
  tax_bps: number;
  welcome_message: string;
  id?: string;
};
export type Visit = {
  id: string;
  token: string;
  table: number;
  expires_at: string;
};
export type CartItem = {
  key: string;
  product: MenuProduct;
  quantity: number;
  modifiers: Modifier[];
  notes: string;
};
export type Order = {
  id: string;
  reference: number;
  session_id: string;
  status: string;
  total_minor: number;
  subtotal_minor: number;
  tax_minor: number;
  notes: string;
  reason?: string;
  recognized_at: string | null;
  created_at: string;
  updated_at: string;
};
export type OrderItem = {
  id: string;
  order_id: string;
  name: string;
  quantity: number;
  unit_minor: number;
  line_minor: number;
  category_name: string;
  notes: string;
  modifiers: { name: string; price_minor: number }[];
};
export type Table = {
  id: string;
  number: number;
  seats: number;
  state: string;
  zone_id: string | null;
  qr_token: string;
  qr_active: boolean;
  assigned_to: string | null;
};
export type Session = {
  id: string;
  table_id: string;
  join_code: string;
  access_token: string;
  opened_at: string;
  expires_at: string;
  closed_at: string | null;
};
export type Payment = {
  id: string;
  session_id: string;
  amount_minor: number;
  method: string;
  reference: string;
  confirmed_by: string;
  created_at: string;
};
export type Adjustment = {
  id: string;
  payment_id: string;
  amount_minor: number;
  reason: string;
  created_at: string;
};
export type Allocation = {
  payment_id: string;
  order_id: string;
  amount_minor: number;
};
export type Staff = {
  id: string;
  display_name: string;
  role: string;
  active: boolean;
  can_collect: boolean;
};
export type Request = {
  id: string;
  session_id: string;
  type: string;
  status: string;
  created_at: string;
};
export const defaults: Settings = {
  ...restaurantInfo,
  timezone: "Africa/Casablanca",
  tax_bps: 0,
  welcome_message: "A little time. A beautiful table. Something extraordinary.",
};
export const money = (minor: number) =>
  new Intl.NumberFormat("en-MA", {
    minimumFractionDigits: minor % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(minor / 100);
export const minor = (value: string) => {
  if (!/^\d+(\.\d{1,2})?$/.test(value))
    throw new Error("Enter a valid amount with at most two decimals.");
  const [whole, fraction = ""] = value.split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(amount) || amount > 2147483647)
    throw new Error("Amount is too large.");
  return amount;
};
export const lineTotal = (i: CartItem) =>
  (Math.round(i.product.price * 100) +
    i.modifiers.reduce((s, m) => s + m.price_minor, 0)) *
  i.quantity;

export async function rpc<T>(
  name: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message);
  if (data && typeof data === "object" && "error" in data)
    throw new Error(data.error);
  return data as T;
}
export const staffAction = (
  action: string,
  payload: Record<string, unknown> = {},
) =>
  rpc<{ id: string }>("staff_action", { p_action: action, p_payload: payload });

export async function loadCatalog() {
  const [p, c, s, w, m, r] = await Promise.all([
    supabase.from("menu_products").select("*").order("sort_order"),
    supabase
      .from("menu_categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("restaurant_settings")
      .select("*")
      .order("created_at")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("wifi_settings")
      .select("*")
      .order("created_at")
      .limit(1)
      .maybeSingle(),
    supabase.from("menu_modifier_options").select("*"),
    supabase.from("recommendation_rules").select("*"),
  ]);
  const live = !p.error && !c.error;
  const activeCategories = new Set((c.data || []).map((x) => x.id));
  const products: MenuProduct[] = live
    ? (p.data || [])
        .filter((x) => !x.archived && activeCategories.has(x.category_id))
        .map((x) => ({
          id: x.id,
          categoryId: x.category_id,
          name: x.name,
          nameFr: x.name_fr,
          nameAr: x.name_ar,
          description: x.description,
          descriptionFr: x.description_fr,
          descriptionAr: x.description_ar,
          price: Number(x.price),
          image: imageSource(x.image),
          available: x.available,
          featured: x.featured,
          bestseller: x.bestseller,
          ingredients: x.ingredients || [],
          allergens: x.allergens || [],
          dietary: x.dietary || [],
        }))
    : menuProducts;
  const categories: MenuCategory[] = live
    ? (c.data || []).map((x) => ({
        id: x.id,
        name: x.name,
        nameFr: x.name_fr,
        nameAr: x.name_ar,
        icon: x.icon,
        order: x.sort_order,
      }))
    : menuCategories;
  const x = s.data;
  const settings: Settings = x
    ? {
        ...defaults,
        id: x.id,
        name: x.name,
        nameFr: x.name_fr || x.name,
        nameAr: x.name_ar || x.name,
        description: x.description,
        address: x.address,
        phone: x.phone,
        whatsapp: x.whatsapp,
        googleReviewUrl: x.google_review_url,
        mapsUrl: x.maps_url,
        coverImage: imageSource(x.cover_image) || defaults.coverImage,
        logo: x.logo,
        hours: x.opening_hours || [],
        social: x.social_links || {},
        timezone: x.timezone || defaults.timezone,
        tax_bps: x.tax_bps || 0,
        welcome_message: x.welcome_message || defaults.welcome_message,
      }
    : defaults;
  return {
    products,
    categories,
    settings,
    wifi: w.data || { ...wifiSettings, enabled: false },
    modifiers: (m.data || []) as Modifier[],
    rules: (r.data || []) as {
      category_id: string;
      recommended_product_id: string;
    }[],
    live,
    ordering: live && !m.error,
  };
}

export const nextStatus: Record<string, string> = {
  pending: "accepted",
  accepted: "preparing",
  preparing: "ready",
  ready: "served",
  served: "completed",
};
export const statusLabel: Record<string, string> = {
  pending: "New order",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready to serve",
  served: "Served",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Rejected",
};
export const statusAction: Record<string, string> = {
  pending: "Accept order",
  accepted: "Start preparing",
  preparing: "Mark ready",
  ready: "Mark served",
  served: "Complete order",
};
