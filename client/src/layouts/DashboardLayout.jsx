import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Users,
  User,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronRight,
  Shield,
  Briefcase,
  UserCheck,
  ScrollText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';
import NotificationBell from '../components/NotificationBell';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadgeStyle = (role) => {
    if (role === 'admin') {
      return {
        bg: 'rgba(255, 98, 108, 0.15)',
        color: '#FF626C',
        border: '1px solid rgba(255, 98, 108, 0.3)',
        label: 'Administrator'
      };
    }
    if (role === 'staff') {
      return {
        bg: 'rgba(22, 136, 255, 0.15)',
        color: '#4BA2FF',
        border: '1px solid rgba(22, 136, 255, 0.3)',
        label: 'Support Staff'
      };
    }
    return {
      bg: 'rgba(25, 214, 154, 0.15)',
      color: '#19D69A',
      border: '1px solid rgba(25, 214, 154, 0.3)',
      label: 'Customer'
    };
  };

  const roleInfo = getRoleBadgeStyle(user?.role);

  // Compute breadcrumbs and page title from route
  const getPageMeta = () => {
    const path = location.pathname;
    if (path === '/dashboard') {
      return {
        title: user?.role === 'admin' ? 'Admin Dashboard' : user?.role === 'staff' ? 'Staff Console' : 'Customer Dashboard',
        breadcrumb: 'Dashboard'
      };
    }
    if (path === '/complaints') {
      return {
        title: user?.role === 'customer' ? 'My Complaints' : 'Complaint Queue',
        breadcrumb: 'Complaints'
      };
    }
    if (path === '/complaints/new') {
      return { title: 'Submit a Complaint', breadcrumb: 'Complaints / New' };
    }
    if (path.startsWith('/complaints/')) {
      return { title: 'Complaint Details & Tracking', breadcrumb: 'Complaints / Details' };
    }
    if (path === '/users') {
      return { title: 'User & Staff Management', breadcrumb: 'Admin / Users' };
    }
    if (path === '/audit-logs') {
      return { title: 'Audit Logs & Accountability', breadcrumb: 'Admin / Audit Logs' };
    }
    if (path === '/notifications') {
      return { title: 'Notification Center', breadcrumb: 'Notifications' };
    }
    if (path === '/profile') {
      return { title: 'Account Profile', breadcrumb: 'Account / Profile' };
    }
    return { title: 'Portal', breadcrumb: 'Overview' };
  };

  const pageMeta = getPageMeta();
  const userInitials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'RX';

  return (
    <div className="dashboard-shell">
      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(3, 4, 5, 0.85)',
            backdropFilter: 'blur(6px)',
            zIndex: 45
          }}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}
        aria-label="Sidebar navigation"
      >
        <div className="sidebar-header">
          <Link to="/dashboard" className="sidebar-brand">
            <BrandLogo size={28} showText={true} />
          </Link>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">Navigation</div>

          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/complaints"
            end
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <FileText size={18} />
            <span>{user?.role === 'customer' ? 'My Complaints' : 'Complaints'}</span>
          </NavLink>

          {user?.role === 'customer' && (
            <NavLink
              to="/complaints/new"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <PlusCircle size={18} />
              <span>New Complaint</span>
            </NavLink>
          )}

          {user?.role === 'admin' && (
            <>
              <div className="nav-section-title" style={{ marginTop: '0.75rem' }}>Administration</div>
              <NavLink
                to="/users"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Users size={18} />
                <span>Users</span>
              </NavLink>
              <NavLink
                to="/audit-logs"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <ScrollText size={18} />
                <span>Audit Logs</span>
              </NavLink>
            </>
          )}

          <NavLink
            to="/notifications"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <Bell size={18} />
            <span>Notifications</span>
          </NavLink>

          <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
            <div className="nav-section-title">Settings</div>
            <NavLink
              to="/profile"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <User size={18} />
              <span>Profile</span>
            </NavLink>

            <button
              onClick={handleLogout}
              className="nav-link"
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                color: '#FF626C',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <LogOut size={18} />
              <span>Log Out</span>
            </button>
          </div>
        </nav>

        {/* User Profile Section at Bottom */}
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(22, 136, 255, 0.15)',
                border: '1px solid rgba(22, 136, 255, 0.3)',
                color: '#1688FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.8125rem',
                flexShrink: 0
              }}
            >
              {userInitials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {user?.name}
              </div>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  padding: '0.1rem 0.45rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: roleInfo.bg,
                  color: roleInfo.color,
                  border: roleInfo.border,
                  marginTop: '0.15rem'
                }}
              >
                {roleInfo.label}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="btn-ghost"
              style={{
                padding: '0.4rem',
                color: '#A6B0BE',
                display: 'flex',
                alignItems: 'center'
              }}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            {/* Breadcrumb Navigation */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }} aria-label="Breadcrumb">
              <span style={{ fontWeight: 600, color: '#A6B0BE' }}>ResolveX</span>
              <ChevronRight size={13} style={{ color: '#6E7C91' }} />
              <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{pageMeta.breadcrumb}</span>
            </nav>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Real-time DB indicator */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.3rem 0.7rem',
                backgroundColor: 'rgba(25, 214, 154, 0.1)',
                border: '1px solid rgba(25, 214, 154, 0.25)',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: '#19D69A'
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: '#19D69A',
                  boxShadow: '0 0 6px #19D69A'
                }}
              />
              <span>System Operational</span>
            </div>

            {/* Real-time Notification Bell */}
            <NotificationBell />

            {/* User Avatar & Info Pill */}
            <Link
              to="/profile"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.35rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)'
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: '#1688FF',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}
              >
                {userInitials}
              </div>
              <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#FFFFFF' }}>
                  {user?.name?.split(' ')[0]}
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#A6B0BE' }}>
                  {roleInfo.label}
                </div>
              </div>
            </Link>
          </div>
        </header>

        {/* Content Body */}
        <main className="content-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
