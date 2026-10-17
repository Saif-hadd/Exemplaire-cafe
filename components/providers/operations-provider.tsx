"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./auth-provider";
import {
  Adjustment,
  Allocation,
  Order,
  OrderItem,
  Payment,
  Request,
  Session,
  Staff,
  Table,
} from "@/lib/restaurant";
type State = {
  orders: Order[];
  items: OrderItem[];
  tables: Table[];
  sessions: Session[];
  payments: Payment[];
  allocations: Allocation[];
  adjustments: Adjustment[];
  requests: Request[];
  staff: Staff[];
  zones: { id: string; name: string }[];
  history: { order_id: string; status: string; created_at: string }[];
  profile: Staff | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  connected: boolean;
  updated: Date | null;
};
const empty: Pick<
  State,
  | "orders"
  | "items"
  | "tables"
  | "sessions"
  | "payments"
  | "allocations"
  | "adjustments"
  | "requests"
  | "staff"
  | "zones"
  | "history"
> = {
  orders: [],
  items: [],
  tables: [],
  sessions: [],
  payments: [],
  allocations: [],
  adjustments: [],
  requests: [],
  staff: [],
  zones: [],
  history: [],
};
const Context = createContext<State | null>(null);
async function all(table: string) {
  let result: any[] = [];
  for (let page = 0; ; page++) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(page * 1000, page * 1000 + 999);
    if (error) throw new Error(error.message);
    result = result.concat(data || []);
    if (!data || data.length < 1000) return result;
  }
}
export function OperationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [data, setData] = useState(empty);
  const [profile, setProfile] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [updated, setUpdated] = useState<Date | null>(null);
  const fetching = useRef(false);
  const seen = useRef<Set<string> | null>(null);
  const refresh = useCallback(async () => {
    if (!user || fetching.current) return;
    fetching.current = true;
    try {
      const { data: me, error: err } = await supabase
        .from("staff_users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (err)
        throw new Error(
          "Operations migration is not available. Apply the reviewed migration before using staff tools.",
        );
      if (!me || !me.active) {
        setProfile(null);
        throw new Error(
          "Your account has no active staff role. Ask the owner to provision your staff access.",
        );
      }
      setProfile(me as Staff);
      const finance = me.role !== "kitchen";
      const rows = await Promise.all([
        all("orders"),
        all("order_items"),
        all("restaurant_tables"),
        all("table_sessions"),
        finance ? all("payments") : [],
        finance ? all("payment_allocations") : [],
        finance ? all("payment_adjustments") : [],
        finance ? all("service_requests") : [],
        all("staff_users"),
        all("restaurant_zones"),
        all("order_status_history"),
      ]);
      const next = {
        orders: rows[0],
        items: rows[1],
        tables: rows[2],
        sessions: rows[3],
        payments: rows[4],
        allocations: rows[5],
        adjustments: rows[6],
        requests: rows[7],
        staff: rows[8],
        zones: rows[9],
        history: rows[10],
      };
      setData(next);
      setError("");
      setUpdated(new Date());
      if (seen.current && next.orders.some((o) => !seen.current!.has(o.id))) {
        window.dispatchEvent(new Event("maison:new-order"));
        if (localStorage.getItem("maison-sound") === "on") {
          try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            osc.frequency.setValueAtTime(660, ctx.currentTime);
            osc.start();
            osc.stop(ctx.currentTime + 0.18);
            osc.onended = () => ctx.close();
          } catch {
            /* Sound is best-effort after a user interaction. */
          }
        }
      }
      seen.current = new Set(next.orders.map((o) => o.id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      fetching.current = false;
      setLoading(false);
    }
  }, [user]);
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15000);
    const channel = supabase
      .channel("restaurant-operations")
      .on("postgres_changes", { event: "*", schema: "public" }, () => refresh())
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") refresh();
      });
    window.addEventListener("online", refresh);
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
      window.removeEventListener("online", refresh);
    };
  }, [refresh]);
  return (
    <Context.Provider
      value={{ ...data, profile, loading, error, refresh, connected, updated }}
    >
      {children}
    </Context.Provider>
  );
}
export function useOperations() {
  const value = useContext(Context);
  if (!value) throw new Error("OperationsProvider missing");
  return value;
}
