const VIDEO_MP4 =
  "https://raw.githubusercontent.com/elsa-workflows/elsa-core/codex/elsa-readme-video/design/video/exports/elsa-workflows-readme.mp4";
const VIDEO_GIF =
  "https://raw.githubusercontent.com/elsa-workflows/elsa-core/codex/elsa-readme-video/design/video/exports/elsa-workflows-readme.gif";
const VIDEO_POSTER =
  "https://raw.githubusercontent.com/elsa-workflows/elsa-core/codex/elsa-readme-video/design/video/exports/elsa-workflows-readme-poster.png";

export function HeroVideo() {
  return (
    <div className="hero-screenshot-wrapper">
      <div className="screenshot-frame hero-screenshot-frame rounded-xl p-1.5 md:p-2 transition-all duration-400">
        <video
          className="w-full h-auto rounded-lg block"
          src={VIDEO_MP4}
          poster={VIDEO_POSTER}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label="Elsa Workflows overview"
        >
          {/* Fallback for browsers without video support */}
          <img
            src={VIDEO_GIF}
            alt="Elsa Workflows overview animation showing the visual designer and workflow execution"
            className="w-full h-auto rounded-lg"
          />
        </video>
      </div>
    </div>
  );
}
