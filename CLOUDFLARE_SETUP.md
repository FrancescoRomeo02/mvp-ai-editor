# Cloudflare MVP setup

The repository is prepared for OpenNext, Workers AI and a SQLite-backed Durable Object. The actual account binding is intentionally left to deployment time so the MVP can be developed without Cloudflare credentials.

## 1. Prepare Supabase

In Supabase Dashboard:

1. Open **SQL Editor** and run, in order, the three files listed in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md): `001_paper_editor.sql`, `002_project_storage.sql`, and `003_signup_credit_codes.sql`.
2. In **Authentication → Providers**, enable Email and choose whether email confirmation is required.
3. In **Authentication → URL Configuration**, set `http://localhost:3000` as the local Site URL. Add the deployed Worker URL later as an additional redirect URL. Supabase documents this setting as required for confirmation and password-reset links.
4. In **Project Settings → API**, copy the Project URL, anon key, and service-role key. The last one is server-only.

Optional bonus code:

```sql
insert into public.promo_codes(code, bonus_credits, max_redemptions)
values ('WELCOME10', 10, 100);
```

## 2. Configure local environment

Use `.dev.vars` as the only local environment file. It is read by Wrangler and by the repository's `npm run dev`, `npm run build`, and Cloudflare build scripts. Copy the template and fill it locally:

```bash
cp .dev.vars.example .dev.vars
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
AI_PROVIDER=groq
AI_ENABLED=false
```

The two `NEXT_PUBLIC_` values are public Supabase client configuration and must be present in `.dev.vars` before the build, because Next.js embeds them in the browser bundle. The service-role key must never be exposed to the browser or committed.

### Logfire observability

Logfire is wired into the Cloudflare Worker and the AI provider span. It records request traces and safe metadata such as provider, model, message count, character counts, latency, outcome, and user ID. Prompt and response content are not sent by this integration.

## AI provider selection

Local Next.js development defaults to Groq through `.dev.vars`. To enable the AI route locally, set `AI_ENABLED=true` in `.dev.vars`; `wrangler.jsonc` is not used by the plain `npm run dev` server. The deployed Worker defaults to Cloudflare Workers AI through `wrangler.jsonc`. A signed-in user can override this from `/user`:

- Cloudflare uses the shared Workers AI quota.
- Groq and OpenAI use the user's own API key and do not consume the project's Cloudflare AI credits.

External keys are encrypted server-side before they are stored in Supabase. Configure one server-only encryption key for local development and production:

```bash
openssl rand -base64 32
npx wrangler secret put AI_USER_KEYS_ENCRYPTION_KEY
```

Put the generated value in local `.dev.vars` as `AI_USER_KEYS_ENCRYPTION_KEY=...`; for production, add it with the Wrangler command above. Do not commit either file or place provider keys in browser storage. `OPENAI_MODEL` and `GROQ_MODEL` remain optional model overrides.

For local Cloudflare preview, set the Logfire token in the same `.dev.vars` file:

```env
LOGFIRE_TOKEN=your-logfire-write-token
LOGFIRE_ENVIRONMENT=development
```

For production, store the token as a Worker secret:

```bash
npx wrangler secret put LOGFIRE_TOKEN
```

The token is server-only. Do not add it to `NEXT_PUBLIC_*` variables or the browser bundle. Logfire's Cloudflare integration exports spans during the Worker request lifetime using `ctx.waitUntil()`.

Start locally and verify registration, login, project creation, and file persistence:

```bash
npm install
npm run dev
```

## 3. First deployment (AI disabled)

1. Authenticate Wrangler and verify the account:

   ```bash
   npm install
   npx wrangler login
   npx wrangler whoami
   ```

2. Set the runtime Supabase values and Logfire token as Worker secrets. Do not put server secrets in `wrangler.jsonc`:

   ```bash
   npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL
   npx wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
   npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   npx wrangler secret put LOGFIRE_TOKEN
   ```

   The repository also provides a safe bulk sync from `.dev.vars`. It defaults to a dry-run and uploads only the allow-listed runtime secrets:

   ```bash
   npm run secrets:sync
   npm run secrets:sync -- --apply
   ```

   For a named Wrangler environment, add `--env production` to both commands. The script sends values to `wrangler secret bulk` through stdin and never prints or stores them.

   The public URL and anon key are also declared as secrets because server routes use them at runtime; the deployment build gets the same public values from `.dev.vars`.

3. Deploy:

   ```bash
   npm run deploy
   ```

`wrangler.jsonc` provisions the `AI` binding and the `USAGE` Durable Object binding. The first deployment also applies the SQLite Durable Object migration. The AI route verifies the Supabase access token and keys usage by the authenticated Supabase user, not by a browser-controlled cookie.

After deployment, open the `workers.dev` URL printed by Wrangler and test registration and project creation. Then add that URL to Supabase **Authentication → URL Configuration**.

## 4. Enable Workers AI

The repository defaults the deployed Worker to `AI_ENABLED=false`. Only after the non-AI flow works, change this value in `wrangler.jsonc`:

```jsonc
"AI_ENABLED": "true"
```

Then deploy again:

```bash
npm run deploy
```

The Worker uses the direct Workers AI binding and the Durable Object quota. No AI Gateway Unified Billing is involved. To inspect deployment logs:

```bash
npx wrangler tail paper-editor-mvp
```

## Credit protection

Workers AI is deliberately behind `AI_ENABLED` and `AI_PROVIDER`. Keep `AI_ENABLED=false` while validating the rest of the deployment. Start with the inexpensive model configured in `CF_AI_MODEL`, low per-user limits, and dashboard alerts. The application limits are not a Cloudflare billing cap; they protect application usage only. Cloudflare billing credits remain account-level and are consumed by actual eligible Workers AI calls.

For local development, use `AI_PROVIDER=groq` and `AI_ENABLED=true` in `.dev.vars` when testing the local provider. Switching to `AI_PROVIDER=cloudflare` requires running the Worker runtime with the bindings (`wrangler dev` or the OpenNext Cloudflare preview), not a plain Next.js process without a Cloudflare AI binding. Keep `AI_ENABLED=false` in `wrangler.jsonc` until the deployed non-AI flow has been validated; change it to `true` only when you intentionally enable Workers AI in the deployed Worker.
