import React, { useState, useMemo } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Download, BarChart3, Users, Loader2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import ExportColumnsModal from "@/components/surveys/ExportColumnsModal";

const COLORS = [
  "hsl(225, 73%, 57%)",
  "hsl(173, 58%, 39%)",
  "hsl(43, 74%, 66%)",
  "hsl(12, 76%, 61%)",
  "hsl(280, 65%, 60%)",
  "hsl(340, 75%, 55%)",
];

export default function SurveyResults() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, employee, hasPermission } = useOutletContext();
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const canViewAllResponses =
    hasPermission?.("total") ||
    hasPermission?.("view_all_results") ||
    user?.role === "admin";

  const { data: survey, isLoading: isLoadingSurvey } = useQuery({
    queryKey: ["survey", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("surveys")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const { data: responses = [], isLoading: isLoadingResponses } = useQuery({
    queryKey: ["surveyResponses", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("survey_responses")
        .select(`
          *,
          employee:employees(
            *,
            sector:sectors(*),
            employee_positions(
              position:positions(*)
            )
          )
        `)
        .eq("survey_id", id)
        .order("created_at", { ascending: false });

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

  const visibleResponses = useMemo(() => {
    if (canViewAllResponses) return responses;

    if (hasPermission?.("view_own_results") && survey?.created_by_id === employee?.id) {
      return responses;
    }

    return responses.filter((response) => response.employee_id === employee?.id);
  }, [responses, canViewAllResponses, hasPermission, survey, employee]);

  const getAnswerValue = (response, questionId) => {
    const value = response.answers?.[questionId];

    if (Array.isArray(value)) return value.join(", ");
    if (value === undefined || value === null || value === "") return "";
    return String(value);
  };

  const getChartData = (question) => {
    const counts = {};

    visibleResponses.forEach((response) => {
      const value = response.answers?.[question.id];

      if (!value) return;

      const values = Array.isArray(value) ? value : [value];

      values.forEach((item) => {
        counts[item] = (counts[item] || 0) + 1;
      });
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  };

  const exportResponses = () => {
    if (!survey || visibleResponses.length === 0) return;

    const headers = [
      "Nº Funcionário",
      "Nome Completo",
      "Email",
      "Setor",
      "Cargo(s)",
      "Data/Hora",
      ...(survey.questions || []).map((question) => question.title),
    ];

    const rows = visibleResponses.map((response) => {
      const emp = response.employee;
      const positionNames =
        emp?.employee_positions
          ?.map((ep) => ep.position?.name)
          .filter(Boolean)
          .join(", ") || "";

      return [
        emp?.employee_number || "",
        emp?.full_name || "",
        emp?.email || "",
        emp?.sector?.name || "",
        positionNames,
        response.created_at
          ? format(new Date(response.created_at), "dd/MM/yyyy HH:mm", { locale: pt })
          : "",
        ...(survey.questions || []).map((question) =>
          getAnswerValue(response, question.id)
        ),
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
          .join(";")
      )
      .join("\n");

    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${survey.title || "questionario"}-respostas.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoadingSurvey || !survey) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/surveys")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">{survey.title}</h1>
            <p className="text-muted-foreground text-sm">
              {visibleResponses.length} resposta{visibleResponses.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => setExportModalOpen(true)}
          disabled={visibleResponses.length === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar Excel/CSV
        </Button>
      </div>

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">
            <BarChart3 className="w-4 h-4 mr-1" />
            Resumo
          </TabsTrigger>

          <TabsTrigger value="individual">
            <Users className="w-4 h-4 mr-1" />
            Individual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4 mt-4">
          {isLoadingResponses ? (
            <div className="text-center py-12">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : (
            survey.questions?.map((question, index) => {
              const chartData = getChartData(question);
              const isChoiceBased = [
                "multiple_choice",
                "checkbox",
                "dropdown",
                "yes_no",
                "scale",
              ].includes(question.type);

              return (
                <Card key={question.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      {index + 1}. {question.title}
                      {question.required && (
                        <Badge variant="destructive" className="ml-2 text-[10px]">
                          Obrigatória
                        </Badge>
                      )}
                    </CardTitle>

                    <p className="text-xs text-muted-foreground">
                      {visibleResponses.length} resposta{visibleResponses.length !== 1 ? "s" : ""}
                    </p>
                  </CardHeader>

                  <CardContent>
                    {isChoiceBased && chartData.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar
                              dataKey="value"
                              fill="hsl(225, 73%, 57%)"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>

                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie
                              data={chartData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              label={({ name, percent }) =>
                                `${name} (${(percent * 100).toFixed(0)}%)`
                              }
                            >
                              {chartData.map((_, idx) => (
                                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {visibleResponses.map((response) => {
                          const value = getAnswerValue(response, question.id);

                          if (!value) return null;

                          return (
                            <div key={response.id} className="p-3 bg-muted/50 rounded-lg text-sm">
                              {value}
                            </div>
                          );
                        })}

                        {visibleResponses.length === 0 && (
                          <p className="text-sm text-muted-foreground">
                            Ainda não existem respostas.
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="individual" className="mt-4">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Nº</TableHead>
                    <TableHead>Nome Completo</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden lg:table-cell">Setor</TableHead>
                    <TableHead className="hidden lg:table-cell">Cargo(s)</TableHead>
                    <TableHead className="whitespace-nowrap">Data/Hora</TableHead>

                    {survey.questions?.map((question) => (
                      <TableHead key={question.id} className="min-w-[150px]">
                        {question.title}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {visibleResponses.map((response) => {
                    const emp = response.employee;

                    const positionNames =
                      emp?.employee_positions
                        ?.map((ep) => ep.position?.name)
                        .filter(Boolean)
                        .join(", ") || "—";

                    return (
                      <TableRow key={response.id}>
                        <TableCell className="font-mono text-sm">
                          {emp?.employee_number || "—"}
                        </TableCell>

                        <TableCell className="font-medium whitespace-nowrap">
                          {emp?.full_name || "Anónimo"}
                        </TableCell>

                        <TableCell className="hidden md:table-cell text-muted-foreground text-sm whitespace-nowrap">
                          {emp?.email || "—"}
                        </TableCell>

                        <TableCell className="hidden lg:table-cell text-sm">
                          {emp?.sector?.name || "—"}
                        </TableCell>

                        <TableCell className="hidden lg:table-cell text-sm">
                          {positionNames}
                        </TableCell>

                        <TableCell className="whitespace-nowrap text-xs">
                          {response.created_at
                            ? format(new Date(response.created_at), "dd/MM/yyyy HH:mm", { locale: pt })
                            : "—"}
                        </TableCell>

                        {survey.questions?.map((question) => (
                          <TableCell key={question.id} className="text-sm">
                            {getAnswerValue(response, question.id) || "—"}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}

                  {visibleResponses.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={(survey.questions?.length || 0) + 6}
                        className="text-center py-8 text-muted-foreground"
                      >
                        Ainda não existem respostas.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ExportColumnsModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        survey={survey}
        responses={visibleResponses}
        users={visibleResponses.map((response) => response.employee).filter(Boolean)}
        sectors={sectors}
        positions={positions}
      />
    </div>
  );
}