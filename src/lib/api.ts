import type {
  AuthResultDto,
  BulkUpdateIncidentRequest,
  ClientUserDto,
  CreateIncidentCommand,
  CreateIncidentResponse,
  CustomFieldDto,
  CustomFieldValueDto,
  IncidentAnalyticsDto,
  IncidentAttachmentDto,
  IncidentDetailDto,
  IncidentEventDto,
  IncidentListItemDto,
  IncidentLookupDto,
  PagedResult,
  UpdateIncidentRequest,
} from "./types";

export type { BulkUpdateIncidentRequest };

const AUTH_TOKEN_KEY = "freightvis.token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setStoredToken(token: string) {
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearStoredToken() {
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
}

function baseUrl() {
  const v = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!v) throw new Error("Missing NEXT_PUBLIC_API_BASE_URL. Copy .env.local.example to .env.local and set it.");
  return v.replace(/\/$/, "");
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}${text ? `: ${text}` : ""}`);
  }

  if (res.status === 204) return undefined as T;

  return (await res.json()) as T;
}

export async function login(email: string, password: string): Promise<AuthResultDto> {
  return http<AuthResultDto>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function updateProfile(displayName: string, email: string): Promise<{ displayName: string; email: string }> {
  return http<{ displayName: string; email: string }>("/api/v1/auth/profile", {
    method: "PUT",
    body: JSON.stringify({ displayName, email }),
  });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return http<void>("/api/v1/auth/password", {
    method: "PUT",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function adminGetClients() {
  return http<import("./types").AdminClientDto[]>("/api/v1/admin/clients");
}

export async function adminCreateClient(name: string, parentClientId?: string) {
  return http<import("./types").AdminClientDto>("/api/v1/admin/clients", {
    method: "POST",
    body: JSON.stringify({ name, parentClientId: parentClientId ?? null }),
  });
}

export async function adminUpdateClient(id: string, payload: {
  name: string; parentClientId: string | null; isActive: boolean;
}) {
  return http<void>(`/api/v1/admin/clients/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function adminToggleClientActive(id: string) {
  return http<{ id: string; isActive: boolean }>(`/api/v1/admin/clients/${id}/toggle-active`, {
    method: "PATCH",
  });
}

export async function adminGetUsers() {
  return http<import("./types").AdminUserDto[]>("/api/v1/admin/users");
}

export async function adminCreateUser(payload: {
  email: string; displayName: string; password: string; isSuperAdmin: boolean;
}) {
  return http<import("./types").AdminUserDto>("/api/v1/admin/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function adminUpdateUser(id: string, payload: {
  email: string; displayName: string; isActive: boolean; isSuperAdmin: boolean;
}) {
  return http<void>(`/api/v1/admin/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function adminToggleUserActive(id: string) {
  return http<{ id: string; isActive: boolean }>(`/api/v1/admin/users/${id}/toggle-active`, {
    method: "PATCH",
  });
}

export async function adminChangePassword(id: string, newPassword: string) {
  return http<void>(`/api/v1/admin/users/${id}/password`, {
    method: "PUT",
    body: JSON.stringify({ newPassword }),
  });
}

export async function adminGetUserClients(userId: string) {
  return http<import("./types").UserClientAccessDto[]>(`/api/v1/admin/users/${userId}/clients`);
}

export async function adminGrantClientAccess(userId: string, clientId: string, role: string) {
  return http<void>(`/api/v1/admin/users/${userId}/clients`, {
    method: "POST",
    body: JSON.stringify({ clientId, role }),
  });
}

export async function adminRevokeClientAccess(userId: string, clientId: string) {
  return http<void>(`/api/v1/admin/users/${userId}/clients/${clientId}`, {
    method: "DELETE",
  });
}

// ── Clients ───────────────────────────────────────────────────────────────────

export async function getClientUsers(clientId: string): Promise<ClientUserDto[]> {
  return http<ClientUserDto[]>(`/api/v1/clients/${clientId}/users`);
}

export async function addClientUser(clientId: string, email: string, role: string): Promise<ClientUserDto> {
  return http<ClientUserDto>(`/api/v1/clients/${clientId}/users`, {
    method: "POST",
    body: JSON.stringify({ email, role }),
  });
}

export async function inviteClientUser(
  clientId: string, email: string, displayName: string, password: string, role: string,
): Promise<ClientUserDto> {
  return http<ClientUserDto>(`/api/v1/clients/${clientId}/invite`, {
    method: "POST",
    body: JSON.stringify({ email, displayName, password, role }),
  });
}

export async function getFamilyUsers(clientId: string): Promise<ClientUserDto[]> {
  return http<ClientUserDto[]>(`/api/v1/clients/${clientId}/family-users`);
}

export async function updateClientUser(clientId: string, userId: string, displayName: string, email: string): Promise<void> {
  return http<void>(`/api/v1/clients/${clientId}/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify({ displayName, email }),
  });
}

