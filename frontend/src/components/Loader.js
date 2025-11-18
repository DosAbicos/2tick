import React from 'react';
import '../styles/neumorphism.css';

const Loader = ({ size = 'medium' }) => {
  const sizeConfig = {
    small: { width: 48, height: 48, strokeWidth: 3 },
    medium: { width: 64, height: 64, strokeWidth: 4 },
    large: { width: 80, height: 80, strokeWidth: 5 }
  };

  const config = sizeConfig[size];

  return (
    <div className="flex items-center justify-center py-12">
      <svg 
        width={config.width} 
        height={config.height} 
        viewBox="0 0 64 64"
        style={{ animation: 'container-bounce 2s ease-in-out 1.4s' }}
      >
        {/* Первая галочка */}
        <path
          d="M16 32 L24 40 L40 24"
          fill="none"
          stroke="#3B82F6"
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 40,
            strokeDashoffset: 40,
            animation: 'draw-tick 0.6s ease-out forwards'
          }}
        />
        
        {/* Вторая галочка (с небольшим смещением) */}
        <path
          d="M24 32 L32 40 L48 24"
          fill="none"
          stroke="#60A5FA"
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 40,
            strokeDashoffset: 40,
            animation: 'draw-tick 0.6s ease-out 0.4s forwards'
          }}
        />

        {/* Круг вокруг для акцента */}
        <circle
          cx="32"
          cy="32"
          r="28"
          fill="none"
          stroke="#DBEAFE"
          strokeWidth="2"
          style={{
            opacity: 0,
            animation: 'fade-in-circle 0.3s ease-out 1.2s forwards'
          }}
        />
      </svg>

      <style>{`
        @keyframes draw-tick {
          0% {
            stroke-dashoffset: 40;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
        }

        @keyframes fade-in-circle {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          50% {
            opacity: 0.3;
          }
          100% {
            opacity: 0.2;
            transform: scale(1);
          }
        }

        @keyframes container-bounce {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-10px) scale(1.05);
          }
        }
      `}</style>
    </div>
  );
};

export default Loader;
