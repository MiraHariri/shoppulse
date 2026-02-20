import { useState } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../store';
import { updateUserRole, deleteUser } from '../../store/userSlice';
import type { User } from '../../types/user.types';
import { USER_ROLES } from '../../utils/constants';
import './UserTable.css';

interface UserTableProps {
  users: User[];
  loading: boolean;
}

/**
 * UserTable component - Displays users in table format
 * Features:
 * - Inline role editing with dropdown
 * - Delete button with confirmation dialog
 * Requirements: 9.3, 9.4
 */
export default function UserTable({ users, loading }: UserTableProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  /**
   * Start editing a user's role
   */
  const handleStartEdit = (userId: string, currentRole: string) => {
    setEditingUserId(userId);
    setSelectedRole(currentRole);
  };

  /**
   * Cancel role editing
   */
  const handleCancelEdit = () => {
    setEditingUserId(null);
    setSelectedRole('');
  };

  /**
   * Save role changes
   */
  const handleSaveRole = async (userId: string) => {
    if (selectedRole) {
      try {
        await dispatch(updateUserRole({ userId, role: selectedRole })).unwrap();
        setEditingUserId(null);
        setSelectedRole('');
      } catch (error) {
        // Error is handled by Redux
        console.error('Failed to update role:', error);
      }
    }
  };

  /**
   * Show delete confirmation dialog
   */
  const handleDeleteClick = (userId: string) => {
    setDeletingUserId(userId);
  };

  /**
   * Confirm and execute user deletion
   */
  const handleConfirmDelete = async () => {
    if (deletingUserId) {
      try {
        await dispatch(deleteUser(deletingUserId)).unwrap();
        setDeletingUserId(null);
      } catch (error) {
        // Error is handled by Redux
        console.error('Failed to delete user:', error);
      }
    }
  };

  /**
   * Cancel deletion
   */
  const handleCancelDelete = () => {
    setDeletingUserId(null);
  };

  if (users.length === 0) {
    return (
      <div className="user-table-empty">
        <p>No users found. Click "Add User" to create one.</p>
      </div>
    );
  }

  return (
    <>
      <div className="user-table-wrapper">
        <table className="user-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.user_id}>
                <td>{user.email}</td>
                <td>
                  {editingUserId === user.user_id ? (
                    <div className="role-edit-container">
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="role-select"
                        disabled={loading}
                      >
                        <option value={USER_ROLES.ADMIN}>{USER_ROLES.ADMIN}</option>
                        <option value={USER_ROLES.FINANCE}>{USER_ROLES.FINANCE}</option>
                        <option value={USER_ROLES.OPERATIONS}>{USER_ROLES.OPERATIONS}</option>
                        <option value={USER_ROLES.MARKETING}>{USER_ROLES.MARKETING}</option>
                      </select>
                      <button
                        onClick={() => handleSaveRole(user.user_id)}
                        className="btn-save"
                        disabled={loading}
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="btn-cancel"
                        disabled={loading}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="role-display">
                      <span className={`role-badge role-${user.role.toLowerCase()}`}>
                        {user.role}
                      </span>
                      <button
                        onClick={() => handleStartEdit(user.user_id, user.role)}
                        className="btn-edit-inline"
                        disabled={loading}
                        title="Edit role"
                      >
                        ✏️
                      </button>
                    </div>
                  )}
                </td>
                <td>
                  <span className={`status-badge status-${user.status}`}>
                    {user.status}
                  </span>
                </td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                  <button
                    onClick={() => handleDeleteClick(user.user_id)}
                    className="btn-delete"
                    disabled={loading}
                    title="Delete user"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Dialog */}
      {deletingUserId && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Confirm Deletion</h2>
            <p>Are you sure you want to delete this user? This action cannot be undone.</p>
            <div className="modal-actions">
              <button
                onClick={handleConfirmDelete}
                className="btn-danger"
                disabled={loading}
              >
                Delete
              </button>
              <button
                onClick={handleCancelDelete}
                className="btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
