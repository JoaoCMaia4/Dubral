import React, { useState } from "react";
import { useOutletContext, Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Plus, MoreVertical, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Employees() {
  const { user, hasPermission } = useOutletContext();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterSector, setFilterSector] = useState("all");
  const [filterPosition, setFilterPosition] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [form, setForm] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  const canManage =
    user &&
    (user.role === "admin" ||
      hasPermission?.("total") ||
      hasPermission?.("manage_employees"));

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select(`
          *,
          sector:sectors(*),
          employee_positions(
            position:positions(*)
          )
        `)
        .order("employee_number", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

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
  });

  const { data: positions = [] } = useQuery({
    queryKey: ["positions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("positions")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

const createMutation = useMutation({
  mutationFn: async (data) => {
    const employeeNumber = data.employee_number
      ? Number(data.employee_number)
      : null;

    const cleanEmail = data.email.trim().toLowerCase();

    const { data: employee, error } = await supabase
      .from("employees")
      .insert({
        employee_number: employeeNumber,
        full_name: data.full_name.trim(),
        email: cleanEmail,
        sector_id: data.sector_id || null,
        role: data.role || "user",
      })
      .select()
      .single();

    if (error) throw error;

    if (data.position_ids?.length > 0) {
      const rows = data.position_ids.map((positionId) => ({
        employee_id: employee.id,
        position_id: positionId,
      }));

      const { error: positionsError } = await supabase
        .from("employee_positions")
        .insert(rows);

      if (positionsError) throw positionsError;
    }

    const { data: inviteData, error: inviteError } =
      await supabase.functions.invoke("invite-employee", {
        body: {
          email: cleanEmail,
          employee_id: employee.id,
          full_name: data.full_name.trim(),
          redirect_to: `${window.location.origin}/reset-password`,
        },
      });

    if (inviteError) {
  console.error("Erro ao enviar convite:", inviteError);

  throw new Error(
    inviteError.message ||
      "Funcionário criado, mas houve erro ao enviar o email de convite."
  );
}

if (inviteData?.error) {
  console.error("Erro da função invite-employee:", inviteData.error);

  const errorMessage = String(inviteData.error).toLowerCase();

  if (
    errorMessage.includes("already been registered") ||
    errorMessage.includes("already registered") ||
    errorMessage.includes("already exists")
  ) {
    throw new Error(
      "Este email já tem uma conta criada. Apague o utilizador em Authentication > Users ou use outro email."
    );
  }

  if (errorMessage.includes("rate limit")) {
    throw new Error(
      "Limite de envio de emails atingido. Aguarde alguns minutos e tente novamente."
    );
  }

  throw new Error(
    inviteData.error ||
      "Funcionário criado, mas houve erro ao enviar o email de convite."
  );
}

    return employee;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["employees"] });
    setDialogOpen(false);
    setForm({});
    toast.success("Funcionário criado e convite enviado por email.");
  },
  onError: (err) => {
    console.error(err);
    toast.error(err.message || "Erro ao criar funcionário.");
  },
});

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const employeeNumber = data.employee_number
        ? Number(data.employee_number)
        : null;

      const { error } = await supabase
        .from("employees")
        .update({
          employee_number: employeeNumber,
          full_name: data.full_name.trim(),
          email: data.email.trim().toLowerCase(),
          sector_id: data.sector_id || null,
          role: data.role || "user",
        })
        .eq("id", id);

      if (error) throw error;

      const { error: deletePositionsError } = await supabase
        .from("employee_positions")
        .delete()
        .eq("employee_id", id);

      if (deletePositionsError) throw deletePositionsError;

      if (data.position_ids?.length > 0) {
        const rows = data.position_ids.map((positionId) => ({
          employee_id: id,
          position_id: positionId,
        }));

        const { error: insertPositionsError } = await supabase
          .from("employee_positions")
          .insert(rows);

        if (insertPositionsError) throw insertPositionsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setDialogOpen(false);
      setEditingEmployee(null);
      setForm({});
      toast.success("Funcionário atualizado.");
    },
    onError: (err) => {
      console.error(err);
      toast.error(err.message || "Erro ao atualizar funcionário.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from("employees")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setDeleteTarget(null);
      toast.success("Funcionário apagado.");
    },
    onError: (err) => {
      console.error(err);
      toast.error(err.message || "Não foi possível apagar o funcionário.");
    },
  });

  const openNew = () => {
    setEditingEmployee(null);
    setForm({
      full_name: "",
      email: "",
      role: "user",
      employee_number: "",
      sector_id: "",
      position_ids: [],
    });
    setDialogOpen(true);
  };

  const openEdit = (emp) => {
    setEditingEmployee(emp);

    setForm({
      full_name: emp.full_name || "",
      email: emp.email || "",
      employee_number: emp.employee_number || "",
      sector_id: emp.sector_id || "",
      position_ids: emp.employee_positions?.map((ep) => ep.position?.id).filter(Boolean) || [],
      role: emp.role || "user",
    });

    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.full_name?.trim()) {
      toast.error("O nome completo é obrigatório.");
      return;
    }

    if (!form.email?.trim()) {
      toast.error("O email é obrigatório.");
      return;
    }

    if (!form.employee_number) {
      toast.error("O número de funcionário é obrigatório.");
      return;
    }

    if (editingEmployee) {
      updateMutation.mutate({ id: editingEmployee.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const togglePosition = (posId) => {
    const current = form.position_ids || [];

    setForm({
      ...form,
      position_ids: current.includes(posId)
        ? current.filter((id) => id !== posId)
        : [...current, posId],
    });
  };

  const filtered = employees
    .filter((emp) => {
      const empPositions =
        emp.employee_positions?.map((ep) => ep.position?.id).filter(Boolean) || [];

      const matchSearch =
        !search ||
        emp.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        emp.email?.toLowerCase().includes(search.toLowerCase()) ||
        String(emp.employee_number || "").includes(search);

      const matchSector =
        filterSector === "all" || emp.sector_id === filterSector;

      const matchPosition =
        filterPosition === "all" || empPositions.includes(filterPosition);

      return matchSearch && matchSector && matchPosition;
    })
    .sort((a, b) => Number(a.employee_number || 0) - Number(b.employee_number || 0));

  if (user && !canManage) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Funcionários</h1>
          <p className="text-muted-foreground mt-1">
            {employees.length} colaborador{employees.length !== 1 ? "es" : ""} registado{employees.length !== 1 ? "s" : ""}
          </p>
        </div>

        <Button onClick={openNew} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Criar Funcionário
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nome, email ou número..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10"
              />
            </div>

            <Select value={filterSector} onValueChange={setFilterSector}>
              <SelectTrigger className="w-[180px] h-10">
                <SelectValue placeholder="Setor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Setores</SelectItem>
                {sectors.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterPosition} onValueChange={setFilterPosition}>
              <SelectTrigger className="w-[180px] h-10">
                <SelectValue placeholder="Cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Cargos</SelectItem>
                {positions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Nº Func.</TableHead>
                  <TableHead>Nome Completo</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden lg:table-cell">Setor</TableHead>
                  <TableHead className="hidden lg:table-cell">Cargo(s)</TableHead>
                  <TableHead className="w-12">Ações</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="w-5 h-5 mx-auto animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum funcionário encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((emp) => {
                    const empPositions =
                      emp.employee_positions?.map((ep) => ep.position).filter(Boolean) || [];

                    const isCurrentUser =
                      emp.email?.toLowerCase() === user?.email?.toLowerCase();

                    return (
                      <TableRow key={emp.id} className={isCurrentUser ? "bg-primary/5" : ""}>
                        <TableCell className="font-mono text-sm">
                          {emp.employee_number || "—"}
                        </TableCell>

                        <TableCell className="font-medium">
                          <span>{emp.full_name || "—"}</span>
                          {isCurrentUser && (
                            <Badge variant="outline" className="ml-2 text-xs text-primary border-primary/30">
                              Você
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                          {emp.email}
                        </TableCell>

                        <TableCell className="hidden lg:table-cell">
                          {emp.sector?.name || "—"}
                        </TableCell>

                        <TableCell className="hidden lg:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {empPositions.map((p) => (
                              <Badge key={p.id} variant="secondary" className="text-xs">
                                {p.name}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>

                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(emp)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteTarget(emp)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Apagar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEmployee ? "Editar Funcionário" : "Criar Funcionário"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Nome completo <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.full_name || ""}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="João Silva"
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Nº Funcionário <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.employee_number || ""}
                  onChange={(e) => setForm({ ...form, employee_number: e.target.value })}
                  placeholder="1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                type="email"
                value={form.email || ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="joao.silva@empresa.pt"
              />
            </div>

            <div className="space-y-2">
              <Label>Papel no sistema</Label>
              <Select
                value={form.role || "user"}
                onValueChange={(v) => setForm({ ...form, role: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="user">Utilizador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Setor</Label>
              <Select
                value={form.sector_id || ""}
                onValueChange={(v) => setForm({ ...form, sector_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar setor" />
                </SelectTrigger>
                <SelectContent>
                  {sectors.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cargos</Label>
              {positions.length === 0 ? (
                <p className="text-sm text-muted-foreground italic p-3 border rounded-lg">
                  Nenhum cargo criado ainda.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 border rounded-lg p-3 max-h-36 overflow-y-auto">
                  {positions.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={form.position_ids?.includes(p.id)}
                        onCheckedChange={() => togglePosition(p.id)}
                      />
                      {p.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {editingEmployee ? "Guardar alterações" : "Criar funcionário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar funcionário?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que pretende apagar{" "}
              <strong>{deleteTarget?.full_name || deleteTarget?.email}</strong>?
              Esta ação remove o registo do funcionário da aplicação.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate(deleteTarget.id)}
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}