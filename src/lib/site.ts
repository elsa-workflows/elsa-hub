export const SITE_URL = "https://www.elsaworkflows.io";
export const SITE_OG_IMAGE = `${SITE_URL}/og-default.png`;
export const SITE_OG_IMAGE_WIDTH = 1200;
export const SITE_OG_IMAGE_HEIGHT = 630;
export const SITE_TWITTER_CARD = "summary_large_image";

export function resolveSocialImage(image?: string | null): string {
  return image || SITE_OG_IMAGE;
}
