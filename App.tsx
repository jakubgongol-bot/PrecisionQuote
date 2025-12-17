import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, 
  Settings, 
  Box, 
  Clock, 
  User, 
  Mail, 
  Sparkles, 
  ChevronRight,
  Menu,
  Scale,
  DollarSign,
  ArrowRightLeft,
  RefreshCw,
  DownloadCloud,
  Layers,
  Scissors,
  Trash2,
  Truck,
  Ruler,
  FileText,
  Grid3X3,
  Scan,
  Monitor,
  Cpu,
  Wrench,
  Search,
  Package,
  Plus
} from 'lucide-react';
import { QuoteDetails, CalculatedQuote, MaterialDefinition, CrossSectionType, Currency, SheetFormat, ProductionOperation } from './types';
import { DEFAULT_QUOTE } from './constants';
import { loadMaterials } from './utils/materialLoader';
import { fetchExchangeRate } from './services/exchangeRateService';
import { InputGroup, NumberInput } from './components/InputSection';
import { QuoteSummary } from './components/QuoteSummary';
import { generateQuoteEmail } from './services/geminiService';
import { MaterialVisualizer } from './components/MaterialVisualizer';
import { MaterialsTab } from './components/MaterialsTab';
import { generateMaterialRFQ } from './services/pdfService';
import { BarNestingVisualizer } from './components/BarNestingVisualizer';
import { SheetNestingVisualizer } from './components/SheetNestingVisualizer';

