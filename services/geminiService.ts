import { GoogleGenAI } from "@google/genai";
import { QuoteDetails, CalculatedQuote, CrossSectionType } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateQuoteEmail = async (
  details: QuoteDetails,
  calculated: CalculatedQuote
): Promise<string> => {
  let profileName = "Hranatý profil";
  if (details.crossSection === CrossSectionType.ROUND) profileName = "Kulatina";
  if (details.crossSection === CrossSectionType.HEX) profileName = "Šestihran";

  const formatCZK = (val: number) => 
    new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' }).format(val);

  const prompt = `
    Jste profesionální asistent pro CNC obráběcí firmu.
    Napište zdvořilý, profesionální a stručný e-mail zákazníkovi s přiloženou cenovou nabídkou (simulovanou).
    E-mail musí být v českém jazyce.
    
    Jméno zákazníka: ${details.customerName}
    Název dílu: ${details.partName}
    Množství: ${details.quantity}
    Materiál: ${details.material} (${profileName})
    
    Detaily nabídky:
    - Cena za kus: ${formatCZK(calculated.pricePerPart)}
    - Celková cena projektu: ${formatCZK(calculated.totalPrice)}
    - Dodací lhůta: (Ponechte místo pro doplnění dodací lhůty)
    
    Tón by měl být obchodně-přátelský, ale přesný. Zdůrazněte kvalitu a přesnost.
    Nezahrnujte předmět e-mailu, pouze tělo zprávy.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Nepodařilo se vygenerovat e-mail.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Chyba při generování e-mailu. Zkontrolujte prosím připojení nebo API klíč.";
  }
};