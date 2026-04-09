# Multi-Disease Outbreak System — Task Tracker

## Phase 1 — Core Schema Refactor
- [/] Update Prisma schema (Disease, Outbreak, FormField, ReportFieldValue, DailyReport changes)
- [ ] Update seed.ts with Disease + Outbreak + Settings backfill
- [ ] Run migration
- [ ] Verify migration with Prisma Studio

## Phase 2 — RBAC & Auth
- [ ] Create `lib/rbac.ts` permission system
- [ ] Update Role enum (add EDITOR)
- [ ] Update `lib/auth.ts` JWT + session with division
- [ ] Update Navbar for role-conditional rendering

## Phase 3 — API Layer
- [ ] Disease API (CRUD)
- [ ] Outbreak API (CRUD + status transitions)
- [ ] Outbreak Fields API (FormField CRUD)
- [ ] Update Reports API (outbreak-aware + RBAC)
- [ ] Update Public Submit API (outbreak-aware + dynamic fields)
- [ ] Report lock/unlock API
- [ ] Update audit.ts with new actions

## Phase 4 — Dashboard Overhaul
- [ ] Create `lib/dashboard.ts` server aggregation
- [ ] Add outbreak selector to dashboard
- [ ] Apply RBAC scoping to dashboard data
- [ ] Update KPIs and charts for outbreak context

## Phase 5 — Dynamic Report Form
- [ ] Create `ReportForm` component
- [ ] Create `DynamicField` renderer
- [ ] Integrate into public page (with outbreak selector)
- [ ] Integrate into dashboard report page

## Phase 6 — Admin Panel Extensions
- [ ] Disease management page
- [ ] Outbreak management page
- [ ] Form builder UI
- [ ] Update admin reports (outbreak filter + lock toggle)
- [ ] Update admin users (EDITOR role support)

## Phase 7 — Export System
- [ ] Update PDF generator for outbreak context
- [ ] Update Excel export for dynamic fields

## Phase 8 — CSV Import
- [ ] Import API route
- [ ] Admin import UI

## Phase 9 — Email Notifications
- [ ] Trigger email on outbreak ACTIVE status change
