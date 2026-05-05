import { Sidebar } from "@/components/sidebar";
import { ActiveScenarioLoader } from "@/components/active-scenario-loader";
import { AutoSaver } from "@/components/auto-saver";
import { getMyRole } from "@/app/actions/access";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let isAdmin = false;
  try {
    isAdmin = (await getMyRole()) === "admin";
  } catch {
    isAdmin = false;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar isAdmin={isAdmin} />
      <main className="flex-1 overflow-x-auto">
        <div className="mx-auto w-full max-w-[1600px] p-6 lg:p-10">{children}</div>
      </main>
      <ActiveScenarioLoader />
      <AutoSaver />
    </div>
  );
}
