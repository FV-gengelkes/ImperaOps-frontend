import type {
  AdminAuditEventDto,
  AdminClientDto,
  AdminClientUserDto,
  AdminUserDto,
  WorkflowRuleDto,
  WorkflowRuleExecutionDto,
  AiCategorizeResponse,
  AiInvestigateResponse,
  AiTrendAnalysisResponse,
  ApiCredentialAuditLogDto,
  ApiCredentialCreatedDto,
  ApiCredentialDto,
  AttachmentDto,
  AuditEventDto,
  AuthResultDto,
  BulkDeleteEventRequest,
  BulkUpdateEventRequest,
  ClientBrandingDto,
  ClientDocumentDto,
  ClientInboundEmailDto,
  ClientUserDto,
  ClientWebhookDto,
  CreateApiCredentialRequest,
  CreateEventRequest,
  CreateEventResponse,
  CustomFieldDto,
  CustomFieldValueDto,
  DocumentReferenceDto,
  EvidenceDto,
  EventAnalyticsDto,
  EventDetailDto,
  EventLinkGroupDetailDto,
  EventLinkGroupDto,
  EventListItemDto,
  EventTemplateDto,
  EventTypeDto,
  InsightAlertDto,
  InsightSummaryDto,
  InvestigationDto,
  LoginResult,
  MyTaskDto,
  WorkloadRowDto,
  NotificationDto,
  NotificationPreferenceDto,
  PagedResult,
  PublicReportConfigDto,
  PublicReportRequest,
  RootCauseTaxonomyItemDto,
  SlaRuleDto,
  TaskDto,
  UpdateApiCredentialRequest,
  UpdateClientInboundEmailRequest,
  UpdateEventRequest,
  UpsertWebhookRequest,
  UserClientAccessDto,
  WitnessDto,
  WorkflowStatusDto,
  WorkflowTransitionDto,
  ReportScheduleDto,
  UpsertReportScheduleRequest,
  ModuleDefinitionDto,
  ClientModulesDto,
  AgFieldDto,
  AgFieldListItemDto,
  SprayJobDto,
  SprayJobListItemDto,
} from "./types";

export type { BulkDeleteEventRequest, BulkUpdateEventRequest };

const AUTH_TOKEN_KEY = "imperaops.token";

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
  const v = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  return v.replace(/\/$/, "");
}

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

