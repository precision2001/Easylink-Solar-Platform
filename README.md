# Backend changes for the EasyLink AI platform

`backend-ai-platform.patch` applies to the EasyLink backend (Express + Prisma), from the CodePipeline source `solar-panel-server`.

It adds:
- `installer_assignments` (who was on each job, from when to when, why) and `partners` (retailers, DNSPs, suppliers) tables, with a migration that backfills current assignments from `leads.assignedToId`;
- AI columns on `installer_customer_documents` and `leads.retailerPartnerId`;
- `/projects` (everything for or about a customer or person, filtered by who is asking: customers never see installer notes, tasks, the activity log or installer profiles), `/partners`, and `PATCH /installer-customer-documents/:id/ai`;
- phone search for users; RBAC matrix sections; tests.

Apply on a branch in the backend repo:

```
git checkout -b feat/ai-platform
git apply --3way backend-ai-platform.patch
npx prisma migrate deploy   # after review, against a non-production database first
npm test
```

Then set `backendProjectsApi=1` in the AI platform's CDK context.
