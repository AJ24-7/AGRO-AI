Environment variables
---------------------

This frontend uses Vite. Environment variables available at runtime must be prefixed with `VITE_`.

Required variables (development):

- `VITE_API_URL`: URL of the backend API (e.g. `http://localhost:8000`).
- `VITE_SUPABASE_URL`: Supabase instance URL (publishable).
- `VITE_SUPABASE_KEY`: Supabase publishable anon key.

Setup

1. Copy `.env.example` to `.env.local`.
2. Fill in real values.
3. Start the frontend dev server: `npm run dev`.
