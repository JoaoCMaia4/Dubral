import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async (event) => {
    event.preventDefault();

    if (!email.trim()) {
      toast.error("Introduza o seu email.");
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setIsLoading(false);

    if (error) {
      toast.error(error.message || "Erro ao enviar recuperação.");
      return;
    }

    toast.success("Email de recuperação enviado, se a conta existir.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <form onSubmit={handleReset} className="w-full max-w-md space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Recuperar password</h1>
          <p className="text-muted-foreground mt-1">
            Escreva o seu email para receber o link de recuperação.
          </p>
        </div>

        <Input
          type="email"
          placeholder="email@empresa.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "A enviar..." : "Enviar email de recuperação"}
        </Button>
      </form>
    </div>
  );
}