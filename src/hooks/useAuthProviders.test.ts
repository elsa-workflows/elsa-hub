import { describe, expect, it } from "vitest";
import { AUTH_PROVIDERS } from "./useAuthProviders";

describe("AUTH_PROVIDERS", () => {
  it("exposes email, GitHub and Google for connected-account settings", () => {
    expect(AUTH_PROVIDERS.map((provider) => provider.id)).toEqual(["email", "github", "google"]);
  });
});
