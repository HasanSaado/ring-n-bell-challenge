export interface DashboardCards {
  organizations: number;
  activeOrganizations: number;
  venues: number;
  activeVenues: number;
  trialVenues: number;
  renewalsDueSoon: number;
  offlineDevices: number;
}

export interface DashboardVenue {
  id: string;
  name?: string;
  venueName?: string;
  organizationName?: string;
  renewalDate?: string;
  expiresAt?: string;
  status?: string;
}

export interface DashboardAuditItem {
  id: string;
  action: string;
  organizationName?: string;
  venueName?: string;
  resourceId?: string;
  entityType?: string;
  entityName?: string;
  staffName?: string;
  actorName?: string;
  createdAt?: string;
  timestamp?: string;
}

export type DashboardAuditLog = DashboardAuditItem;

export interface DashboardStaffWorkload {
  staffId: string;
  staffName: string;
  openTasks: number;
}

export interface DashboardFunnelItem {
  label: string;
  count: number;
}

export interface DashboardSummary {
  cards: DashboardCards;
  renewalsDueSoon: DashboardVenue[];
  recentAudit: DashboardAuditItem[];
  salesWorkload: DashboardStaffWorkload[];
  funnel: DashboardFunnelItem[];
}
