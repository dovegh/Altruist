/**
 * Languages.
 *
 * Six ship: English, Twi, Ga, Ewe, Hausa and French. English is the source of
 * truth — every string exists in English first, and any string missing in
 * another language falls back to English rather than showing a key.
 *
 * Twi, Ga, Ewe and Hausa are marked `draft` until a native speaker has read
 * them. The picker says so. This is a pharmacy: a mistranslated word on a
 * prescription screen is worse than an English one, so pharmacist notes,
 * product names and legal documents are never translated here at all.
 *
 * Strings live next to the screen that uses them, one `defineStrings` block per
 * file, so each screen carries its own translations and nothing grows into one
 * unreadable dictionary:
 *
 *   const S = defineStrings({
 *     en: { title: 'Cart', items: '{count} items' },
 *     fr: { title: 'Panier', items: '{count} articles' },
 *   });
 *   const t = useT(S);
 *   t('items', { count: 3 });
 */
import { useCallback } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', locale: 'en-GB', draft: false },
  { code: 'tw', name: 'Twi', native: 'Twi (Akan)', locale: 'en-GB', draft: true },
  { code: 'gaa', name: 'Ga', native: 'Gã', locale: 'en-GB', draft: true },
  { code: 'ee', name: 'Ewe', native: 'Eʋegbe', locale: 'en-GB', draft: true },
  { code: 'ha', name: 'Hausa', native: 'Hausa', locale: 'en-GB', draft: true },
  { code: 'fr', name: 'French', native: 'Français', locale: 'fr-FR', draft: false },
] as const;

export type Lang = (typeof LANGUAGES)[number]['code'];

type Vars = Record<string, string | number>;

export type Strings<T extends Record<string, string>> = { en: T } & Partial<
  Record<Exclude<Lang, 'en'>, Partial<T>>
>;

/** Declares one screen's strings. English is required; the rest fall back to it. */
export function defineStrings<T extends Record<string, string>>(strings: Strings<T>): Strings<T> {
  return strings;
}

/** The language the phone itself is set to, if it is one of ours. */
function deviceLanguage(): Lang {
  try {
    const tag = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
    const base = tag.split('-')[0];
    const hit = LANGUAGES.find((l) => l.code === base);
    return hit ? hit.code : 'en';
  } catch {
    return 'en';
  }
}

export const useLanguageStore = create<{ lang: Lang; setLang: (lang: Lang) => void }>()(
  persist(
    (set) => ({
      lang: deviceLanguage(),
      setLang: (lang) => set({ lang }),
    }),
    {
      name: 'altruist.language',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export const useLanguage = () => useLanguageStore((s) => s.lang);
export const setLanguage = (lang: Lang) => useLanguageStore.getState().setLang(lang);
export const languageInfo = (lang: Lang) => LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

/** The BCP 47 tag for dates and numbers in the current language. */
export const useLocale = () => languageInfo(useLanguage()).locale;

function fill(raw: string, vars?: Vars): string {
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in vars ? String(vars[key]) : whole,
  );
}

/** Looks a string up outside React (alerts, notifications, stores). */
export function translate<T extends Record<string, string>>(
  strings: Strings<T>,
  key: keyof T,
  vars?: Vars,
): string {
  const lang = useLanguageStore.getState().lang;
  const own = lang === 'en' ? undefined : strings[lang]?.[key];
  return fill((own ?? strings.en[key]) as string, vars);
}

/** The translator for one screen's strings. Re-renders when the language changes. */
export function useT<T extends Record<string, string>>(strings: Strings<T>) {
  const lang = useLanguage();
  return useCallback(
    (key: keyof T, vars?: Vars): string => {
      const own = lang === 'en' ? undefined : strings[lang]?.[key];
      return fill((own ?? strings.en[key]) as string, vars);
    },
    [lang, strings],
  );
}
