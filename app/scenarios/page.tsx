import { ScenariosManager } from "@/components/scenarios-manager";

export default function ScenariosPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Mes scénarios</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Sauvegarde, charge et compare différents scénarios de business plan.
        </p>
      </header>
      <ScenariosManager />
    </div>
  );
}
