import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { INITIAL_DEVICES, INITIAL_ALERTS, INITIAL_SCHEDULES } from '../data/mockData';
import { ApiService } from '../services/api';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  // Theme State: 'dark' | 'light' | 'system'
  const [themePreference, setThemePreference] = useState(() => {
    return localStorage.getItem('cms_theme_preference') || 'dark';
  });
  const [effectiveTheme, setEffectiveTheme] = useState('dark');

  // Handle theme changes and system preference synchronization
  useEffect(() => {
    const applyTheme = (theme) => {
      document.documentElement.classList.remove('theme-light', 'theme-dark');
      document.body.classList.remove('theme-light', 'theme-dark');
      if (theme === 'light') {
        document.documentElement.classList.add('theme-light');
        document.body.classList.add('theme-light');
      } else {
        document.documentElement.classList.add('theme-dark');
        document.body.classList.add('theme-dark');
      }
      setEffectiveTheme(theme);
    };

    if (themePreference === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches ? 'dark' : 'light');

      const handler = (e) => applyTheme(e.matches ? 'dark' : 'light');
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      applyTheme(themePreference);
    }

    localStorage.setItem('cms_theme_preference', themePreference);
  }, [themePreference]);

  // Authentication State: Null by default until signed in
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('cms_current_user');
    const token = localStorage.getItem('cms_auth_token');
    if (saved && token) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Navigation State
  const [activeRoute, setActiveRoute] = useState('dashboard');
  const [settingsTab, setSettingsTab] = useState('general');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Selected Device Context for Cross-Module Continuity
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [selectedRegionId, setSelectedRegionId] = useState('reg-bayfront');
  const [selectedZoneId, setSelectedZoneId] = useState('');

  // Core Data Collections
  const [devices, setDevices] = useState(INITIAL_DEVICES);
  const [regions, setRegions] = useState([]);
  const [alerts, setAlerts] = useState(INITIAL_ALERTS);
  const [schedules, setSchedules] = useState(INITIAL_SCHEDULES);

  // User Management State (Backend-backed)
  const [usersList, setUsersList] = useState([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);

  // Toast Notification System
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    const toastId = Date.now();
    setToast({ message, type, id: toastId });
    if (duration > 0) {
      toastTimerRef.current = setTimeout(() => {
        setToast((prev) => (prev && prev.id === toastId ? null : prev));
        toastTimerRef.current = null;
      }, duration);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // Fetch canonical devices & regions from backend API
  const loadDevices = useCallback(async () => {
    try {
      const data = await ApiService.getDevices();
      if (data && data.devices && data.devices.length > 0) {
        setDevices(data.devices);
      }
    } catch (err) {
      console.warn('Using local devices fallback:', err.message);
    }
  }, []);

  const loadRegions = useCallback(async () => {
    try {
      const data = await ApiService.getRegions();
      if (data && data.regions) {
        setRegions(data.regions);
      }
    } catch (err) {
      console.warn('Could not load regions:', err.message);
    }
  }, []);

  useEffect(() => {
    loadDevices();
    loadRegions();
  }, [loadDevices, loadRegions]);

  // Save current user to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('cms_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('cms_current_user');
      localStorage.removeItem('cms_auth_token');
    }
  }, [currentUser]);

  // Fetch Users when Admin visits or loads
  const loadUsers = useCallback(async () => {
    if (currentUser?.role !== 'Administrator') return;
    setIsUsersLoading(true);
    try {
      const data = await ApiService.getUsers();
      if (data && data.users) {
        setUsersList(data.users);
      }
    } catch (err) {
      console.warn('Failed to load users from backend API:', err.message);
    } finally {
      setIsUsersLoading(false);
    }
  }, [currentUser]);

  // Keyboard shortcut for Cmd+K / Ctrl+K search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setNotificationsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Authentication Actions
  const login = async (username, password) => {
    try {
      const data = await ApiService.login(username, password);
      setCurrentUser(data.user);
      if (data.user.mustChangePassword) {
        showToast('Password change required on initial login', 'info');
      } else {
        showToast(`Welcome back, ${data.user.displayName}`, 'success');
        setActiveRoute('dashboard');
      }
      return data.user;
    } catch (err) {
      showToast(err.message || 'Login failed. Check credentials.', 'error');
      throw err;
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const data = await ApiService.changePassword(currentPassword, newPassword);
      setCurrentUser(data.user);
      showToast('Password updated securely. System unlocked.', 'success');
      return data;
    } catch (err) {
      showToast(err.message || 'Failed to update password', 'error');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await ApiService.logout();
    } catch (e) {
      // ignore
    }
    setCurrentUser(null);
    setActiveRoute('dashboard');
    showToast('Signed out successfully', 'info');
  };

  // Device Creation & Persistence Action
  const createDevice = async (devicePayload) => {
    try {
      const res = await ApiService.createDevice(devicePayload);
      showToast(`Smart lamp "${res.device.name}" provisioned and persisted successfully!`, 'success');
      await loadDevices();
      return res.device;
    } catch (err) {
      showToast(err.message || 'Failed to provision device', 'error');
      throw err;
    }
  };

  // User Management Actions (Admin Only)
  const createUser = async (userData) => {
    try {
      const res = await ApiService.createUser(userData);
      showToast(`User ${userData.username} created successfully`, 'success');
      await loadUsers();
      return res;
    } catch (err) {
      showToast(err.message || 'Failed to create user', 'error');
      throw err;
    }
  };

  const updateUser = async (username, userData) => {
    try {
      const res = await ApiService.updateUser(username, userData);
      showToast(`User ${username} updated`, 'success');
      await loadUsers();
      return res;
    } catch (err) {
      showToast(err.message || 'Failed to update user', 'error');
      throw err;
    }
  };

  const deleteUser = async (username) => {
    try {
      const res = await ApiService.deleteUser(username);
      showToast(`User ${username} deleted`, 'info');
      await loadUsers();
      return res;
    } catch (err) {
      showToast(err.message || 'Failed to delete user', 'error');
      throw err;
    }
  };

  const resetPassword = async (username, newPassword) => {
    try {
      const res = await ApiService.resetPassword(username, newPassword);
      showToast(`Password reset for ${username}`, 'success');
      await loadUsers();
      return res;
    } catch (err) {
      showToast(err.message || 'Failed to reset password', 'error');
      throw err;
    }
  };

  // Contextual Cross-Module Navigation Handlers
  const navigateToSchedule = (dev) => {
    if (dev) {
      setSelectedDevice(dev);
      if (dev.regionId) setSelectedRegionId(dev.regionId);
      if (dev.zoneId) setSelectedZoneId(dev.zoneId);
    }
    setActiveRoute('schedule');
  };

  const navigateToOracle = (dev) => {
    if (dev) setSelectedDevice(dev);
    setActiveRoute('oracle');
  };

  const navigateToDiagnostics = (dev) => {
    if (dev) setSelectedDevice(dev);
    setActiveRoute('assistance');
  };

  const navigateToMap = (dev) => {
    if (dev) setSelectedDevice(dev);
    setActiveRoute('map');
  };

  const navigateToSettings = (tab = 'general') => {
    setSettingsTab(tab);
    setActiveRoute('settings');
  };

  // Issue Resolution & Support Ticket Handlers (Requirement 6)
  const resolveDeviceIssue = async (deviceId, notes) => {
    try {
      const res = await ApiService.resolveDeviceIssue(deviceId, { resolutionNotes: notes });
      setDevices((prev) =>
        prev.map((d) => (d.id === deviceId ? { ...d, status: 'online', activeAlerts: [] } : d))
      );
      if (selectedDevice && selectedDevice.id === deviceId) {
        setSelectedDevice((prev) => ({ ...prev, status: 'online', activeAlerts: [] }));
      }
      showToast(`Device ${deviceId} marked as resolved`, 'success');
      return res;
    } catch (err) {
      showToast(err.message || 'Failed to resolve device issue', 'error');
      throw err;
    }
  };

  const raiseSupportTicket = async (ticketData) => {
    try {
      const res = await ApiService.createSupportTicket(ticketData);
      showToast(`Ticket ${res.ticket?.id || ''} dispatched to field ops`, 'success');
      return res;
    } catch (err) {
      showToast(err.message || 'Failed to dispatch ticket', 'error');
      throw err;
    }
  };

  // Alert Actions
  const acknowledgeAlert = (alertId) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: 'acknowledged' } : a))
    );
    showToast(`Alert ${alertId} acknowledged`, 'info');
  };

  const resolveAlert = (alertId) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: 'resolved' } : a))
    );
    showToast(`Alert ${alertId} resolved`, 'success');
  };

  // Schedule Actions
  const toggleSchedule = async (scheduleId) => {
    const target = schedules.find((s) => s.id === scheduleId);
    if (!target) return;
    const nextActive = !target.active;
    setSchedules((prev) =>
      prev.map((s) => (s.id === scheduleId ? { ...s, active: nextActive } : s))
    );
    showToast(`Schedule "${target.name}" is now ${nextActive ? 'Active' : 'Paused'}`, 'info');
    try {
      await ApiService.updateSchedule(scheduleId, { active: nextActive });
    } catch (err) {
      console.warn('Could not persist schedule status:', err.message);
    }
  };

  const addSchedule = (newSchedule) => {
    setSchedules((prev) => [newSchedule, ...prev]);
    showToast(`Created schedule "${newSchedule.name}"`, 'success');
  };

  const deleteSchedule = async (scheduleId) => {
    const target = schedules.find((s) => s.id === scheduleId);
    setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
    showToast(`Deleted schedule "${target?.name || scheduleId}"`, 'info');
    try {
      await ApiService.deleteSchedule(scheduleId);
    } catch (err) {
      console.warn('Could not delete schedule on backend:', err.message);
    }
  };

  return (
    <AppContext.Provider
      value={{
        // Theme
        themePreference,
        setThemePreference,
        effectiveTheme,
        // Authentication
        currentUser,
        login,
        changePassword,
        logout,
        // User Management
        usersList,
        loadUsers,
        isUsersLoading,
        createUser,
        updateUser,
        deleteUser,
        resetPassword,
        // Navigation & Context Continuity
        activeRoute,
        setActiveRoute,
        settingsTab,
        setSettingsTab,
        navigateToSettings,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        isSearchOpen,
        setIsSearchOpen,
        notificationsOpen,
        setNotificationsOpen,
        selectedDevice,
        setSelectedDevice,
        selectedRegionId,
        setSelectedRegionId,
        selectedZoneId,
        setSelectedZoneId,
        navigateToSchedule,
        navigateToOracle,
        navigateToDiagnostics,
        navigateToMap,
        resolveDeviceIssue,
        raiseSupportTicket,
        // Data & CRUD
        devices,
        setDevices,
        regions,
        loadDevices,
        createDevice,
        alerts,
        acknowledgeAlert,
        resolveAlert,
        schedules,
        toggleSchedule,
        addSchedule,
        deleteSchedule,
        // Toast
        toast,
        showToast,
        dismissToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
