import React from 'react';
import '../styles/neumorphism.css';

const Loader = ({ size = 'medium' }) => {
  const sizeConfig = {
    small: { container: 'w-12 h-12', dot: 'w-2 h-2' },
    medium: { container: 'w-16 h-16', dot: 'w-3 h-3' },
    large: { container: 'w-20 h-20', dot: 'w-4 h-4' }
  };

  const config = sizeConfig[size];

  return (
    <div className="flex items-center justify-center py-12">
      <div className={`${config.container} relative`}>
        {/* 8 точек по кругу */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
          <div
            key={index}
            className={`${config.dot} rounded-full bg-blue-500 absolute top-1/2 left-1/2`}
            style={{
              transform: `translate(-50%, -50%) rotate(${index * 45}deg) translateY(-200%)`,
              animation: `fade 1s linear infinite`,
              animationDelay: `${index * 0.125}s`,
              opacity: 0.2
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes fade {
          0%, 100% {
            opacity: 0.2;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default Loader;
