# Ascend OS â€” Cloud Deployment

This upgrade adds Supabase Auth + PostgreSQL-backed cloud workspace sync, plus a scheduled email reminder Edge Function. It does not create your cloud project or deploy it automatically: credentials and project setup must be supplied by you.

## 1. Create the Supabase project

1. Create a project at https://supabase.com/dashboard.
2. Open SQL Editor and run `supabase/migrations/001_cloud_workspace.sql`.
3. In Project Settings â†’ API, copy the Project URL and the public publishable key (or legacy anon key). Do **not** use a service-role/secret key in the browser.
4. Copy `.env.example` to `.env.local` and set:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_PUBLISHABLE_OR_ANON_KEY
```

5. Restart the local dev server (`npm run dev`). For Vercel, add the same two `VITE_` variables in Project Settings â†’ Environment Variables, then redeploy.

The frontend requires authentication. New users may need to confirm their email depending on Supabase Auth settings. Configure the production site URL and allowed redirect URLs under Authentication â†’ URL Configuration. Add both your Vercel URL and any custom domain.

## 2. Test the cloud workspace

- Sign up, confirm email if requested, then sign in.
- Existing browser records are merged into your first cloud workspace once. The script downloads a source backup first; also use the app's **Backup** button for a JSON backup.
- The workspace currently saves a JSON snapshot row (`user_workspaces`) and uses row-level security to restrict it to the signed-in user.
- Keep only one active editing session while using this initial whole-workspace sync. The app detects many remote-update conflicts and offers merge/cloud-copy actions, but it is not yet a full per-record collaborative sync system.
- API keys and connector secrets are not part of the cloud payload.

## 3. Deploy the reminder Edge Function

Scheduled reminders send real email only when all of the following are configured: Supabase Auth email exists for the user, a task has a date/time, a Resend account/API key is set, a verified sender is configured, the function is deployed, and the cron job is scheduled.

1. Install/use the Supabase CLI, sign in, and link this repository to the project:

```powershell
npx.cmd supabase login
npx.cmd supabase link --project-ref YOUR_PROJECT_REF
```

2. Generate a strong private cron secret in PowerShell (keep it private):

```powershell
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$rng.Dispose()
$CRON_SECRET = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+','-').Replace('/','_')
$CRON_SECRET
```

3. Set production Edge Function secrets. Use your actual Resend key and an email sender/domain verified in Resend:

```powershell
npx.cmd supabase secrets set "CRON_SECRET=$CRON_SECRET" "RESEND_API_KEY=re_REPLACE_ME" "REMINDER_FROM_EMAIL=Ascend OS <reminders@your-verified-domain.example>"
```

4. Deploy the function:

```powershell
npx.cmd supabase functions deploy send-reminders
```

5. Open `supabase/schedules/reminders-cron.example.sql`, replace the three placeholders (project URL, public publishable/anon key, and the exact `$CRON_SECRET` from step 2), and run the SQL once in Supabase SQL Editor. The SQL stores the invocation values in Supabase Vault and schedules a request every minute. Never commit real secrets or the edited SQL containing secrets.

6. Check Supabase â†’ Edge Functions â†’ `send-reminders` logs and Cron job run history. A task must be due within the last five minutes (using the workspace's time zone) and not already logged in `reminder_deliveries` to send. Email provider failures are returned in function logs/response for investigation.

## 4. Deploy the frontend to Vercel

1. Push this repository to GitHub after reviewing `git diff` and running `npm run build`.
2. Import `AnshXGrind/ascend-os` into Vercel.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to Vercel project environment variables.
4. Deploy. Vercel uses `npm run build` and `dist/`; `vercel.json` records those settings.
5. Add the deployed domain to Supabase Auth redirect URLs.

GitHub Actions will run `npm ci` and `npm run build` on pushes and pull requests after `package-lock.json` has been committed.

## Security and architecture boundaries

- The public Supabase publishable/anon key is intended for browser use only because RLS policies are enforced. Never embed `service_role`, secret API keys, Resend keys, or `CRON_SECRET` in React or commit them to Git.
- `user_workspaces` RLS restricts authenticated users to the row matching `auth.uid()`. `reminder_deliveries` has no client access policy and is only accessed by the scheduled server function using the Supabase secret/service key.
- Browser sync is active while the app is open; the database is hosted independently of the browser. Email reminders run from Supabase Cron/Edge Functions after you complete the deployment steps.
- This initial implementation stores each user's workspace collections in one JSONB document for a low-friction migration. Move to normalized per-entity tables and record-level conflict resolution before multi-user collaboration or heavy use.
- Verify email deliverability and cron invocation before relying on reminders for important deadlines.