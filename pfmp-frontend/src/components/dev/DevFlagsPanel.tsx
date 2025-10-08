import { useState } from 'react';
import { useFeatureFlags, updateFlags, getFeatureFlags, type FeatureFlagsState } from '../../flags/featureFlags';

export function DevFlagsPanel() {
  const flags = useFeatureFlags();
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen(o => !o);

  const entries = Object.entries(flags) as [keyof FeatureFlagsState, boolean][];

  const applyFlagUpdate = <K extends keyof FeatureFlagsState>(key: K, value: FeatureFlagsState[K]) => {
    updateFlags({ [key]: value } as Pick<FeatureFlagsState, K>);
  };

  return (
    <div style={{ position: 'fixed', bottom: 8, right: 8, fontSize: 12, zIndex: 9999 }}>
      <button onClick={toggle} style={{ padding: '4px 8px', fontSize: 12 }}>
        {open ? 'Hide Flags' : 'Flags'}
      </button>
      {open && (
        <div style={{ marginTop: 8, background: '#fff', border: '1px solid #ccc', padding: 8, borderRadius: 4, boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
          <strong style={{ display: 'block', marginBottom: 4 }}>Feature Flags</strong>
          {entries.map(([k, v]) => (
            <label key={String(k)} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <input
                type="checkbox"
                checked={v}
                onChange={e => applyFlagUpdate(k, e.target.checked)}
              />
              <span>{k}</span>
            </label>
          ))}
          <button onClick={() => { updateFlags(getFeatureFlags()); }} style={{ marginTop: 4, fontSize: 11 }}>Refresh</button>
        </div>
      )}
    </div>
  );
}
