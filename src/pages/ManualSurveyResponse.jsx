import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import {
  useQuery,
  useMutation,
} from "@tanstack/react-query";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import {
  Input,
} from "@/components/ui/input";

import {
  Textarea,
} from "@/components/ui/textarea";

import {
  Button,
} from "@/components/ui/button";

import {
  Label,
} from "@/components/ui/label";

import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";

import {
  Checkbox,
} from "@/components/ui/checkbox";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  ArrowLeft,
  Loader2,
  Send,
  Clock,
} from "lucide-react";

import { toast } from "sonner";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default function ManualSurveyResponse() {
  const { id, responseId } = useParams();
  const navigate = useNavigate();

  const [employeeNumber, setEmployeeNumber] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [sectorId, setSectorId] = useState("");
  const [positionId, setPositionId] = useState("");

  const [answers, setAnswers] = useState({});

  const { data: survey, isLoading } = useQuery({
    queryKey: ["survey", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("surveys")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      return data;
    },
  });

  const { data: existingResponse } = useQuery({
    queryKey: ["manualResponse", responseId],
    enabled: !!responseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manual_survey_responses")
        .select("*")
        .eq("id", responseId)
        .single();

      if (error) throw error;

      return data;
    },
  });

  useEffect(() => {
    if (!existingResponse) return;

    setEmployeeNumber(existingResponse.employee_number || "");
    setEmployeeName(existingResponse.employee_name || "");
    setSectorId(existingResponse.sector_id || "");
    setPositionId(existingResponse.position_id || "");
    setAnswers(existingResponse.answers || {});
  }, [existingResponse]);

  const { data: sectors = [] } = useQuery({
    queryKey: ["sectors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sectors")
        .select("*")
        .order("name");

      if (error) throw error;

      return data;
    },
  });

  const { data: positions = [] } = useQuery({
    queryKey: ["positions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("positions")
        .select("*")
        .order("name");

      if (error) throw error;

      return data;
    },
  });

  const setAnswer = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
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

  const submitMutation = useMutation({
    mutationFn: async () => {

      if (!employeeNumber.trim()) {
        throw new Error("Introduza o número do funcionário.");
      }

      if (!employeeName.trim()) {
        throw new Error("Introduza o nome do funcionário.");
      }

      const allRequiredAnswered = survey.questions
        ?.filter((q) => q.required)
        .every((q) => {
          const value = answers[q.id];

          return (
            value !== undefined &&
            value !== "" &&
            (!Array.isArray(value) || value.length > 0)
          );
        });

      if (!allRequiredAnswered) {
        throw new Error("Existem perguntas obrigatórias por responder.");
      }

      let error;

      if (responseId) {
        // EDITAR
        ({ error } = await supabase
          .from("manual_survey_responses")
          .update({
            employee_number: employeeNumber,
            employee_name: employeeName,
            sector_id: sectorId || null,
            position_id: positionId || null,
            answers,
          })
          .eq("id", responseId));
      } else {
        // NOVA RESPOSTA
        ({ error } = await supabase
          .from("manual_survey_responses")
          .insert({
            survey_id: id,
            employee_number: employeeNumber,
            employee_name: employeeName,
            sector_id: sectorId || null,
            position_id: positionId || null,
            answers,
          }));
      }

      if (error) throw error;
    },

    onSuccess: () => {
      toast.success("Resposta registada com sucesso.");
      navigate(`/surveys/${id}/results`);
    },

    onError: (err) => {
      toast.error(err.message);
    },
  });

  if (isLoading || !survey) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const allRequiredAnswered = survey.questions
    ?.filter((q) => q.required)
    .every((q) => {
      const value = answers[q.id];

      return (
        value !== undefined &&
        value !== "" &&
        (!Array.isArray(value) || value.length > 0)
      );
    });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button
        variant="ghost"
        onClick={() => navigate(`/surveys/${id}/results`)}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </Button>

      <Card className="border-t-4 border-t-primary">
        <CardContent className="p-6">

          <h1 className="text-2xl font-bold">
            {responseId ? "Editar resposta manual" : "Inserir resposta manual"}
          </h1>

          <p className="text-muted-foreground mt-2">
            Esta resposta será registada em nome de um funcionário que respondeu em papel.
          </p>

          {survey.description && (
            <p className="text-muted-foreground mt-4 whitespace-pre-line leading-relaxed">
              {survey.description}
            </p>
          )}

          {survey.end_date && (
            <p className="text-sm font-medium text-amber-600 mt-4 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Termina em{" "}
              {format(
                new Date(survey.end_date),
                "d 'de' MMMM yyyy 'às' HH:mm",
                { locale: pt }
              )}
            </p>
          )}

          <p className="text-xs text-destructive mt-4">
            * Campos obrigatórios
          </p>

        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-5">

          <div className="grid md:grid-cols-2 gap-5">

            <div>
              <Label>Número *</Label>

              <Input
                value={employeeNumber}
                onChange={(e) =>
                  setEmployeeNumber(e.target.value)
                }
              />
            </div>

            <div>
              <Label>Nome *</Label>

              <Input
                value={employeeName}
                onChange={(e) =>
                  setEmployeeName(e.target.value)
                }
              />
            </div>

          </div>

          <div className="grid md:grid-cols-2 gap-5">

            <div>

              <Label>Setor</Label>

              <Select
                value={sectorId}
                onValueChange={setSectorId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar setor" />
                </SelectTrigger>

                <SelectContent>
                  {sectors.map((sector) => (
                    <SelectItem
                      key={sector.id}
                      value={sector.id}
                    >
                      {sector.name}
                    </SelectItem>
                  ))}
                </SelectContent>

              </Select>

            </div>

            <div>

              <Label>Cargo</Label>

              <Select
                value={positionId}
                onValueChange={setPositionId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar cargo" />
                </SelectTrigger>

                <SelectContent>
                  {positions.map((position) => (
                    <SelectItem
                      key={position.id}
                      value={position.id}
                    >
                      {position.name}
                    </SelectItem>
                  ))}
                </SelectContent>

              </Select>

            </div>

          </div>

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
                onChange={(e) =>
                  setAnswer(question.id, e.target.value)
                }
                placeholder="A sua resposta"
              />
            )}

            {question.type === "long_text" && (
              <Textarea
                value={answers[question.id] || ""}
                onChange={(e) =>
                  setAnswer(question.id, e.target.value)
                }
                placeholder="A sua resposta"
                rows={4}
              />
            )}

            {question.type === "multiple_choice" && (
              <div>

                <RadioGroup
                  value={answers[question.id] || ""}
                  onValueChange={(value) =>
                    setAnswer(question.id, value)
                  }
                >

                  {question.options?.map((option, optionIndex) => (

                    <div
                      key={optionIndex}
                      className="flex items-center gap-3 py-1"
                    >

                      <RadioGroupItem
                        value={option}
                        id={`${question.id}_${optionIndex}`}
                      />

                      <Label
                        htmlFor={`${question.id}_${optionIndex}`}
                        className="cursor-pointer"
                      >
                        {option}
                      </Label>

                    </div>

                  ))}

                </RadioGroup>

                {answers[question.id] && (
                  <button
                    type="button"
                    onClick={() =>
                      setAnswer(question.id, "")
                    }
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
                      checked={
                        (answers[question.id] || []).includes(option)
                      }
                      onCheckedChange={() =>
                        toggleCheckbox(question.id, option)
                      }
                    />

                    <span className="text-sm">
                      {option}
                    </span>

                  </label>

                ))}

              </div>
            )}

            {question.type === "dropdown" && (
              <Select
                value={answers[question.id] || ""}
                onValueChange={(value) =>
                  setAnswer(question.id, value)
                }
              >

                <SelectTrigger>
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>

                <SelectContent>

                  {question.options?.map((option, optionIndex) => (

                    <SelectItem
                      key={optionIndex}
                      value={option}
                    >
                      {option}
                    </SelectItem>

                  ))}

                </SelectContent>

              </Select>
            )}
            {question.type === "scale" && (
              <div className="flex items-center gap-2 flex-wrap">
                {Array.from(
                  {
                    length:
                      (question.max_value || 5) -
                        (question.min_value || 1) +
                      1,
                  },
                  (_, i) => (question.min_value || 1) + i
                ).map((number) => (
                  <button
                    key={number}
                    type="button"
                    onClick={() =>
                      setAnswer(question.id, String(number))
                    }
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
                onValueChange={(value) =>
                  setAnswer(question.id, value)
                }
              >
                <div className="flex items-center gap-3 py-1">
                  <RadioGroupItem
                    value="Sim"
                    id={`${question.id}_yes`}
                  />
                  <Label htmlFor={`${question.id}_yes`}>
                    Sim
                  </Label>
                </div>

                <div className="flex items-center gap-3 py-1">
                  <RadioGroupItem
                    value="Não"
                    id={`${question.id}_no`}
                  />
                  <Label htmlFor={`${question.id}_no`}>
                    Não
                  </Label>
                </div>
              </RadioGroup>
            )}

            {question.type === "date" && (
              <Input
                type="date"
                value={answers[question.id] || ""}
                onChange={(e) =>
                  setAnswer(question.id, e.target.value)
                }
              />
            )}

            {question.type === "time" && (
              <Input
                type="time"
                value={answers[question.id] || ""}
                onChange={(e) =>
                  setAnswer(question.id, e.target.value)
                }
              />
            )}

          </CardContent>
        </Card>
      ))}
            <div className="flex justify-between items-center pb-8">

        <p className="text-xs text-muted-foreground">
          {responseId
            ? "Está a editar uma resposta manual."
            : "Esta resposta será registada manualmente."}
        </p>

        <Button
          onClick={() => submitMutation.mutate()}
          disabled={
            !allRequiredAnswered ||
            submitMutation.isPending
          }
          size="lg"
        >
          {submitMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              A guardar...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              {responseId ? "Guardar alterações" : "Guardar resposta"}
            </>
          )}
        </Button>

      </div>

    </div>
  );
}