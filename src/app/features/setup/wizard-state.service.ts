import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { Branch } from '../../core/branches/branch.models';
import { BranchesApiService } from '../../core/branches/branches-api.service';
import { Client } from '../../core/clients/client.models';
import { ClientsApiService } from '../../core/clients/clients-api.service';
import { Organization } from '../../core/organizations/organization.models';
import { OrganizationsApiService } from '../../core/organizations/organizations-api.service';
import { Venue } from '../../core/venues/venue.models';
import { VenuesApiService } from '../../core/venues/venues-api.service';
import {
  CreatedEntities,
  WizardBranchFormValue,
  WizardClientFormValue,
  WizardEntity,
  WizardFailureState,
  WizardFormValues,
  WizardOrganizationFormValue,
  WizardPath,
  WizardProgressState,
  WizardStep,
  WizardStepId,
  WizardVenueFormValue,
} from './setup-wizard.models';

const ORGANIZATION_STEPS: readonly WizardStep[] = [
  { id: 'client', label: 'Client' },
  { id: 'organization', label: 'Organization' },
  { id: 'branch', label: 'Branch' },
  { id: 'venue', label: 'Venue' },
  { id: 'review', label: 'Review' },
];

const STANDALONE_STEPS: readonly WizardStep[] = [
  { id: 'client', label: 'Client' },
  { id: 'venue', label: 'Venue' },
  { id: 'review', label: 'Review' },
];

const WIZARD_ENTITY_LABELS: Record<WizardEntity, string> = {
  client: 'client',
  organization: 'organization',
  branch: 'branch',
  venue: 'venue',
};

class WizardFinishError extends Error {
  constructor(
    readonly failedStep: WizardStepId,
    readonly failedEntity: WizardEntity | null,
    message: string,
    readonly errorDetail: string | null = null,
    readonly originalError?: unknown,
  ) {
    super(message);
    this.name = 'WizardFinishError';
  }
}

@Injectable({ providedIn: 'root' })
export class WizardStateService {
  private readonly clientsApi = inject(ClientsApiService);
  private readonly organizationsApi = inject(OrganizationsApiService);
  private readonly branchesApi = inject(BranchesApiService);
  private readonly venuesApi = inject(VenuesApiService);

  private readonly selectedPathState = signal<WizardPath | null>(null);
  private readonly currentStepIndexState = signal(0);
  private readonly formValuesState = signal<WizardFormValues>({
    client: null,
    organization: null,
    branch: null,
    venue: null,
  });
  private readonly createdEntitiesState = signal<CreatedEntities>({});
  private readonly progressMessagesState = signal<readonly string[]>([]);
  private readonly failedStepState = signal<WizardStepId | null>(null);
  private readonly failedEntityState = signal<WizardEntity | null>(null);
  private readonly errorMessageState = signal<string | null>(null);
  private readonly errorDetailState = signal<string | null>(null);
  private readonly finishingState = signal(false);

  readonly selectedPath = this.selectedPathState.asReadonly();
  readonly currentStepIndex = this.currentStepIndexState.asReadonly();
  readonly formValues = this.formValuesState.asReadonly();
  readonly createdEntities = this.createdEntitiesState.asReadonly();
  readonly progressMessages = this.progressMessagesState.asReadonly();
  readonly failedStep = this.failedStepState.asReadonly();
  readonly failedEntity = this.failedEntityState.asReadonly();
  readonly errorMessage = this.errorMessageState.asReadonly();
  readonly errorDetail = this.errorDetailState.asReadonly();
  readonly finishing = this.finishingState.asReadonly();
  readonly currentSteps = computed(() => {
    const path = this.selectedPathState();
    return path ? this.getStepsForPath(path) : [];
  });
  readonly progressState = computed<WizardProgressState>(() => ({
    finishing: this.finishingState(),
    messages: this.progressMessagesState(),
    created: this.createdEntitiesState(),
  }));
  readonly failureState = computed<WizardFailureState>(() => ({
    failedStep: this.failedStepState(),
    failedEntity: this.failedEntityState(),
    errorMessage: this.errorMessageState(),
    errorDetail: this.errorDetailState(),
  }));

