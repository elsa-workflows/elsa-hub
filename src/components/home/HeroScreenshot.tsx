import elsaStudioDesigner from "@/assets/elsa-studio-designer.png";
import elsaStudioDesignerMobile from "@/assets/elsa-studio-designer-mobile.png";

export function HeroScreenshot() {
  return (
    <div className="hero-screenshot-wrapper">
      <div className="screenshot-frame hero-screenshot-frame rounded-xl p-1.5 md:p-2 transition-all duration-400">
        {/* Mobile: focused screenshot */}
        <img
          src={elsaStudioDesignerMobile}
          alt="Elsa Studio workflow designer"
          className="block md:hidden w-full h-auto rounded-lg"
          loading="eager"
        />
        {/* Desktop: detailed screenshot */}
        <img
          src={elsaStudioDesigner}
          alt="Elsa Studio visual workflow designer showing a workflow with connected activities"
          className="hidden md:block w-full h-auto rounded-lg"
          loading="eager"
        />
      </div>
    </div>
  );
}
