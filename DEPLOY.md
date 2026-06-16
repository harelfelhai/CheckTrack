# Deploying CheckTrack to Google Cloud Run

The app is containerized (see `Dockerfile`) and built **in the cloud by Cloud
Build** — no local Docker is required. Chromium is installed in the image so
Puppeteer can render the signed-check PDF.

> Secrets are **never** committed. They live only in `.env.local` locally and in
> the Cloud Run service's environment variables in production.

---

## One-time: deploy from the GitHub repo

1. **Push the latest code** (including `Dockerfile`, `.dockerignore`, the
   `output: "standalone"` change) to GitHub.
2. Google Cloud Console → **Cloud Run** → **Create service** →
   **Continuously deploy from a repository** → **Set up with Cloud Build**.
3. Connect the GitHub repo `harelfelhai/CheckTrack`, branch `main`.
4. **Build type: Dockerfile** (path `/Dockerfile`). Save.
5. **Region:** pick one close to you (e.g. `europe-west1`).
6. **Authentication:** **Allow unauthenticated invocations** — required so
   suppliers can open the public signing link. (The app enforces its own login
   on screens 1–2; screen 3 is intentionally public via one-time token.)
7. Under **Container → Variables & Secrets**, add the environment variables
   listed below.
8. **Create.** Cloud Build builds the image and deploys. You'll get a URL like
   `https://checktrack-xxxxx-ew.a.run.app`.

## Environment variables (set in Cloud Run, not in git)

| Variable | Value |
|---|---|
| `CHECKTRACK_DEV_MODE` | `false` |
| `NEXT_PUBLIC_BASE_URL` | the Cloud Run URL (set after first deploy — see below) |
| `AUTH_URL` | the Cloud Run URL (same value) |
| `COMPANY_NAME` | the real company display name |
| `GOOGLE_SHEET_TAB` | `Checks` |
| `TOKEN_SIGNING_SECRET` | a strong random secret (generated separately) |
| `AUTH_SECRET` | a strong random secret (generated separately) |
| `GOOGLE_COMPANY_EMAIL` | the company Gmail |
| `GOOGLE_DRIVE_FOLDER_ID` | the archive folder id |
| `GOOGLE_CLIENT_ID` | OAuth client id |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `GOOGLE_REFRESH_TOKEN` | refresh token from `npm run google:auth` |
| `GOOGLE_SHEET_ID` | the central sheet id |
| `AUTH_ALLOWED_EMAILS` | comma-separated allowlist |
| `GOOGLE_VISION_API_KEY` | Cloud Vision key (OCR) |

> `PUPPETEER_EXECUTABLE_PATH` is **not** needed here — it's baked into the image
> (`/usr/bin/chromium`).

## After the first deploy (two-phase, because the URL isn't known up front)

1. Copy the service URL Cloud Run assigned.
2. Set `NEXT_PUBLIC_BASE_URL` and `AUTH_URL` to that URL → **deploy a new
   revision** (Edit & Deploy New Revision).
3. Google Console → **APIs & Services → Credentials → the OAuth client** → add
   to **Authorized redirect URIs**:
   `https://<your-cloud-run-url>/api/auth/callback/google`
   and save.
4. Open the URL, sign in, and run one real end-to-end check.

## Redeploys

Pushing to `main` triggers Cloud Build automatically (continuous deployment).