  setPath(path: WizardPath): void {
    this.selectedPathState.set(path);
    this.currentStepIndexState.update((index) => Math.min(index, this.getStepsForPath(path).length - 1));
    this.clearFailure();
  }

  updateClient(value: WizardClientFormValue): void {
    this.formValuesState.update((formValues) => ({ ...formValues, client: value }));
  }

  updateOrganization(value: WizardOrganizationFormValue): void {
    this.formValuesState.update((formValues) => ({ ...formValues, organization: value }));
  }

  updateBranch(value: WizardBranchFormValue): void {
    this.formValuesState.update((formValues) => ({ ...formValues, branch: value }));
  }

  updateVenue(value: WizardVenueFormValue): void {
    this.formValuesState.update((formValues) => ({ ...formValues, venue: value }));
  }

  next(): void {
    const path = this.selectedPathState();

    if (!path) {
      return;
    }

    const maxIndex = this.getStepsForPath(path).length - 1;
    this.currentStepIndexState.update((index) => Math.min(index + 1, maxIndex));
  }

  back(): void {
    this.currentStepIndexState.update((index) => Math.max(index - 1, 0));
  }

  jumpToStep(index: number): void {
    const path = this.selectedPathState();

    if (!path) {
      return;
    }

    const maxIndex = this.getStepsForPath(path).length - 1;
    this.currentStepIndexState.set(Math.min(Math.max(index, 0), maxIndex));
  }

  reset(): void {
    this.selectedPathState.set(null);
    this.currentStepIndexState.set(0);
    this.formValuesState.set({
      client: null,
      organization: null,
      branch: null,
      venue: null,
    });
    this.createdEntitiesState.set({});
    this.progressMessagesState.set([]);
    this.finishingState.set(false);
    this.clearFailure();
  }

  isDirty(): boolean {
    const formValues = this.formValuesState();

    return (
      this.selectedPathState() !== null ||
      this.hasCreatedEntities(this.createdEntitiesState()) ||
      this.hasValue(formValues.client) ||
      this.hasValue(formValues.organization) ||
      this.hasValue(formValues.branch) ||
      this.hasValue(formValues.venue)
    );
  }

  getStepsForPath(path: WizardPath): readonly WizardStep[] {
    return path === 'organization' ? ORGANIZATION_STEPS : STANDALONE_STEPS;
  }

  async finish(): Promise<string> {
    if (this.finishingState()) {
      throw new WizardFinishError('review', null, 'Setup is already finishing.');
    }

    this.finishingState.set(true);
    this.progressMessagesState.set([]);
    this.clearFailure();

    try {
      const path = this.requirePath();
      const clientId = await this.ensureClient();
      let organizationId: string | null = null;
      let branchId: string | null = null;

      if (path === 'organization') {
        organizationId = await this.ensureOrganization(clientId);
        branchId = await this.ensureBranch(organizationId);
      }

      const venueId = await this.ensureVenue({
        clientId,
        organizationId,
        branchId,
      });

      this.appendProgress('Setup finished.');
      this.clearFailure();

      return venueId;
    } catch (error) {
      const failure = this.toFailure(error);
      this.failedStepState.set(failure.failedStep);
      this.failedEntityState.set(failure.failedEntity);
      this.errorMessageState.set(failure.errorMessage);
      this.errorDetailState.set(failure.errorDetail);
      throw error;
    } finally {
      this.finishingState.set(false);
    }
  }

  private async ensureClient(): Promise<string> {
    const created = this.createdEntitiesState();

    if (created.clientId) {
      this.appendProgress('Client already created; skipping.');
      return created.clientId;
    }

    const value = this.requireFormValue('client', this.formValuesState().client, 'Client details are required.');

    this.appendProgress('Creating client...');

    const client = await this.withStepFailure('client', () =>
      firstValueFrom(
        this.clientsApi.createClient({
          name: value.name,
          email: this.optionalString(value.email),
          phone: this.optionalString(value.phone),
          company: this.optionalString(value.company),
          enabled: value.enabled,
          salesId: this.optionalString(value.salesId),
        }),
      ),
    );
    const clientId = this.getClientId(client);
    this.storeCreatedEntity({ clientId });
    this.clearFailureForStep('client');
    this.appendProgress('Client created.');

    return clientId;
  }

