import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { JWT } from "next-auth/jwt";

import { verifyPassword } from "@/lib/auth/password";
import { findUserForCredentials, findUserRoleByEmail, normalizeEmail } from "@/lib/auth/user";
import { prisma } from "@/lib/prisma";

function isConfigured(value?: string) {
  return Boolean(value && !value.startsWith("replace-with-"));
}

async function hydrateToken(token: JWT) {
  if (!token.email) {
    return token;
  }

  if (token.id && typeof token.isAdmin === "boolean") {
    return token;
  }

  const user = await findUserRoleByEmail(token.email);
  if (!user) {
    return token;
  }

  token.id = user.id;
  token.name = user.name ?? token.name;
  token.email = user.email ?? token.email;
  token.picture = user.image ?? token.picture;
  token.isAdmin = user.isAdmin;
  return token;
}

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Email and Password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = credentials?.email?.trim();
      const password = credentials?.password;

      if (!email || !password) {
        return null;
      }

      const user = await findUserForCredentials(email);
      if (!user?.passwordHash) {
        return null;
      }

      const passwordMatches = await verifyPassword(password, user.passwordHash);
      if (!passwordMatches) {
        return null;
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email ? normalizeEmail(user.email) : null,
        image: user.image,
        isAdmin: user.isAdmin,
      };
    },
  }),
];

if (isConfigured(process.env.GITHUB_ID) && isConfigured(process.env.GITHUB_SECRET)) {
  providers.push(
    GitHubProvider({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
    }),
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isAdmin = Boolean(user.isAdmin);
      }

      return hydrateToken(token);
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.id === "string" ? token.id : "";
        session.user.isAdmin = Boolean(token.isAdmin);
        session.user.email = session.user.email ?? token.email ?? null;
        session.user.name = session.user.name ?? token.name ?? null;
        session.user.image = session.user.image ?? (typeof token.picture === "string" ? token.picture : null);
      }

      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
