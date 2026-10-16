/** Povolí jen relativní cesty v rámci webu (ochrana proti open redirect). */
export function safeCallbackUrl(url: string | undefined | null, fallback = "/dashboard") {
  if (!url || !url.startsWith("/") || url.startsWith("//")) return fallback;
  return url;
}
