import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // مفيش صور خارجية ولا خدمات ليها فاتورة — كل حاجة محلية.
  images: { formats: ["image/avif", "image/webp"] },
};

export default withNextIntl(nextConfig);
