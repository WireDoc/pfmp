import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';

interface Props {
  /**
   * Icon to display above the message
   */
  icon: SvgIconComponent;
  /**
   * Primary message (headline)
   */
  title: string;
  /**
   * Secondary message (description)
   */
  description: string;
  /**
   * Optional action button
   */
  action?: {
    label: string;
    onClick: () => void;
  };
  /**
   * Optional secondary action (link style)
   */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * EmptyState - Friendly empty state component for when no data exists
 * 
 * Displays an icon, message, and optional action buttons to guide users
 * when a section has no content (e.g., no accounts, insights, or tasks).
 */
export const EmptyState: React.FC<Props> = ({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
}) => {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      py={6}
      px={3}
      textAlign="center"
      data-testid="empty-state"
    >
      <Icon 
        sx={{ 
          fontSize: 64, 
          color: 'text.secondary',
          opacity: 0.5,
          mb: 2,
        }} 
      />
      <Typography variant="h6" gutterBottom color="text.primary">
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" maxWidth={400} mb={3}>
        {description}
      </Typography>
      {action && (
        <Button
          variant="contained"
          onClick={action.onClick}
          sx={{ mb: secondaryAction ? 1 : 0 }}
        >
          {action.label}
        </Button>
      )}
      {secondaryAction && (
        <Button
          variant="text"
          onClick={secondaryAction.onClick}
          size="small"
        >
          {secondaryAction.label}
        </Button>
      )}
    </Box>
  );
};
