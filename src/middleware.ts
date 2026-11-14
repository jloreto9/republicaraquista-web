import { NextRequest, NextResponse } from "next/server";

// 1. Patrones de rutas maliciosas habituales de escáneres de vulnerabilidades
const MALICIOUS_PATH_PATTERN =
  /(\.php|\.env|\.git|wp-admin|wp-content|wp-includes|xmlrpc|phpmyadmin|pma|setup\.cgi|actuator|\/etc\/passwd)/i;

// 2. Patrones de bots, scrapers y librerías de crawling
const AGGRESSIVE_BOT_PATTERN =
  /(semrush|ahrefs|bytespider|yandex|mj12|petalbot|dotbot|python|axios|go-http-client|curl|wget|headlesschrome|phantomjs|crawler|spider|nikto|sqlmap)/i;

export const config = {
  matcher: [
    /*
     * Interceptar todas las peticiones excepto recursos estáticos de Next.js (_next/static, _next/image, favicon.ico)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const userAgent = req.headers.get("user-agent") || "";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";

  // 0. Redirección forzada de *.vercel.app hacia el dominio oficial republicaraquistapp.com (Cloudflare)
  if (
    host.includes("republicaraquistapp.vercel.app") ||
    (process.env.NODE_ENV === "production" && host.endsWith(".vercel.app") && !host.includes("localhost"))
  ) {
    const targetUrl = req.nextUrl.clone();
    targetUrl.host = "republicaraquistapp.com";
    targetUrl.protocol = "https";
    targetUrl.port = "";
    return NextResponse.redirect(targetUrl, { status: 308 });
  }

  // A. Bloqueo fulminante de scanners de vulnerabilidades (ej. /wp-admin/install.php)
  if (MALICIOUS_PATH_PATTERN.test(pathname)) {
    return new NextResponse("Not Found", {
      status: 404,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  }

  // B. Bloqueo de crawlers agresivos y bots no deseados (excluir rutas legales para verificadores OAuth)
  const isLegalVerificationPath =
    pathname === "/privacy" || pathname === "/terms" || pathname === "/privacidad";
  if (!isLegalVerificationPath && userAgent && AGGRESSIVE_BOT_PATTERN.test(userAgent)) {
    return new NextResponse("Access Denied", {
      status: 403,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  }

  // C. Blindaje de peticiones a /api/* (evitar consumo desde orígenes externos no autorizados)
  if (pathname.startsWith("/api/")) {
    const secFetchSite = req.headers.get("sec-fetch-site");
    const referer = req.headers.get("referer") || "";

    // Si la petición viene de un sitio cruzado (cross-site) y no tiene referer propio, bloquear
    const isAllowedReferer =
      !referer ||
      referer.includes("republicaraquistapp.com") ||
      referer.includes("republicaraquistapp.vercel.app") ||
      referer.includes("localhost");

    if (secFetchSite === "cross-site" && !isAllowedReferer) {
      return new NextResponse("Unauthorized", {
        status: 403,
        headers: {
          "Cache-Control": "public, max-age=86400, s-maxage=86400",
        },
      });
    }
  }

  // Continuar normalmente para tráfico legítimo
  const res = NextResponse.next();

  // D. Cabeceras de seguridad y caché en el Edge
  if (!pathname.startsWith("/api/")) {
    // Para páginas HTML, permitir caché en Edge de 60s con revalidación suave
    res.headers.set(
      "Cache-Control",
      "public, max-age=0, s-maxage=60, stale-while-revalidate=300"
    );
  }

  return res;
}
