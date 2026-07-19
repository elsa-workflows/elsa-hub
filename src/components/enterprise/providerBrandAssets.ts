import valenceLogo from "@/assets/providers/valence-works-logo.svg";
import valenceLogoDark from "@/assets/providers/valence-works-logo-dark.svg";
import valenceMark from "@/assets/providers/valence-works-mark.svg";

export interface ProviderBrandAsset {
  logoLight: string;
  logoDark: string;
  mark: string;
  /** Optional Tailwind gradient class stops for the brand canvas backdrop. */
  accentFrom?: string;
  accentTo?: string;
}

export const providerBrandAssets: Record<string, ProviderBrandAsset> = {
  "valence-works": {
    logoLight: valenceLogo,
    logoDark: valenceLogoDark,
    mark: valenceMark,
    accentFrom: "from-[#E9560C]/15",
    accentTo: "to-transparent",
  },
};
