
import { CrossSectionType } from './types';

export const DEFAULT_QUOTE = {
  customerName: '',
  partName: '',
  quantity: 1,
  scrapCount: 0,
  material: 'ALUMINUM_6061', // Default ID
  crossSection: CrossSectionType.RECTANGULAR,
  sheetFormat: '1000x2000' as const,
  dimensions: {
    length: 100,
    width: 50,
    height: 25,
    unit: 'mm' as const
  },
  cutOffWastePercentage: 0,
  shippingCost: 0,
  
  // Detailed Preparation Times (Hours)
  time3D: 0,
  timeCAM: 0,
  timeMachineSetup: 1, // Default 1 hour setup
  timeInspection: 0,
  timeExpedition: 0,

  // Default Operations
  operations: [
    { id: 'op_1', name: 'CNC Obrábění', timePerPart: 15, hourlyRate: 1500 }
  ],

  factors: {
    materialCostPerKg: 250, // default in CZK
    setupRatePerHour: 1200,
    postProcessCostPerPart: 100,
    markupPercentage: 20
  },
  materialCurrency: 'CZK' as const,
  materialExchangeRate: 1,
  notes: ''
};