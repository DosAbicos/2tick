import React, { useState, useEffect } from 'react';

const HummingbirdAnimation = ({ isWatchingPassword, passwordMatch, userExists }) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [birdPosition, setBirdPosition] = useState({ x: 50, y: 50 });
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isWatchingPassword) {
        setMousePosition({ x: e.clientX, y: e.clientY });
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isWatchingPassword]);
  
  useEffect(() => {
    if (!isWatchingPassword) {
      // Плавно следуем за курсором
      const timer = setInterval(() => {
        setBirdPosition(prev => ({
          x: prev.x + (mousePosition.x - prev.x) * 0.05,
          y: prev.y + (mousePosition.y - prev.y) * 0.05
        }));
      }, 16);
      
      return () => clearInterval(timer);
    }
  }, [mousePosition, isWatchingPassword]);
  
  // Анимация головы при ошибках
  const getHeadRotation = () => {
    if (!passwordMatch) return 'shake';
    if (userExists) return 'shake';
    return 'none';
  };
  
  return (
    <div 
      className="fixed pointer-events-none z-50 transition-all duration-300"
      style={{
        left: `${birdPosition.x}px`,
        top: `${birdPosition.y}px`,
        transform: `translate(-50%, -50%) ${isWatchingPassword ? 'scaleX(-1)' : ''}`
      }}
    >
      <div className={`hummingbird ${getHeadRotation()}`}>
        {/* Тело колибри */}
        <svg width="60" height="60" viewBox="0 0 100 100" className="drop-shadow-lg">
          {/* Крыло левое */}
          <ellipse 
            cx="30" 
            cy="40" 
            rx="20" 
            ry="8" 
            fill="#4F46E5" 
            opacity="0.6"
            className="animate-wing-left"
          />
          
          {/* Крыло правое */}
          <ellipse 
            cx="70" 
            cy="40" 
            rx="20" 
            ry="8" 
            fill="#4F46E5" 
            opacity="0.6"
            className="animate-wing-right"
          />
          
          {/* Тело */}
          <ellipse cx="50" cy="45" rx="18" ry="25" fill="#10B981" />
          
          {/* Голова */}
          <circle 
            cx="50" 
            cy="25" 
            r="12" 
            fill="#059669"
            className={getHeadRotation() === 'shake' ? 'animate-head-shake' : ''}
          />
          
          {/* Глаз */}
          <circle cx="54" cy="23" r="3" fill="white" />
          <circle cx="55" cy="23" r="1.5" fill="black" />
          
          {/* Клюв */}
          <line 
            x1="60" 
            y1="25" 
            x2="75" 
            y2="25" 
            stroke="#F59E0B" 
            strokeWidth="2"
            strokeLinecap="round"
          />
          
          {/* Хвост */}
          <path 
            d="M 50 65 Q 45 80, 40 90" 
            stroke="#10B981" 
            strokeWidth="4" 
            fill="none"
            strokeLinecap="round"
          />
          <path 
            d="M 50 65 Q 50 80, 50 90" 
            stroke="#059669" 
            strokeWidth="4" 
            fill="none"
            strokeLinecap="round"
          />
          <path 
            d="M 50 65 Q 55 80, 60 90" 
            stroke="#10B981" 
            strokeWidth="4" 
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </div>
      
      <style jsx>{`
        .hummingbird {
          animation: float 3s ease-in-out infinite;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        .animate-wing-left {
          animation: wing-flap-left 0.1s ease-in-out infinite;
          transform-origin: center;
        }
        
        .animate-wing-right {
          animation: wing-flap-right 0.1s ease-in-out infinite;
          transform-origin: center;
        }
        
        @keyframes wing-flap-left {
          0%, 100% { transform: rotate(-45deg) scaleY(1); }
          50% { transform: rotate(-45deg) scaleY(0.3); }
        }
        
        @keyframes wing-flap-right {
          0%, 100% { transform: rotate(45deg) scaleY(1); }
          50% { transform: rotate(45deg) scaleY(0.3); }
        }
        
        .animate-head-shake {
          animation: head-shake 0.5s ease-in-out;
        }
        
        @keyframes head-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        .shake {
          animation: shake 0.5s ease-in-out;
        }
        
        @keyframes shake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-10deg); }
          75% { transform: rotate(10deg); }
        }
      `}</style>
    </div>
  );
};

export default HummingbirdAnimation;
