import { Alert, Box, Button, Chip, Divider, Stack, Typography } from '@mui/material';
import type { FinancialProfileSectionStatusValue } from '../../services/financialProfileApi';
import type { OnboardingStepDef, OnboardingStepId } from '../steps';

function formatStatusLabel(status: FinancialProfileSectionStatusValue): string {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'opted_out':
      return 'Opted Out';
    default:
      return 'Needs Info';
  }
}

function getStatusTone(status: FinancialProfileSectionStatusValue) {
  switch (status) {
    case 'completed':
      return { bg: '#e6f4ea', color: '#0f9d58' };
    case 'opted_out':
      return { bg: '#efebe9', color: '#6d4c41' };
    default:
      return { bg: '#e3f2fd', color: '#1565c0' };
  }
}

export interface ReviewSectionPanelProps {
  steps: OnboardingStepDef[];
  statuses: Record<OnboardingStepId, FinancialProfileSectionStatusValue>;
  canFinalize: boolean;
  reviewStatus: FinancialProfileSectionStatusValue;
  onFinalize: () => void;
  onSelectStep?: (id: OnboardingStepId) => void;
}

export default function ReviewSectionPanel({ steps, statuses, canFinalize, reviewStatus, onFinalize, onSelectStep }: ReviewSectionPanelProps) {
  const outstandingSteps = steps.filter(step => statuses[step.id] === 'needs_info');
  const hasOutstanding = outstandingSteps.length > 0;

  return (
    <Stack spacing={3} sx={{ mt: 3 }}>
      <Typography variant="body1" sx={{ color: '#455a64', lineHeight: 1.6 }}>
        Everything you enter here shapes the insights on your dashboard. Double-check each section below, confirm any opt-outs, and then unlock your personalized view.
      </Typography>

      {hasOutstanding ? (
        <Alert severity="warning">
          Finish the highlighted sections before finalizing:
          <Box component="ul" sx={{ mt: 1.5, mb: 0, pl: 3 }}>
            {outstandingSteps.map(step => (
              <li key={step.id}>
                <strong>{step.title}</strong> – {step.description}
              </li>
            ))}
          </Box>
        </Alert>
      ) : (
        <Alert severity="success">
          All sections are either completed or acknowledged. Unlock your dashboard to see tailored insights.
        </Alert>
      )}

      <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
        {steps.map((step, index) => {
          const status = statuses[step.id] ?? 'needs_info';
          const tone = getStatusTone(status);
          const isLast = index === steps.length - 1;
          const clickable = Boolean(onSelectStep);
          return (
            <Box
              key={step.id}
                  role={clickable ? 'link' : undefined}
              tabIndex={clickable ? 0 : undefined}
              aria-label={clickable ? `Open step: ${step.title}` : undefined}
              onClick={clickable ? () => onSelectStep?.(step.id) : undefined}
              onKeyDown={clickable ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectStep?.(step.id);
                }
              } : undefined}
              sx={{
                px: 3,
                py: 2,
                background: index % 2 === 0 ? '#fafafa' : '#fff',
                cursor: clickable ? 'pointer' : 'default',
                '&:hover': clickable ? { background: '#f0f6ff' } : undefined,
                outline: 'none',
              }}
            >
              <Typography sx={{ fontWeight: 600, fontSize: 15, color: '#263238' }}>{step.title}</Typography>
              <Typography sx={{ fontSize: 13, color: '#607d8b', mt: 0.5 }}>{step.description}</Typography>
              <Chip
                label={formatStatusLabel(status)}
                size="small"
                sx={{
                  mt: 1.5,
                  fontWeight: 600,
                  backgroundColor: tone.bg,
                  color: tone.color,
                  '& .MuiChip-label': { letterSpacing: 0.2 },
                }}
              />
              {!isLast && <Divider sx={{ mt: 2.5 }} />}
            </Box>
          );
        })}
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
        <Button
          variant="contained"
          color="primary"
          onClick={onFinalize}
          disabled={!canFinalize || reviewStatus === 'completed'}
          data-testid="review-finalize"
          sx={{ minWidth: 220, fontWeight: 600, boxShadow: '0 8px 20px rgba(21, 101, 192, 0.18)' }}
        >
          Unlock my dashboard
        </Button>
        {!canFinalize && (
          <Typography variant="body2" sx={{ color: '#607d8b' }}>
            Complete each section above before unlocking your dashboard.
          </Typography>
        )}
        {reviewStatus === 'completed' && (
          <Typography variant="body2" sx={{ color: '#2e7d32' }}>
            Dashboard unlocked. You can revisit sections anytime from the checklist on the left.
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}
