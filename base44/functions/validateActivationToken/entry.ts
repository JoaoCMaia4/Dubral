import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();

    if (!token) {
      return Response.json({ error: 'Token obrigatório.' }, { status: 400 });
    }

    const sdk = base44.asServiceRole;
    const employees = await sdk.entities.Employee.filter({ activation_token: token });

    if (!employees || employees.length === 0) {
      return Response.json({ error: 'Token inválido ou expirado.' }, { status: 404 });
    }

    const employee = employees[0];
    return Response.json({ email: employee.email, name: employee.display_name });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});