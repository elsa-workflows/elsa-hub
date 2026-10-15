import elsaStudioDesigner from "@/assets/elsa-studio-designer.webp";
import elsaStudioDesignerMobile from "@/assets/elsa-studio-designer-mobile.webp";

export function HeroScreenshot() {
  return (
    <div className="hero-screenshot-wrapper">
      <figure className="screenshot-frame hero-screenshot-frame rounded-xl p-1.5 md:p-2 transition-all duration-400">
        {/* Mobile: focused screenshot */}
        <img
          src={elsaStudioDesignerMobile}
          alt="The new React-based Elsa Studio designer (preview)"
          className="block md:hidden w-full h-auto rounded-lg"
          width={960}
          height={675}
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
        {/* Desktop: detailed screenshot */}
        <img
          src={elsaStudioDesigner}
          alt="The new React-based Elsa Studio designer (preview)"
          className="hidden md:block w-full h-auto rounded-lg"
          width={1920}
          height={1080}
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
        <figcaption className="px-3 pt-2.5 pb-1 text-sm text-muted-foreground">
          Preview, coming in Elsa 3.11
        </figcaption>
      </figure>
    </div>
  );
}
