/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // přílohy zpráv do 5 MB
    serverActions: { bodySizeLimit: "6mb" },
    // fonty pro generování OG obrázků
    outputFileTracingIncludes: {
      "/**/opengraph-image*": ["./src/assets/fonts/**"],
      "/sitemap.xml": ["./content/blog/**"],
      "/blog/**": ["./content/blog/**"],
    },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }],
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
