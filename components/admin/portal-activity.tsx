"use client";
import { useEffect, useState } from "react";
import { rpc } from "@/lib/restaurant";
type Activity = {
  views: number;
  products: number;
  categories: number;
  feedback: number;
  rating: number | null;
  pages: { page: string; count: number }[];
  actions: { action: string | null; count: number }[];
};
export function PortalActivity() {
  const [data, setData] = useState<Activity | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    rpc<Activity>("portal_activity")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <div className="space-y-6">
      {error && <p className="form-error">{error}</p>}
      {data ? (
        <>
          <div className="kpi-grid">
            {[
              ["Guest page views", data.views],
              ["Menu products", data.products],
              ["Active categories", data.categories],
              ["Private feedback", data.feedback],
            ].map(([label, value]) => (
              <article className="kpi-card" key={label}>
                <div>
                  <span>{label}</span>
                </div>
                <h2>{value}</h2>
              </article>
            ))}
          </div>
          <div className="overview-main-grid">
            <section className="ops-panel">
              <div className="panel-heading">
                <div>
                  <h2>A little window into the experience</h2>
                  <p>Recorded page views, across the guest portal</p>
                </div>
              </div>
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>GUEST PAGE</th>
                    <th>VIEWS</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pages.map((p) => (
                    <tr key={p.page}>
                      <td className="capitalize">{p.page}</td>
                      <td>{p.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.pages.length && (
                <p className="p-8 text-xs text-muted-foreground">
                  No recorded guest page views yet.
                </p>
              )}
            </section>
            <section className="ops-panel">
              <div className="panel-heading">
                <div>
                  <h2>The thoughtful little actions</h2>
                  <p>Clicks are not completed reviews or sent messages.</p>
                </div>
              </div>
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>ACTION</th>
                    <th>RECORDED CLICKS</th>
                  </tr>
                </thead>
                <tbody>
                  {data.actions.map((a) => (
                    <tr key={a.action || "none"}>
                      <td>{a.action?.replaceAll("_", " ") || "Unspecified"}</td>
                      <td>{a.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.actions.length && (
                <p className="p-8 text-xs text-muted-foreground">
                  No recorded guest actions yet.
                </p>
              )}
            </section>
          </div>
          <p className="accounting-note">
            Private feedback average: {data.rating ?? "—"} / 5. These are
            private submissions, independent of Google review ratings.
          </p>
        </>
      ) : (
        !error && <div className="h-40 animate-pulse bg-secondary rounded" />
      )}
    </div>
  );
}
