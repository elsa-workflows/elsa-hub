import { describe, expect, it } from "vitest";
import { getRuntimeQuickstart } from "./runtimeQuickstart";

describe("Runtime local evaluation commands", () => {
  it("defaults to a public combined image, loopback binding and a generated signing key", () => {
    const result = getRuntimeQuickstart("combined", "run");
    expect(result.code).toContain("ghcr.io/valence-works/runtime-ce-combined:latest");
    expect(result.code).toContain("-p 127.0.0.1:8080:8080");
    expect(result.code).toContain('$(openssl rand -base64 32)');
    expect(result.code).not.toContain("replace-with");
    expect(result.accessUrl).toBe("http://localhost:8080");
  });
  it("connects separate Studio through a browser-visible API URL and matching CORS", () => {
    const result = getRuntimeQuickstart("studio", "run");
    expect(result.code).toContain("docker network create elsa");
    expect(result.code).toContain("Studio__Client__Backend__Url=http://localhost:8080/elsa/api");
    expect(result.code).toContain("Elsa__Cors__AllowedOrigins__0=http://localhost:8081");
    expect(result.accessUrl).toBe("http://localhost:8081");
  });
  it("requires a signing key for Compose without a missing configuration mount", () => {
    const result = getRuntimeQuickstart("combined", "compose");
    expect(result.code).toContain("${ELSA_SIGNING_KEY:?Set ELSA_SIGNING_KEY before starting}");
    expect(result.code).not.toContain("./config");
    expect(result.startCommand).toContain('export ELSA_SIGNING_KEY="$(openssl rand -base64 32)"');
  });
  it("keeps server-only evaluation independent of Studio", () => {
    const result = getRuntimeQuickstart("server", "run");
    expect(result.code).toContain("runtime-ce-server:latest");
    expect(result.code).not.toContain("runtime-ce-studio");
    expect(result.code).not.toContain("--network");
    expect(result.accessUrl).toBe("http://localhost:8080/health");
  });
});