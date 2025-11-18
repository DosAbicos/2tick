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
            animation: 'tick-cycle-1 4s ease-in-out infinite',
            transformOrigin: '28px 32px'
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
            animation: 'tick-cycle-2 4s ease-in-out infinite',
            transformOrigin: '36px 32px'
          }}
        />

        {/* Вращающийся круг */}
        <circle
          cx="32"
          cy="32"
          r="20"
          fill="none"
          stroke="#3B82F6"
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          strokeDasharray="126"
          strokeDashoffset="95"
          style={{
            opacity: 0,
            animation: 'circle-appear 4s ease-in-out infinite',
            transformOrigin: 'center'
          }}
        />
      </svg>

      <style>{`
        @keyframes tick-cycle-1 {
          /* Рисование галочки */
          0%, 100% {
            stroke-dashoffset: 40;
            opacity: 0;
            transform: scale(1) rotate(0deg);
          }
          5% {
            opacity: 1;
          }
          15% {
            stroke-dashoffset: 0;
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
          
          /* Подпрыг */
          25% {
            transform: scale(1.1) translateY(-5px) rotate(0deg);
          }
          30% {
            transform: scale(1) translateY(0) rotate(0deg);
          }
          
          /* Превращение в круг */
          40% {
            stroke-dashoffset: 0;
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
          50% {
            stroke-dashoffset: 0;
            opacity: 0;
            transform: scale(0.8) rotate(180deg);
          }
          
          /* Возврат из круга */
          70% {
            stroke-dashoffset: 40;
            opacity: 0;
            transform: scale(0.8) rotate(360deg);
          }
          80% {
            opacity: 1;
          }
          90% {
            stroke-dashoffset: 0;
            opacity: 1;
            transform: scale(1) rotate(360deg);
          }
        }

        @keyframes tick-cycle-2 {
          /* Рисование галочки с задержкой */
          0%, 100% {
            stroke-dashoffset: 40;
            opacity: 0;
            transform: scale(1) rotate(0deg);
          }
          10% {
            stroke-dashoffset: 40;
            opacity: 0;
          }
          12% {
            opacity: 1;
          }
          22% {
            stroke-dashoffset: 0;
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
          
          /* Подпрыг */
          25% {
            transform: scale(1.1) translateY(-5px) rotate(0deg);
          }
          30% {
            transform: scale(1) translateY(0) rotate(0deg);
          }
          
          /* Превращение в круг */
          40% {
            stroke-dashoffset: 0;
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
          50% {
            stroke-dashoffset: 0;
            opacity: 0;
            transform: scale(0.8) rotate(-180deg);
          }
          
          /* Возврат из круга */
          70% {
            stroke-dashoffset: 40;
            opacity: 0;
            transform: scale(0.8) rotate(-360deg);
          }
          80% {
            opacity: 1;
          }
          90% {
            stroke-dashoffset: 0;
            opacity: 1;
            transform: scale(1) rotate(-360deg);
          }
        }

        @keyframes circle-appear {
          /* Скрыт пока рисуются галочки */
          0%, 40% {
            opacity: 0;
            transform: scale(0.5) rotate(0deg);
            stroke-dashoffset: 95;
          }
          
          /* Появление круга */
          50% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
            stroke-dashoffset: 95;
          }
          
          /* Вращение */
          60% {
            opacity: 1;
            transform: scale(1) rotate(360deg);
            stroke-dashoffset: 95;
          }
          
          /* Исчезновение */
          70% {
            opacity: 0;
            transform: scale(0.5) rotate(720deg);
            stroke-dashoffset: 95;
          }
          
          100% {
            opacity: 0;
            transform: scale(0.5) rotate(720deg);
          }
        }
      `}</style>
    </div>
  );
};

export default Loader;
