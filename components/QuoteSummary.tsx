import React from 'react';
import { CalculatedQuote, Currency } from '../types';
import { DollarSign, Scale, Printer, AlertCircle, Truck, Clock } from 'lucide-react';

interface QuoteSummaryProps {
  calculated: CalculatedQuote;
  materialCurrency: Currency;
}

export const QuoteSummary: React.FC<QuoteSummaryProps> = ({ calculated, materialCurrency }) => {
  const formatCZK = (val: number) => 
    new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' }).format(val);

  const formatNative = (val: number) => 
    new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: materialCurrency }).format(val);

  const scrapCount = calculated.totalProductionCount - (calculated.materialWeight / calculated.materialWeightPerPart);
  
  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden sticky top-6">
      <div className="bg-slate-900 p-6 text-white">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <DollarSign className="text-green-400" />
          Kalkulace nabídky
        </h2>
        <p className="text-slate-400 text-sm mt-1">Okamžitý přehled nákladů</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Main Price Display */}
        <div className="text-center bg-blue-50 p-6 rounded-lg border border-blue-100">
          <div className="text-sm text-blue-600 font-semibold uppercase tracking-wide">Celková cena</div>
          <div className="text-4xl font-bold text-slate-900 mt-2">{formatCZK(calculated.totalPrice)}</div>
          <div className="text-sm text-slate-500 mt-1">
            {formatCZK(calculated.pricePerPart)} / kus (prodejní)
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-3">
          
          {/* Material & Transport Group */}
          <div className="space-y-2 pb-2 border-b border-slate-100">
              {/* Material Cost */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-start text-slate-700">
                  <span className="mt-1">
                    {calculated.shippingCostCZK > 0 ? "Materiál (bez dopravy)" : "Cena materiálu (vč. odpadu)"}
                  </span>
                  <div className="text-right flex flex-col items-end">
                    {materialCurrency !== 'CZK' && (
                      <span className="font-mono font-medium text-blue-700">
                        {formatNative(calculated.materialCostTotalNative)}
                      </span>
                    )}
                    <span className={`font-mono ${materialCurrency !== 'CZK' ? 'text-xs text-slate-400' : 'font-medium'}`}>
                      {formatCZK(calculated.materialCostTotalCZK)}
                    </span>
                  </div>
                </div>
                {calculated.materialWasteCostCZK > 0 && (
                   <div className="flex justify-between items-center text-xs text-slate-400 px-2 border-l-2 border-slate-200 ml-1">
                     <span>z toho prořez</span>
                     <span>{formatCZK(calculated.materialWasteCostCZK)}</span>
                   </div>
                )}
              </div>

              {/* Shipping Cost Row */}
              {calculated.shippingCostCZK > 0 && (
                 <div className="flex justify-between items-center text-slate-700">
                   <span className="flex items-center gap-1.5"><Truck size={14} className="text-slate-400"/> Doprava materiálu</span>
                   <div className="text-right">
                      {materialCurrency !== 'CZK' && (
                         <span className="font-mono font-medium text-blue-700 block text-xs">
                           {formatNative(calculated.shippingCostNative)}
                         </span>
                      )}
                      <span className="font-mono font-medium">
                         {formatCZK(calculated.shippingCostCZK)}
                      </span>
                   </div>
                 </div>
              )}

              {/* Material Total (incl. Shipping) Subtotal */}
              {calculated.shippingCostCZK > 0 && (
                <div className="flex justify-between items-center text-slate-800 pt-1 mt-1 border-t border-slate-100 border-dashed">
                    <span className="text-sm font-medium">Materiál celkem (vč. dopravy)</span>
                     <span className="font-mono font-semibold">
                       {formatCZK(calculated.materialCostTotalCZK + calculated.shippingCostCZK)}
                    </span>
                </div>
              )}
          </div>

          <Row label="Cena přípravy" value={calculated.setupCostTotal} format={formatCZK} />
          
          {/* Machining with detailed breakdown */}
          <div className="pb-2 border-b border-slate-100">
            <Row label="Cena obrábění" value={calculated.machiningCostTotal} format={formatCZK} />
            <div className="flex justify-between items-center mt-1 px-2 text-xs text-slate-500 bg-slate-50 rounded py-1">
                <span className="flex items-center gap-1" title="Celkový čas stroje pro celou dávku">
                   <Clock size={12} /> {calculated.totalMachiningHours.toFixed(2)} hod
                </span>
                <span>
                   (Σ {calculated.totalProductionCount} ks)
                </span>
            </div>
          </div>

          <Row label="Dokončovací práce" value={calculated.postProcessTotal} format={formatCZK} />
          
          {calculated.totalProductionCount > 0 && (
             <div className="text-xs text-slate-400 flex items-center gap-1 mt-1 justify-end">
                <AlertCircle size={10} />
                Kalkulováno pro výrobu {calculated.totalProductionCount} ks
             </div>
          )}

          <div className="border-t border-slate-100 my-2"></div>
          <Row label="Mezi součet" value={calculated.subtotal} format={formatCZK} secondary />
          <Row label="Marže / Zisk" value={calculated.markupAmount} format={formatCZK} secondary />
        </div>
        
        <button 
          onClick={() => window.print()}
          className="w-full mt-4 flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 py-2 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm print:hidden"
        >
          <Printer size={16} /> Tisk nabídky
        </button>
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; value: number; format: (n: number) => string; secondary?: boolean }> = ({ label, value, format, secondary }) => (
  <div className={`flex justify-between items-center ${secondary ? 'text-slate-500 text-sm' : 'text-slate-700'}`}>
    <span>{label}</span>
    <span className={`font-mono ${secondary ? '' : 'font-medium'}`}>
      {format(value)}
    </span>
  </div>
);