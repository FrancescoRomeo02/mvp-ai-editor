# Supabase setup

1. Create a Supabase project.
2. In the Supabase SQL editor, run [`supabase/migrations/001_paper_editor.sql`](./supabase/migrations/001_paper_editor.sql), [`supabase/migrations/002_project_storage.sql`](./supabase/migrations/002_project_storage.sql), [`supabase/migrations/003_signup_credit_codes.sql`](./supabase/migrations/003_signup_credit_codes.sql), and [`supabase/migrations/004_user_ai_settings.sql`](./supabase/migrations/004_user_ai_settings.sql).
3. In Supabase Authentication, choose the email provider and set the site URL to the local app URL (usually `http://localhost:3000`).
4. Copy `.dev.vars.example` to `.dev.vars` and fill in the Supabase values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=server-only-service-role-key
SUPABASE_PROJECT_FILE_SIZE_LIMIT=50MB
```

The browser only uses the public anon key. The `projects` table is protected by RLS: an authenticated user can read, create, update, and delete only projects where `owner_user_id = auth.uid()`.

Project files use one private Supabase Storage bucket per project. The bucket id is the project UUID and is created by the server route after the authenticated project is created. Never expose `SUPABASE_SERVICE_ROLE_KEY` to client-side code.

To activate a campaign code, insert it with the SQL editor, for example:

```sql
insert into public.promo_codes(code, bonus_credits, max_redemptions)
values ('WELCOME10', 10, 100);
```
