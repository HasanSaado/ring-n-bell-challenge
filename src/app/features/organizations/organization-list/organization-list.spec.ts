import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, Subject, of } from 'rxjs';

import {
  Organization,
  OrganizationListParams,
  OrganizationListResponse,
  UpdateOrganizationRequest,
} from '../../../core/organizations/organization.models';
import { OrganizationsApiService } from '../../../core/organizations/organizations-api.service';
import { OrganizationList } from './organization-list';

class FakeOrganizationsApiService {
  readonly updateSubject = new Subject<Organization>();
  readonly listRequests: OrganizationListParams[] = [];

  listOrganizations(params: OrganizationListParams): Observable<OrganizationListResponse> {
    this.listRequests.push(params);

    return of({
      items: [activeOrganization],
      total: 1,
      page: 1,
      limit: 10,
    });
  }

  updateOrganization(_id: string, _body: UpdateOrganizationRequest): Observable<Organization> {
    return this.updateSubject.asObservable();
  }
}

const activeOrganization: Organization = {
  id: 'org_001',
  orgId: 'RNB-001',
  name: 'Active Org',
  adminId: 'client_001',
  adminName: 'Admin User',
  salesId: 'sales_001',
  salesName: 'Sales User',
  status: 'active',
  isActive: true,
  country: 'Lebanon',
  timezone: 'Asia/Beirut',
  currency: 'USD',
  billingEmail: 'billing@example.test',
  branchCount: 2,
  venueCount: 3,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('OrganizationList', () => {
  let fixture: ComponentFixture<OrganizationList>;
  let fakeApi: FakeOrganizationsApiService;

  beforeEach(async () => {
    fakeApi = new FakeOrganizationsApiService();

    await TestBed.configureTestingModule({
      imports: [OrganizationList],
      providers: [
        provideRouter([]),
        { provide: OrganizationsApiService, useValue: fakeApi },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OrganizationList);
    fixture.detectChanges();
  });

  it('rolls back an optimistic active status toggle when the update fails', () => {
    expect(fixture.nativeElement.textContent).toContain('Active');
    expect(findLink('View organization details')).toBeTruthy();

    const toggleButton = findButton('Deactivate organization');
    toggleButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Inactive');
    expect(findButton('Activate organization')).toBeTruthy();

    fakeApi.updateSubject.error(new Error('Update failed'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Active');
    expect(findButton('Deactivate organization')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Status update failed. The previous value was restored.');
  });

  it('toggles name sorting from the table header and reloads from the API', () => {
    expect(fakeApi.listRequests.at(-1)?.sortBy).toBe('name');
    expect(fakeApi.listRequests.at(-1)?.sortOrder).toBe('asc');

    const nameSortButton = fixture.nativeElement.querySelector(
      'button[aria-label="Sort by name"]',
    ) as HTMLButtonElement | null;

    expect(nameSortButton).toBeTruthy();
    nameSortButton?.click();
    fixture.detectChanges();

    expect(fakeApi.listRequests.at(-1)?.sortBy).toBe('name');
    expect(fakeApi.listRequests.at(-1)?.sortOrder).toBe('desc');
  });

  function findButton(label: string): HTMLButtonElement {
    const button = fixture.nativeElement.querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement | null;

    if (!button) {
      throw new Error(`Button "${label}" was not found.`);
    }

    return button;
  }

  function findLink(label: string): HTMLAnchorElement {
    const link = fixture.nativeElement.querySelector(`a[aria-label="${label}"]`) as HTMLAnchorElement | null;

    if (!link) {
      throw new Error(`Link "${label}" was not found.`);
    }

    return link;
  }
});
