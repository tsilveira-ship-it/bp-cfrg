"use client";
import Link from "next/link";
import { useModelStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, GitFork, FolderOpen } from "lucide-react";

export function ScenarioSwitcher() {
  const loaded = useModelStore((s) => s.loaded);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {loaded.kind === "master" && (
        <Badge className="bg-[#D32F2F]">
          <Crown className="h-3 w-3 mr-1" />
          Master v{loaded.version}
        </Badge>
      )}
      {loaded.kind === "fork" && (
        <Badge variant="secondary">
          <GitFork className="h-3 w-3 mr-1" />
          {loaded.name}
        </Badge>
      )}
      {loaded.kind === "none" && (
        <Badge variant="outline">Local (non sauvegardé)</Badge>
      )}
      <Link href="/scenarios">
        <Button variant="outline" size="sm">
          <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
          Scénarios
        </Button>
      </Link>
    </div>
  );
}
