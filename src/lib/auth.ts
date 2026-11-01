import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { db } from "./db";
import { ipFromHeaders, rateLimit } from "./rate-limit";

export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
];

export const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

/** Chybové kódy přihlášení e-mailem (předávají se klientovi v `error`). */
export const LOGIN_ERRORS = {
  notVerified: "EMAIL_NOT_VERIFIED",
  tooMany: "TOO_MANY_ATTEMPTS",
} as const;

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
            // Bezpečné jen díky tomu, že účty s heslem musí mít ověřený e-mail a neověřené heslo
            // se při propojení s Googlem smaže (viz events.signIn).
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
      async authorize(credentials, req) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password;
        if (!email || !password) return null;

        const ip = ipFromHeaders({ get: (n) => (req?.headers?.[n] as string | undefined) ?? null });
        const allowed = (await rateLimit(`login:${email}`, 10, 15 * 60)) && (await rateLimit(`login-ip:${ip}`, 60, 15 * 60));
        if (!allowed) throw new Error(LOGIN_ERRORS.tooMany);

        const user = await db.user.findUnique({ where: { email } });
        if (!user?.passwordHash || user.deletedAt) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        if (!user.emailVerified) throw new Error(LOGIN_ERRORS.notVerified);
        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // smazané (anonymizované) účty se přihlásit nemohou
      if (!user?.id) return true;
      const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { deletedAt: true } });
      return !dbUser?.deletedAt;
    },
    async jwt({ token, user, trigger }) {
      if (user || trigger === "update" || !token.role) {
        const dbUser = await db.user.findUnique({
          where: { id: (user?.id ?? token.sub)! },
          select: { id: true, role: true, name: true, image: true },
        });
        if (dbUser) {
          token.sub = dbUser.id;
          token.role = dbUser.role;
          token.name = dbUser.name;
          token.picture = dbUser.image;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = (token.role as string) ?? "STUDENT";
        session.user.image = (token.picture as string | null) ?? null;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // registrace přes Google: souhlas s podmínkami je u tlačítka, e-mail ověřil Google
      await db.user.update({ where: { id: user.id }, data: { termsAcceptedAt: new Date() } });
    },
    async signIn({ user, account }) {
      if (account?.provider !== "google") return;
      // Ochrana proti „pre-hijackingu“: pokud někdo dřív založil účet s tímto e-mailem a heslem,
      // ale e-mail nikdy neověřil, heslo zneplatníme – účet teď prokazatelně patří majiteli Google účtu.
      const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { emailVerified: true } });
      if (dbUser && !dbUser.emailVerified) {
        await db.user.update({ where: { id: user.id }, data: { emailVerified: new Date(), passwordHash: null } });
      }
      // NextAuth při opakovaném přihlášení přes Google tokeny neaktualizuje – uložíme nové
      // (např. po udělení přístupu ke kalendáři).
      if (account.access_token) {
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
      }
    },
  },
};
