import { useOnboarding } from '../onboarding/useOnboarding';
import { useEffect } from 'react';

export default function OnboardingPage() {
  const { steps, current, goNext, goPrev, markComplete, completed, progressPercent } = useOnboarding();

  // Auto-mark current as complete when user advances past it (explicit mark via button)
  useEffect(() => {
    // no-op for now; reserved for side-effects like analytics
  }, [current.id]);

  const currentDef = steps[current.index];

  return (
    <div style={{ maxWidth: 820, margin: '24px auto', padding: '0 16px' }}>
      <h1 style={{ marginBottom: 4 }}>Onboarding</h1>
      <p style={{ marginTop: 0, fontSize: 14, opacity: 0.8 }}>Progress helps personalize allocations & projections.</p>

      <div style={{ background: '#f5f5f5', height: 8, borderRadius: 4, margin: '16px 0', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: progressPercent + '%', background: '#1976d2', borderRadius: 4, transition: 'width 160ms ease' }} />
      </div>

      <div style={{ display: 'flex', gap: 24 }}>
        <aside style={{ width: 240 }}>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {steps.map((s, i) => {
              const done = completed.has(s.id);
              const active = i === current.index;
              return (
                <li key={s.id} style={{ padding: '8px 10px', borderRadius: 6, background: active ? '#e3f2fd' : '#fff', border: '1px solid #ddd', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 18, height: 18, borderRadius: 9, background: done ? '#1976d2' : '#bbb', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11 }}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{s.title}</div>
                    <div style={{ fontSize: 11, opacity: 0.65 }}>{s.description}</div>
                  </div>
                </li>
              );
            })}
          </ol>
        </aside>
        <section style={{ flex: 1 }}>
          <h2 style={{ marginTop: 0 }}>{currentDef.title}</h2>
          <p style={{ marginTop: 0, fontSize: 14 }}>{currentDef.description}</p>
          <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
            <button onClick={() => { goPrev(); }} disabled={current.isFirst}>Back</button>
            <button onClick={() => { markComplete(); if (!current.isLast) goNext(); }}>
              {current.isLast ? 'Finish' : completed.has(current.id) ? 'Next' : 'Complete & Next'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
