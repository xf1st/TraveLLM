import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback/${provider}`;

  if (provider === "yandex") {
    const clientId = process.env.YANDEX_CLIENT_ID;
    if (!clientId) return NextResponse.json({ error: "YANDEX_CLIENT_ID is not configured" }, { status: 500 });
    const url = `https://oauth.yandex.ru/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    return NextResponse.redirect(url);
  }

  if (provider === "vk") {
    const clientId = process.env.VK_CLIENT_ID;
    if (!clientId) return NextResponse.json({ error: "VK_CLIENT_ID is not configured" }, { status: 500 });
    // Using VKID requires different parameters, but for standard OAuth:
    const url = `https://oauth.vk.com/authorize?client_id=${clientId}&display=page&redirect_uri=${encodeURIComponent(redirectUri)}&scope=email&response_type=code&v=5.131`;
    return NextResponse.redirect(url);
  }

  return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
}
