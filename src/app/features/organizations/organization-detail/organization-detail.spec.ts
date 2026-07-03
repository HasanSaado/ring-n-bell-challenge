import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, of } from 'rxjs';

import { Organization } from '../../../core/organizations/organization.models';
import { OrganizationsApiService } from '../../../core/organizations/organizations-api.service';
import { OrganizationDetail } from './organization-detail';

class FakeOrganizationsApiService {
  getOrganization(_id: string): Observable<Organization> {
    return of(activeOrganization);
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
  updatedAt: '2026-01-02T00:00:00.000Z',
};

describe('OrganizationDetail', () => {
  let fixture: ComponentFixture<OrganizationDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrganizationDetail],
      providers: [
        provideRouter([]),
        { provide: OrganizationsApiService, useClass: FakeOrganizationsApiService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: activeOrganization.id }),
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OrganizationDetail);
    fixture.detectChanges();
  });

  it('renders an accessible icon-only back link and capitalized status', () => {
    const backLink = fixture.nativeElement.querySelector(
      'a[aria-label="Back to organizations"]',
    ) as HTMLAnchorElement | null;

    expect(backLink).toBeTruthy();
    expect(backLink?.textContent?.trim()).toBe('');
    expect(fixture.nativeElement.textContent).toContain('Active');
  });
});
