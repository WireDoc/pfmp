import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import schedulerService, {
  type SchedulerJobsResponse,
  type QueueStatsResponse,
  type JobHistoryResponse,
  type RecurringJobInfo,
} from '../../services/schedulerService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

/**
 * SchedulerAdminView - Admin page for managing Hangfire background jobs
 * Wave 10: Background Jobs & Automation - Phase 4
 */
export const SchedulerAdminView: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [jobs, setJobs] = useState<SchedulerJobsResponse | null>(null);
  const [queueStats, setQueueStats] = useState<QueueStatsResponse | null>(null);
  const [history, setHistory] = useState<JobHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [triggeringJob, setTriggeringJob] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [jobsData, queueData, historyData] = await Promise.all([
        schedulerService.getRecurringJobs(),
        schedulerService.getQueueStats(),
        schedulerService.getJobHistory(20),
      ]);
      setJobs(jobsData);
      setQueueStats(queueData);
      setHistory(historyData);
    } catch (err) {
      console.error('Failed to fetch scheduler data:', err);
      setError('Failed to load scheduler data. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTriggerJob = async (jobId: string) => {
    setTriggeringJob(jobId);
    try {
      const result = await schedulerService.triggerJob(jobId);
      setSnackbar({
        open: true,
        message: result.message,
        severity: result.success ? 'success' : 'error',
      });
      // Refresh data after triggering
      setTimeout(fetchData, 1000);
    } catch (err) {
      setSnackbar({
        open: true,
        message: `Failed to trigger job: ${err}`,
        severity: 'error',
      });
    } finally {
      setTriggeringJob(null);
    }
  };

  const handleTriggerPriceRefresh = async () => {
    setTriggeringJob('price-refresh');
    try {
      const result = await schedulerService.triggerPriceRefresh();
      setSnackbar({
        open: true,
        message: result.message,
        severity: result.success ? 'success' : 'error',
      });
      setTimeout(fetchData, 1000);
    } catch (err) {
      setSnackbar({
        open: true,
        message: `Failed to trigger price refresh: ${err}`,
        severity: 'error',
      });
    } finally {
      setTriggeringJob(null);
    }
  };

  const handleTriggerSnapshot = async () => {
    setTriggeringJob('snapshot');
    try {
      const result = await schedulerService.triggerNetWorthSnapshot();
      setSnackbar({
        open: true,
        message: result.message,
        severity: result.success ? 'success' : 'error',
      });
      setTimeout(fetchData, 1000);
    } catch (err) {
      setSnackbar({
        open: true,
        message: `Failed to trigger snapshot: ${err}`,
        severity: 'error',
      });
    } finally {
      setTriggeringJob(null);
    }
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const formatDuration = (duration: string | undefined) => {
    if (!duration) return '—';
    // Parse TimeSpan format (e.g., "00:00:01.234")
    const match = duration.match(/(\d+):(\d+):(\d+)\.?(\d*)/);
    if (!match) return duration;
    const [, hours, minutes, seconds, ms] = match;
    if (parseInt(hours) > 0) return `${hours}h ${minutes}m`;
    if (parseInt(minutes) > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}.${(ms || '0').slice(0, 2)}s`;
  };

  const getJobStateChip = (state: string | null) => {
    switch (state) {
      case 'Succeeded':
        return <Chip size="small" color="success" icon={<CheckCircleIcon />} label="Succeeded" />;
      case 'Failed':
        return <Chip size="small" color="error" icon={<ErrorIcon />} label="Failed" />;
      case 'Processing':
        return <Chip size="small" color="info" icon={<HourglassEmptyIcon />} label="Processing" />;
      case 'Enqueued':
        return <Chip size="small" color="warning" label="Enqueued" />;
      default:
        return <Chip size="small" variant="outlined" label={state || 'Never run'} />;
    }
  };

  const getCronDescription = (cron: string): string => {
    // Simple cron to human-readable (basic cases)
    if (cron === '0 23 * * *') return 'Daily at 11:00 PM';
    if (cron === '30 23 * * *') return 'Daily at 11:30 PM';
    if (cron === '0 0 * * *') return 'Daily at midnight';
    if (cron === '0 * * * *') return 'Every hour';
    return cron;
  };

  // Stats cards component
  const StatsCards = () => {
    if (!queueStats) return null;
    const { statistics: stats } = queueStats;

    return (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
              <Typography variant="h4" color="primary">{stats.servers}</Typography>
              <Typography variant="caption" color="text.secondary">Servers</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
              <Typography variant="h4" color="info.main">{stats.recurring}</Typography>
              <Typography variant="caption" color="text.secondary">Recurring</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
              <Typography variant="h4" color="warning.main">{stats.enqueued}</Typography>
              <Typography variant="caption" color="text.secondary">Enqueued</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
              <Typography variant="h4" color="info.main">{stats.processing}</Typography>
              <Typography variant="caption" color="text.secondary">Processing</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
              <Typography variant="h4" color="success.main">{stats.succeeded}</Typography>
              <Typography variant="caption" color="text.secondary">Succeeded</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
              <Typography variant="h4" color="error.main">{stats.failed}</Typography>
              <Typography variant="caption" color="text.secondary">Failed</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  // Recurring jobs table
  const RecurringJobsTable = () => (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Job ID</TableCell>
            <TableCell>Schedule</TableCell>
            <TableCell>Queue</TableCell>
            <TableCell>Last Run</TableCell>
            <TableCell>Last Status</TableCell>
            <TableCell>Next Run</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {jobs?.jobs.map((job: RecurringJobInfo) => (
            <TableRow key={job.id} hover>
              <TableCell>
                <Typography variant="body2" fontWeight={500}>{job.id}</Typography>
              </TableCell>
              <TableCell>
                <Tooltip title={job.cron}>
                  <Typography variant="body2">{getCronDescription(job.cron)}</Typography>
                </Tooltip>
              </TableCell>
              <TableCell>
                <Chip size="small" variant="outlined" label={job.queue} />
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {formatDateTime(job.lastExecution)}
                </Typography>
              </TableCell>
              <TableCell>{getJobStateChip(job.lastJobState)}</TableCell>
              <TableCell>
                <Typography variant="body2">
                  {formatDateTime(job.nextExecution)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Run Now">
                  <span>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleTriggerJob(job.id)}
                      disabled={triggeringJob === job.id}
                    >
                      {triggeringJob === job.id ? (
                        <CircularProgress size={20} />
                      ) : (
                        <PlayArrowIcon />
                      )}
                    </IconButton>
                  </span>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
          {(!jobs || jobs.jobs.length === 0) && (
            <TableRow>
              <TableCell colSpan={7} align="center">
                <Typography color="text.secondary" sx={{ py: 2 }}>
                  No recurring jobs configured
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // Job history table
  const JobHistoryTable = () => (
    <Box>
      {history?.processing && history.processing.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom color="info.main">
            Currently Processing
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Job ID</TableCell>
                  <TableCell>Job Type</TableCell>
                  <TableCell>Started At</TableCell>
                  <TableCell>Server</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.processing.map((job) => (
                  <TableRow key={job.jobId}>
                    <TableCell><code>{job.jobId}</code></TableCell>
                    <TableCell>{job.jobName}</TableCell>
                    <TableCell>{formatDateTime(job.startedAt ?? null)}</TableCell>
                    <TableCell>
                      <Typography variant="caption">{job.serverId}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      <Typography variant="subtitle2" gutterBottom>Recent Completed Jobs</Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Job ID</TableCell>
              <TableCell>Job Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Completed At</TableCell>
              <TableCell>Duration</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {history?.succeeded.map((job) => (
              <TableRow key={job.jobId}>
                <TableCell><code>{job.jobId}</code></TableCell>
                <TableCell>{job.jobName}</TableCell>
                <TableCell>{getJobStateChip('Succeeded')}</TableCell>
                <TableCell>{formatDateTime(job.succeededAt ?? null)}</TableCell>
                <TableCell>{formatDuration(job.duration)}</TableCell>
              </TableRow>
            ))}
            {(!history || history.succeeded.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    No completed jobs yet
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {history?.failed && history.failed.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom color="error">Failed Jobs</Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Job ID</TableCell>
                  <TableCell>Job Type</TableCell>
                  <TableCell>Failed At</TableCell>
                  <TableCell>Error</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.failed.map((job) => (
                  <TableRow key={job.jobId}>
                    <TableCell><code>{job.jobId}</code></TableCell>
                    <TableCell>{job.jobName}</TableCell>
                    <TableCell>{formatDateTime(job.failedAt ?? null)}</TableCell>
                    <TableCell>
                      <Tooltip title={job.exceptionMessage || ''}>
                        <Typography variant="body2" color="error" noWrap sx={{ maxWidth: 300 }}>
                          {job.exceptionType}: {job.exceptionMessage?.slice(0, 50)}...
                        </Typography>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );

  // Queue stats table
  const QueueStatsTable = () => (
    <Box>
      <Typography variant="subtitle2" gutterBottom>Queue Status</Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Queue Name</TableCell>
              <TableCell align="right">Pending Jobs</TableCell>
              <TableCell align="right">Fetched</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {queueStats?.queues.map((queue) => (
              <TableRow key={queue.name}>
                <TableCell>
                  <Chip size="small" label={queue.name} variant="outlined" />
                </TableCell>
                <TableCell align="right">
                  <Typography 
                    color={queue.length > 0 ? 'warning.main' : 'text.secondary'}
                    fontWeight={queue.length > 0 ? 600 : 400}
                  >
                    {queue.length}
                  </Typography>
                </TableCell>
                <TableCell align="right">{queue.fetched}</TableCell>
              </TableRow>
            ))}
            {(!queueStats || queueStats.queues.length === 0) && (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    No queues available
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4">
            <ScheduleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Scheduler Admin
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage background jobs and view execution history
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<OpenInNewIcon />}
            href="/hangfire"
            target="_blank"
          >
            Hangfire Dashboard
          </Button>
            <Tooltip title="Refresh data">
              <span>
                <IconButton onClick={fetchData} disabled={loading}>
                  {loading ? <CircularProgress size={24} /> : <RefreshIcon />}
                </IconButton>
              </span>
            </Tooltip>
        </Box>
      </Box>

      {/* Error state */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading state */}
      {loading && !jobs && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      )}

      {/* Content */}
      {!loading || jobs ? (
        <>
          {/* Stats Cards */}
          <StatsCards />

          {/* Quick Actions */}
          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>Quick Actions</Typography>
            <Box display="flex" gap={2} flexWrap="wrap">
              <Button
                variant="contained"
                startIcon={triggeringJob === 'price-refresh' ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
                onClick={handleTriggerPriceRefresh}
                disabled={!!triggeringJob}
              >
                Run Price Refresh
              </Button>
              <Button
                variant="contained"
                color="secondary"
                startIcon={triggeringJob === 'snapshot' ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
                onClick={handleTriggerSnapshot}
                disabled={!!triggeringJob}
              >
                Run Net Worth Snapshot
              </Button>
            </Box>
          </Paper>

          <Divider sx={{ my: 3 }} />

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
              <Tab label="Recurring Jobs" />
              <Tab label="Job History" />
              <Tab label="Queues" />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <RecurringJobsTable />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <JobHistoryTable />
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <QueueStatsTable />
          </TabPanel>
        </>
      ) : null}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity={snackbar.severity} 
          variant="filled" 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SchedulerAdminView;
