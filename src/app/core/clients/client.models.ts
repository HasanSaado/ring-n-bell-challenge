import { SortOrder } from '../organizations/organization.models';

export type ClientSortBy = 'name' | 'createdAt';

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  company?: string;
  enabled?: boolean;
  status?: string;
  organizationCount?: number;
  venueCount?: number;
  salesId?: string;
  salesName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RawClient extends Client {
  active?: boolean;
  isActive?: boolean;
  isEnabled?: boolean;
  created_at?: string;
  updated_at?: string;
  orgCount?: number;
  organizationsCount?: number;
  venue_count?: number;
  venuesCount?: number;
  sales?: string;
  salesOwnerName?: string;
}

export interface ClientListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: ClientSortBy;
  sortOrder?: SortOrder;
  salesId?: string;
}

export interface ClientListResponse {
  items: Client[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateClientRequest {
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  company?: string;
  enabled?: boolean;
  salesId?: string;
}

export type UpdateClientRequest = Partial<CreateClientRequest>;

export type RawClientListResponse =
  | RawClient[]
  | ClientListResponse
  | {
      clients: RawClient[];
      total?: number;
      page?: number;
      limit?: number;
    }
  | {
      success?: boolean;
      message?: string;
      data: RawClient[];
      pagination?: {
        page?: number;
        limit?: number;
        total?: number;
        totalPages?: number;
      };
    };
