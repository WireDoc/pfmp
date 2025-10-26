# Wave 6 – Navigation Shell & Dashboard Polish

**Status**: Planning  
**Target Start**: October 2025  
**Goal**: Transform the dashboard from a single-page view into a navigable application with persistent left sidebar, polished data flows, and hardened test coverage.

## Overview

Wave 5 delivered a functional dashboard with real backend data. Wave 6 focuses on making the experience feel like a complete application rather than a prototype by adding:
- Persistent navigation structure
- Enhanced dashboard interactions
- Performance optimization
- Visual consistency and accessibility improvements

## Objectives

1. **Navigation Shell** – Add left sidebar navigation for dashboard sections (Overview, Accounts, Insights, Profile, Settings)
2. **Dashboard Polish** – Refine data display, loading states, error handling, and refresh flows
3. **Performance Baseline** – Establish metrics for load times, API response times, and interaction latency
4. **Accessibility Hardening** – Ensure WCAG 2.1 AA compliance for keyboard navigation and screen readers
5. **Test Infrastructure** – Expand visual regression coverage and integration test scenarios

## Functional Scope

### 1. Navigation Shell Structure

#### Left Sidebar Component (`DashboardNav.tsx`)
- **Layout**: Persistent left rail (240px width, collapsible to 64px icon-only mode)
- **Structure**:
  ```
  [Logo/Brand]
  ─────────────
  Dashboard      (home icon)
  Accounts       (account_balance icon)
  Insights       (lightbulb icon)
  Tasks          (checklist icon)
  ─────────────
  Profile        (person icon)
  Settings       (settings icon)
  Help           (help icon)
  ─────────────
  [User Avatar]
  Sign Out
  ```
- **Active State**: Highlight current section with accent color and bold text
- **Mobile Behavior**: Collapse to hamburger menu below 900px breakpoint
- **Accessibility**: Full keyboard navigation with skip links

#### Route Structure Updates
```typescript
/dashboard                 → Overview (net worth, quick glance)
/dashboard/accounts        → Accounts list (cash, investments, TSP, properties)
/dashboard/insights        → Insights & recommendations
/dashboard/tasks           → Task management (accept/dismiss advice)
/dashboard/profile         → Financial profile summary (view onboarding data)
/dashboard/settings        → User preferences
```

#### Implementation Tasks
- [ ] Create `DashboardLayout.tsx` wrapper component with sidebar + content area
- [ ] Build `DashboardNav.tsx` with navigation links and active state tracking
- [ ] Update `AppRouter.tsx` to use dashboard layout for all `/dashboard/*` routes
- [ ] Add mobile hamburger menu with drawer transition
- [ ] Implement route-based breadcrumbs in dashboard header
- [ ] Add unit tests for navigation active state logic
- [ ] Add integration tests for route switching and layout rendering

### 2. Dashboard Feature Enhancements

#### Data Refresh Flows
- **Auto-refresh**: Background polling every 5 minutes for dashboard data
- **Manual refresh**: Pull-to-refresh gesture (mobile) + button (desktop)
- **Refresh indicators**: Show timestamp of last update + loading spinners
- **Optimistic updates**: Immediate UI updates for task actions with rollback on error

#### Enhanced Data Display
- **Net Worth Trends**: Add 30-day sparkline chart to net worth card
- **Account Cards**: Display sync status badges, last updated time, institution logos
- **Insights Prioritization**: Sort by impact (High/Medium/Low) with visual indicators
- **Empty States**: Friendly messaging when no accounts/insights/tasks exist

#### Error Handling
- **Network failures**: Retry with exponential backoff, show offline banner
- **Stale data warnings**: Flag data older than 24 hours
- **API errors**: User-friendly error messages with support contact links

#### Implementation Tasks
- [ ] Add data refresh service with configurable polling intervals
- [ ] Implement last-updated timestamp display on all data cards
- [ ] Build sparkline chart component for net worth trends
- [ ] Create sync status badge component with tooltip explanations
- [ ] Add offline detection and banner notification
- [ ] Implement stale data detection and warnings
- [ ] Add comprehensive error boundary for dashboard routes
- [ ] Write integration tests for refresh flows and error states

### 3. Performance Optimization

#### Metrics to Track
- **Page Load Time**: Dashboard initial render < 1.5s
- **API Response Time**: Dashboard summary endpoint < 500ms (p95)
- **Interaction Latency**: Task accept/dismiss < 200ms visual feedback
- **Bundle Size**: Frontend dashboard chunk < 150KB gzipped

#### Optimization Strategies
- Code splitting for dashboard routes (lazy load accounts/insights/tasks)
- Implement React.memo for expensive dashboard components
- Add service worker for offline caching of static assets
- Optimize dashboard API queries (minimize joins, add indexes)
- Preload next likely route on hover (accounts link hover → prefetch accounts data)

#### Implementation Tasks
- [ ] Add performance measurement hooks to dashboard components
- [ ] Implement route-based code splitting with React.lazy
- [ ] Profile dashboard renders and optimize re-render triggers
- [ ] Add database indexes for dashboard query optimization
- [ ] Implement service worker for asset caching
- [ ] Set up Lighthouse CI for automated performance tracking
- [ ] Document performance baseline in `docs/testing/performance-baseline.md`

