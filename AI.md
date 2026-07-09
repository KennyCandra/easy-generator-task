# AI Usage Notes

AI assistance was used as a development accelerator for scaffolding, implementation planning, and boilerplate-heavy code. The generated output was reviewed and adjusted manually during implementation.

## AI-Assisted Areas

- Converted the PDF requirements into a staged implementation plan.
- Scaffolded the initial NestJS and Vite React TypeScript apps.
- Drafted the backend module structure for users, authentication, JWT strategy, and protected route.
- Drafted the frontend routing, auth context, Axios client, forms, and Zod validation.
- Helped keep the work split into clean reviewable milestones.

## Effective Prompts And Approach

- Asking for a commit-by-commit plan helped keep the implementation organized and reviewable.
- Asking for exact validation parity between frontend and backend helped avoid drift between Zod and class-validator rules.
- Asking for access and refresh token support led to a more production-minded solution than a single-token implementation.

## Manual Corrections And Rework

- Swagger was intentionally skipped to keep the task focused.
- Password validation was changed from one combined regex into separate rules for readability and clearer validation messages.
- The Axios interceptor was corrected so failed signin/signup requests do not trigger refresh-token retry logic.
- Form validation was changed to validate live while typing instead of only after submit.
- Refresh tokens were kept in an `httpOnly` cookie, while access tokens are handled by the frontend for Bearer authorization.

## Verification

The implementation was checked with backend and frontend build commands, backend ESLint, backend e2e tests, and frontend Oxlint, along with manual browser testing against a live MongoDB connection signup, signin, protected route access, and logout all verified end-to-end.
