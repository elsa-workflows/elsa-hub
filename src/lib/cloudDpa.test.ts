import { describe, expect, it } from "vitest";
import {
  CLOUD_DPA_ANNEXES,
  CLOUD_DPA_INTRO,
  CLOUD_DPA_PATH,
  CLOUD_DPA_SECTIONS,
  CLOUD_DPA_VERSION,
  CLOUD_SUBPROCESSORS_PART_A,
  CLOUD_SUBPROCESSORS_PART_B,
  CLOUD_SUBPROCESSORS_PATH,
  CLOUD_SUBPROCESSORS_TRANSITIONAL_NOTE,
} from "./cloudDpa";

const allText = [
  CLOUD_DPA_VERSION,
  CLOUD_DPA_INTRO,
  ...[...CLOUD_DPA_SECTIONS, ...CLOUD_DPA_ANNEXES].flatMap((s) => [s.title, s.body]),
].join("\n");

describe("cloudDpa", () => {
  it("lives under /legal", () => {
    expect(CLOUD_DPA_PATH).toBe("/legal/dpa");
    expect(CLOUD_SUBPROCESSORS_PATH).toBe("/legal/subprocessors");
  });

  it("has sections 1 to 15 and Annexes I to III in order", () => {
    expect(CLOUD_DPA_SECTIONS.map((s) => s.id)).toEqual(
      Array.from({ length: 15 }, (_, i) => `section-${i + 1}`),
    );
    expect(CLOUD_DPA_ANNEXES.map((a) => a.id)).toEqual(["annex-i", "annex-ii", "annex-iii"]);
  });

  it("contains no drafting, internal or counsel markers", () => {
    expect(allText).not.toMatch(/DRAFT|NOT FOR PUBLICATION|INTERNAL NOTE|COUNSEL CHECK|End of draft|\[[A-Z ]{4,}/);
  });

  it("names the processor like the Cloud and Academy terms, with KvK and VAT", () => {
    expect(CLOUD_DPA_INTRO).toMatch(/Skywalker Digital BV, trading as Valence Works/);
    expect(CLOUD_DPA_INTRO).toMatch(/KvK\) 88244520/);
    expect(CLOUD_DPA_INTRO).toMatch(/VAT NL864551484B01/);
    expect(allText).not.toMatch(/B\.V\./);
  });

  it("points to the Hub Cloud terms and sub-processor page", () => {
    expect(allText).toMatch(/https:\/\/www\.elsaworkflows\.io\/legal\/cloud-terms/);
    expect(allText).toMatch(/https:\/\/www\.elsaworkflows\.io\/legal\/subprocessors/);
  });

  it("describes Azure sign-in in Annex II section 9 without claiming no agent holds credentials", () => {
    const annex = CLOUD_DPA_ANNEXES.find((a) => a.id === "annex-ii");
    expect(annex?.body).toMatch(/short-lived federated identities, not stored passwords or keys/);
    expect(annex?.body).not.toMatch(/No agent holds Azure sign-in credentials/);
  });

  it("states the approved Annex II section 9 access wording", () => {
    const annex = CLOUD_DPA_ANNEXES.find((a) => a.id === "annex-ii");
    expect(annex?.body).toMatch(
      /Our AI agents have no standing access to customer environments\. Changes they prepare reach production only through our deployment pipeline, after a named person approves the release\./,
    );
    expect(annex?.body).not.toMatch(/no standing credentials, roles or network paths/);
  });

  it("keeps the independent-controller position and says the DPA covers Hosted workflow data", () => {
    expect(CLOUD_SUBPROCESSORS_PART_B).toMatch(/for which we act as an independent controller/);
    expect(CLOUD_SUBPROCESSORS_PART_B).toMatch(
      /The workflow data in your Hosted environment is Customer Personal Data, which this DPA covers \(Part A\)\./,
    );
  });

  it("builds Annex III from the same text as the sub-processor page", () => {
    const annex = CLOUD_DPA_ANNEXES.find((a) => a.id === "annex-iii");
    expect(annex?.body).toBe(
      [CLOUD_SUBPROCESSORS_PART_A, CLOUD_SUBPROCESSORS_PART_B, CLOUD_SUBPROCESSORS_TRANSITIONAL_NOTE].join("\n\n"),
    );
    expect(CLOUD_SUBPROCESSORS_PART_A).toMatch(/Microsoft Ireland Operations Limited/);
    expect(CLOUD_SUBPROCESSORS_PART_B).toMatch(/Supabase, Inc\./);
  });
});
