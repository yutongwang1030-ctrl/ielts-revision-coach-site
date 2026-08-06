# Revision Coach MVP Setup

This project now contains the code structure for:

- student email sign-up / sign-in
- cloud essay storage
- per-user data isolation
- Cloudflare Pages Functions scoring endpoint
- admin-only teacher dashboard

## 1. Supabase setup

1. Create a new Supabase project.
2. In Supabase SQL Editor, run:
   - `supabase/schema.sql`
3. In Supabase Authentication:
   - enable Email auth
   - choose whether email confirmation is required
4. Copy:
   - Project URL
   - Publishable / anon key

## 2. Frontend config

Open:
- `assets/js/config.js`

Fill in:

```js
window.APP_CONFIG = {
  SUPABASE_URL: "https://YOUR_PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_SUPABASE_PUBLISHABLE_KEY",
  SCORE_ENDPOINT: "/api/score",
  ENABLE_MOCK_SCORING: false,
};
```

## 3. Cloudflare Pages variables

In Cloudflare Pages project settings, add these environment variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `AI_API_KEY`
- `AI_API_URL`
- `AI_MODEL`
- `ENABLE_MOCK_SCORING`

Recommended starting values:

- `AI_API_URL = https://api.openai.com/v1/chat/completions`
- `AI_MODEL = gpt-4.1-mini`
- `ENABLE_MOCK_SCORING = false`

If you want to test the full flow before connecting a real model:

- set `ENABLE_MOCK_SCORING = true`

## 4. Make yourself admin

After you sign up with your own teacher account, go to Supabase SQL Editor and run:

```sql
update public.profiles
set role = 'admin'
where email = 'your-email@example.com';
```

Then refresh `teacher.html`.

## 5. Student flow

1. Student opens `auth.html`
2. Student creates account
3. Student signs in
4. Student uploads essay in `upload.html`
5. Essay is scored through `/api/score`
6. Essay payload is saved into `public.essays`
7. Student sees history in `journey.html`

## 6. Important notes

- Never put `service_role` on the frontend.
- The frontend should only use the publishable / anon key.
- Real scoring keys must stay in Cloudflare server-side variables only.
- If email confirmation is enabled in Supabase, students may need to confirm before first login.
