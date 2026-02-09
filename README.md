# Intelyi

Intelyi is a full-stack e-commerce platform with an AI-driven merchandising engine. The storefront is the interface; the system learns from user behavior to personalize rankings, build bundles, and optimize promotions over time.

## Tech Stack

- Next.js (App Router) + TypeScript
- Prisma + Neon Postgres
- NextAuth (GitHub provider)

## Getting Started

1. Install dependencies.
```
npm install
```

2. Set environment variables in `.env`.
```
DATABASE_URL='your-neon-connection-string'
NEXTAUTH_URL='http://localhost:3000'
NEXTAUTH_SECRET='replace-with-a-long-random-string'
GITHUB_ID='replace-with-github-oauth-client-id'
GITHUB_SECRET='replace-with-github-oauth-client-secret'
```

3. Generate Prisma client and run migrations (if applicable).
```
npx prisma generate
npx prisma migrate dev
```

4. Start the dev server.
```
npm run dev
```

Open `http://localhost:3000`.

## Notes

- Auth is configured at `src/app/api/auth/[...nextauth]/route.ts`.
- Prisma uses the Neon adapter in `src/lib/prisma.ts`.
- Product seed script: `prisma/seed.ts`.
