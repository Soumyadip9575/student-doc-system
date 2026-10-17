export { auth as middleware } from "@/auth";
export const config = { matcher: ["/dashboard/:path*", "/admin/:path*", "/user/:path*", "/process/:path*", "/history/:path*", "/documents/:path*", "/api/process/:path*"] };
