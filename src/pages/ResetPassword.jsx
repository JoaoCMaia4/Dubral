import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useEffect } from "react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      console.log("SESSION:", session);
      console.log("URL:", window.location.href);
    }

    checkSession();
  }, []);

  const handleUpdatePassword = async (event) => {
    event.preventDefault();

    if (!password || password.length < 6) {
      toast.error("A password deve ter pelo menos 6 caracteres.");
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    console.log("UPDATE ERROR:", error);

    setIsLoading(false);

    if (error) {
      toast.error(error.message || "Erro ao alterar password.");
      return;
    }

    toast.success("Password alterada com sucesso.");
    navigate("/login");
  };

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

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "A guardar..." : "Guardar nova password"}
        </Button>
      </form>
    </div>
  );
}