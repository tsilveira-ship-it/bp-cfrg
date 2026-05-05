"use client";
import Image from "next/image";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function LoginInner() {
  const [loading, setLoading] = useState(false);
  const params = useSearchParams();
  const error = params.get("error");
  const next = params.get("next") ?? "/";

  const handleGoogle = async () => {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
  };

  return (
    <Card className="w-full max-w-md border-0 shadow-2xl">
      <CardContent className="p-10 space-y-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="h-20 w-20 bg-[#111111] rounded-lg flex items-center justify-center p-2">
            <Image src="/logo-rg.svg" alt="CFRG" width={64} height={64} />
          </div>
          <div>
            <h1 className="font-heading uppercase text-2xl tracking-wider">BP CFRG</h1>
            <p className="text-sm text-muted-foreground mt-1">Tableau de bord financier</p>
          </div>
        </div>

        {error === "not_authorized" && (
          <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-sm text-amber-800">
            Cet email n&apos;a pas encore accès. Demande à un admin de t&apos;inviter, puis réessaie.
          </div>
        )}
        {error === "auth_failed" && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
            Échec d&apos;authentification Google. Réessayer.
          </div>
        )}
        {error && error !== "not_authorized" && error !== "auth_failed" && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
            Erreur: {error}
          </div>
        )}

        <Button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full h-12 text-base"
          variant="outline"
        >
          <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continuer avec Google
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Connecte-toi pour sauvegarder tes scénarios et y accéder depuis n&apos;importe quel appareil.
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#111111] p-6">
      <Suspense fallback={null}>
        <LoginInner />
      </Suspense>
    </div>
  );
}
