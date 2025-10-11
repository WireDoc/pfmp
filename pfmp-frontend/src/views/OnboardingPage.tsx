import { useOnboarding } from '../onboarding/useOnboarding';
import { useMemo } from 'react';
import HouseholdSectionForm from '../onboarding/sections/HouseholdSectionForm';
import RiskGoalsSectionForm from '../onboarding/sections/RiskGoalsSectionForm';
import TspSectionForm from '../onboarding/sections/TspSectionForm';
import CashAccountsSectionForm from '../onboarding/sections/CashAccountsSectionForm';
import InvestmentAccountsSectionForm from '../onboarding/sections/InvestmentAccountsSectionForm';
import type { FinancialProfileSectionStatusValue } from '../services/financialProfileApi';

function formatStatus(status: string): string {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'opted_out':
      return 'Opted Out';
    default:
      return 'Needs Info';
  }
}

export default function OnboardingPage() {
  const { steps, current, goNext, goPrev, updateStatus, statuses, progressPercent, hydrated, userId } = useOnboarding();

  const currentDef = steps[current.index];
  const currentStatus = statuses[current.id] ?? 'needs_info';

  const outstandingCount = useMemo(() => steps.filter(step => statuses[step.id] === 'needs_info').length, [steps, statuses]);

  const handleStatusChange = (status: FinancialProfileSectionStatusValue) => {
    updateStatus(current.id, status);
    if ((status === 'completed' || status === 'opted_out') && !current.isLast) {
      goNext();
    }
  };

  if (!hydrated) {
    return (
      <div style={{ maxWidth: 720, margin: '64px auto', padding: '0 16px', textAlign: 'center' }}>
        <h1 style={{ marginBottom: 12 }}>Building your onboarding workspace…</h1>
        <p style={{ color: '#546e7a', fontSize: 15 }}>We’re loading your existing financial profile so you can pick up where you left off.</p>
        <div className="pfmp-progress" style={{ margin: '32px auto', width: 320, height: 6, borderRadius: 4, background: '#e0e0e0', overflow: 'hidden' }}>
          <div style={{ width: '60%', height: '100%', background: '#1976d2', animation: 'pfmp-stripes 1.2s linear infinite' }} />
        </div>
        <style>{`
          @keyframes pfmp-stripes {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: '32px auto', padding: '0 24px 64px' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 600 }}>Tell us about your finances</h1>
        <p style={{ marginTop: 8, fontSize: 16, color: '#546e7a' }}>
          This secure checklist mirrors what a private banker would capture on day one. Complete each
          section to unlock tailored insights and your daily financial briefing.
        </p>
      </header>

      <div style={{ background: '#f1f7fe', borderRadius: 12, padding: '12px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <strong style={{ display: 'block', fontSize: 15 }}>Progress</strong>
          <span style={{ fontSize: 13, color: '#44607a' }}>{Math.round(progressPercent)}% complete · {outstandingCount} section{outstandingCount === 1 ? '' : 's'} remaining</span>
        </div>
        <div style={{ flex: 2 }}>
          <div style={{ position: 'relative', height: 8, background: '#d0e2ff', borderRadius: 999 }}>
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 999, background: '#1565c0', width: `${progressPercent}%`, transition: 'width 200ms ease' }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24, alignItems: 'flex-start' }}>
        <aside style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 12, padding: 16 }}>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {steps.map((step, index) => {
              const status = statuses[step.id] ?? 'needs_info';
              const active = index === current.index;
              const tone = status === 'completed' ? '#0f9d58' : status === 'opted_out' ? '#6d4c41' : '#1976d2';
              const dotColor = status === 'needs_info' ? '#b0bec5' : tone;
              return (
                <li key={step.id} style={{ display: 'flex', gap: 12, padding: '10px 12px', borderRadius: 10, background: active ? '#e8f2ff' : '#fafafa', border: active ? '1px solid #bbdefb' : '1px solid #e5e8eb' }}>
                  <span style={{ width: 22, height: 22, borderRadius: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: status === 'needs_info' ? '#546e7a' : '#fff', background: dotColor }}>{index + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{step.title}</div>
                    <div style={{ fontSize: 12, color: '#607d8b', lineHeight: 1.4 }}>{step.description}</div>
                    <span style={{ marginTop: 6, display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: status === 'completed' ? '#e6f4ea' : status === 'opted_out' ? '#efebe9' : '#e3f2fd', color: tone }}>
                      {formatStatus(status)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </aside>

        <section style={{ background: '#fff', borderRadius: 12, border: '1px solid #e0e0e0', padding: '32px 36px', minHeight: 420, boxShadow: '0 12px 32px rgba(15, 76, 129, 0.08)' }}>
          <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, color: '#1565c0', display: 'inline-block', marginBottom: 12 }}>Section {current.index + 1} of {steps.length}</span>
          <h2 style={{ margin: '0 0 12px', fontSize: 28, fontWeight: 600 }}>{currentDef.title}</h2>
          <p style={{ margin: 0, fontSize: 16, color: '#455a64', lineHeight: 1.6 }}>{currentDef.description}</p>
          <p style={{ marginTop: 18, fontSize: 13, color: '#607d8b' }}>Status: <strong>{formatStatus(currentStatus)}</strong></p>

          <div style={{ marginTop: 28 }}>
            {(() => {
              switch (current.id) {
                case 'household':
                  return (
                    <HouseholdSectionForm
                      userId={userId}
                      currentStatus={currentStatus}
                      onStatusChange={handleStatusChange}
                    />
                  );
                case 'risk-goals':
                  return (
                    <RiskGoalsSectionForm
                      userId={userId}
                      currentStatus={currentStatus}
                      onStatusChange={handleStatusChange}
                    />
                  );
                case 'tsp':
                  return (
                    <TspSectionForm
                      userId={userId}
                      currentStatus={currentStatus}
                      onStatusChange={handleStatusChange}
                    />
                  );
                case 'cash':
                  return (
                    <CashAccountsSectionForm
                      userId={userId}
                      currentStatus={currentStatus}
                      onStatusChange={handleStatusChange}
                    />
                  );
                case 'investments':
                  return (
                    <InvestmentAccountsSectionForm
                      userId={userId}
                      currentStatus={currentStatus}
                      onStatusChange={handleStatusChange}
                    />
                  );
                default:
                  return (
                    <div style={{ padding: '24px 20px', borderRadius: 12, border: '1px dashed #b0bec5', background: '#fafcff' }}>
                      <p style={{ margin: 0, color: '#607d8b', fontSize: 15 }}>
                        We’re building this section’s guided form next. In the meantime, please continue with the sections above.
                      </p>
                    </div>
                  );
              }
            })()}
          </div>

          <div style={{ marginTop: 32, display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={() => goPrev()}
              disabled={current.isFirst}
              style={{ padding: '10px 22px', borderRadius: 999, border: '1px solid #bbdefb', background: '#fff', color: '#1565c0', fontWeight: 600, cursor: current.isFirst ? 'not-allowed' : 'pointer' }}
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                if (!current.isLast) {
                  goNext();
                }
              }}
              style={{ padding: '10px 24px', borderRadius: 999, border: 'none', background: '#1565c0', color: '#fff', fontWeight: 600, cursor: 'pointer', boxShadow: '0 8px 20px rgba(21, 101, 192, 0.2)' }}
            >
              {current.isLast ? 'Continue to dashboard' : 'Next section'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
