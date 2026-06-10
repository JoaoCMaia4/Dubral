import React from "react";
import { useOutletContext, Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Users,
  BarChart3,
  Clock,
  Bell,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default function Dashboard() {
  const { user, employee, hasPermission, notifications = [] } = useOutletContext();

  const canManageEmployees =
    hasPermission?.("total") || hasPermission?.("manage_employees");

  const { data: surveys = [] } = useQuery({
    queryKey: ["surveys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("surveys")
        .select("*")
        .eq("is_template", false)
        .order("created_at", { ascending: false })
        .limit(50);

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
    enabled: canManageEmployees,
    initialData: [],
  });

  const now = new Date();

  const userPositionIds =
    user?.employee_positions
      ?.map((item) => item.position?.id)
      .filter(Boolean) || [];

  const activeSurveys = surveys.filter((survey) => {
    if (survey.status !== "active") return false;

    if (survey.start_date && new Date(survey.start_date) > now) return false;
    if (survey.end_date && new Date(survey.end_date) < now) return false;

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
        userPositionIds.includes(positionId)
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

  const respondedIds = new Set(responses.map((response) => response.survey_id));
  const pendingSurveys = activeSurveys.filter(
    (survey) => !respondedIds.has(survey.id)
  );

  const totalResponses = surveys.reduce(
    (sum, survey) => sum + (survey.response_count || 0),
    0
  );

  const recentNotifications = (notifications || []).slice(0, 5);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="pt-2 pb-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Olá, {(user?.full_name || user?.name || user?.email)?.split(" ")[0] || "Utilizador"} 👋
        </h1>

        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          Bem-vindo à Página Inicial. Aqui está o resumo da sua atividade.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Questionários Ativos"
          value={activeSurveys.length}
          icon={FileText}
          color="bg-primary"
        />

        <StatCard
          title="Pendentes"
          value={pendingSurveys.length}
          icon={Clock}
          color="bg-warning"
        />

        <StatCard
          title="Respostas Recebidas"
          value={totalResponses}
          icon={BarChart3}
          color="bg-success"
        />

        {canManageEmployees && (
          <StatCard
            title="Funcionários"
            value={employees.length}
            icon={Users}
            color="bg-chart-5"
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">
              Questionários Pendentes
            </CardTitle>

            <Link to="/surveys">
              <Button variant="ghost" size="sm" className="text-primary">
                Ver todos <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>

          <CardContent>
            {pendingSurveys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-success" />
                <p className="font-medium">Tudo em dia!</p>
                <p className="text-sm">Não tem questionários pendentes.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingSurveys.slice(0, 5).map((survey) => (
                  <Link
                    key={survey.id}
                    to={`/surveys/${survey.id}/respond`}
                    className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-accent/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>

                      <div>
                        <p className="font-medium group-hover:text-primary transition-colors">
                          {survey.title}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {survey.questions?.length || 0} perguntas
                          {survey.end_date &&
                            ` · Prazo: ${format(new Date(survey.end_date), "d MMM", { locale: pt })}`}
                        </p>
                      </div>
                    </div>

                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                      Pendente
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notificações
            </CardTitle>
          </CardHeader>

          <CardContent>
            {recentNotifications.length === 0 ? (
              <p className="text-center py-6 text-sm text-muted-foreground">
                Sem notificações
              </p>
            ) : (
              <div className="space-y-3">
                {recentNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div
                      className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                        notification.read ? "bg-muted-foreground/30" : "bg-primary"
                      }`}
                    />

                    <div>
                      <p className="text-sm font-medium">{notification.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {notification.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}