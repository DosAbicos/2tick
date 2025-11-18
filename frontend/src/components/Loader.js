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
            animation: 'tick-1 3.5s ease-in-out infinite'
          }}
        />
        
        {/* Вторая галочка */}
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
            animation: 'tick-2 3.5s ease-in-out infinite'
          }}
        />

        {/* Круг - рисуется после подпрыга с градиентом */}
        <defs>
          <linearGradient id="circleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0" />
            <stop offset="30%" stopColor="#3B82F6" stopOpacity="1" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="1" />
          </linearGradient>
        </defs>
        
        <circle
          cx="32"
          cy="32"
          r="20"
          fill="none"
          stroke="url(#circleGradient)"
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          style={{
            strokeDasharray: 126,
            strokeDashoffset: 126,
            animation: 'draw-circle 3.5s ease-in-out infinite'
          }}
        />
      </svg>

      <style>{`
        @keyframes tick-1 {
          /* Рисование первой галочки */
          0%, 100% {
            stroke-dashoffset: 40;
            opacity: 0;
          }
          5% {
            opacity: 1;
          }
          15% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
          
          /* Подпрыг */
          25% {
            stroke-dashoffset: 0;
            opacity: 1;
            transform: translateY(-8px);
          }
          30% {
            stroke-dashoffset: 0;
            opacity: 1;
            transform: translateY(0);
          }
          
          /* Исчезновение сразу после подпрыга */
          35% {
            opacity: 0;
          }
          
          /* Остается невидимой до конца цикла */
          95% {
            opacity: 0;
            stroke-dashoffset: 0;
          }
        }

        @keyframes tick-2 {
          /* Рисование второй галочки с небольшой задержкой */
          0%, 10%, 100% {
            stroke-dashoffset: 40;
            opacity: 0;
          }
          12% {
            opacity: 1;
          }
          22% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
          
          /* Подпрыг вместе с первой */
          25% {
            stroke-dashoffset: 0;
            opacity: 1;
            transform: translateY(-8px);
          }
          30% {
            stroke-dashoffset: 0;
            opacity: 1;
            transform: translateY(0);
          }
          
          /* Исчезновение сразу после подпрыга */
          35% {
            opacity: 0;
          }
          
          /* Остается невидимой до конца цикла */
          95% {
            opacity: 0;
            stroke-dashoffset: 0;
          }
        }

        @keyframes draw-circle {
          /* Невидим пока галочки рисуются и прыгают */
          0%, 30% {
            stroke-dashoffset: 126;
            opacity: 0;
          }
          
          /* Появляется сразу после подпрыга галочек */
          35% {
            stroke-dashoffset: 126;
            opacity: 1;
          }
          
          /* Рисуется круг по часовой стрелке, но не до конца (оставляем зазор) */
          60% {
            stroke-dashoffset: 20;
            opacity: 1;
          }
          
          /* Конец круга начинает исчезать */
          70% {
            stroke-dashoffset: 20;
            opacity: 0.7;
          }
          
          /* Исчезновение */
          80% {
            stroke-dashoffset: 20;
            opacity: 0;
          }
          
          100% {
            stroke-dashoffset: 126;
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default Loader;
