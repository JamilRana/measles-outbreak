import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
    callbacks: {
      authorized({ req, token }) {
        const path = req.nextUrl.pathname;
        
        // Admin only routes
        if (path.startsWith("/admin")) {
          return token?.role === "ADMIN";
        }
        
        // Viewer restricted routes
        if (path.startsWith("/report")) {
          return token?.role !== "VIEWER";
        }
        
        // Require auth for all other matched routes
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/report/:path*",
    "/admin/:path*",
    "/my-reports/:path*"
  ],
};