import { ExternalLink, X, MapPin, Briefcase, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ElsaUsageLocation } from "@/data/elsaUsageLocations";

interface LocationCardProps {
  location: ElsaUsageLocation | null;
  onClose: () => void;
}

export function LocationCard({ location, onClose }: LocationCardProps) {
  return (
    <AnimatePresence>
      {location && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="absolute bottom-4 left-4 z-30 w-[min(360px,calc(100%-2rem))] rounded-xl border border-fuchsia-400/30 bg-[rgba(2,6,23,0.92)] p-5 shadow-[0_0_40px_-10px_rgba(240,171,252,0.4)] backdrop-blur-md"
        >
          <button
            onClick={onClose}
            className="absolute right-3 top-3 rounded-md p-1 text-cyan-200/60 transition-colors hover:bg-white/5 hover:text-cyan-200"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          {location.anonymous ? (
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300/70">
                Anonymous deployment
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm text-cyan-50">
                <MapPin className="h-3.5 w-3.5 text-cyan-300/70" />
                {location.city ? `${location.city}, ` : ""}
                {location.country}
              </div>
              <p className="mt-3 text-[12.5px] leading-relaxed text-cyan-100/60">
                Approximate location. No identifying data is exposed for anonymous deployments.
              </p>
            </div>
          ) : (
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-fuchsia-300/80">
                Showcase deployment
              </div>
              <div className="mt-2 flex items-center gap-3">
                {location.companyLogoUrl ? (
                  <img
                    src={location.companyLogoUrl}
                    alt=""
                    className="h-10 w-10 rounded-md border border-fuchsia-400/30 object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-fuchsia-400/30 bg-fuchsia-400/10 font-mono text-sm font-semibold text-fuchsia-200">
                    {location.companyName?.[0] ?? "?"}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold text-cyan-50">
                    {location.companyName}
                  </div>
                  <div className="flex items-center gap-1 text-[12px] text-cyan-200/60">
                    <MapPin className="h-3 w-3" />
                    {location.city ? `${location.city}, ` : ""}
                    {location.country}
                  </div>
                </div>
              </div>

              {location.description && (
                <p className="mt-3 text-[13px] leading-relaxed text-cyan-100/80">
                  {location.description}
                </p>
              )}

              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/5 pt-3 text-[11.5px]">
                {location.industry && (
                  <div className="flex items-center gap-1.5 text-cyan-200/70">
                    <Briefcase className="h-3 w-3" />
                    {location.industry}
                  </div>
                )}
                {location.usingSince && (
                  <div className="flex items-center gap-1.5 text-cyan-200/70">
                    <Calendar className="h-3 w-3" />
                    Since {location.usingSince}
                  </div>
                )}
              </div>

              {location.websiteUrl && (
                <a
                  href={location.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-fuchsia-300 transition-colors hover:text-fuchsia-200"
                >
                  Visit website
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
