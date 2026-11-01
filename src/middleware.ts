import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

// Přehled a administrace jen pro přihlášené. Přesměrování na přihlášení zůstává na aktuální doméně
// (výchozí middleware next-auth by bez NEXTAUTH_URL na Vercelu skočil na adresu konkrétního nasazení).
export async function middleware(req: NextRequest) {
  const token = await getToken({ req });
  if (token) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/prihlaseni";
  url.search = `?callbackUrl=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/dashboard/:path*", "/admin/:path*"] };
