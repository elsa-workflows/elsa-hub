import { memo } from "react";

const Nebulae = memo(function Nebulae() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Nebula 1: Purple-magenta, drifts right */}
      <div
        className="absolute w-[900px] h-[900px] rounded-full opacity-[0.15] blur-[100px] animate-nebula-drift-1"
        style={{
          background: "radial-gradient(circle, hsl(280 70% 50%) 0%, hsl(320 80% 45%) 50%, transparent 70%)",
          top: "-15%",
          left: "-10%",
        }}
      />
      
      {/* Nebula 2: Rose-pink, drifts left */}
      <div
        className="absolute w-[700px] h-[700px] rounded-full opacity-[0.12] blur-[80px] animate-nebula-drift-2"
        style={{
          background: "radial-gradient(circle, hsl(340 90% 60%) 0%, hsl(335 85% 50%) 40%, transparent 70%)",
          top: "25%",
          right: "-5%",
        }}
      />
      
      {/* Nebula 3: Deep blue-violet, vertical drift */}
      <div
        className="absolute w-[800px] h-[800px] rounded-full opacity-[0.10] blur-[110px] animate-nebula-drift-3"
        style={{
          background: "radial-gradient(circle, hsl(260 60% 45%) 0%, hsl(280 70% 40%) 50%, transparent 70%)",
          bottom: "-10%",
          left: "25%",
        }}
      />
    </div>
  );
});

export default Nebulae;
