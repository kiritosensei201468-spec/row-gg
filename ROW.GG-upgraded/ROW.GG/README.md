# ROW.GG — upgraded starter

This ZIP contains the upgraded ROW.GG website with the existing Supabase project configured.

## Included

- Dark, premium ROW.GG theme with animated hero, floating product showcase, glowing details, hover states, reveal-on-scroll effects and responsive layouts.
- Homepage, product catalog and detail routes for APP1–APP13.
- Product search and rating sorting (highest / lowest); products without ratings remain after rated products.
- Supabase email/password sign-up and login.
- **Display Name on both Sign Up and Log In.** The name is saved in `public.profiles.username` and shown in the navigation/account menu, chat messages and product reviews.
- User-to-user general chat using `chat_messages` and Supabase Realtime.
- Product reviews and community ratings using `app_reviews`.
- `_redirects` file for single-page route fallback on Cloudflare Pages.

## Supabase configuration

`config.js` already contains the ROW.GG project URL and the publishable key you supplied. A Supabase publishable key is intended for browser use. Never put a Supabase secret key or `service_role` key in this project.

## Display Name behavior

The display name must be 3–20 characters and may contain letters, numbers and underscores. This matches the existing `profiles.username` database constraint.

- On sign-up, the chosen display name is sent as Supabase Auth user metadata; your existing `handle_new_user()` trigger should copy it into `profiles.username`.
- On every successful login, the name entered in the Display Name field is saved to that user's own profile row.
- The saved profile name is used in the navbar, chat and review author labels.

If you want display names to support spaces or punctuation later, the database `username_format` constraint and the form validation need to be changed together.

## Run locally

Open a terminal in the extracted `ROW.GG` folder and run:

```bash
python -m http.server 3000
```

Then open `http://localhost:3000`.

In Supabase → Authentication → URL Configuration:
- Add `http://localhost:3000/**` to Redirect URLs.
- Set Site URL to `http://localhost:3000` for local testing.

## Database requirements

This build expects the tables and policies already created in your Supabase project:

- `profiles` with `id`, `username`, `created_at`, `updated_at`; the profile row is created by your `handle_new_user()` signup trigger.
- `app_reviews` with `user_id`, `app_slug`, `rating`, `review_text`, `created_at`.
- `chat_messages` with `user_id`, `message`, `created_at`, and the table added to the `supabase_realtime` publication.

The review form uses an upsert on `(user_id, app_slug)`. Confirm that a unique constraint exists for those two columns. If it does not, run this once in the Supabase SQL Editor:

```sql
ALTER TABLE public.app_reviews
ADD CONSTRAINT app_reviews_user_app_unique UNIQUE (user_id, app_slug);
```

The existing RLS policies must allow:
- Public or authenticated SELECT on `profiles` and `app_reviews` (as currently configured in your project).
- A user to UPDATE only their own `profiles` row.
- Authenticated users to SELECT chat messages and INSERT messages with their own `user_id`.
- A user to INSERT/UPDATE their own review rows.

## Before public launch

- Purchase and download buttons remain placeholders because no product checkout/download URLs were provided.
- YouTube and Discord links remain placeholders.
- APP1–APP13 are placeholders; add actual product descriptions, artwork, plans and availability.
- Test signup confirmation, login, profile-name updates, chat and reviews in your Supabase project.
- Review your Supabase RLS policies and email deliverability settings before public launch.
- This is a static frontend; do not add service-role credentials to it.
