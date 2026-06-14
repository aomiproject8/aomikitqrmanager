import type { NextAuthConfig } from "next-auth"

// Internal admin/seller sessions expire after one working shift. DB-backed
// getCurrentUser() checks still revoke deleted or deactivated users immediately.
export const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60

// Edge-compatible config — no Node.js imports (no pg, no bcrypt).
// Used in middleware and spread into the full auth.ts config.
export const authConfig = {
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? ""
        token.role = (user as { role?: string }).role ?? ""
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id
      session.user.role = token.role
      return session
    },
  },
  session: {
    strategy: "jwt" as const,
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig
