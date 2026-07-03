import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  LucideBuilding2,
  LucidePencil,
  LucidePlus,
  LucideRefreshCw,
  LucideSearch,
  LucideStore,
  LucideTrash2,
  LucideWorkflow,
  LucideX,
} from '@lucide/angular';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';

import { Branch, BranchListParams, CreateBranchRequest, UpdateBranchRequest } from '../../../core/branches/branch.models';
import { BranchesApiService } from '../../../core/branches/branches-api.service';
import { Organization, SortOrder } from '../../../core/organizations/organization.models';
import { OrganizationsApiService } from '../../../core/organizations/organizations-api.service';
import { UiButtonComponent } from '../../../shared/ui/button/ui-button';
import { UiCardComponent } from '../../../shared/ui/card/ui-card';
import { SortHeaderComponent } from '../../../shared/ui/sort-header/sort-header';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge';

@Component({
  selector: 'app-branch-list',
  standalone: true,
  imports: [
    DatePipe,
    LucideBuilding2,
    LucidePencil,
    LucidePlus,
    LucideRefreshCw,
    LucideSearch,
    LucideStore,
    LucideTrash2,
    LucideWorkflow,
    LucideX,
    ReactiveFormsModule,
    SortHeaderComponent,
    StatusBadgeComponent,
    UiButtonComponent,
    UiCardComponent,
  ],
  templateUrl: './branch-list.html',
})
export class BranchList {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly branchesApi = inject(BranchesApiService);
  private readonly organizationsApi = inject(OrganizationsApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly orgIdControl = new FormControl('', { nonNullable: true });
  readonly branchForm = this.formBuilder.group({
    orgId: ['', [Validators.required]],
    name: ['', [Validators.required]],
    city: [''],
    country: [''],
    active: [true],
  });
  readonly branches = signal<Branch[]>([]);
  readonly organizations = signal<Organization[]>([]);
  readonly loading = signal(true);
  readonly organizationLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly rowErrors = signal<Record<string, string>>({});
  readonly formMode = signal<'create' | 'edit' | null>(null);
  readonly editingBranch = signal<Branch | null>(null);
  readonly deleteTarget = signal<Branch | null>(null);
  readonly formErrorMessage = signal<string | null>(null);
  readonly saving = signal(false);
  readonly deletingIds = signal<ReadonlySet<string>>(new Set<string>());

  readonly page = signal(1);
  readonly limit = signal(10);
  readonly total = signal(0);
  readonly sortBy = signal<BranchListParams['sortBy']>('name');
  readonly sortOrder = signal<SortOrder>('asc');

  readonly getInitials = (name: string): string => this.buildInitials(name);
  readonly getOrganizationName = (branch: Branch): string => this.resolveOrganizationName(branch);
  readonly getRowError = (id: string): string | null => this.rowErrors()[id] ?? null;
  readonly isDeleting = (id: string): boolean => this.deletingIds().has(id);
  readonly openCreateBranch = (): void => this.startCreateBranch();
  readonly openEditBranch = (branch: Branch): void => this.startEditBranch(branch);
  readonly closeBranchForm = (): void => this.dismissBranchForm();
  readonly submitBranch = (): void => this.saveBranch();
  readonly confirmDeleteBranch = (branch: Branch): void => this.showDeleteConfirmation(branch);
  readonly cancelDeleteBranch = (): void => this.hideDeleteConfirmation();
  readonly deleteBranch = (): void => this.destroyBranch();
  readonly loadBranches = (): void => this.fetchBranches();
  readonly setSort = (sortBy: BranchListParams['sortBy']): void => this.applySort(sortBy);
  readonly previousPage = (): void => this.goToPreviousPage();
  readonly nextPage = (): void => this.goToNextPage();

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.loadBranches();
      });

    this.orgIdControl.valueChanges.pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.page.set(1);
      this.loadBranches();
    });

    this.loadOrganizations();
    this.loadBranches();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total() / this.limit()));
  }

  get activeOnPage(): number {
    return this.branches().filter((branch) => branch.isActive).length;
  }

  get venueCountOnPage(): number {
    return this.branches().reduce((total, branch) => total + branch.venueCount, 0);
  }

  get resultStart(): number {
    if (!this.total()) {
      return 0;
    }

    return (this.page() - 1) * this.limit() + 1;
  }

  get resultEnd(): number {
    return Math.min(this.page() * this.limit(), this.total());
  }

  get formTitle(): string {
    return this.formMode() === 'edit' ? 'Edit branch' : 'Create branch';
  }

  get formSubmitLabel(): string {
    return this.formMode() === 'edit' ? 'Save changes' : 'Create branch';
  }

  get orgIdRequiredError(): boolean {
    const control = this.branchForm.controls.orgId;
    return control.touched && control.hasError('required');
  }

  get nameRequiredError(): boolean {
    const control = this.branchForm.controls.name;
    return control.touched && control.hasError('required');
  }

  private buildInitials(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  private resolveOrganizationName(branch: Branch): string {
    return branch.organizationName || this.findOrganizationName(branch.orgId) || branch.organizationId || branch.orgId;
  }

  private startCreateBranch(): void {
    this.formMode.set('create');
    this.editingBranch.set(null);
    this.formErrorMessage.set(null);
    this.branchForm.reset({
      orgId: this.orgIdControl.value || '',
      name: '',
      city: '',
      country: '',
      active: true,
    });
  }

  private startEditBranch(branch: Branch): void {
    this.formMode.set('edit');
    this.editingBranch.set(branch);
    this.formErrorMessage.set(null);
    this.clearRowError(branch.id);
    this.branchForm.reset({
      orgId: branch.orgId,
      name: branch.name,
      city: branch.city ?? '',
      country: branch.country ?? '',
      active: branch.isActive,
    });
  }

  private dismissBranchForm(): void {
    if (this.saving()) {
      return;
    }

    this.resetBranchForm();
    this.formMode.set(null);
    this.editingBranch.set(null);
    this.formErrorMessage.set(null);
  }

  private completeBranchForm(): void {
    this.saving.set(false);
    this.resetBranchForm();
    this.formMode.set(null);
    this.editingBranch.set(null);
    this.formErrorMessage.set(null);
  }

  private saveBranch(): void {
    if (this.branchForm.invalid || this.saving()) {
      this.branchForm.markAllAsTouched();
      return;
    }

    const value = this.branchForm.getRawValue();
    const body: CreateBranchRequest | UpdateBranchRequest = {
      orgId: value.orgId,
      name: value.name,
      city: value.city || undefined,
      country: value.country || undefined,
      active: value.active,
    };
    const editingBranch = this.editingBranch();
    const request$ =
      this.formMode() === 'edit' && editingBranch
        ? this.branchesApi.updateBranch(editingBranch.id, body)
        : this.branchesApi.createBranch(body as CreateBranchRequest);

    this.saving.set(true);
    this.formErrorMessage.set(null);

    request$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.completeBranchForm();
        this.fetchBranches();
      },
      error: (error: unknown) => {
        this.formErrorMessage.set(this.getMutationError(error, 'Branch could not be saved.'));
      },
    });
  }

  private showDeleteConfirmation(branch: Branch): void {
    this.clearRowError(branch.id);
    this.deleteTarget.set(branch);
  }

  private hideDeleteConfirmation(): void {
    if (this.deleteTarget() && this.deletingIds().has(this.deleteTarget()?.id ?? '')) {
      return;
    }

    this.deleteTarget.set(null);
  }

  private destroyBranch(): void {
    const branch = this.deleteTarget();

    if (!branch || this.deletingIds().has(branch.id)) {
      return;
    }

    this.setDeleting(branch.id, true);
    this.clearRowError(branch.id);

    this.branchesApi
      .deleteBranch(branch.id)
      .pipe(finalize(() => this.setDeleting(branch.id, false)))
      .subscribe({
        next: () => {
          this.deleteTarget.set(null);

          if (this.branches().length <= 1 && this.page() > 1) {
            this.page.update((page) => page - 1);
          }

          this.fetchBranches();
        },
        error: (error: unknown) => {
          this.deleteTarget.set(null);
          this.setRowError(branch.id, this.getDeleteError(error));
        },
      });
  }

  private fetchBranches(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.branchesApi
      .listBranches(this.buildParams())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.branches.set(response.items);
          this.total.set(response.total);
          this.page.set(response.page);
          this.limit.set(response.limit);
        },
        error: () => {
          this.errorMessage.set('Branches could not be loaded.');
        },
      });
  }

  private applySort(sortBy: BranchListParams['sortBy']): void {
    if (this.sortBy() === sortBy) {
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(sortBy);
      this.sortOrder.set('asc');
    }

    this.page.set(1);
    this.fetchBranches();
  }

  private goToPreviousPage(): void {
    if (this.page() > 1) {
      this.page.update((page) => page - 1);
      this.fetchBranches();
    }
  }

  private goToNextPage(): void {
    if (this.page() < this.totalPages) {
      this.page.update((page) => page + 1);
      this.fetchBranches();
    }
  }

  private loadOrganizations(): void {
    this.organizationLoading.set(true);

    this.organizationsApi
      .listOrganizations({
        page: 1,
        limit: 100,
        sortBy: 'name',
        sortOrder: 'asc',
      })
      .pipe(finalize(() => this.organizationLoading.set(false)))
      .subscribe({
        next: (response) => this.organizations.set(response.items),
        error: () => this.organizations.set([]),
      });
  }

  private buildParams(): BranchListParams {
    return {
      page: this.page(),
      limit: this.limit(),
      search: this.searchControl.value.trim() || undefined,
      sortBy: this.sortBy(),
      sortOrder: this.sortOrder(),
      orgId: this.orgIdControl.value || undefined,
    };
  }

  private findOrganizationName(orgId: string): string | undefined {
    return this.organizations().find((organization) => organization.id === orgId || organization.orgId === orgId)?.name;
  }

  private resetBranchForm(): void {
    this.branchForm.reset({
      orgId: '',
      name: '',
      city: '',
      country: '',
      active: true,
    });
  }

  private setDeleting(id: string, isDeleting: boolean): void {
    this.deletingIds.update((currentIds) => {
      const nextIds = new Set(currentIds);

      if (isDeleting) {
        nextIds.add(id);
      } else {
        nextIds.delete(id);
      }

      return nextIds;
    });
  }

  private setRowError(id: string, message: string): void {
    this.rowErrors.update((errors) => ({ ...errors, [id]: message }));
  }

  private clearRowError(id: string): void {
    this.rowErrors.update((errors) => {
      const nextErrors = { ...errors };
      delete nextErrors[id];
      return nextErrors;
    });
  }

  private getMutationError(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse && typeof error.error === 'object' && error.error !== null) {
      if ('message' in error.error && typeof error.error.message === 'string') {
        return error.error.message;
      }
    }

    return fallback;
  }

  private getDeleteError(error: unknown): string {
    if (this.isDependencyError(error)) {
      return 'Branch cannot be deleted because it has dependent venues.';
    }

    return this.getMutationError(error, 'Branch could not be deleted. Try again.');
  }

  private isDependencyError(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse) || typeof error.error !== 'object' || error.error === null) {
      return false;
    }

    const response = error.error as Record<string, unknown>;
    const code = response['code'] ?? response['error'];
    const message = response['message'];

    return (
      code === 'HAS_DEPENDENCIES' ||
      (typeof message === 'string' && message.toUpperCase().includes('HAS_DEPENDENCIES'))
    );
  }
}
