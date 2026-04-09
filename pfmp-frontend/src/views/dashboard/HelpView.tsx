import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Link as MuiLink,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import InfoIcon from '@mui/icons-material/Info';
import { useDevUserId } from '../../dev/devUserState';
import { userService } from '../../services/api';

interface GettingStartedStep {
  label: string;
  description: string;
  checkFn: (user: Record<string, unknown>) => boolean;
}

const GETTING_STARTED_STEPS: GettingStartedStep[] = [
  {
    label: 'Create your account',
    description: 'Sign up and set up your initial login credentials.',
    checkFn: (u) => !!u.userId,
  },
  {
    label: 'Complete your financial profile',
    description: 'Fill in household, income, tax, expenses, and insurance details during onboarding.',
    checkFn: (u) => !!u.profileSetupComplete,
  },
  {
    label: 'Link your accounts',
    description: 'Connect bank, investment, and credit card accounts via Plaid or manual entry.',
    checkFn: (u) => Array.isArray(u.accounts) && (u.accounts as unknown[]).length > 0,
  },
  {
    label: 'Review your dashboard',
    description: 'Check net worth, account summaries, and TSP allocation on the main dashboard.',
    checkFn: () => true, // Always considered done if they can see the help page
  },
  {
    label: 'Run an AI analysis',
    description: 'Go to Insights and run a full financial analysis to get personalized advice.',
    checkFn: () => false, // Can't easily detect — leave as not-done for guidance
  },
  {
    label: 'Review and act on advice',
    description: 'Check the Actions page for alerts, AI advice, and tasks. Accept advice to create action items.',
    checkFn: () => false,
  },
];

const FAQ_ITEMS = [
  {
    question: 'How does PFMP use my financial data?',
    answer: 'Your data stays in your personal database and is used exclusively to generate AI-powered financial insights and recommendations. Data is never shared with third parties. AI analysis runs through OpenRouter with anonymized context.',
  },
  {
    question: 'How do I connect my bank accounts?',
    answer: 'Go to Settings → Connected Accounts to link accounts via Plaid. Plaid securely connects to your financial institutions using bank-level encryption. You can also manually add accounts from the Accounts page.',
  },
  {
    question: "What is the AI analysis and how accurate is it?",
    answer: "The AI analysis examines your complete financial profile — income, expenses, investments, debt, insurance, and goals — to generate personalized recommendations. Multiple AI models analyze your data independently, and an agreement score shows consensus. Higher agreement scores indicate more reliable advice.",
  },
  {
    question: 'How do I update my TSP allocation?',
    answer: 'Navigate to the TSP detail page from the dashboard or Accounts page. You can view current fund allocations, track performance history, and update contribution percentages. Price data refreshes automatically via background jobs.',
  },
  {
    question: 'What are alerts, advice, and tasks?',
    answer: 'Alerts notify you of important financial events (rebalancing needed, goal progress, etc.). AI Advice is generated from alerts and provides actionable recommendations. When you accept advice, it becomes a Task you can track to completion. View all three on the Actions page.',
  },
  {
    question: 'How do I edit my financial profile after onboarding?',
    answer: 'Go to the Profile page from the sidebar. You can edit all 8 sections (Household, Risk & Goals, Income, Tax, Expenses, Insurance, Obligations, Benefits) and save changes per section. Updates immediately affect your next AI analysis.',
  },
  {
    question: 'What notification settings are available?',
    answer: 'Visit Settings to toggle email alerts, push notifications, rebalancing alerts (with custom threshold), and tax optimization analysis. Each setting saves immediately when toggled.',
  },
  {
    question: 'How is net worth calculated?',
    answer: 'Net worth = Total Assets (investment accounts + cash accounts + TSP + property equity) minus Total Liabilities (loans, credit cards, mortgages). The dashboard tracks net worth over time with daily snapshots.',
  },
];

const KEYBOARD_SHORTCUTS = [
  { keys: 'Ctrl + K', action: 'Open command palette' },
  { keys: 'Ctrl + /', action: 'Toggle sidebar' },
  { keys: 'Esc', action: 'Close dialog / dismiss notification' },
];

/**
 * HelpView - Help & documentation page
 * Route: /dashboard/help
 */
export function HelpView() {
  const userId = useDevUserId() ?? 1;
  const [completedSteps, setCompletedSteps] = useState<boolean[]>(GETTING_STARTED_STEPS.map(() => false));

  useEffect(() => {
    let cancelled = false;
    async function checkProgress() {
      try {
        const res = await userService.getById(userId);
        if (cancelled) return;
        const user = res.data as Record<string, unknown>;
        setCompletedSteps(GETTING_STARTED_STEPS.map(step => step.checkFn(user)));
      } catch {
        // Silently fail — steps will show as incomplete
      }
    }
    checkProgress();
    return () => { cancelled = true; };
  }, [userId]);

  const completedCount = completedSteps.filter(Boolean).length;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Help & Documentation
      </Typography>

      {/* Getting Started */}
      <Paper sx={{ p: 3, mt: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <Typography variant="h6">Getting Started</Typography>
          <Chip
            label={`${completedCount}/${GETTING_STARTED_STEPS.length} complete`}
            size="small"
            color={completedCount === GETTING_STARTED_STEPS.length ? 'success' : 'default'}
          />
        </Stack>
        <List disablePadding>
          {GETTING_STARTED_STEPS.map((step, i) => (
            <ListItem key={i} sx={{ py: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {completedSteps[i]
                  ? <CheckCircleIcon color="success" fontSize="small" />
                  : <RadioButtonUncheckedIcon color="disabled" fontSize="small" />}
              </ListItemIcon>
              <ListItemText
                primary={step.label}
                secondary={step.description}
                primaryTypographyProps={{
                  sx: completedSteps[i] ? { textDecoration: 'line-through', color: 'text.secondary' } : {},
                }}
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* FAQ */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>Frequently Asked Questions</Typography>
        {FAQ_ITEMS.map((item, i) => (
          <Accordion key={i} disableGutters elevation={0} sx={{ '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">{item.question}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary">{item.answer}</Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Paper>

      {/* Keyboard Shortcuts */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>Keyboard Shortcuts</Typography>
        <List disablePadding dense>
          {KEYBOARD_SHORTCUTS.map((sc, i) => (
            <ListItem key={i}>
              <ListItemText
                primary={<><Chip label={sc.keys} size="small" variant="outlined" sx={{ fontFamily: 'monospace', mr: 2 }} /> {sc.action}</>}
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* Version & Support */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <InfoIcon color="action" fontSize="small" />
          <Typography variant="h6">About PFMP</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Version: v0.15.0-alpha
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Personal Financial Management Platform — AI-powered financial planning for government employees.
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Typography variant="body2">
          Need help? Contact support at{' '}
          <MuiLink href="mailto:support@pfmp.example.com">
            support@pfmp.example.com
          </MuiLink>
        </Typography>
      </Paper>
    </Box>
  );
}
