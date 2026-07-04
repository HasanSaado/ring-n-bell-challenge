import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  LucideArrowLeft,
  LucideBuilding2,
  LucideCheck,
  LucideChevronRight,
  LucideLoaderCircle,
  LucideStore,
  LucideUserRound,
  LucideWorkflow,
  LucideX,
} from '@lucide/angular';

import { UiButtonComponent } from '../../shared/ui/button/ui-button';
import { UiCardComponent } from '../../shared/ui/card/ui-card';
import { WizardPath, WizardStepId } from './setup-wizard.models';
import { WizardStateService } from './wizard-state.service';

const DEFAULT_COUNTRY = 'Lebanon';
const DEFAULT_TIMEZONE = 'Asia/Beirut';
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_STATUS = 'Active';

@Component({
  selector: 'app-setup-wizard',
  standalone: true,
  imports: [
    LucideArrowLeft,
    LucideBuilding2,
    LucideCheck,
    LucideChevronRight,
    LucideLoaderCircle,
    LucideStore,
    LucideUserRound,
    LucideWorkflow,
    LucideX,
    ReactiveFormsModule,
    UiButtonComponent,
    UiCardComponent,
  ],
  templateUrl: './setup-wizard.html',
})
export class SetupWizard {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  readonly wizardState = inject(WizardStateService);
  readonly showCancelConfirmation = signal(false);
  readonly finishErrorMessage = signal<string | null>(null);
  readonly typeOptions = ['restaurant', 'club', 'cafe', 'bar', 'hotel'];

