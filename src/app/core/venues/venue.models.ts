import { SortOrder } from '../organizations/organization.models';

export type VenueStatus = 'active' | 'inactive' | 'trial';
export type VenueType = 'organization' | 'standalone';
export type VenueTypeFilter = 'all' | VenueType;
export type VenueSortBy = 'name' | 'owner' | 'createdAt';

export interface Venue {
  id: string;
  venueId?: string;
  name: string;
  ownerId?: string;
  ownerName?: string;
  ownerEmail?: string;
  orgId?: string;
  organizationId?: string;
  organizationName?: string;
  branchId?: string;
  branchName?: string;
  venueType: VenueType;
  category?: string;
  status?: VenueStatus;
  isActive: boolean;
  timezone?: string;
  currency?: string;
  city?: string;
  country?: string;
  renewalDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RawVenue extends Omit<Venue, 'category' | 'isActive' | 'status' | 'venueType'> {
  active?: boolean;
  isActive?: boolean;
  type?: string;
  venueType?: VenueType;
  orgName?: string;
  organizationName?: string;
  branchName?: string;
  owner?: string;
  ownerName?: string;
  status?: string;
  renewalAt?: string;
  renewalDate?: string;
}

export interface VenueListParams {
  page: number;
  limit: number;
  search?: string;
  sortBy: VenueSortBy;
  sortOrder: SortOrder;
  orgId?: string;
  venueType?: VenueType;
}

export interface CreateVenueRequest {
  name: string;
  ownerId?: string;
  orgId?: string;
  branchId?: string;
  venueType?: VenueType;
  active?: boolean;
  timezone?: string;
  currency?: string;
  city?: string;
  country?: string;
  renewalDate?: string;
}

export interface UpdateVenueRequest {
  name?: string;
  ownerId?: string;
  orgId?: string;
  branchId?: string;
  venueType?: VenueType;
  status?: VenueStatus;
  active?: boolean;
  timezone?: string;
  currency?: string;
  city?: string;
  country?: string;
  renewalDate?: string;
}

export interface VenueListResponse {
  items: Venue[];
  total: number;
  page: number;
  limit: number;
}

export type RawVenueListResponse =
  | RawVenue[]
  | VenueListResponse
  | {
      venues: RawVenue[];
      total?: number;
      page?: number;
      limit?: number;
    }
  | {
      success?: boolean;
      message?: string;
      data: RawVenue[];
      pagination?: {
        page?: number;
        limit?: number;
        total?: number;
        totalPages?: number;
      };
    };
