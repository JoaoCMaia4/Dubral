import React, { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const waitForSession = async () => {
      let tries = 0;

      while (tries < 20) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          console.log("SESSION READY");
          window.history.replaceState({}, "", "/reset-password");
          setSessionReady(true);
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 300));
        tries++;
      }

      console.log("SESSION NOT FOUND");
    };

    waitForSession();
  }, []);

  const handleUpdatePassword = async (event) => {
    event.preventDefault();

    if (isLoading) return;

    if (!password || password.length < 6) {
      toast.error("A password deve ter pelo menos 6 caracteres.");
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    console.log("SESSION:", session);

    if (!session) {
      toast.error("A sessão ainda não está pronta. Aguarde 2 segundos e tente novamente.");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        toast.error(error.message);
        return;
      }

      await supabase.auth.refreshSession();

      toast.success("Password alterada com sucesso.");

      await supabase.auth.signOut();

      navigate("/login");
    } finally {
      setIsLoading(false);
    }
  };

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">
          A validar ligação...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <form onSubmit={handleUpdatePassword} className="w-full max-w-md space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Nova password</h1>
          <p className="text-muted-foreground mt-1">
            Introduza a nova password da sua conta.
          </p>
        </div>

        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="Nova password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="pr-10"
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading || !sessionReady}>
          {isLoading ? "A guardar..." : "Guardar nova password"}
        </Button>
      </form>
    </div>
  );
}