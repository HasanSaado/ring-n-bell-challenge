import { OrganizationSortBy, SortOrder } from '../organizations/organization.models';

export type BranchStatus = 'active' | 'inactive';
export type BranchSortBy = OrganizationSortBy;

export interface Branch {
  id: string;
  branchId?: string;
  name: string;
  orgId: string;
  organizationId?: string;
  organizationName?: string;
  city: string;
  country: string;
  venueCount: number;
  status?: BranchStatus;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface RawBranch extends Omit<Branch, 'isActive'> {
  active?: boolean;
  isActive?: boolean;
  orgName?: string;
  activeVenueCount?: number;
}

export interface BranchListParams {
  page: number;
  limit: number;
  search?: string;
  sortBy: BranchSortBy;
  sortOrder: SortOrder;
  orgId?: string;
}

export interface CreateBranchRequest {
  name: string;
  orgId: string;
  city?: string;
  country?: string;
  active?: boolean;
}

export interface UpdateBranchRequest {
  name?: string;
  orgId?: string;
  city?: string;
  country?: string;
  status?: BranchStatus;
  active?: boolean;
}

export interface BranchListResponse {
  items: Branch[];
  total: number;
  page: number;
  limit: number;
}

export type RawBranchListResponse =
  | RawBranch[]
  | BranchListResponse
  | {
      branches: RawBranch[];
      total?: number;
      page?: number;
      limit?: number;
    }
  | {
      success?: boolean;
      message?: string;
      data: RawBranch[];
      pagination?: {
        page?: number;
        limit?: number;
        total?: number;
        totalPages?: number;
      };
    };