  readonly clientForm = this.formBuilder.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    company: [''],
    enabled: [true],
  });

  readonly organizationForm = this.formBuilder.group({
    name: ['', [Validators.required]],
    country: [DEFAULT_COUNTRY],
    timezone: [DEFAULT_TIMEZONE],
    currency: [DEFAULT_CURRENCY],
    billingEmail: ['', [Validators.email]],
  });

  readonly branchForm = this.formBuilder.group({
    name: ['', [Validators.required]],
    city: [''],
    country: [DEFAULT_COUNTRY],
    active: [true],
  });

  readonly venueForm = this.formBuilder.group({
    name: ['', [Validators.required]],
    type: ['', [Validators.required]],
    timezone: [DEFAULT_TIMEZONE, [Validators.required]],
    currency: [DEFAULT_CURRENCY, [Validators.required]],
    city: [''],
    country: [DEFAULT_COUNTRY],
    status: this.formBuilder.control<'Active' | 'Inactive'>(DEFAULT_STATUS, [Validators.required]),
  });

  constructor() {
    this.restoreFormsFromState();
    this.syncAllForms();
    this.watchFormChanges();
  }

  get isOrganizationPath(): boolean {
    return this.wizardState.selectedPath() === 'organization';
  }

  get isStandalonePath(): boolean {
    return this.wizardState.selectedPath() === 'standalone';
  }

  get currentStepId(): WizardStepId | null {
    const steps = this.wizardState.currentSteps();
    return steps[this.wizardState.currentStepIndex()]?.id ?? null;
  }

  get isReviewStep(): boolean {
    return this.currentStepId === 'review';
  }

  get canGoBack(): boolean {
    return Boolean(this.wizardState.selectedPath()) && this.wizardState.currentStepIndex() > 0;
  }

  get nextDisabled(): boolean {
    return this.wizardState.finishing() || this.isCurrentStepInvalid();
  }

  get clientNameRequiredError(): boolean {
    const control = this.clientForm.controls.name;
    return control.touched && control.hasError('required');
  }

  get clientEmailRequiredError(): boolean {
    const control = this.clientForm.controls.email;
    return control.touched && control.hasError('required');
  }

  get clientEmailFormatError(): boolean {
    const control = this.clientForm.controls.email;
    return control.touched && control.hasError('email');
  }

  get organizationNameRequiredError(): boolean {
    const control = this.organizationForm.controls.name;
    return control.touched && control.hasError('required');
  }

  get organizationBillingEmailFormatError(): boolean {
    const control = this.organizationForm.controls.billingEmail;
    return control.touched && control.hasError('email');
  }

  get branchNameRequiredError(): boolean {
    const control = this.branchForm.controls.name;
    return control.touched && control.hasError('required');
  }

  get venueNameRequiredError(): boolean {
    const control = this.venueForm.controls.name;
    return control.touched && control.hasError('required');
  }

  get venueTypeRequiredError(): boolean {
    const control = this.venueForm.controls.type;
    return control.touched && control.hasError('required');
  }

  get venueTimezoneRequiredError(): boolean {
    const control = this.venueForm.controls.timezone;
    return control.touched && control.hasError('required');
  }

  get venueCurrencyRequiredError(): boolean {
    const control = this.venueForm.controls.currency;
    return control.touched && control.hasError('required');
  }

  get failedEntityLabel(): string {
    switch (this.wizardState.failedEntity()) {
      case 'client':
        return 'Client';
      case 'organization':
        return 'Organization';
      case 'branch':
        return 'Branch';
      case 'venue':
        return 'Venue';
      case null:
        return 'Setup';
    }
  }

  get finishButtonLabel(): string {
    return this.wizardState.failedStep() ? 'Retry' : 'Finish';
  }

  get failureErrorDetail(): string | null {
    return this.wizardState.failureState().errorDetail;
  }

  selectPath(path: WizardPath): void {
    this.wizardState.setPath(path);
    this.wizardState.jumpToStep(0);
    this.finishErrorMessage.set(null);
  }

  goNext(): void {
    if (this.isCurrentStepInvalid()) {
      this.markCurrentStepTouched();
      return;
    }

    this.syncAllForms();
    this.finishErrorMessage.set(null);
    this.wizardState.next();
  }

  goBack(): void {
    if (this.wizardState.finishing()) {
      return;
    }

    this.syncAllForms();
    this.finishErrorMessage.set(null);
    this.wizardState.back();
  }

  goToStepperStep(index: number): void {
    if (!this.isStepReachable(index)) {
      if (index > this.wizardState.currentStepIndex()) {
        this.markCurrentStepTouched();
      }

      return;
    }

    this.syncAllForms();
    this.finishErrorMessage.set(null);
    this.wizardState.jumpToStep(index);
  }

  editStep(stepId: WizardStepId): void {
    const index = this.getStepIndex(stepId);

    if (index >= 0) {
      this.wizardState.jumpToStep(index);
      this.finishErrorMessage.set(null);
    }
  }

  requestCancel(): void {
    if (this.wizardState.finishing()) {
      return;
    }

    if (this.hasEnteredData()) {
      this.showCancelConfirmation.set(true);
      return;
    }

    this.cancelWizard();
  }

  closeCancelConfirmation(): void {
    this.showCancelConfirmation.set(false);
  }

  cancelWizard(): void {
    this.showCancelConfirmation.set(false);
    this.wizardState.reset();
    void this.router.navigate(['/dashboard']);
  }

  async finish(): Promise<void> {
    this.syncAllForms();

    if (!this.allFormsValid()) {
      this.jumpToFirstInvalidStep();
      return;
    }

    this.finishErrorMessage.set(null);

    try {
      const venueId = await this.wizardState.finish();
      const navigated = await this.router.navigate(['/venues', venueId]);

      if (navigated) {
        this.wizardState.reset();
      }
    } catch {
      this.finishErrorMessage.set(
        this.wizardState.errorMessage() ?? 'Setup could not be finished. Something went wrong. Please try again.',
      );
    }
  }

  getStepIndex(stepId: WizardStepId): number {
    return this.wizardState.currentSteps().findIndex((step) => step.id === stepId);
  }

  isStepComplete(index: number): boolean {
    return index < this.wizardState.currentStepIndex();
  }

  isStepReachable(index: number): boolean {
    if (this.wizardState.finishing()) {
      return false;
    }

    const steps = this.wizardState.currentSteps();

    if (index < 0 || index >= steps.length) {
      return false;
    }

    if (index <= this.wizardState.currentStepIndex()) {
      return true;
    }

    return steps.slice(0, index).every((step) => this.isStepValid(step.id));
  }

  display(value: string): string {
    return value.trim() || 'Not set';
  }

  private restoreFormsFromState(): void {
    const formValues = this.wizardState.formValues();

    if (formValues.client) {
      this.clientForm.reset(
        {
          name: formValues.client.name,
          email: formValues.client.email ?? '',
          phone: formValues.client.phone ?? '',
          company: formValues.client.company ?? '',
          enabled: formValues.client.enabled,
        },
        { emitEvent: false },
      );
    }

    if (formValues.organization) {
      this.organizationForm.reset(
        {
          name: formValues.organization.name,
          country: formValues.organization.country ?? DEFAULT_COUNTRY,
          timezone: formValues.organization.timezone ?? DEFAULT_TIMEZONE,
          currency: formValues.organization.currency ?? DEFAULT_CURRENCY,
          billingEmail: formValues.organization.billingEmail ?? '',
        },
        { emitEvent: false },
      );
    }

    if (formValues.branch) {
      this.branchForm.reset(
        {
          name: formValues.branch.name,
          city: formValues.branch.city ?? '',
          country: formValues.branch.country ?? DEFAULT_COUNTRY,
          active: formValues.branch.active,
        },
        { emitEvent: false },
      );
    }

    if (formValues.venue) {
      this.venueForm.reset(
        {
          name: formValues.venue.name,
          type: formValues.venue.type,
          timezone: formValues.venue.timezone,
          currency: formValues.venue.currency,
          city: formValues.venue.city ?? '',
          country: formValues.venue.country ?? DEFAULT_COUNTRY,
          status: formValues.venue.status ?? DEFAULT_STATUS,
        },
        { emitEvent: false },
      );
    }
  }

  private watchFormChanges(): void {
    this.clientForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.syncClientForm());
    this.organizationForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncOrganizationForm());
    this.branchForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.syncBranchForm());
    this.venueForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.syncVenueForm());
  }

  private syncAllForms(): void {
    this.syncClientForm();
    this.syncOrganizationForm();
    this.syncBranchForm();
    this.syncVenueForm();
  }

  private syncClientForm(): void {
    const value = this.clientForm.getRawValue();

    this.wizardState.updateClient({
      name: value.name,
      email: this.optionalString(value.email),
      phone: this.optionalString(value.phone),
      company: this.optionalString(value.company),
      enabled: value.enabled,
    });
  }

  private syncOrganizationForm(): void {
    const value = this.organizationForm.getRawValue();

    this.wizardState.updateOrganization({
      name: value.name,
      country: this.optionalString(value.country),
      timezone: this.optionalString(value.timezone),
      currency: this.optionalString(value.currency),
      billingEmail: this.optionalString(value.billingEmail),
    });
  }

  private syncBranchForm(): void {
    const value = this.branchForm.getRawValue();

    this.wizardState.updateBranch({
      name: value.name,
      city: this.optionalString(value.city),
      country: this.optionalString(value.country),
      active: value.active,
    });
  }

  private syncVenueForm(): void {
    const value = this.venueForm.getRawValue();

    this.wizardState.updateVenue({
      name: value.name,
      type: value.type,
      timezone: value.timezone,
      currency: value.currency,
      city: this.optionalString(value.city),
      country: this.optionalString(value.country),
      status: value.status,
    });
  }

  private isCurrentStepInvalid(): boolean {
    switch (this.currentStepId) {
      case 'client':
        return !this.isStepValid('client');
      case 'organization':
        return !this.isStepValid('organization');
      case 'branch':
        return !this.isStepValid('branch');
      case 'venue':
        return !this.isStepValid('venue');
      case 'review':
      case null:
        return false;
    }
  }

  private isStepValid(stepId: WizardStepId): boolean {
    switch (stepId) {
      case 'client':
        return this.clientForm.valid;
      case 'organization':
        return this.organizationForm.valid;
      case 'branch':
        return this.branchForm.valid;
      case 'venue':
        return this.venueForm.valid;
      case 'review':
        return this.allFormsValid();
    }
  }

  private markCurrentStepTouched(): void {
    switch (this.currentStepId) {
      case 'client':
        this.clientForm.markAllAsTouched();
        break;
      case 'organization':
        this.organizationForm.markAllAsTouched();
        break;
      case 'branch':
        this.branchForm.markAllAsTouched();
        break;
      case 'venue':
        this.venueForm.markAllAsTouched();
        break;
      case 'review':
      case null:
        break;
    }
  }

  private allFormsValid(): boolean {
    if (this.clientForm.invalid || this.venueForm.invalid) {
      return false;
    }

    if (this.isOrganizationPath) {
      return this.organizationForm.valid && this.branchForm.valid;
    }

    return true;
  }

  private jumpToFirstInvalidStep(): void {
    if (this.clientForm.invalid) {
      this.clientForm.markAllAsTouched();
      this.editStep('client');
      return;
    }

    if (this.isOrganizationPath && this.organizationForm.invalid) {
      this.organizationForm.markAllAsTouched();
      this.editStep('organization');
      return;
    }

    if (this.isOrganizationPath && this.branchForm.invalid) {
      this.branchForm.markAllAsTouched();
      this.editStep('branch');
      return;
    }

    if (this.venueForm.invalid) {
      this.venueForm.markAllAsTouched();
      this.editStep('venue');
    }
  }

  private hasEnteredData(): boolean {
    const client = this.clientForm.getRawValue();
    const organization = this.organizationForm.getRawValue();
    const branch = this.branchForm.getRawValue();
    const venue = this.venueForm.getRawValue();
    const created = this.wizardState.createdEntities();

    return (
      Boolean(created.clientId || created.organizationId || created.branchId || created.venueId) ||
      this.hasText(client.name, client.email, client.phone, client.company) ||
      client.enabled !== true ||
      this.hasText(organization.name, organization.billingEmail) ||
      organization.country !== DEFAULT_COUNTRY ||
      organization.timezone !== DEFAULT_TIMEZONE ||
      organization.currency !== DEFAULT_CURRENCY ||
      this.hasText(branch.name, branch.city, branch.country !== DEFAULT_COUNTRY ? branch.country : '') ||
      branch.active !== true ||
      this.hasText(venue.name, venue.type, venue.city, venue.country !== DEFAULT_COUNTRY ? venue.country : '') ||
      venue.timezone !== DEFAULT_TIMEZONE ||
      venue.currency !== DEFAULT_CURRENCY ||
      venue.status !== DEFAULT_STATUS
    );
  }

  private hasText(...values: readonly string[]): boolean {
    return values.some((value) => value.trim().length > 0);
  }

  private optionalString(value: string): string | undefined {
    const trimmedValue = value.trim();
    return trimmedValue ? trimmedValue : undefined;
  }
}
