"use client";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ConciergeBell,
  Leaf,
  Receipt,
  Sparkles,
  Star,
  UtensilsCrossed,
  Wifi,
  Wine,
} from "lucide-react";
import { CustomerHeader } from "@/components/shared/customer-header";
import { CustomerFooter } from "@/components/shared/customer-footer";
import { ProductCard } from "@/components/shared/product-card";
import { useRestaurant } from "@/components/providers/restaurant-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { openGuest } from "@/components/shared/guest-tools";
export default function HomePage() {
  const { settings, products, visit, live, loading } = useRestaurant();
  const { locale } = useLanguage();
  const picks = [
    ...products.filter((p) => p.featured && p.available),
    ...products.filter((p) => !p.featured && p.available),
  ].slice(0, 4);
  const w =
    locale === "fr"
      ? {
          eyebrow: "BIENVENUE CHEZ MAISON OR",
          title: "Les belles choses",
          italic: "se savourent.",
          desc: "Une cuisine de saison, un café préparé avec passion et le plaisir de prendre son temps.",
          menu: "Découvrir le menu",
          service: "À VOTRE SERVICE",
          care: "Chaque détail compte.",
          picks: "Les favoris de la maison.",
          sub: "Un aperçu de ce que nous aimons préparer pour vous.",
        }
      : locale === "ar"
        ? {
            eyebrow: "مرحباً بكم في ميزون أور",
            title: "لحظات جميلة",
            italic: "ومذاق استثنائي.",
            desc: "أطباق موسمية، قهوة محضّرة بعناية، ومتعة الاستمتاع بكل لحظة.",
            menu: "استكشف القائمة",
            service: "في خدمتكم",
            care: "لأن التفاصيل تصنع الفرق.",
            picks: "اختيارات من القلب.",
            sub: "مجموعة مختارة، نحب أن نقدمها لكم.",
          }
        : {
            eyebrow: "WELCOME TO MAISON OR",
            title: "Good moments.",
            italic: "Beautifully served.",
            desc: "Seasonal flavors, thoughtfully crafted coffee, and the simple pleasure of being right here.",
            menu: "Explore the menu",
            service: "AT YOUR SERVICE",
            care: "Settle in. We’ll take care of you.",
            picks: "A few house favorites.",
            sub: "Thoughtfully chosen. Lovingly prepared. Always worth a taste.",
          };
  return (
    <div className="hospitality-page">
      <CustomerHeader page="home" />
      <main>
        <section className="welcome-hero">
          <div className="hero-copy">
            <div className="hero-eyebrow">
              <span />
              {w.eyebrow}
            </div>
            <h1>
              {w.title}
              <br />
              <em>{w.italic}</em>
            </h1>
            <p className="hero-description">
              {locale === "en" ? settings.welcome_message || w.desc : w.desc}
            </p>
            <div className="hero-cta">
              <Link className="lux-button" href="/menu">
                {w.menu}
                <ArrowUpRight size={17} />
              </Link>
              <button
                className="text-link"
                onClick={() => openGuest("service")}
              >
                <ConciergeBell size={17} /> A little assistance
              </button>
            </div>
            <div className="hero-footnote">
              <span className="live-dot" />
              {visit
                ? `Your table ${String(visit.table).padStart(2, "0")} is ready for something lovely.`
                : "Your next favorite moment starts here."}
              <span className="hero-footnote-rule" />
              <span>CASABLANCA</span>
            </div>
          </div>
          <div className="hero-photograph">
            <img
              src={settings.coverImage || '/images/20184685.jpg'}
              alt="Warm, sunlit restaurant with beautifully set dining tables"
              fetchPriority="high"
            />
            <div className="hero-photo-shade" />
            <div className="hero-photo-caption">
              <span>THE MAISON OR EXPERIENCE</span>
              <p>
                A place to linger.
                <br />A reason to return.
              </p>
            </div>
            <div className="hero-photo-seal">
              <span>MAISON OR</span>
              <Sparkles size={25} />
              <small>EST. WITH PASSION</small>
            </div>
            <span className="photo-index">01 / THE ART OF HOSPITALITY</span>
          </div>
        </section>
        <div className="hospitality-promises">
          <span>
            <Leaf size={15} /> Fresh, seasonal ingredients
          </span>
          <i />
          <span>
            <Wine size={15} /> Crafted with intention
          </span>
          <i />
          <span>
            <UtensilsCrossed size={15} /> A table for every moment
          </span>
          <i />
          <span>
            <Check size={15} /> Order here. Pay at your table.
          </span>
        </div>
        <section className="concierge-section section-container">
          <div className="section-intro">
            <div>
              <span className="eyebrow">{w.service}</span>
              <h2>{w.care}</h2>
            </div>
            <span className="subtle-caption">
              A little convenience. More time to enjoy.
            </span>
          </div>
          <div className="concierge-grid">
            {[
              {
                icon: UtensilsCrossed,
                title: "Explore the menu",
                desc: "Find your next favorite.",
                href: "/menu",
                label: "Discover",
              },
              {
                icon: ConciergeBell,
                title: "Call your waiter",
                desc: "A friendly face, on the way.",
                action: () => openGuest("service"),
                label: "We’re here",
              },
              {
                icon: Wifi,
                title: "Stay connected",
                desc: "Our Wi-Fi. Your little escape.",
                href: "/wifi",
                label: "Connect",
              },
              {
                icon: Receipt,
                title: "Request your bill",
                desc: "Whenever you’re ready.",
                action: () => openGuest("service"),
                label: "At your pace",
              },
            ].map((x) => (
              <div className="concierge-card" key={x.title}>
                <x.icon size={23} strokeWidth={1.35} />
                <h3>{x.title}</h3>
                <p>{x.desc}</p>
                {x.href ? (
                  <Link href={x.href}>
                    {x.label}
                    <ArrowUpRight size={15} />
                  </Link>
                ) : (
                  <button onClick={x.action}>
                    {x.label}
                    <ArrowUpRight size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
        <section className="favorites-section section-container">
          <div className="section-intro">
            <div>
              <span className="eyebrow">FROM OUR KITCHEN, WITH LOVE</span>
              <h2>{w.picks}</h2>
              <p>{w.sub}</p>
            </div>
            <Link className="text-link" href="/menu">
              View the full menu <ArrowRight size={17} />
            </Link>
          </div>
          <div className="dish-grid">
            {picks.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
          {!loading && !live && (
            <p className="catalog-notice">
              You’re viewing our sample menu. Please check availability and
              prices with our team.
            </p>
          )}
        </section>
        <section className="slow-moments section-container">
          <div className="slow-image">
            <img
              loading="lazy"
              src="/images/302899.jpg"
              alt="Artfully prepared cappuccino, ready to enjoy"
            />
          </div>
          <div className="slow-copy">
            <span className="eyebrow">A LITTLE MORE THAN A MEAL</span>
            <h2>
              For the moments
              <br />
              you don’t want to rush.
            </h2>
            <p>
              That first coffee. A long lunch. One more conversation. At{" "}
              {settings.name}, we believe the best things happen when you take
              your time.
            </p>
            <Link className="text-link" href="/menu">
              Find something you’ll love <ArrowUpRight size={17} />
            </Link>
          </div>
        </section>
        <section className="review-invitation section-container">
          <div className="review-stars">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} size={16} strokeWidth={1.4} />
            ))}
          </div>
          <h2>Good moments deserve to be shared.</h2>
          <p>We’d love to hear about yours.</p>
          <Link className="text-link" href="/feedback">
            Share your experience <ArrowUpRight size={16} />
          </Link>
        </section>
      </main>
      <CustomerFooter />
    </div>
  );
}
