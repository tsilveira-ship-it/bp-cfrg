import { redirect } from "next/navigation";
import { getScenarioById } from "@/app/actions/scenarios";
import { CompareView } from "@/components/compare-view";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const sp = await searchParams;
  if (!sp.a || !sp.b) redirect("/scenarios");

  const [a, b] = await Promise.all([getScenarioById(sp.a), getScenarioById(sp.b)]);
  if (!a || !b) redirect("/scenarios");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Comparaison</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {a.name} vs {b.name}
        </p>
      </header>
      <CompareView a={a} b={b} />
    </div>
  );
}
