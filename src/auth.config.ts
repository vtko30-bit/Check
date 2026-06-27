import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.canViewAllTasks = user.can_view_all_tasks === true;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.id as string) ?? token.sub ?? '';
        session.user.role = (token.role as string) ?? 'viewer';
        session.user.canViewAllTasks = token.canViewAllTasks === true;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname.startsWith("/login");
      const isOnDashboard =
        nextUrl.pathname === "/" ||
        nextUrl.pathname.startsWith("/calendar") ||
        nextUrl.pathname.startsWith("/users") ||
        nextUrl.pathname.startsWith("/settings");

      if (process.env.NODE_ENV === 'development') {
        console.log(`[Auth] Path: ${nextUrl.pathname}, LoggedIn: ${isLoggedIn}`);
      }

      if (isOnDashboard && !isLoggedIn) return false;
      if (isOnLogin && isLoggedIn) return Response.redirect(new URL("/", nextUrl));
      return true; // Allow everything else (public assets, API, etc.)
    },
  },
  providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;
