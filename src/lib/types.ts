export type PagedResult<T> = {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
};

// ── Events ────────────────────────────────────────────────────────────────────

export type EventListItemDto = {
  id: number;
  clientId: number;
  publicId: string;
  title: string;
  eventTypeId: number;
  eventTypeName: string;
  workflowStatusId: number;
  workflowStatusName: string;
  workflowStatusColor: string | null;
  workflowStatusIsClosed: boolean;
  occurredAt: string;
  location: string;
  ownerUserId: number | null;
  ownerDisplayName: string | null;
  referenceNumber: number;
  linkGroupCount: number;
  createdAt: string;
};

export type SlaStatusDto = {
  ruleId: number;
  ruleName: string;
  investigationDeadline: string | null;
  investigationBreached: boolean;
  closureDeadline: string | null;
  closureBreached: boolean;
};

export type EventDetailDto = {
  id: number;
  clientId: number;
  publicId: string;
  title: string;
  eventTypeId: number;
  eventTypeName: string;
  workflowStatusId: number;
  workflowStatusName: string;
  workflowStatusColor: string | null;
  workflowStatusIsClosed: boolean;
  occurredAt: string;
  location: string;
  description: string;
  reportedByUserId: number | null;
  reportedByDisplayName: string | null;
  externalReporterName: string | null;
  externalReporterContact: string | null;
  ownerUserId: number | null;
  ownerDisplayName: string | null;
  referenceNumber: number;
  rootCauseId: number | null;
  rootCauseName: string | null;
  correctiveAction: string | null;
  sla: SlaStatusDto | null;
  hasInvestigation: boolean;
  investigationStatus: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateEventRequest = {
  clientId: number;
  title: string;
  eventTypeId: number;
  workflowStatusId: number;
  occurredAt: string;
  location: string;
  description: string;
  reportedByUserId: number;
  ownerUserId?: number | null;
};

export type CreateEventResponse = { eventId: number; publicId: string };

export type UpdateEventRequest = {
  title: string;
  eventTypeId: number;
  workflowStatusId: number;
  occurredAt: string;
  location: string;
  description: string;
  ownerUserId: number | null;
  rootCauseId: number | null;
  correctiveAction: string | null;
};

export type BulkUpdateEventRequest = {
  clientId: number;
  eventPublicIds: string[];
  workflowStatusId?: number;
  ownerUserId?: number | null;
  clearOwner?: boolean;
};

export type BulkDeleteEventRequest = {
  clientId: number;
  eventPublicIds: string[];
};

export type EventAnalyticsDto = {
  total: number;
  open: number;
  closed: number;
  thisMonth: number;
  lastMonth: number;
  byType: { eventTypeId: number; eventTypeName: string; count: number }[];
  byMonth: { year: number; month: number; eventTypeId: number; eventTypeName: string; count: number }[];
  topLocations: { location: string; count: number }[];
  byRootCause: { name: string; count: number }[];
  avgResolutionDays: number | null;
  slaClosureComplianceRate: number | null;
  slaBreachedCount: number;
};

export type RootCauseTaxonomyItemDto = {
  id: number;
  name: string;
  sortOrder: number;
};

export type SlaRuleDto = {
  id: number;
  eventTypeId: number | null;
  eventTypeName: string | null;
  name: string;
  investigationHours: number | null;
  closureHours: number | null;
};

// ── Event Types ───────────────────────────────────────────────────────────────

export type EventTypeDto = {
  id: number;
  clientId: number;
  name: string;
  sortOrder: number;
  isSystem: boolean;
  isActive: boolean;
};

// ── Workflow ──────────────────────────────────────────────────────────────────

export type WorkflowStatusDto = {
  id: number;
  clientId: number;
  name: string;
  color: string | null;
  isClosed: boolean;
  sortOrder: number;
  isSystem: boolean;
  isActive: boolean;
  count: number;
};

export type WorkflowTransitionDto = {
  id: number;
  clientId: number;
  fromStatusId: number | null;
  toStatusId: number;
  eventTypeId: number | null;
  isDefault: boolean;
  label: string | null;
  createdAt: string;
};

// ── Tasks ─────────────────────────────────────────────────────────────────────

export type TaskDto = {
  id: number;
  clientId: number;
  eventId: number;
  publicId: string;
  title: string;
  description: string | null;
  assignedToUserId: number | null;
  assignedToDisplayName: string | null;
  dueAt: string | null;
  isComplete: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type MyTaskDto = {
  taskPublicId: string;
  title: string;
  description: string | null;
  dueAt: string;
  eventPublicId: string;
  eventTitle: string;
};

export type WorkloadRowDto = {
  userId: number | null;
  userName: string;
  openEvents: number;
  openTasks: number;
};

// ── Audit ─────────────────────────────────────────────────────────────────────

export type AuditEventDto = {
  id: number;
  clientId: number;
  entityType: string;
  entityId: number;
  eventType: string;
  userId: number | null;
  userDisplayName: string;
  body: string;
  createdAt: string;
};

export type AdminAuditEventDto = {
  id: number;
  clientId: number;
  clientName: string | null;
  entityType: string;
  entityId: number;
  eventType: string;
  userId: number | null;
  userDisplayName: string;
  body: string;
  createdAt: string;
};

// ── Attachments ───────────────────────────────────────────────────────────────

export type AttachmentDto = {
  id: number;
  entityType: string;
  entityId: number;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  uploadedByUserId: number | null;
  uploadedByDisplayName: string;
  createdAt: string;
};

// ── Auth / Users ──────────────────────────────────────────────────────────────

export type ClientAccessDto = {
  id: number;
  name: string;
  role: string;
  parentClientId: number | null;
};

export type AuthResultDto = {
  token: string;
  displayName: string;
  email: string;
  isSuperAdmin: boolean;
  activeClientId: number | null;
  activeClientName: string | null;
  clients: ClientAccessDto[];
};

export type LoginResult =
  | ({ totpRequired?: false } & AuthResultDto)
  | { totpRequired: true; pendingToken: string };

export type SessionDto = {
  id: number;
  description: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
};

export type ClientStatus = "Active" | "Inactive" | "Demo" | "SalesDemo";

export type AdminClientDto = {
  id: number;
  name: string;
  slug: string;
  parentClientId: number | null;
  parentClientName: string | null;
  status: ClientStatus;
  userCount: number;
  createdAt: string;
  appliedTemplateIds: string[];
};

export type AdminUserDto = {
  id: number;
  email: string;
  displayName: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  clientCount: number;
  createdAt: string;
  isTotpEnabled: boolean;
};

export type UserClientAccessDto = {
  clientId: number;
  clientName: string;
  clientStatus: string;
  role: string;
  grantedAt: string;
};

export type AdminClientUserDto = {
  userId: number;
  displayName: string;
  email: string;
  role: string;
  isActive: boolean;
  isSuperAdmin: boolean;
};

// ── Branding ──────────────────────────────────────────────────────────────────

export type ClientBrandingDto = {
  systemName:   string | null;
  primaryColor: string | null;
  linkColor:    string | null;
  logoUrl:      string | null;
};

// ── Event Templates ───────────────────────────────────────────────────────────

export type EventTemplateDto = {
  id: string;
  name: string;
  description: string;
  industry: string;
  eventTypeCount: number;
  statusCount: number;
  customFieldCount: number;
};

// ── Custom Fields ─────────────────────────────────────────────────────────────

export type CustomFieldDto = {
  id: number;
  clientId: number;
  name: string;
  dataType: string;
  isRequired: boolean;
  sortOrder: number;
  isActive: boolean;
  options: string | null;
};

export type CustomFieldValueDto = {
  id: number;
  entityId: number;
  customFieldId: number;
  fieldName: string;
  dataType: string;
  options: string | null;
  isRequired: boolean;
  value: string;
};

// ── Clients ───────────────────────────────────────────────────────────────────

export type ClientUserDto = {
  id: number;
  displayName: string;
  email: string;
  role: string;
  isActive: boolean;
  isSuperAdmin: boolean;
};

// ── Notifications ─────────────────────────────────────────────────────────────

export type NotificationDto = {
  id: number;
  notificationType: "event_assigned" | "task_assigned" | "comment_added" | "status_changed";
  title: string;
  body: string;
  entityPublicId: string | null;
  isRead: boolean;
  createdAt: string;
};

export type NotificationPreferenceDto = {
  notificationType: "event_assigned" | "task_assigned" | "comment_added" | "status_changed";
  emailEnabled: boolean;
  inAppEnabled: boolean;
};

// ── Public Report ──────────────────────────────────────────────────────────────

export type PublicReportConfigDto = {
  clientId: number;
  clientName: string;
  systemName: string | null;
  primaryColor: string | null;
  linkColor: string | null;
  logoUrl: string | null;
  defaultStatusId: number;
  eventTypes: { id: number; name: string }[];
};

export type PublicReportRequest = {
  clientId: number;
  eventTypeId: number;
  workflowStatusId: number;
  title: string;
  description: string;
  location: string | null;
  occurredAt: string | null;
  reporterName: string | null;
  reporterContact: string | null;
};

// ── Event Links ──────────────────────────────────────────────────────

export type EventLinkGroupDto = {
  id: number;
  clientId: number;
  title: string;
  description: string | null;
  eventCount: number;
  createdAt: string;
};

export type EventLinkGroupDetailDto = {
  id: number;
  clientId: number;
  title: string;
  description: string | null;
  events: LinkedEventSummaryDto[];
  createdAt: string;
};

export type LinkedEventSummaryDto = {
  eventId: number;
  publicId: string;
  title: string;
  eventTypeName: string;
  workflowStatusName: string;
  workflowStatusColor: string | null;
};

// ── Insights ─────────────────────────────────────────────────────────

export type InsightAlertDto = {
  id: number;
  clientId: number;
  alertType: string;
  severity: string;
  title: string;
  body: string;
  metadataJson: string | null;
  relatedEventIds: string | null;
  isAcknowledged: boolean;
  acknowledgedAt: string | null;
  generatedAt: string;
  aiSummary: string | null;
};

export type InsightSummaryDto = {
  total: number;
  critical: number;
  warning: number;
  info: number;
  recent: InsightAlertDto[];
};

// ── Investigations ───────────────────────────────────────────────────

export type InvestigationDto = {
  id: number;
  clientId: number;
  eventId: number;
  status: string;
  summary: string | null;
  rootCauseAnalysis: string | null;
  correctiveActions: string | null;
  leadInvestigatorUserId: number | null;
  leadInvestigatorName: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WitnessDto = {
  id: number;
  investigationId: number;
  witnessName: string;
  witnessContact: string | null;
  statement: string;
  statementDate: string | null;
  sortOrder: number;
  createdAt: string;
};

export type EvidenceDto = {
  id: number;
  investigationId: number;
  title: string;
  description: string | null;
  evidenceType: string;
  attachmentId: number | null;
  collectedAt: string | null;
  sortOrder: number;
  createdAt: string;
};

// ── Webhooks ──────────────────────────────────────────────────────────────────

export type ClientWebhookDto = {
  id: number;
  clientId: number;
  name: string;
  url: string;
  secret: string | null;
  eventTypes: string[];
  isActive: boolean;
  createdAt: string;
};

export type UpsertWebhookRequest = {
  name: string;
  url: string;
  secret?: string | null;
  eventTypes: string[];
  isActive: boolean;
};

// ── Inbound Email ──────────────────────────────────────────────────────────────

export type ClientInboundEmailDto = {
  inboundEmailSlug:             string | null;
  inboundAddress:               string | null;
  defaultInboundEventTypeId:    number | null;
  defaultInboundWorkflowStatusId: number | null;
  eventTypes:      { id: number; name: string }[];
  workflowStatuses: { id: number; name: string }[];
};

export type UpdateClientInboundEmailRequest = {
  inboundEmailSlug:             string | null;
  defaultInboundEventTypeId:    number | null;
  defaultInboundWorkflowStatusId: number | null;
};

// ── Documents ─────────────────────────────────────────────────────────

export type ClientDocumentDto = {
  id: number;
  clientId: number;
  title: string;
  description: string | null;
  category: string;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  uploadedByUserId: number | null;
  uploadedByDisplayName: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type DocumentReferenceDto = {
  id: number;
  documentId: number;
  documentTitle: string;
  documentCategory: string;
  documentFileName: string;
  createdByUserId: number | null;
  createdAt: string;
};

// ── AI ────────────────────────────────────────────────────────────────

export type AiCategorizeResponse = {
  suggestedEventTypeId: number | null;
  suggestedEventTypeName: string | null;
  eventTypeConfidence: number;
  suggestedRootCauseId: number | null;
  suggestedRootCauseName: string | null;
  rootCauseConfidence: number;
  reasoning: string;
};

export type AiInvestigateResponse = {
  suggestedRootCause: string | null;
  suggestedCorrectiveActions: string | null;
  reasoning: string;
};

export type AiTrendAnalysisResponse = {
  summary: string;
};
