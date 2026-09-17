import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// No Next.js 16 o antigo "middleware.ts" passou a se chamar "proxy.ts" (mesmo
// comportamento, nome novo). Aqui: 1) mantém a sessão do Supabase renovada em cada
// request e 2) faz o redirecionamento otimista para quem não está logado.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLoginRoute = pathname.startsWith("/login");

  if (!user && !isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return withRefreshedCookies(NextResponse.redirect(url), response);
  }

  if (user && isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/calculator";
    return withRefreshedCookies(NextResponse.redirect(url), response);
  }

  return response;
}

// getUser() pode renovar o token de sessão e tentar persistir o cookie novo via
// setAll() em `response` - mas se decidirmos redirecionar, criamos um NextResponse
// diferente. Sem copiar os cookies renovados para ele, o navegador continua mandando
// o cookie antigo/expirado e cai num loop infinito de redirecionamento.
function withRefreshedCookies(target: NextResponse, source: NextResponse): NextResponse {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.png|favicon.ico).*)"],
};
