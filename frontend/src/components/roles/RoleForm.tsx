import { useState, type FormEvent } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  Box,
  Typography,
  useMediaQuery,
  useTheme,
  FormControlLabel,
  Checkbox,
  Stack,
} from '@mui/material';
import { Close, Visibility, VisibilityOff } from '@mui/icons-material';
import type { CreateRoleData } from '../../types/role.types';
import { AVAILABLE_METRICS } from '../../utils/constants';

interface RoleFormProps {
  onSubmit: (roleData: CreateRoleData) => Promise<void>;
  onCancel: () => void;
}

/**
 * RoleForm component - Form for creating new roles
 * Features:
 * - Role name input
 * - Checkboxes for each metric to set visibility
 * - Validation (min 1 metric must be visible)
 */
export default function RoleForm({ onSubmit, onCancel }: RoleFormProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  
  const [roleName, setRoleName] = useState('');
  const [visibleMetrics, setVisibleMetrics] = useState<string[]>([]);
  const [errors, setErrors] = useState<{
    role?: string;
    metrics?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Toggle metric visibility
   */
  const handleToggleMetric = (metric: string) => {
    setVisibleMetrics(prev => {
      if (prev.includes(metric)) {
        return prev.filter(m => m !== metric);
      } else {
        return [...prev, metric];
      }
    });
    
    // Clear errors when user makes changes
    if (errors.metrics) {
      setErrors((prev) => ({ ...prev, metrics: undefined }));
    }
  };

  /**
   * Validate form fields
   */
  const validateForm = (): boolean => {
    const newErrors: { role?: string; metrics?: string } = {};

    if (!roleName.trim()) {
      newErrors.role = 'Role name is required';
    }

    if (visibleMetrics.length === 0) {
      newErrors.metrics = 'At least one metric must be visible';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Send only the visible metrics - backend will create all metrics but set is_visible accordingly
      await onSubmit({
        role: roleName.trim(),
        metrics: visibleMetrics,
      });
      // Form will be closed by parent component on success
    } catch (error) {
      // Error handling is done by parent component
      console.error('Failed to create role:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={true}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
      fullScreen={fullScreen}
      PaperProps={{
        sx: {
          borderRadius: fullScreen ? 0 : 2,
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
          Create New Role
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onCancel}
          sx={{
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              fullWidth
              label="Role Name"
              value={roleName}
              onChange={(e) => {
                setRoleName(e.target.value);
                if (errors.role) {
                  setErrors((prev) => ({ ...prev, role: undefined }));
                }
              }}
              error={!!errors.role}
              helperText={errors.role || 'e.g., Finance, Operations, Marketing'}
              disabled={isSubmitting}
              autoFocus
              required
            />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                Metric Visibility
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Select which metrics this role can see
              </Typography>
              
              <Stack spacing={1}>
                {AVAILABLE_METRICS.map((metric) => {
                  const isChecked = visibleMetrics.includes(metric);
                  
                  return (
                    <Box
                      key={metric}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        p: 1,
                        borderRadius: 1,
                        bgcolor: isChecked ? 'action.selected' : 'action.hover',
                        border: 1,
                        borderColor: isChecked ? 'primary.main' : 'divider',
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: isChecked ? 'action.selected' : 'action.focus',
                        },
                      }}
                      onClick={() => !isSubmitting && handleToggleMetric(metric)}
                    >
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={isChecked}
                            disabled={isSubmitting}
                            icon={<VisibilityOff />}
                            checkedIcon={<Visibility />}
                          />
                        }
                        label={
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: isChecked ? 500 : 400,
                            }}
                          >
                            {metric}
                          </Typography>
                        }
                        sx={{ flex: 1, m: 0 }}
                      />
                    </Box>
                  );
                })}
              </Stack>
              
              {errors.metrics && (
                <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                  {errors.metrics}
                </Typography>
              )}
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={onCancel}
            disabled={isSubmitting}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Role'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