### 4. Accessibility Improvements

#### WCAG 2.1 AA Compliance Checklist
- [ ] Keyboard navigation: All interactive elements accessible via Tab/Enter/Space
- [ ] Focus indicators: High-contrast focus outlines on all focusable elements
- [ ] Screen reader support: Proper ARIA labels, roles, and live regions
- [ ] Color contrast: All text meets 4.5:1 contrast ratio
- [ ] Skip links: "Skip to main content" for keyboard users
- [ ] Form labels: All inputs have associated labels
- [ ] Error announcements: Screen reader feedback for validation errors
- [ ] Loading states: Announce data loading/completion to screen readers

#### Implementation Tasks
- [ ] Audit current dashboard with axe DevTools and WAVE
- [ ] Add skip links to dashboard layout
- [ ] Implement ARIA live regions for dynamic content updates
- [ ] Add comprehensive keyboard event handlers for custom interactions
- [ ] Ensure all form inputs have proper labels and error associations
- [ ] Test with NVDA and JAWS screen readers
- [ ] Document accessibility patterns in `docs/dev/accessibility-guide.md`

### 5. Visual Regression Testing

#### Coverage Goals
- Dashboard overview page (4 viewport sizes)
- Accounts list (empty, populated, loading, error states)
- Insights panel (various alert types)
- Navigation sidebar (expanded, collapsed, mobile)
- Dark mode support (if implemented)

#### Implementation Tasks
- [ ] Set up Playwright visual regression tests
- [ ] Create baseline screenshots for all dashboard views
- [ ] Add CI integration for visual diff checking
- [ ] Document visual regression workflow in `docs/testing/visual-regression-plan.md`
- [ ] Establish screenshot update process for intentional UI changes

## Phased Delivery

| Phase | Focus | Timeline | Exit Criteria |
|-------|-------|----------|---------------|
| 1 | Navigation Shell | Week 1-2 | Sidebar navigation functional on all routes, mobile responsive |
| 2 | Data Display Polish | Week 2-3 | Refresh flows, sparklines, sync badges implemented |
| 3 | Error Handling | Week 3-4 | Comprehensive error states, offline support, retry logic |
| 4 | Performance Baseline | Week 4-5 | Metrics collected, optimizations applied, Lighthouse score >90 |
| 5 | Accessibility & Testing | Week 5-6 | WCAG AA compliance, visual regression suite operational |

## Dependencies & Prerequisites

- Wave 5 MVP complete (dashboard with real data) ✅
- Backend dashboard API stable and performant
- Design system components (buttons, cards, badges) documented
- Test infrastructure (Vitest, Playwright) configured

## Success Metrics

### User Experience
- Dashboard loads in < 1.5s on 3G connection
- Zero keyboard navigation blockers
- Task actions complete within 200ms (perceived)
- Mobile navigation usable on 375px viewport

### Technical Quality
- 100% of dashboard routes have visual regression coverage
- Lighthouse Performance score >90, Accessibility score 100
- Zero console errors on dashboard load
- Test coverage >85% for new navigation components

### Product Readiness
- 5+ test users can navigate dashboard without confusion
- Support team reports <5% error rate on dashboard interactions
- Product team approves navigation UX for external beta

## Documentation Updates

- [ ] Update `docs/guides/FRONTEND-BACKEND-GUIDE.md` with navigation architecture
- [ ] Create `docs/dev/accessibility-guide.md` with patterns and checklist
- [ ] Update `docs/testing/README.md` with visual regression workflow
- [ ] Create `docs/testing/performance-baseline.md` with metrics
- [ ] Update `docs/waves/MIGRATION_STATUS.md` with Wave 6 completion status

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Navigation UX confusing | High | Early user testing with 3-5 internal users, iterate on feedback |
| Performance regression | Medium | Establish baseline before changes, monitor continuously |
| Accessibility gaps | High | Audit early and often, involve accessibility specialist |
| Visual regression false positives | Low | Tune screenshot tolerances, implement ignore regions |
| Backend API slowdowns | Medium | Implement aggressive client caching, loading states |

## Open Questions

1. **Dark Mode**: Should Wave 6 include dark mode support or defer to Wave 7?
   - *Recommendation*: Defer to Wave 7, focus on core navigation experience first
   
2. **Mobile App**: Will mobile web experience suffice or should we plan native apps?
   - *Recommendation*: Validate mobile web first, gather user feedback on app need
   
3. **Settings Depth**: How many settings should be exposed in Wave 6?
   - *Recommendation*: Start minimal (theme, notifications, privacy) and expand iteratively

## Next Steps

1. **Design Review**: Schedule walkthrough of navigation mockups with product team
2. **Technical Spike**: Prototype sidebar layout with MUI Drawer component (2 days)
3. **Accessibility Audit**: Run axe DevTools on current dashboard, document gaps
4. **Performance Baseline**: Collect current metrics before optimization work begins
5. **Team Assignment**: Identify owners for navigation, polish, performance, and testing tracks

---

**Prepared**: October 26, 2025  
**Authors**: Development Team  
**Status**: Planning / Awaiting Approval  
**Related Docs**: `WAVE-5-DASHBOARD-MVP.md`, `docs/history/roadmap.md`
