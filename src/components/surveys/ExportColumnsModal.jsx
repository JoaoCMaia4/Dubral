import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";

const META_COLUMNS = [
  { key: "employee_number", label: "Nº Funcionário", defaultOn: true },
  { key: "full_name", label: "Nome Completo", defaultOn: true },
  { key: "email", label: "Email", defaultOn: false },
  { key: "sector", label: "Setor", defaultOn: false },
  { key: "positions", label: "Cargo(s)", defaultOn: false },
  { key: "timestamp", label: "Data/Hora Resposta", defaultOn: false },
];

export default function ExportColumnsModal({
  open,
  onClose,
  survey,
  responses = [],
}) {
  const questionCols = (survey?.questions || []).map((question) => ({
    key: `q_${question.id}`,
    label: question.title,
    defaultOn: true,
    questionId: question.id,
  }));

  const allCols = [...META_COLUMNS, ...questionCols];

  const [selected, setSelected] = useState({});

  useEffect(() => {
    if (open) {
      const init = {};
      allCols.forEach((column) => {
        init[column.key] = column.defaultOn;
      });
      setSelected(init);
    }
  }, [open, survey?.id]);

  const toggle = (key) => {
    setSelected((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  };

  const getEmployee = (response) => {
    return response.employee || {};
  };

  const getPositionNames = (employee) => {
    return (
      employee.employee_positions
        ?.map((item) => item.position?.name)
        .filter(Boolean)
        .join("; ") || ""
    );
  };

  const getAnswerValue = (response, questionId) => {
    const value = response.answers?.[questionId];

    if (Array.isArray(value)) return value.join("; ");
    if (value === undefined || value === null) return "";
    return String(value);
  };

  const handleExport = () => {
    if (!survey || responses.length === 0) return;

    const selectedColumns = allCols.filter((column) => selected[column.key]);

    if (selectedColumns.length === 0) return;

    const headers = selectedColumns.map((column) => column.label);

    const rows = responses.map((response) => {
      const employee = getEmployee(response);

      return selectedColumns.map((column) => {
        if (column.key === "employee_number") {
          return employee.employee_number || "";
        }

        if (column.key === "full_name") {
          return employee.full_name || "Anónimo";
        }

        if (column.key === "email") {
          return employee.email || "";
        }

        if (column.key === "sector") {
          return employee.sector?.name || "";
        }

        if (column.key === "positions") {
          return getPositionNames(employee);
        }

        if (column.key === "timestamp") {
          return response.created_at
            ? new Date(response.created_at).toLocaleString("pt-PT")
            : "";
        }

        if (column.questionId) {
          return getAnswerValue(response, column.questionId);
        }

        return "";
      });
    });

    const worksheet = XLSX.utils.aoa_to_sheet([
      headers,
      ...rows,
    ]);

    const workbook = XLSX.utils.book_new();
    const statisticsRows = [];

    (survey.questions || []).forEach((question) => {

      if (
        ![
          "multiple_choice",
          "checkbox",
          "dropdown",
          "yes_no",
          "scale",
        ].includes(question.type)
      ) {
        return;
      }

      statisticsRows.push([question.title]);
      statisticsRows.push(["Opção", "Nº Respostas"]);

      const counts = {};

      responses.forEach((response) => {

        const answer = response.answers?.[question.id];

        if (!answer) return;

        const values = Array.isArray(answer)
          ? answer
          : [answer];

        values.forEach((value) => {
          counts[value] = (counts[value] || 0) + 1;
        });

      });

      Object.entries(counts).forEach(([option, total]) => {
        statisticsRows.push([option, total]);
      });

      statisticsRows.push([]);
    });

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Respostas"
    );

    const statisticsSheet = XLSX.utils.aoa_to_sheet(statisticsRows);

    XLSX.utils.book_append_sheet(
      workbook,
      statisticsSheet,
      "Estatísticas"
    );

    const fileName = `${survey.title || "questionario"} - Resultados.xlsx`
      .replace(/[\\/:*?"<>|]/g, "-");

    XLSX.writeFile(workbook, fileName);

    onClose();
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Selecionar colunas para exportar</DialogTitle>
        </DialogHeader>

        <div className="space-y-1 py-2">
          <p className="text-xs text-muted-foreground mb-3">
            Escolha as colunas que pretende incluir no ficheiro CSV.
          </p>

          <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1 pb-1">
              Dados do funcionário
            </p>

            {META_COLUMNS.map((column) => (
              <label
                key={column.key}
                className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-muted cursor-pointer"
              >
                <Checkbox
                  checked={!!selected[column.key]}
                  onCheckedChange={() => toggle(column.key)}
                />
                <span className="text-sm">{column.label}</span>
              </label>
            ))}

            {questionCols.length > 0 && (
              <>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-3 pb-1">
                  Perguntas
                </p>

                {questionCols.map((column) => (
                  <label
                    key={column.key}
                    className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-muted cursor-pointer"
                  >
                    <Checkbox
                      checked={!!selected[column.key]}
                      onCheckedChange={() => toggle(column.key)}
                    />
                    <span className="text-sm">{column.label}</span>
                  </label>
                ))}
              </>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>

          <Button
            onClick={handleExport}
            disabled={selectedCount === 0 || responses.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar ({selectedCount} col.)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}