import React from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";

export default function EmptyState() {
  const t = useTranslations("empty");
  const locale = useLocale();
  const isRTL = locale === "ar";

  return (
    <section
      dir={isRTL ? "rtl" : "ltr"}
      className="
        rounded-3xl border border-(--border)
        bg-(--surface)
        p-6 sm:p-10 text-center relative overflow-hidden
      "
    >
      {/* Ambient animated blobs */}
      <div className="pointer-events-none absolute inset-0">
        {/* light mode blobs */}
        <div className="absolute -top-20 -left-24 h-56 w-56 rounded-full bg-black/5 blur-3xl animate-pulse dark:hidden" />
        <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-black/5 blur-3xl animate-pulse dark:hidden" />

        {/* dark mode blobs */}
        <div className="absolute -top-20 -left-24 h-56 w-56 rounded-full bg-white/5 blur-3xl animate-pulse hidden dark:block" />
        <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-white/5 blur-3xl animate-pulse hidden dark:block" />
      </div>

      {/* Animated icon */}
      <div className="relative mx-auto mb-6 h-28 w-28 sm:h-32 sm:w-32">
        {/* soft glow ring (accent, but softer in light) */}
        <div className="absolute inset-0 rounded-full bg-(--accent)/10 blur-2xl animate-pulse" />

        {/* floating badge */}
        <div
          className="
            absolute inset-0 rounded-full
            bg-black/5 dark:bg-white/5
            border border-black/10 dark:border-white/10
            flex items-center justify-center
            animate-[float_3.5s_ease-in-out_infinite]
          "
        >
          <span className="text-5xl sm:text-6xl">🌤️</span>
        </div>
      </div>

      <h2 className="relative text-2xl sm:text-3xl font-bold text-(--text) tracking-tight">
        {t("title")}
      </h2>

      <p className="relative mt-2 text-sm sm:text-base text-(--muted)">
        {t("subtitle")}
      </p>

      {/* Static info */}
      <div className={`relative mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 ${isRTL ? "lg:direction-rtl" : ""}`}>
        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-4 lg:flex-1">
          <p className="text-sm text-(--muted)">🌡️ {t("chips.realtime")}</p>
        </div>

        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-4 lg:flex-1">
          <p className="text-sm text-(--muted)">📅 {t("chips.forecast")}</p>
        </div>

        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-4 lg:flex-1">
          <p className="text-sm text-(--muted)">🕘 {t("chips.recent")}</p>
        </div>

        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-4 lg:flex-1">
          <p className="text-sm text-(--muted)">📍 {t("chips.useLocation")}</p>
        </div>
      </div>

      <p className="relative mt-6 text-xs text-(--muted-2)">
        {t("try", { cities: t("tryCities") })}
      </p>
    </section>
  );
}
