import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  PlusCircle,
  Eye,
  ArrowRight,
  ShieldCheck,
  Search,
  Activity,
  Layers,
  Inbox,
  Star,
  MessageSquare,
  ThumbsUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const DashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [feedbackAnalytics, setFeedbackAnalytics] = useState(null);
  const [duplicateAnalytics, setDuplicateAnalytics] = useState(null);
  const [customerComplaints, setCustomerComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (user.role === 'admin') {
          const [statsRes, fbRes, dupRes] = await Promise.all([
            api.get('/complaints/stats/overview'),
            api.get('/feedback/analytics').catch(() => ({ data: { data: null } })),
            api.get('/complaints/stats/duplicates').catch(() => ({ data: { data: null } }))
          ]);
          setStats(statsRes.data.data);
          setFeedbackAnalytics(fbRes.data?.data || null);
          setDuplicateAnalytics(dupRes.data?.data || null);
        } else if (user.role === 'staff') {
          const statsRes = await api.get('/complaints/stats/overview');
          setStats(statsRes.data.data);
        } else {
          // Customer dashboard: fetch recent complaints
          const res = await api.get('/complaints?limit=6');
          setCustomerComplaints(res.data.data.complaints);
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
        setError('Failed to load dashboard metrics. Please verify connectivity.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user.role]);

  if (loading) return <LoadingSpinner message="Querying real-time database telemetry..." />;

  if (error) {
    return (
      <div
        style={{
          padding: '3rem 2rem',
          textAlign: 'center',
          backgroundColor: 'var(--color-card)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          margin: '2rem 0'
        }}
      >
        <AlertTriangle size={36} style={{ color: '#FF626C', margin: '0 auto 1rem auto' }} />
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#FFFFFF' }}>
          System Telemetry Unavailable
        </h3>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: '0.35rem' }}>{error}</p>
        <button
          className="btn btn-secondary"
          onClick={() => window.location.reload()}
          style={{ marginTop: '1.25rem' }}
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // ==========================================
  // CUSTOMER DASHBOARD
  // ==========================================
  if (user.role === 'customer') {
    const openCount = customerComplaints.filter((c) => ['OPEN', 'ASSIGNED'].includes(c.status)).length;
    const inProgressCount = customerComplaints.filter((c) => c.status === 'IN_PROGRESS').length;
    const resolvedCount = customerComplaints.filter((c) => ['RESOLVED', 'CLOSED'].includes(c.status)).length;

    return (
      <div>
        {/* Customer Header */}
        <section
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1.25rem',
            padding: '1.75rem 2rem',
            backgroundColor: 'var(--color-card)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-card)'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '0.2rem 0.6rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'rgba(25, 214, 154, 0.12)',
                  color: '#19D69A'
                }}
              >
                Customer Portal
              </span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>
                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: '-0.025em'
              }}
            >
              Welcome back, {user.name}
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Track your submitted complaints and monitor real-time resolution updates.
            </p>
          </div>

          <Link to="/complaints/new" className="btn btn-primary" style={{ padding: '0.75rem 1.35rem' }}>
            <PlusCircle size={18} /> Submit New Complaint
          </Link>
        </section>

        {/* Customer KPI Stat Grid */}
        <div className="stat-grid">
          <StatCard
            title="Open / Awaiting Action"
            value={openCount}
            icon={FileText}
            color="blue"
            subtext="Tickets currently in queue"
          />
          <StatCard
            title="In Progress"
            value={inProgressCount}
            icon={Clock}
            color="amber"
            subtext="Assigned specialist active"
          />
          <StatCard
            title="Resolved Complaints"
            value={resolvedCount}
            icon={CheckCircle2}
            color="green"
            subtext="Verified resolution provided"
          />
        </div>

        {/* Recent Complaints Table */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Recent Complaints</h2>
              <p className="card-subtitle">Real-time status updates from the ResolveX support engine</p>
            </div>
            <Link
              to="/complaints"
              style={{
                fontSize: '0.8125rem',
                color: 'var(--color-electric-blue)',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              View All <ArrowRight size={14} />
            </Link>
          </div>

          {customerComplaints.length === 0 ? (
            <EmptyState
              title="No complaints lodged yet"
              description="You have not submitted any complaints yet. If you are experiencing issues, submit a ticket now."
              action={
                <Link to="/complaints/new" className="btn btn-primary btn-sm">
                  <PlusCircle size={15} /> Submit Your First Complaint
                </Link>
              }
            />
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ticket #</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {customerComplaints.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <span className="ticket-number-cell">{item.ticketNumber}</span>
                      </td>
                      <td style={{ fontWeight: 600, color: '#FFFFFF' }}>{item.title}</td>
                      <td>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                          {item.category}
                        </span>
                      </td>
                      <td><PriorityBadge priority={item.priority} /></td>
                      <td><StatusBadge status={item.status} /></td>
                      <td style={{ color: 'var(--color-text-tertiary)', fontSize: '0.8125rem' }}>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link to={`/complaints/${item._id}`} className="btn btn-secondary btn-sm">
                          <Eye size={13} /> View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // ADMIN & STAFF DASHBOARD (Matching Lower-Left Reference Panel)
  // ==========================================
  const byStatus = stats?.byStatus || {};
  const byPriority = stats?.byPriority || {};
  const recentList = stats?.recentComplaints || [];
  const total = stats?.totalComplaints || 0;
  const openCount = (byStatus.OPEN || 0) + (byStatus.ASSIGNED || 0);
  const inProgressCount = byStatus.IN_PROGRESS || 0;
  const resolvedCount = (byStatus.RESOLVED || 0) + (byStatus.CLOSED || 0);

  return (
    <div>
      {/* Dashboard Header matching reference */}
      <section
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1.25rem',
          padding: '1.75rem 2rem',
          backgroundColor: 'var(--color-card)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-full)',
                backgroundColor:
                  user.role === 'admin' ? 'rgba(255, 98, 108, 0.15)' : 'rgba(22, 136, 255, 0.15)',
                color: user.role === 'admin' ? '#FF626C' : '#4BA2FF'
              }}
            >
              {user.role === 'admin' ? 'Administrator' : 'Support Specialist'}
            </span>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>
              Real-time Database Telemetry
            </span>
          </div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '-0.025em'
            }}
          >
            {user.role === 'admin' ? 'Admin Dashboard' : 'Support Staff Console'}
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {user.role === 'admin'
              ? 'Operational overview of all complaints, specialist assignments, and resolution velocity.'
              : 'Assigned complaint queue, active investigations, and verified resolution summaries.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/complaints" className="btn btn-primary" style={{ padding: '0.75rem 1.35rem' }}>
            <Layers size={17} /> View All Complaints
          </Link>
        </div>
      </section>

      {/* KPI Cards: Total Complaints, Open, In Progress, Resolved */}
      <div className="stat-grid">
        <StatCard
          title="Total Complaints"
          value={total}
          icon={FileText}
          color="blue"
          subtext="Total records in database"
        />
        <StatCard
          title="Open"
          value={openCount}
          icon={Activity}
          color="rose"
          subtext="Awaiting investigation"
        />
        <StatCard
          title="In Progress"
          value={inProgressCount}
          icon={Clock}
          color="amber"
          subtext="Specialist actively investigating"
        />
        <StatCard
          title="Resolved"
          value={resolvedCount}
          icon={CheckCircle2}
          color="green"
          subtext={`${stats?.resolutionRate || '0%'} resolution rate`}
        />
      </div>

      {/* Distribution Panels */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}
      >
        {/* Status Distribution */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div>
              <h2 className="card-title">Status Breakdown</h2>
              <p className="card-subtitle">Distribution across resolution lifecycle states</p>
            </div>
            <Activity size={18} style={{ color: 'var(--color-electric-blue)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED'].map((statusKey) => {
              const count = byStatus[statusKey] || 0;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={statusKey}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <StatusBadge status={statusKey} />
                    <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#FFFFFF' }}>
                      {count} <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400 }}>({pct}%)</span>
                    </span>
                  </div>
                  <div style={{ height: 5, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        backgroundColor:
                          statusKey === 'RESOLVED' || statusKey === 'CLOSED'
                            ? '#19D69A'
                            : statusKey === 'IN_PROGRESS'
                            ? '#FFB547'
                            : '#1688FF',
                        borderRadius: 'var(--radius-full)',
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Severity Breakdown */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div>
              <h2 className="card-title">Priority Breakdown</h2>
              <p className="card-subtitle">Workload distribution ranked by operational severity</p>
            </div>
            <AlertTriangle size={18} style={{ color: '#FFB547' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((priKey) => {
              const count = byPriority[priKey] || 0;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={priKey}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <PriorityBadge priority={priKey} />
                    <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#FFFFFF' }}>
                      {count} <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400 }}>({pct}%)</span>
                    </span>
                  </div>
                  <div style={{ height: 5, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        backgroundColor:
                          priKey === 'URGENT'
                            ? '#FF626C'
                            : priKey === 'HIGH'
                            ? '#FFB547'
                            : priKey === 'MEDIUM'
                            ? '#1688FF'
                            : '#19D69A',
                        borderRadius: 'var(--radius-full)',
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Complaints Table (Matching Lower-Left Reference Panel) */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Recent Complaints</h2>
            <p className="card-subtitle">Real-time incoming complaints and dispatch logs</p>
          </div>
          <Link
            to="/complaints"
            style={{
              fontSize: '0.8125rem',
              color: 'var(--color-electric-blue)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            Manage All <ArrowRight size={14} />
          </Link>
        </div>

        {recentList.length === 0 ? (
          <EmptyState title="No complaints in queue" description="The complaint registry is currently empty." />
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Complaint ID</th>
                  <th>Title</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Created At</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentList.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <span className="ticket-number-cell">{item.ticketNumber}</span>
                    </td>
                    <td style={{ fontWeight: 600, color: '#FFFFFF' }}>{item.title}</td>
                    <td>
                      <div style={{ color: 'var(--color-text-primary)', fontSize: '0.85rem' }}>
                        {item.customer?.name || 'Customer'}
                      </div>
                      <div style={{ color: 'var(--color-text-tertiary)', fontSize: '0.75rem' }}>
                        {item.customer?.email}
                      </div>
                    </td>
                    <td><StatusBadge status={item.status} /></td>
                    <td><PriorityBadge priority={item.priority} /></td>
                    <td style={{ color: 'var(--color-text-tertiary)', fontSize: '0.8125rem' }}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link to={`/complaints/${item._id}`} className="btn btn-secondary btn-sm">
                        <Eye size={13} /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Satisfaction (CSAT) & Feedback Analytics Section for Admin */}
      {user.role === 'admin' && feedbackAnalytics && (
        <div className="card" style={{ marginTop: '2rem' }}>
          <div className="card-header" style={{ marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <h2 className="card-title">Customer Satisfaction & Feedback Analytics</h2>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    padding: '0.15rem 0.55rem',
                    backgroundColor: 'rgba(255, 181, 71, 0.15)',
                    color: '#FFB547',
                    borderRadius: 'var(--radius-full)',
                    fontWeight: 700,
                    border: '1px solid rgba(255, 181, 71, 0.3)'
                  }}
                >
                  CSAT Telemetry
                </span>
              </div>
              <p className="card-subtitle">
                Real-time star ratings and qualitative reviews submitted upon complaint resolution
              </p>
            </div>
            <Star size={20} color="#FFB547" fill="#FFB547" />
          </div>

          {/* Metric Overview Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(220px, 1fr) minmax(320px, 2fr)',
              gap: '1.5rem',
              marginBottom: '1.5rem'
            }}
            className="details-grid-responsive"
          >
            {/* Average Rating Hero Box */}
            <div
              style={{
                padding: '1.5rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-surface-inset)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '3.25rem', fontWeight: 900, color: '#FFFFFF', lineHeight: 1 }}>
                {feedbackAnalytics.averageRating > 0 ? feedbackAnalytics.averageRating.toFixed(1) : 'N/A'}
              </div>
              <div style={{ display: 'flex', gap: '4px', margin: '0.6rem 0' }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={20}
                    fill={s <= Math.round(feedbackAnalytics.averageRating) ? '#FFB547' : 'transparent'}
                    color={s <= Math.round(feedbackAnalytics.averageRating) ? '#FFB547' : '#475569'}
                  />
                ))}
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#94A3B8' }}>
                Average CSAT Score ({feedbackAnalytics.totalFeedback} total reviews)
              </div>
            </div>

            {/* 1-5 Star Breakdown Progress Bars */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-surface-inset)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: '0.6rem'
              }}
            >
              {[5, 4, 3, 2, 1].map((starNum) => {
                const count = feedbackAnalytics.ratingDistribution?.[starNum] || 0;
                const pct =
                  feedbackAnalytics.totalFeedback > 0
                    ? Math.round((count / feedbackAnalytics.totalFeedback) * 100)
                    : 0;
                return (
                  <div key={starNum} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem' }}>
                    <div style={{ width: 45, display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600, color: '#CBD5E1' }}>
                      <span>{starNum}</span> <Star size={12} fill="#FFB547" color="#FFB547" />
                    </div>
                    <div style={{ flex: 1, height: 8, backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: 4, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          backgroundColor: starNum >= 4 ? '#19D69A' : starNum === 3 ? '#FFB547' : '#FF626C',
                          borderRadius: 4,
                          transition: 'width 0.4s ease'
                        }}
                      />
                    </div>
                    <div style={{ width: 65, textAlign: 'right', color: '#94A3B8', fontWeight: 500 }}>
                      {count} ({pct}%)
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Feedback Submissions Table */}
          {feedbackAnalytics.recentFeedback?.length > 0 && (
            <div>
              <h3
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  marginBottom: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <MessageSquare size={14} color="#1688FF" /> Recent Customer Comments
              </h3>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ticket</th>
                      <th>Customer</th>
                      <th>Rating</th>
                      <th>Feedback Comment</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedbackAnalytics.recentFeedback.map((fb) => (
                      <tr key={fb._id}>
                        <td>
                          <Link
                            to={`/complaints/${fb.complaint?._id || fb.complaint}`}
                            className="ticket-number-cell"
                            style={{ textDecoration: 'none' }}
                          >
                            {fb.complaint?.ticketNumber || 'Ticket'}
                          </Link>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#FFFFFF', fontSize: '0.8125rem' }}>
                            {fb.customer?.name || 'Customer'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                            {fb.customer?.email}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                size={12}
                                fill={s <= fb.rating ? '#FFB547' : 'transparent'}
                                color={s <= fb.rating ? '#FFB547' : '#475569'}
                              />
                            ))}
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#FFB547', marginLeft: '4px' }}>
                              {fb.rating}
                            </span>
                          </div>
                        </td>
                        <td style={{ color: fb.comment ? '#CBD5E1' : '#64748B', fontStyle: fb.comment ? 'normal' : 'italic', fontSize: '0.8125rem', maxWidth: 300 }}>
                          {fb.comment || 'No written comment provided'}
                        </td>
                        <td style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                          {new Date(fb.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin Duplicate Analytics Subsystem */}
      {user.role === 'admin' && duplicateAnalytics && (
        <div className="card" style={{ marginTop: '1.75rem' }}>
          <div className="card-header" style={{ marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <h2 className="card-title">Duplicate Complaint & Investigation Analytics</h2>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    padding: '0.15rem 0.55rem',
                    backgroundColor: 'rgba(22, 136, 255, 0.15)',
                    color: '#4BA2FF',
                    borderRadius: 'var(--radius-full)',
                    fontWeight: 700,
                    border: '1px solid rgba(22, 136, 255, 0.3)'
                  }}
                >
                  Dedup Engine
                </span>
              </div>
              <p className="card-subtitle">
                Algorithmic deduplication telemetry, category clustering, and master ticket relationships
              </p>
            </div>
            <Layers size={20} color="var(--color-electric-blue)" />
          </div>

          {/* Duplicate KPI Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}
          >
            <div style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--color-surface-inset)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>CONFIRMED DUPLICATES</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.25rem' }}>
                {duplicateAnalytics.totalDuplicates}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#1688FF', marginTop: '0.25rem' }}>
                {duplicateAnalytics.duplicateRate}% of total tickets
              </div>
            </div>

            <div style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--color-surface-inset)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>MULTI-DUPLICATE PRIMARIES</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FFB547', marginTop: '0.25rem' }}>
                {duplicateAnalytics.multiDuplicatePrimariesCount || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                Master tickets with ≥2 duplicates
              </div>
            </div>

            <div style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--color-surface-inset)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>ACTIVE LOOKBACK CORPUS</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#19D69A', marginTop: '0.25rem' }}>
                {duplicateAnalytics.totalComplaints}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                Indexed complaint candidates
              </div>
            </div>
          </div>

          {/* Categories and Multi-Duplicate Primaries Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(280px, 1fr) minmax(320px, 1.5fr)',
              gap: '1.5rem'
            }}
            className="details-grid-responsive"
          >
            {/* Duplicates by Category */}
            <div style={{ padding: '1.25rem', backgroundColor: 'var(--color-surface-inset)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.85rem' }}>
                Duplicates by Category
              </h3>
              {(!duplicateAnalytics.duplicatesByCategory || duplicateAnalytics.duplicatesByCategory.length === 0) ? (
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
                  No confirmed duplicates categorized yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {duplicateAnalytics.duplicatesByCategory.map((cat, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>{cat.category}</span>
                      <span style={{ fontWeight: 700, color: '#4BA2FF', padding: '0.15rem 0.5rem', backgroundColor: 'rgba(22, 136, 255, 0.1)', borderRadius: 'var(--radius-full)' }}>
                        {cat.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Master Tickets with Multiple Duplicates */}
            <div style={{ padding: '1.25rem', backgroundColor: 'var(--color-surface-inset)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.85rem' }}>
                Primary Master Tickets with Linked Duplicates
              </h3>
              {(!duplicateAnalytics.primaryWithMultipleDuplicates || duplicateAnalytics.primaryWithMultipleDuplicates.length === 0) ? (
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
                  No master tickets currently have multiple linked duplicates.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {duplicateAnalytics.primaryWithMultipleDuplicates.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.8125rem',
                        padding: '0.5rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: 'var(--radius-sm)'
                      }}
                    >
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '0.5rem' }}>
                        <Link to={`/complaints/${item.primaryId}`} style={{ color: '#4BA2FF', fontWeight: 600, textDecoration: 'none' }}>
                          #{item.ticketNumber}
                        </Link>
                        <span style={{ color: 'var(--color-text-secondary)', marginLeft: '0.5rem' }}>
                          {item.title}
                        </span>
                      </div>
                      <span style={{ fontWeight: 700, color: '#FFB547', flexShrink: 0, padding: '0.15rem 0.5rem', backgroundColor: 'rgba(255, 181, 71, 0.15)', borderRadius: 'var(--radius-full)' }}>
                        {item.duplicateCount} linked
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
