import { getRequestConfig } from "next-intl/server";

const locales = ["en", "ar"] as const;

export default getRequestConfig(async ({ locale }) => {
  const safeLocale = locales.includes(locale as any) ? (locale as "en" | "ar") : "en";

  return {
    locale: safeLocale,
    messages: (await import(`../messages/${safeLocale}.json`)).default,
  };
});
