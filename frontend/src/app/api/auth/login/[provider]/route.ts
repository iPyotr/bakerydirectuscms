import { NextResponse, type NextRequest } from "next/server";

const ALLOWED_PROVIDERS = new Set(["yandex", "vk", "mailru"]);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  if (!ALLOWED_PROVIDERS.has(provider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  // Use the public URL — the browser follows this redirect, so it must be
  // reachable from the client, not just from inside the Docker network.
  const directusPublicUrl =
    process.env.DIRECTUS_PUBLIC_URL ??
    process.env.DIRECTUS_URL ??
    "https://admin.delovkusa.openlabio.ru";
  const redirectParam = request.nextUrl.searchParams.get("redirect") ?? "/";
  const safeRedirect = redirectParam.startsWith("/") ? redirectParam : "/";
  const origin = request.nextUrl.origin;
  const finalRedirect = `${origin}${safeRedirect}`;

  const target = `${directusPublicUrl}/auth/login/${provider}?redirect=${encodeURIComponent(finalRedirect)}`;
  return NextResponse.redirect(target);
}
