# Security rules (non-negotiable)

1. **Never** expose the Supabase service-role / secret key — not in code, `.env`, `.env.example`, CI variables used by the frontend build, logs, or docs.
2. Only browser-safe config uses the `VITE_` prefix. Anything with `VITE_` ends up in the public bundle.
3. **Never** disable RLS or add permissive policies as a shortcut. If a query fails because of RLS, fix the query or the policy correctly.
4. **Never** add public sign-up: no sign-up page, button, link, or `supabase.auth.signUp` call. "Allow new users to sign up" stays off in the Supabase dashboard.
5. The `audio` Storage bucket is **private**. Access only via authenticated download or short-lived signed URLs. Path prefix must equal the user id.
6. Never commit `.env` or real credentials. `.env.example` contains placeholders only.
7. Do not log tokens, session objects, or personal card content to the console in production builds.
8. On logout, clear the local Dexie database and in-memory caches.
9. Validate and length-limit user input on the client (UX) **and** via DB constraints (truth).
10. Render user text as text (React escaping). No `dangerouslySetInnerHTML`.
11. Keep dependencies minimal and from reputable sources; review `npm audit` output when adding packages.
