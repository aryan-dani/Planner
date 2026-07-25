# Utility OS

A premium, monochrome academic workspace for university students. Built with Next.js, Firebase, and Google Drive sync so course materials, planning, and AI study tools live in one place.

## Core Features

- **Document Intelligence (RAG)**: Ask questions grounded in your uploaded PDFs, PPTs, and DOCs.
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
- **AI**: Groq (Llama 3.3) via Vercel AI SDK
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
GROQ_API_KEY=

# Optional: protect /api/webhooks/storage-sync
CRON_SECRET=
```

For GitHub Actions daily sync, add the same `FIREBASE_*` and `GOOGLE_DRIVE_FOLDER_ID` values as repository secrets.

### 2. Drive Sync & Indexing

```bash
# Sync Drive folder → Firestore subjects/resources
npm run sync-drive

# Index document text for RAG / search
npm run index-content

# Both
npm run sync-all
```

Drive folder naming convention:

```text
<root>/<BRANCH>/Sem_<N>_<BRANCH>/<Category>/<Subject>/<File>
```

Example: `AIDS/Sem_5_AIDS/Sem_5_PPT/ML/ML_Unit_1.pptx`

### 3. Run Locally

```bash
npm install
npm run dev
```

## License

Proprietary License - All Rights Reserved. See [LICENSE](LICENSE) for details.

Made with love by [Aryan Dani](https://www.aryandani.com).
