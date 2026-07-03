import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';

import {
  Branch,
  BranchListParams,
  BranchListResponse,
  CreateBranchRequest,
  UpdateBranchRequest,
} from '../../../core/branches/branch.models';
import { BranchesApiService } from '../../../core/branches/branches-api.service';
import {
  Organization,
  OrganizationListParams,
  OrganizationListResponse,
} from '../../../core/organizations/organization.models';
import { OrganizationsApiService } from '../../../core/organizations/organizations-api.service';
import { BranchList } from './branch-list';

class FakeBranchesApiService {
  readonly listRequests: BranchListParams[] = [];
  readonly createRequests: CreateBranchRequest[] = [];
  readonly updateRequests: Array<{ id: string; body: UpdateBranchRequest }> = [];
  readonly deleteRequests: string[] = [];
  createError: unknown | null = null;
  updateError: unknown | null = null;
  deleteError: unknown | null = null;

  listBranches(params: BranchListParams): Observable<BranchListResponse> {
    this.listRequests.push(params);

    return of({
      items: [activeBranch],
      total: 1,
      page: 1,
      limit: 10,
    });
  }

  createBranch(body: CreateBranchRequest): Observable<Branch> {
    this.createRequests.push(body);

    if (this.createError) {
      return throwError(() => this.createError);
    }

    return of({ ...activeBranch, ...body });
  }

  updateBranch(id: string, body: UpdateBranchRequest): Observable<Branch> {
    this.updateRequests.push({ id, body });

    if (this.updateError) {
      return throwError(() => this.updateError);
    }

    return of({ ...activeBranch, ...body });
  }

