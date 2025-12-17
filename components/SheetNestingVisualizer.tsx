import React, { useMemo } from 'react';

interface SheetNestingVisualizerProps {
  sheetWidth: number;  // mm (e.g. 1000)
  sheetLength: number; // mm (e.g. 2000)
  partWidth: number;   // mm
  partLength: number;  // mm
  gap?: number;        // mm (laser kerf/spacing), default to 5mm
  totalQuantity: number;
}

export const SheetNestingVisualizer: React.FC<SheetNestingVisualizerProps> = ({
  sheetWidth,
  sheetLength,
  partWidth,
  partLength,
  gap = 5,
  totalQuantity
}) => {
  // Logic to determine best fit (Standard vs Rotated)
  const calculation = useMemo(() => {
    // Effective dimensions including gap/waste spacing
    const pW = partWidth + gap;
    const pL = partLength + gap;

    // 1. Standard Orientation
    // How many columns fit in Sheet Width?
    const colsStd = Math.floor((sheetWidth) / pW);
    // How many rows fit in Sheet Length?
    const rowsStd = Math.floor((sheetLength) / pL);
    const countStd = Math.max(0, colsStd * rowsStd);

    // 2. Rotated Orientation
    // Swap Part W and L
    const colsRot = Math.floor((sheetWidth) / pL);
    const rowsRot = Math.floor((sheetLength) / pW);
    const countRot = Math.max(0, colsRot * rowsRot);

    // Decision
    const isRotated = countRot > countStd;
    const countPerSheet = isRotated ? countRot : countStd;
    const cols = isRotated ? colsRot : colsStd;
    const rows = isRotated ? rowsRot : rowsStd;

    // Dimensions to draw
    const drawW = isRotated ? partLength : partWidth;
    const drawH = isRotated ? partWidth : partLength;

    const totalSheetsNeeded = countPerSheet > 0 ? Math.ceil(totalQuantity / countPerSheet) : 0;
    
    // Utilization % (Area based)
    const partArea = partWidth * partLength;
    const sheetArea = sheetWidth * sheetLength;
    const usedArea = countPerSheet * partArea;
    const utilization = sheetArea > 0 ? (usedArea / sheetArea) * 100 : 0;

    return {
      isRotated,
      countPerSheet,
      cols,
      rows,
      drawW,
      drawH,
      totalSheetsNeeded,
      utilization
    };
  }, [sheetWidth, sheetLength, partWidth, partLength, gap, totalQuantity]);

  // SVG Rendering Constants
  // We use the sheet dimensions as the viewBox to keep logic simple 1:1
  const viewBox = `0 0 ${sheetWidth} ${sheetLength}`;
  
  // Render loop
  const renderParts = () => {
    const rects = [];
    const { cols, rows, drawW, drawH, countPerSheet } = calculation;
    
    // Limit rendering for performance if thousands of small parts
    const maxRender = 400; 
    let renderedCount = 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (renderedCount >= maxRender) break;
        
        const x = c * (drawW + gap) + (gap/2); // Offset by half gap for margin
        const y = r * (drawH + gap) + (gap/2);

        rects.push(
          <rect
            key={`${r}-${c}`}
            x={x}
            y={y}
            width={drawW}
            height={drawH}
            fill="#3b82f6" // blue-500
            stroke="#1d4ed8" // blue-700
            strokeWidth={1}
            rx={2}
          />
        );
        renderedCount++;
      }
    }
    return rects;
  };

  return (
    <div className="mb-4">
      <div className="flex justify-between items-end mb-2">
        <div>
          <span className="text-xs font-bold text-slate-700 block">
            Nesting na formát {sheetWidth}x{sheetLength}
          </span>
          <span className="text-[10px] text-slate-500">
             Mezera mezi díly: {gap}mm {calculation.isRotated ? '(Rotováno 90°)' : ''}
          </span>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-slate-900">
            {calculation.countPerSheet} ks / tabule
          </div>
          <div className={`text-xs ${calculation.utilization > 80 ? 'text-green-600' : 'text-amber-600'}`}>
            Využití: {calculation.utilization.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Visualization Container */}
      <div className="w-full bg-slate-200 rounded border border-slate-300 relative overflow-hidden shadow-inner p-1">
        {calculation.countPerSheet > 0 ? (
          <div className="relative w-full" style={{ paddingBottom: `${(sheetLength / sheetWidth) * 100}%` }}>
             <svg 
                viewBox={viewBox} 
                className="absolute inset-0 w-full h-full bg-white"
                preserveAspectRatio="xMidYMid meet"
             >
                {/* Background Grid (Optional aesthetic) */}
                <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
                  <path d="M 100 0 L 0 0 0 100" fill="none" stroke="gray" strokeWidth="0.5" opacity="0.1"/>
                </pattern>
                <rect width="100%" height="100%" fill="url(#grid)" />

                {renderParts()}
             </svg>
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-red-500 font-medium bg-red-50 text-sm">
            Díl je větší než formát plechu!
          </div>
        )}
      </div>

      <div className="mt-2 flex justify-between items-center bg-blue-50 p-2 rounded border border-blue-100">
         <div className="text-xs text-blue-800">
            Pro {totalQuantity} ks potřebujete:
         </div>
         <div className="font-bold text-blue-900 text-sm">
            {calculation.totalSheetsNeeded} ks tabulí
         </div>
      </div>
    </div>
  );
};
