This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deployment on Vercel

The system is optimized for zero-configuration deployment on Vercel.

### 1. Environment Variables
Copy `.env.example` to your Vercel project environment variables:
- `DATABASE_URL`: Your PostgreSQL connection string.
- `NEXTAUTH_SECRET`: Random 32-character string.
- `SMTP_*`: Credentials for the email notification system.
- `CRON_SECRET`: Random string to secure the cron jobs in `vercel.json`.

### 2. Database Migration
The `package.json` includes a `postinstall` script to generate the Prisma client automatically. For the initial deployment, run:
```bash
npx prisma migrate deploy
npx prisma db seed
```
This will set up the multi-disease schema and seed the 140+ facility users.

### 3. Cron Jobs
Wait for Vercel to pick up `vercel.json`. You will see the daily SitRep and Windows seeding crons in the Vercel dashboard under the "Cron" tab.
