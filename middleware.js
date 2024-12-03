export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/api/:path*",
    "/dashboard/settings/:path*", // Ensure this line is included
    "/dashboard/all-emails" // Ensure this line is included
  ]
};