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
    const { employee_id } = await req.json();

    if (!employee_id) {
      return new Response(
        JSON.stringify({
          error: "employee_id é obrigatório.",
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

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");

    if (!jwt) {
      return new Response(
        JSON.stringify({
          error: "Sessão inválida. Faça login novamente.",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data: callerData, error: callerError } =
      await adminClient.auth.getUser(jwt);

    if (callerError || !callerData?.user) {
      return new Response(
        JSON.stringify({
          error: "Não foi possível validar o utilizador atual.",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const callerAuthUserId = callerData.user.id;

    const { data: callerEmployee, error: callerEmployeeError } =
      await adminClient
        .from("employees")
        .select("id, role, email")
        .eq("auth_user_id", callerAuthUserId)
        .maybeSingle();

    if (callerEmployeeError) {
      return new Response(
        JSON.stringify({
          error: callerEmployeeError.message,
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

    if (!callerEmployee || callerEmployee.role !== "admin") {
      return new Response(
        JSON.stringify({
          error: "Não tem permissão para apagar funcionários.",
        }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data: employee, error: employeeError } = await adminClient
      .from("employees")
      .select("id, full_name, email, auth_user_id")
      .eq("id", employee_id)
      .maybeSingle();

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

    if (!employee) {
      return new Response(
        JSON.stringify({
          error: "Funcionário não encontrado.",
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

    if (employee.auth_user_id && employee.auth_user_id === callerAuthUserId) {
      return new Response(
        JSON.stringify({
          error: "Não pode apagar a sua própria conta enquanto está com sessão iniciada.",
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

    const { error: positionsError } = await adminClient
      .from("employee_positions")
      .delete()
      .eq("employee_id", employee_id);

    if (positionsError) {
      return new Response(
        JSON.stringify({
          error: positionsError.message,
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

    const { error: employeeDeleteError } = await adminClient
      .from("employees")
      .delete()
      .eq("id", employee_id);

    if (employeeDeleteError) {
      return new Response(
        JSON.stringify({
          error: employeeDeleteError.message,
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

    let authDeleted = false;

    if (employee.auth_user_id) {
      const { error: authDeleteError } =
        await adminClient.auth.admin.deleteUser(employee.auth_user_id);

      if (authDeleteError) {
        return new Response(
          JSON.stringify({
            error: `Funcionário apagado da aplicação, mas houve erro ao apagar do Authentication: ${authDeleteError.message}`,
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

      authDeleted = true;
    }

    return new Response(
      JSON.stringify({
        success: true,
        employee_deleted: true,
        auth_deleted: authDeleted,
        email: employee.email,
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