type AcademyStubEnv = {
  DEV?: boolean;
  VITE_ACADEMY_STUB?: unknown;
};

/**
 * Stub data is for local development only. A production Hub deploy can land
 * before the #37 migrations are applied by hand, so the public site must
 * never show fake courses or Buy buttons.
 */
export function academyStubEnabledFromEnv(env: AcademyStubEnv): boolean {
  return env.DEV === true || env.VITE_ACADEMY_STUB === "1";
}

export function isAcademyStubEnabled(): boolean {
  return academyStubEnabledFromEnv(import.meta.env);
}
