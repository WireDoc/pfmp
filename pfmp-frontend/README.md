# PFMP Frontend – Personal Financial Management Platform

Modern React (19) + TypeScript + Vite application for service member / veteran–focused financial planning: allocation intelligence, onboarding guidance, and forthcoming dual-AI advisory pipeline.

## Status (Wave Model)

| Wave | Focus | Status |
|------|-------|--------|
| 0 | Baseline cleanup, routing plan, feature flag infra, test harness seed | ✅ Complete |
| 1 | Core routing, protected routes, layout, dev flag panel | ✅ Complete |
| 2 | Onboarding scaffold (context, steps UI, auth simulation control) | 🚧 In Progress |
| 3 | Data persistence & onboarding validation | Planned |
| 4 | Intelligence dashboards (exp_intelligence_dashboards) | Planned |
| 5 | Dual AI pipeline (exp_dual_ai_pipeline) | Planned |
| 6 | Performance, accessibility, visual regression hardening | Planned |

### Current Wave (2) – Onboarding
Delivered so far:
- `OnboardingContext` reducer + hook (progress, completion tracking)
- Interactive `OnboardingPage` (steps list, progress bar, navigation controls)
- Feature flag `use_simulated_auth` gating simulated MSAL shortcut
- Expanded test coverage: routing, protected route, not-found, flags panel, onboarding state

Upcoming within Wave 2:
- Validation layer (schema placeholders)
- Potential per-step component extraction
- Persisted progress design notes (prep for Wave 3)

### Feature Flags Snapshot
| Flag | Default | Purpose |
|------|---------|---------|
| routing_enabled | true | Gate base router initialization (legacy safety) |
| onboarding_enabled | false | External exposure toggle (will flip post-polish) |
| use_simulated_auth | true | Rapid dev velocity with mock users |
| storybook_docs_enabled | false | Reserved; Storybook deferred pending Vite 7 alignment |
| exp_intelligence_dashboards | false | Future analytics modules |
| exp_dual_ai_pipeline | false | Future advisory dual-AI engine |

### Storybook (Deferred)
Storybook installation is deferred: currently published addon sets for 9.x did not fully align with `vite@7` at time of Wave 2 kickoff. We will install once a coherent 9.x release set (framework + addons) is available without forcing peer overrides. Until then, component review occurs inline or via temporary sandbox routes.

## Tech Stack
- React 19 + TypeScript
- Vite 7
- MUI 7 (Material UI)
- MSAL Browser (real auth to be enabled after simulated phase)
- Axios (typed API helper)
- Vitest + Testing Library + jsdom
- Custom feature flag store via `useSyncExternalStore`

## Quick Start
```bash
npm install
npm run dev
```

Generate (typed) OpenAPI types (ensure backend running on 5052):
```bash
npm run generate:api
```

Run tests:
```bash
npm test
```

## Project Structure (Current)
```
src/
  api/              # HTTP client + generated OpenAPI types (after generate:api)
  components/       # Reusable UI + dev utilities (DevFlagsPanel, etc.)
  contexts/         # Auth + future domain contexts
  flags/            # Feature flag store & hooks
  layout/           # App shell, header bar
  onboarding/       # Wave 2 onboarding context & step defs
  routes/           # Central route definitions
  tests/            # Vitest specs
  views/            # Page-level components
```

## Testing Philosophy
Lightweight unit + integration tests focusing on: routing assurances, guarded navigation, context reducers, and critical developer affordances (feature flags). Visual & interaction regression will be layered in a later wave.

## Contributing (High Level)
1. Small, focused PRs aligned to a wave.
2. Add/extend tests for changed behavior.
3. Prefer feature flag gating for experimental UI.
4. Document decisions in a wave kickoff or completion doc (`docs/waves`).

## Roadmap Highlights
- Wave 2 completion → flip `onboarding_enabled` and begin persistence design.
- Wave 3 introduces backend persistence + validation for onboarding.
- Wave 4 unlocks intelligence dashboards under experimental flag.
- Wave 5 dual-AI advisory pipeline experiment.
- Wave 6 performance, accessibility, visual regression harness & Storybook adoption.

---
Legacy migration notes (MUI Grid v1→v2) and earlier error tallies were archived during Wave 0 cleanup and are intentionally removed for clarity.

## Technology Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite with HMR support  
- **UI Framework**: Material-UI v7.3.2 (latest)
- **Authentication**: Microsoft MSAL (Azure Active Directory)
- **State Management**: React Context API
- **API Integration**: Custom hooks with TypeScript interfaces
- **Development**: Hot reload, ESLint, TypeScript strict mode

## 🚀 Next Steps for Development

### Immediate Actions Required
1. **Build Error Resolution**: Run `npm run build` and fix the 11 remaining TypeScript errors:
   - Type-only import fixes in `AuthContext.tsx` (3 errors)
   - Unused parameter cleanup in `Dashboard.tsx` (1 error) 
   - Unused private field warnings in `FinancialDataService.ts` (2 errors)
   - Unused parameter warnings in `InvestmentAnalyzer.ts` (5 errors)

2. **Development Server**: After build errors are resolved, test with `npm run dev`

3. **Feature Testing**: Verify MUI Grid layouts render correctly across all dashboard components

### Long-term Roadmap
- Complete Microsoft Azure AD authentication integration
- Implement Plaid API for bank account connectivity  
- Add comprehensive financial goal tracking
- Develop investment portfolio analysis features
- Create real-time financial alerts system

## 📖 Development Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn package manager

### Installation & Development
```bash
# Install dependencies
npm install

# Start development server (after fixing build errors)
npm run dev

# Build for production 
npm run build

# Preview production build
npm run preview
```

### Current Build Issues (Sept 2025)
When starting development, you'll need to address these TypeScript errors:
```bash
# Run build to see current errors
npm run build

# Expected: 11 TypeScript compilation errors
# - 3x type-only import issues in AuthContext.tsx
# - 1x unused parameter in Dashboard.tsx  
# - 2x unused private fields in FinancialDataService.ts
# - 5x unused parameters in InvestmentAnalyzer.ts
```

## 📁 Project Structure
```
src/
├── components/           # React UI components
│   ├── forms/           # Form components (goals, accounts, etc.)
│   ├── Dashboard.tsx    # Main dashboard (MUI Grid v2 ✅)
│   └── ...
├── contexts/            # React Context providers  
│   └── AuthContext.tsx  # MSAL authentication (restored ✅)
├── hooks/               # Custom React hooks
├── services/            # API services and business logic
├── config/              # Configuration files
└── types/               # TypeScript type definitions
```

## 🔧 ESLint Configuration

For production applications, enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
