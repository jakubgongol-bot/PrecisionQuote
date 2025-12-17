import { MaterialDefinition } from '../types';

export const loadMaterials = async (filePath: string): Promise<MaterialDefinition[]> => {
  try {
    // Add timestamp to prevent caching since the user updates the JSON file directly
    const url = `${filePath}?t=${new Date().getTime()}`;
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`Failed to load materials from ${filePath}`);
    }
    const data = await response.json();
    return data as MaterialDefinition[];
  } catch (error) {
    console.warn("Error loading materials JSON, using fallback data:", error);
    // Return hardcoded fallback data to ensure app functionality
    return [
      { id: "ALUMINUM_6061", name: "Hliník 6061", density: 2.70, defaultPricePerKg: 180 },
      { id: "ALUMINUM_7075", name: "Hliník 7075", density: 2.81, defaultPricePerKg: 250 },
      { id: "STEEL_1018", name: "Ocel 1018", density: 7.87, defaultPricePerKg: 45 },
      { id: "STEEL_4140", name: "Ocel 4140", density: 7.85, defaultPricePerKg: 65 },
      { id: "STAINLESS_303", name: "Nerez 303", density: 8.00, defaultPricePerKg: 120 },
      { id: "STAINLESS_304", name: "Nerez 304", density: 8.00, defaultPricePerKg: 140 },
      { id: "BRASS_C360", name: "Mosaz C360", density: 8.50, defaultPricePerKg: 280 },
      { id: "DELRIN_ACETAL", name: "Delrin (Acetal)", density: 1.41, defaultPricePerKg: 350 },
      { id: "PEEK", name: "PEEK", density: 1.32, defaultPricePerKg: 2800 },
      { id: "TITANIUM_6AL4V", name: "Titan 6Al-4V", density: 4.43, defaultPricePerKg: 1200 },
      { id: "ABS", name: "ABS Plast", density: 1.04, defaultPricePerKg: 90 },
      { id: "CUSTOM1", name: "Ocel RTS", density: 7.8, defaultPricePerKg: 55 }
    ];
  }
};