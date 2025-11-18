import React from 'react';
import '../styles/neumorphism.css';

const Loader = ({ size = 'medium' }) => {
  const sizeClasses = {
    small: 'w-8 h-8 border-2',
    medium: 'w-12 h-12 border-3',
    large: 'w-16 h-16 border-4'
  };

  return (
    <div className="flex items-center justify-center py-12">
      <div 
        className={`${sizeClasses[size]} rounded-full border-blue-500 border-t-transparent`}
        style={{
          animation: 'spin 0.8s linear infinite'
        }}
      />

      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default Loader;
