# Ring n Bring Sales Portal

Angular front-end assessment for a sales workspace. The app uses the provided mock API and implements login, dashboard, organization, branch, venue, client, and setup wizard workflows.

## Versions

- Angular: `22.0.5`
- Angular CLI: `22.0.5`
- Node.js: `24.15.0`
- npm: `11.12.1`

## API

The front end expects the mock API to be running separately at:

```text
http://localhost:8787/api
```

This value is configured in `src/environments/environment.ts` as `environment.apiBaseUrl` and should remain unchanged for the assessment.

## Setup

Start the mock API first from the assessment mock API project:

```bash
npm install
npm start
```

Then start the Angular app from this repository:

```bash
npm install
npm start
```

Open:

```text
http://localhost:4200
```

## Login

Use the assessment credentials:

```text
Email: admin@example.test
Password: assessment
```

## Checks

Run the production build:

```bash
npm run build
```

Run unit/component tests:

```bash
npm test
```

## Architecture Notes

- API calls are kept in typed services under `src/app/core/*`.
- `ApiClient` centralizes base URL handling, query param cleanup, and `{ data }` response unwrapping.
- Feature services normalize API response shapes into front-end models where needed.
- Auth uses an interceptor to attach the stored token to API requests.
- The setup wizard uses a dedicated `WizardStateService` to hold selected path, current step, form values, created entity IDs, progress, and failure state.
- Wizard finish composes existing typed services instead of calling a dedicated wizard endpoint.
- Partial-failure retry is ID-aware: once an entity is created, its ID is stored and later retries skip that entity instead of recreating it.
- Wizard error formatting avoids exposing raw network messages such as `Failed to fetch` and shows a friendly failed-step message.

## Completed Scope

- Login with guarded routes.
- Dashboard summary.
- Organizations list, create, detail, and status update with rollback.
- Branches list, create, edit, delete confirmation, and dependency-error handling.
- Venues list, create, detail, status update with rollback, filtering, sorting, pagination, and retry states.
- Clients list, create, edit, delete confirmation, and dependency-error handling.
- Setup Wizard:
  - Organization path: Client -> Organization -> Branch -> Venue -> Review.
  - Standalone path: Client -> Venue -> Review.
  - Required field validation and guarded forward navigation.
  - Back navigation preserving form state.
  - Grouped review with Edit links.
  - Sequential finish flow.
  - Partial-failure retry without recreating successful entities.
  - Success redirect to `/venues/:id` and state reset after navigation.

## Intentional Cuts

The following items are intentionally out of scope for this assessment build:

- Serials.
- Renewals page.
- Audit logs.
- Clone.
- Migration.
- Staff CRUD.
- Venue delete.

## Known Limitations

- The mock API is not included in this front-end repository and must be run separately.
- No end-to-end framework is configured; coverage is focused unit/component testing with mocked typed services.
- The current production build succeeds but emits an initial bundle budget warning.

## Manual QA Checklist

- Start the mock API at `http://localhost:8787/api`.
- Start the Angular app with `npm start`.
- Log in with `admin@example.test` / `assessment`.
- Confirm the dashboard loads.
- Exercise list/create/edit/delete or status flows for organizations, branches, venues, and clients.
- Run the Setup Wizard organization path and confirm redirect to `/venues/:id`.
- Run the Setup Wizard standalone path and confirm redirect to `/venues/:id`.
- Force or simulate a wizard venue creation failure, then retry and confirm previously created entities are not recreated.
- Run `npm run build`.
- Run `npm test`.
