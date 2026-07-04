import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

import { Branch, CreateBranchRequest } from '../../core/branches/branch.models';
import { BranchesApiService } from '../../core/branches/branches-api.service';
import { Client, CreateClientRequest } from '../../core/clients/client.models';
import { ClientsApiService } from '../../core/clients/clients-api.service';
import { CreateOrganizationRequest, Organization } from '../../core/organizations/organization.models';
import { OrganizationsApiService } from '../../core/organizations/organizations-api.service';
import { CreateVenueRequest, Venue } from '../../core/venues/venue.models';
import { VenuesApiService } from '../../core/venues/venues-api.service';
import { WizardStateService } from './wizard-state.service';

class FakeClientsApiService {
  readonly createRequests: CreateClientRequest[] = [];
  failNextCreate = false;

  constructor(private readonly callLog: string[]) {}

  createClient(body: CreateClientRequest): Observable<Client> {
    this.callLog.push('client');
    this.createRequests.push(body);

    if (this.failNextCreate) {
      this.failNextCreate = false;
      return throwError(() => new Error('Failed to fetch'));
    }

    return of({
      id: `client_${this.createRequests.length}`,
      name: body.name,
      email: body.email,
      phone: body.phone,
      company: body.company,
      enabled: body.enabled,
    });
  }
}

class FakeOrganizationsApiService {
  readonly createRequests: CreateOrganizationRequest[] = [];

  constructor(private readonly callLog: string[]) {}

  createOrganization(body: CreateOrganizationRequest): Observable<Organization> {
    this.callLog.push('organization');
    this.createRequests.push(body);

    return of({
      id: `organization_${this.createRequests.length}`,
      orgId: `org_${this.createRequests.length}`,
      name: body.name,
      adminId: body.adminId,
      status: 'active',
      isActive: true,
      country: body.country ?? 'Lebanon',
      timezone: body.timezone ?? 'Asia/Beirut',
      currency: body.currency ?? 'USD',
      billingEmail: body.billingEmail,
      branchCount: 0,
      venueCount: 0,
      createdAt: '2026-07-04T00:00:00.000Z',
      updatedAt: '2026-07-04T00:00:00.000Z',
    });
  }
}

class FakeBranchesApiService {
  readonly createRequests: CreateBranchRequest[] = [];
  failNextCreate = false;

  constructor(private readonly callLog: string[]) {}

  createBranch(body: CreateBranchRequest): Observable<Branch> {
    this.callLog.push('branch');
    this.createRequests.push(body);

    if (this.failNextCreate) {
      this.failNextCreate = false;
      return throwError(() => new Error('Branch create failed.'));
    }

    return of({
      id: `branch_${this.createRequests.length}`,
      branchId: `br_${this.createRequests.length}`,
      name: body.name,
      orgId: body.orgId,
      city: body.city ?? '',
      country: body.country ?? '',
      venueCount: 0,
      isActive: body.active ?? true,
      status: body.active === false ? 'inactive' : 'active',
    });
  }
}

class FakeVenuesApiService {
  readonly createRequests: CreateVenueRequest[] = [];
  failNextCreate = false;

  constructor(private readonly callLog: string[]) {}

  createVenue(body: CreateVenueRequest): Observable<Venue> {
    this.callLog.push('venue');
    this.createRequests.push(body);

    if (this.failNextCreate) {
      this.failNextCreate = false;
      return throwError(() => new Error('Venue create failed.'));
    }

    return of({
      id: `venue_${this.createRequests.length}`,
      name: body.name,
      ownerId: body.owner,
      orgId: body.orgId,
      branchId: body.branchId,
      venueType: body.orgId ? 'organization' : 'standalone',
      category: body.type,
      status: body.status === 'Inactive' ? 'inactive' : 'active',
      isActive: body.status !== 'Inactive',
      timezone: body.timezone,
      currency: body.currency,
      city: body.city,
      country: body.country,
    });
  }
}

