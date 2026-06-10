import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Positions() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    permissions: [],
  });

  const { data: positionsList = [], isLoading } = useQuery({
    queryKey: ["positions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("positions")
        .select(`
          *,
          position_permissions(
            permission:permissions(*)
          )
        `)
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const { data: permissionsList = [] } = useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permissions")
        .select("*")
        .order("label", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const { data: position, error } = await supabase
        .from("positions")
        .insert({
          name: data.name.trim(),
          description: data.description?.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      if (data.permissions?.length > 0) {
        const rows = data.permissions.map((permissionId) => ({
          position_id: position.id,
          permission_id: permissionId,
        }));

        const { error: permError } = await supabase
          .from("position_permissions")
          .insert(rows);

        if (permError) throw permError;
      }

      return position;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      setDialogOpen(false);
      setForm({ name: "", description: "", permissions: [] });
      toast.success("Cargo criado com sucesso.");
    },
    onError: (err) => {
      console.error(err);
      toast.error(err.message || "Erro ao criar cargo.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const { error } = await supabase
        .from("positions")
        .update({
          name: data.name.trim(),
          description: data.description?.trim() || null,
        })
        .eq("id", id);

      if (error) throw error;

      const { error: deleteError } = await supabase
        .from("position_permissions")
        .delete()
        .eq("position_id", id);

      if (deleteError) throw deleteError;

      if (data.permissions?.length > 0) {
        const rows = data.permissions.map((permissionId) => ({
          position_id: id,
          permission_id: permissionId,
        }));

        const { error: insertError } = await supabase
          .from("position_permissions")
          .insert(rows);

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      setDialogOpen(false);
      setEditing(null);
      setForm({ name: "", description: "", permissions: [] });
      toast.success("Cargo atualizado.");
    },
    onError: (err) => {
      console.error(err);
      toast.error(err.message || "Erro ao atualizar cargo.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error: permissionsError } = await supabase
        .from("position_permissions")
        .delete()
        .eq("position_id", id);

      if (permissionsError) throw permissionsError;

      const { error } = await supabase
        .from("positions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      toast.success("Cargo eliminado.");
    },
    onError: (err) => {
      console.error(err);
      toast.error("Não foi possível eliminar o cargo. Verifica se existem funcionários ligados a ele.");
    },
  });

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", description: "", permissions: [] });
    setDialogOpen(true);
  };

  const openEdit = (position) => {
    const selectedPermissions =
      position.position_permissions
        ?.map((pp) => pp.permission?.id)
        .filter(Boolean) || [];

    setEditing(position);
    setForm({
      name: position.name || "",
      description: position.description || "",
      permissions: selectedPermissions,
    });
    setDialogOpen(true);
  };

  const togglePerm = (permissionId) => {
    const current = form.permissions || [];

    setForm({
      ...form,
      permissions: current.includes(permissionId)
        ? current.filter((id) => id !== permissionId)
        : [...current, permissionId],
    });
  };

  const handleSave = () => {
    if (!form.name?.trim()) {
      toast.error("O nome do cargo é obrigatório.");
      return;
    }

    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cargos e Permissões</h1>
          <p className="text-muted-foreground mt-1">Gerir cargos e as suas permissões.</p>
        </div>

        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Cargo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-12">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : positionsList.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="text-center py-12 text-muted-foreground">
              <Shield className="w-10 h-10 mx-auto mb-2" />
              Nenhum cargo criado ainda.
            </CardContent>
          </Card>
        ) : (
          positionsList.map((position) => {
            const positionPermissions =
              position.position_permissions
                ?.map((pp) => pp.permission)
                .filter(Boolean) || [];

            return (
              <Card key={position.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-primary" />
                      </div>

                      <div>
                        <CardTitle className="text-base">{position.name}</CardTitle>
                        {position.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {position.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(position)}>
                        <Pencil className="w-4 h-4" />
                      </Button>

                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(position.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {positionPermissions.map((permission) => (
                      <Badge key={permission.id} variant="secondary" className="text-xs">
                        {permission.label || permission.key}
                      </Badge>
                    ))}

                    {positionPermissions.length === 0 && (
                      <span className="text-xs text-muted-foreground">Sem permissões</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Cargo" : "Novo Cargo"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Chefia"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descrição opcional..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Permissões</Label>

              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                {permissionsList.map((permission) => (
                  <label key={permission.id} className="flex items-center gap-3 py-1 cursor-pointer">
                    <Checkbox
                      checked={form.permissions?.includes(permission.id)}
                      onCheckedChange={() => togglePerm(permission.id)}
                    />
                    <span className="text-sm">{permission.label || permission.key}</span>
                  </label>
                ))}

                {permissionsList.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma permissão encontrada.
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>

            <Button
              onClick={handleSave}
              disabled={!form.name || createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {editing ? "Guardar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}