import { fireEvent, render, screen } from "@testing-library/react";
import type { ToolUIPart } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});

vi.mock("@/lib/runtime-builder/catalog-client", () => ({
  useCatalogQuery: () => ({ data: null }),
}));

import { WeaverToolPart } from "./WeaverToolPart";

type Part = Parameters<typeof WeaverToolPart>[0]["part"];

function renderOutput(output: unknown) {
  const part = {
    type: "tool-navigate",
    toolCallId: "call-1",
    state: "output-available",
    input: {},
    output,
  } as unknown as ToolUIPart;

  return render(<WeaverToolPart part={part as Part} />);
}

describe("WeaverToolPart navigation intents", () => {
  beforeEach(() => navigate.mockClear());

  it.each([
    ["network-path", "//external.example/path"],
    ["backslash network-path", "/\\external.example/path"],
    ["path normalization to network-path", "/section/..//external.example/path"],
    ["encoded dot normalization to network-path", "/section/%2e%2e//external.example/path"],
    ["embedded backslash", "/docs\\external.example"],
    ["control character", "/docs\nnext"],
    ["tab control before authority-like text", "/\t/external.example/path"],
    ["absolute URL", "https://external.example/path"],
  ])("does not expose Open or navigate for %s", (_name, path) => {
    renderOutput({ kind: "navigate", path, label: "Open docs", reason: "Relevant guide" });

    expect(screen.getByText("Open docs")).toBeInTheDocument();
    expect(screen.getByText("Relevant guide")).toBeInTheDocument();
    const open = screen.queryByRole("button", { name: /^open/i });
    if (open) fireEvent.click(open);

    expect(screen.queryByRole("button", { name: /^open/i })).not.toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it.each([
    ["object label", { label: { text: "unsafe" }, reason: "Keep this reason" }],
    ["object reason", { label: "Keep this label", reason: { text: "unsafe" } }],
  ])("fails closed for a malformed %s and keeps valid text", (_name, text) => {
    renderOutput({ kind: "navigate", path: "/docs", ...text });

    const open = screen.queryByRole("button", { name: /^open/i });
    if (open) fireEvent.click(open);

    expect(screen.queryByRole("button", { name: /^open/i })).not.toBeInTheDocument();
    if (typeof text.label === "string") expect(screen.getByText(text.label)).toBeInTheDocument();
    if (typeof text.reason === "string") expect(screen.getByText(text.reason)).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it.each([
    ["missing", undefined],
    ["null", null],
    ["number", 42],
    ["object", { path: "/docs" }],
  ])("does not expose Open for a %s path", (_name, path) => {
    renderOutput({ kind: "navigate", path, label: "Open docs", reason: "Relevant guide" });

    expect(screen.getByText("Open docs")).toBeInTheDocument();
    expect(screen.getByText("Relevant guide")).toBeInTheDocument();
    const open = screen.queryByRole("button", { name: /^open/i });
    if (open) fireEvent.click(open);

    expect(screen.queryByRole("button", { name: /^open/i })).not.toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("navigates only after an explicit click and preserves URL values in query and hash", () => {
    const path = "/docs?returnTo=https://external.example/page#https://fragment.example/section";
    renderOutput({ kind: "navigate", path, label: "Open docs", reason: "Relevant guide" });

    expect(navigate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /^open/i }));
    expect(navigate).toHaveBeenCalledWith(path);
  });

  it.each(["/", "/guide"])("allows explicit navigation to %s", (path) => {
    renderOutput({ kind: "navigate", path, label: "Open page", reason: "Requested page" });

    expect(navigate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /^open/i }));
    expect(navigate).toHaveBeenCalledWith(path);
  });

  it("passes a normalized internal path to navigate", () => {
    renderOutput({ kind: "navigate", path: "/section/../docs", label: "Open docs", reason: "Relevant guide" });

    fireEvent.click(screen.getByRole("button", { name: /^open/i }));
    expect(navigate).toHaveBeenCalledWith("/docs");
  });

  it("keeps Runtime Builder intents on the existing confirmation path", () => {
    renderOutput({ kind: "rb.validate" });

    expect(screen.getByText("Validate current build")).toBeInTheDocument();
    expect(screen.getByText("Review changes before confirming")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });
});
