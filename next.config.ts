import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./i18n.ts");

const nextConfig: NextConfig = {
  // أي إعدادات ثانية عندك بتظل هون
};

export default withNextIntl(nextConfig);
