/**
 * Shared role-check helpers.
 *
 * The hierarchy is:  Viewer < Investigator < Manager < Admin
 * "Member" is treated as equivalent to "Investigator" for backwards compatibility.
 * Super-admins bypass all role gates.
 */

export function isAdmin(isSuperAdmin: boolean, role?: string | null): boolean {
  return isSuperAdmin || role === "Admin";
}

export function isManagerOrAbove(isSuperAdmin: boolean, role?: string | null): boolean {
  return isSuperAdmin || ["Admin", "Manager"].includes(role ?? "");
}

export function isInvestigatorOrAbove(isSuperAdmin: boolean, role?: string | null): boolean {
  return isSuperAdmin || ["Admin", "Manager", "Investigator", "Member"].includes(role ?? "");
}
