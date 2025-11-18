import React from 'react';
import '../styles/neumorphism.css';

const Loader = ({ text = 'Загрузка...', fullScreen = false, size = 'medium' }) => {
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-16 h-16'
  };

  const containerClass = fullScreen 
    ? 'fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 z-50'
    : 'flex flex-col items-center justify-center py-8';

  return (
    <div className={containerClass}>
      {/* Loader с двумя галочками в стиле 2tick */}
      <div className="relative">
        {/* Neumorphic круг */}
        <div className={`${sizeClasses[size]} rounded-full bg-white shadow-lg relative overflow-hidden`}
          style={{
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1), inset 0 -2px 4px rgba(0, 0, 0, 0.05)'
          }}
        >
          {/* Анимированный градиентный фон */}
          <div 
            className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600"
            style={{
              animation: 'spin 1.5s linear infinite',
              clipPath: 'polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 50% 100%)'
            }}
          />
          
          {/* Иконка 2tick */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg width="60%" height="60%" viewBox="0 0 32 32">
              <path d="M10 16 L14 20 L22 12" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 16 L18 20 L26 12" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
            </svg>
          </div>
        </div>
        
        {/* Пульсирующий эффект вокруг */}
        <div 
          className={`absolute inset-0 ${sizeClasses[size]} rounded-full bg-blue-500/20`}
          style={{
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}
        />
      </div>
      
      {/* Текст загрузки */}
      {text && (
        <p className="mt-6 text-base font-semibold text-gray-700 animate-pulse">
          {text}
        </p>
      )}
      
      {/* Анимированные точки */}
      <div className="flex gap-1.5 mt-3">
        <div 
          className="w-2 h-2 rounded-full bg-blue-500"
          style={{
            animation: 'bounce 1s infinite',
            animationDelay: '0s'
          }}
        />
        <div 
          className="w-2 h-2 rounded-full bg-blue-500"
          style={{
            animation: 'bounce 1s infinite',
            animationDelay: '0.2s'
          }}
        />
        <div 
          className="w-2 h-2 rounded-full bg-blue-500"
          style={{
            animation: 'bounce 1s infinite',
            animationDelay: '0.4s'
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
        
        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.1);
          }
        }
        
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }
      `}</style>
    </div>
  );
};

export default Loader;
