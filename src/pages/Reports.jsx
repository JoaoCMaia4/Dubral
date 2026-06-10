import React from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { FileText, Users, BarChart3, TrendingUp, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const COLORS = [
  "hsl(225, 73%, 57%)",
  "hsl(173, 58%, 39%)",
  "hsl(43, 74%, 66%)",
  "hsl(12, 76%, 61%)",
  "hsl(280, 65%, 60%)",
  "hsl(340, 75%, 55%)",
];

export default function Reports() {
  const { data: surveys = [], isLoading: loadingSurveys } = useQuery({
    queryKey: ["allSurveys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("surveys")
        .select("*")
        .eq("is_template", false)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return data || [];
    },
    initialData: [],
  });

  const { data: responses = [] } = useQuery({
    queryKey: ["allResponses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("survey_responses")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) throw error;
      return data || [];
    },
    initialData: [],
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select(`
          *,
          employee_positions (
            position_id,
            position:positions (*)
          )
        `)
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

  const activeEmployees = employees.filter(
    (employee) => employee.status === "active" || !employee.status
  );

  const sectorParticipation = sectors
    .map((sector) => {
      const sectorEmployees = employees.filter(
        (employee) => employee.sector_id === sector.id
      );

      const sectorEmployeeIds = new Set(
        sectorEmployees.map((employee) => employee.id)
      );

      const sectorResponseCount = responses.filter((response) =>
        sectorEmployeeIds.has(response.employee_id)
      ).length;

      return {
        name: sector.name,
        respostas: sectorResponseCount,
        funcionarios: sectorEmployees.length,
      };
    })
    .filter((sector) => sector.funcionarios > 0);

  const positionParticipation = positions
    .map((position) => {
      const positionEmployees = employees.filter((employee) =>
        employee.employee_positions?.some(
          (item) => item.position_id === position.id || item.position?.id === position.id
        )
      );

      const positionEmployeeIds = new Set(
        positionEmployees.map((employee) => employee.id)
      );

      const positionResponseCount = responses.filter((response) =>
        positionEmployeeIds.has(response.employee_id)
      ).length;

      return {
        name: position.name,
        respostas: positionResponseCount,
      };
    })
    .filter((position) => position.respostas > 0);

  const surveysForRate = surveys.filter(
    (survey) => survey.status === "active" || survey.status === "closed"
  );

  const avgResponseRate =
    surveysForRate.length > 0
      ? Math.round(
          surveysForRate.reduce((sum, survey) => {
            return (
              sum +
              ((survey.response_count || 0) /
                Math.max(activeEmployees.length || employees.length, 1)) *
                100
            );
          }, 0) / surveysForRate.length
        )
      : 0;

  const monthlyData = {};

  surveys.forEach((survey) => {
    if (!survey.created_at) return;

    const month = format(new Date(survey.created_at), "MMM yyyy", {
      locale: pt,
    });

    monthlyData[month] = (monthlyData[month] || 0) + 1;
  });

  const monthlyChart = Object.entries(monthlyData)
    .slice(-6)
    .map(([name, value]) => ({
      name,
      questionarios: value,
    }));

  if (loadingSurveys) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground mt-1">
          Estatísticas globais da plataforma.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                Total Questionários
              </p>
              <p className="text-2xl font-bold">{surveys.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-success" />
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Total Respostas</p>
              <p className="text-2xl font-bold">{responses.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-warning" />
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                Taxa Média Resposta
              </p>
              <p className="text-2xl font-bold">{avgResponseRate}%</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-chart-5/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-chart-5" />
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                Funcionários Ativos
              </p>
              <p className="text-2xl font-bold">{activeEmployees.length}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Participação por Setor</CardTitle>
          </CardHeader>

          <CardContent>
            {sectorParticipation.length === 0 ? (
              <p className="text-center py-8 text-sm text-muted-foreground">
                Sem dados disponíveis
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={sectorParticipation}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar
                    dataKey="respostas"
                    fill="hsl(225, 73%, 57%)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Participação por Cargo</CardTitle>
          </CardHeader>

          <CardContent>
            {positionParticipation.length === 0 ? (
              <p className="text-center py-8 text-sm text-muted-foreground">
                Sem dados disponíveis
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={positionParticipation}
                    dataKey="respostas"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {positionParticipation.map((_, index) => (
                      <Cell
                        key={index}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">
              Histórico de Questionários
            </CardTitle>
          </CardHeader>

          <CardContent>
            {monthlyChart.length === 0 ? (
              <p className="text-center py-8 text-sm text-muted-foreground">
                Sem dados disponíveis
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyChart}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="questionarios"
                    stroke="hsl(225, 73%, 57%)"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}