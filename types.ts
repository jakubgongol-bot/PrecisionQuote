
export enum CrossSectionType {
  RECTANGULAR = 'RECTANGULAR',
  ROUND = 'ROUND',
  HEX = 'HEX',
  SHEET = 'SHEET'
}

export type SheetFormat = '1000x2000' | '1250x2500' | '1500x3000';

export type Currency = 'CZK' | 'EUR' | 'USD';

export interface MaterialDefinition {
  id: string;
  name: string;
  density: number; // g/cm^3
  defaultPricePerKg?: number; // Base CZK default price
}

export interface MaterialDimensions {
  length: number;
  width: number;
  height: number; // Used for rectangular height or sheet thickness
  unit: 'mm' | 'inch';
}

export interface ProductionOperation {
  id: string;
  name: string;
  timePerPart: number; // minutes
  hourlyRate: number; // CZK/hour
}

export interface CostFactors {
  materialCostPerKg: number;
  // shopRatePerHour removed, moved to specific operations
  setupRatePerHour: number;
  postProcessCostPerPart: number;
  markupPercentage: number;
}

export interface QuoteDetails {
  customerName: string;
  partName: string;
  quantity: number;
  scrapCount: number;
  material: string; // string ID
  crossSection: CrossSectionType;
  sheetFormat: SheetFormat; 
  dimensions: MaterialDimensions;
  cutOffWastePercentage: number;
  shippingCost: number;
  
  // Preparation Times (One-off)
  time3D: number;
  timeCAM: number;
  timeMachineSetup: number;
  timeInspection: number;
  timeExpedition: number;

  // Dynamic Production Operations
  operations: ProductionOperation[];

  factors: CostFactors;
  materialCurrency: Currency;
  materialExchangeRate: number;
  notes: string;
}

export interface CalculatedQuote {
  materialWeight: number; // kg (total gross)
  materialWeightPerPart: number; // kg (per piece gross)
  materialWasteWeightPerPart: number; // kg (waste per piece)
  materialWasteCostCZK: number; // Cost of waste in CZK
  materialWasteCostPerPartNative: number; // Cost of waste per part in native currency
  materialWasteCostPerPartCZK: number; // Cost of waste per part in CZK
  materialCostTotalNative: number; // Cost in materialCurrency
  materialCostTotalCZK: number; // Cost converted to CZK
  materialCostPerPartNative: number; // Cost per part in materialCurrency
  materialCostPerPartCZK: number; // Cost per part converted to CZK
  shippingCostNative: number; // Shipping cost in native currency
  shippingCostCZK: number; // Shipping cost converted to CZK
  setupCostTotal: number;
  machiningCostTotal: number;
  totalMachiningHours: number; // Total hours for all operations across all parts
  postProcessTotal: number;
  subtotal: number;
  markupAmount: number;
  totalPrice: number;
  pricePerPart: number;
  totalProductionCount: number; // New: quantity + scrapCount
  totalLengthNeeded: number; // Total linear mm needed (for bars)
  barCount3m: number; // Number of 3m bars
  barCount6m: number; // Number of 6m bars
  piecesPer3mBar: number; // Pieces that fit in one 3m bar
  piecesPer6mBar: number; // Pieces that fit in one 6m bar
  sheetCount: number; // Number of sheets
}