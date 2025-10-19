import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileStepLayout from '../onboarding/components/ProfileStepLayout';
import { resolveStepConfig } from '../onboarding/stepRegistry';
import { useOnboarding } from '../onboarding/useOnboarding';
import type { FinancialProfileSectionStatusValue } from '../services/financialProfileApi';
import { buildRoute } from '../routes/routeDefs';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { steps, current, goNext, goPrev, goToStep, updateStatus, statuses, progressPercent, hydrated, userId } = useOnboarding();

  const resolvedSteps = useMemo(() => steps.map((step) => resolveStepConfig(step.id)), [steps]);
  const currentConfig = resolvedSteps[current.index];

  const dataSteps = useMemo(() => resolvedSteps.filter((step) => step.id !== 'review'), [resolvedSteps]);
  const outstandingDataCount = useMemo(
    () => dataSteps.filter((step) => statuses[step.id] === 'needs_info').length,
    [dataSteps, statuses],
  );
  const reviewStatus = statuses.review ?? 'needs_info';
  const canFinalize = outstandingDataCount === 0;

  const handleStatusChange = (status: FinancialProfileSectionStatusValue) => {
    updateStatus(current.id, status);
    if ((status === 'completed' || status === 'opted_out') && !current.isLast) {
      goNext();
    }
  };

  const handleFinalize = () => {
    updateStatus('review', 'completed');
    navigate(buildRoute('root'));
  };

  if (!hydrated) {
    return (
      <div style={{ width: '100%', margin: '64px 0', padding: '0 16px', textAlign: 'center' }}>
        <h1 style={{ marginBottom: 12 }}>Building your onboarding workspace…</h1>
        <p style={{ color: '#546e7a', fontSize: 15 }}>
          We’re loading your existing financial profile so you can pick up where you left off.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
          <div
            className="pfmp-progress"
            style={{ width: 320, height: 6, borderRadius: 4, background: '#e0e0e0', overflow: 'hidden' }}
          >
            <div style={{ width: '60%', height: '100%', background: '#1976d2', animation: 'pfmp-stripes 1.2s linear infinite' }} />
          </div>
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

  const renderNode = currentConfig.render({
    userId,
    currentStatus: statuses[current.id] ?? 'needs_info',
    onStatusChange: handleStatusChange,
    statuses,
    steps: resolvedSteps,
    canFinalize,
    reviewStatus,
    onFinalize: handleFinalize,
    onSelectStep: goToStep,
  });

  return (
    <ProfileStepLayout
      title="Tell us about your finances"
      description="This secure checklist mirrors what a private banker would capture on day one. Complete each section to unlock tailored insights and your daily financial briefing."
      steps={resolvedSteps}
      statuses={statuses}
      currentIndex={current.index}
      progressPercent={progressPercent}
      onGoNext={goNext}
      onGoPrev={goPrev}
  onSelectStep={goToStep}
      isFirstStep={current.isFirst}
      isLastStep={current.isLast}
    >
      {renderNode}
    </ProfileStepLayout>
  );
}
