import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, of } from 'rxjs';

import {
  Organization,
  OrganizationListParams,
  OrganizationListResponse,
} from '../../../core/organizations/organization.models';
import { OrganizationsApiService } from '../../../core/organizations/organizations-api.service';
import { Venue } from '../../../core/venues/venue.models';
import { VenuesApiService } from '../../../core/venues/venues-api.service';
import { VenueDetail } from './venue-detail';

class FakeVenuesApiService {
  getVenue(_id: string): Observable<Venue> {
    return of(activeVenue);
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

describe('VenueDetail', () => {
  let fixture: ComponentFixture<VenueDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VenueDetail],
      providers: [
        provideRouter([]),
        { provide: VenuesApiService, useClass: FakeVenuesApiService },
        { provide: OrganizationsApiService, useClass: FakeOrganizationsApiService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: activeVenue.id }),
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VenueDetail);
    fixture.detectChanges();
  });

  it('renders venue details returned from the API', () => {
    expect(fixture.nativeElement.textContent).toContain('Harbor Lounge');
    expect(fixture.nativeElement.textContent).toContain('Venue Owner');
    expect(fixture.nativeElement.textContent).toContain('Active Org');
    expect(fixture.nativeElement.textContent).toContain('Downtown Branch');
    expect(fixture.nativeElement.textContent).toContain('Active');
    expect(fixture.nativeElement.textContent).toContain('organization');
    expect(fixture.nativeElement.textContent).toContain('Asia/Beirut');
    expect(fixture.nativeElement.textContent).toContain('USD');
    expect(fixture.nativeElement.textContent).toContain('Beirut');
    expect(fixture.nativeElement.textContent).toContain('Lebanon');
  });

  it('renders an accessible icon-only back link', () => {
    const backLink = fixture.nativeElement.querySelector(
      'a[aria-label="Back to venues"]',
    ) as HTMLAnchorElement | null;

    expect(backLink).toBeTruthy();
    expect(backLink?.textContent?.trim()).toBe('');
  });
});