  private async ensureOrganization(clientId: string): Promise<string> {
    const created = this.createdEntitiesState();

    if (created.organizationId) {
      this.appendProgress('Organization already created; skipping.');
      return created.organizationId;
    }

    const value = this.requireFormValue(
      'organization',
      this.formValuesState().organization,
      'Organization details are required.',
    );

    this.appendProgress('Creating organization...');

    const organization = await this.withStepFailure('organization', () =>
      firstValueFrom(
        this.organizationsApi.createOrganization({
          name: value.name,
          adminId: clientId,
          country: this.optionalString(value.country),
          timezone: this.optionalString(value.timezone),
          currency: this.optionalString(value.currency),
          billingEmail: this.optionalString(value.billingEmail),
        }),
      ),
    );
    const organizationId = this.getOrganizationId(organization);
    this.storeCreatedEntity({ organizationId });
    this.clearFailureForStep('organization');
    this.appendProgress('Organization created.');

    return organizationId;
  }

  private async ensureBranch(organizationId: string): Promise<string> {
    const created = this.createdEntitiesState();

    if (created.branchId) {
      this.appendProgress('Branch already created; skipping.');
      return created.branchId;
    }

    const value = this.requireFormValue('branch', this.formValuesState().branch, 'Branch details are required.');

    this.appendProgress('Creating branch...');

    const branch = await this.withStepFailure('branch', () =>
      firstValueFrom(
        this.branchesApi.createBranch({
          name: value.name,
          orgId: organizationId,
          city: this.optionalString(value.city),
          country: this.optionalString(value.country),
          active: value.active,
        }),
      ),
    );
    const branchId = this.getBranchId(branch);
    this.storeCreatedEntity({ branchId });
    this.clearFailureForStep('branch');
    this.appendProgress('Branch created.');

    return branchId;
  }

  private async ensureVenue(context: {
    clientId: string;
    organizationId: string | null;
    branchId: string | null;
  }): Promise<string> {
    const created = this.createdEntitiesState();

    if (created.venueId) {
      this.appendProgress('Venue already created; skipping.');
      return created.venueId;
    }

    const value = this.requireFormValue('venue', this.formValuesState().venue, 'Venue details are required.');

    this.appendProgress('Creating venue...');

    const venue = await this.withStepFailure('venue', () =>
      firstValueFrom(
        this.venuesApi.createVenue({
          name: value.name,
          owner: context.clientId,
          type: value.type,
          orgId: context.organizationId,
          branchId: context.branchId,
          status: value.status,
          timezone: value.timezone,
          currency: value.currency,
          city: this.optionalString(value.city),
          country: this.optionalString(value.country),
        }),
      ),
    );
    const venueId = this.getVenueId(venue);
    this.storeCreatedEntity({ venueId });
    this.clearFailureForStep('venue');
    this.appendProgress('Venue created.');

    return venueId;
  }

  private requirePath(): WizardPath {
    const path = this.selectedPathState();

    if (!path) {
      throw new WizardFinishError('client', null, 'Choose a setup path before finishing.');
    }

    return path;
  }

  private requireFormValue<T>(step: WizardStepId, value: T | null, message: string): T {
    if (!value) {
      throw new WizardFinishError(step, step === 'review' ? null : step, message);
    }

    return value;
  }

  private async withStepFailure<T>(
    entity: WizardEntity,
    request: () => Promise<T>,
  ): Promise<T> {
    this.failedStepState.set(entity);
    this.failedEntityState.set(entity);
    this.errorMessageState.set(null);
    this.errorDetailState.set(null);

    try {
      return await request();
    } catch (error) {
      const failure = this.formatWizardFailureMessage(entity, error);
      throw new WizardFinishError(entity, entity, failure.errorMessage, failure.errorDetail, error);
    }
  }

