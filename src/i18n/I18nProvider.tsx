import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useAppStore } from "../store/useAppStore";
import { translate, type AppLanguage, type TranslationKey } from "./translations";

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

type I18nContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: TranslateFn;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key, params) => translate(language, key, params)
    }),
    [language, setLanguage]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider.");
  }
  return context;
}

export const translateForLanguage = (
  language: AppLanguage,
  key: TranslationKey,
  params?: Record<string, string | number>
): string => translate(language, key, params);

