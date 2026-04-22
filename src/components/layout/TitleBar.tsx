import { Copy, Minus, Square, X } from "lucide-react";
import { useEffect, useState } from "react";

export function TitleBar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    void window.audioSplit.windowControls.isMaximized().then(setMaximized);
    unsubscribe = window.audioSplit.windowControls.onMaximizeChange(setMaximized);
    return () => unsubscribe?.();
  }, []);

  return (
    <header className="drag-region flex h-9 shrink-0 items-center justify-between border-b border-white/5 bg-background/80 px-3 backdrop-blur-md">
      <div className="flex items-center gap-2 text-xs font-medium text-text-secondary">
        <div className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-accent to-accent-hover shadow-glow-sm">
          <span className="text-[10px] font-bold text-white">A</span>
        </div>
        <span className="tracking-wide">AudioSplit</span>
      </div>

      <div className="no-drag flex items-center gap-0.5">
        <WindowButton
          label="Minimizar"
          onClick={() => void window.audioSplit.windowControls.minimize()}
        >
          <Minus className="h-3.5 w-3.5" strokeWidth={1.75} />
        </WindowButton>
        <WindowButton
          label={maximized ? "Restaurar" : "Maximizar"}
          onClick={() => void window.audioSplit.windowControls.toggleMaximize()}
        >
          {maximized ? (
            <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
          ) : (
            <Square className="h-3 w-3" strokeWidth={1.75} />
          )}
        </WindowButton>
        <WindowButton
          label="Fechar"
          onClick={() => void window.audioSplit.windowControls.close()}
          variant="close"
        >
          <X className="h-4 w-4" strokeWidth={1.75} />
        </WindowButton>
      </div>
    </header>
  );
}

type WindowButtonProps = {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "close";
};

function WindowButton({ label, children, onClick, variant = "default" }: WindowButtonProps) {
  const base =
    "flex h-7 w-10 items-center justify-center rounded-md text-text-secondary transition-colors duration-150";
  const variantClass =
    variant === "close"
      ? "hover:bg-red-500/80 hover:text-white"
      : "hover:bg-white/10 hover:text-text-primary";
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className={`${base} ${variantClass}`}>
      {children}
    </button>
  );
}
