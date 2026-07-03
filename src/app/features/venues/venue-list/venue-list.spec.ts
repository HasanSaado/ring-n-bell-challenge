import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, Subject, of } from 'rxjs';

import {
  Organization,
  OrganizationListParams,
  OrganizationListResponse,
} from '../../../core/organizations/organization.models';
import { OrganizationsApiService } from '../../../core/organizations/organizations-api.service';
import {
  UpdateVenueRequest,
  Venue,
  VenueListParams,
  VenueListResponse,
} from '../../../core/venues/venue.models';
import { VenuesApiService } from '../../../core/venues/venues-api.service';
import { VenueList } from './venue-list';

class FakeVenuesApiService {
  readonly updateSubject = new Subject<Venue>();
  readonly listRequests: VenueListParams[] = [];
  readonly updateRequests: Array<{ id: string; body: UpdateVenueRequest }> = [];

  listVenues(params: VenueListParams): Observable<VenueListResponse> {
    this.listRequests.push(params);

    return of({
      items: [activeVenue],
      total: 1,
      page: 1,
      limit: 10,
    });
  }

  updateVenue(id: string, body: UpdateVenueRequest): Observable<Venue> {
    this.updateRequests.push({ id, body });
    return this.updateSubject.asObservable();
  }
}

class FakeOrganizationsApiService {
  listOrganizations(_params: OrganizationListParams): Observable<OrganizationListResponse> {
    return of({
      items: [activeOrganization],
      total: 1,
      page: 1,
      limit: 100,
    });
  }
}

const activeVenue: Venue = {
  id: 'venue_001',
  venueId: 'VEN-001',
  name: 'Harbor Lounge',
  ownerId: 'client_001',
  ownerName: 'Venue Owner',
  orgId: 'org_001',
  organizationName: 'Active Org',
  branchId: 'branch_001',
  branchName: 'Downtown Branch',
  venueType: 'organization',
  status: 'active',
  isActive: true,
  timezone: 'Asia/Beirut',
  currency: 'USD',
  city: 'Beirut',
  country: 'Lebanon',
  renewalDate: '2026-12-31T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

const activeOrganization: Organization = {
  id: 'org_001',
  orgId: 'RNB-001',
  name: 'Active Org',
  adminId: 'client_001',
  adminName: 'Admin User',
  status: 'active',
  isActive: true,
  country: 'Lebanon',
  timezone: 'Asia/Beirut',
  currency: 'USD',
  branchCount: 1,
  venueCount: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('VenueList', () => {
  let fixture: ComponentFixture<VenueList>;
  let fakeVenuesApi: FakeVenuesApiService;

  beforeEach(async () => {
    fakeVenuesApi = new FakeVenuesApiService();

    await TestBed.configureTestingModule({
      imports: [VenueList],
      providers: [
        provideRouter([]),
        { provide: VenuesApiService, useValue: fakeVenuesApi },
        { provide: OrganizationsApiService, useClass: FakeOrganizationsApiService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VenueList);
    fixture.detectChanges();
  });

  it('renders venue rows returned from the API', () => {
    expect(fixture.nativeElement.textContent).toContain('Harbor Lounge');
    expect(fixture.nativeElement.textContent).toContain('Venue Owner');
    expect(fixture.nativeElement.textContent).toContain('Active Org');
    expect(fixture.nativeElement.textContent).toContain('Downtown Branch');
    expect(fixture.nativeElement.textContent).toContain('Asia/Beirut');
    expect(fixture.nativeElement.textContent).toContain('USD');
  });

  it('links each row to the venue detail route', () => {
    const detailLink = fixture.nativeElement.querySelector(
      'a[aria-label="View venue details"]',
    ) as HTMLAnchorElement | null;

    expect(detailLink).toBeTruthy();
    expect(detailLink?.getAttribute('href')).toBe('/venues/venue_001');
  });

  it('rolls back an optimistic active status toggle when the update fails', () => {
    expect(fixture.nativeElement.textContent).toContain('Active');

    const toggleButton = findButton('Deactivate venue');
    toggleButton.click();
    fixture.detectChanges();

    expect(fakeVenuesApi.updateRequests.at(-1)).toEqual({
      id: activeVenue.id,
      body: {
        active: false,
        status: 'inactive',
      },
    });
    expect(fixture.nativeElement.textContent).toContain('Inactive');
    expect(findButton('Activate venue')).toBeTruthy();

    fakeVenuesApi.updateSubject.error(new Error('Update failed'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Active');
    expect(findButton('Deactivate venue')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Status update failed. The previous value was restored.');
  });

  it('toggles owner sorting from the table header and reloads from the API', () => {
    expect(fakeVenuesApi.listRequests.at(-1)?.sortBy).toBe('name');
    expect(fakeVenuesApi.listRequests.at(-1)?.sortOrder).toBe('asc');

    const ownerSortButton = fixture.nativeElement.querySelector(
      'button[aria-label="Sort by owner"]',
    ) as HTMLButtonElement | null;

    expect(ownerSortButton).toBeTruthy();
    ownerSortButton?.click();
    fixture.detectChanges();

    expect(fakeVenuesApi.listRequests.at(-1)?.sortBy).toBe('owner');
    expect(fakeVenuesApi.listRequests.at(-1)?.sortOrder).toBe('asc');

    ownerSortButton?.click();
    fixture.detectChanges();

    expect(fakeVenuesApi.listRequests.at(-1)?.sortBy).toBe('owner');
    expect(fakeVenuesApi.listRequests.at(-1)?.sortOrder).toBe('desc');
  });

  it('sends the organization and venue type filters to the API', () => {
    setSelectValue('select[formControlName]', 'organization');
  });

  function setSelectValue(_selector: string, _value: string): void {
    const selects = fixture.nativeElement.querySelectorAll('select') as NodeListOf<HTMLSelectElement>;
    const orgSelect = selects.item(0);
    const typeSelect = selects.item(1);

    orgSelect.value = activeOrganization.id;
    orgSelect.dispatchEvent(new Event('change'));
    typeSelect.value = 'organization';
    typeSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fakeVenuesApi.listRequests.at(-1)?.orgId).toBe(activeOrganization.id);
    expect(fakeVenuesApi.listRequests.at(-1)?.venueType).toBe('organization');
  }

  function findButton(label: string): HTMLButtonElement {
    const button = fixture.nativeElement.querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement | null;

    if (!button) {
      throw new Error(`Button "${label}" was not found.`);
    }

    return button;
  }
});
