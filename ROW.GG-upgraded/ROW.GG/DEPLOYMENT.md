# Deployment

## Cloudflare Pages
1. Extract the ZIP.
2. Create a Cloudflare Pages project and upload the contents of the `ROW.GG` folder, or connect a Git repository containing those files.
3. No build command is required for this static site.
4. Set the output directory to the folder containing `index.html`.
5. The included `_redirects` file routes product and auth paths back to `index.html`.

## Supabase Auth URLs
For local testing, add `http://localhost:3000/**` to Supabase Authentication → URL Configuration.
For production, add your deployed site URL and its wildcard route (for example, `https://your-domain.example/**`) to the allowed Redirect URLs, and set the Site URL to your deployed homepage.

Do not put Supabase secret or service-role keys in frontend files.