type Tab = 'CALCULATOR' | 'MATERIALS' | 'SETTINGS';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('CALCULATOR');
  const [quote, setQuote] = useState<QuoteDetails>(DEFAULT_QUOTE);
  const [materials, setMaterials] = useState<MaterialDefinition[]>([]);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(true);
  const [isFetchingRate, setIsFetchingRate] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- Load Materials from JSON ---
  useEffect(() => {
    const loadData = async () => {
      const loadedMaterials = await loadMaterials('./materials.json');
      setMaterials(loadedMaterials);
      setIsLoadingMaterials(false);
      
      // If the default material isn't in the list, select the first one
      if (loadedMaterials.length > 0) {
        const defaultExists = loadedMaterials.some(m => m.id === DEFAULT_QUOTE.material);
        if (!defaultExists) {
          handleMaterialChange(loadedMaterials[0].id, loadedMaterials);
        } else {
          // even if it exists, update price if default quote price is different/zero? 
          // Prefer keeping default constant for now unless user explicitly changes
        }
      }
    };
    loadData();
  }, []);

  // --- Helpers ---
  const formatCZK = (val: number) => 
    new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' }).format(isNaN(val) ? 0 : val);

  const formatNative = (val: number, currency: Currency) => 
    new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: currency }).format(isNaN(val) ? 0 : val);

  const handleMaterialCurrencyChange = (newCurrency: Currency) => {
    let newRate = 1;
    // Default fallback rates if API isn't used immediately
    if (newCurrency === 'EUR') newRate = 25;
    if (newCurrency === 'USD') newRate = 23;

    setQuote(prev => ({
      ...prev,
      materialCurrency: newCurrency,
      materialExchangeRate: newRate
    }));
  };

  const handleFetchCurrentRate = async () => {
    if (quote.materialCurrency === 'CZK') return;
    
    setIsFetchingRate(true);
    const rate = await fetchExchangeRate(quote.materialCurrency, 'CZK');
    setIsFetchingRate(false);

    if (rate) {
      setQuote(prev => ({ ...prev, materialExchangeRate: rate }));
    } else {
      alert('Nepodařilo se stáhnout aktuální kurz. Zkontrolujte připojení k internetu.');
    }
  };

  // --- Calculation Logic ---
  const calculated: CalculatedQuote = useMemo(() => {
    // Determine Total Production Count (Good parts + Scrap parts)
    const scrapCount = isNaN(quote.scrapCount) ? 0 : quote.scrapCount;
    const totalProductionCount = quote.quantity + scrapCount;

    // 1. Dimensions and Density
    const l = quote.dimensions.unit === 'inch' ? quote.dimensions.length * 25.4 : quote.dimensions.length;
    const w = quote.dimensions.unit === 'inch' ? quote.dimensions.width * 25.4 : quote.dimensions.width;
    const h = quote.dimensions.unit === 'inch' ? quote.dimensions.height * 25.4 : quote.dimensions.height;
    
    const selectedMaterial = materials.find(m => m.id === quote.material);
    const density = selectedMaterial ? selectedMaterial.density : 0;
    const wastePercentage = isNaN(quote.cutOffWastePercentage) ? 0 : quote.cutOffWastePercentage;

    let totalMaterialWeight = 0;
    let grossWeightKgPerPart = 0;
    let wasteWeightKg = 0;
    
    // Bar Logic
    let barCount3m = 0;
    let barCount6m = 0;
    let piecesPer3m = 0;
    let piecesPer6m = 0;
    let totalLengthNeeded = 0;

    // Sheet Logic
    let sheetCount = 0;

    if (quote.crossSection === CrossSectionType.SHEET) {
        // --- SHEET CALCULATION ---
        const [sheetW, sheetL] = quote.sheetFormat.split('x').map(Number);
        
        // Part dimensions: l and w. Thickness is h.
        // For calculation purposes here, we use a simplified area-based logic with waste factor
        // to determine COST. The Visualizer will do the strict geometric nesting.
        // This ensures the quote price is slightly conservative (area based) vs strict fit.
        
        const partArea = l * w;
        
        // Calculate gross area per part with waste percentage
        const partAreaGross = partArea * (1 + (wastePercentage / 100));

        // Geometric Fit Check (Simple)
        const fitStandard = Math.floor(sheetL / l) * Math.floor(sheetW / w);
        const fitRotated = Math.floor(sheetL / w) * Math.floor(sheetW / l);
        const maxGeometricFit = Math.max(fitStandard, fitRotated);
        
        const sheetArea = sheetL * sheetW;
        const maxAreaFit = Math.floor(sheetArea / partAreaGross);
        
        // We use the stricter of the two for pricing safety
        const effectivePartsPerSheet = Math.max(0, Math.min(maxGeometricFit, maxAreaFit));
        
        if (effectivePartsPerSheet > 0) {
            sheetCount = Math.ceil(totalProductionCount / effectivePartsPerSheet);
        } else {
            sheetCount = 0; 
        }

        // Weight of ONE sheet
        const sheetVolumeCm3 = (sheetL * sheetW * h) / 1000;
        const weightPerSheet = (sheetVolumeCm3 * density) / 1000;

        totalMaterialWeight = sheetCount * weightPerSheet;

        // Per part weight for display (Net part weight)
        const partVolumeCm3 = (l * w * h) / 1000;
        const netWeightKg = (partVolumeCm3 * density) / 1000;
        
        grossWeightKgPerPart = totalProductionCount > 0 ? totalMaterialWeight / totalProductionCount : 0;
        wasteWeightKg = Math.max(0, grossWeightKgPerPart - netWeightKg);

    } else {
        // --- BAR CALCULATION ---
        // Calculate Cross-Section Area in mm^2
        let areaMm2 = 0;
        if (quote.crossSection === CrossSectionType.ROUND) {
          // Area = pi * r^2 = pi * (d/2)^2. w acts as diameter.
          areaMm2 = Math.PI * Math.pow(w / 2, 2);
        } else if (quote.crossSection === CrossSectionType.HEX) {
          // Area of hex = (sqrt(3)/2) * d^2 where d is width across flats (w)
          areaMm2 = (Math.sqrt(3) / 2) * Math.pow(w, 2);
        } else {
          // Rectangular: Area = w * h
          areaMm2 = w * h;
        }

        // Volume = Area * Length
        const volumeMm3 = areaMm2 * l;
        const volumeCm3 = volumeMm3 / 1000; // mm^3 to cm^3
        
        const netWeightKg = (volumeCm3 * density) / 1000;
        
        // Apply cut-off/waste percentage
        wasteWeightKg = netWeightKg * (wastePercentage / 100);
        grossWeightKgPerPart = netWeightKg + wasteWeightKg;

        totalMaterialWeight = grossWeightKgPerPart * totalProductionCount;

        // Total Length in MM required
        const lengthPerPartWithWaste = l * (1 + (wastePercentage / 100));
        totalLengthNeeded = lengthPerPartWithWaste * totalProductionCount;
        
        // Basic estimated bar counts for total length
        barCount3m = Math.ceil(totalLengthNeeded / 3000);
        barCount6m = Math.ceil(totalLengthNeeded / 6000);

        // Pieces per bar calculation (Used for Visualizer)
        // Avoid div by zero
        if (lengthPerPartWithWaste > 0) {
           piecesPer3m = Math.floor(3000 / lengthPerPartWithWaste);
           piecesPer6m = Math.floor(6000 / lengthPerPartWithWaste);
        }
    }
    
    // Total Waste Weight for the whole job
    const totalWasteWeight = wasteWeightKg * totalProductionCount; // Approximation based on per-part waste

    // 3. Costs
    // Treat NaN as 0 for calculations to avoid breaking the UI
    const safeFactor = (val: number) => isNaN(val) ? 0 : val;

    // Material Cost Logic: Calculate in Native then Convert to CZK
    const materialCostTotalNative = totalMaterialWeight * safeFactor(quote.factors.materialCostPerKg);
    const materialCostTotalCZK = materialCostTotalNative * safeFactor(quote.materialExchangeRate);
    
    // Per Part Material Cost (dividing total cost by sellable quantity)
    const sellableQuantity = quote.quantity || 1;
    const materialCostPerPartNative = materialCostTotalNative / sellableQuantity;
    const materialCostPerPartCZK = materialCostTotalCZK / sellableQuantity;

    // Shipping Cost
    const shippingCostNative = safeFactor(quote.shippingCost);
    const shippingCostCZK = shippingCostNative * safeFactor(quote.materialExchangeRate);

    // Calculate specific cost of waste for display (from cut-off)
    // Total Waste Cost
    const materialWasteCostNative = totalWasteWeight * safeFactor(quote.factors.materialCostPerKg);
    const materialWasteCostCZK = materialWasteCostNative * safeFactor(quote.materialExchangeRate);

    // Per Part Waste Cost
    const materialWasteCostPerPartNative = wasteWeightKg * safeFactor(quote.factors.materialCostPerKg);
    const materialWasteCostPerPartCZK = materialWasteCostPerPartNative * safeFactor(quote.materialExchangeRate);

    // Setup Cost Breakdown
    const totalSetupHours = safeFactor(quote.time3D) + 
                            safeFactor(quote.timeCAM) + 
                            safeFactor(quote.timeMachineSetup) + 
                            safeFactor(quote.timeInspection) + 
                            safeFactor(quote.timeExpedition);

    const setupCostTotal = totalSetupHours * safeFactor(quote.factors.setupRatePerHour);
    
    // Machining Cost: Sum of all operations
    // We machine ALL parts (good + scrap)
    let totalMachiningHours = 0;
    const machiningCostTotal = quote.operations.reduce((acc, op) => {
      const timeHours = safeFactor(op.timePerPart) / 60;
      const rate = safeFactor(op.hourlyRate);
      
      const hoursForThisOp = timeHours * totalProductionCount;
      totalMachiningHours += hoursForThisOp;
      
      const opCost = hoursForThisOp * rate;
      return acc + opCost;
    }, 0);
    
    // Post Process: Assuming we post-process ALL parts (worst case) or parts fail after post-process
    const postProcessTotal = totalProductionCount * safeFactor(quote.factors.postProcessCostPerPart);

    // 4. Totals (Everything in CZK)
    const subtotal = materialCostTotalCZK + shippingCostCZK + setupCostTotal + machiningCostTotal + postProcessTotal;
    const markupAmount = subtotal * (safeFactor(quote.factors.markupPercentage) / 100);
    const totalPrice = subtotal + markupAmount;

    return {
      materialWeight: totalMaterialWeight,
      materialWeightPerPart: grossWeightKgPerPart,
      materialWasteWeightPerPart: wasteWeightKg,
      materialWasteCostCZK,
      materialWasteCostPerPartNative,
      materialWasteCostPerPartCZK,
      materialCostTotalNative,
      materialCostTotalCZK,
      materialCostPerPartNative,
      materialCostPerPartCZK,
      shippingCostNative,
      shippingCostCZK,
      setupCostTotal,
      machiningCostTotal,
      totalMachiningHours,
      postProcessTotal,
      subtotal,
      markupAmount,
      totalPrice,
      pricePerPart: totalPrice / (quote.quantity || 1),
      totalProductionCount,
      totalLengthNeeded,
      barCount3m,
      barCount6m,
      piecesPer3mBar: piecesPer3m,
      piecesPer6mBar: piecesPer6m,
      sheetCount
    };
  }, [quote, materials]);

  // --- Handlers ---
  const updateDimension = (key: 'length' | 'width' | 'height', val: string) => {
    // allow NaN for dimensions during editing
    const parsed = val === '' ? 0 : parseFloat(val);
    setQuote(prev => ({
      ...prev,
      dimensions: { ...prev.dimensions, [key]: isNaN(parsed) ? 0 : parsed }
    }));
  };

  const updateFactor = (key: keyof typeof DEFAULT_QUOTE.factors, val: string) => {
    const parsed = parseFloat(val);
    setQuote(prev => ({
      ...prev,
      factors: { ...prev.factors, [key]: isNaN(parsed) ? 0 : parsed }
    }));
  };
  
  const updatePriceFactor = (key: keyof typeof DEFAULT_QUOTE.factors, val: string) => {
     const parsed = parseFloat(val);
     setQuote(prev => ({
      ...prev,
      factors: { ...prev.factors, [key]: isNaN(parsed) ? 0 : parsed }
    }));
  };

  // Operation CRUD Handlers
  const handleAddOperation = () => {
    const newOp: ProductionOperation = {
      id: `op_${Date.now()}`,
      name: '',
      timePerPart: 0,
      hourlyRate: 1500 // Default rate
    };
    setQuote(prev => ({
      ...prev,
      operations: [...prev.operations, newOp]
    }));
  };

  const handleRemoveOperation = (id: string) => {
    setQuote(prev => ({
      ...prev,
      operations: prev.operations.filter(op => op.id !== id)
    }));
  };

  const handleUpdateOperation = (id: string, field: keyof ProductionOperation, value: string) => {
    setQuote(prev => ({
      ...prev,
      operations: prev.operations.map(op => {
        if (op.id !== id) return op;
        
        if (field === 'name') {
          return { ...op, name: value };
        } else {
          // Number fields
          return { ...op, [field]: parseFloat(value) || 0 };
        }
      })
    }));
  };


  // Enhanced Material Change Handler
  const handleMaterialChange = (materialId: string, currentMaterials: MaterialDefinition[] = materials) => {
    const selectedMat = currentMaterials.find(m => m.id === materialId);
    
    setQuote(prev => {
      let newFactors = { ...prev.factors };
      
      // Update price if defined in JSON
      if (selectedMat && selectedMat.defaultPricePerKg) {
        newFactors.materialCostPerKg = selectedMat.defaultPricePerKg;
      }

      return {
        ...prev,
        material: materialId,
        factors: newFactors
      };
    });
  };

  const handleGenerateEmail = async () => {
    setIsGenerating(true);
    // Pass the display name of the material to the service, not the ID
    const materialName = materials.find(m => m.id === quote.material)?.name || quote.material;
    
    // Create a temporary object for the email service with the readable name
    const quoteForEmail = { ...quote, material: materialName as any };
    
    const email = await generateQuoteEmail(quoteForEmail, calculated);
    setGeneratedEmail(email);
    setIsGenerating(false);
  };

  const handleGenerateRFQ = () => {
    generateMaterialRFQ(quote, calculated, materials);
  };

  // Label helpers
  const getWidthLabel = () => {
    if (quote.crossSection === CrossSectionType.ROUND) return "Průměr (D)";
    if (quote.crossSection === CrossSectionType.HEX) return "Rozměr klíče (S)";
    // SHEET specific labels handled in JSX now
    return "Šířka (Š)";
  };

  const getLengthLabel = () => {
    // SHEET specific labels handled in JSX now
    return "Délka (L)";
  };

  const NavItem = ({ label, id, icon: Icon }: { label: string, id: Tab, icon?: any }) => (
    <button 
      onClick={() => {
        setActiveTab(id);
        setIsMobileMenuOpen(false);
      }}
      className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
        activeTab === id 
        ? 'text-blue-600 bg-blue-50' 
        : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50'
      }`}
    >
      {Icon && <Icon size={18} />}
      {label}
    </button>
  );

  // Helper for rendering preparation rows with rate label
  const renderPrepRow = (label: string, value: number, field: keyof QuoteDetails) => {
    return (
      <div className="flex items-end gap-3">
        <div className="flex-grow">
          <NumberInput 
            label={label}
            suffix="hod"
            value={value}
            onChange={(e) => setQuote({...quote, [field]: parseFloat(e.target.value) || 0})}
          />
        </div>
        <div className="pb-2 text-xs text-slate-400 font-mono w-28 text-right flex-shrink-0">
           {new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(quote.factors.setupRatePerHour)}/h
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('CALCULATOR')}>
            <div className="bg-blue-600 p-2 rounded-lg">
              <Calculator className="text-white h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">PrecisionQuote</h1>
          </div>
          
          <div className="hidden md:flex items-center gap-2">
            <NavItem label="Kalkulátor" id="CALCULATOR" />
            <NavItem label="Materiály" id="MATERIALS" />
          </div>

          <div className="hidden md:flex items-center justify-end w-10">
            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-600">
               <User size={16} />
            </div>
          </div>
          
          <button 
            className="md:hidden text-slate-500 p-2 rounded-md hover:bg-slate-100"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Menu />
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 py-2 space-y-1">
             <NavItem label="Kalkulátor" id="CALCULATOR" icon={Calculator} />
             <NavItem label="Materiály" id="MATERIALS" icon={Layers} />
          </div>
        )}
      </header>

      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'MATERIALS' ? (
          <MaterialsTab materials={materials} setMaterials={setMaterials} />
        ) : (
          /* CALCULATOR VIEW */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-4 duration-500">
            
            {/* INPUTS AREA (Left + Center on Desktop) */}
            <div className="lg:col-span-8 xl:col-span-9 grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
              
              {/* Column 1: Job & Material Details */}
              <div className="space-y-8">
                
                {/* 1. Job Details */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                      <Box className="text-blue-500" size={20}/> Detaily zakázky
                    </h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Jméno zákazníka</label>
                      <input 
                          type="text" 
                          className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white"
                          value={quote.customerName}
                          onChange={(e) => setQuote({...quote, customerName: e.target.value})}
                          placeholder="Acme Corp"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Název dílu / Číslo</label>
                      <input 
                          type="text" 
                          className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white"
                          value={quote.partName}
                          onChange={(e) => setQuote({...quote, partName: e.target.value})}
                          placeholder="Bracket-001"
                      />
                    </div>
                  </div>
                </section>

                {/* 2. Material & Size */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                    <Settings className="text-blue-500" size={20}/> Materiál a rozměry
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 items-start">
                        <NumberInput 
                          label="Velikost dávky (ks)" 
                          value={quote.quantity} 
                          min={1}
                          onChange={(e) => setQuote({...quote, quantity: parseInt(e.target.value) || 1})} 
                        />
                        <div>
                          <NumberInput 
                            label="Zmetky (ks)" 
                            value={quote.scrapCount} 
                            min={0}
                            onChange={(e) => setQuote({...quote, scrapCount: parseInt(e.target.value)})} 
                          />
                          <div className="text-[10px] text-slate-400 mt-1 text-right">
                            <button 
                                onClick={() => setQuote(p => ({...p, scrapCount: Math.ceil(p.quantity * 0.03)}))}
                                className="hover:text-blue-600 hover:underline transition-colors"
                                title="Nastavit doporučené množství (3%)"
                            >
                                Doporučeno 3%: {Math.ceil(quote.quantity * 0.03)} ks
                            </button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Typ materiálu</label>
                        {isLoadingMaterials ? (
                          <div className="text-sm text-slate-400 p-2">Načítání materiálů...</div>
                        ) : (
                          <select 
                            className="block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white"
                            value={quote.material}
                            onChange={(e) => handleMaterialChange(e.target.value)}
                          >
                            {materials.map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Profil materiálu</label>
                        <div className="grid grid-cols-4 gap-2">
                          <button
                            onClick={() => setQuote({...quote, crossSection: CrossSectionType.RECTANGULAR})}
                            className={`py-2 text-xs md:text-sm font-medium rounded-md border ${quote.crossSection === CrossSectionType.RECTANGULAR ? 'bg-blue-50 border-blue-600 text-blue-700 ring-1 ring-blue-600' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                          >
                            Hranatý
                          </button>
                          <button
                            onClick={() => setQuote({...quote, crossSection: CrossSectionType.ROUND})}
                            className={`py-2 text-xs md:text-sm font-medium rounded-md border ${quote.crossSection === CrossSectionType.ROUND ? 'bg-blue-50 border-blue-600 text-blue-700 ring-1 ring-blue-600' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                          >
                            Kulatý
                          </button>
                          <button
                            onClick={() => setQuote({...quote, crossSection: CrossSectionType.HEX})}
                            className={`py-2 text-xs md:text-sm font-medium rounded-md border ${quote.crossSection === CrossSectionType.HEX ? 'bg-blue-50 border-blue-600 text-blue-700 ring-1 ring-blue-600' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                          >
                            Šestihran
                          </button>
                          <button
                            onClick={() => setQuote({...quote, crossSection: CrossSectionType.SHEET})}
                            className={`py-2 text-xs md:text-sm font-medium rounded-md border ${quote.crossSection === CrossSectionType.SHEET ? 'bg-blue-50 border-blue-600 text-blue-700 ring-1 ring-blue-600' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                          >
                            Plech
                          </button>
                        </div>
                        {(() => {
                          const mat = materials.find(m => m.id === quote.material);
                          return mat ? (
                            <div className="flex flex-col gap-1 mt-2 pl-1">
                                <div className="text-xs text-slate-500">
                                  Hustota: <span className="font-semibold">{mat.density * 1000} kg/m³</span>
                                </div>
                                {mat.defaultPricePerKg && (
                                    <div className="text-[10px] text-blue-500">
                                      *Výchozí cena: {mat.defaultPricePerKg} Kč/kg
                                    </div>
                                )}
                            </div>
                          ) : null;
                        })()}
                      </div>

                      {/* Stock Dimensions for SHEET (Format + Thickness) */}
                      {quote.crossSection === CrossSectionType.SHEET && (
                        <div className="animate-in slide-in-from-top-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">Parametry Polotovaru</h3>
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                                  <Grid3X3 size={16} className="text-slate-500" />
                                  Formát
                                  </label>
                                  <select 
                                  className="block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white"
                                  value={quote.sheetFormat}
                                  onChange={(e) => setQuote(p => ({...p, sheetFormat: e.target.value as SheetFormat}))}
                                  >
                                  <option value="1000x2000">1000 x 2000 mm</option>
                                  <option value="1250x2500">1250 x 2500 mm</option>
                                  <option value="1500x3000">1500 x 3000 mm</option>
                                  </select>
                              </div>
                              <div>
                                  <NumberInput 
                                  label="Tloušťka plechu" 
                                  suffix={quote.dimensions.unit}
                                  value={quote.dimensions.height}
                                  onChange={(e) => updateDimension('height', e.target.value)}
                                  />
                              </div>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 items-end">
                        <div className="flex-grow">
                          <NumberInput 
                            label="Cena suroviny" 
                            value={quote.factors.materialCostPerKg}
                            onChange={(e) => updatePriceFactor('materialCostPerKg', e.target.value)}
                          />
                        </div>
                        <div className="mb-1 w-24">
                          <select 
                            value={quote.materialCurrency}
                            onChange={(e) => handleMaterialCurrencyChange(e.target.value as Currency)}
                            className="block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white"
                          >
                            <option value="CZK">CZK</option>
                            <option value="EUR">EUR</option>
                            <option value="USD">USD</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        <NumberInput 
                          label="Doprava materiálu (jednorázově)" 
                          suffix={quote.materialCurrency}
                          value={quote.shippingCost}
                          min={0}
                          onChange={(e) => setQuote(prev => ({...prev, shippingCost: parseFloat(e.target.value)}))}
                        />
                      </div>

                      {quote.materialCurrency !== 'CZK' && (
                        <div className="bg-amber-50 p-3 rounded-md border border-amber-200 mt-3">
                          <label className="block text-xs font-medium text-amber-800 mb-1 flex items-center gap-1">
                            <ArrowRightLeft size={12}/> Kurz {quote.materialCurrency} → CZK
                          </label>
                          <div className="flex gap-2">
                            <input 
                              type="number"
                              value={quote.materialExchangeRate}
                              onChange={(e) => setQuote(prev => ({...prev, materialExchangeRate: parseFloat(e.target.value) || 1}))}
                              onKeyDown={(e) => {
                                  if (['e', 'E', '+', '-'].includes(e.key)) {
                                    e.preventDefault();
                                  }
                              }}
                              className="block w-full rounded-md border-amber-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm border p-2 bg-white text-amber-900"
                            />
                            <button
                              onClick={handleFetchCurrentRate}
                              disabled={isFetchingRate}
                              title="Načíst aktuální kurz z internetu"
                              className="px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-md border border-amber-300 transition-colors"
                            >
                              {isFetchingRate ? <RefreshCw size={18} className="animate-spin"/> : <DownloadCloud size={18}/>}
                            </button>
                          </div>
                          <div className="text-[10px] text-amber-600 mt-1 text-right">
                            Zdroj: frankfurter.app
                          </div>
                        </div>
                      )}

                      <div className="mt-2 pt-2 border-t border-slate-100">
                          <label className="block text-sm font-medium text-slate-700 mb-2">Poznámky pro dodavatele (PDF)</label>
                          <textarea 
                              className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white"
                              value={quote.notes || ''} 
                              onChange={(e) => setQuote({...quote, notes: e.target.value})}
                              placeholder="Např. Požadujeme atest 3.1, specifické balení..."
                              rows={2}
                          />
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-slate-700">
                          {quote.crossSection === CrossSectionType.SHEET ? 'Rozměry dílu (výpalku)' : 'Rozměry polotovaru'}
                        </span>
                        <div className="flex bg-white rounded border border-slate-200 p-1">
                          <button 
                            onClick={() => setQuote(p => ({...p, dimensions: {...p.dimensions, unit: 'mm'}}))}
                            className={`text-xs px-2 py-1 rounded ${quote.dimensions.unit === 'mm' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-slate-500'}`}
                          >
                            mm
                          </button>
                          <button 
                            onClick={() => setQuote(p => ({...p, dimensions: {...p.dimensions, unit: 'inch'}}))}
                            className={`text-xs px-2 py-1 rounded ${quote.dimensions.unit === 'inch' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-slate-500'}`}
                          >
                            inch
                          </button>
                        </div>
                      </div>

                      {/* Isometric View */}
                      <MaterialVisualizer type={quote.crossSection} />

                      <div className="space-y-3 flex-grow">
                        {/* For SHEET, separate stock inputs are moved up. Only show Part dims here */}
                        
                        {quote.crossSection === CrossSectionType.SHEET ? (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                              <NumberInput 
                                label="Délka dílu (X)" 
                                suffix={quote.dimensions.unit}
                                value={quote.dimensions.length}
                                onChange={(e) => updateDimension('length', e.target.value)}
                              />
                              <NumberInput 
                                label="Šířka dílu (Y)" 
                                suffix={quote.dimensions.unit}
                                value={quote.dimensions.width}
                                onChange={(e) => updateDimension('width', e.target.value)}
                              />
                            </div>
                            <NumberInput 
                                label="Prořez / Odpad" 
                                suffix="%"
                                value={quote.cutOffWastePercentage}
                                onChange={(e) => setQuote(p => ({...p, cutOffWastePercentage: parseFloat(e.target.value) || 0}))}
                            />
                          </>
                        ) : (
                          // Standard Bar Inputs
                          <>
                            <div className="grid grid-cols-2 gap-4">
                              <NumberInput 
                                label={getLengthLabel()} 
                                suffix={quote.dimensions.unit}
                                value={quote.dimensions.length}
                                onChange={(e) => updateDimension('length', e.target.value)}
                              />
                              <NumberInput 
                                label="Prořez / Odpad" 
                                suffix="%"
                                value={quote.cutOffWastePercentage}
                                onChange={(e) => setQuote(p => ({...p, cutOffWastePercentage: parseFloat(e.target.value) || 0}))}
                              />
                            </div>
                            
                            <NumberInput 
                              label={getWidthLabel()} 
                              suffix={quote.dimensions.unit}
                              value={quote.dimensions.width}
                              onChange={(e) => updateDimension('width', e.target.value)}
                            />

                            {quote.crossSection === CrossSectionType.RECTANGULAR && (
                              <NumberInput 
                                label="Výška (V)" 
                                suffix={quote.dimensions.unit}
                                value={quote.dimensions.height}
                                onChange={(e) => updateDimension('height', e.target.value)}
                              />
                            )}
                          </>
                        )}
                      </div>

                      {/* Weight & Cost Display */}
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                          <div>
                            <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                              <Scale size={12}/> Hmotnost / ks (hrubá)
                            </div>
                            <div className="font-semibold text-slate-700">{calculated.materialWeightPerPart.toFixed(3)} kg</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                              <Scale size={12}/> Hmotnost dávky
                            </div>
                            <div className="font-semibold text-slate-700">{calculated.materialWeight.toFixed(3)} kg</div>
                          </div>
                          
                          <div>
                            <div className="text-xs text-slate-500 mb-1 flex items-center gap-1 text-amber-600">
                              <Scissors size={12}/> Odpad (z prořezu)
                            </div>
                            <div className="text-xs font-semibold text-amber-700">
                              {calculated.materialWasteWeightPerPart.toFixed(3)} kg / ks
                              <span className="block">
                                {formatNative(calculated.materialWasteCostPerPartNative, quote.materialCurrency)} / ks
                              </span>
                              <span className="block opacity-75 border-t border-amber-200 mt-0.5 pt-0.5">
                                  {formatCZK(calculated.materialWasteCostCZK)} celkem
                              </span>
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                              <DollarSign size={12}/> Cena celkem ({quote.materialCurrency})
                            </div>
                            <div className="font-semibold text-slate-700">
                              {formatNative(calculated.materialCostTotalNative, quote.materialCurrency)}
                              <span className="text-xs font-normal text-slate-500 block">
                                {formatNative(calculated.materialCostPerPartNative, quote.materialCurrency)} / ks (vč. odpadu)
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Bar/Sheet Estimates */}
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <div className="flex justify-between items-center mb-2">
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                                <Ruler size={12}/> {quote.crossSection === CrossSectionType.SHEET ? "Odhad polotovaru (plechy)" : "Odhad polotovaru (tyče)"}
                            </div>
                            <button
                              onClick={handleGenerateRFQ}
                              className="text-[10px] flex items-center gap-1 bg-white border border-slate-300 px-2 py-1 rounded hover:bg-slate-50 text-slate-700 transition-colors"
                              title="Vytvořit poptávku materiálu (PDF)"
                            >
                              <FileText size={10} /> PDF Poptávka
                            </button>
                          </div>
                          
                          {quote.crossSection === CrossSectionType.SHEET ? (
                            <SheetNestingVisualizer 
                                sheetWidth={parseInt(quote.sheetFormat.split('x')[0])} 
                                sheetLength={parseInt(quote.sheetFormat.split('x')[1])}
                                partWidth={quote.dimensions.unit === 'inch' ? quote.dimensions.width * 25.4 : quote.dimensions.width}
                                partLength={quote.dimensions.unit === 'inch' ? quote.dimensions.length * 25.4 : quote.dimensions.length}
                                totalQuantity={quote.quantity + (isNaN(quote.scrapCount) ? 0 : quote.scrapCount)}
                            />
                          ) : (
                            <div className="space-y-3">
                              <BarNestingVisualizer 
                                  barLength={3000} 
                                  barLabel="3m tyč" 
                                  partLength={quote.dimensions.unit === 'inch' ? quote.dimensions.length * 25.4 : quote.dimensions.length} 
                                  wastePercentage={quote.cutOffWastePercentage} 
                              />
                              <BarNestingVisualizer 
                                  barLength={6000} 
                                  barLabel="6m tyč" 
                                  partLength={quote.dimensions.unit === 'inch' ? quote.dimensions.length * 25.4 : quote.dimensions.length} 
                                  wastePercentage={quote.cutOffWastePercentage} 
                              />
                              
                              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100">
                                  <div className="text-center">
                                    <span className="block text-[10px] text-slate-400">Potřeba 3m tyčí</span>
                                    <span className="font-semibold text-slate-700 text-sm">{calculated.barCount3m} ks</span>
                                  </div>
                                  <div className="text-center border-l border-slate-100">
                                    <span className="block text-[10px] text-slate-400">Potřeba 6m tyčí</span>
                                    <span className="font-semibold text-slate-700 text-sm">{calculated.barCount6m} ks</span>
                                  </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* Column 2: Machining & Operations (Moved here for XL screens) */}
              <div className="space-y-8">
                {/* 3. Machine Time & Labor */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                    <Clock className="text-blue-500" size={20}/> Obrábění a práce
                  </h2>

                  <div className="grid grid-cols-1 gap-8">
                    <InputGroup label="Příprava (Jednorázově)">
                      <div className="space-y-3">
                        {renderPrepRow("3D Modelování", quote.time3D, 'time3D')}
                        {renderPrepRow("CAM Příprava", quote.timeCAM, 'timeCAM')}
                        {renderPrepRow("Setup stroje", quote.timeMachineSetup, 'timeMachineSetup')}
                        {renderPrepRow("Inspekce", quote.timeInspection, 'timeInspection')}
                        {renderPrepRow("Expedice", quote.timeExpedition, 'timeExpedition')}
                      </div>
                      
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <NumberInput 
                          label="Hodinová sazba přípravy" 
                          suffix="Kč / hod"
                          value={quote.factors.setupRatePerHour}
                          onChange={(e) => updateFactor('setupRatePerHour', e.target.value)}
                        />
                      </div>
                    </InputGroup>

                    <InputGroup label="Výrobní operace (Za kus)">
                      <div className="space-y-3">
                        {quote.operations.map((op, index) => (
                          <div key={op.id} className="bg-slate-50 p-3 rounded-md border border-slate-200 relative group animate-in slide-in-from-left-2 duration-300">
                            <button 
                              onClick={() => handleRemoveOperation(op.id)}
                              className="absolute top-2 right-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1"
                              title="Odstranit operaci"
                            >
                              <Trash2 size={16} />
                            </button>
                            
                            <div className="mb-2 pr-6">
                              <label className="block text-xs text-slate-500 mb-1">Název operace</label>
                              <input 
                                type="text" 
                                value={op.name}
                                onChange={(e) => handleUpdateOperation(op.id, 'name', e.target.value)}
                                placeholder="Např. Soustružení"
                                className="w-full text-sm font-medium bg-transparent border-b border-slate-300 focus:border-blue-500 focus:ring-0 px-0 py-1"
                              />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                  <label className="block text-xs text-slate-500 mb-1">Čas (min)</label>
                                  <input 
                                    type="number"
                                    value={op.timePerPart}
                                    onChange={(e) => handleUpdateOperation(op.id, 'timePerPart', e.target.value)}
                                    className="w-full text-sm bg-white border border-slate-300 rounded px-2 py-1"
                                  />
                              </div>
                              <div>
                                  <label className="block text-xs text-slate-500 mb-1">Sazba (Kč/h)</label>
                                  <input 
                                    type="number"
                                    value={op.hourlyRate}
                                    onChange={(e) => handleUpdateOperation(op.id, 'hourlyRate', e.target.value)}
                                    className="w-full text-sm bg-white border border-slate-300 rounded px-2 py-1"
                                  />
                              </div>
                            </div>
                            <div className="text-right mt-2 text-xs font-medium text-slate-600">
                              {formatCZK((op.timePerPart / 60) * op.hourlyRate)} / ks
                            </div>
                          </div>
                        ))}
                        
                        <button 
                          onClick={handleAddOperation}
                          className="w-full py-2 border-2 border-dashed border-slate-300 rounded-md text-slate-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                        >
                          <Plus size={16} /> Přidat operaci
                        </button>
                      </div>
                    </InputGroup>

                    <InputGroup label="Dokončovací práce">
                      <NumberInput 
                        label="Úprava/Elox" 
                        suffix="Kč / kus"
                        value={quote.factors.postProcessCostPerPart}
                        onChange={(e) => updateFactor('postProcessCostPerPart', e.target.value)}
                      />
                    </InputGroup>

                    <InputGroup label="Ziskovost">
                      <NumberInput 
                        label="Marže" 
                        suffix="%"
                        value={quote.factors.markupPercentage}
                        onChange={(e) => updateFactor('markupPercentage', e.target.value)}
                      />
                    </InputGroup>
                  </div>
                </section>
              </div>

            </div>

            {/* RIGHT COLUMN - SUMMARY */}
            <div className="lg:col-span-4 xl:col-span-3 print:w-full">
              <QuoteSummary calculated={calculated} materialCurrency={quote.materialCurrency} />
              
              <button 
                onClick={() => {
                  setIsEmailModalOpen(true);
                  handleGenerateEmail();
                }}
                className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 px-4 rounded-xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] print:hidden"
              >
                <Sparkles size={18} className="text-yellow-200" />
                Vygenerovat e-mail pro klienta
              </button>
            </div>
          </div>
        )}
      </main>

      {/* AI Email Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="text-blue-500" size={20} />
                AI Asistent návrhu
              </h3>
              <button 
                onClick={() => setIsEmailModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  <p className="text-slate-500 text-sm animate-pulse">Konzultuji s Gemini pro vytvoření perfektního e-mailu...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <p className="text-sm text-blue-800">
                      <strong>Poznámka:</strong> Tento návrh obsahuje vaši vypočítanou cenu 
                      <span className="font-bold mx-1">
                        {formatCZK(calculated.totalPrice)}
                      </span> 
                      pro {quote.quantity} kusů.
                    </p>
                  </div>
                  <textarea 
                    className="w-full h-64 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm leading-relaxed bg-white"
                    value={generatedEmail}
                    onChange={(e) => setGeneratedEmail(e.target.value)}
                  ></textarea>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
              <button 
                onClick={() => handleGenerateEmail()}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium text-sm flex items-center gap-2"
              >
                <Sparkles size={16} /> Přeformulovat
              </button>
              <button 
                onClick={() => {
                   navigator.clipboard.writeText(generatedEmail);
                   setIsEmailModalOpen(false);
                }}
                disabled={isGenerating}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
              >
                <Mail size={16} /> Kopírovat do schránky
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;