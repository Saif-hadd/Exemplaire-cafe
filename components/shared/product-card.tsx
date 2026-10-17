"use client";
import { useState } from "react";
import { Plus, Minus, Leaf, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { MenuProduct } from "@/lib/data";
import { money } from "@/lib/restaurant";
import { useRestaurant } from "@/components/providers/restaurant-provider";
import { useLanguage } from "@/components/providers/language-provider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
export function ProductCard({
  product: p,
  index = 0,
}: {
  product: MenuProduct;
  index?: number;
}) {
  const { locale } = useLanguage();
  const r = useRestaurant();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const name =
    locale === "ar"
      ? p.nameAr || p.name
      : locale === "fr"
        ? p.nameFr || p.name
        : p.name;
  const desc =
    locale === "ar"
      ? p.descriptionAr || p.description
      : locale === "fr"
        ? p.descriptionFr || p.description
        : p.description;
  const options = r.modifiers.filter(
    (m) => m.product_id === p.id && m.available,
  );
  const mods = options.filter((m) => selected.includes(m.id));
  const unit =
    Math.round(p.price * 100) + mods.reduce((s, m) => s + m.price_minor, 0);
  const add = () => {
    r.add({
      key: JSON.stringify([p.id, [...selected].sort(), notes]),
      product: p,
      quantity,
      modifiers: mods,
      notes,
    });
    toast.success(`${quantity} × ${name} added to your selection`);
    setOpen(false);
  };
  return (
    <>
      <article
        className={`dish-card ${!p.available ? "dish-unavailable" : ""}`}
      >
        <button
          className="dish-image"
          onClick={() => setOpen(true)}
          aria-label={`View ${name}`}
        >
          <img
            src={p.image || r.settings.coverImage}
            alt={name}
            loading="lazy"
          />
          {(p.featured || p.bestseller) && (
            <span className="dish-badge">
              {p.featured ? "CHEF’S SELECTION" : "HOUSE FAVORITE"}
            </span>
          )}
          <span className="dish-image-arrow">
            <ArrowUpRight size={17} />
          </span>
        </button>
        <div className="dish-info">
          <div className="dish-category">
            {r.categories.find((c) => c.id === p.categoryId)?.name}
            <span>
              {p.dietary?.includes("Vegetarian") ||
              p.dietary?.includes("Vegan") ? (
                <Leaf size={12} />
              ) : (
                "·"
              )}{" "}
              {p.dietary?.[0] || "Made with care"}
            </span>
          </div>
          <h3>
            <button onClick={() => setOpen(true)}>{name}</button>
          </h3>
          <p>{desc}</p>
          <div className="dish-bottom">
            <span>
              {money(Math.round(p.price * 100))}
              <small>MAD</small>
            </span>
            <button
              className="dish-add"
              disabled={!p.available}
              onClick={() => {
                setQuantity(1);
                setSelected([]);
                setNotes("");
                setOpen(true);
              }}
              aria-label={`Customize ${name}`}
            >
              <Plus size={17} />
            </button>
          </div>
        </div>
      </article>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="guest-dialog max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <span className="eyebrow">A LITTLE SOMETHING EXCEPTIONAL</span>
            <DialogTitle className="!font-serif !text-3xl">{name}</DialogTitle>
            <DialogDescription>{desc}</DialogDescription>
          </DialogHeader>
          <img
            className="h-52 w-full rounded-sm object-cover"
            src={p.image || r.settings.coverImage}
            alt={name}
          />
          {!!p.ingredients?.length && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              <strong className="text-foreground">Ingredients</strong> ·{" "}
              {p.ingredients.join(", ")}
            </p>
          )}
          {!!p.allergens?.length && (
            <p className="allergen-note">
              Contains: {p.allergens.join(", ")}. Please tell our team about any
              allergies.
            </p>
          )}
          {[...new Set(options.map((m) => m.group_name))].map((group) => (
            <fieldset key={group} className="modifier-group">
              <legend>
                {group}{" "}
                <small>
                  {group === "Extras" ? "Choose any" : "Choose one · optional"}
                </small>
              </legend>
              {options
                .filter((m) => m.group_name === group)
                .map((m) => (
                  <label key={m.id}>
                    <input
                      type={group === "Extras" ? "checkbox" : "radio"}
                      name={group}
                      checked={selected.includes(m.id)}
                      onChange={() =>
                        setSelected((old) =>
                          old.includes(m.id)
                            ? old.filter((x) => x !== m.id)
                            : [
                                ...old.filter(
                                  (x) =>
                                    group === "Extras" ||
                                    options.find((o) => o.id === x)
                                      ?.group_name !== group,
                                ),
                                m.id,
                              ],
                        )
                      }
                    />
                    <span>{m.name}</span>
                    <small>+{money(m.price_minor)} MAD</small>
                  </label>
                ))}
            </fieldset>
          ))}
          <label className="field-label">
            Special instructions
            <textarea
              className="lux-input"
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Your preferences, thoughtfully noted."
            />
          </label>
          <div className="flex items-center gap-4">
            <div className="quantity-control large">
              <button
                disabled={quantity <= 1}
                onClick={() => setQuantity((q) => q - 1)}
                aria-label="Decrease quantity"
              >
                <Minus size={16} />
              </button>
              <span>{quantity}</span>
              <button
                disabled={quantity >= 50}
                onClick={() => setQuantity((q) => q + 1)}
                aria-label="Increase quantity"
              >
                <Plus size={16} />
              </button>
            </div>
            <button
              className="lux-button flex-1"
              disabled={!p.available}
              onClick={add}
            >
              {p.available ? "Add to selection" : "Unavailable"}
              <span>{money(unit * quantity)} MAD</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
