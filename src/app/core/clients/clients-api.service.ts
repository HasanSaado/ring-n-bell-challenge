import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiClient } from '../api/api-client.service';
import {
  Client,
  ClientListParams,
  ClientListResponse,
  CreateClientRequest,
  RawClient,
  RawClientListResponse,
  UpdateClientRequest,
} from './client.models';

@Injectable({ providedIn: 'root' })
export class ClientsApiService {
  private readonly apiClient = inject(ApiClient);
  private readonly basePath = '/v3/sales/clients';

  listClients(params: ClientListParams): Observable<Client[]> {
    return this.listClientPage({
      page: 1,
      limit: params.limit ?? 20,
      sortBy: params.sortBy ?? 'name',
      sortOrder: params.sortOrder ?? 'asc',
      ...params,
    }).pipe(map((response) => response.items));
  }

  listClientPage(params: ClientListParams): Observable<ClientListResponse> {
    return this.apiClient
      .getRaw<RawClientListResponse>(this.basePath, { ...params })
      .pipe(map((response) => this.normalizeListResponse(response, params)));
  }

  getClient(id: string): Observable<Client> {
    return this.apiClient.get<RawClient>(`${this.basePath}/${id}`).pipe(map((client) => this.normalizeClient(client)));
  }

  createClient(body: CreateClientRequest): Observable<Client> {
    return this.apiClient
      .post<RawClient, CreateClientRequest>(this.basePath, body)
      .pipe(map((client) => this.normalizeClient(client)));
  }

  updateClient(id: string, body: UpdateClientRequest): Observable<Client> {
    return this.apiClient
      .put<RawClient, UpdateClientRequest>(`${this.basePath}/${id}`, body)
      .pipe(map((client) => this.normalizeClient(client)));
  }

  deleteClient(id: string): Observable<void> {
    return this.apiClient.delete<void>(`${this.basePath}/${id}`);
  }

  private normalizeListResponse(response: RawClientListResponse, params: ClientListParams): ClientListResponse {
    if (Array.isArray(response)) {
      return {
        items: response.map((client) => this.normalizeClient(client)),
        total: response.length,
        page: params.page ?? 1,
        limit: params.limit ?? response.length,
      };
    }

    if ('items' in response) {
      return {
        ...response,
        items: response.items.map((client) => this.normalizeClient(client)),
      };
    }

    if ('data' in response) {
      return {
        items: response.data.map((client) => this.normalizeClient(client)),
        total: response.pagination?.total ?? response.data.length,
        page: response.pagination?.page ?? params.page ?? 1,
        limit: response.pagination?.limit ?? params.limit ?? response.data.length,
      };
    }

    return {
      items: response.clients.map((client) => this.normalizeClient(client)),
      total: response.total ?? response.clients.length,
      page: response.page ?? params.page ?? 1,
      limit: response.limit ?? params.limit ?? response.clients.length,
    };
  }

  private normalizeClient(client: RawClient): Client {
    return {
      ...client,
      enabled: client.enabled ?? client.isEnabled ?? client.active ?? client.isActive ?? this.enabledFromStatus(client.status),
      organizationCount: client.organizationCount ?? client.orgCount ?? client.organizationsCount,
      venueCount: client.venueCount ?? client.venue_count ?? client.venuesCount,
      salesName: client.salesName ?? client.salesOwnerName ?? client.sales,
      createdAt: client.createdAt ?? client.created_at,
      updatedAt: client.updatedAt ?? client.updated_at,
    };
  }

  private enabledFromStatus(status?: string): boolean | undefined {
    const normalizedStatus = status?.toLowerCase();

    if (!normalizedStatus) {
      return undefined;
    }

    if (['active', 'enabled'].includes(normalizedStatus)) {
      return true;
    }

    if (['inactive', 'disabled'].includes(normalizedStatus)) {
      return false;
    }

    return undefined;
  }
}
