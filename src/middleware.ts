import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // /login tak lagi dijaga middleware — pengalihan ke /admin ada di halaman
  // login (jalur Node, sesi dicek ulang ke DB — #342).
  matcher: ["/admin/:path*"],
};
