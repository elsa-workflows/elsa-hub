/**
 * Academy route constants with no imports, so build-time modules (trainingSeo,
 * which vite.config.ts and the prerender script load) can share them with
 * academy.ts without pulling in the Supabase client.
 */
export const ACADEMY_PATH = "/academy";
export const ACADEMY_SOLO_BUNDLE_ID = "solo-bundle";
export const ACADEMY_SOLO_BUNDLE_HASH = `#${ACADEMY_SOLO_BUNDLE_ID}`;
