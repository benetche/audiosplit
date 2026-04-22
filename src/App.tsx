import { DownloadView } from "./components/download/DownloadView";
import { AppShell } from "./components/layout/AppShell";
import { LibraryView } from "./components/library/LibraryView";
import { SettingsView } from "./components/settings/SettingsView";
import { useProgressSubscription } from "./hooks/useProgressSubscription";
import { useAppStore } from "./store/useAppStore";

function App() {
  useProgressSubscription();
  const view = useAppStore((s) => s.view);

  return (
    <AppShell>
      {view === "download" ? <DownloadView /> : null}
      {view === "library" ? <LibraryView /> : null}
      {view === "settings" ? <SettingsView /> : null}
    </AppShell>
  );
}

export default App;