  private toFailure(error: unknown): WizardFailureState {
    if (error instanceof WizardFinishError) {
      return {
        failedStep: error.failedStep,
        failedEntity: error.failedEntity,
        errorMessage: error.message,
        errorDetail: error.errorDetail,
      };
    }

    return {
      failedStep: 'review',
      failedEntity: null,
      errorMessage: 'Setup could not be finished. Something went wrong. Please try again.',
      errorDetail: this.getUsefulServerMessage(error),
    };
  }

  private formatWizardFailureMessage(
    entity: WizardEntity,
    error: unknown,
  ): { errorMessage: string; errorDetail: string | null } {
    const label = WIZARD_ENTITY_LABELS[entity];
    const serverMessage = this.getUsefulServerMessage(error);

    return {
      errorMessage: serverMessage
        ? `We couldn't create the ${label}. ${serverMessage}`
        : `We couldn't create the ${label}. Something went wrong. Please try again.`,
      errorDetail: null,
    };
  }

  private getUsefulServerMessage(error: unknown): string | null {
    if (error instanceof HttpErrorResponse && typeof error.error === 'object' && error.error !== null) {
      if ('message' in error.error && typeof error.error.message === 'string') {
        return this.normalizeUsefulMessage(error.error.message);
      }
    }

    return null;
  }

  private normalizeUsefulMessage(message: string): string | null {
    const trimmedMessage = message.trim();

    if (!trimmedMessage || this.isRawNetworkMessage(trimmedMessage)) {
      return null;
    }

    return trimmedMessage;
  }

  private isRawNetworkMessage(message: string): boolean {
    const normalizedMessage = message.toLowerCase();

    return (
      normalizedMessage === 'failed to fetch' ||
      normalizedMessage === 'load failed' ||
      normalizedMessage === 'networkerror' ||
      normalizedMessage === 'network request failed' ||
      normalizedMessage.includes('failed to fetch')
    );
  }

  private storeCreatedEntity(createdEntity: CreatedEntities): void {
    this.createdEntitiesState.update((current) => ({ ...current, ...createdEntity }));
  }

  private appendProgress(message: string): void {
    this.progressMessagesState.update((messages) => [...messages, message]);
  }

  private clearFailure(): void {
    this.failedStepState.set(null);
    this.failedEntityState.set(null);
    this.errorMessageState.set(null);
    this.errorDetailState.set(null);
  }

  private clearFailureForStep(step: WizardStepId): void {
    if (this.failedStepState() === step) {
      this.clearFailure();
    }
  }

  private hasCreatedEntities(created: CreatedEntities): boolean {
    return Boolean(created.clientId || created.organizationId || created.branchId || created.venueId);
  }

  private hasValue(value: object | null): boolean {
    if (!value) {
      return false;
    }

    return Object.values(value).some((fieldValue) => {
      if (typeof fieldValue === 'string') {
        return fieldValue.trim().length > 0;
      }

      return fieldValue !== null && fieldValue !== undefined;
    });
  }

  private getClientId(client: Client): string {
    return this.requireEntityId('client', client.id);
  }

  private getOrganizationId(organization: Organization): string {
    return this.requireEntityId('organization', organization.id || organization.orgId);
  }

  private getBranchId(branch: Branch): string {
    return this.requireEntityId('branch', branch.id || branch.branchId);
  }

  private getVenueId(venue: Venue): string {
    return this.requireEntityId('venue', venue.id || venue.venueId);
  }

  private requireEntityId(step: WizardStepId, id: string | undefined): string {
    if (!id) {
      throw new WizardFinishError(step, step === 'review' ? null : step, 'The API response did not include an ID.');
    }

    return id;
  }

  private optionalString(value: string | undefined): string | undefined {
    const trimmedValue = value?.trim();
    return trimmedValue ? trimmedValue : undefined;
  }
}
