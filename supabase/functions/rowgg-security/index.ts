import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "https://row-gg.vercel.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: cors });

const env = (key: string) => {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`Missing server secret: ${key}`);
  return value;
};

const admin = () => createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const hash = async (value: string) => {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, "0")).join("");
};

const randomCode = () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");
const randomId = () => crypto.randomUUID();

async function sendCode(email: string, code: string, purpose: string) {
  const key = env("MAILJET_API_KEY");
  const secret = env("MAILJET_SECRET_KEY");
  const fromEmail = env("MAILJET_FROM_EMAIL");
  const fromName = Deno.env.get("MAILJET_FROM_NAME") || "ROW.GG";
  const auth = btoa(`${key}:${secret}`);
  const response = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      Messages: [{
        From: { Email: fromEmail, Name: fromName },
        To: [{ Email: email }],
        Subject: purpose === "login" ? "Your ROW.GG login code" : "Confirm your ROW.GG account change",
        TextPart: `Your ROW.GG verification code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
        HTMLPart: `<div style="font-family:Arial,sans-serif;background:#101019;color:#fff;padding:28px;border-radius:14px"><h2>ROW.GG verification</h2><p>Your verification code is:</p><div style="font-size:32px;letter-spacing:9px;font-weight:bold;padding:16px 0">${code}</div><p>This code expires in 10 minutes. Never share it with anyone.</p></div>`
      }]
    })
  });
  if (!response.ok) throw new Error("Mail delivery failed. Check your Mailjet sender and API credentials.");
}

async function createChallenge(db: ReturnType<typeof admin>, input: {
  email: string; user_id: string; purpose: string; access_token?: string; refresh_token?: string;
}) {
  const { data: recent } = await db.from("rowgg_verification_challenges")
    .select("id,created_at").eq("email", input.email).gte("created_at", new Date(Date.now() - 60_000).toISOString());
  if ((recent || []).length >= 3) throw new Error("Too many codes requested. Please wait one minute.");

  const code = randomCode();
  const id = randomId();
  const row = {
    id, email: input.email, user_id: input.user_id, purpose: input.purpose,
    code_hash: await hash(`${id}:${code}`),
    access_token: input.access_token || null,
    refresh_token: input.refresh_token || null,
    attempts: 0,
    expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
  };
  const { error } = await db.from("rowgg_verification_challenges").insert(row);
  if (error) throw new Error("Could not create a verification challenge.");
  await sendCode(input.email, code, input.purpose);
  return id;
}

async function verifyChallenge(db: ReturnType<typeof admin>, id: string, code: string, purpose: string, userId?: string) {
  if (!/^[0-9]{6}$/.test(code)) throw new Error("Enter the 6-digit code.");
  const { data, error } = await db.from("rowgg_verification_challenges")
    .select("*").eq("id", id).eq("purpose", purpose).maybeSingle();
  if (error || !data) throw new Error("This code is invalid or has expired. Request a new one.");
  if (userId && data.user_id !== userId) throw new Error("Verification request does not match this account.");
  if (new Date(data.expires_at).getTime() < Date.now()) {
    await db.from("rowgg_verification_challenges").delete().eq("id", id);
    throw new Error("This code has expired. Request a new one.");
  }
  if (data.attempts >= 5) {
    await db.from("rowgg_verification_challenges").delete().eq("id", id);
    throw new Error("Too many incorrect attempts. Request a new code.");
  }
  const valid = (await hash(`${id}:${code}`)) === data.code_hash;
  if (!valid) {
    await db.from("rowgg_verification_challenges").update({ attempts: data.attempts + 1 }).eq("id", id);
    throw new Error("Incorrect verification code.");
  }
  await db.from("rowgg_verification_challenges").delete().eq("id", id);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "Method not allowed." });

  try {
    const body = await req.json();
    const action = String(body.action || "");
    const db = admin();

    if (action === "login_start") {
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      if (!email || !password) return json(400, { error: "Email and password are required." });

      const authResponse = await fetch(`${env("SUPABASE_URL")}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { "apikey": env("SUPABASE_ANON_KEY"), "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const session = await authResponse.json();
      if (!authResponse.ok || !session.access_token || !session.refresh_token || !session.user?.id) {
        return json(401, { error: "Invalid email or password, or the email has not been verified." });
      }
      const challenge_id = await createChallenge(db, {
        email, user_id: session.user.id, purpose: "login",
        access_token: session.access_token, refresh_token: session.refresh_token,
      });
      return json(200, { challenge_id, email });
    }

    if (action === "login_resend") {
      const id = String(body.challenge_id || "");
      const { data, error } = await db.from("rowgg_verification_challenges")
        .select("email,user_id,purpose,access_token,refresh_token").eq("id", id).eq("purpose", "login").maybeSingle();
      if (error || !data) return json(400, { error: "Login request expired. Please log in again." });
      await db.from("rowgg_verification_challenges").delete().eq("id", id);
      const challenge_id = await createChallenge(db, { ...data, purpose: "login" });
      return json(200, { challenge_id });
    }

    if (action === "login_verify") {
      const row = await verifyChallenge(db, String(body.challenge_id || ""), String(body.code || ""), "login");
      if (!row.access_token || !row.refresh_token) return json(400, { error: "Login session expired. Please log in again." });
      return json(200, { access_token: row.access_token, refresh_token: row.refresh_token });
    }

    if (action === "settings_start" || action === "settings_resend" || action === "settings_verify") {
      const authHeader = req.headers.get("Authorization") || "";
      const accessToken = authHeader.replace(/^Bearer\s+/i, "");
      if (!accessToken) return json(401, { error: "Please sign in again." });
      const { data: authData, error: authError } = await db.auth.getUser(accessToken);
      const currentUser = authData?.user;
      if (authError || !currentUser?.id || !currentUser.email) return json(401, { error: "Your session expired. Please sign in again." });

      if (action === "settings_start") {
        const operation = String(body.operation || "");
        if (!["username", "password"].includes(operation)) return json(400, { error: "Unsupported account change." });
        if (operation === "username" && !/^[A-Za-z0-9_]{3,20}$/.test(String(body.value || ""))) return json(400, { error: "Username must be 3–20 letters, numbers or underscores." });
        if (operation === "password" && String(body.value || "").length < 8) return json(400, { error: "Password must be at least 8 characters." });
        const challenge_id = await createChallenge(db, { email: currentUser.email, user_id: currentUser.id, purpose: `settings:${operation}` });
        return json(200, { challenge_id, email: currentUser.email, operation });
      }

      if (action === "settings_resend") {
        const id = String(body.challenge_id || "");
        const { data, error } = await db.from("rowgg_verification_challenges")
          .select("email,user_id,purpose").eq("id", id).like("purpose", "settings:%").eq("user_id", currentUser.id).maybeSingle();
        if (error || !data) return json(400, { error: "This verification request has expired." });
        await db.from("rowgg_verification_challenges").delete().eq("id", id);
        const challenge_id = await createChallenge(db, data);
        return json(200, { challenge_id });
      }

      const operation = String(body.operation || "");
      if (!["username", "password"].includes(operation)) return json(400, { error: "Unsupported account change." });
      const row = await verifyChallenge(db, String(body.challenge_id || ""), String(body.code || ""), `settings:${operation}`, currentUser.id);
      const value = String(body.value || "");
      if (operation === "username") {
        if (!/^[A-Za-z0-9_]{3,20}$/.test(value)) return json(400, { error: "Username must be 3–20 letters, numbers or underscores." });
        const { error } = await db.from("profiles").update({ username: value }).eq("id", currentUser.id);
        if (error) return json(400, { error: error.message });
      } else {
        if (value.length < 8) return json(400, { error: "Password must be at least 8 characters." });
        const { error } = await db.auth.admin.updateUserById(currentUser.id, { password: value });
        if (error) return json(400, { error: error.message });
      }
      return json(200, { success: true, operation });
    }

    return json(400, { error: "Unknown action." });
  } catch (error) {
    return json(400, { error: error instanceof Error ? error.message : "Verification request failed." });
  }
});
