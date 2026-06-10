import React, { useState } from "react";
import { useOutletContext, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Edit3,
  BarChart3,
  Loader2,
  MoreVertical,
  Copy,
  Archive,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";

const statusConfig = {
  draft: {
    label: "Rascunho",
    color: "bg-muted text-muted-foreground",
    icon: Edit3,
  },
  active: {
    label: "Ativo",
    color: "bg-success/10 text-success",
    icon: CheckCircle2,
  },
  scheduled: {
    label: "Agendado",
    color: "bg-primary/10 text-primary",
    icon: Clock,
  },
  closed: {
    label: "Encerrado",
    color: "bg-destructive/10 text-destructive",
    icon: XCircle,
  },
  archived: {
    label: "Arquivado",
    color: "bg-muted text-muted-foreground",
    icon: Archive,
  },
};

export default function Surveys() {
  const { user, employee, hasPermission } = useOutletContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const canCreate =
    hasPermission?.("total") ||
    hasPermission?.("create_own_surveys") ||
    hasPermission?.("create_all_surveys");

  const canViewAll =
    hasPermission?.("total") ||
    hasPermission?.("create_all_surveys") ||
    hasPermission?.("view_all_results");

  const canSeeResults = (survey) => {
    if (hasPermission?.("total") || hasPermission?.("view_all_results")) {
      return true;
    }

    if (
      hasPermission?.("view_own_results") &&
      survey.created_by_id === employee?.id
    ) {
      return true;
    }

    return false;
  };

  const canManageSurvey = (survey) => {
    if (hasPermission?.("total") || hasPermission?.("create_all_surveys")) {
      return true;
    }

    if (
      hasPermission?.("create_own_surveys") &&
      survey.created_by_id === employee?.id
    ) {
      return true;
    }

    return false;
  };

  const { data: surveys = [], isLoading } = useQuery({
    queryKey: ["surveys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("surveys")
        .select("*")
        .eq("is_template", false)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      return data || [];
    },
  });

  const { data: responses = [] } = useQuery({
    queryKey: ["myResponses", employee?.id],
    queryFn: async () => {
      if (!employee?.id) return [];

      const { data, error } = await supabase
        .from("survey_responses")
        .select("*")
        .eq("employee_id", employee.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!employee?.id,
    initialData: [],
  });

  const archiveMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from("surveys")
        .update({ status: "archived" })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      toast.success("Questionário arquivado.");
    },
    onError: (err) => {
      console.error(err);
      toast.error("Erro ao arquivar questionário.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from("surveys")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      setDeleteTarget(null);
      toast.success("Questionário apagado.");
    },
    onError: (err) => {
      console.error(err);
      toast.error("Erro ao apagar questionário.");
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (survey) => {
      const { id, created_at, updated_at, response_count, ...rest } = survey;

      const { error } = await supabase.from("surveys").insert({
        ...rest,
        title: `${rest.title} (cópia)`,
        status: "draft",
        response_count: 0,
        created_by_id: employee?.id || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      toast.success("Questionário duplicado.");
    },
    onError: (err) => {
      console.error(err);
      toast.error("Erro ao duplicar questionário.");
    },
  });

  const respondedIds = new Set(responses.map((response) => response.survey_id));
  const now = new Date();

  const isWithinDateRange = (survey) => {
    if (survey.start_date && new Date(survey.start_date) > now) {
      return false;
    }

    if (survey.end_date && new Date(survey.end_date) < now) {
      return false;
    }

    return true;
  };

  const getEffectiveStatus = (survey) => {
    const isNotStarted =
      survey.start_date && new Date(survey.start_date) > new Date();

    const isExpired =
      survey.end_date && new Date(survey.end_date) < new Date();

    if (survey.status === "active" && isNotStarted) {
      return "scheduled";
    }

    if (survey.status === "active" && isExpired) {
      return "closed";
    }

    return survey.status;
  };

  let visibleSurveys = surveys;

  if (!canViewAll) {
    visibleSurveys = surveys.filter((survey) => {
      if (survey.status === "archived") return false;

      if (survey.created_by_id === employee?.id && canCreate) {
        return true;
      }

      const effectiveStatus = getEffectiveStatus(survey);

      if (effectiveStatus !== "active") return false;
      if (!isWithinDateRange(survey)) return false;

      if (survey.target_type === "all") return true;

      if (
        survey.target_type === "sector" &&
        survey.target_sector_ids?.includes(user?.sector_id)
      ) {
        return true;
      }

      if (
        survey.target_type === "position" &&
        survey.target_position_ids?.some((positionId) =>
          user?.position_ids?.includes(positionId)
        )
      ) {
        return true;
      }

      if (
        survey.target_type === "specific" &&
        survey.target_user_ids?.includes(employee?.id)
      ) {
        return true;
      }

      return false;
    });
  }

  const filtered = visibleSurveys.filter((survey) => {
    const effectiveStatus = getEffectiveStatus(survey);

    const matchSearch =
      !search ||
      survey.title?.toLowerCase().includes(search.toLowerCase()) ||
      survey.description?.toLowerCase().includes(search.toLowerCase());

    const matchTab =
      tab === "all" ||
      (tab === "pending" &&
        effectiveStatus === "active" &&
        !respondedIds.has(survey.id)) ||
      (tab === "responded" && respondedIds.has(survey.id)) ||
      (tab === "mine" && survey.created_by_id === employee?.id) ||
      (tab === "archived" && survey.status === "archived") ||
      tab === effectiveStatus;

    return matchSearch && matchTab;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Questionários</h1>
          <p className="text-muted-foreground mt-1">
            {canViewAll
              ? "Todos os questionários da empresa."
              : "Questionários disponíveis para si."}
          </p>
        </div>

        {canCreate && (
          <Link to="/surveys/new">
            <Button className="shrink-0">
              <Plus className="w-4 h-4 mr-2" />
              Criar Questionário
            </Button>
          </Link>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar questionários..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-10 h-10"
          />
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="pending">Pendentes</TabsTrigger>
            <TabsTrigger value="responded">Respondidos</TabsTrigger>
            {canCreate && <TabsTrigger value="mine">Meus</TabsTrigger>}
            {canViewAll && (
              <TabsTrigger value="archived">Arquivados</TabsTrigger>
            )}
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-2" />
            <p>Nenhum questionário encontrado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((survey) => {
            const effectiveStatus = getEffectiveStatus(survey);
            const config = statusConfig[effectiveStatus] || statusConfig.draft;
            const StatusIcon = config.icon;
            const hasResponded = respondedIds.has(survey.id);
            const canManage = canManageSurvey(survey);

            return (
              <Card key={survey.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold truncate">
                          {survey.title}
                        </h3>

                        {survey.description && (
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                            {survey.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <Badge className={config.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {config.label}
                          </Badge>

                          <span className="text-xs text-muted-foreground">
                            {survey.questions?.length || 0} pergunta
                            {survey.questions?.length !== 1 ? "s" : ""}
                          </span>

                          {survey.start_date && new Date(survey.start_date) > now && (
                            <span className="text-xs text-primary font-medium">
                              · Inicia:{" "}
                              {format(new Date(survey.start_date), "d MMM yyyy HH:mm", {
                                locale: pt,
                              })}
                            </span>
                          )}

                          {survey.end_date && (
                            <span
                              className={`text-xs font-medium ${
                                new Date(survey.end_date) < now
                                  ? "text-destructive"
                                  : "text-muted-foreground"
                              }`}
                            >
                              · Termina:{" "}
                              {format(new Date(survey.end_date), "d MMM yyyy HH:mm", {
                                locale: pt,
                              })}
                            </span>
                          )}

                          <span className="text-xs text-muted-foreground">
                            · {survey.response_count || 0} resposta
                            {survey.response_count !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0 items-center">
                      {effectiveStatus === "active" &&
                        !hasResponded &&
                        isWithinDateRange(survey) && (
                          <Link to={`/surveys/${survey.id}/respond`}>
                            <Button size="sm">Responder</Button>
                          </Link>
                        )}

                      {effectiveStatus === "active" &&
                        hasResponded &&
                        isWithinDateRange(survey) && (
                          <Link to={`/surveys/${survey.id}/respond`}>
                            <Button size="sm" variant="outline">
                              Editar Resposta
                            </Button>
                          </Link>
                        )}

                      {hasResponded &&
                        (!isWithinDateRange(survey) ||
                          effectiveStatus !== "active") && (
                          <Badge
                            variant="outline"
                            className="bg-success/5 text-success border-success/20"
                          >
                            Respondido
                          </Badge>
                        )}

                      {canSeeResults(survey) && (
                        <Link to={`/surveys/${survey.id}/results`}>
                          <Button variant="outline" size="sm">
                            <BarChart3 className="w-4 h-4 mr-1" />
                            Resultados
                          </Button>
                        </Link>
                      )}

                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => navigate(`/surveys/${survey.id}/edit`)}
                            >
                              <Edit3 className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => duplicateMutation.mutate(survey)}
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Duplicar
                            </DropdownMenuItem>

                            {survey.status !== "archived" && (
                              <DropdownMenuItem
                                onClick={() => archiveMutation.mutate(survey.id)}
                              >
                                <Archive className="w-4 h-4 mr-2" />
                                Arquivar
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(survey)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Apagar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar questionário?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que pretende apagar{" "}
              <strong>"{deleteTarget?.title}"</strong>? Esta ação também remove
              as respostas desse questionário.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>

            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate(deleteTarget.id)}
            >
              Apagar definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}