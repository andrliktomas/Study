/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // přílohy zpráv do 4 MB (Vercel přijme požadavek max. 4,5 MB)
    serverActions: { bodySizeLimit: "4.5mb" },
  },
  // fonty pro OG obrázky a články blogu se čtou ze souborů za běhu
  outputFileTracingIncludes: {
    "/**/opengraph-image*": ["./src/assets/fonts/**"],
    "/sitemap.xml": ["./content/blog/**"],
    "/blog/**": ["./content/blog/**"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
