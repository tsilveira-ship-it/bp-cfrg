import { redirect } from "next/navigation";
import { getMyRole, listAccess } from "@/app/actions/access";
import { AdminClient } from "@/components/admin-client";

export default async function AdminPage() {
  const role = await getMyRole();
  if (role !== "admin") redirect("/");

  const access = await listAccess();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Administration</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gérer les accès au tableau de bord. Les utilisateurs invités doivent se connecter
          avec Google avec l&apos;email exact.
        </p>
      </header>
      <AdminClient initial={access} />
    </div>
  );
}
