import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

async function test() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const adminAuth = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const testEmail = "testyandex@example.com";

  await adminAuth.auth.admin.createUser({
    email: testEmail,
    email_confirm: true,
  });

  const { data: linkData, error: linkError } = await adminAuth.auth.admin.generateLink({
    type: "magiclink",
    email: testEmail,
  });

  if (linkError) {
    console.error("Link err:", linkError);
    return;
  }

  console.log("Action link:", linkData.properties.action_link);
  
  const actionUrl = new URL(linkData.properties.action_link);
  const tokenHash = actionUrl.searchParams.get("token_hash");
  const token = actionUrl.searchParams.get("token");

  console.log("Parsed:", { tokenHash, token });

  const authClient = createServerClient(supabaseUrl, anonKey, {
    auth: { flowType: "implicit" },
    cookies: {
      get() { return null; },
      set() {},
      remove() {}
    }
  });

  if (tokenHash) {
    const res = await authClient.auth.verifyOtp({ email: testEmail, token_hash: tokenHash, type: "magiclink" });
    console.log("Verify OTP tokenHash:", res.error || "Success");
  } else if (token) {
    const res = await authClient.auth.verifyOtp({ email: testEmail, token: token, type: "magiclink" });
    console.log("Verify OTP token:", res.error || "Success");
  }
}

test().catch(console.error);
