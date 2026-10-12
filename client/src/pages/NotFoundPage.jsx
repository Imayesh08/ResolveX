import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ArrowLeft } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';

const NotFoundPage = () => {
  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2.5rem 1.5rem',
        backgroundColor: '#030405'
      }}
    >
      <div style={{ marginBottom: '1.5rem' }}>
        <BrandLogo size={42} showText={true} />
      </div>

      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          backgroundColor: 'rgba(22, 136, 255, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#1688FF',
          marginBottom: '1.25rem',
          boxShadow: '0 0 20px rgba(22, 136, 255, 0.3)'
        }}
      >
        <HelpCircle size={36} />
      </div>

      <h1
        style={{
          fontSize: '3.5rem',
          fontWeight: 800,
          color: '#FFFFFF',
          letterSpacing: '-0.03em',
          lineHeight: 1
        }}
      >
        404
      </h1>
      <p style={{ fontSize: '1.125rem', color: '#A6B0BE', marginTop: '0.75rem', marginBottom: '2rem', maxWidth: 460 }}>
        The requested resource, route, or ticket record could not be found in the ResolveX registry.
      </p>
      <Link to="/dashboard" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
        <ArrowLeft size={16} /> Return to Dashboard
      </Link>
    </div>
  );
};

export default NotFoundPage;
