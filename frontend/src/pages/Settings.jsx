import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ApiService } from '../services/api';
import {
  Settings as SettingsIcon,
  Sliders,
  Palette,
  Users,
  Shield,
  Info,
  Sun,
  Moon,
  Laptop,
  KeyRound,
  UserPlus,
  Edit2,
  Trash2,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  UserCheck,
  X,
  ShieldAlert,
  Server,
  Globe,
  Clock,
  Database,
  Cpu,
  Layers,
  Sparkles,
  Key,
  Search,
} from 'lucide-react';

export const Settings = () => {
  const {
    currentUser,
    themePreference,
    setThemePreference,
    effectiveTheme,
    settingsTab,
    setSettingsTab,
    usersList,
    loadUsers,
    isUsersLoading,
    createUser,
    updateUser,
    deleteUser,
    resetPassword,
    changePassword,
    showToast,
  } = useApp();

  // Guard Operators: operators must not access Settings or Preferences
  if (currentUser?.role === 'Operator') {
    return (
      <div className="panel-card" style={{ maxWidth: '600px', margin: '40px auto', textAlign: 'center', padding: '36px 24px' }}>
        <ShieldAlert size={40} color="var(--accent-rose)" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px', color: 'var(--text-primary)' }}>Access Restricted</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', lineHeight: 1.5, margin: 0 }}>
          Operator accounts do not have permission to access Platform Settings or Preferences. Please contact an Administrator.
        </p>
      </div>
    );
  }

  // Tab mapping: Top three tabs must be Security, General, About (Requirement 6)
  const mapTabId = (tab) => {
    if (tab === 'users' || tab === 'security') return 'security';
    if (tab === 'general' || tab === 'appearance' || tab === 'preferences') return 'general';
    if (tab === 'about') return 'about';
    return 'security'; // Default first tab: Security
  };

  const [activeTab, setActiveTab] = useState(() => mapTabId(settingsTab));

  useEffect(() => {
    if (settingsTab) {
      setActiveTab(mapTabId(settingsTab));
    }
  }, [settingsTab]);

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    if (setSettingsTab) setSettingsTab(tabId);
  };

  // General Preferences State
  const [defaultRegion, setDefaultRegion] = useState('reg-bayfront');
  const [timeZone, setTimeZone] = useState('America/Los_Angeles');
  const [refreshInterval, setRefreshInterval] = useState('15');
  const [autoAcknowledgeLow, setAutoAcknowledgeLow] = useState(false);

  // Appearance State
  const [displayDensity, setDisplayDensity] = useState('comfortable');
  const [highContrast, setHighContrast] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Modals for User Management
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // User Form State
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState('Operator');
  const [newPassword, setNewPassword] = useState('');
  const [userError, setUserError] = useState('');

  // Edit User Form State (including in-place Password Change: Requirement 9.1)
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editRole, setEditRole] = useState('Operator');
  const [editStatus, setEditStatus] = useState('active');
  const [editNewPassword, setEditNewPassword] = useState('');
  const [showPasswordField, setShowPasswordField] = useState(false);

  // Current User Password Change (Self-service account password change)
  const [currPwd, setCurrPwd] = useState('');
  const [nextPwd, setNextPwd] = useState('');
  const [confirmNextPwd, setConfirmNextPwd] = useState('');
  const [isChangingPwd, setIsChangingPwd] = useState(false);
  const [pwdError, setPwdError] = useState('');

  // Load backend users on tab activation
  useEffect(() => {
    if (activeTab === 'security' && currentUser?.role === 'Administrator') {
      loadUsers();
    }
  }, [activeTab, currentUser, loadUsers]);

  const handleSavePreferences = (e) => {
    e.preventDefault();
    showToast('Preferences (General and Appearance) saved successfully', 'success');
  };

  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    setUserError('');

    if (!newUsername.trim() || !newDisplayName.trim() || !newPassword) {
      setUserError('All fields are required.');
      return;
    }

    if (newPassword.length < 8) {
      setUserError('Initial password must be at least 8 characters long.');
      return;
    }

    try {
      await createUser({
        username: newUsername.trim(),
        displayName: newDisplayName.trim(),
        role: newRole,
        initialPassword: newPassword,
        status: 'active',
      });
      setIsAddUserOpen(false);
      setNewUsername('');
      setNewDisplayName('');
      setNewPassword('');
    } catch (err) {
      setUserError(err.message || 'Failed to create user. Verify that username is unique.');
    }
  };

  const handleOpenEditUser = (user) => {
    setSelectedUser(user);
    setEditDisplayName(user.displayName);
    setEditRole(user.role);
    setEditStatus(user.status || 'active');
    setCurrPwd('');
    setNextPwd('');
    setConfirmNextPwd('');
    setPwdError('');
    setShowPasswordField(false);
    setIsEditUserOpen(true);
  };

  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setPwdError('');

    const isEditingSelf = selectedUser.username === currentUser?.username;

    // Validate password if user toggled password change or entered any password text
    if (showPasswordField && (currPwd || nextPwd || confirmNextPwd)) {
      if (isEditingSelf && !currPwd) {
        setPwdError('Please enter your current password.');
        return;
      }
      if (!nextPwd || nextPwd.length < 8) {
        setPwdError('New password must be at least 8 characters long.');
        return;
      }
      if (nextPwd !== confirmNextPwd) {
        setPwdError('New password confirmation does not match.');
        return;
      }
    }

    setIsChangingPwd(true);
    try {
      // 1. Update Profile (DisplayName, Role, Status)
      await updateUser(selectedUser.username, {
        displayName: editDisplayName.trim(),
        role: editRole,
        status: editStatus,
      });

      // 2. Update Password if specified
      if (showPasswordField && nextPwd) {
        if (isEditingSelf) {
          await changePassword(currPwd, nextPwd);
          showToast('Your account password and profile have been updated.', 'success');
        } else {
          await resetPassword(selectedUser.username, nextPwd);
          showToast(`Password for ${selectedUser.displayName || selectedUser.username} has been reset.`, 'success');
        }
      } else {
        showToast(`User details for ${selectedUser.displayName || selectedUser.username} saved successfully.`, 'success');
      }

      setIsEditUserOpen(false);
      setSelectedUser(null);
      setCurrPwd('');
      setNextPwd('');
      setConfirmNextPwd('');
      setShowPasswordField(false);
    } catch (err) {
      setPwdError(err.message || 'Failed to update account credentials. Please verify your current password.');
    } finally {
      setIsChangingPwd(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (user.username === currentUser.username) {
      showToast('You cannot delete your own logged-in account', 'error');
      return;
    }
    if (window.confirm(`Are you sure you want to permanently delete user @${user.username}?`)) {
      try {
        await deleteUser(user.username);
      } catch (e) {
        // toast shown in context
      }
    }
  };

  // The top three tabs must be Security, General, About (Requirement 6)
  const tabs = [
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'general', label: 'General', icon: Sliders },
    { id: 'about', label: 'About', icon: Info },
  ];

  return (
    <div className="settings-page-container" style={{ paddingBottom: '40px', marginLeft: '20px' }}>
      {/* Settings Header */}
      <div className="settings-header">
        <h1 className="page-title">Platform Settings</h1>
        <p className="page-subtitle">
          Configure security policies, administrator RBAC access, regional defaults, visual appearance, and platform architecture
        </p>
      </div>

      {/* macOS Tahoe Inspired Vertical Split View Layout (Requirement 9) */}
      <div className="settings-mac-split-view">
        {/* Vertical Category Sidebar */}
        <aside className="settings-mac-sidebar" role="tablist" aria-label="Settings Categories">
          <div className="settings-sidebar-search">
            <Search size={13} color="var(--text-muted)" style={{ flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(eg.target.value)}
              className="settings-search-input"
            />
          </div>

          <div className="settings-nav-section-title">PLATFORM</div>
          <div className="settings-nav-pill-list">
            {tabs
              .filter((tab) => !searchFilter || tab.label.toLowerCase().includes(searchFilter.toLowerCase()))
              .map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={isActive}
                    className={`settings-nav-pill ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelectTab(tab.id)}
                  >
                    <span className={`pill-icon-box ${tab.id}`}>
                      <Icon size={14} />
                    </span>
                    <span className="pill-label">{tab.label}</span>
                  </button>
                );
              })}
          </div>
        </aside>

        {/* Right Settings Content Area with macOS Tahoe Breadcrumb */}
        <div className="settings-mac-main">
          <div className="settings-mac-breadcrumb">
            <span className="crumb-nav">&lt; &gt;</span>
            <span className="crumb-title">
              {tabs.find((t) => t.id === activeTab)?.label || 'Settings'}
            </span>
          </div>

      {/* ========================================================================= */}
      {/* TAB 1: SECURITY & ACCESS (Requirement 9.1: Merged Security + Users & Access) */}
      {/* ========================================================================= */}
      {activeTab === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Security Overview & Policies */}
          <div className="panel-card">
            <div className="panel-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={18} color="var(--accent-primary)" />
                <div>
                  <div className="panel-title">Authentication &amp; Security Baseline</div>
                  <div className="panel-subtitle">
                    Active role-based access control, PBKDF2/bcrypt key derivation, and TLS transport policies
                  </div>
                </div>
              </div>
              <span className="badge badge-success">Enforced</span>
            </div>

            <div className="panel-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px',
                  }}
                >
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Password Encryption
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                    PBKDF2-SHA256
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    100,000 salt iterations per RFC 2898
                  </div>
                </div>

                <div
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px',
                  }}
                >
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Session Auth Token
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                    Bearer Token / 24h
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Automatic renewal on active API requests
                  </div>
                </div>

                <div
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px',
                  }}
                >
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    API Endpoint Protection
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                    RBAC Guard Middleware
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Enforced at Express server level
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* User Management & Access Control (Unified into Security: Requirement 9.1) */}
          <div className="panel-card" style={{ maxWidth: '100%', overflow: 'hidden' }}>
            <div className="panel-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} color="var(--accent-purple, #a855f7)" />
                <div>
                  <div className="panel-title">User Accounts &amp; Operational Roles</div>
                  <div className="panel-subtitle">
                    Manage operator credentials, role privileges, and password resets
                  </div>
                </div>
              </div>

              {currentUser?.role === 'Administrator' && (
                <button
                  id="add-user-btn"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setUserError('');
                    setIsAddUserOpen(true);
                  }}
                >
                  <UserPlus size={15} />
                  <span>Add User Account</span>
                </button>
              )}
            </div>

            <div className="panel-body" style={{ padding: 0 }}>
              {currentUser?.role !== 'Administrator' ? (
                <div
                  style={{
                    background: 'var(--tint-amber)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    margin: '18px',
                    padding: '14px 18px',
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <AlertTriangle size={18} color="var(--accent-amber)" style={{ flexShrink: 0 }} />
                  <span>
                    You are signed in as an <strong>Operator</strong>. Administrative user provisioning and system access policies require an Administrator account.
                  </span>
                </div>
              ) : isUsersLoading ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading registered user directory...
                </div>
              ) : (
                <div className="table-responsive" style={{ border: 'none', borderRadius: 0, width: '100%', overflowX: 'hidden' }}>
                  <table className="data-table" style={{ width: '100%', minWidth: 0, tableLayout: 'auto' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '52%' }}>Name</th>
                        <th style={{ width: '28%' }}>Role</th>
                        <th style={{ width: '20%', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.map((u) => {
                        const isSelf = u.username === currentUser?.username;
                        const roleLabel = u.role === 'Administrator' ? 'Admin' : 'Operator';
                        return (
                          <tr key={u.username}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div
                                  style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    background: u.role === 'Administrator' ? 'var(--tint-purple)' : 'var(--tint-primary)',
                                    color: u.role === 'Administrator' ? 'var(--accent-purple)' : 'var(--accent-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    fontSize: '11px',
                                    flexShrink: 0,
                                  }}
                                >
                                  {(u.displayName || u.username).slice(0, 2).toUpperCase()}
                                </div>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {u.displayName || u.username}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span
                                className={`badge badge-${u.role === 'Administrator' ? 'purple' : 'neutral'}`}
                                style={{ fontSize: '11px', fontWeight: 600 }}
                              >
                                {roleLabel}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end' }}>
                                <button
                                  className="icon-action-btn"
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: 'var(--radius-sm)',
                                    background: 'var(--bg-card)',
                                    color: 'var(--text-secondary)',
                                  }}
                                  onClick={() => handleOpenEditUser(u)}
                                  title={`Edit details for ${u.displayName || u.username}`}
                                  aria-label={`Edit ${u.displayName || u.username}`}
                                >
                                  <Edit2 size={13} />
                                </button>
                                {!isSelf && (
                                  <button
                                    className="icon-action-btn"
                                    style={{
                                      width: '32px',
                                      height: '32px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: 'var(--accent-rose)',
                                      border: '1px solid rgba(239, 68, 68, 0.3)',
                                      borderRadius: 'var(--radius-sm)',
                                      background: 'transparent',
                                    }}
                                    onClick={() => handleDeleteUser(u)}
                                    title={`Delete user ${u.displayName || u.username}`}
                                    aria-label={`Delete ${u.displayName || u.username}`}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>


        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: GENERAL (Requirement 6: Security, General, About)                   */}
      {/* ========================================================================= */}
      {activeTab === 'general' && (
        <form onSubmit={handleSavePreferences} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* General Section (First, per Requirement 9.3) */}
          <div className="panel-card">
            <div className="panel-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={18} color="var(--accent-primary)" />
                <div>
                  <div className="panel-title">General Platform Preferences</div>
                  <div className="panel-subtitle">
                    Configure default municipal district, timezone, and telemetry polling cadence
                  </div>
                </div>
              </div>
            </div>

            <div className="panel-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Default Operating Region</label>
                  <select
                    className="form-select"
                    value={defaultRegion}
                    onChange={(e) => setDefaultRegion(e.target.value)}
                  >
                    <option value="reg-bayfront">District 1: Bayfront &amp; Waterfront</option>
                    <option value="reg-civic">District 2: Civic Center &amp; Commercial</option>
                    <option value="reg-industrial">District 3: Industrial Logistics Park</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Municipal Operating Timezone</label>
                  <select
                    className="form-select"
                    value={timeZone}
                    onChange={(e) => setTimeZone(e.target.value)}
                  >
                    <option value="America/Los_Angeles">Pacific Time (US &amp; Canada) - UTC-08:00</option>
                    <option value="America/Denver">Mountain Time (US &amp; Canada) - UTC-07:00</option>
                    <option value="America/Chicago">Central Time (US &amp; Canada) - UTC-06:00</option>
                    <option value="America/New_York">Eastern Time (US &amp; Canada) - UTC-05:00</option>
                    <option value="UTC">Coordinated Universal Time - UTC+00:00</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Telemetry Auto-Sync Cadence</label>
                  <select
                    className="form-select"
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(e.target.value)}
                  >
                    <option value="5">Every 5 Seconds (Real-time Mesh)</option>
                    <option value="15">Every 15 Seconds (Standard Operations)</option>
                    <option value="60">Every 60 Seconds (Low Bandwidth LTE)</option>
                    <option value="0">Manual Sync Only</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={autoAcknowledgeLow}
                    onChange={(e) => setAutoAcknowledgeLow(e.target.checked)}
                    style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }}
                  />
                  <span>Automatically acknowledge low-severity alerts after 48 hours</span>
                </label>
              </div>
            </div>
          </div>

          {/* Appearance Section (Placed below General, per Requirement 9.3) */}
          <div className="panel-card">
            <div className="panel-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Palette size={18} color="var(--accent-purple, #a855f7)" />
                <div>
                  <div className="panel-title">Appearance &amp; Theme Customization</div>
                  <div className="panel-subtitle">
                    Select color theme, display density, and accessible contrast modes
                  </div>
                </div>
              </div>
            </div>

            <div className="panel-body">
              <div className="form-group">
                <label className="form-label">Theme Mode</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <button
                    type="button"
                    className={`btn ${themePreference === 'dark' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ justifyContent: 'center', gap: '8px', padding: '12px' }}
                    onClick={() => setThemePreference('dark')}
                  >
                    <Moon size={16} />
                    <span>Dark Theme (Default)</span>
                  </button>

                  <button
                    type="button"
                    className={`btn ${themePreference === 'light' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ justifyContent: 'center', gap: '8px', padding: '12px' }}
                    onClick={() => setThemePreference('light')}
                  >
                    <Sun size={16} />
                    <span>Light Theme (Slate)</span>
                  </button>

                  <button
                    type="button"
                    className={`btn ${themePreference === 'system' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ justifyContent: 'center', gap: '8px', padding: '12px' }}
                    onClick={() => setThemePreference('system')}
                  >
                    <Laptop size={16} />
                    <span>Match OS Preference</span>
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginTop: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Interface Layout Density</label>
                  <select
                    className="form-select"
                    value={displayDensity}
                    onChange={(e) => setDisplayDensity(e.target.value)}
                  >
                    <option value="comfortable">Comfortable (Standard Padding)</option>
                    <option value="compact">Compact (High Information Density)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">High-Contrast Accents</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', height: '38px', fontSize: '13px' }}>
                    <input
                      type="checkbox"
                      checked={highContrast}
                      onChange={(e) => setHighContrast(e.target.checked)}
                      style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }}
                    />
                    <span>Enhance border contrast for outdoor glare visibility</span>
                  </label>
                </div>
              </div>

              <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save All Preferences
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ABOUT                                                              */}
      {/* ========================================================================= */}
      {activeTab === 'about' && (
        <div className="panel-card">
          <div className="panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Info size={18} color="var(--accent-primary)" />
              <div>
                <div className="panel-title">About CMS Smart Lighting &amp; Solar Platform</div>
                <div className="panel-subtitle">
                  Municipal Streetlight Fleet Management &amp; Photovoltaic Intelligence System
                </div>
              </div>
            </div>
            <span className="badge badge-neutral font-mono">v2.4.0-tahoe</span>
          </div>

          <div className="panel-body">
            <div className="drawer-info-table">
              <div className="drawer-info-row">
                <span className="drawer-info-key">Frontend Architecture</span>
                <span className="drawer-info-val">React 18 + Vite + Leaflet + Chart.js (Tailored Vanilla CSS)</span>
              </div>
              <div className="drawer-info-row">
                <span className="drawer-info-key">Backend Framework</span>
                <span className="drawer-info-val">Node.js Express REST API + Cloudflare Tunnel Proxy</span>
              </div>
              <div className="drawer-info-row">
                <span className="drawer-info-key">Solar Intelligence References</span>
                <span className="drawer-info-val">NREL NSRDB PSM v3 &bull; Sandia National Laboratories SAPM</span>
              </div>
              <div className="drawer-info-row">
                <span className="drawer-info-key">Supported Protocols</span>
                <span className="drawer-info-val">DALI-2 &bull; Zhaga Book 18 &bull; Cellular LTE-M &bull; Wirepas Mesh</span>
              </div>
            </div>
          </div>
        </div>
      )}

        </div>
      </div>

      {/* Add User Modal */}
      {isAddUserOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddUserOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={18} color="var(--accent-primary)" />
                <span style={{ fontWeight: 600, fontSize: '15px' }}>Add New Operator Account</span>
              </div>
              <button className="icon-action-btn" onClick={() => setIsAddUserOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit}>
              <div className="modal-body">
                {userError && (
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
                    {userError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Username (alphanumeric) *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. j.doe or operator2"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Display Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Jane Doe"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Role Privilege *</label>
                  <select
                    className="form-select"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                  >
                    <option value="Operator">Operator (Operational Dashboard, Map View &amp; Smart Diagnostics)</option>
                    <option value="Administrator">Administrator (Full User Management &amp; System Settings)</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Initial Password (min 8 chars) *</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="••••••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsAddUserOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create User Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal with Integrated Account Password Management */}
      {isEditUserOpen && selectedUser && (
        <div className="modal-backdrop" onClick={() => setIsEditUserOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={18} color="var(--accent-primary)" />
                <span style={{ fontWeight: 600, fontSize: '15px' }}>
                  Edit User: {selectedUser.displayName || selectedUser.username}
                </span>
              </div>
              <button className="icon-action-btn" onClick={() => setIsEditUserOpen(false)} aria-label="Close modal">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditUserSubmit}>
              <div className="modal-body">
                {pwdError && (
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
                    {pwdError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Display Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Role Privilege</label>
                  <select
                    className="form-select"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                  >
                    <option value="Operator">Operator</option>
                    <option value="Administrator">Administrator</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Account Status</label>
                  <select
                    className="form-select"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive / Deactivated</option>
                  </select>
                </div>

                {/* Password Management Integrated Inside User Edit Dialog */}
                <div
                  style={{
                    marginTop: '16px',
                    padding: '14px',
                    background: 'var(--bg-canvas)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showPasswordField ? '12px' : '0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <KeyRound size={16} color="var(--accent-amber)" />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {selectedUser.username === currentUser?.username ? 'Change My Account Password' : 'Reset User Password'}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline btn-xs"
                      onClick={() => {
                        setShowPasswordField(!showPasswordField);
                        setPwdError('');
                        setCurrPwd('');
                        setNextPwd('');
                        setConfirmNextPwd('');
                      }}
                    >
                      {showPasswordField ? 'Cancel Password Change' : (selectedUser.username === currentUser?.username ? 'Change Password' : 'Set New Password')}
                    </button>
                  </div>

                  {showPasswordField && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {selectedUser.username === currentUser?.username && (
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '12px' }}>
                            Current Password *
                          </label>
                          <input
                            type="password"
                            className="form-input"
                            placeholder="Enter current password..."
                            value={currPwd}
                            onChange={(e) => {
                              setCurrPwd(e.target.value);
                              setPwdError('');
                            }}
                          />
                        </div>
                      )}

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '12px' }}>
                          New Password (minimum 8 characters) *
                        </label>
                        <input
                          type="password"
                          className="form-input"
                          placeholder="Enter new password..."
                          value={nextPwd}
                          onChange={(e) => {
                            setNextPwd(e.target.value);
                            setPwdError('');
                          }}
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '12px' }}>
                          Confirm New Password *
                        </label>
                        <input
                          type="password"
                          className="form-input"
                          placeholder="Confirm new password..."
                          value={confirmNextPwd}
                          onChange={(e) => {
                            setConfirmNextPwd(e.target.value);
                            setPwdError('');
                          }}
                        />
                      </div>

                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Password will be encrypted using PBKDF2 with 100,000 salt iterations.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsEditUserOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isChangingPwd}>
                  {isChangingPwd ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
