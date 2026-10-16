import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/JsonLd";
import { Providers } from "@/components/Providers";
import { absoluteUrl, site } from "@/lib/site";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} – ${site.tagline}`, template: `%s | ${site.name}` },
  description: site.description,
  applicationName: site.name,
  keywords: ["online lektor", "doučování jazyků", "lekce angličtiny online", "lektor němčiny", "výuka jazyků přes video", "rezervace lekcí"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: site.locale,
    url: site.url,
    siteName: site.name,
    title: `${site.name} – ${site.tagline}`,
    description: site.description,
  },
  twitter: { card: "summary_large_image", title: site.name, description: site.description },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
};

export const viewport: Viewport = { themeColor: "#14b8b8", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs" className={inter.variable}>
      <body className="flex min-h-screen flex-col font-sans">
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "@id": absoluteUrl("/#org"),
                name: site.name,
                url: site.url,
                logo: absoluteUrl("/icon.svg"),
              },
              {
                "@type": "WebSite",
                "@id": absoluteUrl("/#web"),
                url: site.url,
                name: site.name,
                inLanguage: "cs-CZ",
                publisher: { "@id": absoluteUrl("/#org") },
                potentialAction: {
                  "@type": "SearchAction",
                  target: `${absoluteUrl("/lektori")}?q={search_term_string}`,
                  "query-input": "required name=search_term_string",
                },
              },
            ],
          }}
        />
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
