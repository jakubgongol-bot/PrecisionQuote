import React from 'react';

interface BarNestingVisualizerProps {
  barLength: number; // in mm, e.g. 3000 or 6000
  barLabel: string;
  partLength: number; // in mm
  wastePercentage: number;
}

export const BarNestingVisualizer: React.FC<BarNestingVisualizerProps> = ({ 
  barLength, 
  barLabel, 
  partLength, 
  wastePercentage 
}) => {
  // Logic
  const effectiveLength = partLength * (1 + wastePercentage / 100);
  
  // Guard against zero or negative length to prevent infinite loops/errors
  const safeEffectiveLength = effectiveLength > 0 ? effectiveLength : 999999;
  
  const count = Math.floor(barLength / safeEffectiveLength);
  const totalUsed = count * safeEffectiveLength;
  const remainder = barLength - totalUsed;
  const utilization = (totalUsed / barLength) * 100;

  // Visual scaling
  // We use a fixed viewBox width for the SVG to represent the bar length
  const VIEWBOX_WIDTH = 1000;
  const scale = VIEWBOX_WIDTH / barLength;
  
  // Dimensions in SVG units
  const partWidthSvg = partLength * scale;
  const totalItemWidthSvg = safeEffectiveLength * scale;
  const gapWidthSvg = totalItemWidthSvg - partWidthSvg;

  // Generate parts for rendering
  // If count is massive (e.g. > 100), we might simplify rendering to avoid DOM overload, 
  // but SVG handles 100-200 rects very well.
  const renderParts = () => {
    const parts = [];
    // Limit rendering to 200 items max to be safe for very small parts in 6m bars
    const renderLimit = Math.min(count, 200); 
    const isTruncated = count > 200;

    for (let i = 0; i < renderLimit; i++) {
      const xPos = i * totalItemWidthSvg;
      
      // Part Rect (Blue/Green)
      parts.push(
        <rect 
          key={`part-${i}`}
          x={xPos}
          y={10}
          width={partWidthSvg}
          height={30}
          fill="#3b82f6" // blue-500
          rx={1}
        />
      );

      // Waste/Kerf Rect (Red/Warning) - only if there is waste
      if (gapWidthSvg > 0.5) { // Only render if visible > 0.5 unit
        parts.push(
          <rect 
            key={`waste-${i}`}
            x={xPos + partWidthSvg}
            y={12}
            width={gapWidthSvg}
            height={26}
            fill="#f87171" // red-400
            opacity={0.6}
          />
        );
      }
    }
    return parts;
  };

  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between items-end mb-1">
        <span className="text-xs font-medium text-slate-700">{barLabel} ({barLength/1000}m)</span>
        <div className="text-right">
          <span className="text-sm font-bold text-slate-900">{count} ks</span>
          <span className={`text-xs ml-2 ${utilization > 90 ? 'text-green-600' : utilization < 70 ? 'text-amber-600' : 'text-slate-500'}`}>
            Využití {utilization.toFixed(1)}%
          </span>
        </div>
      </div>
      
      {/* Visual Bar */}
      <div className="w-full h-10 bg-slate-100 rounded border border-slate-300 relative overflow-hidden">
        {count > 0 ? (
           <svg width="100%" height="100%" viewBox={`0 0 ${VIEWBOX_WIDTH} 50`} preserveAspectRatio="none">
             {/* Remainder area background (already gray from div, but can be explicit) */}
             <rect x={totalItemWidthSvg * count} y={0} width={VIEWBOX_WIDTH - (totalItemWidthSvg * count)} height={50} fill="#e2e8f0" />
             
             {/* Render Parts */}
             {renderParts()}

             {/* Remainder Text if space allows */}
             {(VIEWBOX_WIDTH - (totalItemWidthSvg * count)) > 100 && (
                <text 
                  x={VIEWBOX_WIDTH - 10} 
                  y={30} 
                  textAnchor="end" 
                  fontSize="16" 
                  fill="#94a3b8" 
                  fontWeight="bold"
                >
                  zbytek {(remainder / 1000).toFixed(2)}m
                </text>
             )}
           </svg>
        ) : (
           <div className="w-full h-full flex items-center justify-center text-xs text-red-500 font-medium bg-red-50">
             Díl je delší než tyč!
           </div>
        )}
      </div>
      
      {/* Legend for first item only? No, maybe just small text below */}
      <div className="flex gap-4 mt-1 text-[10px] text-slate-400">
         <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-sm"></div> Díl
         </div>
         {wastePercentage > 0 && (
            <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-400 opacity-60 rounded-sm"></div> Odpad (řez)
            </div>
         )}
         <div className="flex items-center gap-1">
             <div className="w-2 h-2 bg-slate-200 border border-slate-300 rounded-sm"></div> Zbytek
         </div>
      </div>
    </div>
  );
};