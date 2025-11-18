import React from 'react';
import '../styles/neumorphism.css';

const Loader = ({ size = 'medium' }) => {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="space-y-4 w-64">
        {/* Первая линия - длинная */}
        <div className="h-4 bg-gray-200 rounded-md overflow-hidden relative">
          <div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-50"
            style={{
              animation: 'shimmer 1.5s infinite'
            }}
          />
        </div>

        {/* Вторая линия - средняя */}
        <div className="h-4 bg-gray-200 rounded-md overflow-hidden relative w-5/6">
          <div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-50"
            style={{
              animation: 'shimmer 1.5s infinite',
              animationDelay: '0.2s'
            }}
          />
        </div>

        {/* Третья линия - короткая */}
        <div className="h-4 bg-gray-200 rounded-md overflow-hidden relative w-3/4">
          <div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-50"
            style={{
              animation: 'shimmer 1.5s infinite',
              animationDelay: '0.4s'
            }}
          />
        </div>

        {/* Четвертая линия - средняя */}
        <div className="h-4 bg-gray-200 rounded-md overflow-hidden relative w-4/5">
          <div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-50"
            style={{
              animation: 'shimmer 1.5s infinite',
              animationDelay: '0.6s'
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
};

export default Loader;
