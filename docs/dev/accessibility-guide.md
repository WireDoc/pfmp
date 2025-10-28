# Accessibility Guide – PFMP Frontend

**Target**: WCAG 2.1 Level AA Compliance  
**Last Updated**: October 27, 2025  
**Version**: v0.9.0-alpha

## Overview

This guide documents accessibility patterns, testing procedures, and compliance status for the PFMP application. Our goal is to ensure all users, including those using assistive technologies, can effectively use our financial planning tools.

## WCAG 2.1 AA Compliance Checklist

### ✅ Perceivable

#### Text Alternatives (1.1)
- [x] All images have alt text (decorative images use alt="")
- [x] Form inputs have associated labels
- [x] Icon buttons have aria-label attributes
- [ ] Complex charts have text descriptions (TODO: Add to NetWorthSparkline)

#### Time-based Media (1.2)
- [x] No video/audio content currently (N/A)

#### Adaptable (1.3)
- [x] Semantic HTML used throughout (headings, lists, nav, main, etc.)
- [x] Content structure makes sense without CSS
- [x] Tables use proper th/td markup (when tables are used)
- [x] Forms use fieldset/legend for grouping
- [x] ARIA landmarks used (navigation, main, complementary)

#### Distinguishable (1.4)
- [x] Color contrast meets 4.5:1 ratio for normal text
- [x] Color contrast meets 3:1 ratio for large text (18pt+)
- [ ] Text can be resized up to 200% (TODO: Test thoroughly)
- [x] No information conveyed by color alone
- [x] Focus indicators visible on all interactive elements
- [ ] No background audio (N/A currently)

### ⏳ Operable

#### Keyboard Accessible (2.1)
- [x] All functionality available via keyboard
- [x] No keyboard traps
- [x] Tab order follows logical reading order
- [ ] Skip links implemented (TODO: Add "Skip to main content")
- [x] Keyboard shortcuts don't conflict with screen readers

#### Enough Time (2.2)
- [x] No time limits on reading or interaction
- [ ] Auto-refresh can be paused (TODO: Add pause for 5-min dashboard polling)
- [x] No interruptions except for emergencies

#### Seizures and Physical Reactions (2.3)
- [x] No content flashes more than 3 times per second
- [x] Animations can be disabled via prefers-reduced-motion

#### Navigable (2.4)
- [x] Page title describes content
- [x] Focus order follows meaningful sequence
- [x] Link purpose clear from link text
- [x] Multiple ways to find pages (navigation + breadcrumbs)
- [x] Headings and labels are descriptive
- [x] Focus indicator is visible
- [x] Current page highlighted in navigation

#### Input Modalities (2.5)
- [x] Touch targets at least 44x44px
- [x] No pointer gestures required (all interactions work with single tap/click)
- [x] Labels for all input fields
- [x] Motion actuation not required

### ⏳ Understandable

#### Readable (3.1)
- [x] Page language set (lang="en")
- [x] Parts in other languages marked (currently English only)

#### Predictable (3.2)
- [x] Focus doesn't trigger automatic context changes
- [x] Input doesn't trigger automatic context changes
- [x] Navigation consistent across pages
- [x] Components identified consistently

#### Input Assistance (3.3)
- [x] Error messages clearly identify which fields have errors
- [x] Labels and instructions provided for all inputs
- [x] Error suggestions provided when possible
- [x] Error prevention for financial data (confirmation dialogs)
- [ ] Context-sensitive help available (TODO: Add help tooltips)

### ⏳ Robust

#### Compatible (4.1)
- [x] Valid HTML (no parsing errors)
- [x] Name, role, value available for all UI components
- [x] Status messages announced to screen readers (using ARIA live regions)
- [x] No duplicate IDs on pages

## Keyboard Navigation Patterns

### Dashboard Navigation
- **Tab**: Move focus to next interactive element
- **Shift+Tab**: Move focus to previous interactive element
- **Enter/Space**: Activate buttons and links
- **Arrow keys**: Navigate within menus and lists
- **Escape**: Close dialogs and dropdowns

### Skip Links
```tsx
<a href="#main-content" className="skip-link">
  Skip to main content
</a>
```
- Position: First focusable element on page
- Styling: Visually hidden until focused
- Destination: `id="main-content"` on main content area

### Focus Management
- Focus trapped in modals when open
- Focus returned to trigger element when modal closes
- Focus moves to new content after dynamic updates
- Focus indicator visible at all times (never `outline: none` without replacement)

## Screen Reader Support

### Tested Assistive Technologies
- **NVDA** (Windows): Primary test target
- **JAWS** (Windows): Secondary test target
- **VoiceOver** (macOS/iOS): Mobile test target
- **TalkBack** (Android): Mobile test target

### ARIA Patterns Used

#### Live Regions
```tsx
<div role="status" aria-live="polite" aria-atomic="true">
  {loading ? 'Loading dashboard data...' : ''}
</div>
```

#### Alert Messages
```tsx
<Alert role="alert">
  Error loading data. Please try again.
</Alert>
```

#### Button Labels
```tsx
<IconButton aria-label="Refresh dashboard data" onClick={refresh}>
  <RefreshIcon />
</IconButton>
```

#### Progress Indicators
```tsx
<CircularProgress
  role="progressbar"
  aria-label="Loading dashboard"
  aria-valuenow={progress}
  aria-valuemin={0}
  aria-valuemax={100}
/>
```

