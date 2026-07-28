import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Send, Loader2, CheckCircle2, Edit3, Clock } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";

export default function SurveyRespond() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { employee } = useOutletContext();
  const queryClient = useQueryClient();

  const [answers, setAnswers] = useState({});
  const [isEditing, setIsEditing] = useState(false);

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

  const { data: existingResponse } = useQuery({
    queryKey: ["myResponse", id, employee?.id],
    queryFn: async () => {
      if (!employee?.id) return null;

      const { data, error } = await supabase
        .from("survey_responses")
        .select("*")
        .eq("survey_id", id)
        .eq("employee_id", employee.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!employee?.id,
  });

  const alreadyResponded = !!existingResponse;

  const now = new Date();
  const isExpired = survey?.end_date && new Date(survey.end_date) < now;
  const isNotStarted = survey?.start_date && new Date(survey.start_date) > now;
  const isArchived = survey?.status === "archived";

  const canRespond =
    survey?.status === "active" &&
    !isExpired &&
    !isNotStarted;

  useEffect(() => {
    if (isEditing && existingResponse?.answers) {
      setAnswers(existingResponse.answers || {});
    }
  }, [isEditing, existingResponse]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!employee?.id) {
        throw new Error("Funcionário não encontrado.");
      }

      if (existingResponse) {
        const { error } = await supabase
          .from("survey_responses")
          .update({
            answers,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingResponse.id);

        if (error) throw error;
        return;
      }

      const { error } = await supabase
        .from("survey_responses")
        .insert({
          survey_id: id,
          employee_id: employee.id,
          answers,
        });

      if (error) throw error;

      const { error: countError } = await supabase
        .from("surveys")
        .update({
          response_count: (survey?.response_count || 0) + 1,
        })
        .eq("id", id);

      if (countError) throw countError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      queryClient.invalidateQueries({ queryKey: ["myResponses"] });
      queryClient.invalidateQueries({ queryKey: ["myResponse", id, employee?.id] });

      toast.success(
        existingResponse
          ? "Resposta atualizada com sucesso!"
          : "Resposta enviada com sucesso!"
      );

      navigate("/surveys");
    },
    onError: (err) => {
      console.error(err);
      toast.error(err.message || "Erro ao enviar resposta.");
    },
  });

  const setAnswer = (questionId, value) => {
    setAnswers({
      ...answers,
      [questionId]: value,
    });
  };

  const toggleCheckbox = (questionId, option) => {
    const current = answers[questionId] || [];

    setAnswer(
      questionId,
      current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option]
    );
  };

  if (isLoadingSurvey || !survey) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (alreadyResponded && !isEditing) {
    const previousAnswers = existingResponse.answers || {};

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate("/surveys")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <Card className="border-t-4 border-t-success">
          <CardHeader className="text-center">
            <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-2" />
            <CardTitle>Já respondeu a este questionário</CardTitle>
            <p className="text-muted-foreground mt-1">
              {isArchived
                ? "Este questionário está arquivado. Pode consultar a sua resposta, mas já não a pode editar."
                : "Aqui estão as suas respostas."}
            </p>

            {survey?.end_date && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" />
                {isExpired
                  ? "Prazo encerrado"
                  : `Termina em: ${format(new Date(survey.end_date), "d MMM yyyy 'às' HH:mm", { locale: pt })}`}
              </p>
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            {survey?.questions?.map((question, index) => {
              const value = previousAnswers[question.id];

              return (
                <div key={question.id} className="p-4 rounded-lg bg-muted/50">
                  <p className="font-medium text-sm">
                    {index + 1}. {question.title}
                  </p>

                  {question.description && (
                    <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line leading-relaxed">
                      {question.description}
                    </p>
                  )}

                  <div className="mt-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">
                      A sua resposta
                    </p>

                    <p className="text-sm">
                      {Array.isArray(value) ? value.join(", ") : value || "—"}
                    </p>
                  </div>
                </div>
              );
            })}

            {canRespond && !isArchived && (
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                className="w-full"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Editar Resposta
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isNotStarted) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate("/surveys")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <Card className="border-t-4 border-t-primary">
          <CardHeader className="text-center">
            <Clock className="w-12 h-12 text-primary mx-auto mb-2" />
            <CardTitle>{survey?.title}</CardTitle>
            <p className="text-muted-foreground mt-1">
              Este questionário ainda não está disponível. Inicia em:{" "}
              {format(new Date(survey.start_date), "d MMM yyyy 'às' HH:mm", { locale: pt })}
            </p>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isExpired && !alreadyResponded) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate("/surveys")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <Card className="border-t-4 border-t-destructive">
          <CardHeader className="text-center">
            <Clock className="w-12 h-12 text-destructive mx-auto mb-2" />
            <CardTitle>{survey?.title}</CardTitle>
            <p className="text-muted-foreground mt-1">
              O prazo para responder a este questionário já terminou.
            </p>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const allRequiredAnswered = survey.questions
    ?.filter((question) => question.required)
    .every((question) => {
      const value = answers[question.id];
      return (
        value !== undefined &&
        value !== "" &&
        (!Array.isArray(value) || value.length > 0)
      );
    });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate("/surveys")}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </Button>

      <Card className="border-t-4 border-t-primary">
        <CardContent className="p-6">
          <h1 className="text-2xl font-bold">{survey.title}</h1>

          {survey.description && (
            <p className="text-muted-foreground mt-3 whitespace-pre-line leading-relaxed">
              {survey.description}
            </p>
          )}

          {survey.end_date && (
            <p className="text-sm font-medium text-amber-600 mt-3 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Termina em:{" "}
              {format(new Date(survey.end_date), "d 'de' MMMM yyyy 'às' HH:mm", { locale: pt })}
            </p>
          )}

          <p className="text-xs text-destructive mt-3">
            * Campos obrigatórios
          </p>

          {isEditing && (
            <p className="text-xs text-primary mt-1 font-medium">
              A editar a sua resposta anterior.
            </p>
          )}
        </CardContent>
      </Card>

      {survey.questions?.map((question, index) => (
        <Card key={question.id}>
          <CardContent className="p-6 space-y-3">
            <div>
              <Label className="text-base font-medium">
                {index + 1}. {question.title}
                {question.required && (
                  <span className="text-destructive ml-1">*</span>
                )}
              </Label>

              {question.description && (
                <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line leading-relaxed">
                  {question.description}
                </p>
              )}
            </div>

            {question.type === "short_text" && (
              <Input
                value={answers[question.id] || ""}
                onChange={(e) => setAnswer(question.id, e.target.value)}
                placeholder="A sua resposta"
              />
            )}

            {question.type === "long_text" && (
              <Textarea
                value={answers[question.id] || ""}
                onChange={(e) => setAnswer(question.id, e.target.value)}
                placeholder="A sua resposta"
                rows={4}
              />
            )}

            {question.type === "multiple_choice" && (
              <div>
                <RadioGroup
                  value={answers[question.id] || ""}
                  onValueChange={(value) => setAnswer(question.id, value)}
                >
                  {question.options?.map((option, optionIndex) => (
                    <div key={optionIndex} className="flex items-center gap-3 py-1">
                      <RadioGroupItem value={option} id={`${question.id}_${optionIndex}`} />
                      <Label htmlFor={`${question.id}_${optionIndex}`} className="cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                {answers[question.id] && (
                  <button
                    type="button"
                    onClick={() => setAnswer(question.id, "")}
                    className="mt-2 text-xs text-muted-foreground hover:text-destructive underline underline-offset-2 transition-colors"
                  >
                    Limpar seleção
                  </button>
                )}
              </div>
            )}

            {question.type === "checkbox" && (
              <div className="space-y-2">
                {question.options?.map((option, optionIndex) => (
                  <label
                    key={optionIndex}
                    className="flex items-center gap-3 py-1 cursor-pointer"
                  >
                    <Checkbox
                      checked={(answers[question.id] || []).includes(option)}
                      onCheckedChange={() => toggleCheckbox(question.id, option)}
                    />
                    <span className="text-sm">{option}</span>
                  </label>
                ))}
              </div>
            )}

            {question.type === "dropdown" && (
              <Select
                value={answers[question.id] || ""}
                onValueChange={(value) => setAnswer(question.id, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>

                <SelectContent>
                  {question.options?.map((option, optionIndex) => (
                    <SelectItem key={optionIndex} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {question.type === "scale" && (
              <div className="flex items-center gap-2 flex-wrap">
                {Array.from(
                  { length: (question.max_value || 5) - (question.min_value || 1) + 1 },
                  (_, i) => (question.min_value || 1) + i
                ).map((number) => (
                  <button
                    key={number}
                    type="button"
                    onClick={() => setAnswer(question.id, String(number))}
                    className={`w-10 h-10 rounded-lg border text-sm font-medium transition-colors ${
                      answers[question.id] === String(number)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-accent"
                    }`}
                  >
                    {number}
                  </button>
                ))}
              </div>
            )}

            {question.type === "yes_no" && (
              <RadioGroup
                value={answers[question.id] || ""}
                onValueChange={(value) => setAnswer(question.id, value)}
              >
                <div className="flex items-center gap-3 py-1">
                  <RadioGroupItem value="Sim" id={`${question.id}_yes`} />
                  <Label htmlFor={`${question.id}_yes`} className="cursor-pointer">
                    Sim
                  </Label>
                </div>

                <div className="flex items-center gap-3 py-1">
                  <RadioGroupItem value="Não" id={`${question.id}_no`} />
                  <Label htmlFor={`${question.id}_no`} className="cursor-pointer">
                    Não
                  </Label>
                </div>
              </RadioGroup>
            )}

            {question.type === "date" && (
              <Input
                type="date"
                value={answers[question.id] || ""}
                onChange={(e) => setAnswer(question.id, e.target.value)}
              />
            )}

            {question.type === "time" && (
              <Input
                type="time"
                value={answers[question.id] || ""}
                onChange={(e) => setAnswer(question.id, e.target.value)}
              />
            )}
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-between items-center pb-8">
        <p className="text-xs text-muted-foreground">
          {isEditing
            ? "A editar resposta existente."
            : "Pode editar a sua resposta até ao prazo final."}
        </p>

        <div className="flex gap-2">
          {isEditing && (
            <Button
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                setAnswers({});
              }}
            >
              Cancelar
            </Button>
          )}

          <Button
            onClick={() => submitMutation.mutate()}
            disabled={!allRequiredAnswered || submitMutation.isPending}
            size="lg"
          >
            {submitMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {isEditing ? "Atualizar Resposta" : "Enviar Resposta"}
          </Button>
        </div>
      </div>
    </div>
  );
}