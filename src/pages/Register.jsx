import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Register() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-bold">Registo indisponível</h1>
        <p className="text-muted-foreground">
          O registo público está desativado. As contas devem ser criadas pelo administrador.
        </p>
        <Link to="/login">
          <Button>Ir para login</Button>
        </Link>
      </div>
    </div>
  );
}