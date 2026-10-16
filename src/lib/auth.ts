import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { db } from "./db";

export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
];

export const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: { signIn: "/prihlaseni", error: "/prihlaseni" },
  providers: [
    ...(googleEnabled
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            // Google e-maily ověřuje, propojení s existujícím účtem podle e-mailu je bezpečné.
            allowDangerousEmailAccountLinking: true,
            authorization: { params: { access_type: "offline", prompt: "consent" } },
          }),
        ]
      : []),
    CredentialsProvider({
      name: "E-mail a heslo",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Heslo", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password;
        if (!email || !password) return null;
        const user = await db.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user || trigger === "update" || !token.role) {
        const dbUser = await db.user.findUnique({
          where: { id: (user?.id ?? token.sub)! },
          select: { id: true, role: true, name: true },
        });
        if (dbUser) {
          token.sub = dbUser.id;
          token.role = dbUser.role;
          token.name = dbUser.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = (token.role as string) ?? "STUDENT";
      }
      return session;
    },
  },
  events: {
    // NextAuth při opakovaném přihlášení přes Google tokeny neaktualizuje –
    // uložíme nové (např. po udělení přístupu ke kalendáři).
    async signIn({ account }) {
      if (account?.provider !== "google" || !account.access_token) return;
      await db.account.updateMany({
        where: { provider: "google", providerAccountId: account.providerAccountId },
        data: {
          access_token: account.access_token,
          expires_at: account.expires_at,
          scope: account.scope,
          id_token: account.id_token,
          ...(account.refresh_token ? { refresh_token: account.refresh_token } : {}),
        },
      });
    },
  },
};
