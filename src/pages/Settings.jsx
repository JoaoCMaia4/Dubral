import React from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Shield, Clock, Users, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default function Settings() {
  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ["auditLogs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.warn("Tabela audit_logs ainda não existe ou não está acessível:", error);
        return [];
      }

      return data || [];
    },
    initialData: [],
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("employee_number", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    initialData: [],
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
    initialData: [],
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
    initialData: [],
  });

  const actionLabels = {
    create: "Criou",
    update: "Editou",
    delete: "Eliminou",
  };

  const entityLabels = {
    Survey: "Questionário",
    User: "Funcionário",
    Employee: "Funcionário",
    Sector: "Setor",
    Position: "Cargo",
    SurveyResponse: "Resposta",
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground mt-1">
          Informações do sistema e auditoria.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Funcionários</p>
              <p className="text-xl font-bold">{employees.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-success" />
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Cargos</p>
              <p className="text-xl font-bold">{positions.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-warning" />
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Setores</p>
              <p className="text-xl font-bold">{sectors.length}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Histórico de Auditoria
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Utilizador</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : auditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Sem registos de auditoria.
                    </TableCell>
                  </TableRow>
                ) : (
                  auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {log.created_at
                          ? format(new Date(log.created_at), "dd/MM/yyyy HH:mm", {
                              locale: pt,
                            })
                          : "—"}
                      </TableCell>

                      <TableCell className="font-medium">
                        {log.user_name || log.user_email || "Sistema"}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={
                            log.action === "delete" ? "destructive" : "secondary"
                          }
                        >
                          {actionLabels[log.action] || log.action || "—"}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {entityLabels[log.entity_type] || log.entity_type || "—"}
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {log.details || "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}