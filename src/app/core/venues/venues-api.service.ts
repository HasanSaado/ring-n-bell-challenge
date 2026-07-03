import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiClient } from '../api/api-client.service';
import {
  CreateVenueRequest,
  RawVenue,
  RawVenueListResponse,
  UpdateVenueRequest,
  Venue,
  VenueListParams,
  VenueListResponse,
} from './venue.models';

@Injectable({ providedIn: 'root' })
export class VenuesApiService {
  private readonly apiClient = inject(ApiClient);
  private readonly basePath = '/v3/sales/venues';

  listVenues(params: VenueListParams): Observable<VenueListResponse> {
    return this.apiClient
      .getRaw<RawVenueListResponse>(this.basePath, { ...params })
      .pipe(map((response) => this.normalizeListResponse(response, params)));
  }

  getVenue(id: string): Observable<Venue> {
    return this.apiClient.get<RawVenue>(`${this.basePath}/${id}`).pipe(map((venue) => this.normalizeVenue(venue)));
  }

  createVenue(body: CreateVenueRequest): Observable<Venue> {
    return this.apiClient
      .post<RawVenue, CreateVenueRequest>(this.basePath, body)
      .pipe(map((venue) => this.normalizeVenue(venue)));
  }

  updateVenue(id: string, body: UpdateVenueRequest): Observable<Venue> {
    return this.apiClient
      .put<RawVenue, UpdateVenueRequest>(`${this.basePath}/${id}`, body)
      .pipe(map((venue) => this.normalizeVenue(venue)));
  }

  private normalizeListResponse(response: RawVenueListResponse, params: VenueListParams): VenueListResponse {
    if (Array.isArray(response)) {
      return {
        items: response.map((venue) => this.normalizeVenue(venue)),
        total: response.length,
        page: params.page,
        limit: params.limit,
      };
    }

    if ('items' in response) {
      return {
        ...response,
        items: response.items.map((venue) => this.normalizeVenue(venue)),
      };
    }

    if ('data' in response) {
      return {
        items: response.data.map((venue) => this.normalizeVenue(venue)),
        total: response.pagination?.total ?? response.data.length,
        page: response.pagination?.page ?? params.page,
        limit: response.pagination?.limit ?? params.limit,
      };
    }

    return {
      items: response.venues.map((venue) => this.normalizeVenue(venue)),
      total: response.total ?? response.venues.length,
      page: response.page ?? params.page,
      limit: response.limit ?? params.limit,
    };
  }

  private normalizeVenue(venue: RawVenue): Venue {
    const isActive = venue.isActive ?? venue.active ?? false;

    return {
      ...venue,
      ownerName: venue.ownerName ?? venue.owner,
      organizationName: venue.organizationName ?? venue.orgName,
      venueType: venue.venueType ?? venue.type ?? (venue.orgId || venue.organizationId ? 'organization' : 'standalone'),
      renewalDate: venue.renewalDate ?? venue.renewalAt,
      isActive,
      status: venue.status ?? (isActive ? 'active' : 'inactive'),
    };
  }
}
