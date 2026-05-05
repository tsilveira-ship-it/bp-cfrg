"use client";
import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Trash2, UserPlus, ShieldCheck, Eye } from "lucide-react";
import { inviteUser, updateRole, revokeAccess, type AccessRow } from "@/app/actions/access";

export function AdminClient({ initial }: { initial: AccessRow[] }) {
  const [rows, setRows] = useState<AccessRow[]>(initial);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "viewer">("viewer");
  const [pending, start] = useTransition();

  const handleInvite = () => {
    start(async () => {
      try {
        const created = await inviteUser(email, role);
        setRows((r) => [...r, created]);
        setEmail("");
        toast.success(`${created.email} invité (${created.role})`);
      } catch (e) {
        const m = e instanceof Error ? e.message : "Erreur";
        toast.error(m);
      }
    });
  };

  const handleRoleChange = (id: string, newRole: "admin" | "viewer") => {
    start(async () => {
      try {
        await updateRole(id, newRole);
        setRows((r) => r.map((x) => (x.id === id ? { ...x, role: newRole } : x)));
        toast.success("Rôle mis à jour");
      } catch {
        toast.error("Erreur");
      }
    });
  };

  const handleRevoke = (id: string, email: string) => {
    if (!confirm(`Révoquer l'accès de ${email} ?`)) return;
    start(async () => {
      try {
        await revokeAccess(id);
        setRows((r) => r.filter((x) => x.id !== id));
        toast.success("Accès révoqué");
      } catch {
        toast.error("Erreur");
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Inviter un utilisateur</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-[1fr,200px,auto] gap-3 items-end">
            <div>
              <Label className="text-xs">Email Google</Label>
              <Input
                type="email"
                placeholder="prenom@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Rôle</Label>
              <select
                className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "viewer")}
              >
                <option value="viewer">Viewer (lecture seule)</option>
                <option value="admin">Admin (gestion accès)</option>
              </select>
            </div>
            <Button onClick={handleInvite} disabled={pending || !email.includes("@")}>
              <UserPlus className="h-4 w-4 mr-2" />
              Inviter
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            L&apos;email doit correspondre exactement à l&apos;adresse Google avec laquelle
            l&apos;utilisateur se connectera.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Accès actuels ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Ajouté le</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.email}</TableCell>
                  <TableCell>
                    {r.role === "admin" ? (
                      <Badge className="bg-[#D32F2F]">
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        Admin
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <Eye className="h-3 w-3 mr-1" />
                        Viewer
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <select
                      className="h-8 rounded-md border bg-transparent px-2 text-xs"
                      value={r.role}
                      onChange={(e) => handleRoleChange(r.id, e.target.value as "admin" | "viewer")}
                      disabled={pending}
                    >
                      <option value="viewer">Viewer</option>
                      <option value="admin">Admin</option>
                    </select>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      onClick={() => handleRevoke(r.id, r.email)}
                      disabled={pending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Aucun utilisateur autorisé.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
