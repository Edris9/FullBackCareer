# KarriarApp 💼

En AI-driven karriärcoach-applikation byggd med Next.js, Groq och Neon PostgreSQL.

## Funktioner

- Inloggning och registrering med NextAuth
- Ladda upp CV (PDF) för AI-analys
- CV-feedback med Overall Score och ATS Score
- Styrkor, förbättringsförslag och nyckelord
- Kompetensgapanalys (kommer snart)

## Tech Stack

- **Frontend** — Next.js 14, React, TypeScript
- **Auth** — NextAuth (Credentials)
- **Databas** — Neon PostgreSQL + Drizzle ORM
- **AI** — Groq API (LLaMA 3.3 70B)
- **PDF-parsning** — pdf2json

## Installation

### 1. Klona projektet

```bash
git clone https://github.com/Edris9/karriarapp.git
cd karriarapp/Backend
```

### 2. Installera dependencies

```bash
npm install
```

### 3. Skapa `.env.local`

```env
DATABASE_URL=postgresql://...@...neon.tech/neondb?sslmode=require
NEXTAUTH_SECRET=din-hemliga-nyckel
NEXTAUTH_URL=http://localhost:3001
GROQ_API_KEY=din-groq-api-nyckel
```

### 4. Kör databasemigrering

```bash
npx drizzle-kit push
```

### 5. Starta utvecklingsservern

```bash
npm run dev
```

Öppna [http://localhost:3001](http://localhost:3001)

## Projektstruktur

```
Backend/
├── app/
│   ├── api/
│   │   ├── analyze-cv/     # CV-analys med Groq AI
│   │   ├── cover-letter/   # Personligt brev-generator
│   │   ├── register/       # Användarregistrering
│   │   └── auth/           # NextAuth
│   ├── login/              # Inloggning & registrering
│   ├── home/               # Dashboard
│   ├── layout.tsx
│   ├── page.tsx
│   └── providers.tsx
├── lib/
│   ├── auth.ts             # NextAuth konfiguration
│   ├── db.ts               # Databasanslutning
│   ├── groq.ts             # Groq AI-klient
│   └── schema.ts           # Databasschema
└── drizzle.config.ts
```

## Databasschema

| Tabell | Beskrivning |
|---|---|
| `users` | Användare |
| `resumes` | Uppladdade CV:n |
| `ai_analyses` | AI-analyser och feedback |
| `job_applications` | Jobbansökningar |

## Miljövariabler

| Variabel | Beskrivning |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL anslutningssträng |
| `NEXTAUTH_SECRET` | Hemlig nyckel för NextAuth sessioner |
| `NEXTAUTH_URL` | Applikationens URL |
| `GROQ_API_KEY` | API-nyckel från groq.com |

## Licens

MIT © 2026 Edris9