export async function updateClientUserRole(clientId: string, userId: string, role: string): Promise<void> {
  return http<void>(`/api/v1/clients/${clientId}/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function removeClientUser(clientId: string, userId: string): Promise<void> {
  return http<void>(`/api/v1/clients/${clientId}/users/${userId}`, {
    method: "DELETE",
  });
}

// ── Lookups ───────────────────────────────────────────────────────────────────

export async function getLookups(clientId: string, fieldKey: string): Promise<IncidentLookupDto[]> {
  const qs = new URLSearchParams({ clientId, fieldKey });
  return http<IncidentLookupDto[]>(`/api/v1/lookups?${qs.toString()}`);
}

export async function createLookup(clientId: string, fieldKey: string, label: string): Promise<IncidentLookupDto> {
  return http<IncidentLookupDto>("/api/v1/lookups", {
    method: "POST",
    body: JSON.stringify({ clientId, fieldKey, label }),
  });
}

export async function updateLookup(id: string, clientId: string, label: string, sortOrder: number): Promise<void> {
  return http<void>(`/api/v1/lookups/${id}`, {
    method: "PUT",
    body: JSON.stringify({ clientId, label, sortOrder }),
  });
}

export async function deleteLookup(id: string, clientId: string): Promise<void> {
  return http<void>(`/api/v1/lookups/${id}?clientId=${clientId}`, {
    method: "DELETE",
  });
}

// ── Custom Fields ─────────────────────────────────────────────────────────────

export async function getCustomFields(clientId: string): Promise<CustomFieldDto[]> {
  return http<CustomFieldDto[]>(`/api/v1/custom-fields?clientId=${clientId}`);
}

export async function createCustomField(payload: {
  clientId: string; name: string; dataType: string; isRequired: boolean; options: string | null;
}): Promise<CustomFieldDto> {
  return http<CustomFieldDto>("/api/v1/custom-fields", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateCustomField(id: string, payload: {
  clientId: string; name: string; dataType: string; isRequired: boolean; sortOrder: number; options: string | null;
}): Promise<void> {
  return http<void>(`/api/v1/custom-fields/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteCustomField(id: string, clientId: string): Promise<void> {
  return http<void>(`/api/v1/custom-fields/${id}?clientId=${clientId}`, {
    method: "DELETE",
  });
}

export async function getCustomFieldValues(incidentId: string, clientId: string): Promise<CustomFieldValueDto[]> {
  const qs = new URLSearchParams({ incidentId, clientId });
  return http<CustomFieldValueDto[]>(`/api/v1/custom-fields/values?${qs.toString()}`);
}

export async function upsertCustomFieldValues(
  incidentId: string,
  clientId: string,
  values: { customFieldId: string; value: string }[],
): Promise<void> {
  return http<void>("/api/v1/custom-fields/values", {
    method: "PUT",
    body: JSON.stringify({ incidentId, clientId, values }),
  });
}

export type IncidentFilters = {
  type?: number;
  status?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

export async function getIncidents(clientId: string, page = 1, pageSize = 25, filters?: IncidentFilters) {
  const qs = new URLSearchParams({ clientId, page: String(page), pageSize: String(pageSize) });
  if (filters?.type)     qs.set("type",     String(filters.type));
  if (filters?.status)   qs.set("status",   String(filters.status));
  if (filters?.dateFrom) qs.set("dateFrom", filters.dateFrom);
  if (filters?.dateTo)   qs.set("dateTo",   filters.dateTo);
  if (filters?.search)   qs.set("search",   filters.search);
  return await http<PagedResult<IncidentListItemDto>>(`/api/v1/incidents?${qs.toString()}`);
}

export async function getIncidentAnalytics(clientIds: string | string[]) {
  const ids = Array.isArray(clientIds) ? clientIds : [clientIds];
  const qs = new URLSearchParams();
  ids.forEach(id => qs.append("clientIds", id));
  return await http<IncidentAnalyticsDto>(`/api/v1/incidents/analytics?${qs.toString()}`);
}

export async function getIncidentDetail(id: string) {
  return await http<IncidentDetailDto>(`/api/v1/incidents/${id}`);
}

export async function getIncidentByRef(refNumber: number, clientId: string) {
  return await http<IncidentDetailDto>(`/api/v1/incidents/ref/${refNumber}?clientId=${clientId}`);
}

export async function createIncident(payload: CreateIncidentCommand) {
  return await http<CreateIncidentResponse>(`/api/v1/incidents`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateIncident(id: string, payload: UpdateIncidentRequest) {
  return await http<void>(`/api/v1/incidents/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function bulkUpdateIncidents(payload: BulkUpdateIncidentRequest): Promise<{ updated: number }> {
  return http<{ updated: number }>("/api/v1/incidents/bulk", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function exportIncidentsCsv(clientId: string, filters?: IncidentFilters, filename?: string): Promise<void> {
  const qs = new URLSearchParams({ clientId });
  if (filters?.type)     qs.set("type",     String(filters.type));
  if (filters?.status)   qs.set("status",   String(filters.status));
  if (filters?.dateFrom) qs.set("dateFrom", filters.dateFrom);
  if (filters?.dateTo)   qs.set("dateTo",   filters.dateTo);
  if (filters?.search)   qs.set("search",   filters.search);

  const token = getStoredToken();
  const res = await fetch(`${baseUrl()}/api/v1/incidents/export?${qs.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename ?? `incidents-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Incident Events ───────────────────────────────────────────────────────────

export async function getIncidentEvents(incidentId: string): Promise<IncidentEventDto[]> {
  return http<IncidentEventDto[]>(`/api/v1/incidents/${incidentId}/events`);
}

export async function createIncidentComment(incidentId: string, body: string): Promise<IncidentEventDto> {
  return http<IncidentEventDto>(`/api/v1/incidents/${incidentId}/events`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export async function deleteIncidentEvent(incidentId: string, eventId: string): Promise<void> {
  return http<void>(`/api/v1/incidents/${incidentId}/events/${eventId}`, {
    method: "DELETE",
  });
}

// ── Incident Attachments ──────────────────────────────────────────────────────

export async function getIncidentAttachments(incidentId: string): Promise<IncidentAttachmentDto[]> {
  return http<IncidentAttachmentDto[]>(`/api/v1/incidents/${incidentId}/attachments`);
}

export async function getAttachmentUrl(incidentId: string, attachmentId: string): Promise<{ url: string }> {
  return http<{ url: string }>(`/api/v1/incidents/${incidentId}/attachments/${attachmentId}/url`);
}

export async function deleteIncidentAttachment(incidentId: string, attachmentId: string): Promise<void> {
  return http<void>(`/api/v1/incidents/${incidentId}/attachments/${attachmentId}`, {
    method: "DELETE",
  });
}

export async function uploadIncidentAttachment(incidentId: string, file: File): Promise<IncidentAttachmentDto> {
  const token    = getStoredToken();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${baseUrl()}/api/v1/incidents/${incidentId}/attachments`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}${text ? `: ${text}` : ""}`);
  }
  return (await res.json()) as IncidentAttachmentDto;
}
