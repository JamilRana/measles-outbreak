import { withAuth } from "next-auth/middleware";

const authProxy = withAuth({
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ req, token }) {
      const path = req.nextUrl.pathname;
      
      if (path.startsWith("/admin/")) {
        return token?.role === "ADMIN";
      }
      
      if (path.startsWith("/report")) {
        return token?.role !== "VIEWER";
      }
      
      return !!token;
    },
  },
});

export default authProxy;

export const proxy = authProxy;

export const config = {
  matcher: ["/dashboard/:path*", "/report/:path*", "/admin/:path*", "/my-reports/:path*"],
};