describe('WizardStateService', () => {
  let service: WizardStateService;
  let callLog: string[];
  let fakeClientsApi: FakeClientsApiService;
  let fakeOrganizationsApi: FakeOrganizationsApiService;
  let fakeBranchesApi: FakeBranchesApiService;
  let fakeVenuesApi: FakeVenuesApiService;

  beforeEach(() => {
    callLog = [];
    fakeClientsApi = new FakeClientsApiService(callLog);
    fakeOrganizationsApi = new FakeOrganizationsApiService(callLog);
    fakeBranchesApi = new FakeBranchesApiService(callLog);
    fakeVenuesApi = new FakeVenuesApiService(callLog);

    TestBed.configureTestingModule({
      providers: [
        WizardStateService,
        { provide: ClientsApiService, useValue: fakeClientsApi },
        { provide: OrganizationsApiService, useValue: fakeOrganizationsApi },
        { provide: BranchesApiService, useValue: fakeBranchesApi },
        { provide: VenuesApiService, useValue: fakeVenuesApi },
      ],
    });

    service = TestBed.inject(WizardStateService);
  });

  it('returns steps for the organization path', () => {
    expect(service.getStepsForPath('organization').map((step) => step.label)).toEqual([
      'Client',
      'Organization',
      'Branch',
      'Venue',
      'Review',
    ]);
  });

  it('returns steps for the standalone path', () => {
    expect(service.getStepsForPath('standalone').map((step) => step.label)).toEqual([
      'Client',
      'Venue',
      'Review',
    ]);
  });

  it('finishes the standalone path by creating client then venue with nullable placement fields', async () => {
    fillStandaloneWizard();

    const venueId = await service.finish();

    expect(venueId).toBe('venue_1');
    expect(callLog).toEqual(['client', 'venue']);
    expect(fakeVenuesApi.createRequests.at(-1)).toEqual({
      name: 'Harbor Lounge',
      owner: 'client_1',
      type: 'restaurant',
      orgId: null,
      branchId: null,
      status: 'Active',
      timezone: 'Asia/Beirut',
      currency: 'USD',
      city: 'Beirut',
      country: 'Lebanon',
    });
    expect(Object.prototype.hasOwnProperty.call(fakeVenuesApi.createRequests.at(-1), 'ownerId')).toBe(false);
  });

  it('finishes the organization path in typed dependency order', async () => {
    fillOrganizationWizard();

    const venueId = await service.finish();

    expect(venueId).toBe('venue_1');
    expect(callLog).toEqual(['client', 'organization', 'branch', 'venue']);
    expect(fakeOrganizationsApi.createRequests.at(-1)?.adminId).toBe('client_1');
    expect(fakeBranchesApi.createRequests.at(-1)?.orgId).toBe('organization_1');
    expect(fakeVenuesApi.createRequests.at(-1)).toEqual({
      name: 'Harbor Lounge',
      owner: 'client_1',
      type: 'restaurant',
      orgId: 'organization_1',
      branchId: 'branch_1',
      status: 'Active',
      timezone: 'Asia/Beirut',
      currency: 'USD',
      city: 'Beirut',
      country: 'Lebanon',
    });
  });

  it('does not recreate successful standalone entities when retrying after venue failure', async () => {
    fillStandaloneWizard();
    fakeVenuesApi.failNextCreate = true;

    await expect(service.finish()).rejects.toThrow(
      "We couldn't create the venue. Something went wrong. Please try again.",
    );

    expect(service.failedStep()).toBe('venue');
    expect(service.failedEntity()).toBe('venue');
    expect(service.errorMessage()).toBe("We couldn't create the venue. Something went wrong. Please try again.");
    expect(service.createdEntities().clientId).toBe('client_1');
    expect(service.createdEntities().venueId).toBeUndefined();

    const venueId = await service.finish();

    expect(venueId).toBe('venue_2');
    expect(fakeClientsApi.createRequests).toHaveLength(1);
    expect(fakeVenuesApi.createRequests).toHaveLength(2);
    expect(callLog).toEqual(['client', 'venue', 'venue']);
    expect(fakeVenuesApi.createRequests.at(-1)?.owner).toBe('client_1');
  });

  it('does not recreate successful organization path entities when retrying after venue failure', async () => {
    fillOrganizationWizard();
    fakeVenuesApi.failNextCreate = true;

    await expect(service.finish()).rejects.toThrow(
      "We couldn't create the venue. Something went wrong. Please try again.",
    );

    expect(service.createdEntities()).toEqual({
      clientId: 'client_1',
      organizationId: 'organization_1',
      branchId: 'branch_1',
    });

    const venueId = await service.finish();

    expect(venueId).toBe('venue_2');
    expect(fakeClientsApi.createRequests).toHaveLength(1);
    expect(fakeOrganizationsApi.createRequests).toHaveLength(1);
    expect(fakeBranchesApi.createRequests).toHaveLength(1);
    expect(fakeVenuesApi.createRequests).toHaveLength(2);
    expect(callLog).toEqual(['client', 'organization', 'branch', 'venue', 'venue']);
    expect(fakeVenuesApi.createRequests.at(-1)?.orgId).toBe('organization_1');
    expect(fakeVenuesApi.createRequests.at(-1)?.branchId).toBe('branch_1');
  });

  it('does not recreate client or organization when retrying after branch failure', async () => {
    fillOrganizationWizard();
    fakeBranchesApi.failNextCreate = true;

    await expect(service.finish()).rejects.toThrow(
      "We couldn't create the branch. Something went wrong. Please try again.",
    );

    expect(service.failedStep()).toBe('branch');
    expect(service.createdEntities()).toEqual({
      clientId: 'client_1',
      organizationId: 'organization_1',
    });

    const venueId = await service.finish();

    expect(venueId).toBe('venue_1');
    expect(fakeClientsApi.createRequests).toHaveLength(1);
    expect(fakeOrganizationsApi.createRequests).toHaveLength(1);
    expect(fakeBranchesApi.createRequests).toHaveLength(2);
    expect(fakeVenuesApi.createRequests).toHaveLength(1);
    expect(callLog).toEqual(['client', 'organization', 'branch', 'branch', 'venue']);
    expect(fakeBranchesApi.createRequests.at(-1)?.orgId).toBe('organization_1');
    expect(fakeVenuesApi.createRequests.at(-1)?.branchId).toBe('branch_2');
  });

  it('stores a friendly client message for network failures', async () => {
    fillStandaloneWizard();
    fakeClientsApi.failNextCreate = true;

    await expect(service.finish()).rejects.toThrow(
      "We couldn't create the client. Something went wrong. Please try again.",
    );

    expect(service.failedStep()).toBe('client');
    expect(service.failedEntity()).toBe('client');
    expect(service.errorMessage()).toBe("We couldn't create the client. Something went wrong. Please try again.");
    expect(service.errorMessage()).not.toContain('Failed to fetch');
    expect(service.createdEntities()).toEqual({});
  });

  function fillStandaloneWizard(): void {
    service.setPath('standalone');
    service.updateClient({
      name: 'Maya Owner',
      email: 'maya@example.test',
      phone: '+961000000',
      company: 'Harbor Group',
      enabled: true,
    });
    service.updateVenue({
      name: 'Harbor Lounge',
      type: 'restaurant',
      status: 'Active',
      timezone: 'Asia/Beirut',
      currency: 'USD',
      city: 'Beirut',
      country: 'Lebanon',
    });
  }

  function fillOrganizationWizard(): void {
    service.setPath('organization');
    service.updateClient({
      name: 'Maya Owner',
      email: 'maya@example.test',
      phone: '+961000000',
      company: 'Harbor Group',
      enabled: true,
    });
    service.updateOrganization({
      name: 'Harbor Group',
      country: 'Lebanon',
      timezone: 'Asia/Beirut',
      currency: 'USD',
      billingEmail: 'billing@example.test',
    });
    service.updateBranch({
      name: 'Downtown Branch',
      city: 'Beirut',
      country: 'Lebanon',
      active: true,
    });
    service.updateVenue({
      name: 'Harbor Lounge',
      type: 'restaurant',
      status: 'Active',
      timezone: 'Asia/Beirut',
      currency: 'USD',
      city: 'Beirut',
      country: 'Lebanon',
    });
  }
});
