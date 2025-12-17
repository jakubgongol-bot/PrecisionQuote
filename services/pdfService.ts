import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { QuoteDetails, CalculatedQuote, MaterialDefinition, CrossSectionType } from "../types";

// Helper to strip accents for standard PDF fonts (reduces file size/complexity vs embedding fonts)
const removeAccents = (str: string) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export const generateMaterialRFQ = (
  quote: QuoteDetails,
  calculated: CalculatedQuote,
  materials: MaterialDefinition[]
) => {
  const doc = new jsPDF();
  const selectedMaterial = materials.find(m => m.id === quote.material);
  const materialName = selectedMaterial?.name || quote.material;
  const dateStr = new Date().toLocaleDateString('cs-CZ');

  // Title
  doc.setFontSize(20);
  doc.text(removeAccents("Poptavka materialu (RFQ)"), 14, 22);

  doc.setFontSize(10);
  doc.text(removeAccents(`Datum: ${dateStr}`), 14, 30);
  
  // Header Info
  doc.setFontSize(12);
  doc.text(removeAccents("Odběratel:"), 14, 45);
  doc.setFontSize(10);
  doc.text(removeAccents("Vase CNC Firma s.r.o."), 14, 50);
  doc.text(removeAccents("Prumyslova 123"), 14, 55);
  doc.text(removeAccents("123 00 Praha"), 14, 60);

  // Description
  doc.setFontSize(11);
  doc.text(removeAccents("Dobry den,"), 14, 75);
  doc.text(removeAccents("prosim o cenovou nabidku a termin dodani pro nasledujici hutni material:"), 14, 82);

  // Determine Dimension String & Quantity String
  let dimString = "";
  let qtyString = "";
  const unit = quote.dimensions.unit;

  if (quote.crossSection === CrossSectionType.SHEET) {
     dimString = `Plech tl. ${quote.dimensions.height}${unit} (${quote.sheetFormat})`;
     qtyString = `${calculated.sheetCount} ks (Format ${quote.sheetFormat})`;
  } else {
      if (quote.crossSection === CrossSectionType.ROUND) {
        dimString = `D ${quote.dimensions.width}${unit}`;
      } else if (quote.crossSection === CrossSectionType.HEX) {
        dimString = `HEX ${quote.dimensions.width}${unit}`;
      } else {
        dimString = `${quote.dimensions.width}x${quote.dimensions.height}${unit}`;
      }

      if (calculated.barCount6m > 0) {
         qtyString += `${calculated.barCount6m}x 6m tyc`;
      }
      if (calculated.barCount3m > 0) {
         if (qtyString) qtyString += ", ";
         qtyString += `${calculated.barCount3m}x 3m tyc`;
      }
  }

  // Fallback if bars aren't calculated cleanly or small pieces (or sheets)
  const totalWeight = calculated.materialWeight.toFixed(1);
  
  if (!qtyString) {
      if (quote.crossSection === CrossSectionType.SHEET) {
          qtyString = "0 ks";
      } else {
          const totalMeters = (calculated.totalLengthNeeded / 1000).toFixed(1);
          qtyString = `Celkem: ${totalMeters}m (${totalWeight}kg)`;
      }
  }

  // Table Data
  const tableBody = [
    [
      removeAccents(materialName),
      dimString,
      removeAccents(qtyString),
      `${totalWeight} kg`
    ]
  ];

  autoTable(doc, {
    startY: 90,
    head: [[
        removeAccents("Material"), 
        removeAccents("Rozmer"), 
        removeAccents("Poptavane mnozstvi"), 
        removeAccents("Vaha cca")
    ]],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] }, // Blue header
  });

  // Footer / Notes
  const finalY = (doc as any).lastAutoTable.finalY || 120;
  let currentY = finalY + 10;

  if (quote.notes) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(removeAccents("Poznamky:"), 14, currentY);
    currentY += 5;
    
    doc.setFont("helvetica", "normal");
    const splitNotes = doc.splitTextToSize(removeAccents(quote.notes), 180);
    doc.text(splitNotes, 14, currentY);
    currentY += (splitNotes.length * 5) + 5;
  }
  
  doc.text(removeAccents("Prosim o naceneni vcetne dopravy."), 14, currentY);
  currentY += 10;
  doc.text(removeAccents("Dekuji,"), 14, currentY);
  currentY += 5;
  doc.text(removeAccents("Tym nakupu"), 14, currentY);

  // Save
  const safeName = removeAccents(materialName).replace(/\s+/g, '_');
  doc.save(`RFQ_${safeName}_${dateStr}.pdf`);
};