# Local Supabase Setup Guide

## Prerequisites
- Docker Desktop running
- Node.js 18+ and Bun (or npm)
- Supabase CLI: `npm install -g supabase`

## Steps

### 1. Install dependencies
```bash
bun install   # or: npm install
```

### 2. Start local Supabase
```bash
supabase start
```
এটা প্রথমবার Docker images download করবে (কয়েক মিনিট লাগতে পারে)।

কমান্ড শেষে output থেকে এই value গুলো copy করুন:
- `API URL` → e.g. `http://127.0.0.1:54321`
- `anon key`
- `service_role key`

### 3. Migration apply করুন
```bash
supabase db reset
```
এটা শুধু `supabase/migrations/` এর single consolidated migration টা রান করবে — কোনো conflict হবে না।

### 4. `.env` ফাইল আপডেট করুন
Project root এ `.env` ফাইলটি এমন রাখুন:
```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key from step 2>
VITE_SUPABASE_PROJECT_ID=local
```

### 5. App চালু করুন
```bash
bun run dev    # or: npm run dev
```

App চালু হবে: http://localhost:8080

### 6. Supabase Studio (DB GUI)
http://127.0.0.1:54323

## প্রথম Admin User তৈরি
1. App এ `/admin` এ যান → "Create first admin account" বাটনে ক্লিক করুন
2. ইমেইল + পাসওয়ার্ড (৮+ অক্ষর) দিয়ে signup করুন
3. লোকালি `supabase start` এর সাথে email auto-confirm enabled — signup করলেই সরাসরি dashboard এ যাবেন
4. প্রথম signup user স্বয়ংক্রিয়ভাবে admin হয় (`assign_first_admin` trigger via auth.users)
5. Inbucket (local mailbox, OTP ইমেইল দেখতে): http://127.0.0.1:54324

## Edge Functions (optional)
```bash
supabase functions serve
```

## Stop / Reset
- Stop: `supabase stop`
- Full reset: `supabase db reset`
