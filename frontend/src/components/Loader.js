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

        {/* Круг с эффектом роста и уменьшения */}
        <g style={{ transformOrigin: 'center', transform: 'rotate(-90deg)' }}>
          <circle
            cx="32"
            cy="32"
            r="20"
            fill="none"
            stroke="#3B82F6"
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            style={{
              opacity: 0,
              strokeDasharray: '2 124',
              strokeDashoffset: 0,
              animation: 'grow-shrink-circle 3.5s cubic-bezier(0.4, 0, 0.2, 1) infinite'
            }}
          />
        </g>
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
          
          /* Плавное исчезновение после подпрыга */
          32% {
            opacity: 1;
          }
          38% {
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
          
          /* Плавное исчезновение после подпрыга */
          32% {
            opacity: 1;
          }
          38% {
            opacity: 0;
          }
          
          /* Остается невидимой до конца цикла */
          95% {
            opacity: 0;
            stroke-dashoffset: 0;
          }
        }

        @keyframes grow-shrink-circle {
          /* Невидим пока галочки рисуются и прыгают */
          0%, 35% {
            opacity: 0;
            stroke-dasharray: 2 124;
            stroke-dashoffset: 0;
          }
          
          /* Плавное появление - маленькая точка в точке старта */
          40% {
            opacity: 0.5;
            stroke-dasharray: 2 124;
            stroke-dashoffset: 0;
          }
          43% {
            opacity: 1;
            stroke-dasharray: 5 121;
            stroke-dashoffset: 0;
          }
          
          /* Линия начинает расти (25%) */
          48% {
            opacity: 1;
            stroke-dasharray: 20 106;
            stroke-dashoffset: -20;
          }
          
          /* Продолжает расти (37.5%) */
          52% {
            opacity: 1;
            stroke-dasharray: 40 86;
            stroke-dashoffset: -40;
          }
          
          /* Максимум в середине круга (50% - 180°) */
          56% {
            opacity: 1;
            stroke-dasharray: 63 63;
            stroke-dashoffset: -63;
          }
          
          /* Начинает уменьшаться (62.5%) */
          60% {
            opacity: 1;
            stroke-dasharray: 40 86;
            stroke-dashoffset: -86;
          }
          
          /* Продолжает уменьшаться (75%) */
          64% {
            opacity: 1;
            stroke-dasharray: 20 106;
            stroke-dashoffset: -106;
          }
          
          /* Очень маленькая линия (87.5%) */
          68% {
            opacity: 1;
            stroke-dasharray: 5 121;
            stroke-dashoffset: -121;
          }
          
          /* Полностью исчезает в финише */
          71% {
            opacity: 0.7;
            stroke-dasharray: 1 125;
            stroke-dashoffset: -125;
          }
          74% {
            opacity: 0;
            stroke-dasharray: 0 126;
            stroke-dashoffset: -126;
          }
          
          100% {
            opacity: 0;
            stroke-dasharray: 2 124;
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default Loader;
