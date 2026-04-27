import { Link2, X } from "lucide-react";
import { useI18n } from "../../i18n/I18nProvider";
import { useYoutubePreview } from "../../hooks/useYoutubePreview";
import { ThumbnailCard } from "./ThumbnailCard";

type UrlHeroProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function UrlHero({ value, onChange, disabled = false }: UrlHeroProps) {
  const { t } = useI18n();
  const preview = useYoutubePreview(value);
  const hasValue = value.length > 0;

  return (
    <div className="flex flex-col gap-3">
      <div
        className={`glass group relative flex items-center gap-3 rounded-xl2 px-4 py-3 transition-all duration-300 focus-within:ring-2 focus-within:ring-accent/40 ${
          preview.info ? "shadow-glow-sm" : ""
        }`}
      >
        <Link2 className="h-4 w-4 shrink-0 text-text-secondary" strokeWidth={1.75} />
        <input
          type="url"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("download.urlPlaceholder")}
          className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted outline-none disabled:opacity-50"
        />
        {hasValue ? (
          <button
            type="button"
            onClick={() => onChange("")}
            disabled={disabled}
            aria-label={t("download.clear")}
            className="flex h-6 w-6 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        ) : null}
      </div>

      {hasValue ? (
        <ThumbnailCard loading={preview.loading} error={preview.error} info={preview.info} />
      ) : null}
    </div>
  );
}
