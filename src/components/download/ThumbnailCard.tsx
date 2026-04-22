import { User2 } from "lucide-react";
import type { YoutubePreviewInfo } from "../../../electron/types";
import { formatDuration } from "../../lib/audio/formatDuration";
import { Skeleton } from "../ui/Skeleton";

type ThumbnailCardProps = {
  loading?: boolean;
  error?: string | null;
  info?: YoutubePreviewInfo | null;
};

export function ThumbnailCard({ loading = false, error = null, info = null }: ThumbnailCardProps) {
  if (loading) {
    return (
      <div className="glass flex items-center gap-4 rounded-xl2 p-3">
        <Skeleton className="h-[72px] w-32 shrink-0" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl2 border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
        {error}
      </div>
    );
  }

  if (!info) return null;

  return (
    <div className="glass flex items-center gap-4 rounded-xl2 p-3 animate-fade-in">
      {info.thumbnail ? (
        <img
          src={info.thumbnail}
          alt=""
          draggable={false}
          className="h-[72px] w-32 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="h-[72px] w-32 shrink-0 rounded-lg bg-white/5" />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-sm font-medium text-text-primary">{info.title}</p>
        <div className="flex items-center gap-3 text-xs text-text-secondary">
          {info.uploader ? (
            <span className="flex items-center gap-1">
              <User2 className="h-3 w-3" strokeWidth={1.75} />
              <span className="max-w-[180px] truncate">{info.uploader}</span>
            </span>
          ) : null}
          {info.duration > 0 ? <span className="mono">{formatDuration(info.duration)}</span> : null}
        </div>
      </div>
    </div>
  );
}
