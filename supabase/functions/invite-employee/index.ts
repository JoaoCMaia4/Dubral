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

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          error: "Variáveis SUPABASE_URL ou SERVICE_ROLE_KEY em falta.",
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

    const inviteResult = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirect_to || "https://dubral.vercel.app/reset-password",
      data: {
        full_name: full_name || "",
        employee_id,
      },
    });

    if (inviteResult.error) {
      return new Response(
        JSON.stringify({
          error: inviteResult.error.message,
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

    const authUserId = inviteResult.data?.user?.id || null;

    if (authUserId) {
      const { error: updateError } = await adminClient
        .from("employees")
        .update({
          auth_user_id: authUserId,
          email,
        })
        .eq("id", employee_id);

      if (updateError) {
        return new Response(
          JSON.stringify({
            error: updateError.message,
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
    }

    return new Response(
      JSON.stringify({
        success: true,
        auth_user_id: authUserId,
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