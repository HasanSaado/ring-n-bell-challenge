export type WizardPath = 'organization' | 'standalone';

export type WizardStepId = 'client' | 'organization' | 'branch' | 'venue' | 'review';
export type WizardEntity = 'client' | 'organization' | 'branch' | 'venue';

export interface WizardStep {
  id: WizardStepId;
  label: string;
}

export interface CreatedEntities {
  clientId?: string;
  organizationId?: string;
  branchId?: string;
  venueId?: string;
}

export interface WizardClientFormValue {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  enabled: boolean;
  salesId?: string;
}

export interface WizardOrganizationFormValue {
  name: string;
  country?: string;
  timezone?: string;
  currency?: string;
  billingEmail?: string;
}

export interface WizardBranchFormValue {
  name: string;
  city?: string;
  country?: string;
  active: boolean;
}

export interface WizardVenueFormValue {
  name: string;
  type: string;
  timezone: string;
  currency: string;
  city?: string;
  country?: string;
  status?: 'Active' | 'Inactive';
}

export interface WizardProgressState {
  finishing: boolean;
  messages: readonly string[];
  created: CreatedEntities;
}

export interface WizardFailureState {
  failedStep: WizardStepId | null;
  failedEntity: WizardEntity | null;
  errorMessage: string | null;
  errorDetail: string | null;
}

export interface WizardFormValues {
  client: WizardClientFormValue | null;
  organization: WizardOrganizationFormValue | null;
  branch: WizardBranchFormValue | null;
  venue: WizardVenueFormValue | null;
}
