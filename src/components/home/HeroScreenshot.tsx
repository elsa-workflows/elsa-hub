import elsaStudioDesigner from "@/assets/elsa-studio-designer.png";

export function HeroScreenshot() {
  return (
    <div className="hero-screenshot-wrapper">
      <div className="screenshot-frame hero-screenshot-frame rounded-xl p-1.5 md:p-2 transition-all duration-400">
        <img
          src={elsaStudioDesigner}
          alt="Elsa Studio visual workflow designer showing a workflow with connected activities"
          className="w-full h-auto rounded-lg"
          loading="eager"
        />
      </div>
    </div>
  );
}
