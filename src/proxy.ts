import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const PUBLIC_ROUTES = [
  "/login",
  "/signup",
  "/api/webhooks/whatsapp",
  "/api/health",
  "/api/auth",
  "/api/integrations/google-calendar/callback",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Security headers
  const headers = new Headers(request.headers);
  const response = NextResponse.next({ request: { headers } });

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  // Allow public routes
  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isPublic) {
    return response;
  }

  // Check authentication for protected routes
  const session = await auth();

  if (!session?.user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.ico$).*)",
  ],
};
