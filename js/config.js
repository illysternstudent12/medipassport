// Public configuration (safe to commit).
//
// The Supabase URL and *anon* key are public by design: every request is
// limited by Row Level Security in the database. Secret keys (Google
// Translation, DeepL, Anthropic, the Supabase service role) live ONLY in
// Supabase Edge Function secrets, never here.
//
// Leave empty to run fully in demo mode. You can also paste them at runtime
// in Profile → Connected services (stored in this browser only).
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';

// Where share links point when the app runs locally.
export const LIVE_SITE = 'https://illysternstudent12.github.io/medipassport/';
