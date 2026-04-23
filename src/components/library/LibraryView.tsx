import { FolderOpen, FolderSearch, Library as LibraryIcon, MoreHorizontal, PlayCircle, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { LibraryEntry } from "../../../electron/types";
import { useAppStore } from "../../store/useAppStore";
import { Skeleton } from "../ui/Skeleton";

export function LibraryView() {
  const [entries, setEntries] = useState<LibraryEntry[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const list = await window.audioSplit.listLibrary();
      setEntries(list);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <section className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <LibraryIcon className="h-6 w-6 text-accent" strokeWidth={1.75} />
            Sua Biblioteca
          </h1>
          
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={refreshing}
          className="flex items-center gap-1.5 rounded-xl2 border border-white/5 px-3 py-2 text-xs text-text-secondary transition-colors hover:border-white/10 hover:text-text-primary disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} strokeWidth={1.75} />
          Atualizar
        </button>
      </header>

      {entries === null ? (
        <LibrarySkeleton />
      ) : entries.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {entries.map((entry) => (
            <LibraryCard key={entry.id} entry={entry} onChanged={refresh} />
          ))}
        </div>
      )}
    </section>
  );
}

function LibrarySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass flex flex-col items-center justify-center gap-3 rounded-xl2 p-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl2 bg-accent-soft text-accent">
        <FolderSearch className="h-6 w-6" strokeWidth={1.5} />
      </div>
      <p className="max-w-sm text-sm text-text-secondary">
        Vazio.
      </p>
    </div>
  );
}

type LibraryCardProps = {
  entry: LibraryEntry;
  onChanged: () => Promise<void>;
};

function LibraryCard({ entry, onChanged }: LibraryCardProps) {
  const setView = useAppStore((s) => s.setView);
  const setStems = useAppStore((s) => s.setStems);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const openInMixer = async () => {
    setBusy(true);
    try {
      const result = await window.audioSplit.loadLibraryEntry(entry.path);
      if (!result.success) return;
      setStems(
        result.stems.map((p) => ({
          path: p,
          name: p.split(/[\\/]/).pop() ?? p
        })),
        entry.path
      );
      setView("download");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await window.audioSplit.removeLibraryEntry(entry.path);
      await onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="glass flex flex-col gap-3 rounded-xl2 p-4 transition-all duration-300 hover:shadow-card hover:ring-1 hover:ring-accent/20">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl2 bg-accent-soft text-accent">
          <PlayCircle className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-text-primary">{entry.name}</h3>
          <p className="mono mt-0.5 text-[11px] text-text-muted">
            {new Date(entry.createdAt).toLocaleString()} · {entry.stems.length} stems
          </p>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Mais opcoes"
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary"
          >
            <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-8 z-10 min-w-[180px] overflow-hidden rounded-xl2 border border-white/5 bg-card shadow-card animate-fade-in">
              <MenuItem
                icon={FolderOpen}
                label="Abrir pasta"
                onClick={() => {
                  void window.audioSplit.openOutputFolder(entry.path);
                  setMenuOpen(false);
                }}
              />
              <MenuItem
                icon={Trash2}
                label="Remover"
                destructive
                onClick={() => {
                  setMenuOpen(false);
                  void remove();
                }}
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void openInMixer()}
          disabled={busy}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl2 bg-accent px-3 py-2 text-xs font-medium text-white transition-all duration-200 hover:scale-[1.02] hover:shadow-glow-sm disabled:opacity-50 disabled:hover:scale-100"
        >
          <PlayCircle className="h-3.5 w-3.5" strokeWidth={2} />
          Abrir no mixer
        </button>
      </div>
    </article>
  );
}

type MenuItemProps = {
  icon: typeof FolderOpen;
  label: string;
  onClick: () => void;
  destructive?: boolean;
};

function MenuItem({ icon: Icon, label, onClick, destructive = false }: MenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
        destructive
          ? "text-red-300 hover:bg-red-500/10"
          : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
      }`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
      {label}
    </button>
  );
}
