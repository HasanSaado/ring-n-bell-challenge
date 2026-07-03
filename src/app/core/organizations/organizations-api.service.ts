import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiClient } from '../api/api-client.service';
import {
  CreateOrganizationRequest,
  Organization,
  OrganizationListParams,
  OrganizationListResponse,
  RawOrganizationListResponse,
  UpdateOrganizationRequest,
} from './organization.models';

@Injectable({ providedIn: 'root' })
export class OrganizationsApiService {
  private readonly apiClient = inject(ApiClient);
  private readonly basePath = '/v3/sales/organizations';

  listOrganizations(params: OrganizationListParams): Observable<OrganizationListResponse> {
    return this.apiClient
      .get<RawOrganizationListResponse>(this.basePath, { ...params })
      .pipe(map((response) => this.normalizeListResponse(response, params)));
  }

  getOrganization(id: string): Observable<Organization> {
    return this.apiClient.get<Organization>(`${this.basePath}/${id}`);
  }

  createOrganization(body: CreateOrganizationRequest): Observable<Organization> {
    return this.apiClient.post<Organization, CreateOrganizationRequest>(this.basePath, body);
  }

  updateOrganization(id: string, body: UpdateOrganizationRequest): Observable<Organization> {
    return this.apiClient.put<Organization, UpdateOrganizationRequest>(`${this.basePath}/${id}`, body);
  }

  private normalizeListResponse(
    response: RawOrganizationListResponse,
    params: OrganizationListParams,
  ): OrganizationListResponse {
    if (Array.isArray(response)) {
      return {
        items: response,
        total: response.length,
        page: params.page,
        limit: params.limit,
      };
    }

    if ('items' in response) {
      return response;
    }

    return {
      items: response.organizations,
      total: response.total ?? response.organizations.length,
      page: response.page ?? params.page,
      limit: response.limit ?? params.limit,
    };
  }
}
