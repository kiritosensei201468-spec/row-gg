# ROW.GG email verification backend

This folder contains the server-side part of password + email-code verification.

## 1. Run the SQL
Open Supabase Dashboard → SQL Editor and run `rowgg_verification.sql`.

## 2. Configure Edge Function secrets
In Supabase Dashboard → Edge Functions → Secrets, add:

- `SUPABASE_URL` = project URL
- `SUPABASE_ANON_KEY` = publishable/anon key
- `SUPABASE_SERVICE_ROLE_KEY` = service-role secret (server-side only; never put this in the website or GitHub)
- `MAILJET_API_KEY` = Mailjet API key
- `MAILJET_SECRET_KEY` = Mailjet secret key
- `MAILJET_FROM_EMAIL` = verified sender email in Mailjet
- `MAILJET_FROM_NAME` = ROW.GG

The function sends messages through Mailjet's Send API. Supabase SMTP settings alone do not supply Mailjet API credentials to Edge Functions.

## 3. Deploy
From the repository root, with Supabase CLI linked to this project:

```sh
supabase functions deploy rowgg-security --no-verify-jwt
```

The function validates the user's password through Supabase Auth itself. Do not disable or weaken RLS on profiles. The challenge table is service-role-only.

## Actions
- `login_start`: checks email/password, then emails a code.
- `login_resend`: sends a replacement login code.
- `login_verify`: returns the short-lived Auth session only after code verification.
- `settings_start`, `settings_resend`, `settings_verify`: verify the current signed-in user before changing username/password.

Codes expire after 10 minutes, are single-use, and allow at most five guesses. Code requests are rate-limited to three per email per minute.
