"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function LanguageToggle({ locale }: { locale: "en" | "ar" }) {
  const pathname = usePathname();

  const nextLocale = locale === "en" ? "ar" : "en";
  const newPath = pathname.replace(/^\/(en|ar)/, `/${nextLocale}`);

  return (
    <Link
      href={newPath}
      className="text-sm font-semibold text-(--header-icon) hover:text-gray-300 transition"
      aria-label="Toggle language"
    >
      {nextLocale.toUpperCase()}
    </Link>
  );
}
