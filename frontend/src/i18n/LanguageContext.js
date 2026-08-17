import React, { createContext, useContext, useState, useCallback } from 'react';
import translations from './translations';

const LanguageContext = createContext();

const DEFAULT_LANGUAGE = 'dainamese';

function interpolate(str, params) {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (_, key) =>
    params[key] !== undefined ? params[key] : `{${key}}`
  );
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);

  const t = useCallback(
    (key, params) => {
      const dict = translations[language] || translations[DEFAULT_LANGUAGE];
      const fallback = translations[DEFAULT_LANGUAGE] || translations.en;
      const value = dict[key] || fallback[key] || translations.en[key] || key;
      return interpolate(value, params);
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
