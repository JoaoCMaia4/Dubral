import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserCircle, Lock, Loader2, Save, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function Profile() {
  const { user, employee, positions = [] } = useOutletContext();

  const [email, setEmail] = useState(user?.email || employee?.email || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setEmail(user?.email || employee?.email || "");
  }, [user?.email, employee?.email]);

  const { data: sectors = [] } = useQuery({
    queryKey: ["sectors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sectors")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    initialData: [],
  });

  const employeePositionIds =
    employee?.position_ids ||
    user?.position_ids ||
    employee?.employee_positions?.map((item) => item.position_id || item.position?.id) ||
    [];

  const userPositions =
    positions?.filter((position) => employeePositionIds?.includes(position.id)) || [];

  const sectorId = employee?.sector_id || user?.sector_id;
  const userSector = sectors.find((sector) => sector.id === sectorId);

  const displayName =
    employee?.full_name ||
    user?.full_name ||
    user?.display_name ||
    "Utilizador";

  const employeeNumber =
    employee?.employee_number ||
    user?.employee_number ||
    "—";

  const handleSaveEmail = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      toast.error("Introduza um email válido.");
      return;
    }

    setSavingEmail(true);

    try {
      const { error: authError } = await supabase.auth.updateUser({
        email: cleanEmail,
      });

      if (authError) throw authError;

      if (employee?.id) {
        const { error: employeeError } = await supabase
          .from("employees")
          .update({ email: cleanEmail })
          .eq("id", employee.id);

        if (employeeError) throw employeeError;
      }

      toast.success("Email atualizado. Pode ser necessário confirmar o novo email.");
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Erro ao atualizar email.");
    } finally {
      setSavingEmail(false);
    }
  };

  const handleSavePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("As palavras-passe não coincidem.");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("A palavra-passe deve ter pelo menos 8 caracteres.");
      return;
    }

    setSavingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success("Palavra-passe alterada com sucesso.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Erro ao alterar palavra-passe.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">O Meu Perfil</h1>
        <p className="text-muted-foreground mt-1">
          Consulte e edite os seus dados de acesso.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <UserCircle className="w-8 h-8 text-primary" />
            </div>

            <div>
              <CardTitle>{displayName}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {user?.email || employee?.email}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground text-xs">
                Nome Completo
              </Label>
              <p className="font-medium mt-1">{displayName}</p>
            </div>

            <div>
              <Label className="text-muted-foreground text-xs">
                Número de Funcionário
              </Label>
              <p className="font-medium mt-1">{employeeNumber}</p>
            </div>

            <div>
              <Label className="text-muted-foreground text-xs">Setor</Label>
              <p className="font-medium mt-1">{userSector?.name || "—"}</p>
            </div>

            <div>
              <Label className="text-muted-foreground text-xs">Cargos</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {userPositions.length > 0 ? (
                  userPositions.map((position) => (
                    <Badge key={position.id} variant="secondary">
                      {position.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            Para alterar nome, setor ou cargo, contacte o administrador.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Endereço de Email</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="email">Novo email</Label>

            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11"
              />

              <Button
                onClick={handleSaveEmail}
                disabled={savingEmail}
                className="h-11 shrink-0"
              >
                {savingEmail ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-1" />
                )}
                Guardar
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              O Supabase pode pedir confirmação por email antes da alteração ficar ativa.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Alterar Palavra-passe
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Nova palavra-passe</Label>

            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="h-11 pr-10"
              />

              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showNew ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Confirmar nova palavra-passe</Label>

            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repita a palavra-passe"
                className="h-11 pr-10"
              />

              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showConfirm ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <Button
            onClick={handleSavePassword}
            disabled={savingPassword || !newPassword}
            className="w-full h-11"
          >
            {savingPassword ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Lock className="w-4 h-4 mr-2" />
            )}
            Alterar Palavra-passe
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}