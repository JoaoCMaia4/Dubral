import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { GripVertical, Trash2, Plus, X } from "lucide-react";

const QUESTION_TYPES = [
  { value: "short_text", label: "Resposta curta" },
  { value: "long_text", label: "Texto longo" },
  { value: "multiple_choice", label: "Escolha múltipla" },
  { value: "checkbox", label: "Caixa de seleção" },
  { value: "dropdown", label: "Lista suspensa" },
  { value: "scale", label: "Escala de avaliação" },
  { value: "yes_no", label: "Sim/Não" },
  { value: "date", label: "Data" },
  { value: "time", label: "Hora" },
];

const hasOptions = (type) => ["multiple_choice", "checkbox", "dropdown"].includes(type);

export default function QuestionEditor({ question, index, onChange, onRemove }) {
  const update = (field, value) => {
    onChange({ ...question, [field]: value });
  };

  const updateOption = (idx, value) => {
    const opts = [...(question.options || [])];
    opts[idx] = value;
    update("options", opts);
  };

  const addOption = () => {
    update("options", [...(question.options || []), `Opção ${(question.options?.length || 0) + 1}`]);
  };

  const removeOption = (idx) => {
    update("options", (question.options || []).filter((_, i) => i !== idx));
  };

  return (
    <Card className="border-l-4 border-l-primary/40 hover:border-l-primary transition-colors">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <GripVertical className="w-5 h-5 text-muted-foreground mt-2.5 cursor-grab shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <Input
                value={question.title || ""}
                onChange={e => update("title", e.target.value)}
                placeholder={`Pergunta ${index + 1} — ex: Segunda-feira`}
                className="flex-1 text-base font-medium h-11"
              />
              <Select value={question.type || "short_text"} onValueChange={v => update("type", v)}>
                <SelectTrigger className="w-full md:w-48 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              value={question.description || ""}
              onChange={e => update("description", e.target.value)}
              placeholder="Descrição (opcional) — ex: Sopa: Creme de Alho Francês&#10;Carne: Bife de Peito de Perú Grelhado"
              rows={3}
              className="resize-none text-sm text-muted-foreground"
            />

            {/* Options for choice-based questions */}
            {hasOptions(question.type) && (
              <div className="space-y-2 pl-1">
                {(question.options || []).map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                    <Input
                      value={opt}
                      onChange={e => updateOption(idx, e.target.value)}
                      className="h-9 flex-1"
                    />
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeOption(idx)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
                <Button variant="ghost" size="sm" onClick={addOption} className="text-primary">
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar opção
                </Button>
              </div>
            )}

            {/* Scale settings */}
            {question.type === "scale" && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">De</Label>
                  <Input
                    type="number"
                    value={question.min_value ?? 1}
                    onChange={e => update("min_value", parseInt(e.target.value))}
                    className="w-16 h-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Até</Label>
                  <Input
                    type="number"
                    value={question.max_value ?? 5}
                    onChange={e => update("max_value", parseInt(e.target.value))}
                    className="w-16 h-9"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Obrigatória</Label>
              <Switch
                checked={question.required || false}
                onCheckedChange={v => update("required", v)}
              />
            </div>
            <Button variant="ghost" size="icon" onClick={onRemove} className="text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}