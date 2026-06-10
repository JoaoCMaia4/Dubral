import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useOutletContext } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Save, Send, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import QuestionEditor from "@/components/surveys/QuestionEditor";

const toDatetimeLocalValue = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (number) => String(number).padStart(2, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const datetimeLocalToIso = (value) => {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
};

export default function SurveyBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { employee, positions = [] } = useOutletContext();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [form, setForm] = useState({
    title: "",
    description: "",
    questions: [],
    target_type: "all",
    target_sector_ids: [],
    target_position_ids: [],
    target_user_ids: [],
    start_date: "",
    end_date: "",
    is_template: false,
  });

  const { data: existingSurvey } = useQuery({
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
    enabled: isEdit,
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

  const { data: users = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("employee_number", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (!existingSurvey) return;

    setForm({
      title: existingSurvey.title || "",
      description: existingSurvey.description || "",
      questions: existingSurvey.questions || [],
      target_type: existingSurvey.target_type || "all",
      target_sector_ids: existingSurvey.target_sector_ids || [],
      target_position_ids: existingSurvey.target_position_ids || [],
      target_user_ids: existingSurvey.target_user_ids || [],
      start_date: toDatetimeLocalValue(existingSurvey.start_date),
      end_date: toDatetimeLocalValue(existingSurvey.end_date),
      is_template: existingSurvey.is_template || false,
    });
  }, [existingSurvey]);

  const saveMutation = useMutation({
    mutationFn: async ({ data, status }) => {
      const payload = {
        title: data.title.trim(),
        description: data.description?.trim() || null,
        questions: data.questions || [],
        target_type: data.target_type || "all",
        target_sector_ids: data.target_sector_ids || [],
        target_position_ids: data.target_position_ids || [],
        target_user_ids: data.target_user_ids || [],
        start_date: datetimeLocalToIso(data.start_date),
        end_date: datetimeLocalToIso(data.end_date),
        is_template: data.is_template || false,
        status,
        created_by_id: employee?.id || null,
      };

      if (isEdit) {
        const { error } = await supabase
          .from("surveys")
          .update(payload)
          .eq("id", id);

        if (error) throw error;
        return;
      }

      const { error } = await supabase.from("surveys").insert(payload);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      queryClient.invalidateQueries({ queryKey: ["survey", id] });

      toast.success(isEdit ? "Questionário atualizado." : "Questionário criado.");
      navigate("/surveys");
    },
    onError: (err) => {
      console.error(err);
      toast.error(err.message || "Erro ao guardar questionário.");
    },
  });

  const addQuestion = () => {
    const newQuestion = {
      id: `q_${Date.now()}`,
      type: "short_text",
      title: "",
      required: false,
      options: [],
      min_value: 1,
      max_value: 5,
    };

    setForm({
      ...form,
      questions: [...form.questions, newQuestion],
    });
  };

  const updateQuestion = (index, question) => {
    const questions = [...form.questions];
    questions[index] = question;

    setForm({
      ...form,
      questions,
    });
  };

  const removeQuestion = (index) => {
    setForm({
      ...form,
      questions: form.questions.filter((_, questionIndex) => questionIndex !== index),
    });
  };

  const handleSave = (status) => {
    if (!form.title?.trim()) {
      toast.error("O título do questionário é obrigatório.");
      return;
    }

    if (!form.questions?.length) {
      toast.error("Adicione pelo menos uma pergunta.");
      return;
    }

    const hasEmptyQuestion = form.questions.some(
      (question) => !question.title?.trim()
    );

    if (hasEmptyQuestion) {
      toast.error("Todas as perguntas precisam de ter título.");
      return;
    }

    if (form.start_date && form.end_date) {
      const startDate = new Date(form.start_date);
      const endDate = new Date(form.end_date);

      if (endDate <= startDate) {
        toast.error("A data/hora de fim tem de ser posterior à data/hora de início.");
        return;
      }
    }

    saveMutation.mutate({
      data: form,
      status,
    });
  };

  const toggleTargetSector = (sectorId) => {
    const current = form.target_sector_ids || [];

    setForm({
      ...form,
      target_sector_ids: current.includes(sectorId)
        ? current.filter((id) => id !== sectorId)
        : [...current, sectorId],
    });
  };

  const toggleTargetPosition = (positionId) => {
    const current = form.target_position_ids || [];

    setForm({
      ...form,
      target_position_ids: current.includes(positionId)
        ? current.filter((id) => id !== positionId)
        : [...current, positionId],
    });
  };

  const toggleTargetUser = (userId) => {
    const current = form.target_user_ids || [];

    setForm({
      ...form,
      target_user_ids: current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/surveys")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEdit ? "Editar Questionário" : "Novo Questionário"}
          </h1>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <Input
            value={form.title}
            onChange={(event) =>
              setForm({
                ...form,
                title: event.target.value,
              })
            }
            placeholder="Título do questionário"
            className="text-xl font-semibold h-14 border-0 border-b rounded-none focus-visible:ring-0 px-0"
          />

          <Textarea
            value={form.description}
            onChange={(event) =>
              setForm({
                ...form,
                description: event.target.value,
              })
            }
            placeholder="Descrição (opcional)"
            rows={2}
            className="border-0 border-b rounded-none focus-visible:ring-0 px-0 resize-none"
          />
        </CardContent>
      </Card>

      <div className="space-y-3">
        {form.questions.map((question, index) => (
          <QuestionEditor
            key={question.id}
            question={question}
            index={index}
            onChange={(updatedQuestion) => updateQuestion(index, updatedQuestion)}
            onRemove={() => removeQuestion(index)}
          />
        ))}
      </div>

      <Button
        variant="outline"
        onClick={addQuestion}
        className="w-full h-12 border-dashed"
      >
        <Plus className="w-5 h-5 mr-2" />
        Adicionar Pergunta
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configurações</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data/Hora de Início</Label>
              <Input
                type="datetime-local"
                value={form.start_date || ""}
                onChange={(event) =>
                  setForm({
                    ...form,
                    start_date: event.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Data/Hora de Fim</Label>
              <Input
                type="datetime-local"
                value={form.end_date || ""}
                onChange={(event) =>
                  setForm({
                    ...form,
                    end_date: event.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Destinatários</Label>

            <Select
              value={form.target_type}
              onValueChange={(value) =>
                setForm({
                  ...form,
                  target_type: value,
                  target_sector_ids: [],
                  target_position_ids: [],
                  target_user_ids: [],
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">Todos os funcionários</SelectItem>
                <SelectItem value="sector">Setor específico</SelectItem>
                <SelectItem value="position">Cargo específico</SelectItem>
                <SelectItem value="specific">Funcionários específicos</SelectItem>
              </SelectContent>
            </Select>

            {form.target_type === "sector" && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded-lg p-3">
                {sectors.map((sector) => (
                  <label
                    key={sector.id}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={form.target_sector_ids?.includes(sector.id)}
                      onCheckedChange={() => toggleTargetSector(sector.id)}
                    />
                    {sector.name}
                  </label>
                ))}
              </div>
            )}

            {form.target_type === "position" && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded-lg p-3">
                {positions.map((position) => (
                  <label
                    key={position.id}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={form.target_position_ids?.includes(position.id)}
                      onCheckedChange={() => toggleTargetPosition(position.id)}
                    />
                    {position.name}
                  </label>
                ))}
              </div>
            )}

            {form.target_type === "specific" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                {users.map((selectedEmployee) => (
                  <label
                    key={selectedEmployee.id}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={form.target_user_ids?.includes(selectedEmployee.id)}
                      onCheckedChange={() => toggleTargetUser(selectedEmployee.id)}
                    />
                    {selectedEmployee.full_name || selectedEmployee.email}
                  </label>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 justify-end pb-8">
        <Button
          variant="outline"
          onClick={() => handleSave("draft")}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending && (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          )}
          <Save className="w-4 h-4 mr-2" />
          Guardar Rascunho
        </Button>

        <Button
          onClick={() => handleSave("active")}
          disabled={!form.title || saveMutation.isPending}
        >
          {saveMutation.isPending && (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          )}
          <Send className="w-4 h-4 mr-2" />
          Publicar
        </Button>
      </div>
    </div>
  );
}