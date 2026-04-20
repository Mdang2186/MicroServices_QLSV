export type AppRole = "SUPER_ADMIN" | "ACADEMIC_STAFF" | "LECTURER" | "STUDENT";

const ROLE_ALIASES: Record<string, AppRole> = {
  ADMIN: "SUPER_ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN_STAFF: "ACADEMIC_STAFF",
  ACADEMIC_STAFF: "ACADEMIC_STAFF",
  LECTURER: "LECTURER",
  STUDENT: "STUDENT",
};

export function normalizeRole(role?: string | null): AppRole | null {
  if (!role) return null;

  return ROLE_ALIASES[role.trim().toUpperCase()] ?? null;
}

export function isWebAdminRole(
  role?: string | null,
): role is "SUPER_ADMIN" | "ACADEMIC_STAFF" | "LECTURER" {
  const normalizedRole = normalizeRole(role);
  return (
    normalizedRole === "SUPER_ADMIN" ||
    normalizedRole === "ACADEMIC_STAFF" ||
    normalizedRole === "LECTURER"
  );
}

export function getRoleBasePath(role?: string | null): string {
  switch (normalizeRole(role)) {
    case "SUPER_ADMIN":
      return "/admin";
    case "ACADEMIC_STAFF":
      return "/staff";
    case "LECTURER":
      return "/lecturer";
    default:
      return "/login";
  }
}

export function getDashboardPath(role?: string | null): string {
  const basePath = getRoleBasePath(role);
  return basePath === "/login" ? basePath : `${basePath}/dashboard`;
}