let _refreshing: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  const token = getStoredToken();
  if (!token) return false;
  try {
    const res = await fetch(`${baseUrl()}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data?.token) { setStoredToken(data.token); return true; }
    return false;
  } catch { return false; }
}

function forceLogout() {
  clearStoredToken();
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("imperaops.user");
    window.localStorage.removeItem("imperaops.clients");
    window.localStorage.removeItem("imperaops.isSuperAdmin");
    window.localStorage.removeItem("imperaops.clientId");
    window.location.href = "/login";
  }
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
    if (res.status === 401 && path !== "/api/v1/auth/refresh") {
      // Attempt silent refresh once, then retry the original request
      if (!_refreshing) _refreshing = tryRefreshToken().finally(() => { _refreshing = null; });
      const refreshed = await _refreshing;
      if (refreshed) return http<T>(path, init);
      forceLogout();
    }
    const text = await res.text();
    throw new ApiError(res.status, `${res.status} ${res.statusText}${text ? `: ${text}` : ""}`);
  }

  if (res.status === 204) return undefined as T;

  return (await res.json()) as T;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<LoginResult> {
  return http<LoginResult>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function setupTotp(): Promise<{ secret: string; qrCodeUri: string }> {
  return http<{ secret: string; qrCodeUri: string }>("/api/v1/auth/totp/setup", { method: "POST" });
}

export async function verifyTotpSetup(code: string): Promise<void> {
  return http<void>("/api/v1/auth/totp/verify-setup", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function disableTotp(password: string): Promise<void> {
  return http<void>("/api/v1/auth/totp/disable", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export async function verifyTotpChallenge(pendingToken: string, code: string): Promise<AuthResultDto> {
  return http<AuthResultDto>("/api/v1/auth/totp/challenge", {
    method: "POST",
    body: JSON.stringify({ pendingToken, code }),
  });
}

export async function getTotpStatus(): Promise<{ isTotpEnabled: boolean }> {
  return http<{ isTotpEnabled: boolean }>("/api/v1/auth/totp/status");
}

export async function adminDisableUserTotp(userId: number): Promise<void> {
  return http<void>(`/api/v1/admin/users/${userId}/totp/disable`, { method: "POST" });
}

export async function adminDeleteUser(userId: number): Promise<void> {
  return http<void>(`/api/v1/admin/users/${userId}`, { method: "DELETE" });
}

export async function updateProfile(displayName: string, email: string): Promise<{ displayName: string; email: string }> {
  return http<{ displayName: string; email: string }>("/api/v1/auth/profile", {
    method: "PUT",
    body: JSON.stringify({ displayName, email }),
  });
}

export async function setActiveClient(clientId: number): Promise<void> {
  return http<void>("/api/v1/auth/active-client", {
    method: "PUT",
    body: JSON.stringify({ clientId }),
  });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return http<void>("/api/v1/auth/password", {
    method: "PUT",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function getSessions(): Promise<import("./types").SessionDto[]> {
  return http<import("./types").SessionDto[]>("/api/v1/sessions");
}

export async function revokeSession(id: number): Promise<void> {
  return http<void>(`/api/v1/sessions/${id}`, { method: "DELETE" });
}

export async function revokeOtherSessions(): Promise<void> {
  return http<void>("/api/v1/sessions/others", { method: "DELETE" });
}

export async function forgotPassword(email: string): Promise<void> {
  return http<void>("/api/v1/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function validateToken(token: string): Promise<{ valid: boolean; type: string; email: string }> {
  return http<{ valid: boolean; type: string; email: string }>(`/api/v1/auth/validate-token?token=${encodeURIComponent(token)}`);
}

export async function setPassword(token: string, newPassword: string): Promise<AuthResultDto> {
  return http<AuthResultDto>("/api/v1/auth/set-password", {
    method: "POST",
    body: JSON.stringify({ token, newPassword }),
  });
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function adminGetClients(): Promise<AdminClientDto[]> {
  return http<AdminClientDto[]>("/api/v1/admin/clients");
}

export async function adminCreateClient(
  name: string,
  parentClientId?: number,
  templateId?: string,
  status?: string,
  seedDemoData?: boolean,
): Promise<AdminClientDto> {
  return http<AdminClientDto>("/api/v1/admin/clients", {
    method: "POST",
    body: JSON.stringify({
      name,
      parentClientId: parentClientId ?? null,
      templateId: templateId ?? null,
      status: status ?? "Active",
      seedDemoData: seedDemoData ?? false,
    }),
  });
}

export async function adminGetTemplates(): Promise<EventTemplateDto[]> {
  return http<EventTemplateDto[]>("/api/v1/event-templates");
}

export async function adminApplyTemplate(clientId: number, templateId: string, seedDemoData = false): Promise<void> {
  const qs = seedDemoData ? "?seedDemoData=true" : "";
  return http<void>(`/api/v1/admin/clients/${clientId}/apply-template/${templateId}${qs}`, {
    method: "POST",
  });
}

// ── Client-scoped templates (for onboarding wizard) ─────────────────

export async function exportAuditCsv(clientId: number): Promise<void> {
  const token = getStoredToken();
  const res = await fetch(`${baseUrl()}/api/v1/clients/${clientId}/audit/export`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, "Export failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = res.headers.get("content-disposition")?.match(/filename=(.+)/)?.[1] ?? `audit-log-${clientId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Report schedule ─────────────────────────────────────────────────────────

export async function getReportSchedule(clientId: number): Promise<ReportScheduleDto | null> {
  try {
    return await http<ReportScheduleDto>(`/api/v1/clients/${clientId}/report-schedule`);
  } catch (e: any) {
    if (e?.status === 404) return null;
    throw e;
  }
}

export async function upsertReportSchedule(clientId: number, body: UpsertReportScheduleRequest): Promise<ReportScheduleDto> {
  return http<ReportScheduleDto>(`/api/v1/clients/${clientId}/report-schedule`, { method: "PUT", body: JSON.stringify(body) });
}

export async function deleteReportSchedule(clientId: number): Promise<void> {
  await http<void>(`/api/v1/clients/${clientId}/report-schedule`, { method: "DELETE" });
}

export async function getClientTemplates(clientId: number): Promise<EventTemplateDto[]> {
  return http<EventTemplateDto[]>(`/api/v1/clients/${clientId}/templates`);
}

export async function applyClientTemplate(clientId: number, templateId: string): Promise<void> {
  return http<void>(`/api/v1/clients/${clientId}/apply-template/${templateId}`, {
    method: "POST",
  });
}

export async function adminPurgeEvents(clientId: number, confirmName: string): Promise<{ purgedEventCount: number }> {
  return http<{ purgedEventCount: number }>(`/api/v1/admin/clients/${clientId}/purge-events`, {
    method: "POST",
    body: JSON.stringify({ confirmName }),
  });
}

export async function adminResetClient(
  clientId: number, confirmName: string, templateId?: string, seedDemoData?: boolean,
): Promise<{ purgedEventCount: number; templateReapplied: boolean }> {
  return http<{ purgedEventCount: number; templateReapplied: boolean }>(`/api/v1/admin/clients/${clientId}/reset`, {
    method: "POST",
    body: JSON.stringify({ confirmName, templateId: templateId ?? null, seedDemoData: seedDemoData ?? false }),
  });
}

export async function adminUpdateClient(id: number, payload: {
  name: string; parentClientId: number | null; status: string;
}): Promise<void> {
  return http<void>(`/api/v1/admin/clients/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function adminUpdateClientStatus(id: number, status: string): Promise<{ id: number; status: string }> {
  return http<{ id: number; status: string }>(`/api/v1/admin/clients/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function adminGetUsers(): Promise<AdminUserDto[]> {
  return http<AdminUserDto[]>("/api/v1/admin/users");
}

export type InviteUserResult<T> = { user: T; inviteUrl: string; emailSent: boolean };

export async function adminCreateUser(payload: {
  email: string; displayName: string; isSuperAdmin: boolean;
  clientId?: number; role?: string; auditClientId?: number;
}): Promise<InviteUserResult<AdminUserDto>> {
  return http<InviteUserResult<AdminUserDto>>("/api/v1/admin/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function adminUpdateUser(id: number, payload: {
  email: string; displayName: string; isActive: boolean; isSuperAdmin: boolean; auditClientId?: number;
}): Promise<void> {
  return http<void>(`/api/v1/admin/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function adminToggleUserActive(id: number, clientId?: number): Promise<{ id: number; isActive: boolean }> {
  const qs = clientId ? `?clientId=${clientId}` : "";
  return http<{ id: number; isActive: boolean }>(`/api/v1/admin/users/${id}/toggle-active${qs}`, {
    method: "PATCH",
  });
}

export async function adminChangePassword(id: number, newPassword: string, clientId?: number): Promise<void> {
  const qs = clientId ? `?clientId=${clientId}` : "";
  return http<void>(`/api/v1/admin/users/${id}/password${qs}`, {
    method: "PUT",
    body: JSON.stringify({ newPassword }),
  });
}

export async function adminGetUserClients(userId: number): Promise<UserClientAccessDto[]> {
  return http<UserClientAccessDto[]>(`/api/v1/admin/users/${userId}/clients`);
}

export async function adminGrantClientAccess(userId: number, clientId: number, role: string): Promise<void> {
  return http<void>(`/api/v1/admin/users/${userId}/clients`, {
    method: "POST",
    body: JSON.stringify({ clientId, role }),
  });
}

export async function adminRevokeClientAccess(userId: number, clientId: number): Promise<void> {
  return http<void>(`/api/v1/admin/users/${userId}/clients/${clientId}`, {
    method: "DELETE",
  });
}

export async function adminGetClientUsers(clientId: number): Promise<AdminClientUserDto[]> {
  return http<AdminClientUserDto[]>(`/api/v1/admin/clients/${clientId}/users`);
}

export async function adminUpdateClientUserRole(clientId: number, userId: number, role: string): Promise<void> {
  return http<void>(`/api/v1/admin/clients/${clientId}/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function adminGetAuditLog(page = 1, pageSize = 50, clientId?: number): Promise<PagedResult<AdminAuditEventDto>> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (clientId) params.set("clientId", String(clientId));
  return http<PagedResult<AdminAuditEventDto>>(`/api/v1/admin/audit?${params}`);
}

// ── Clients ───────────────────────────────────────────────────────────────────

export async function getClientUsers(clientId: number): Promise<ClientUserDto[]> {
  return http<ClientUserDto[]>(`/api/v1/clients/${clientId}/users`);
}

export async function addClientUser(clientId: number, email: string, role: string): Promise<ClientUserDto> {
  return http<ClientUserDto>(`/api/v1/clients/${clientId}/users`, {
    method: "POST",
    body: JSON.stringify({ email, role }),
  });
}

export async function inviteClientUser(
  clientId: number, email: string, displayName: string, role: string,
): Promise<InviteUserResult<ClientUserDto>> {
  return http<InviteUserResult<ClientUserDto>>(`/api/v1/clients/${clientId}/invite`, {
    method: "POST",
    body: JSON.stringify({ email, displayName, role }),
  });
}

export async function getFamilyUsers(clientId: number): Promise<ClientUserDto[]> {
  return http<ClientUserDto[]>(`/api/v1/clients/${clientId}/family-users`);
}

export async function updateClientUser(clientId: number, userId: number, displayName: string, email: string): Promise<void> {
  return http<void>(`/api/v1/clients/${clientId}/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify({ displayName, email }),
  });
}

export async function updateClientUserRole(clientId: number, userId: number, role: string): Promise<void> {
  return http<void>(`/api/v1/clients/${clientId}/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function removeClientUser(clientId: number, userId: number): Promise<void> {
  return http<void>(`/api/v1/clients/${clientId}/users/${userId}`, {
    method: "DELETE",
  });
}

// ── Event Types ───────────────────────────────────────────────────────────────

export async function getEventTypes(clientId: number): Promise<EventTypeDto[]> {
  return http<EventTypeDto[]>(`/api/v1/event-types?clientId=${clientId}`);
}

export async function createEventType(clientId: number, name: string): Promise<EventTypeDto> {
  return http<EventTypeDto>("/api/v1/event-types", {
    method: "POST",
    body: JSON.stringify({ clientId, name }),
  });
}

export async function updateEventType(id: number, payload: {
  clientId: number; name: string; sortOrder: number; isActive: boolean;
}): Promise<void> {
  return http<void>(`/api/v1/event-types/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteEventType(id: number, clientId: number): Promise<void> {
  return http<void>(`/api/v1/event-types/${id}?clientId=${clientId}`, {
    method: "DELETE",
  });
}

// ── Workflow Statuses ─────────────────────────────────────────────────────────

export async function getWorkflowStatuses(clientId: number): Promise<WorkflowStatusDto[]> {
  return http<WorkflowStatusDto[]>(`/api/v1/workflow-statuses?clientId=${clientId}`);
}

export async function createWorkflowStatus(payload: {
  clientId: number; name: string; color: string | null; isClosed: boolean;
}): Promise<WorkflowStatusDto> {
  return http<WorkflowStatusDto>("/api/v1/workflow-statuses", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateWorkflowStatus(id: number, payload: {
  clientId: number; name: string; color: string | null; isClosed: boolean; sortOrder: number; isActive: boolean;
}): Promise<void> {
  return http<void>(`/api/v1/workflow-statuses/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteWorkflowStatus(id: number, clientId: number): Promise<void> {
  return http<void>(`/api/v1/workflow-statuses/${id}?clientId=${clientId}`, {
    method: "DELETE",
  });
}

// ── Workflow Transitions ──────────────────────────────────────────────────────

export async function getWorkflowTransitions(clientId: number): Promise<WorkflowTransitionDto[]> {
  return http<WorkflowTransitionDto[]>(`/api/v1/workflow-transitions?clientId=${clientId}`);
}

export async function createWorkflowTransition(payload: {
  clientId: number;
  fromStatusId: number | null;
  toStatusId: number;
  eventTypeId: number | null;
  isDefault: boolean;
  label: string | null;
}): Promise<WorkflowTransitionDto> {
  return http<WorkflowTransitionDto>("/api/v1/workflow-transitions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteWorkflowTransition(id: number): Promise<void> {
  return http<void>(`/api/v1/workflow-transitions/${id}`, {
    method: "DELETE",
  });
}

// ── Custom Fields ─────────────────────────────────────────────────────────────

export async function getCustomFields(clientId: number): Promise<CustomFieldDto[]> {
  return http<CustomFieldDto[]>(`/api/v1/custom-fields?clientId=${clientId}`);
}

export async function createCustomField(payload: {
  clientId: number; name: string; dataType: string; isRequired: boolean; options: string | null;
}): Promise<CustomFieldDto> {
  return http<CustomFieldDto>("/api/v1/custom-fields", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateCustomField(id: number, payload: {
  clientId: number; name: string; dataType: string; isRequired: boolean; sortOrder: number; options: string | null;
}): Promise<void> {
  return http<void>(`/api/v1/custom-fields/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteCustomField(id: number, clientId: number): Promise<void> {
  return http<void>(`/api/v1/custom-fields/${id}?clientId=${clientId}`, {
    method: "DELETE",
  });
}

export async function getCustomFieldValues(entityId: number, clientId: number): Promise<CustomFieldValueDto[]> {
  const qs = new URLSearchParams({ entityId: String(entityId), clientId: String(clientId) });
  return http<CustomFieldValueDto[]>(`/api/v1/custom-fields/values?${qs.toString()}`);
}

export async function upsertCustomFieldValues(
  entityId: number,
  clientId: number,
  values: { customFieldId: number; value: string }[],
): Promise<void> {
  return http<void>("/api/v1/custom-fields/values", {
    method: "PUT",
    body: JSON.stringify({ entityId, clientId, values }),
  });
}

// ── Events ────────────────────────────────────────────────────────────────────

export type EventFilters = {
  eventTypeId?: number;
  workflowStatusId?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  slaBreached?: boolean;
  isClosed?: boolean;
};

export async function getEvents(clientId: number, page = 1, pageSize = 25, filters?: EventFilters): Promise<PagedResult<EventListItemDto>> {
  const qs = new URLSearchParams({ clientId: String(clientId), page: String(page), pageSize: String(pageSize) });
  if (filters?.eventTypeId)      qs.set("eventTypeId",      String(filters.eventTypeId));
  if (filters?.workflowStatusId) qs.set("workflowStatusId", String(filters.workflowStatusId));
  if (filters?.dateFrom)         qs.set("dateFrom",         filters.dateFrom);
  if (filters?.dateTo)           qs.set("dateTo",           filters.dateTo);
  if (filters?.search)           qs.set("search",           filters.search);
  if (filters?.slaBreached)      qs.set("slaBreached",      "true");
  if (filters?.isClosed === true)  qs.set("isClosed", "true");
  if (filters?.isClosed === false) qs.set("isClosed", "false");
  return http<PagedResult<EventListItemDto>>(`/api/v1/events?${qs.toString()}`);
}

export async function getEventAnalytics(clientIds: number | number[], dateFrom?: string, dateTo?: string): Promise<EventAnalyticsDto> {
  const ids = Array.isArray(clientIds) ? clientIds : [clientIds];
  const qs = new URLSearchParams();
  ids.forEach(id => qs.append("clientIds", String(id)));
  if (dateFrom) qs.set("dateFrom", dateFrom);
  if (dateTo)   qs.set("dateTo",   dateTo);
  return http<EventAnalyticsDto>(`/api/v1/events/analytics?${qs.toString()}`);
}

export async function getEventDetail(publicId: string, clientId?: number): Promise<EventDetailDto> {
  const qs = clientId ? `?clientId=${clientId}` : "";
  return http<EventDetailDto>(`/api/v1/events/${publicId}${qs}`);
}

export async function createEvent(payload: CreateEventRequest): Promise<CreateEventResponse> {
  return http<CreateEventResponse>("/api/v1/events", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateEvent(publicId: string, payload: UpdateEventRequest, clientId?: number): Promise<void> {
  const qs = clientId ? `?clientId=${clientId}` : "";
  return http<void>(`/api/v1/events/${publicId}${qs}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function cloneEvent(publicId: string, clientId?: number): Promise<{ publicId: string }> {
  const qs = clientId ? `?clientId=${clientId}` : "";
  return http<{ publicId: string }>(`/api/v1/events/${publicId}/clone${qs}`, { method: "POST" });
}

export async function bulkUpdateEvents(payload: BulkUpdateEventRequest): Promise<{ updated: number }> {
  return http<{ updated: number }>("/api/v1/events/bulk", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteEvent(publicId: string, clientId?: number): Promise<void> {
  const qs = clientId ? `?clientId=${clientId}` : "";
  return http<void>(`/api/v1/events/${publicId}${qs}`, { method: "DELETE" });
}

export async function bulkDeleteEvents(payload: BulkDeleteEventRequest): Promise<{ deleted: number }> {
  return http<{ deleted: number }>("/api/v1/events/bulk", {
    method: "DELETE",
    body: JSON.stringify(payload),
  });
}

export async function exportEventsCsv(clientId: number, filters?: EventFilters, filename?: string): Promise<void> {
  const qs = new URLSearchParams({ clientId: String(clientId) });
  if (filters?.eventTypeId)      qs.set("eventTypeId",      String(filters.eventTypeId));
  if (filters?.workflowStatusId) qs.set("workflowStatusId", String(filters.workflowStatusId));
  if (filters?.dateFrom)         qs.set("dateFrom",         filters.dateFrom);
  if (filters?.dateTo)           qs.set("dateTo",           filters.dateTo);
  if (filters?.search)           qs.set("search",           filters.search);

  const token = getStoredToken();
  const res = await fetch(`${baseUrl()}/api/v1/events/export?${qs.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename ?? `events-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Audit Log ─────────────────────────────────────────────────────────────────

export async function getAuditLog(publicId: string): Promise<AuditEventDto[]> {
  return http<AuditEventDto[]>(`/api/v1/events/${publicId}/audit`);
}

export async function createComment(publicId: string, body: string): Promise<AuditEventDto> {
  return http<AuditEventDto>(`/api/v1/events/${publicId}/audit/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export async function deleteAuditEvent(publicId: string, auditId: number): Promise<void> {
  return http<void>(`/api/v1/events/${publicId}/audit/${auditId}`, {
    method: "DELETE",
  });
}

// ── Attachments ───────────────────────────────────────────────────────────────

export async function getAttachments(publicId: string): Promise<AttachmentDto[]> {
  return http<AttachmentDto[]>(`/api/v1/events/${publicId}/attachments`);
}

export async function getAttachmentUrl(publicId: string, attachmentId: number): Promise<{ url: string }> {
  return http<{ url: string }>(`/api/v1/events/${publicId}/attachments/${attachmentId}/url`);
}

export async function deleteAttachment(publicId: string, attachmentId: number): Promise<void> {
  return http<void>(`/api/v1/events/${publicId}/attachments/${attachmentId}`, {
    method: "DELETE",
  });
}

export async function uploadAttachment(publicId: string, file: File): Promise<AttachmentDto> {
  const token    = getStoredToken();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${baseUrl()}/api/v1/events/${publicId}/attachments`, {
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
  return (await res.json()) as AttachmentDto;
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export async function getEventTasks(publicId: string): Promise<TaskDto[]> {
  return http<TaskDto[]>(`/api/v1/events/${publicId}/tasks`);
}

export async function createEventTask(publicId: string, payload: {
  title: string;
  description?: string | null;
  assignedToUserId?: number | null;
  dueAt?: string | null;
}): Promise<TaskDto> {
  return http<TaskDto>(`/api/v1/events/${publicId}/tasks`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateEventTask(publicId: string, taskPublicId: string, payload: {
  title: string;
  description?: string | null;
  assignedToUserId?: number | null;
  dueAt?: string | null;
}): Promise<void> {
  return http<void>(`/api/v1/events/${publicId}/tasks/${taskPublicId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function completeEventTask(publicId: string, taskPublicId: string): Promise<void> {
  return http<void>(`/api/v1/events/${publicId}/tasks/${taskPublicId}/complete`, {
    method: "PATCH",
  });
}

export async function uncompleteEventTask(publicId: string, taskPublicId: string): Promise<void> {
  return http<void>(`/api/v1/events/${publicId}/tasks/${taskPublicId}/uncomplete`, {
    method: "PATCH",
  });
}

export async function deleteEventTask(publicId: string, taskPublicId: string): Promise<void> {
  return http<void>(`/api/v1/events/${publicId}/tasks/${taskPublicId}`, {
    method: "DELETE",
  });
}

export async function reorderEventTasks(publicId: string, orderedPublicIds: string[]): Promise<void> {
  return http<void>(`/api/v1/events/${publicId}/tasks/reorder`, {
    method: "PATCH",
    body: JSON.stringify({ orderedPublicIds }),
  });
}

export async function getMyTasks(clientId: number, daysAhead: number): Promise<MyTaskDto[]> {
  return http<MyTaskDto[]>(`/api/v1/tasks/my?clientId=${clientId}&daysAhead=${daysAhead}`);
}

export async function getWorkload(clientId: number): Promise<WorkloadRowDto[]> {
  return http<WorkloadRowDto[]>(`/api/v1/events/workload?clientId=${clientId}`);
}

// ── Branding ──────────────────────────────────────────────────────────────────

export async function getClientBranding(clientId: number): Promise<ClientBrandingDto> {
  return http<ClientBrandingDto>(`/api/v1/clients/${clientId}/branding`);
}

export async function adminGetClientBranding(clientId: number): Promise<ClientBrandingDto> {
  return http<ClientBrandingDto>(`/api/v1/admin/clients/${clientId}/branding`);
}

export async function adminUpdateClientBranding(clientId: number, payload: {
  systemName?: string | null; primaryColor?: string | null; linkColor?: string | null;
}): Promise<void> {
  return http<void>(`/api/v1/admin/clients/${clientId}/branding`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function adminUploadClientLogo(clientId: number, file: File): Promise<ClientBrandingDto> {
  const token = getStoredToken();
  const form  = new FormData();
  form.append("logo", file);
  const res = await fetch(`${baseUrl()}/api/v1/admin/clients/${clientId}/branding/logo`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, `${res.status} ${res.statusText}${text ? `: ${text}` : ""}`);
  }
  return (await res.json()) as ClientBrandingDto;
}

export async function adminDeleteClientLogo(clientId: number): Promise<void> {
  return http<void>(`/api/v1/admin/clients/${clientId}/branding/logo`, { method: "DELETE" });
}

// ── Notifications ─────────────────────────────────────────────────────────────

export async function getUnreadNotificationCount(): Promise<{ count: number; taskCount: number }> {
  return http<{ count: number; taskCount: number }>("/api/v1/notifications/unread-count");
}

export async function getNotifications(page = 1, pageSize = 25): Promise<PagedResult<NotificationDto>> {
  return http<PagedResult<NotificationDto>>(`/api/v1/notifications?page=${page}&pageSize=${pageSize}`);
}

export async function markNotificationRead(id: number): Promise<void> {
  return http<void>(`/api/v1/notifications/${id}/read`, { method: "PATCH" });
}

export async function markAllNotificationsRead(): Promise<void> {
  return http<void>("/api/v1/notifications/read-all", { method: "PATCH" });
}

export async function getNotificationPreferences(): Promise<NotificationPreferenceDto[]> {
  return http<NotificationPreferenceDto[]>("/api/v1/notifications/preferences");
}

export async function saveNotificationPreferences(prefs: NotificationPreferenceDto[]): Promise<void> {
  return http<void>("/api/v1/notifications/preferences", {
    method: "PUT",
    body: JSON.stringify({ preferences: prefs }),
  });
}

// ── Public Report (no auth) ───────────────────────────────────────────────────

export async function getPublicReportConfig(slug: string): Promise<PublicReportConfigDto> {
  const res = await fetch(`${baseUrl()}/api/v1/public/report/${encodeURIComponent(slug)}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, `${res.status} ${res.statusText}${text ? `: ${text}` : ""}`);
  }
  return (await res.json()) as PublicReportConfigDto;
}

export async function submitPublicReport(
  slug: string,
  payload: PublicReportRequest,
): Promise<{ publicId: string }> {
  const res = await fetch(`${baseUrl()}/api/v1/public/report/${encodeURIComponent(slug)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, `${res.status} ${res.statusText}${text ? `: ${text}` : ""}`);
  }
  return (await res.json()) as { publicId: string };
}

// ── Inbound Email (admin) ─────────────────────────────────────────────────────

export async function getClientInboundEmail(clientId: number): Promise<ClientInboundEmailDto> {
  return http<ClientInboundEmailDto>(`/api/v1/admin/clients/${clientId}/inbound-email`);
}

export async function updateClientInboundEmail(
  clientId: number,
  payload: UpdateClientInboundEmailRequest,
): Promise<void> {
  await http<void>(`/api/v1/admin/clients/${clientId}/inbound-email`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// ── Root Cause Taxonomy ───────────────────────────────────────────────────────

export async function getRootCauseTaxonomy(clientId: number): Promise<RootCauseTaxonomyItemDto[]> {
  return http<RootCauseTaxonomyItemDto[]>(`/api/v1/clients/${clientId}/taxonomy/root-cause`);
}

export async function createRootCauseTaxonomyItem(clientId: number, name: string): Promise<RootCauseTaxonomyItemDto> {
  return http<RootCauseTaxonomyItemDto>(`/api/v1/clients/${clientId}/taxonomy/root-cause`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function updateRootCauseTaxonomyItem(clientId: number, id: number, name: string): Promise<void> {
  return http<void>(`/api/v1/clients/${clientId}/taxonomy/root-cause/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name }),
  });
}

export async function deleteRootCauseTaxonomyItem(clientId: number, id: number): Promise<void> {
  return http<void>(`/api/v1/clients/${clientId}/taxonomy/root-cause/${id}`, {
    method: "DELETE",
  });
}

// ── Webhooks ──────────────────────────────────────────────────────────────────

export async function getWebhooks(clientId: number): Promise<ClientWebhookDto[]> {
  return http<ClientWebhookDto[]>(`/api/v1/clients/${clientId}/webhooks`);
}

export async function createWebhook(clientId: number, req: UpsertWebhookRequest): Promise<ClientWebhookDto> {
  return http<ClientWebhookDto>(`/api/v1/clients/${clientId}/webhooks`, {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function updateWebhook(clientId: number, id: number, req: UpsertWebhookRequest): Promise<ClientWebhookDto> {
  return http<ClientWebhookDto>(`/api/v1/clients/${clientId}/webhooks/${id}`, {
    method: "PUT",
    body: JSON.stringify(req),
  });
}

export async function deleteWebhook(clientId: number, id: number): Promise<void> {
  return http<void>(`/api/v1/clients/${clientId}/webhooks/${id}`, { method: "DELETE" });
}

// ── SLA Rules ─────────────────────────────────────────────────────────────────

export async function getSlaRules(clientId: number): Promise<SlaRuleDto[]> {
  return http<SlaRuleDto[]>(`/api/v1/clients/${clientId}/sla-rules`);
}

export async function createSlaRule(
  clientId: number,
  payload: Omit<SlaRuleDto, "id" | "eventTypeName">,
): Promise<SlaRuleDto> {
  return http<SlaRuleDto>(`/api/v1/clients/${clientId}/sla-rules`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateSlaRule(
  clientId: number,
  ruleId: number,
  payload: Omit<SlaRuleDto, "id" | "eventTypeName">,
): Promise<void> {
  return http<void>(`/api/v1/clients/${clientId}/sla-rules/${ruleId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteSlaRule(clientId: number, ruleId: number): Promise<void> {
  return http<void>(`/api/v1/clients/${clientId}/sla-rules/${ruleId}`, {
    method: "DELETE",
  });
}

// Keep old admin aliases for backward compatibility
export const adminGetSlaRules = getSlaRules;
export const adminCreateSlaRule = createSlaRule;
export const adminUpdateSlaRule = updateSlaRule;
export const adminDeleteSlaRule = deleteSlaRule;

// ── Event Links ──────────────────────────────────────────────────────

export async function getEventLinkGroups(clientId: number): Promise<EventLinkGroupDto[]> {
  return http<EventLinkGroupDto[]>(`/api/v1/event-links/groups?clientId=${clientId}`);
}

export async function getEventLinkGroupDetail(groupId: number): Promise<EventLinkGroupDetailDto> {
  return http<EventLinkGroupDetailDto>(`/api/v1/event-links/groups/${groupId}`);
}

export async function createEventLinkGroup(clientId: number, title: string, description?: string | null, eventIds?: number[]): Promise<{ id: number }> {
  return http<{ id: number }>("/api/v1/event-links/groups", {
    method: "POST",
    body: JSON.stringify({ clientId, title, description: description ?? null, eventIds: eventIds ?? null }),
  });
}

export async function updateEventLinkGroup(groupId: number, title: string, description?: string | null): Promise<void> {
  return http<void>(`/api/v1/event-links/groups/${groupId}`, {
    method: "PUT",
    body: JSON.stringify({ title, description: description ?? null }),
  });
}

export async function deleteEventLinkGroup(groupId: number): Promise<void> {
  return http<void>(`/api/v1/event-links/groups/${groupId}`, { method: "DELETE" });
}

export async function addEventToLinkGroup(groupId: number, eventId: number): Promise<void> {
  return http<void>(`/api/v1/event-links/groups/${groupId}/events`, {
    method: "POST",
    body: JSON.stringify({ eventId }),
  });
}

export async function removeEventFromLinkGroup(groupId: number, eventId: number): Promise<void> {
  return http<void>(`/api/v1/event-links/groups/${groupId}/events/${eventId}`, { method: "DELETE" });
}

export async function getEventLinkGroupsByEvent(publicId: string): Promise<EventLinkGroupDto[]> {
  return http<EventLinkGroupDto[]>(`/api/v1/event-links/by-event/${publicId}`);
}

// ── Insights ─────────────────────────────────────────────────────────

export async function getInsights(clientId: number): Promise<InsightAlertDto[]> {
  return http<InsightAlertDto[]>(`/api/v1/insights?clientId=${clientId}`);
}

export async function getInsightSummary(clientId: number): Promise<InsightSummaryDto> {
  return http<InsightSummaryDto>(`/api/v1/insights/summary?clientId=${clientId}`);
}

export async function acknowledgeInsight(id: number): Promise<void> {
  return http<void>(`/api/v1/insights/${id}/acknowledge`, { method: "PATCH" });
}

// ── Investigations ───────────────────────────────────────────────────

export async function getInvestigation(publicId: string, clientId?: number): Promise<InvestigationDto | null> {
  const qs = clientId ? `?clientId=${clientId}` : "";
  return http<InvestigationDto | null>(`/api/v1/events/${publicId}/investigation${qs}`);
}

export async function startInvestigation(publicId: string, leadInvestigatorUserId?: number | null, clientId?: number): Promise<{ id: number }> {
  const qs = clientId ? `?clientId=${clientId}` : "";
  return http<{ id: number }>(`/api/v1/events/${publicId}/investigation${qs}`, {
    method: "POST",
    body: JSON.stringify({ leadInvestigatorUserId: leadInvestigatorUserId ?? null }),
  });
}

export async function updateInvestigation(publicId: string, payload: {
  status?: string;
  summary?: string;
  rootCauseAnalysis?: string;
  correctiveActions?: string;
  leadInvestigatorUserId?: number | null;
}, clientId?: number): Promise<void> {
  const qs = clientId ? `?clientId=${clientId}` : "";
  return http<void>(`/api/v1/events/${publicId}/investigation${qs}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function getWitnesses(publicId: string, clientId?: number): Promise<WitnessDto[]> {
  const qs = clientId ? `?clientId=${clientId}` : "";
  return http<WitnessDto[]>(`/api/v1/events/${publicId}/investigation/witnesses${qs}`);
}

export async function addWitness(publicId: string, payload: {
  witnessName: string; witnessContact?: string | null; statement: string; statementDate?: string | null;
}, clientId?: number): Promise<WitnessDto> {
  const qs = clientId ? `?clientId=${clientId}` : "";
  return http<WitnessDto>(`/api/v1/events/${publicId}/investigation/witnesses${qs}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateWitness(publicId: string, witnessId: number, payload: {
  witnessName: string; witnessContact?: string | null; statement: string; statementDate?: string | null;
}, clientId?: number): Promise<void> {
  const qs = clientId ? `?clientId=${clientId}` : "";
  return http<void>(`/api/v1/events/${publicId}/investigation/witnesses/${witnessId}${qs}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteWitness(publicId: string, witnessId: number, clientId?: number): Promise<void> {
  const qs = clientId ? `?clientId=${clientId}` : "";
  return http<void>(`/api/v1/events/${publicId}/investigation/witnesses/${witnessId}${qs}`, { method: "DELETE" });
}

export async function getEvidence(publicId: string, clientId?: number): Promise<EvidenceDto[]> {
  const qs = clientId ? `?clientId=${clientId}` : "";
  return http<EvidenceDto[]>(`/api/v1/events/${publicId}/investigation/evidence${qs}`);
}

export async function addEvidence(publicId: string, payload: {
  title: string; description?: string | null; evidenceType: string; attachmentId?: number | null; collectedAt?: string | null;
}, clientId?: number): Promise<EvidenceDto> {
  const qs = clientId ? `?clientId=${clientId}` : "";
  return http<EvidenceDto>(`/api/v1/events/${publicId}/investigation/evidence${qs}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateEvidence(publicId: string, evidenceId: number, payload: {
  title: string; description?: string | null; evidenceType: string; attachmentId?: number | null; collectedAt?: string | null;
}, clientId?: number): Promise<void> {
  const qs = clientId ? `?clientId=${clientId}` : "";
  return http<void>(`/api/v1/events/${publicId}/investigation/evidence/${evidenceId}${qs}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteEvidence(publicId: string, evidenceId: number, clientId?: number): Promise<void> {
  const qs = clientId ? `?clientId=${clientId}` : "";
  return http<void>(`/api/v1/events/${publicId}/investigation/evidence/${evidenceId}${qs}`, { method: "DELETE" });
}

// ── Client Documents ──────────────────────────────────────────────────

export async function getClientDocuments(clientId: number, category?: string): Promise<ClientDocumentDto[]> {
  const qs = category ? `?category=${encodeURIComponent(category)}` : "";
  return http<ClientDocumentDto[]>(`/api/v1/clients/${clientId}/documents${qs}`);
}

export async function getClientDocument(clientId: number, id: number): Promise<ClientDocumentDto> {
  return http<ClientDocumentDto>(`/api/v1/clients/${clientId}/documents/${id}`);
}

export async function uploadDocument(
  clientId: number, file: File, title: string, description: string | null, category: string,
): Promise<ClientDocumentDto> {
  const token = getStoredToken();
  const form = new FormData();
  form.append("file", file);
  form.append("title", title);
  if (description) form.append("description", description);
  form.append("category", category);

  const res = await fetch(`${baseUrl()}/api/v1/clients/${clientId}/documents`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, `${res.status} ${res.statusText}${text ? `: ${text}` : ""}`);
  }
  return (await res.json()) as ClientDocumentDto;
}

export async function updateDocumentMetadata(
  clientId: number, id: number, payload: { title: string; description: string | null; category: string },
): Promise<void> {
  return http<void>(`/api/v1/clients/${clientId}/documents/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function replaceDocumentFile(clientId: number, id: number, file: File): Promise<ClientDocumentDto> {
  const token = getStoredToken();
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${baseUrl()}/api/v1/clients/${clientId}/documents/${id}/file`, {
    method: "PUT",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, `${res.status} ${res.statusText}${text ? `: ${text}` : ""}`);
  }
  return (await res.json()) as ClientDocumentDto;
}

export async function getDocumentDownloadUrl(clientId: number, id: number): Promise<{ url: string }> {
  return http<{ url: string }>(`/api/v1/clients/${clientId}/documents/${id}/url`);
}

export async function deleteDocument(clientId: number, id: number): Promise<void> {
  return http<void>(`/api/v1/clients/${clientId}/documents/${id}`, { method: "DELETE" });
}

// ── Document References ───────────────────────────────────────────────

export async function getEventDocuments(publicId: string): Promise<DocumentReferenceDto[]> {
  return http<DocumentReferenceDto[]>(`/api/v1/events/${publicId}/documents`);
}

export async function linkDocumentToEvent(publicId: string, documentId: number): Promise<DocumentReferenceDto> {
  return http<DocumentReferenceDto>(`/api/v1/events/${publicId}/documents`, {
    method: "POST",
    body: JSON.stringify({ documentId }),
  });
}

export async function unlinkDocumentFromEvent(publicId: string, refId: number): Promise<void> {
  return http<void>(`/api/v1/events/${publicId}/documents/${refId}`, { method: "DELETE" });
}

// ── AI ────────────────────────────────────────────────────────────────

export async function aiCategorize(title: string, description: string, clientId: number): Promise<AiCategorizeResponse> {
  return http<AiCategorizeResponse>("/api/v1/ai/categorize", {
    method: "POST",
    body: JSON.stringify({ title, description, clientId }),
  });
}

export async function aiInvestigate(publicId: string): Promise<AiInvestigateResponse> {
  return http<AiInvestigateResponse>("/api/v1/ai/investigate", {
    method: "POST",
    body: JSON.stringify({ publicId }),
  });
}

export async function aiAnalyzeTrends(clientId: number): Promise<AiTrendAnalysisResponse> {
  return http<AiTrendAnalysisResponse>("/api/v1/ai/analyze-trends", {
    method: "POST",
    body: JSON.stringify({ clientId }),
  });
}

// ── Workflow Rules ───────────────────────────────────────────────────────────

export async function getWorkflowRules(clientId: number): Promise<WorkflowRuleDto[]> {
  return http<WorkflowRuleDto[]>(`/api/v1/clients/${clientId}/workflow-rules`);
}

export async function getWorkflowRule(clientId: number, id: number): Promise<WorkflowRuleDto> {
  return http<WorkflowRuleDto>(`/api/v1/clients/${clientId}/workflow-rules/${id}`);
}

export async function createWorkflowRule(clientId: number, payload: {
  name: string; description?: string | null; triggerType: string;
  isActive: boolean; stopOnMatch: boolean;
  conditions: unknown[]; actions: unknown[];
}): Promise<WorkflowRuleDto> {
  return http<WorkflowRuleDto>(`/api/v1/clients/${clientId}/workflow-rules`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateWorkflowRule(clientId: number, id: number, payload: {
  name: string; description?: string | null; triggerType: string;
  isActive: boolean; stopOnMatch: boolean;
  conditions: unknown[]; actions: unknown[];
}): Promise<void> {
  return http<void>(`/api/v1/clients/${clientId}/workflow-rules/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function toggleWorkflowRule(clientId: number, id: number): Promise<{ isActive: boolean }> {
  return http<{ isActive: boolean }>(`/api/v1/clients/${clientId}/workflow-rules/${id}/toggle`, {
    method: "PATCH",
  });
}

export async function deleteWorkflowRule(clientId: number, id: number): Promise<void> {
  return http<void>(`/api/v1/clients/${clientId}/workflow-rules/${id}`, { method: "DELETE" });
}

export async function reorderWorkflowRules(clientId: number, orderedIds: number[]): Promise<void> {
  return http<void>(`/api/v1/clients/${clientId}/workflow-rules/reorder`, {
    method: "PATCH",
    body: JSON.stringify({ orderedIds }),
  });
}

export async function getWorkflowRuleExecutions(clientId: number, page = 1, pageSize = 50): Promise<WorkflowRuleExecutionDto[]> {
  return http<WorkflowRuleExecutionDto[]>(`/api/v1/clients/${clientId}/workflow-rules/executions?page=${page}&pageSize=${pageSize}`);
}

// ── API Credentials ──────────────────────────────────────────────────────────

export async function getApiCredentials(clientId: number): Promise<ApiCredentialDto[]> {
  return http<ApiCredentialDto[]>(`/api/v1/clients/${clientId}/api-credentials`);
}

export async function createApiCredential(clientId: number, req: CreateApiCredentialRequest): Promise<ApiCredentialCreatedDto> {
  return http<ApiCredentialCreatedDto>(`/api/v1/clients/${clientId}/api-credentials`, {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function updateApiCredential(clientId: number, id: number, req: UpdateApiCredentialRequest): Promise<ApiCredentialDto> {
  return http<ApiCredentialDto>(`/api/v1/clients/${clientId}/api-credentials/${id}`, {
    method: "PUT",
    body: JSON.stringify(req),
  });
}

export async function revokeApiCredential(clientId: number, id: number): Promise<void> {
  return http<void>(`/api/v1/clients/${clientId}/api-credentials/${id}/revoke`, {
    method: "POST",
  });
}

export async function deleteApiCredential(clientId: number, id: number): Promise<void> {
  return http<void>(`/api/v1/clients/${clientId}/api-credentials/${id}`, {
    method: "DELETE",
  });
}

export async function getApiCredentialAudit(clientId: number, id: number): Promise<ApiCredentialAuditLogDto[]> {
  return http<ApiCredentialAuditLogDto[]>(`/api/v1/clients/${clientId}/api-credentials/${id}/audit`);
}

// ── Modules ──────────────────────────────────────────────────────────────────

export async function getClientModules(clientId: number): Promise<ClientModulesDto> {
  return http<ClientModulesDto>(`/api/v1/clients/${clientId}/modules`);
}

export async function adminGetModules(): Promise<ModuleDefinitionDto[]> {
  return http<ModuleDefinitionDto[]>("/api/v1/admin/modules");
}

export async function adminGetClientModules(clientId: number): Promise<ClientModulesDto> {
  return http<ClientModulesDto>(`/api/v1/admin/clients/${clientId}/modules`);
}

export async function adminUpdateClientModules(clientId: number, moduleIds: string[]): Promise<ClientModulesDto> {
  return http<ClientModulesDto>(`/api/v1/admin/clients/${clientId}/modules`, {
    method: "PUT",
    body: JSON.stringify({ moduleIds }),
  });
}

// ── Ag Field Mapping ─────────────────────────────────────────────────────────

export async function getAgFields(clientId: number): Promise<AgFieldListItemDto[]> {
  return http<AgFieldListItemDto[]>(`/api/v1/clients/${clientId}/ag/fields`);
}

export async function getAgField(clientId: number, fieldId: number): Promise<AgFieldDto> {
  return http<AgFieldDto>(`/api/v1/clients/${clientId}/ag/fields/${fieldId}`);
}

export async function createAgField(clientId: number, req: { name: string; acreage?: number | null; growerName?: string | null; growerContact?: string | null; address?: string | null; boundaryGeoJson?: string | null; notes?: string | null }): Promise<AgFieldDto> {
  return http<AgFieldDto>(`/api/v1/clients/${clientId}/ag/fields`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req) });
}

export async function updateAgField(clientId: number, fieldId: number, req: { name: string; acreage?: number | null; growerName?: string | null; growerContact?: string | null; address?: string | null; boundaryGeoJson?: string | null; notes?: string | null }): Promise<void> {
  await http<void>(`/api/v1/clients/${clientId}/ag/fields/${fieldId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req) });
}

export async function deleteAgField(clientId: number, fieldId: number): Promise<void> {
  await http<void>(`/api/v1/clients/${clientId}/ag/fields/${fieldId}`, { method: "DELETE" });
}

export async function getSprayJobs(clientId: number, filters?: { fieldId?: number; status?: string }): Promise<SprayJobListItemDto[]> {
  const params = new URLSearchParams();
  if (filters?.fieldId) params.set("fieldId", String(filters.fieldId));
  if (filters?.status) params.set("status", filters.status);
  const qs = params.toString();
  return http<SprayJobListItemDto[]>(`/api/v1/clients/${clientId}/ag/jobs${qs ? `?${qs}` : ""}`);
}

export async function getSprayJob(clientId: number, jobId: number): Promise<SprayJobDto> {
  return http<SprayJobDto>(`/api/v1/clients/${clientId}/ag/jobs/${jobId}`);
}

export async function createSprayJob(clientId: number, req: { fieldId: number; scheduledDate?: string | null; droneOperator?: string | null; product?: string | null; applicationRate?: string | null; applicationUnit?: string | null; weatherConditions?: string | null; notes?: string | null }): Promise<SprayJobDto> {
  return http<SprayJobDto>(`/api/v1/clients/${clientId}/ag/jobs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req) });
}

export async function updateSprayJob(clientId: number, jobId: number, req: { fieldId: number; status: string; scheduledDate?: string | null; completedDate?: string | null; droneOperator?: string | null; product?: string | null; applicationRate?: string | null; applicationUnit?: string | null; weatherConditions?: string | null; flightLogGeoJson?: string | null; notes?: string | null }): Promise<void> {
  await http<void>(`/api/v1/clients/${clientId}/ag/jobs/${jobId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req) });
}

export async function deleteSprayJob(clientId: number, jobId: number): Promise<void> {
  await http<void>(`/api/v1/clients/${clientId}/ag/jobs/${jobId}`, { method: "DELETE" });
}
