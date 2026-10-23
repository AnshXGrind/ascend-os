# Ascend OS — Personal Learning Dashboard

A React + TypeScript + Vite starter app for a personal learning and career operating system.

## Included in this MVP

- Dashboard for task completion, resource counts, skill baselines, focus list and weekly rhythm.
- Task planner with due dates, reminder times, priority, overdue list and complete/incomplete status.
- Learning resource library for course links, playlists, articles and learning paths.
- Goal tracker and editable skill ratings.
- Codeforces public profile connector using the official public API.
- Browser-local persistence using `localStorage`.
- Browser notification permission and in-page timer checks while the app is open.
- JSON export for backup/portability.

> Demo content is seeded on first launch. It is illustrative, not imported account data. Skill scores and resource progress are manual estimates until a provider-specific connector is configured.

## Run locally

You need a current Node.js LTS release.

```bash
npm install
npm run dev
```

Open the local URL Vite prints in the terminal. To create a production build:

```bash
npm run build
npm run preview
```

## How data works today

- Tasks, resources, goals, and skill baselines are saved in the current browser's local storage.
- Use **Integrations → Export JSON** for a portable backup.
- Codeforces public profile data can be fetched by handle from the Integrations page.
- Reminder checks run in the browser while the page is open. This is not a reliable background scheduler.
- YouTube playlists can be saved as links right away. Automatic playlist metadata and private account access require a proper YouTube Data API / OAuth setup.

## Suggested production architecture

```text
React + TypeScript UI
        │
        ├── Dashboard / Planner / Library / Goals / Skills
        │
        ▼
FastAPI (or Node API) ─── Auth + integration adapters
        │                    ├── YouTube Data API (OAuth/API key)
        │                    ├── Codeforces public API
        │                    ├── Manual evidence / CSV imports
        │                    └── Provider-specific future adapters
        ▼
PostgreSQL ─── users, tasks, reminders, resources, progress_events, goals, skills
        │
        └── Scheduled worker ─── email/web push notifications + weekly review
```

Keep provider tokens and API secrets on the server, not in frontend source code. Store a normalized event log such as `lesson_completed`, `problem_solved`, `project_shipped`, and `speaking_practice_logged`; derive weekly analytics from these events. Do not pretend that a saved link or a video opened means the learner completed it.

## Integration reality check

- **Codeforces:** Public endpoints exist for user profile, rating history, and submissions. Respect API usage limits and handle outages/timeouts.
- **YouTube:** Use YouTube Data API v3 for playlist metadata. Use OAuth when access to the learner's private playlists or account-specific data is required. Keep keys/secrets out of the client when a server-side adapter is appropriate.
- **LeetCode:** Treat third-party endpoints as unofficial unless current official documentation says otherwise. For an MVP, use manual logging or an explicitly reviewed integration; do not collect account passwords.
- **Striver / MIT OCW / Stanford / Coursera / Google Skills / NVIDIA:** Store resource URLs and completion evidence immediately. Add API/LMS imports only when the specific provider supports access for your account and use case.

## Next build phases

1. Add a proper `Resource` detail screen with chapter/checklist tracking and a YouTube playlist importer.
2. Create FastAPI + PostgreSQL endpoints and account authentication.
3. Add provider adapters and store sync timestamps/errors; never silently present stale imports as live.
4. Implement persistent scheduled reminders (email/web push) with timezone-aware due timestamps.
5. Add a weekly review and evidence-based skill scoring from problems solved, assessments, projects, and speaking recordings.

## Security and reliability notes

- No account passwords are requested or stored.
- Local storage is per browser profile and is not encrypted or synchronized across devices.
- Browser notifications depend on permission and the page remaining open.
- The Codeforces connector calls public endpoints from the browser; if network/CORS restrictions occur, proxy the request through your backend and cache conservatively.

## Personal-data-first update

This version intentionally starts with an empty workspace. There are no prefilled tasks, goals, skills, resources, or DSA problems. Existing prototype seed records are filtered from local storage on load so the old sample cards should disappear after the app reloads. Your own records remain stored in this browser.

### Added manual workflows

- Create and delete your own tasks, with due date, time, priority, and local browser reminders while the app is open.
- Add and remove learning resources; change status and adjust progress with a slider.
- Add your own goals and target dates, and set goal progress.
- Add your own skills and evidence notes, and adjust skill ratings.
- Use **DSA tracker** to log problem title, platform, topic, difficulty, status, URL, and revision date.
- Export tasks, resources, goals, skills, and DSA problems as a JSON backup.

### Optional YouTube playlist import

The Integrations page can import up to 50 videos from a public playlist URL. It requires a Google Cloud project with **YouTube Data API v3** enabled and an API key. Imported videos are created with 0% progress and Queued status; update them yourself as you study. This is a URL-based public playlist importer, not yet a full OAuth integration that discovers every private playlist saved to your account.

For a local prototype, the API key is stored in browser local storage. Restrict the key to YouTube Data API v3 and your local development origin. Do not use an unrestricted key or treat this client-side setup as production-grade secret storage.

### Local development

```powershell
npm install
npm run dev
```

If PowerShell blocks `npm.ps1`, use `npm.cmd install` and `npm.cmd run dev`, or temporarily allow scripts for the current terminal with `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`.
