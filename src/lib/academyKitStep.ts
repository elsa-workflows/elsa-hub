import type { Element, ElementContent, Root, RootContent } from "hast";
import { ACADEMY_SHARED_KIT_PREFIX, type AcademyAsset } from "@/lib/academy";

/** The lab kit among a course's kit assets: the shared kits/* zip, not the offline lesson copies. */
export function academyLabKitAssets(assets: AcademyAsset[]): AcademyAsset[] {
  return assets.filter((asset) => asset.storage_path.startsWith(ACADEMY_SHARED_KIT_PREFIX)).slice(0, 1);
}

/**
 * Lesson text that tells the reader to fetch the lab kit. Matches the prod lesson wording:
 * "from the lab kit download on this course page" (kit-setup, start-here, security-overview)
 * and "Download and unzip the lab kit" / "download and unzip kit" (overview lessons).
 * Matched against rendered text, so markdown emphasis does not get in the way.
 */
export const ACADEMY_KIT_STEP_PATTERN =
  /\blab kit download\b|\bdownload and unzip (?:the )?(?:lab )?kit\b|\bdownload the (?:lab )?kit\b/i;

/** Set on the block the kit step renders after. */
export const ACADEMY_KIT_STEP_PROP = "dataAcademyKitStep";
/** Set on an empty marker at the top of the body when no block can host the step. */
export const ACADEMY_KIT_STEP_TOP_PROP = "dataAcademyKitStepTop";

export function academyLessonMentionsKitDownload(markdown: string | null | undefined): boolean {
  if (!markdown) return false;
  return ACADEMY_KIT_STEP_PATTERN.test(markdown.replace(/[*_`]/g, ""));
}

function textOf(node: Root | RootContent | ElementContent): string {
  if (node.type === "text") return node.value;
  if (node.type === "element" || node.type === "root") return node.children.map(textOf).join("");
  return "";
}

function hasBlockChild(node: Element): boolean {
  return node.children.some(
    (child) => child.type === "element" && (child.tagName === "p" || child.tagName === "li"),
  );
}

function findFirstStepBlock(node: Root | Element): Element | null {
  for (const child of node.children) {
    if (child.type !== "element") continue;
    // Prefer the innermost paragraph or list item, so a loose list item marks its paragraph.
    const nested = findFirstStepBlock(child);
    if (nested) return nested;
    if (
      (child.tagName === "p" || child.tagName === "li") &&
      !hasBlockChild(child) &&
      ACADEMY_KIT_STEP_PATTERN.test(textOf(child))
    ) {
      return child;
    }
  }
  return null;
}

/**
 * Marks the first paragraph or list item that tells the reader to download the kit, so the
 * markdown renderer can put the kit step right after it. When the sentence sits somewhere a
 * block cannot host it (a table cell or a heading), adds a marker at the top of the body.
 * Runs after sanitizing, so its markers are not stripped.
 */
export function rehypeAcademyKitStep() {
  return (tree: Root) => {
    const block = findFirstStepBlock(tree);
    if (block) {
      block.properties = { ...block.properties, [ACADEMY_KIT_STEP_PROP]: "true" };
      return;
    }
    if (ACADEMY_KIT_STEP_PATTERN.test(textOf(tree))) {
      tree.children.unshift({
        type: "element",
        tagName: "div",
        properties: { [ACADEMY_KIT_STEP_TOP_PROP]: "true" },
        children: [],
      });
    }
  };
}
