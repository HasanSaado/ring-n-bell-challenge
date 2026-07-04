import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { BranchesApiService } from '../../core/branches/branches-api.service';
import { ClientsApiService } from '../../core/clients/clients-api.service';
import { OrganizationsApiService } from '../../core/organizations/organizations-api.service';
import { VenuesApiService } from '../../core/venues/venues-api.service';
import { SetupWizard } from './setup-wizard';

describe('SetupWizard', () => {
  let fixture: ComponentFixture<SetupWizard>;
  let component: SetupWizard;
  let shouldFailClientCreate: boolean;
  let shouldFailVenueCreate: boolean;

  beforeEach(async () => {
    shouldFailClientCreate = false;
    shouldFailVenueCreate = false;

    await TestBed.configureTestingModule({
      imports: [SetupWizard],
      providers: [
        provideRouter([]),
        {
          provide: ClientsApiService,
          useValue: {
            createClient: () =>
              shouldFailClientCreate
                ? throwError(() => new Error('Failed to fetch'))
                : of({ id: 'client_1', name: 'Client' }),
          },
        },
        {
          provide: OrganizationsApiService,
          useValue: { createOrganization: () => of({ id: 'organization_1', orgId: 'org_1', name: 'Org' }) },
        },
        { provide: BranchesApiService, useValue: { createBranch: () => of({ id: 'branch_1', name: 'Branch' }) } },
        {
          provide: VenuesApiService,
          useValue: {
            createVenue: () =>
              shouldFailVenueCreate
                ? throwError(() => new Error('Venue create failed.'))
                : of({ id: 'venue_1', name: 'Venue' }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SetupWizard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows setup path options with descriptions', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Organization setup');
    expect(text).toContain('Creates a client, organization, branch, and venue.');
    expect(text).toContain('Standalone venue');
    expect(text).toContain('Creates a client and standalone venue only.');
  });

  it('shows organization path steps', () => {
    component.selectPath('organization');
    fixture.detectChanges();

    expect(getStepperLabels()).toEqual(['Client', 'Organization', 'Branch', 'Venue', 'Review']);
  });

  it('shows standalone path steps', () => {
    component.selectPath('standalone');
    fixture.detectChanges();

    expect(getStepperLabels()).toEqual(['Client', 'Venue', 'Review']);
  });

  it('disables Next while the current form is invalid', () => {
    component.selectPath('standalone');
    fixture.detectChanges();

    expect(findButton('Next')?.disabled).toBe(true);

    component.clientForm.controls.name.setValue('Maya Owner');
    component.clientForm.controls.email.setValue('maya@example.test');
    fixture.detectChanges();

    expect(findButton('Next')?.disabled).toBe(false);
  });

  it('cannot advance from Client while the client form is invalid', () => {
    component.selectPath('standalone');
    fixture.detectChanges();

    component.goNext();
    fixture.detectChanges();

    expect(component.currentStepId).toBe('client');
    expect(component.clientForm.controls.name.touched).toBe(true);
    expect(component.clientForm.controls.email.touched).toBe(true);
  });

  it('cannot click a future stepper step while required previous forms are invalid', () => {
    component.selectPath('organization');
    fixture.detectChanges();

    const organizationStep = findStepperButton('Organization');
    const reviewStep = findStepperButton('Review');

    expect(organizationStep?.disabled).toBe(true);
    expect(reviewStep?.disabled).toBe(true);

    organizationStep?.click();
    fixture.detectChanges();

    expect(component.currentStepId).toBe('client');
  });

  it('keeps Back enabled when the current step becomes invalid', () => {
    component.selectPath('organization');
    component.clientForm.controls.name.setValue('Maya Owner');
    component.clientForm.controls.email.setValue('maya@example.test');
    fixture.detectChanges();

    findButton('Next')?.click();
    fixture.detectChanges();

    expect(component.currentStepId).toBe('organization');
    expect(component.organizationForm.invalid).toBe(true);
    expect(findButton('Back')?.disabled).toBe(false);
  });

  it('preserves form values when navigating back', () => {
    component.selectPath('organization');
    component.clientForm.controls.name.setValue('Maya Owner');
    component.clientForm.controls.email.setValue('maya@example.test');
    fixture.detectChanges();

    findButton('Next')?.click();
    fixture.detectChanges();

    expect(component.currentStepId).toBe('organization');

    findButton('Back')?.click();
    fixture.detectChanges();

    expect(component.currentStepId).toBe('client');
    expect(component.clientForm.controls.name.value).toBe('Maya Owner');
    expect(component.clientForm.controls.email.value).toBe('maya@example.test');
  });

  it('keeps Review edit buttons jumping back to previous steps', () => {
    component.selectPath('organization');
    component.clientForm.controls.name.setValue('Maya Owner');
    component.clientForm.controls.email.setValue('maya@example.test');
    fixture.detectChanges();

    findButton('Next')?.click();
    component.organizationForm.controls.name.setValue('Harbor Group');
    fixture.detectChanges();

    findButton('Next')?.click();
    component.branchForm.controls.name.setValue('Downtown Branch');
    fixture.detectChanges();

    findButton('Next')?.click();
    component.venueForm.controls.name.setValue('Harbor Lounge');
    component.venueForm.controls.type.setValue('restaurant');
    fixture.detectChanges();

    findButton('Next')?.click();
    fixture.detectChanges();

    expect(component.currentStepId).toBe('review');

    findReviewEditButton('Branch')?.click();
    fixture.detectChanges();

    expect(component.currentStepId).toBe('branch');
  });

  it('shows grouped organization path review data', () => {
    fillOrganizationForms();
    component.wizardState.jumpToStep(4);
    fixture.detectChanges();

    expect(component.currentStepId).toBe('review');
    expect(getReviewSectionTitles()).toEqual(['Client', 'Organization', 'Branch', 'Venue']);
    expect(getReviewSectionText('Client')).toContain('Maya Owner');
    expect(getReviewSectionText('Client')).toContain('maya@example.test');
    expect(getReviewSectionText('Organization')).toContain('Harbor Group');
    expect(getReviewSectionText('Organization')).toContain('billing@example.test');
    expect(getReviewSectionText('Branch')).toContain('Downtown Branch');
    expect(getReviewSectionText('Branch')).toContain('Beirut');
    expect(getReviewSectionText('Venue')).toContain('Harbor Lounge');
    expect(getReviewSectionText('Venue')).toContain('restaurant');
  });

  it('shows only client and venue groups for standalone review', () => {
    fillStandaloneForms();
    component.wizardState.jumpToStep(2);
    fixture.detectChanges();

    expect(component.currentStepId).toBe('review');
    expect(getReviewSectionTitles()).toEqual(['Client', 'Venue']);
    expect(getReviewSectionText('Client')).toContain('Maya Owner');
    expect(getReviewSectionText('Venue')).toContain('Harbor Lounge');
  });

  it('asks for confirmation before canceling after data is entered', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.selectPath('standalone');
    component.clientForm.controls.name.setValue('Maya Owner');
    fixture.detectChanges();

    findButton('Cancel')?.click();
    fixture.detectChanges();

    expect(navigateSpy).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Discard the information entered in this wizard?');

    findButton('Keep editing')?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Discard the information entered in this wizard?');
    expect(component.wizardState.selectedPath()).toBe('standalone');
    expect(component.clientForm.controls.name.value).toBe('Maya Owner');
  });

  it('resets wizard state after successful finish redirect', async () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fillStandaloneForms();

    await component.finish();

    expect(navigateSpy).toHaveBeenCalledWith(['/venues', 'venue_1']);
    expect(component.wizardState.selectedPath()).toBeNull();
    expect(component.wizardState.formValues()).toEqual({
      client: null,
      organization: null,
      branch: null,
      venue: null,
    });
    expect(component.wizardState.createdEntities()).toEqual({});
  });

  it('does not reset wizard state after failed finish', async () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    shouldFailVenueCreate = true;
    fillStandaloneForms();

    await component.finish();

    expect(navigateSpy).not.toHaveBeenCalled();
    expect(component.wizardState.selectedPath()).toBe('standalone');
    expect(component.wizardState.formValues().client?.name).toBe('Maya Owner');
    expect(component.wizardState.formValues().venue?.name).toBe('Harbor Lounge');
    expect(component.wizardState.createdEntities().clientId).toBe('client_1');
    expect(component.wizardState.createdEntities().venueId).toBeUndefined();
    expect(component.wizardState.failedStep()).toBe('venue');
    expect(component.wizardState.errorMessage()).toBe(
      "We couldn't create the venue. Something went wrong. Please try again.",
    );
    expect(component.wizardState.errorMessage()).not.toContain('Venue create failed.');
  });

  it('shows a friendly client failure message and Retry without navigating', async () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    shouldFailClientCreate = true;
    fillStandaloneForms();
    component.wizardState.jumpToStep(2);
    fixture.detectChanges();

    await component.finish();
    fixture.detectChanges();

    expect(navigateSpy).not.toHaveBeenCalled();
    expect(component.wizardState.failedStep()).toBe('client');
    expect(component.wizardState.failedEntity()).toBe('client');
    expect(component.wizardState.errorMessage()).toBe(
      "We couldn't create the client. Something went wrong. Please try again.",
    );
    expect(fixture.nativeElement.textContent).toContain('Client step failed');
    expect(fixture.nativeElement.textContent).toContain(
      "We couldn't create the client. Something went wrong. Please try again.",
    );
    expect(fixture.nativeElement.textContent).not.toContain('Failed to fetch');
    expect(findButton('Retry')).toBeTruthy();
  });

  function getStepperLabels(): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('ol[aria-label="Setup progress"] button')).map((button) =>
      (button as HTMLButtonElement).textContent?.replace(/\s+/g, ' ').trim().replace(/^\d+\s*/, '').trim() ?? '',
    );
  }

  function findStepperButton(label: string): HTMLButtonElement | null {
    return (
      Array.from(fixture.nativeElement.querySelectorAll('ol[aria-label="Setup progress"] button')).find((button) =>
        (button as HTMLButtonElement).textContent?.includes(label),
      ) as HTMLButtonElement | undefined
    ) ?? null;
  }

  function findButton(label: string): HTMLButtonElement | null {
    return (
      Array.from(fixture.nativeElement.querySelectorAll('button')).find((button) =>
        (button as HTMLButtonElement).textContent?.includes(label),
      ) as HTMLButtonElement | undefined
    ) ?? null;
  }

  function findReviewEditButton(sectionTitle: string): HTMLButtonElement | null {
    const section = findReviewSection(sectionTitle);

    return section?.querySelector('button') ?? null;
  }

  function getReviewSectionTitles(): string[] {
    return getReviewSections().map((section) => section.querySelector('h4')?.textContent?.trim() ?? '');
  }

  function getReviewSectionText(sectionTitle: string): string {
    return findReviewSection(sectionTitle)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  }

  function getReviewSections(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('section section')) as HTMLElement[];
  }

  function findReviewSection(sectionTitle: string): HTMLElement | null {
    return getReviewSections().find((item) => item.querySelector('h4')?.textContent?.trim() === sectionTitle) ?? null;
  }

  function fillStandaloneForms(): void {
    component.selectPath('standalone');
    component.clientForm.controls.name.setValue('Maya Owner');
    component.clientForm.controls.email.setValue('maya@example.test');
    component.venueForm.controls.name.setValue('Harbor Lounge');
    component.venueForm.controls.type.setValue('restaurant');
    fixture.detectChanges();
  }

  function fillOrganizationForms(): void {
    component.selectPath('organization');
    component.clientForm.controls.name.setValue('Maya Owner');
    component.clientForm.controls.email.setValue('maya@example.test');
    component.clientForm.controls.phone.setValue('+961000000');
    component.clientForm.controls.company.setValue('Harbor Group');
    component.organizationForm.controls.name.setValue('Harbor Group');
    component.organizationForm.controls.billingEmail.setValue('billing@example.test');
    component.branchForm.controls.name.setValue('Downtown Branch');
    component.branchForm.controls.city.setValue('Beirut');
    component.venueForm.controls.name.setValue('Harbor Lounge');
    component.venueForm.controls.type.setValue('restaurant');
    fixture.detectChanges();
  }
});
