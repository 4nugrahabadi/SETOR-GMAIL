import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { SetorPanel } from "@/components/SetorPanel";
import { AuthGate } from "@/components/AuthGate";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen pb-12">
      <AppHeader />
      <main className="pt-2">
        <AuthGate>
          <SetorPanel />
        </AuthGate>
      </main>
    </div>
  );
}
