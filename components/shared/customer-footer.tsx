"use client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Brand } from "./customer-header";
import { useRestaurant } from "@/components/providers/restaurant-provider";
export function CustomerFooter() {
  const { settings: s } = useRestaurant();
  return (
    <footer className="hospitality-footer">
      <div className="footer-top section-container">
        <div>
          <Brand inverse />
          <p>{s.description}</p>
        </div>
        <div>
          <span className="eyebrow">COME BY, STAY A WHILE</span>
          <a href={s.mapsUrl} target="_blank" rel="noreferrer">
            {s.address}
            <ArrowUpRight size={14} />
          </a>
          <a href={`tel:${s.phone.replace(/\s/g, "")}`}>{s.phone}</a>
        </div>
        <div>
          <span className="eyebrow">GOOD TO KNOW</span>
          <Link href="/wifi">
            Guest Wi-Fi <ArrowUpRight size={14} />
          </Link>
          <Link href="/feedback">
            Share your experience <ArrowUpRight size={14} />
          </Link>
          <a
            target="_blank"
            rel="noreferrer"
            href={`https://wa.me/${s.whatsapp.replace(/\D/g, "")}`}
          >
            Say hello on WhatsApp <ArrowUpRight size={14} />
          </a>
        </div>
        <div>
          <span className="eyebrow">OUR DOORS ARE OPEN</span>
          {s.hours.map((h: { day: string; time: string }) => (
            <p className="footer-hours" key={h.day}>
              {h.day}
              <span>{h.time}</span>
            </p>
          ))}
        </div>
      </div>
      <div className="footer-bottom section-container">
        <span>
          © {new Date().getFullYear()} {s.name}. Made for good moments.
        </span>
        <span>
          THE ART OF HOSPITALITY <span className="gold-diamond">◇</span>{" "}
          CASABLANCA
        </span>
        <Link href="/admin">
          Staff entrance <ArrowUpRight size={12} />
        </Link>
      </div>
    </footer>
  );
}
