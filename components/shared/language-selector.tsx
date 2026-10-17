"use client";

import { Globe, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Locale } from "@/lib/data";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

const languages: { code: Locale; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "EN" },
  { code: "fr", label: "Français", flag: "FR" },
  { code: "ar", label: "العربية", flag: "AR" },
];

export function LanguageSelector({
  variant = "light",
}: {
  variant?: "light" | "dark";
}) {
  const { locale, setLocale } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const current = languages.find((l) => l.code === locale)!;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
          variant === "light"
            ? "bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
            : "bg-secondary text-foreground hover:bg-secondary/80",
        )}
        aria-label="Select language"
      >
        <Globe className="h-4 w-4" />
        <span>{current.flag}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 overflow-hidden rounded-lg border border-border bg-popover shadow-lg animate-scale-in z-50">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLocale(lang.code);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-accent",
                locale === lang.code ? "text-gold" : "text-foreground",
              )}
            >
              <span>{lang.label}</span>
              {locale === lang.code && <Check className="h-4 w-4 text-gold" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
