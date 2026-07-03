import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiClient } from '../api/api-client.service';
import { Client, ClientListParams, RawClientListResponse } from './client.models';

@Injectable({ providedIn: 'root' })
export class ClientsApiService {
  private readonly apiClient = inject(ApiClient);

  listClients(params: ClientListParams): Observable<Client[]> {
    return this.apiClient
      .get<RawClientListResponse>('/v3/sales/clients', { ...params })
      .pipe(map((response) => this.normalizeListResponse(response)));
  }

  private normalizeListResponse(response: RawClientListResponse): Client[] {
    if (Array.isArray(response)) {
      return response;
    }

    if ('items' in response) {
      return response.items;
    }

    return response.clients;
  }
}
