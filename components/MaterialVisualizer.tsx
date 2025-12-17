import React from 'react';
import { CrossSectionType } from '../types';

interface MaterialVisualizerProps {
  type: CrossSectionType;
  dimensions?: any; // Kept optional to prevent type errors if passed, but ignored
}

export const MaterialVisualizer: React.FC<MaterialVisualizerProps> = ({ type }) => {
  const stroke = "#3b82f6";
  const fill = "#eff6ff";

  const renderIcon = () => {
    switch (type) {
      case CrossSectionType.ROUND:
        return (
          <svg width="120" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
             <circle cx="50" cy="50" r="35" stroke={stroke} strokeWidth="2" fill={fill} />
             <path d="M50 15 L50 85" stroke={stroke} strokeWidth="1" strokeDasharray="4 4" opacity="0.5"/>
             <path d="M15 50 L85 50" stroke={stroke} strokeWidth="1" strokeDasharray="4 4" opacity="0.5"/>
             <text x="50" y="95" textAnchor="middle" fontSize="10" fill="#94a3b8">Kulatina</text>
          </svg>
        );
      case CrossSectionType.HEX:
        return (
          <svg width="120" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
             <path d="M25 50 L37.5 28.35 L62.5 28.35 L75 50 L62.5 71.65 L37.5 71.65 Z" stroke={stroke} strokeWidth="2" fill={fill} />
             <line x1="37.5" y1="28.35" x2="62.5" y2="71.65" stroke={stroke} strokeWidth="1" opacity="0.3"/>
             <line x1="62.5" y1="28.35" x2="37.5" y2="71.65" stroke={stroke} strokeWidth="1" opacity="0.3"/>
             <line x1="25" y1="50" x2="75" y2="50" stroke={stroke} strokeWidth="1" opacity="0.3"/>
             <text x="50" y="95" textAnchor="middle" fontSize="10" fill="#94a3b8">Šestihran</text>
          </svg>
        );
      case CrossSectionType.SHEET:
         return (
          <svg width="120" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
             <rect x="20" y="30" width="60" height="40" stroke={stroke} strokeWidth="2" fill={fill} />
             <text x="50" y="95" textAnchor="middle" fontSize="10" fill="#94a3b8">Plech/Deska</text>
          </svg>
         );
      case CrossSectionType.RECTANGULAR:
      default:
        return (
          <svg width="120" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
             <rect x="25" y="35" width="50" height="30" stroke={stroke} strokeWidth="2" fill={fill} />
             <line x1="50" y1="25" x2="50" y2="75" stroke={stroke} strokeWidth="1" strokeDasharray="4 4" opacity="0.5"/>
             <line x1="15" y1="50" x2="85" y2="50" stroke={stroke} strokeWidth="1" strokeDasharray="4 4" opacity="0.5"/>
             <text x="50" y="95" textAnchor="middle" fontSize="10" fill="#94a3b8">Hranol</text>
          </svg>
        );
    }
  };

  return (
    <div className="w-full flex justify-center items-center py-4 bg-white rounded-lg border border-slate-100 mb-4 h-32">
      {renderIcon()}
    </div>
  );
};