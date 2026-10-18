import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Lock, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const ForcePasswordChangeModal = () => {
  const { currentUser, changePassword, showToast } = useApp();
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!currentUser || !currentUser.mustChangePassword) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (newPwd.length < 8) {
      setErrorMsg('New password must be at least 8 characters long.');
      return;
    }

    if (newPwd !== confirmPwd) {
      setErrorMsg('New password and confirmation do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword(currentPwd, newPwd);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      style={{
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div
        className="modal-dialog"
        style={{
          maxWidth: '460px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
          border: '1px solid var(--border-strong)',
        }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: 'var(--tint-amber)',
                color: 'var(--accent-amber)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldAlert size={16} />
            </div>
            <span style={{ fontWeight: 600, fontSize: '15px' }}>Initial Password Change Required</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.45' }}>
              Welcome to the CMS Platform, <strong>@{currentUser.username}</strong>! For security compliance, you must set a new personal password before accessing operational features.
            </p>

            {errorMsg && (
              <div
                style={{
                  background: 'var(--tint-rose)',
                  border: '1px solid rgba(255, 69, 58, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px',
                  color: 'var(--accent-rose)',
                  fontSize: '12.5px',
                  marginBottom: '14px',
                }}
              >
                {errorMsg}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Current / Temporary Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter current password (e.g. admin123)..."
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">New Secure Password (min 8 characters)</label>
              <input
                type="password"
                className="form-input"
                placeholder="Create a strong password..."
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Re-enter new password..."
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating & Hashing Password...' : 'Save Password & Unlock Platform'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