  deleteBranch(id: string): Observable<void> {
    this.deleteRequests.push(id);

    if (this.deleteError) {
      return throwError(() => this.deleteError);
    }

    return of(undefined);
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

const activeBranch: Branch = {
  id: 'branch_001',
  branchId: 'BR-001',
  name: 'Downtown Branch',
  orgId: 'org_001',
  organizationName: 'Active Org',
  city: 'Beirut',
  country: 'Lebanon',
  venueCount: 4,
  status: 'active',
  isActive: true,
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
  venueCount: 4,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('BranchList', () => {
  let fixture: ComponentFixture<BranchList>;
  let fakeBranchesApi: FakeBranchesApiService;

  beforeEach(async () => {
    fakeBranchesApi = new FakeBranchesApiService();

    await TestBed.configureTestingModule({
      imports: [BranchList],
      providers: [
        { provide: BranchesApiService, useValue: fakeBranchesApi },
        { provide: OrganizationsApiService, useClass: FakeOrganizationsApiService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BranchList);
    fixture.detectChanges();
  });

  it('renders branch rows returned from the API', () => {
    expect(fixture.nativeElement.textContent).toContain('Downtown Branch');
    expect(fixture.nativeElement.textContent).toContain('Active Org');
    expect(fixture.nativeElement.textContent).toContain('Beirut');
    expect(fixture.nativeElement.textContent).toContain('Active');
  });

  it('toggles name sorting from the table header and reloads from the API', () => {
    expect(fakeBranchesApi.listRequests.at(-1)?.sortBy).toBe('name');
    expect(fakeBranchesApi.listRequests.at(-1)?.sortOrder).toBe('asc');

    const nameSortButton = fixture.nativeElement.querySelector(
      'button[aria-label="Sort by branch name"]',
    ) as HTMLButtonElement | null;

    expect(nameSortButton).toBeTruthy();
    nameSortButton?.click();
    fixture.detectChanges();

    expect(fakeBranchesApi.listRequests.at(-1)?.sortBy).toBe('name');
    expect(fakeBranchesApi.listRequests.at(-1)?.sortOrder).toBe('desc');
  });

  it('creates a branch from the form and reloads the current list', () => {
    clickButton('Create Branch');
    fixture.detectChanges();

    setSelectValue('select[formControlName="orgId"]', activeOrganization.id);
    setInputValue('input[formControlName="name"]', 'Harbor Branch');
    setInputValue('input[formControlName="city"]', 'Tripoli');
    fixture.detectChanges();

    clickButton('Create branch');
    fixture.detectChanges();

    expect(fakeBranchesApi.createRequests.at(-1)).toEqual({
      orgId: activeOrganization.id,
      name: 'Harbor Branch',
      city: 'Tripoli',
      country: undefined,
      active: true,
    });
    expect(fakeBranchesApi.listRequests.length).toBeGreaterThan(1);
    expect(findDialog('Create branch')).toBeFalsy();
  });

  it('edits a branch from the row action and reloads the current list', () => {
    clickIconButton('Edit branch');
    fixture.detectChanges();

    setInputValue('input[formControlName="name"]', 'Downtown Updated');
    fixture.detectChanges();

    clickButton('Save changes');
    fixture.detectChanges();

    expect(fakeBranchesApi.updateRequests.at(-1)).toEqual({
      id: activeBranch.id,
      body: {
        orgId: activeBranch.orgId,
        name: 'Downtown Updated',
        city: activeBranch.city,
        country: activeBranch.country,
        active: true,
      },
    });
    expect(fakeBranchesApi.listRequests.length).toBeGreaterThan(1);
    expect(findDialog('Edit branch')).toBeFalsy();
  });

  it('keeps the create dialog open with entered values when the API fails', () => {
    fakeBranchesApi.createError = new HttpErrorResponse({
      error: { message: 'Branch name already exists.' },
      status: 409,
    });

    clickButton('Create Branch');
    fixture.detectChanges();

    setSelectValue('select[formControlName="orgId"]', activeOrganization.id);
    setInputValue('input[formControlName="name"]', 'Duplicate Branch');
    setInputValue('input[formControlName="city"]', 'Sidon');
    fixture.detectChanges();

    clickButton('Create branch');
    fixture.detectChanges();

    const nameInput = fixture.nativeElement.querySelector(
      'input[formControlName="name"]',
    ) as HTMLInputElement | null;
    const cityInput = fixture.nativeElement.querySelector(
      'input[formControlName="city"]',
    ) as HTMLInputElement | null;

    expect(findDialog('Create branch')).toBeTruthy();
    expect(nameInput?.value).toBe('Duplicate Branch');
    expect(cityInput?.value).toBe('Sidon');
    expect(fixture.nativeElement.textContent).toContain('Branch name already exists.');
  });

  it('keeps the row and shows an inline error when delete fails with dependencies', () => {
    fakeBranchesApi.deleteError = new HttpErrorResponse({
      error: { code: 'HAS_DEPENDENCIES', message: 'HAS_DEPENDENCIES' },
      status: 409,
    });

    clickIconButton('Delete branch');
    fixture.detectChanges();

    clickButton('Delete');
    fixture.detectChanges();

    expect(fakeBranchesApi.deleteRequests).toEqual([activeBranch.id]);
    expect(fixture.nativeElement.textContent).toContain('Downtown Branch');
    expect(fixture.nativeElement.textContent).toContain(
      'Branch cannot be deleted because it has dependent venues.',
    );
  });

  function clickIconButton(label: string): void {
    const button = fixture.nativeElement.querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement | null;

    if (!button) {
      throw new Error(`Icon button "${label}" was not found.`);
    }

    button.click();
  }

  function clickButton(label: string): void {
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const button = buttons.find((item) => item.textContent?.trim() === label);

    if (!button) {
      throw new Error(`Button "${label}" was not found.`);
    }

    button.click();
  }

  function setInputValue(selector: string, value: string): void {
    const input = fixture.nativeElement.querySelector(selector) as HTMLInputElement | null;

    if (!input) {
      throw new Error(`Input "${selector}" was not found.`);
    }

    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  function setSelectValue(selector: string, value: string): void {
    const select = fixture.nativeElement.querySelector(selector) as HTMLSelectElement | null;

    if (!select) {
      throw new Error(`Select "${selector}" was not found.`);
    }

    select.value = value;
    select.dispatchEvent(new Event('change'));
  }

  function findDialog(label: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(`div[role="dialog"][aria-label="${label}"]`) as HTMLElement | null;
  }
});
