import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const { survey_id, app_url } = await req.json();

    if (!survey_id) {
      return new Response(
        JSON.stringify({ error: "survey_id é obrigatório." }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
      return new Response(
        JSON.stringify({
          error: "Variáveis SUPABASE_URL, SERVICE_ROLE_KEY ou RESEND_API_KEY em falta.",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: survey, error: surveyError } = await adminClient
      .from("surveys")
      .select("*")
      .eq("id", survey_id)
      .maybeSingle();

    if (surveyError || !survey) {
      return new Response(
        JSON.stringify({
          error: surveyError?.message || "Questionário não encontrado.",
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    let employeesQuery = adminClient
      .from("employees")
      .select(`
        id,
        full_name,
        email,
        sector_id,
        role,
        employee_positions (
          position_id
        )
      `)
      .not("email", "is", null);

    const { data: employees, error: employeesError } = await employeesQuery;

    if (employeesError) {
      return new Response(
        JSON.stringify({ error: employeesError.message }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const targetEmployees = (employees || []).filter((employee) => {
      if (!employee.email) return false;

      if (survey.target_type === "all") {
        return true;
      }

      if (survey.target_type === "sector") {
        return survey.target_sector_ids?.includes(employee.sector_id);
      }

      if (survey.target_type === "position") {
        const employeePositionIds =
          employee.employee_positions?.map((item) => item.position_id) || [];

        return survey.target_position_ids?.some((positionId) =>
          employeePositionIds.includes(positionId)
        );
      }

      if (survey.target_type === "specific") {
        return survey.target_user_ids?.includes(employee.id);
      }

      return false;
    });

    const uniqueEmails = Array.from(
      new Map(
        targetEmployees.map((employee) => [
          employee.email.toLowerCase(),
          employee,
        ])
      ).values()
    );

    if (uniqueEmails.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          sent: 0,
          message: "Sem destinatários para este questionário.",
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const baseUrl = app_url || "https://dubral.vercel.app";
    const surveyLink = `${baseUrl}/surveys/${survey.id}/respond`;

    const subject = `Novo questionário: ${survey.title}`;

    let sent = 0;
    const errors: string[] = [];

    for (const employee of uniqueEmails) {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Novo questionário disponível</h2>

          <p>Olá ${employee.full_name || ""},</p>

          <p>Foi publicado um novo questionário na plataforma DUBRAL:</p>

          <h3>${survey.title}</h3>

          ${
            survey.description
              ? `<p>${survey.description}</p>`
              : ""
          }

          <p>Para responder, clique no botão abaixo:</p>

          <p style="margin: 24px 0;">
            <a
              href="${surveyLink}"
              style="background: #2563eb; color: white; padding: 12px 18px; border-radius: 8px; text-decoration: none; display: inline-block;"
            >
              Responder questionário
            </a>
          </p>

          <p>Se o botão não funcionar, copie e cole este link no navegador:</p>
          <p style="font-size: 12px; color: #555;">${surveyLink}</p>

          <hr style="margin: 24px 0;" />

          <p style="font-size: 12px; color: #777;">
            Email automático enviado pela plataforma DUBRAL.
          </p>
        </div>
      `;

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "DUBRAL <onboarding@resend.dev>",
          to: employee.email,
          subject,
          html,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        errors.push(`${employee.email}: ${result?.message || "Erro desconhecido"}`);
      } else {
        sent += 1;
      }
    }

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        sent,
        total: uniqueEmails.length,
        errors,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message || "Erro inesperado.",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});