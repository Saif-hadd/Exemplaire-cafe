"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { Locale, TranslationKey, translations } from "@/lib/data";

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
  isRTL: boolean;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("maison-language", newLocale);
  }, []);
  useEffect(() => {
    const saved = localStorage.getItem("maison-language");
    if (saved === "en" || saved === "fr" || saved === "ar")
      setLocaleState(saved);
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  const t = useCallback(
    (key: TranslationKey) => {
      return translations[locale][key] || translations.en[key] || key;
    },
    [locale],
  );

  const isRTL = locale === "ar";

  const value = useMemo(
    () => ({ locale, setLocale, t, isRTL }),
    [locale, setLocale, t, isRTL],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
