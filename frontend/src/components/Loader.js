import React from 'react';
import '../styles/neumorphism.css';

const Loader = ({ size = 'medium' }) => {
  const sizeClasses = {
    small: 'w-10 h-10',
    medium: 'w-16 h-16',
    large: 'w-20 h-20'
  };

  return (
    <div className="flex items-center justify-center py-12">
      <div className="relative">
        {/* Внешний вращающийся круг с градиентом */}
        <div 
          className={`${sizeClasses[size]} rounded-full relative`}
          style={{
            background: 'conic-gradient(from 0deg, #3B82F6 0deg, #60A5FA 90deg, #93C5FD 180deg, #DBEAFE 270deg, #3B82F6 360deg)',
            animation: 'spin 1.2s linear infinite'
          }}
        >
          {/* Внутренний белый круг для создания кольца */}
          <div 
            className="absolute inset-[3px] rounded-full bg-gradient-to-br from-blue-50 via-white to-blue-50"
            style={{
              boxShadow: 'inset 0 2px 8px rgba(59, 130, 246, 0.1)'
            }}
          />
        </div>

        {/* Пульсирующий внешний эффект */}
        <div 
          className={`absolute inset-0 ${sizeClasses[size]} rounded-full bg-blue-400/20`}
          style={{
            animation: 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            filter: 'blur(8px)'
          }}
        />

        {/* Центральная точка */}
        <div 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600"
          style={{
            animation: 'pulse-dot 1.5s ease-in-out infinite',
            boxShadow: '0 0 12px rgba(59, 130, 246, 0.5)'
          }}
        />
      </div>

      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        @keyframes pulse-ring {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.15);
          }
        }
        
        @keyframes pulse-dot {
          0%, 100% {
            opacity: 0.8;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.2);
          }
        }
      `}</style>
    </div>
  );
};

export default Loader;
