export type PagedResult<T> = {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export type IncidentListItemDto = {
  id: string;
  clientId: string;
  type: number;
  status: number;
  occurredAt: string;
  location: string;
  ownerUserId: string | null;
  referenceNumber: number;
  ownerDisplayName: string | null;
};

export type IncidentDetailDto = {
  id: string;
  clientId: string;
  type: number;
  status: number;
  occurredAt: string;
  location: string;
  description: string;
  reportedByUserId: string;
  ownerUserId: string | null;
  createdAt: string;
  updatedAt: string;
  referenceNumber: number;
  reportedByDisplayName: string | null;
};

export type CreateIncidentCommand = {
  clientId: string;
  type: number;
  occurredAt: string;
  location: string;
  description: string;
  reportedByUserId: string;
};

export type CreateIncidentResponse = { incidentId: string; referenceNumber: number };

export type UpdateIncidentRequest = {
  type: number;
  status: number;
  occurredAt: string;
  location: string;
  description: string;
  ownerUserId: string | null;
};

export type ClientAccessDto = {
  id: string;
  name: string;
  role: string;
  parentClientId: string | null;
};

export type AuthResultDto = {
  token: string;
  displayName: string;
  email: string;
  isSuperAdmin: boolean;
  clients: ClientAccessDto[];
};

export type AdminClientDto = {
  id: string;
  name: string;
  parentClientId: string | null;
  parentClientName: string | null;
  isActive: boolean;
  userCount: number;
  createdAt: string;
};

export type AdminUserDto = {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  clientCount: number;
  createdAt: string;
};

export type UserClientAccessDto = {
  clientId: string;
  clientName: string;
  clientIsActive: boolean;
  role: string;
  grantedAt: string;
};

export type IncidentLookupDto = {
  id: string;
  clientId: string;
  fieldKey: string;
  label: string;
  value: number;
  sortOrder: number;
  isSystem: boolean;
  isActive: boolean;
  count: number;
};

export type CustomFieldDto = {
  id: string;
  clientId: string;
  name: string;
  dataType: string;
  isRequired: boolean;
  sortOrder: number;
  isActive: boolean;
  options: string | null;
};

export type CustomFieldValueDto = {
  id: string;
  incidentId: string;
  customFieldId: string;
  fieldName: string;
  dataType: string;
  options: string | null;
  isRequired: boolean;
  value: string;
};

export type ClientUserDto = {
  id: string;
  displayName: string;
  email: string;
  role: string;
  isActive: boolean;
  isSuperAdmin: boolean;
};

export type IncidentEventDto = {
  id: string;
  incidentId: string;
  eventType: string;
  userId: string | null;
  userDisplayName: string;
  body: string;
  createdAt: string;
};

export type IncidentAttachmentDto = {
  id: string;
  incidentId: string;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  uploadedByUserId: string | null;
  uploadedByDisplayName: string;
  createdAt: string;
};

export type BulkUpdateIncidentRequest = {
  clientId: string;
  incidentIds: string[];
  status?: number;
  ownerUserId?: string | null;
  clearOwner?: boolean;
};

export type IncidentAnalyticsDto = {
  total: number;
  open: number;
  inProgress: number;
  blocked: number;
  closed: number;
  thisMonth: number;
  lastMonth: number;
  byType: { type: number; count: number }[];
  byMonth: { year: number; month: number; type: number; count: number }[];
  topLocations: { location: string; count: number }[];
  byLocationAndType: { location: string; type: number; count: number }[];
};
