import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';

interface ApiEnvelope<T> {
  data: T;
}

type ApiResponse<T> = T | ApiEnvelope<T>;

@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  get<T>(path: string): Observable<T> {
    return this.http.get<ApiResponse<T>>(this.buildUrl(path)).pipe(map((response) => this.unwrap(response)));
  }

  post<TResponse, TBody extends object>(path: string, body: TBody): Observable<TResponse> {
    return this.http
      .post<ApiResponse<TResponse>>(this.buildUrl(path), body)
      .pipe(map((response) => this.unwrap(response)));
  }

  private buildUrl(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${normalizedPath}`;
  }

  private unwrap<T>(response: ApiResponse<T>): T {
    if (this.isEnvelope(response)) {
      return response.data;
    }

    return response;
  }

  private isEnvelope<T>(response: ApiResponse<T>): response is ApiEnvelope<T> {
    return typeof response === 'object' && response !== null && 'data' in response;
  }
}
