/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useDispatch } from "react-redux";
import {
  Card,
  CardContent,
  Typography,
  IconButton,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Switch,
  Button,
} from "@mui/material";
import { Delete, Visibility, VisibilityOff } from "@mui/icons-material";
import type { AppDispatch } from "../../store";
import { deleteRole, addMetrics, removeMetric } from "../../store/roleSlice";
import type { Role } from "../../types/role.types";
import { AVAILABLE_METRICS } from "../../utils/constants";

interface RoleCardProps {
  role: Role;
  loading: boolean;
}

export default function RoleCard({ role, loading }: RoleCardProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Create a map of metric visibility
  const metricVisibilityMap = new Map(
    role.metrics.map((m) => [m.metric_name, m.is_visible]),
  );

  const handleToggleVisibility = async (
    metricName: string,
    currentlyVisible: boolean,
  ) => {
    try {
      if (currentlyVisible) {
        // Remove metric (set is_visible to false)
        await dispatch(removeMetric({ role: role.role, metricName })).unwrap();
      } else {
        // Add metric (set is_visible to true)
        await dispatch(
          addMetrics({ role: role.role, metrics: [metricName] }),
        ).unwrap();
      }
    } catch (error: any) {
      console.error("Failed to toggle metric visibility:", error);
    }
  };

  const handleDeleteRole = async () => {
    try {
      await dispatch(deleteRole(role.role)).unwrap();
      setShowDeleteDialog(false);
    } catch (error: any) {
      console.error("Failed to delete role:", error);
    }
  };

  // Count visible metrics
  const visibleCount = role.metrics.filter((m) => m.is_visible).length;

  return (
    <>
      <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <CardContent sx={{ flexGrow: 1 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              mb: 2,
            }}
          >
            <Box>
              <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                {role.role}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {visibleCount} of {AVAILABLE_METRICS.length} metrics visible
              </Typography>
            </Box>
            <IconButton
              size="small"
              color="error"
              onClick={() => setShowDeleteDialog(true)}
              disabled={loading}
              title="Delete role"
            >
              <Delete />
            </IconButton>
          </Box>

          <Stack spacing={1}>
            {AVAILABLE_METRICS.map((metricName) => {
              const isVisible = metricVisibilityMap.get(metricName) ?? false;

              return (
                <Box
                  key={metricName}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 1,
                    borderRadius: 1,
                    bgcolor: isVisible ? "action.selected" : "action.hover",
                    border: 1,
                    borderColor: isVisible ? "primary.main" : "divider",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {isVisible ? (
                      <Visibility fontSize="small" color="primary" />
                    ) : (
                      <VisibilityOff fontSize="small" color="disabled" />
                    )}
                    <Typography
                      variant="body2"
                      sx={{
                        color: isVisible ? "text.primary" : "text.secondary",
                        fontWeight: isVisible ? 500 : 400,
                      }}
                    >
                      {metricName}
                    </Typography>
                  </Box>
                  <Switch
                    checked={isVisible}
                    onChange={() =>
                      handleToggleVisibility(metricName, isVisible)
                    }
                    disabled={loading}
                    size="small"
                  />
                </Box>
              );
            })}
          </Stack>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the role "{role.role}"? This action
            cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteRole}
            color="error"
            variant="contained"
            disabled={loading}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
