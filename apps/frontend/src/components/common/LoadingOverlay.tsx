import React from 'react';
import { useLoading } from '../../context/LoadingContext';

export interface LoadingOverlayProps {
  defaultMessage?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ defaultMessage = 'Procesando...' }) => {
  const { isLoading, message } = useLoading();

  if (!isLoading) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        userSelect: 'none',
        pointerEvents: 'all',
        touchAction: 'none',
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          padding: '24px 32px',
          borderRadius: '18px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px',
          maxWidth: '85vw',
          textAlign: 'center',
          border: '1px solid #E2E8F0',
        }}
      >
        <div
          style={{
            width: '42px',
            height: '42px',
            border: '4px solid #E2E8F0',
            borderTopColor: '#10B981',
            borderRadius: '50%',
            animation: 'ff-spin 0.8s linear infinite',
          }}
        />
        <style>
          {`
            @keyframes ff-spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
        <span
          style={{
            fontSize: '15px',
            fontWeight: '700',
            color: '#0F172A',
            letterSpacing: '-0.2px',
          }}
        >
          {message || defaultMessage}
        </span>
      </div>
    </div>
  );
};

export default LoadingOverlay;
