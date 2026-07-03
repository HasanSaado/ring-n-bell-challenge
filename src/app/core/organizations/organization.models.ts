export type OrganizationStatus = 'active' | 'inactive';
export type OrganizationSortBy = 'name' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

export interface Organization {
  id: string;
  orgId: string;
  name: string;
  adminId: string;
  adminName?: string;
  adminEmail?: string;
  salesId?: string;
  salesName?: string;
  status: OrganizationStatus;
  isActive: boolean;
  country: string;
  timezone: string;
  currency: string;
  billingEmail?: string;
  branchCount: number;
  venueCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationListParams {
  page: number;
  limit: number;
  search?: string;
  sortBy: OrganizationSortBy;
  sortOrder: SortOrder;
  salesId?: string;
}

export interface CreateOrganizationRequest {
  name: string;
  adminId: string;
  country?: string;
  timezone?: string;
  currency?: string;
  billingEmail?: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  adminId?: string;
  salesId?: string;
  status?: OrganizationStatus;
  isActive?: boolean;
  country?: string;
  timezone?: string;
  currency?: string;
  billingEmail?: string;
}

export interface OrganizationStats {
  branchCount: number;
  venueCount: number;
}

export interface OrganizationListResponse {
  items: Organization[];
  total: number;
  page: number;
  limit: number;
}

export type RawOrganizationListResponse =
  | Organization[]
  | OrganizationListResponse
  | {
      organizations: Organization[];
      total?: number;
      page?: number;
      limit?: number;
    };
