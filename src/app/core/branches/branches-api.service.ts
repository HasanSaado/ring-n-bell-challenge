import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiClient } from '../api/api-client.service';
import {
  Branch,
  BranchListParams,
  BranchListResponse,
  CreateBranchRequest,
  RawBranch,
  RawBranchListResponse,
  UpdateBranchRequest,
} from './branch.models';

@Injectable({ providedIn: 'root' })
export class BranchesApiService {
  private readonly apiClient = inject(ApiClient);
  private readonly basePath = '/v3/sales/branches';

  listBranches(params: BranchListParams): Observable<BranchListResponse> {
    return this.apiClient
      .getRaw<RawBranchListResponse>(this.basePath, { ...params })
      .pipe(map((response) => this.normalizeListResponse(response, params)));
  }

  getBranch(id: string): Observable<Branch> {
    return this.apiClient.get<RawBranch>(`${this.basePath}/${id}`).pipe(map((branch) => this.normalizeBranch(branch)));
  }

  createBranch(body: CreateBranchRequest): Observable<Branch> {
    return this.apiClient
      .post<RawBranch, CreateBranchRequest>(this.basePath, body)
      .pipe(map((branch) => this.normalizeBranch(branch)));
  }

  updateBranch(id: string, body: UpdateBranchRequest): Observable<Branch> {
    return this.apiClient
      .put<RawBranch, UpdateBranchRequest>(`${this.basePath}/${id}`, body)
      .pipe(map((branch) => this.normalizeBranch(branch)));
  }

  deleteBranch(id: string): Observable<void> {
    return this.apiClient.delete<void>(`${this.basePath}/${id}`);
  }

  private normalizeListResponse(response: RawBranchListResponse, params: BranchListParams): BranchListResponse {
    if (Array.isArray(response)) {
      return {
        items: response.map((branch) => this.normalizeBranch(branch)),
        total: response.length,
        page: params.page,
        limit: params.limit,
      };
    }

    if ('items' in response) {
      return {
        ...response,
        items: response.items.map((branch) => this.normalizeBranch(branch)),
      };
    }

    if ('data' in response) {
      return {
        items: response.data.map((branch) => this.normalizeBranch(branch)),
        total: response.pagination?.total ?? response.data.length,
        page: response.pagination?.page ?? params.page,
        limit: response.pagination?.limit ?? params.limit,
      };
    }

    return {
      items: response.branches.map((branch) => this.normalizeBranch(branch)),
      total: response.total ?? response.branches.length,
      page: response.page ?? params.page,
      limit: response.limit ?? params.limit,
    };
  }

  private normalizeBranch(branch: RawBranch): Branch {
    return {
      ...branch,
      organizationName: branch.organizationName ?? branch.orgName,
      isActive: branch.isActive ?? branch.active ?? false,
      status: branch.status ?? (branch.isActive ?? branch.active ? 'active' : 'inactive'),
    };
  }
}
