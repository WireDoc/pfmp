import { useMemo } from 'react';
import type { ReactNode } from 'react';
import type { FinancialProfileSectionStatusValue } from '../../services/financialProfileApi';
import type { OnboardingStepRegistryEntry } from '../stepRegistry';
import type { OnboardingStepId } from '../steps';

function formatStatus(status: FinancialProfileSectionStatusValue): string {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'opted_out':
      return 'Opted Out';
    default:
      return 'Needs Info';
  }
}

function statusTone(status: FinancialProfileSectionStatusValue) {
  switch (status) {
    case 'completed':
      return { background: '#e6f4ea', color: '#0f9d58' };
    case 'opted_out':
      return { background: '#efebe9', color: '#6d4c41' };
    default:
      return { background: '#e3f2fd', color: '#1565c0' };
  }
}

interface ProfileStepLayoutProps {
  steps: OnboardingStepRegistryEntry[];
  statuses: Record<OnboardingStepId, FinancialProfileSectionStatusValue>;
  currentIndex: number;
  progressPercent: number;
  onGoNext: () => void;
  onGoPrev: () => void;
  onSelectStep?: (id: OnboardingStepId) => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  title: string;
  description: string;
  children: ReactNode;
  reviewStepId?: OnboardingStepId;
}

export function ProfileStepLayout({
  steps,
  statuses,
  currentIndex,
  progressPercent,
  onGoNext,
  onGoPrev,
  onSelectStep,
  isFirstStep,
  isLastStep,
  title,
  description,
  children,
  reviewStepId = 'review',
}: ProfileStepLayoutProps) {
  const current = steps[currentIndex];
  const currentStatus: FinancialProfileSectionStatusValue = statuses[current.id] ?? 'needs_info';
  const isReviewStep = current.id === reviewStepId;

  const outstandingTotal = useMemo(() => {
    let outstanding = 0;
    steps.forEach((step) => {
      if ((statuses[step.id] ?? 'needs_info') === 'needs_info') {
        outstanding += 1;
      }
    });
    return outstanding;
  }, [steps, statuses]);

  const sectionPosition = `${currentIndex + 1} of ${steps.length}`;
  const allowStepSelection = Boolean(onSelectStep) && isReviewStep;

  return (
    <div style={{ maxWidth: 960, margin: '32px auto', padding: '0 24px 64px' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 600 }}>{title}</h1>
        <p style={{ marginTop: 8, fontSize: 16, color: '#546e7a' }}>{description}</p>
      </header>

      <div
        style={{
          background: '#f1f7fe',
          borderRadius: 12,
          padding: '12px 16px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div style={{ flex: 1 }}>
          <strong style={{ display: 'block', fontSize: 15 }}>Progress</strong>
          <span style={{ fontSize: 13, color: '#44607a' }}>
            {Math.round(progressPercent)}% complete · {outstandingTotal} section{outstandingTotal === 1 ? '' : 's'} remaining
          </span>
        </div>
        <div style={{ flex: 2 }}>
          <div style={{ position: 'relative', height: 8, background: '#d0e2ff', borderRadius: 999 }}>
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                borderRadius: 999,
                background: '#1565c0',
                width: `${progressPercent}%`,
                transition: 'width 200ms ease',
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24, alignItems: 'flex-start' }}>
        <aside style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 12, padding: 16 }}>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {steps.map((step, index) => {
              const status = statuses[step.id] ?? 'needs_info';
              const active = index === currentIndex;
              const tone = statusTone(status);
              const dotColor = status === 'needs_info' ? '#b0bec5' : tone.color;
              const selectionEnabled = allowStepSelection && !active;

              return (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectionEnabled) {
                        onSelectStep?.(step.id);
                      }
                    }}
                    aria-disabled={!selectionEnabled}
                    tabIndex={selectionEnabled ? 0 : -1}
                    style={{
                      width: '100%',
                      display: 'flex',
                      gap: 12,
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: active ? '#e8f2ff' : '#fafafa',
                      border: active ? '1px solid #bbdefb' : '1px solid #e5e8eb',
                      cursor: selectionEnabled ? 'pointer' : 'default',
                      textAlign: 'left',
                      color: 'inherit',
                      font: 'inherit',
                      opacity: selectionEnabled ? 1 : 0.94,
                    }}
                  >
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 600,
                        color: status === 'needs_info' ? '#546e7a' : '#fff',
                        background: dotColor,
                      }}
                    >
                      {index + 1}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{step.title}</div>
                      <div style={{ fontSize: 12, color: '#607d8b', lineHeight: 1.4 }}>{step.description}</div>
                      <span
                        style={{
                          marginTop: 6,
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 600,
                          background: tone.background,
                          color: tone.color,
                          letterSpacing: 0.4,
                        }}
                      >
                        {formatStatus(status)}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        <section
          style={{
            background: '#fff',
            borderRadius: 12,
            border: '1px solid #e0e0e0',
            padding: '32px 36px',
            minHeight: 420,
            boxShadow: '0 12px 32px rgba(15, 76, 129, 0.08)',
          }}
        >
          <span
            style={{
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: 1,
              fontWeight: 700,
              color: '#1565c0',
              display: 'inline-block',
              marginBottom: 12,
            }}
          >
            Section {sectionPosition}
          </span>
          <h2 style={{ margin: '0 0 12px', fontSize: 28, fontWeight: 600 }}>{current.title}</h2>
          <p style={{ margin: 0, fontSize: 16, color: '#455a64', lineHeight: 1.6 }}>{current.description}</p>
          <p style={{ marginTop: 18, fontSize: 13, color: '#607d8b' }}>
            Status: <strong>{formatStatus(currentStatus)}</strong>
          </p>

          <div style={{ marginTop: 28 }}>{children}</div>

          <div style={{ marginTop: 32, display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={onGoPrev}
              disabled={isFirstStep}
              style={{
                padding: '10px 22px',
                borderRadius: 999,
                border: '1px solid #bbdefb',
                background: '#fff',
                color: '#1565c0',
                fontWeight: 600,
                cursor: isFirstStep ? 'not-allowed' : 'pointer',
              }}
            >
              Back
            </button>
            {!isReviewStep && (
              <button
                type="button"
                onClick={onGoNext}
                disabled={isLastStep}
                style={{
                  padding: '10px 24px',
                  borderRadius: 999,
                  border: 'none',
                  background: '#1565c0',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: isLastStep ? 'not-allowed' : 'pointer',
                  boxShadow: '0 8px 20px rgba(21, 101, 192, 0.2)',
                }}
              >
                Next section
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default ProfileStepLayout;
