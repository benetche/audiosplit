import { useMemo, useRef } from "react";
import { pseudoPeaks, useWaveformPeaks } from "../../hooks/useWaveformPeaks";

type WaveformBarProps = {
  path: string;
  /** Proporcao do playhead (0..1). */
  progress: number;
  disabled?: boolean;
  /** Altura visual em px. */
  height?: number;
  bins?: number;
  onSeekRatio?: (ratio: number) => void;
};

export function WaveformBar({
  path,
  progress,
  disabled = false,
  height = 36,
  bins = 160,
  onSeekRatio
}: WaveformBarProps) {
  const { peaks, loading } = useWaveformPeaks(path, bins);
  const containerRef = useRef<HTMLDivElement>(null);

  const renderPeaks = useMemo<Float32Array>(() => peaks ?? pseudoPeaks(path, bins), [peaks, path, bins]);

  const width = renderPeaks.length * 3; // 2px barra + 1px gap -> scale por viewBox

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeekRatio || disabled) return;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    onSeekRatio(ratio);
  };

  const clampedProgress = Math.max(0, Math.min(1, progress));

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className={`relative w-full select-none overflow-hidden rounded-lg ${
        disabled ? "opacity-40" : onSeekRatio ? "cursor-pointer" : ""
      }`}
      style={{ height }}
      role={onSeekRatio ? "slider" : undefined}
      aria-valuenow={Math.round(clampedProgress * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} 100`}
        preserveAspectRatio="none"
        className={loading ? "opacity-60 transition-opacity duration-500" : "transition-opacity duration-300"}
      >
        <defs>
          <clipPath id={`wf-clip-${hashId(path)}`}>
            <rect x="0" y="0" width={width * clampedProgress} height="100" />
          </clipPath>
        </defs>
        {Array.from(renderPeaks).map((peak, idx) => {
          const h = Math.max(4, peak * 100);
          const y = (100 - h) / 2;
          return (
            <rect
              key={idx}
              x={idx * 3}
              y={y}
              width={2}
              height={h}
              rx={1}
              className="fill-white/15"
            />
          );
        })}
        <g clipPath={`url(#wf-clip-${hashId(path)})`}>
          {Array.from(renderPeaks).map((peak, idx) => {
            const h = Math.max(4, peak * 100);
            const y = (100 - h) / 2;
            return (
              <rect
                key={idx}
                x={idx * 3}
                y={y}
                width={2}
                height={h}
                rx={1}
                className="fill-accent"
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}

function hashId(value: string): string {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 31 + value.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}
