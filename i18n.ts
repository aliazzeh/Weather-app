// i18n.ts (في root)
import { getRequestConfig } from "next-intl/server";

const SUPPORTED_LOCALES = ["en", "ar"] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export default getRequestConfig(async ({ locale }) => {
  const safeLocale: SupportedLocale =
    SUPPORTED_LOCALES.includes(locale as SupportedLocale) ? (locale as SupportedLocale) : "en";

  return {
    locale: safeLocale,
    messages: (await import(`./messages/${safeLocale}.json`)).default
  };
});
