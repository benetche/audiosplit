import { lazy, Suspense } from "react";
import { DownloadView } from "./components/download/DownloadView";
import { AppShell } from "./components/layout/AppShell";
import { useProgressSubscription } from "./hooks/useProgressSubscription";
import { useAppStore } from "./store/useAppStore";

const LibraryView = lazy(() => import("./components/library/LibraryView").then((module) => ({ default: module.LibraryView })));
const SettingsView = lazy(() =>
  import("./components/settings/SettingsView").then((module) => ({ default: module.SettingsView }))
);

function App() {
  useProgressSubscription();
  const view = useAppStore((s) => s.view);

  return (
    <AppShell>
      {view === "download" ? <DownloadView /> : null}
      {view === "library" ? (
        <Suspense fallback={<ViewLoading />}>
          <LibraryView />
        </Suspense>
      ) : null}
      {view === "settings" ? (
        <Suspense fallback={<ViewLoading />}>
          <SettingsView />
        </Suspense>
      ) : null}
    </AppShell>
  );
}

function ViewLoading() {
  return <div className="glass rounded-xl2 p-6 text-sm text-text-secondary">Carregando...</div>;
}

export default App;
