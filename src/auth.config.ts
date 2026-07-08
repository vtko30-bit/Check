import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
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
      const isOnLogin =
        nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/forgot-password") ||
        nextUrl.pathname.startsWith("/reset-password");
      const isOnDashboard =
        nextUrl.pathname === "/" ||
        nextUrl.pathname.startsWith("/calendar") ||
        nextUrl.pathname.startsWith("/users") ||
        nextUrl.pathname.startsWith("/settings") ||
        nextUrl.pathname.startsWith("/groups");

      if (process.env.NODE_ENV === 'development') {
        console.log(`[Auth] Path: ${nextUrl.pathname}, LoggedIn: ${isLoggedIn}`);
      }

      if (auth?.sessionRevoked && !isOnLogin) {
        return Response.redirect(new URL('/login?error=InactiveAccount', nextUrl));
      }

      if (isOnDashboard && !isLoggedIn) return false;
      if (isOnLogin && isLoggedIn && !auth?.sessionRevoked) {
        return Response.redirect(new URL("/", nextUrl));
      }
      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
