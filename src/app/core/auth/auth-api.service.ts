import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../api/api-client.service';
import { LoginRequest, LoginResponse } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly apiClient = inject(ApiClient);

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.apiClient.post<LoginResponse, LoginRequest>('/auth/login', credentials);
  }
}
