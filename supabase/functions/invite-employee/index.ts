import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const generateTemporaryPassword = () => {
  return crypto.randomUUID() + "!Aa1";
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const { email, employee_id, full_name, redirect_to } = await req.json();

    if (!email || !employee_id) {
      return new Response(
        JSON.stringify({
          error: "Email e employee_id são obrigatórios.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();

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

    const temporaryPassword = generateTemporaryPassword();

    const createResult = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || "",
        employee_id,
      },
    });

    if (createResult.error) {
      return new Response(
        JSON.stringify({
          error: createResult.error.message,
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const authUserId = createResult.data?.user?.id || null;

    if (!authUserId) {
      return new Response(
        JSON.stringify({
          error: "Utilizador Auth criado sem ID.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { error: employeeError } = await adminClient
      .from("employees")
      .update({
        auth_user_id: authUserId,
        email: cleanEmail,
      })
      .eq("id", employee_id);

    if (employeeError) {
      return new Response(
        JSON.stringify({
          error: employeeError.message,
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const resetResult = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: cleanEmail,
      options: {
        redirectTo: redirect_to || "https://dubral.vercel.app/reset-password",
      },
    });

    if (resetResult.error) {
      return new Response(
        JSON.stringify({
          error: resetResult.error.message,
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const actionLink =
      resetResult.data?.properties?.action_link ||
      resetResult.data?.action_link;

    if (!actionLink) {
      return new Response(
        JSON.stringify({
          error: "Não foi possível gerar link para definir password.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Bem-vindo à DUBRAL</h2>

        <p>Olá ${full_name || ""},</p>

        <p>A sua conta foi criada na plataforma DUBRAL.</p>

        <p>Para definir a sua password e entrar na plataforma, clique no botão abaixo:</p>

        <p style="margin: 24px 0;">
          <a
            href="${actionLink}"
            style="background: #2563eb; color: white; padding: 12px 18px; border-radius: 8px; text-decoration: none; display: inline-block;"
          >
            Definir password
          </a>
        </p>

        <p>Se o botão não funcionar, copie e cole este link no navegador:</p>
        <p style="font-size: 12px; color: #555; word-break: break-all;">${actionLink}</p>

        <hr style="margin: 24px 0;" />

        <p style="font-size: 12px; color: #777;">
          Email automático enviado pela plataforma DUBRAL.
        </p>
      </div>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "DUBRAL <noreply@dubral.dedyn.io>",
        to: cleanEmail,
        subject: "Definir password - DUBRAL",
        html,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      return new Response(
        JSON.stringify({
          error: emailResult?.message || "Erro ao enviar email pelo Resend.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        auth_user_id: authUserId,
        email_sent: true,
      }),
      {
        status: 200,
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