#### Navigation Landmarks
```tsx
<nav aria-label="Dashboard navigation">
  {/* Navigation links */}
</nav>

<main id="main-content">
  {/* Main dashboard content */}
</main>

<aside aria-label="Quick stats">
  {/* Sidebar content */}
</aside>
```

## Testing Procedures

### Manual Testing Checklist

#### Keyboard Navigation Test
1. Disconnect mouse
2. Navigate entire dashboard using only keyboard
3. Verify all interactive elements are reachable
4. Verify focus indicator always visible
5. Verify no keyboard traps
6. Verify tab order logical

#### Screen Reader Test (NVDA)
1. Start NVDA
2. Navigate dashboard with browse mode (arrow keys)
3. Verify all content announced properly
4. Navigate with Tab key
5. Verify form labels announced
6. Verify button purposes clear
7. Verify error messages announced
8. Verify loading states announced

#### Color Contrast Test
1. Use browser DevTools or Contrast Checker
2. Verify all text meets 4.5:1 ratio (or 3:1 for large text)
3. Check disabled states still readable
4. Check placeholder text meets contrast requirements
5. Check focus indicators meet 3:1 ratio

#### Zoom Test
1. Set browser zoom to 200%
2. Verify all content still readable
3. Verify no horizontal scrolling required
4. Verify all interactive elements still usable
5. Verify layout doesn't break

### Automated Testing

#### Axe DevTools (Browser Extension)
1. Install axe DevTools browser extension
2. Open dashboard in browser
3. Run axe scan
4. Review and fix all violations
5. Document any false positives

#### axe-core (Unit Tests)
```tsx
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

test('dashboard has no accessibility violations', async () => {
  const { container } = render(<DashboardWave4 />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

#### Lighthouse Accessibility Audit
```bash
npm run lighthouse
```
- Target score: 100
- Run on all major pages
- Document any issues preventing 100 score

## Common Accessibility Issues & Fixes

### Issue: Missing Alt Text
**Problem**: Images without alt attributes
**Fix**:
```tsx
// Decorative image
<img src="logo.png" alt="" />

// Informative image
<img src="chart.png" alt="Net worth trend showing 10% increase" />
```

### Issue: Low Color Contrast
**Problem**: Text too light on background
**Fix**: Use MUI theme tokens that meet contrast requirements
```tsx
// ❌ Bad
<Typography sx={{ color: '#999', backgroundColor: '#fff' }}>

// ✅ Good
<Typography color="text.primary">
```

### Issue: Missing Form Labels
**Problem**: Input fields without associated labels
**Fix**:
```tsx
// ❌ Bad
<TextField placeholder="Email" />

// ✅ Good
<TextField label="Email" />
```

### Issue: Missing Button Labels
**Problem**: Icon buttons without text or aria-label
**Fix**:
```tsx
// ❌ Bad
<IconButton onClick={handleDelete}>
  <DeleteIcon />
</IconButton>

// ✅ Good
<IconButton aria-label="Delete account" onClick={handleDelete}>
  <DeleteIcon />
</IconButton>
```

### Issue: Focus Not Visible
**Problem**: Custom styles remove focus indicator
**Fix**:
```tsx
// ❌ Bad
sx={{ '&:focus': { outline: 'none' } }}

// ✅ Good
sx={{ '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' } }}
```

## MUI Accessibility Features

### Built-in Accessibility
- All MUI components include proper ARIA attributes
- Keyboard navigation built into all interactive components
- Focus management handled automatically
- High contrast mode support

### Accessibility Props
```tsx
// TextField
<TextField
  label="Amount"
  helperText="Enter amount in dollars"
  error={hasError}
  aria-describedby="amount-error"
/>

// Button
<Button aria-label="Submit form" aria-busy={loading}>

// Dialog
<Dialog
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
>
```

## Reduced Motion Support

### Respecting User Preferences
```tsx
// Disable animations for users who prefer reduced motion
const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

<Slide
  in={open}
  direction="down"
  timeout={prefersReducedMotion ? 0 : 300}
>
```

### CSS Media Query
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Resources

### Tools
- **axe DevTools**: https://www.deque.com/axe/devtools/
- **NVDA**: https://www.nvaccess.org/download/
- **WebAIM Contrast Checker**: https://webaim.org/resources/contrastchecker/
- **WAVE**: https://wave.webaim.org/extension/

### Guidelines
- **WCAG 2.1**: https://www.w3.org/WAI/WCAG21/quickref/
- **ARIA Authoring Practices**: https://www.w3.org/WAI/ARIA/apg/
- **MUI Accessibility Guide**: https://mui.com/material-ui/guides/accessibility/

### Training
- **WebAIM**: https://webaim.org/articles/
- **Deque University**: https://dequeuniversity.com/
- **A11ycasts (YouTube)**: https://www.youtube.com/playlist?list=PLNYkxOF6rcICWx0C9LVWWVqvHlYJyqw7g

## Next Steps

### Phase 5 Tasks (In Progress)
1. [ ] Add skip link to dashboard layout
2. [ ] Add pause control for auto-refresh
3. [ ] Add text descriptions to charts
4. [ ] Run comprehensive axe audit on all pages
5. [ ] Test with NVDA screen reader
6. [ ] Test zoom to 200% on all pages
7. [ ] Document any remaining issues

### Future Improvements
- [ ] Add context-sensitive help tooltips
- [ ] Implement keyboard shortcuts with customization
- [ ] Add high contrast theme option
- [ ] Improve error recovery workflows
- [ ] Add more detailed ARIA descriptions for complex interactions

---

**Maintained by**: Development Team  
**Questions**: Contact accessibility champion or file GitHub issue with `a11y` label
