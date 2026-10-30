/**
 * Academy route constants with no imports, so build-time modules (trainingSeo,
 * which vite.config.ts and the prerender script load) can share them with
 * academy.ts without pulling in the Supabase client.
 */
export const ACADEMY_PATH = "/academy";
export const ACADEMY_SOLO_BUNDLE_ID = "solo-bundle";
export const ACADEMY_SOLO_BUNDLE_HASH = `#${ACADEMY_SOLO_BUNDLE_ID}`;
/**
 * /academy/courses looks like a catalogue URL, but the router would read
 * "courses" as a course slug and show "Course not found". It redirects to the
 * real catalogue at ACADEMY_PATH instead.
 */
export const ACADEMY_COURSES_ALIAS_PATH = `${ACADEMY_PATH}/courses`;
