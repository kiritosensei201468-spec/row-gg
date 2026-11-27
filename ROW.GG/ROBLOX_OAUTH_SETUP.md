# Roblox account linking setup for ROW.GG

The browser app does not contain Roblox client credentials. The OAuth callback and token exchange run in the Supabase Edge Function.

## 1. Apply the database migration

In the Supabase Dashboard for project `enrpidtrrbhmsqszpwbs`, open **SQL Editor**, create a new query, paste the contents of:

`supabase/migrations/202611270001_roblox_account_linking.sql`

Run it once. This adds the Roblox profile fields, a unique Roblox user ID constraint, and a private one-time OAuth state table.

## 2. Register the Roblox OAuth app

Register ROW.GG as an OAuth app in the Roblox Creator Dashboard. The app needs the `openid` and `profile` scopes.

Use this exact redirect URI:

`https://enrpidtrrbhmsqszpwbs.supabase.co/functions/v1/roblox-oauth?action=callback`

Roblox currently requires the app publisher to have an ID-verified account to register and publish OAuth apps. Do not try to bypass that requirement.

## 3. Set Supabase Edge Function secrets

In Supabase Dashboard → Edge Functions → Secrets, add:

- `ROBLOX_CLIENT_ID` — the OAuth app's client ID
- `ROBLOX_CLIENT_SECRET` — the OAuth app's client secret, if Roblox issued one
- `ROWGG_SITE_URL` — `https://row-gg.vercel.app`
- `ROBLOX_REDIRECT_URI` — the exact redirect URI above

Never add the Roblox client secret to `config.js`, `app.js`, or any public website file.

## 4. Deploy the Edge Function

Deploy the function folder `supabase/functions/roblox-oauth` to the same Supabase project. The project config at `supabase/config.toml` disables automatic JWT verification for this callback endpoint; the function validates the ROW.GG session itself for the start action and validates a one-time, expiring OAuth state on callback.

## 5. Test

Sign in to ROW.GG, open Account Settings, choose Edit next to Roblox account, and approve the requested Roblox profile access. On return, the verified Roblox username and avatar URL are stored in the ROW.GG profile. A Roblox account can only be linked to one ROW.GG account.

The app requests only `openid profile`; it does not request game, group, inventory, or account-management permissions. It does not store Roblox access or refresh tokens.
