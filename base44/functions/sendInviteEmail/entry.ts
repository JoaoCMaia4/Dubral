import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employee } = await req.json();

    if (!employee?.email) {
      return Response.json({ error: 'Email do funcionário em falta.' }, { status: 400 });
    }

    // The platform's inviteUser sends an activation email.
    // The link in the email goes to /register on the published app.
    // The Register page reads ?email= to pre-fill and show the "Ativar conta" flow.
    await base44.users.inviteUser(employee.email, employee.role || "user");

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});