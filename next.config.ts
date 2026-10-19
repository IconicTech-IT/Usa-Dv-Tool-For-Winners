import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

import { securityHeaders } from "./lib/security-headers";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The round "N" badge of the development server must never sit over the page, in screenshots or on a phone.
  devIndicators: false,
  // No external images and no paid services: everything is local.
  images: { formats: ["image/avif", "image/webp"] },
  headers: () => Promise.resolve(securityHeaders(process.env.NODE_ENV === "production")),
};

export default withNextIntl(nextConfig);
