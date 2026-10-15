type AcademyStubEnv = {
  DEV?: boolean;
  PROD?: boolean;
  VITE_ACADEMY_STUB?: unknown;
};

/**
 * Stub data is for local development only. Production builds must never
 * load academyStub, even if VITE_ACADEMY_STUB is set.
 */
export function academyStubEnabledFromEnv(env: AcademyStubEnv): boolean {
  return env.DEV === true || (env.PROD !== true && env.VITE_ACADEMY_STUB === "1");
}

export function isAcademyStubEnabled(): boolean {
  return academyStubEnabledFromEnv(import.meta.env);
}
