import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
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

      console.log(
        `[Auth] Path: ${nextUrl.pathname}, LoggedIn: ${isLoggedIn}, OnDashboard: ${isOnDashboard}, OnLogin: ${isOnLogin}`,
      );

      // If user is on dashboard and NOT logged in, redirect to login
      if (isOnDashboard && !isLoggedIn) {
        console.log("[Auth] Redirecting to login");
        return false;
      }

      // If user is on login and IS logged in, redirect to dashboard
      if (isOnLogin && isLoggedIn) {
        console.log("[Auth] Redirecting to dashboard");
        return Response.redirect(new URL("/", nextUrl));
      }

      console.log("[Auth] Allowing access");
      return true; // Allow everything else (public assets, API, etc.)
    },
  },
  providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;
