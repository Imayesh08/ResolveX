import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Shield,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Users,
  Layers,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Cpu,
  Eye
} from 'lucide-react';
import BrandLogo from '../components/BrandLogo';

const LandingPage = () => {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#030405', color: '#F5F7FA', overflowX: 'hidden' }}>
      {/* Background Cinematic Luminous Lighting */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100vw',
          maxWidth: 1400,
          height: 600,
          background: 'radial-gradient(ellipse at 50% -10%, rgba(22, 136, 255, 0.22) 0%, rgba(22, 136, 255, 0.05) 50%, transparent 80%)',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />

      {/* Top Navigation */}
      <header
        style={{
          height: 74,
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(3, 4, 5, 0.75)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2.5rem',
          position: 'sticky',
          top: 0,
          zIndex: 40
        }}
      >
        <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
          <BrandLogo size={32} showText={true} />
        </Link>

        {/* Center Nav Links */}
        <nav
          style={{
            display: 'flex',
            gap: '2rem',
            alignItems: 'center',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#A6B0BE'
          }}
          className="desktop-nav"
        >
          <a href="#features" style={{ transition: 'color 0.15s ease' }} className="nav-hover">
            Features
          </a>
          <a href="#workflow" style={{ transition: 'color 0.15s ease' }} className="nav-hover">
            How It Works
          </a>
          <a href="#roles" style={{ transition: 'color 0.15s ease' }} className="nav-hover">
            Roles
          </a>
          <a href="#contact" style={{ transition: 'color 0.15s ease' }} className="nav-hover">
            Contact
          </a>
        </nav>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link
            to="/login"
            className="btn btn-ghost btn-sm"
            style={{ color: '#F5F7FA', border: '1px solid rgba(255, 255, 255, 0.1)' }}
          >
            Sign In
          </Link>
          <Link to="/register" className="btn btn-primary btn-sm">
            Register as Customer
          </Link>
        </div>
      </header>

      {/* ====================================================================
          Hero Section: "Every issue. A clearer resolution."
          ==================================================================== */}
      <section
        style={{
          padding: '5rem 2.5rem 6.5rem 2.5rem',
          maxWidth: 1320,
          margin: '0 auto',
          position: 'relative',
          zIndex: 1
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)',
            gap: '3.5rem',
            alignItems: 'center'
          }}
          className="hero-grid"
        >
          {/* Left Hero Content */}
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.3rem 0.85rem',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(22, 136, 255, 0.1)',
                border: '1px solid rgba(22, 136, 255, 0.3)',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#4BA2FF',
                marginBottom: '1.75rem',
                boxShadow: '0 0 12px rgba(22, 136, 255, 0.2)'
              }}
            >
              <Sparkles size={14} />
              Enterprise Complaint Intelligence Platform
            </div>

            {/* Headline matching reference + test requirement */}
            <h1
              style={{
                fontSize: 'clamp(2.75rem, 5.2vw, 4.25rem)',
                fontWeight: 900,
                lineHeight: 1.08,
                letterSpacing: '-0.035em',
                color: '#FFFFFF',
                marginBottom: '1.5rem'
              }}
            >
              Every issue.<br />
              <span
                style={{
                  background: 'linear-gradient(135deg, #1688FF 0%, #68B4FF 60%, #19D69A 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 0 30px rgba(22, 136, 255, 0.4)'
                }}
              >
                A clearer resolution.
              </span>
              <span className="sr-only"> Enterprise Customer Complaint Management System</span>
            </h1>

            <p
              style={{
                fontSize: '1.125rem',
                lineHeight: 1.6,
                color: '#A6B0BE',
                marginBottom: '2.25rem',
                maxWidth: 540
              }}
            >
              ResolveX provides end-to-end transparency for customer grievances, real-time investigative triaging for support teams, and complete operational governance for administrators.
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Link to="/register" className="btn btn-primary btn-lg">
                Get Started <ArrowRight size={18} />
              </Link>
              <Link to="/complaints" className="btn btn-secondary btn-lg">
                Track a Complaint
              </Link>
            </div>

            {/* Quick Metrics */}
            <div
              style={{
                display: 'flex',
                gap: '2rem',
                marginTop: '3rem',
                paddingTop: '2rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF' }}>100%</div>
                <div style={{ fontSize: '0.78125rem', color: '#A6B0BE' }}>Audit Traceability</div>
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1688FF' }}>&lt; 2h</div>
                <div style={{ fontSize: '0.78125rem', color: '#A6B0BE' }}>Average Triage Velocity</div>
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#19D69A' }}>Real-time</div>
                <div style={{ fontSize: '0.78125rem', color: '#A6B0BE' }}>MongoDB Persistence</div>
              </div>
            </div>
          </div>

          {/* Right Cinematic Visual: Floating Dark Complaint Card & Blue Horizon */}
          <div style={{ position: 'relative' }}>
            {/* Ambient Blue Planetary Horizon Sphere */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 380,
                height: 380,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(22, 136, 255, 0.28) 0%, rgba(22, 136, 255, 0.08) 50%, transparent 70%)',
                filter: 'blur(20px)',
                pointerEvents: 'none'
              }}
            />

            {/* Floating Dark Complaint Card */}
            <div
              style={{
                backgroundColor: '#101720',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(22, 136, 255, 0.3)',
                boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.8), 0 0 24px rgba(22, 136, 255, 0.25)',
                padding: '1.75rem',
                position: 'relative',
                zIndex: 2,
                backdropFilter: 'blur(12px)'
              }}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      color: '#4BA2FF',
                      backgroundColor: 'rgba(22, 136, 255, 0.12)',
                      padding: '0.25rem 0.6rem',
                      borderRadius: 'var(--radius-xs)',
                      border: '1px solid rgba(22, 136, 255, 0.3)'
                    }}
                  >
                    RX-20261011-0001
                  </span>
                  <span className="badge badge-in_progress">
                    <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#FFB547' }} />
                    In Progress
                  </span>
                </div>
                <span className="badge badge-urgent">
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#FF626C' }} />
                  Urgent
                </span>
              </div>

              {/* Title & Category */}
              <h3 style={{ fontSize: '1.1875rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.4rem' }}>
                Payment Gateway Settlement Timeout
              </h3>
              <p style={{ fontSize: '0.8125rem', color: '#A6B0BE', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                Double debit observed during high-velocity checkout. Customer requested automated refund reversal.
              </p>

              {/* Connected Status Timeline */}
              <div
                style={{
                  backgroundColor: '#0B1017',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  border: '1px solid rgba(255, 255, 255, 0.06)'
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6E7C91', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem' }}>
                  Live Resolution Journey
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#19D69A', boxShadow: '0 0 8px #19D69A' }} />
                    <span style={{ fontSize: '0.8125rem', color: '#FFFFFF', fontWeight: 500 }}>Ticket Received & Parsed</span>
                    <span style={{ fontSize: '0.72rem', color: '#6E7C91', marginLeft: 'auto' }}>10:10 AM</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#1688FF', boxShadow: '0 0 8px #1688FF' }} />
                    <span style={{ fontSize: '0.8125rem', color: '#FFFFFF', fontWeight: 500 }}>Assigned to Priya (Technical Specialist)</span>
                    <span style={{ fontSize: '0.72rem', color: '#6E7C91', marginLeft: 'auto' }}>10:12 AM</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#FFB547', boxShadow: '0 0 8px #FFB547' }} />
                    <span style={{ fontSize: '0.8125rem', color: '#FFC062', fontWeight: 600 }}>Active Diagnostic In Progress</span>
                    <span style={{ fontSize: '0.72rem', color: '#6E7C91', marginLeft: 'auto' }}>Live</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          Section 2: "One place for every issue." (Dashboard Preview)
          ==================================================================== */}
      <section
        id="features"
        style={{
          padding: '6rem 2.5rem',
          backgroundColor: '#090D12',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#1688FF',
                textTransform: 'uppercase',
                letterSpacing: '0.08em'
              }}
            >
              Unified Control Room
            </span>
            <h2
              style={{
                fontSize: '2.5rem',
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: '-0.025em',
                marginTop: '0.4rem'
              }}
            >
              One place for every issue.
            </h2>
            <p style={{ color: '#A6B0BE', fontSize: '1rem', maxWidth: 580, margin: '0.75rem auto 0 auto' }}>
              Centralize support requests from every channel into an immutable, searchable database with instant role triage.
            </p>
          </div>

          {/* Realistic Dashboard Preview Surface */}
          <div
            style={{
              backgroundColor: '#101720',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(22, 136, 255, 0.25)',
              boxShadow: '0 24px 60px -10px rgba(0, 0, 0, 0.9), 0 0 30px rgba(22, 136, 255, 0.15)',
              overflow: 'hidden'
            }}
          >
            {/* Mock Topbar */}
            <div
              style={{
                height: 52,
                backgroundColor: '#0B1017',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 1.5rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#FF626C' }} />
                  <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#FFB547' }} />
                  <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#19D69A' }} />
                </div>
                <span style={{ fontSize: '0.8125rem', color: '#6E7C91', fontFamily: 'var(--font-mono)' }}>
                  resolvex.local/dashboard/triage
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.75rem',
                  color: '#19D69A',
                  backgroundColor: 'rgba(25, 214, 154, 0.1)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: 'var(--radius-full)'
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#19D69A' }} />
                MongoDB 127.0.0.1 Connected
              </div>
            </div>

            {/* Mock Dashboard Body */}
            <div style={{ padding: '1.75rem' }}>
              {/* Search Bar Preview */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  backgroundColor: '#090D12',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  marginBottom: '1.5rem',
                  color: '#6E7C91',
                  fontSize: '0.875rem'
                }}
              >
                <Search size={16} />
                <span>Filter by ticket #, description, customer identity, or status...</span>
              </div>

              {/* Sample Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  {
                    id: 'RX-20261011-0001',
                    title: 'Database connection pooling exhaustion during sync',
                    category: 'Technical Issue',
                    pri: 'HIGH',
                    status: 'IN_PROGRESS',
                    badgePri: 'badge-high',
                    badgeStatus: 'badge-in_progress'
                  },
                  {
                    id: 'RX-20261011-0002',
                    title: 'Incorrect invoice computation for enterprise license',
                    category: 'Billing and Payment',
                    pri: 'MEDIUM',
                    status: 'RESOLVED',
                    badgePri: 'badge-medium',
                    badgeStatus: 'badge-resolved'
                  },
                  {
                    id: 'RX-20261011-0003',
                    title: 'Single Sign-On SAML assertion certificate error',
                    category: 'Account Access',
                    pri: 'URGENT',
                    status: 'OPEN',
                    badgePri: 'badge-urgent',
                    badgeStatus: 'badge-open'
                  }
                ].map((row) => (
                  <div
                    key={row.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1rem 1.25rem',
                      backgroundColor: '#151D27',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid rgba(255, 255, 255, 0.06)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span className="ticket-number-cell">{row.id}</span>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#FFFFFF' }}>{row.title}</div>
                        <span style={{ fontSize: '0.75rem', color: '#6E7C91' }}>{row.category}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span className={`badge ${row.badgePri}`}>{row.pri}</span>
                      <span className={`badge ${row.badgeStatus}`}>{row.status.replace(/_/g, ' ')}</span>
                      <span className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.6rem' }}>
                        <Eye size={13} /> View
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          Section 3: "From submitted to resolved." (Status Journey)
          ==================================================================== */}
      <section
        id="workflow"
        style={{
          padding: '6rem 2.5rem',
          maxWidth: 1200,
          margin: '0 auto',
          position: 'relative'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#19D69A',
              textTransform: 'uppercase',
              letterSpacing: '0.08em'
            }}
          >
            Lifecycle Architecture
          </span>
          <h2
            style={{
              fontSize: '2.5rem',
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '-0.025em',
              marginTop: '0.4rem'
            }}
          >
            From submitted to resolved.
          </h2>
          <p style={{ color: '#A6B0BE', fontSize: '1rem', maxWidth: 540, margin: '0.75rem auto 0 auto' }}>
            Deterministic status progression ensures every complaint transitions with accountability and audit logs.
          </p>
        </div>

        {/* 4 Step Horizontal / Vertical Journey */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.5rem',
            position: 'relative'
          }}
        >
          {[
            {
              step: '01',
              title: 'Open',
              desc: 'Complaint submitted by verified customer. Deterministic ticket ID generated and stored in MongoDB.',
              color: '#1688FF',
              badgeClass: 'badge-open'
            },
            {
              step: '02',
              title: 'Assigned',
              desc: 'Admin routes ticket to specialized support engineer based on department domain expertise.',
              color: '#9D4EDD',
              badgeClass: 'badge-assigned'
            },
            {
              step: '03',
              title: 'In Progress',
              desc: 'Specialist actively investigates, logs internal notes, and coordinates remediation steps.',
              color: '#FFB547',
              badgeClass: 'badge-in_progress'
            },
            {
              step: '04',
              title: 'Resolved',
              desc: 'Remedy verified and published. Customer reviews resolution summary with reopen rights.',
              color: '#19D69A',
              badgeClass: 'badge-resolved'
            }
          ].map((item) => (
            <div
              key={item.step}
              style={{
                backgroundColor: '#101720',
                borderRadius: 'var(--radius-md)',
                padding: '2rem 1.5rem',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                position: 'relative',
                transition: 'var(--transition-smooth)'
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  color: item.color,
                  marginBottom: '1rem'
                }}
              >
                PHASE {item.step}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span className={`badge ${item.badgeClass}`}>{item.title}</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#A6B0BE', lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ====================================================================
          Section 4: "Designed for every role." (Role Architecture)
          ==================================================================== */}
      <section
        id="roles"
        style={{
          padding: '6rem 2.5rem',
          backgroundColor: '#090D12',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)'
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#1688FF',
                textTransform: 'uppercase',
                letterSpacing: '0.08em'
              }}
            >
              Access Governance
            </span>
            <h2
              style={{
                fontSize: '2.5rem',
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: '-0.025em',
                marginTop: '0.4rem'
              }}
            >
              Designed for every role.
            </h2>
            <p style={{ color: '#A6B0BE', fontSize: '1rem', maxWidth: 620, margin: '0.75rem auto 0 auto' }}>
              Built for Three Distinct Stakeholders with cryptographically verified JSON Web Token role separation.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.75rem'
            }}
          >
            {/* Customer Role */}
            <div
              style={{
                backgroundColor: '#101720',
                borderRadius: 'var(--radius-lg)',
                padding: '2.25rem 2rem',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: 'var(--shadow-card)'
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(25, 214, 154, 0.12)',
                  color: '#19D69A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem'
                }}
              >
                <Users size={22} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.5rem' }}>
                Customer Experience
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#A6B0BE', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Self-service complaint submission, real-time progression tracking, verified resolution details, and one-click reopening.
              </p>
              <Link to="/register" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
                Create Customer Account <ArrowRight size={14} />
              </Link>
            </div>

            {/* Support Staff Role */}
            <div
              style={{
                backgroundColor: '#101720',
                borderRadius: 'var(--radius-lg)',
                padding: '2.25rem 2rem',
                border: '1px solid rgba(22, 136, 255, 0.3)',
                boxShadow: '0 0 20px rgba(22, 136, 255, 0.15)'
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(22, 136, 255, 0.15)',
                  color: '#1688FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem'
                }}
              >
                <Clock size={22} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.5rem' }}>
                Support Specialists
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#A6B0BE', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Assigned queue focus, internal notes documentation, lifecycle status transitions, and customer resolution publishing.
              </p>
              <Link to="/login" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
                Support Staff Portal <ArrowRight size={14} />
              </Link>
            </div>

            {/* Admin Role */}
            <div
              style={{
                backgroundColor: '#101720',
                borderRadius: 'var(--radius-lg)',
                padding: '2.25rem 2rem',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: 'var(--shadow-card)'
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(255, 98, 108, 0.12)',
                  color: '#FF626C',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem'
                }}
              >
                <Shield size={22} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.5rem' }}>
                System Administrators
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#A6B0BE', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Executive telemetry, workload dispatching, user governance, account state toggle, and soft-delete archiving.
              </p>
              <Link to="/login" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
                Administrator Login <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          CTA Banner & Footer
          ==================================================================== */}
      <section
        id="contact"
        style={{
          padding: '6rem 2.5rem',
          textAlign: 'center',
          backgroundColor: '#030405',
          position: 'relative'
        }}
      >
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.025em', marginBottom: '1rem' }}>
            Ready for a clearer resolution?
          </h2>
          <p style={{ color: '#A6B0BE', fontSize: '1.0625rem', marginBottom: '2.25rem', lineHeight: 1.6 }}>
            Experience transparent complaint tracking backed by verified MongoDB records and real-time JWT authentication.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn btn-primary btn-lg">
              Get Started Now <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn btn-secondary btn-lg">
              Access Portal
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: '#090D12',
          padding: '2.5rem',
          textAlign: 'center',
          fontSize: '0.8125rem',
          color: '#6E7C91'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <BrandLogo size={26} showText={true} />
        </div>
        <p>
          ResolveX &bull; MSc AI & ML Full Stack Web Development CAT-II Assessment &bull; CIT Coimbatore
        </p>
        <p style={{ marginTop: '0.35rem', color: '#4B5563' }}>
          MongoDB &bull; Express.js &bull; React.js &bull; Node.js
        </p>
      </footer>

      <style>{`
        .nav-hover:hover {
          color: #FFFFFF !important;
        }
        @media (max-width: 900px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
          }
          .desktop-nav {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
