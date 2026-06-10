import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { email, display_name, employee_number, sector_id, position_ids, role } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email é obrigatório.' }, { status: 400 });
    }

    // Invite the user via platform (sends email with set-password link)
    await base44.users.inviteUser(email, role || 'user');

    // Create the employee record
    const employee = await base44.asServiceRole.entities.Employee.create({
      display_name,
      email,
      employee_number,
      sector_id,
      position_ids: position_ids || [],
      role: role || 'user',
      invite_status: 'active',
    });

    return Response.json({ success: true, employee });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});