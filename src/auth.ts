import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const providers: NextAuthConfig["providers"] = [
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    authorize: async (credentials) => {
      const email = String(credentials?.email ?? "").trim().toLowerCase();
      const password = String(credentials?.password ?? "");
      if (!email || !password) return null;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user?.passwordHash || user.deletedAt || user.status !== "ACTIVE") return null;
      const matches = await bcrypt.compare(password, user.passwordHash);
      if (!matches) return null;
      return { id: user.id, email: user.email, name: user.name };
    },
  }),
];

if (process.env.AUTH_OIDC_ISSUER && process.env.AUTH_OIDC_CLIENT_ID && process.env.AUTH_OIDC_CLIENT_SECRET) {
  providers.push({
    id: "oidc",
    name: "Institutional account",
    type: "oidc",
    issuer: process.env.AUTH_OIDC_ISSUER,
    clientId: process.env.AUTH_OIDC_CLIENT_ID,
    clientSecret: process.env.AUTH_OIDC_CLIENT_SECRET,
  });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    async signIn({ account, profile }) {
      if (!account || account.provider === "credentials") return true;
      const email = profile && "email" in profile ? String(profile.email ?? "").toLowerCase() : "";
      if (!email) return false;
      const existing = await prisma.user.findUnique({ where: { email } });
      return Boolean(existing && existing.status === "ACTIVE" && !existing.deletedAt);
    },
    async jwt({ token, user, account, profile }) {
      if (user?.id && (!account || account.provider === "credentials")) token.sub = user.id;
      if (account && account.provider !== "credentials") {
        const email = profile && "email" in profile ? String(profile.email ?? "").toLowerCase() : "";
        if (!email) return {};
        const existing = await prisma.user.findUnique({ where: { email } });
        if (!existing || existing.status !== "ACTIVE" || existing.deletedAt) return {};
        token.sub = existing.id;
        token.email = existing.email;
        token.name = existing.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
    };
  }
}
