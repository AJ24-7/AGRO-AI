import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { resolveMessage, translations } from "../i18n/translations";

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem("language") || "en");

  useEffect(() => {
    localStorage.setItem("language", language);
    document.documentElement.lang = language === "hi" ? "hi" : "en";
  }, [language]);

  const value = useMemo(() => {
    const t = (key, values = {}) => {
      const path = key.split(".");
      const current = path.reduce((accumulator, segment) => accumulator?.[segment], translations[language])
        ?? path.reduce((accumulator, segment) => accumulator?.[segment], translations.en)
        ?? key;
      return resolveMessage(current, values);
    };

    return {
      language,
      setLanguage,
      toggleLanguage: () => setLanguage((current) => (current === "en" ? "hi" : "en")),
      t,
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}