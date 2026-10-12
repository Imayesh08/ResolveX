import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn, AlertCircle, Eye, EyeOff, Sparkles, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import BrandLogo from '../components/BrandLogo';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const validate = () => {
    const errs = {};
    if (!email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
      errs.email = 'Enter a valid email address.';
    }
    if (!password) {
      errs.password = 'Password is required.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) return;

    setSubmitting(true);
    try {
      const user = await login(email, password);
      showToast(`Welcome back, ${user.name}!`, 'success');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please verify your credentials.';
      setServerError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick fill helper for exam demonstration
  const handleQuickFill = (roleEmail, rolePass) => {
    setEmail(roleEmail);
    setPassword(rolePass);
    setErrors({});
    setServerError('');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#030405',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background Luminous Blue Glow */}
      <div
        style={{
          position: 'absolute',
          top: '35%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 520,
          height: 520,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(22, 136, 255, 0.2) 0%, rgba(22, 136, 255, 0.05) 50%, transparent 70%)',
          filter: 'blur(40px)',
          pointerEvents: 'none'
        }}
      />

      {/* Main Login Card - Upper-right panel aesthetic */}
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          backgroundColor: '#101720',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(22, 136, 255, 0.3)',
          boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.8), 0 0 24px rgba(22, 136, 255, 0.2)',
          padding: '2.5rem 2.25rem',
          position: 'relative',
          zIndex: 2,
          backdropFilter: 'blur(16px)'
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link to="/" style={{ display: 'inline-block', marginBottom: '1.25rem' }}>
            <BrandLogo size={36} showText={true} />
          </Link>

          <h1
            style={{
              fontSize: '1.625rem',
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '-0.025em',
              lineHeight: 1.2
            }}
          >
            Sign In to ResolveX
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#A6B0BE', marginTop: '0.4rem' }}>
            Welcome back. Access your customer, staff, or admin portal.
          </p>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(255, 98, 108, 0.12)',
              border: '1px solid rgba(255, 98, 108, 0.3)',
              borderRadius: 'var(--radius-sm)',
              color: '#FF626C',
              fontSize: '0.8125rem',
              marginBottom: '1.25rem'
            }}
            role="alert"
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{serverError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className="form-control"
              placeholder="name@resolvex.local"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              autoComplete="email"
            />
            {errors.email && <span className="form-error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                autoComplete="current-password"
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#6E7C91',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.2rem'
                }}
                aria-label="Toggle visibility"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <span className="form-error">{errors.password}</span>}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.625rem', padding: '0.75rem' }}
            disabled={submitting}
          >
            {submitting ? 'Authenticating...' : <><LogIn size={17} /> Sign In</>}
          </button>
        </form>

        {/* Quick Demo Shortcuts */}
        <div
          style={{
            marginTop: '1.75rem',
            padding: '1.125rem',
            backgroundColor: '#0B1017',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.625rem' }}>
            <Sparkles size={13} style={{ color: '#1688FF' }} />
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: '#A6B0BE',
                textTransform: 'uppercase',
                letterSpacing: '0.06em'
              }}
            >
              Demo Account Shortcuts
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickFill('admin@resolvex.local', 'Admin123!')}
            >
              Admin Demo
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickFill('priya.staff@resolvex.local', 'Staff123!')}
            >
              Staff Demo
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickFill('aravind.customer@resolvex.local', 'Customer123!')}
            >
              Customer Demo
            </button>
          </div>
        </div>

        {/* Register Link */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8125rem', color: '#A6B0BE' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#1688FF', fontWeight: 600 }}>
            Register as Customer
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
