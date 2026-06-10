import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const isAdmin = user.role === 'admin';
    if (!isAdmin) {
      const employees = await base44.asServiceRole.entities.Employee.filter({ email: user.email });
      const empRecord = employees?.[0];
      if (!empRecord?.position_ids?.length) {
        return Response.json({ error: 'Acesso negado.' }, { status: 403 });
      }
      const positions = await base44.asServiceRole.entities.Position.list();
      const userPositions = positions.filter(p => empRecord.position_ids.includes(p.id));
      const hasManageEmployees = userPositions.some(p => p.permissions?.includes('manage_employees'));
      if (!hasManageEmployees) {
        return Response.json({ error: 'Acesso negado.' }, { status: 403 });
      }
    }

    const { employeeId } = await req.json();
    if (!employeeId) {
      return Response.json({ error: 'employeeId obrigatório.' }, { status: 400 });
    }

    const employee = await base44.asServiceRole.entities.Employee.get(employeeId);
    if (!employee?.email) {
      return Response.json({ error: 'Funcionário não encontrado.' }, { status: 404 });
    }

    // Use platform inviteUser — sends a branded email with a direct password-setup link, no OTP needed
    await base44.users.inviteUser(employee.email, employee.role || 'user');

    // Mark employee as active since invite was sent
    await base44.asServiceRole.entities.Employee.update(employeeId, {
      invite_status: 'active',
      activation_token: null,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});