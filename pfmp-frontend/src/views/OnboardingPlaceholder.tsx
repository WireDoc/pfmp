import React from 'react';
import { useOnboarding } from '../onboarding/useOnboarding';

export default function OnboardingPlaceholder() {
  let info: string;
  try {
    const ob = useOnboarding();
    info = `Current step: ${ob.current.id} (${ob.current.index + 1}/${ob.steps.length})`;
  } catch {
    info = 'Onboarding context not yet mounted (provider arrives in later phase).';
  }
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1 style={{ marginTop: 0 }}>Onboarding (Wave 4 Placeholder)</h1>
      <p>The multi-step onboarding wizard will mount here in Wave 4 follow-on phases. This route proves routing skeleton.</p>
      <p style={{ fontSize: 14, opacity: 0.8 }}>{info}</p>
      <button disabled style={{ padding: '6px 14px', cursor: 'not-allowed' }}>Next (stub)</button>
    </div>
  );
}
