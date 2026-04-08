import { withAuth } from "next-auth/middleware";

const authProxy = withAuth({
  pages: {
    signIn: "/login",
  },
});

export default authProxy;

export const proxy = authProxy;

export const config = {
  matcher: ["/dashboard/:path*", "/report/:path*", "/admin/:path*"],
};
