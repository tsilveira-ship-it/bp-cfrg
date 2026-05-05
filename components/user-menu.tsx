"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { LogIn, LogOut, User as UserIcon } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import type { User } from "@supabase/supabase-js";

export function UserMenu() {
  const [user, setUser] = useState<User | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!user) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
      >
        <LogIn className="h-4 w-4" />
        Connexion
      </Link>
    );
  }

  const name = (user.user_metadata?.full_name as string) ?? user.email ?? "";
  const avatar = user.user_metadata?.avatar_url as string | undefined;

  return (
    <div className="space-y-2 px-2">
      <div className="flex items-center gap-2 px-1">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt={name} className="h-8 w-8 rounded-full" />
        ) : (
          <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center">
            <UserIcon className="h-4 w-4" />
          </div>
        )}
        <div className="text-xs flex-1 min-w-0">
          <div className="font-medium truncate">{name}</div>
          <div className="text-sidebar-foreground/50 truncate">{user.email}</div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-xs h-8 hover:bg-sidebar-accent text-sidebar-foreground/80"
        disabled={pending}
        onClick={() => start(() => signOut())}
      >
        <LogOut className="h-3.5 w-3.5 mr-2" />
        Déconnexion
      </Button>
    </div>
  );
}
