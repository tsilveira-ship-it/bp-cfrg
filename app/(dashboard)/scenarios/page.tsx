import { ScenariosManager } from "@/components/scenarios-manager";
import { getMyRole } from "@/app/actions/access";

export default async function ScenariosPage() {
  const role = await getMyRole();
  const isAdmin = role === "admin";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Scénarios</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Versions Master partagées + tes forks personnels.
        </p>
      </header>
      <ScenariosManager isAdmin={isAdmin} />
    </div>
  );
}
