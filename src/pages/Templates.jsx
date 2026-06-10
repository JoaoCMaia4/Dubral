import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookTemplate, Plus, Copy, Trash2, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";

export default function Templates() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { employee } = useOutletContext();

  const [saveDialog, setSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [selectedSurvey, setSelectedSurvey] = useState(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("surveys")
        .select("*")
        .eq("is_template", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const { data: surveys = [] } = useQuery({
    queryKey: ["surveys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("surveys")
        .select("*")
        .eq("is_template", false)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
  });

  const createFromTemplate = useMutation({
    mutationFn: async (template) => {
      const {
        id,
        created_at,
        updated_at,
        response_count,
        template_name,
        ...data
      } = template;

      const { error } = await supabase
        .from("surveys")
        .insert({
          ...data,
          title: `${template.template_name || template.title} (Cópia)`,
          is_template: false,
          template_name: null,
          status: "draft",
          response_count: 0,
          created_by_id: employee?.id || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      toast.success("Questionário criado a partir do modelo.");
      navigate("/surveys");
    },
    onError: (err) => {
      console.error(err);
      toast.error(err.message || "Erro ao criar questionário a partir do modelo.");
    },
  });

  const saveAsTemplate = useMutation({
    mutationFn: async () => {
      if (!selectedSurvey) throw new Error("Seleciona um questionário.");

      const {
        id,
        created_at,
        updated_at,
        response_count,
        ...data
      } = selectedSurvey;

      const finalName = templateName.trim() || selectedSurvey.title;

      const { error } = await supabase
        .from("surveys")
        .insert({
          ...data,
          title: finalName,
          template_name: finalName,
          is_template: true,
          status: "draft",
          response_count: 0,
          created_by_id: employee?.id || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      setSaveDialog(false);
      setTemplateName("");
      setSelectedSurvey(null);
      toast.success("Modelo guardado com sucesso.");
    },
    onError: (err) => {
      console.error(err);
      toast.error(err.message || "Erro ao guardar modelo.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (templateId) => {
      const { error } = await supabase
        .from("surveys")
        .delete()
        .eq("id", templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Modelo eliminado.");
    },
    onError: (err) => {
      console.error(err);
      toast.error("Erro ao eliminar modelo.");
    },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Modelos</h1>
          <p className="text-muted-foreground mt-1">
            Modelos reutilizáveis de questionários.
          </p>
        </div>

        <Button onClick={() => setSaveDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Guardar como Modelo
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <BookTemplate className="w-10 h-10 mx-auto mb-2" />
            <p>Nenhum modelo criado ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <BookTemplate className="w-5 h-5 text-primary" />
                    </div>

                    <div>
                      <CardTitle className="text-base">
                        {template.template_name || template.title}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {template.questions?.length || 0} pergunta{template.questions?.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => createFromTemplate.mutate(template)}
                  className="flex-1"
                  disabled={createFromTemplate.isPending}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Usar
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(template.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={saveDialog} onOpenChange={setSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guardar Questionário como Modelo</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Selecionar questionário</Label>

              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                {surveys.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Ainda não existem questionários para guardar como modelo.
                  </p>
                ) : (
                  surveys.map((survey) => (
                    <label
                      key={survey.id}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedSurvey?.id === survey.id ? "bg-primary/10" : "hover:bg-accent"
                      }`}
                      onClick={() => setSelectedSurvey(survey)}
                    >
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{survey.title}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nome do modelo</Label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Ex: Avaliação de Formação"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialog(false)}>
              Cancelar
            </Button>

            <Button
              onClick={() => saveAsTemplate.mutate()}
              disabled={!selectedSurvey || saveAsTemplate.isPending}
            >
              {saveAsTemplate.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Guardar Modelo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}