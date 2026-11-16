import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { TRANSLATIONS, type Language } from './translations';

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (typeof TRANSLATIONS)['en'] | (typeof TRANSLATIONS)['fr'];
}

const LanguageContext = createContext<LanguageContextValue | null>(null);
const LANG_STORAGE_KEY = 'ahzan_portal_lang_v1';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (saved === 'fr' || saved === 'en') return saved;
    } catch {
      // Ignore storage access errors
    }
    return 'en';
  });

  const setLang = (next: Language) => {
    setLangState(next);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // Ignore storage write errors
    }
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <LanguageContext.Provider
      value={{
        lang,
        setLang,
        t: TRANSLATIONS[lang],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
