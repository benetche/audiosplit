import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <main className="min-h-screen bg-surface text-white">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-5 py-8">{children}</div>
    </main>
  );
}
