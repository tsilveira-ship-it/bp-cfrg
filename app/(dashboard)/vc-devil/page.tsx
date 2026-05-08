import { redirect } from "next/navigation";
import { getMyRole } from "@/app/actions/access";
import { getCurrentMaster } from "@/app/actions/scenarios";
import { DEFAULT_PARAMS } from "@/lib/model/defaults";
import { normalizeParams } from "@/lib/model/types";
import { VCDevilClient } from "@/components/vc-devil-client";

export default async function VCDevilPage() {
  const role = await getMyRole();
  if (role !== "admin") redirect("/");

  const master = await getCurrentMaster().catch(() => null);
  const params = master ? normalizeParams(master.params) : DEFAULT_PARAMS;
  const meta = master
    ? {
        name: master.name,
        version: master.version,
        publishedAt: master.published_at,
        author: master.author_email,
      }
    : null;

  return <VCDevilClient params={params} masterMeta={meta} />;
}
