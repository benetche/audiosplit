import { YouTubeDownloadPanel } from "./components/download/YouTubeDownloadPanel";
import { AppHeader } from "./components/layout/AppHeader";
import { AppShell } from "./components/layout/AppShell";
import { LogsPanel } from "./components/logs/LogsPanel";
import { MixerSection } from "./components/mixer/MixerSection";
import { SeparationPanel } from "./components/separation/SeparationPanel";
import { SeparationProgress } from "./components/separation/SeparationProgress";
import { useProgressSubscription } from "./hooks/useProgressSubscription";

function App() {
  useProgressSubscription();

  return (
    <AppShell>
      <AppHeader />
      <YouTubeDownloadPanel />
      <SeparationPanel />
      <SeparationProgress />
      <MixerSection />
      <LogsPanel />
    </AppShell>
  );
}

export default App;
