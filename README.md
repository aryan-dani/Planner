# Utility OS

A premium, monochrome academic workspace for university students. Built with Next.js, Firebase, and Google Drive sync so course materials, planning, and AI study tools live in one place.

## Core Features

- **Document Intelligence (Hybrid RAG)**: Slide-level chunk retrieval with BM25 + vector search, grounded citations (Slide 14 · DBMS.pptx), and scoped answers by branch/semester.
- **Drive Sync Runtime**: Node scripts that sync a shared Google Drive folder into Firestore and index document text for search.
- **Resource Vault**: Notes, presentations, question banks, and PYQs organized by branch and semester.
- **Study Planner**: Collaborative weekly/monthly planning with natural-language prompts.
- **GPA Calculator**: SGPA/CGPA with auto-populated subjects.
- **SRS Flashcards**: Leitner-style spaced repetition.
- **Focus Timer**: Pomodoro sessions with activity tracking.
- **PWA**: Installable offline-capable client with update prompts.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS + custom monochrome design tokens
- **Database / Auth**: Firebase (Firestore + Auth) via `firebase` / `firebase-admin`
- **Storage**: Google Drive (shared folder sync)
- **AI**: Groq (`GROQ_API_KEY`) for chat/study/summarize; Gemini (`GEMINI_API_KEY`) for search embeddings only
- **Icons / Motion**: Lucide React, Framer Motion

## Deployment & Setup

### 1. Environment Variables

Create a `.env.local` file in the project root:

```env
# Firebase client (public)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (server / sync scripts)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Google Drive shared folder to sync
GOOGLE_DRIVE_FOLDER_ID=

# App config
NEXT_PUBLIC_ADMIN_EMAILS=you@example.com
# Optional server-only allowlist (preferred over NEXT_PUBLIC for API checks)
ADMIN_EMAILS=you@example.com
GROQ_API_KEY=

# Hybrid RAG embeddings (Google AI Studio — NOT a replacement for Groq)
GEMINI_API_KEY=

# Protect /api/webhooks/storage-sync (required for Vercel Cron in production)
CRON_SECRET=

# Ishani campus API (faculty seating, directory, labs) — server-only
# Local: http://127.0.0.1:8001
# Production (Vercel): https://api.aryandani.com  — same host as Ishani Pages (VITE_API_URL)
ISHANI_API_URL=

# Preferred for hosted Sync Now: dispatch GitHub Actions (workflow + repo secrets)
GH_PAT=
```

### Vercel Production (required for hosted Sync Drive)

Set these on the Vercel project for **Production**, then redeploy:

| Variable | Why |
|----------|-----|
| `GOOGLE_DRIVE_FOLDER_ID` | In-process Drive→Firestore sync / cron fallback |
| `GROQ_API_KEY` | Chat, study, summarize (unchanged) |
| `GEMINI_API_KEY` | Chunk embeddings during `index-content` + semantic search cache |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Admin token verify + Drive JWT |
| `NEXT_PUBLIC_ADMIN_EMAILS` | Admin UI + Sync Now button |
| `GH_PAT` (workflow scope) | **Recommended** — Sync Now dispatches `storage-sync.yml` (sync + index) |
| `CRON_SECRET` | Authorizes the daily Vercel cron hit |
| `ISHANI_API_URL` | Campus seating / directory / labs — set to `https://api.aryandani.com` (Ishani’s public FastAPI) |

Without `GOOGLE_DRIVE_FOLDER_ID` **and** without `GH_PAT`, Sync Now returns **503** instead of a fake success.

For GitHub Actions daily sync, add the same `FIREBASE_*`, `GOOGLE_DRIVE_FOLDER_ID`, and `GEMINI_API_KEY` values as repository secrets.

### 2. Hybrid RAG setup (one-time)

Groq still powers answers. Gemini only embeds text for better search.

```bash
# See what's configured (never prints secret values)
npm run check-rag-env

# Deploy Firestore vector indexes (requires: firebase login once)
npm run deploy:indexes

# Re-index: slide-level chunks + optional Gemini embeddings
npm run index-content

# Measure retrieval quality after indexing
npm run eval-rag
```

**You must do manually:**
1. Create `GEMINI_API_KEY` at [Google AI Studio](https://aistudio.google.com/apikey) → add to `.env.local`, Vercel, GitHub Secrets
2. Run `firebase login` once, then `npm run deploy:indexes`
3. Trigger **Scheduled Storage Sync** in GitHub Actions (or `npm run index-content` locally)

Without `GEMINI_API_KEY`, search falls back to keyword/BM25 (still scoped by semester). Without deployed indexes, vector search is skipped until indexes finish building in Firebase Console.

### 3. Drive Sync & Indexing

```bash
# Sync Drive folder → Firestore subjects/resources
npm run sync-drive

# Index document text for RAG / search
npm run index-content

# Both
npm run sync-all

# Read-only: compare Drive subjects/categories vs Firestore (via subjects join)
npm run audit-drive-site
# Optional: --branch=AIDS --semester=3
```

Resources are cached ~10 minutes (`unstable_cache` / `revalidate: 600`). After changing what the site shows (or after sync), wait for revalidate, redeploy, or use **Sync Now**.

Drive folder naming convention:

```text
<root>/<BRANCH>/Sem_<N>_<BRANCH>/Sem_<N>_{Notes|PPT|PYQ|QB|WriteUps|Codes}/<Subject>/<File>
```

Example: `AIDS/Sem_5_AIDS/Sem_5_PPT/ML/ML_Unit_1.pptx`

Syllabus at semester root: `Sem_<N>_Syllabus.pdf`

**File naming (underscores only; no spaces; `Unit` not `UNIT`):**

| Category | Pattern | Example |
|----------|---------|---------|
| Notes | `<SUBJECT>_Unit_<N>_Notes.ext` | `DAA_Unit_1_Notes.pdf` |
| PPT | `<SUBJECT>_Unit_<N>[_Topic].ext` | `DAA_Unit_5_Hashing.pptx` |
| WriteUps | `Sem_<N>_<LabCode>_WriteUp_<K>[_Topic].ext` | `Sem_4_AIESL_WriteUp_1_A_Star.docx` |
| Codes | `Sem_<N>_<LabCode>_Assignment_<K>[_Topic].ext` | `Sem_5_OSL_Assignment_3_FCFS_SRTF.c` |
| PYQ | `<SUBJECT>_PYQ_<Year>[_Mid\|End][_K].ext` | `DAA_PYQ_2024_End_1.pdf` |
| QB | `<SUBJECT>_QB[_Year][_Solved][_K].ext` | `PS_QB_1_Solved.pdf` |

Normalize category folders:

```bash
node runtime/tools/normalize-drive.mjs --dry-run
node runtime/tools/normalize-drive.mjs
```

Audit / rename files + trash junk:

```bash
npm run rename-drive-files          # dry-run (default)
npm run rename-drive-files:apply    # apply trash + mechanical renames
```

### 4. Run Locally

```bash
npm install
npm run dev
```

## License

Proprietary License - All Rights Reserved. See [LICENSE](LICENSE) for details.

Made with love by [Aryan Dani](https://www.aryandani.com).
