// All available permissions in the system
export const ALL_PERMISSIONS = [
  // Survey responding
  { key: "respond_surveys", label: "Responder questionários" },
  // Survey creation/editing
  { key: "create_own_surveys", label: "Criar/editar questionários próprios" },
  { key: "create_all_surveys", label: "Criar/editar questionários total" },
  // Results access
  { key: "view_own_responses", label: "Ver respostas dos próprios questionários" },
  { key: "view_own_position_responses", label: "Ver respostas dos questionários do próprio cargo" },
  { key: "view_responses", label: "Ver todas as respostas" },
  { key: "export_data", label: "Exportar dados" },
  // Administration
  { key: "manage_employees", label: "Gerir funcionários" },
  { key: "manage_positions", label: "Gerir cargos e permissões" },
  { key: "manage_sectors", label: "Gerir setores" },
  { key: "manage_system", label: "Configurar sistema" },
  { key: "view_audit_log", label: "Ver auditoria" },
  // Templates
  { key: "manage_templates", label: "Gerir modelos" },
];

// Shorthand permission groups for easy assignment
export const PERMISSION_GROUPS = {
  respond: ["respond_surveys"],
  own_surveys: ["create_own_surveys", "view_own_responses", "export_data", "manage_templates"],
  all_surveys: ["create_own_surveys", "create_all_surveys", "view_responses", "export_data", "manage_templates"],
  total: [
    "respond_surveys", "create_own_surveys", "create_all_surveys",
    "view_responses", "export_data", "manage_templates",
    "manage_employees", "manage_positions", "manage_sectors",
    "manage_system", "view_audit_log"
  ],
};

// Check if user has a specific permission based on their positions
export function hasPermission(user, positions, permission) {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (!user.position_ids || !positions) return false;

  const userPositions = positions.filter(p => user.position_ids.includes(p.id));

  // Map legacy permissions to new ones
  const legacyMap = {
    create_surveys: ["create_own_surveys", "create_all_surveys"],
    edit_surveys: ["create_own_surveys", "create_all_surveys"],
    delete_surveys: ["create_own_surveys", "create_all_surveys"],
    view_all_surveys: ["create_all_surveys", "view_responses"],
    view_own_surveys: ["create_own_surveys"],
  };

  const toCheck = legacyMap[permission] || [permission];
  return userPositions.some(p =>
    toCheck.some(perm => p.permissions?.includes(perm))
  );
}

// Check if user can create surveys (own or all)
export function canCreateSurveys(user, positions) {
  return hasPermission(user, positions, "create_own_surveys") || hasPermission(user, positions, "create_all_surveys");
}

// Check if user can edit a specific survey
export function canEditSurvey(user, positions, survey) {
  if (!user || !survey) return false;
  if (user.role === "admin") return true;
  if (hasPermission(user, positions, "create_all_surveys")) return true;
  if (hasPermission(user, positions, "create_own_surveys") && survey.created_by_id === user.id) return true;
  return false;
}

// Get all permissions for a user
export function getUserPermissions(user, positions) {
  if (!user) return [];
  if (user.role === "admin") return ALL_PERMISSIONS.map(p => p.key);
  if (!user.position_ids || !positions) return [];

  const userPositions = positions.filter(p => user.position_ids.includes(p.id));
  const perms = new Set();
  userPositions.forEach(p => {
    p.permissions?.forEach(perm => perms.add(perm));
  });
  return Array.from(perms);
}