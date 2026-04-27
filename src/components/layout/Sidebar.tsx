import { Library, type LucideIcon, Settings, SlidersHorizontal } from "lucide-react";
import { useI18n } from "../../i18n/I18nProvider";
import { useAppStore } from "../../store/useAppStore";
import type { AppView } from "../../store/useAppStore";

type NavItem = {
  id: AppView;
  labelKey: "nav.mixer" | "nav.library" | "nav.settings";
  icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  { id: "download", labelKey: "nav.mixer", icon: SlidersHorizontal },
  { id: "library", labelKey: "nav.library", icon: Library },
  { id: "settings", labelKey: "nav.settings", icon: Settings }
];

export function Sidebar() {
  const { t } = useI18n();
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);

  return (
    <aside className="glass flex w-16 shrink-0 flex-col items-center gap-1 py-4">
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl2 bg-gradient-to-br from-accent to-accent-hover shadow-glow-sm">
        <span className="text-sm font-bold text-white">A</span>
      </div>
      <nav className="flex flex-1 flex-col items-center gap-1">
        {NAV_ITEMS.map((item) => (
          <NavButton
            key={item.id}
            icon={item.icon}
            label={t(item.labelKey)}
            active={view === item.id}
            onClick={() => setView(item.id)}
          />
        ))}
      </nav>
      <span className="mono text-[10px] text-text-muted">v0.1</span>
    </aside>
  );
}

type NavButtonProps = {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
};

function NavButton({ icon: Icon, label, active, onClick }: NavButtonProps) {
  return (
    <div className="group relative flex items-center">
      <span
        className={`absolute left-0 h-6 w-0.5 rounded-r-full bg-accent transition-all duration-200 ${
          active ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden
      />
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={`flex h-10 w-10 items-center justify-center rounded-xl2 transition-all duration-200 ${
          active
            ? "bg-accent-soft text-accent shadow-glow-sm"
            : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
        }`}
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </button>
      <span className="pointer-events-none absolute left-14 z-10 whitespace-nowrap rounded-md border border-white/5 bg-card px-2 py-1 text-xs text-text-primary opacity-0 shadow-card transition-opacity duration-200 group-hover:opacity-100">
        {label}
      </span>
    </div>
  );
}
