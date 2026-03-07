import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://travellm.ru";

  if (!code) {
    return NextResponse.redirect(`${siteUrl}/auth?error=NoCode`);
  }

  const redirectUri = `${siteUrl}/api/auth/callback/${provider}`;
  
  let userEmail = "";
  let userName = "";
  let userAvatar = "";

  try {
    if (provider === "yandex") {
      const clientId = process.env.YANDEX_CLIENT_ID;
      const clientSecret = process.env.YANDEX_CLIENT_SECRET;
      
      const tokenRes = await fetch("https://oauth.yandex.ru/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: clientId!,
          client_secret: clientSecret!,
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) return NextResponse.redirect(`${siteUrl}/auth?error=YandexTokenFailed`);

      const profileRes = await fetch("https://login.yandex.ru/info?format=json", {
        headers: { Authorization: `OAuth ${tokenData.access_token}` },
      });
      const profileData = await profileRes.json();
      if (!profileData.default_email) return NextResponse.redirect(`${siteUrl}/auth?error=NoEmailFromYandex`);
      
      userEmail = profileData.default_email;
      userName = profileData.real_name || profileData.login || "Пользователь Yandex";
      userAvatar = profileData.is_avatar_empty ? "" : `https://avatars.yandex.net/get-yapic/${profileData.default_avatar_id}/islands-200`;
    } else if (provider === "vk") {
      const clientId = process.env.VK_CLIENT_ID;
      const clientSecret = process.env.VK_CLIENT_SECRET;

      const tokenRes = await fetch(`https://oauth.vk.com/access_token?client_id=${clientId}&client_secret=${clientSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`);
      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) return NextResponse.redirect(`${siteUrl}/auth?error=VKTokenFailed`);
      
      userEmail = tokenData.email;
      if (!userEmail) return NextResponse.redirect(`${siteUrl}/auth?error=NoEmailFromVK`);

      const profileRes = await fetch(`https://api.vk.com/method/users.get?v=5.131&access_token=${tokenData.access_token}&fields=photo_200,screen_name`);
      const profileData = await profileRes.json();
      if (profileData.response && profileData.response[0]) {
        const user = profileData.response[0];
        userName = `${user.first_name} ${user.last_name}`.trim();
        userAvatar = user.photo_200 || "";
      } else {
        userName = "Пользователь VK";
      }
    } else {
      return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
    }

    // 1. Ensure user exists using Service Role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    const adminAuth = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Try to create the user. If they exist, this will return an error which we safely ignore.
    await adminAuth.auth.admin.createUser({
      email: userEmail,
      email_confirm: true,
      user_metadata: {
        name: userName,
        avatar_url: userAvatar,
      },
    });

    // 2. Generate a magic link to get a session payload
    const { data: linkData, error: linkError } = await adminAuth.auth.admin.generateLink({
      type: "magiclink",
      email: userEmail,
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("Link generation failed:", linkError);
      return NextResponse.redirect(`${siteUrl}/auth?error=SessionGenerationFailed`);
    }

    // Parse the token from the action_link (can be `token_hash` or `token`)
    const actionUrl = new URL(linkData.properties.action_link);
    const tokenHash = actionUrl.searchParams.get("token_hash");
    const token = actionUrl.searchParams.get("token");

    // 3. Verify OTP using Server Client to securely set cookies!
    const cookieStore = await cookies();
    const authClient = createServerClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { flowType: "implicit" }, // Crucial: skip PKCE requirement since we don't have a verifier
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: any) { cookieStore.set(name, value, options); },
        remove(name: string, options: any) { cookieStore.set(name, "", { ...options, maxAge: 0 }); },
      },
    });

    let verifyError = null;
    if (tokenHash) {
      const res = await authClient.auth.verifyOtp({ email: userEmail, token_hash: tokenHash, type: "magiclink" });
      verifyError = res.error;
    } else if (token) {
      const res = await authClient.auth.verifyOtp({ email: userEmail, token: token, type: "magiclink" });
      verifyError = res.error;
    } else {
      return NextResponse.redirect(`${siteUrl}/auth?error=NoTokenInLink`);
    }

    if (verifyError) {
      console.error("Verify OTP failed:", verifyError);
      return NextResponse.redirect(`${siteUrl}/auth?error=LoginFailed_${encodeURIComponent(verifyError.message)}`);
    }

    // Update app_metadata to track provider (optional but good for admin panel)
    const { data: { session } } = await authClient.auth.getSession();
    if (session?.user?.id) {
      const existingProviders = session.user.app_metadata?.providers || [];
      if (!existingProviders.includes(provider)) {
        await adminAuth.auth.admin.updateUserById(session.user.id, {
          app_metadata: {
            ...session.user.app_metadata,
            provider: provider, // For default provider UI mapping
            providers: [...existingProviders, provider],
          }
        });

        // ==========================================
        // GRANT 7-DAY PRO TRIAL FOR NEW SOCIAL USERS
        // ==========================================
        try {
          // Check if profile exists and has preferences (onboarding status)
          const { data: profile } = await adminAuth
            .from('profiles')
            .select('subscription_tier, preferences')
            .eq('id', session.user.id)
            .single();

          if (!profile?.preferences || !profile?.subscription_tier || profile.subscription_tier === 'free') {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);
            
            console.log(`[Auth] Granting 7-day PRO trial to new ${provider} user: ${userEmail}`);
            
            await adminAuth
              .from('profiles')
              .update({ 
                subscription_tier: 'pro',
                subscription_expires_at: expiresAt.toISOString(),
                site_access: true
              })
              .eq('id', session.user.id);
          }
        } catch (profileErr) {
          console.error("[Auth] Failed to grant PRO trial:", profileErr);
        }
      }
    }

    // If new user (no preferences), redirect to onboarding instead of /plan
    try {
      const { data: profile } = await adminAuth
        .from('profiles')
        .select('preferences')
        .eq('id', session.user.id)
        .single();
      
      if (!profile?.preferences) {
        return NextResponse.redirect(`${siteUrl}/onboarding`);
      }
    } catch (e) {}

    return NextResponse.redirect(`${siteUrl}/plan`);

  } catch (err: any) {
    console.error("Provider auth error:", err);
    return NextResponse.redirect(`${siteUrl}/auth?error=AuthException`);
  }
}
