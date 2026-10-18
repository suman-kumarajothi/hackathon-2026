import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TipsBulbIcon } from '../components/TipsBulbIcon';
import { Lock, User, ArrowRight, Eye, EyeOff, ShieldCheck, Server, Sparkles } from 'lucide-react';

export const Login = () => {
  const { login } = useApp();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please provide your account username and password.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err.message || 'Invalid username or password. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillAdmin = () => {
    setUsername('admin');
    setPassword('admin123');
    setError('');
  };

  const handleFillOperator = () => {
    setUsername('operator');
    setPassword('operator123');
    setError('');
  };

  return (
    <div className="login-screen-wrapper">
      {/* Smart City Background Grid & Ambient Glow */}
      <div className="login-ambient-grid" />
      <div className="login-ambient-glow" />

      {/* Centered Login Card */}
      <div className="login-card-container">
        {/* Brand Header */}
        <div className="login-header">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
            <TipsBulbIcon size={64} />
          </div>

          <h1 className="login-title">
            CMS
          </h1>
          <p className="login-subtitle">
            Smart IoT Lighting &amp; Solar Management Platform
          </p>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginTop: '16px', marginBottom: '4px', color: 'var(--text-primary)' }}>
            Sign In
          </h2>
        </div>

        {error && (
          <div className="login-error-banner" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">Username</label>
            <div className="input-with-icon-wrapper">
              <input
                id="login-username"
                type="text"
                className="form-input"
                style={{ paddingLeft: '38px' }}
                placeholder="admin or operator"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
              <User
                size={16}
                className="input-icon-left"
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '22px' }}>
            <label className="form-label">Password</label>
            <div className="input-with-icon-wrapper">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                style={{ paddingLeft: '38px', paddingRight: '40px' }}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <Lock
                size={16}
                className="input-icon-left"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginBottom: '18px' }}
            disabled={isLoading}
          >
            {isLoading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span className="spinner-border" /> Authenticating...
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span>Sign In</span>
                <ArrowRight size={16} />
              </span>
            )}
          </button>

          {/* Development / Demo Quick Provisioning Selection */}
          <div className="login-demo-accounts">
            <span className="demo-accounts-label">Demo Credentials:</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm demo-account-btn"
                onClick={handleFillAdmin}
              >
                <ShieldCheck size={13} style={{ color: 'var(--accent-purple)' }} />
                <span>Admin (admin)</span>
              </button>

              <button
                type="button"
                className="btn btn-outline btn-sm demo-account-btn"
                onClick={handleFillOperator}
              >
                <ShieldCheck size={13} style={{ color: 'var(--accent-primary)' }} />
                <span>Operator (operator)</span>
              </button>
            </div>
          </div>
        </form>

        <div className="login-footer">
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Server size={12} /> Redis Persistent Mesh
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={11} /> TLS 1.3 Ingress
          </span>
        </div>
      </div>
    </div>
  );
};
