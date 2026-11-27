import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const PUBLISHABLE_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const secretKeys = (() => {
  try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}"); }
  catch { return {}; }
})();
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? secretKeys.default ?? "";
const CLIENT_ID = Deno.env.get("ROBLOX_CLIENT_ID") ?? "";
const CLIENT_SECRET = Deno.env.get("ROBLOX_CLIENT_SECRET") ?? "";
const SITE_URL = Deno.env.get("ROWGG_SITE_URL") ?? "https://row-gg.vercel.app";
const REDIRECT_URI = Deno.env.get("ROBLOX_REDIRECT_URI") ??
  "https://enrpidtrrbhmsqszpwbs.supabase.co/functions/v1/roblox-oauth?action=callback";

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const cors = {
  "Access-Control-Allow-Origin": SITE_URL,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const redirect = (result: string, reason?: string) => {
  const url = new URL("/account/settings", SITE_URL);
  url.searchParams.set("roblox", result);
  if (reason) url.searchParams.set("reason", reason);
  return Response.redirect(url.toString(), 302);
};
function randomString(bytes = 48) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return Array.from(data, b => b.toString(16).padStart(2, "0")).join("");
}
function base64url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
async function challenge(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);

  if (url.searchParams.get("action") === "callback" && req.method === "GET") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state || !SERVICE_KEY || !CLIENT_ID) return redirect("error");
    try {
      const { data: saved, error: stateError } = await admin
        .from("roblox_oauth_states")
        .select("id,user_id,code_verifier,expires_at")
        .eq("state", state).maybeSingle();
      if (stateError || !saved || new Date(saved.expires_at).getTime() < Date.now()) {
        if (saved?.id) await admin.from("roblox_oauth_states").delete().eq("id", saved.id);
        return redirect("error", "invalid_state");
      }
      // Consume state before exchanging the one-time authorization code.
      await admin.from("roblox_oauth_states").delete().eq("id", saved.id);

      const tokenBody = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: saved.code_verifier,
      });
      if (CLIENT_SECRET) tokenBody.set("client_secret", CLIENT_SECRET);
      const tokenResponse = await fetch("https://apis.roblox.com/oauth/v1/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: tokenBody,
      });
      if (!tokenResponse.ok) return redirect("error", "token_exchange");
      const token = await tokenResponse.json();
      if (!token.access_token) return redirect("error", "missing_token");

      const userResponse = await fetch("https://apis.roblox.com/oauth/v1/userinfo", {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });
      if (!userResponse.ok) return redirect("error", "profile_fetch");
      const roblox = await userResponse.json();
      if (!roblox.sub || !roblox.preferred_username) return redirect("error", "profile_incomplete");

      const { error: saveError } = await admin.from("profiles").update({
        roblox_user_id: String(roblox.sub),
        roblox_username: String(roblox.preferred_username),
        roblox_avatar_url: typeof roblox.picture === "string" && roblox.picture.startsWith("https://") ? roblox.picture : null,
      }).eq("id", saved.user_id);
      if (saveError) {
        if (saveError.code === "23505") return redirect("error", "already_linked");
        return redirect("error", "save_failed");
      }
      return redirect("success");
    } catch {
      return redirect("error", "callback_failed");
    }
  }

  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!CLIENT_ID || !SERVICE_KEY) return json({ error: "Roblox linking is not configured on the server yet." }, 503);
  const authorization = req.headers.get("Authorization") ?? "";
  const jwt = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!jwt) return json({ error: "Please sign in to ROW.GG first." }, 401);
  const userClient = createClient(SUPABASE_URL, PUBLISHABLE_KEY || SERVICE_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser(jwt);
  if (authError || !authData.user) return json({ error: "Your ROW.GG session is invalid. Please log in again." }, 401);

  try {
    const body = await req.json();
    if (body.action !== "start") return json({ error: "Unknown action." }, 400);
    const verifier = randomString(48);
    const state = randomString(32);
    const codeChallenge = await challenge(verifier);
    const { error: insertError } = await admin.from("roblox_oauth_states").insert({
      state,
      user_id: authData.user.id,
      code_verifier: verifier,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    if (insertError) return json({ error: "Could not start verification. Please try again." }, 500);

    const authorize = new URL("https://apis.roblox.com/oauth/v1/authorize");
    authorize.search = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: "openid profile",
      response_type: "code",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      state,
    }).toString();
    return json({ authorization_url: authorize.toString() });
  } catch {
    return json({ error: "Could not start Roblox verification." }, 400);
  }
});
