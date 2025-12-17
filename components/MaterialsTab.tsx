import React, { useState } from 'react';
import { MaterialDefinition } from '../types';
import { Save, Plus, Trash2, Download, AlertCircle } from 'lucide-react';

interface MaterialsTabProps {
  materials: MaterialDefinition[];
  setMaterials: React.Dispatch<React.SetStateAction<MaterialDefinition[]>>;
}

export const MaterialsTab: React.FC<MaterialsTabProps> = ({ materials, setMaterials }) => {
  const [newMaterial, setNewMaterial] = useState({ name: '', density: '', price: '' });

  const handleAdd = () => {
    if (!newMaterial.name || !newMaterial.density) return;

    const densityNum = parseFloat(newMaterial.density);
    // Price is optional, but if entered, must be number
    const priceNum = newMaterial.price ? parseFloat(newMaterial.price) : 0;

    if (isNaN(densityNum)) return;

    // Generate ID from name (e.g., "Ocel 123" -> "OCEL_123")
    // Normalize removes accents, regex removes non-alphanumeric chars
    const id = newMaterial.name
      .toUpperCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
      .replace(/[^A-Z0-9]/g, '_');

    // Check for duplicate ID
    if (materials.some(m => m.id === id)) {
      alert('Materiál s podobným názvem již existuje (ID kolize). Zkuste jiný název.');
      return;
    }

    const material: MaterialDefinition = {
      id,
      name: newMaterial.name,
      density: densityNum,
      defaultPricePerKg: priceNum > 0 ? priceNum : undefined
    };

    setMaterials(prev => [...prev, material]);
    setNewMaterial({ name: '', density: '', price: '' });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Opravdu chcete smazat tento materiál?')) {
      setMaterials(prev => prev.filter(m => m.id !== id));
    }
  };

  const handleDownload = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(materials, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "materials.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleNumericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['e', 'E', '+', '-'].includes(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
        <div>
          <h3 className="text-sm font-bold text-blue-800">Jak uložit změny?</h3>
          <p className="text-sm text-blue-700 mt-1">
            Webové aplikace nemohou přímo přepisovat soubory na vašem disku. 
            Upravte materiály zde v tabulce a poté klikněte na tlačítko <strong>Stáhnout materials.json</strong>. 
            Stažený soubor pak nahraďte za původní soubor ve složce aplikace.
          </p>
        </div>
      </div>

      {/* Add New Section */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Plus className="text-blue-500" size={20} /> Přidat nový materiál
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Název materiálu</label>
            <input
              type="text"
              value={newMaterial.name}
              onChange={e => setNewMaterial({ ...newMaterial, name: e.target.value })}
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              placeholder="Např. Titan Grade 5"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hustota (g/cm³)</label>
            <input
              type="number"
              step="0.01"
              value={newMaterial.density}
              onChange={e => setNewMaterial({ ...newMaterial, density: e.target.value })}
              onKeyDown={handleNumericKeyDown}
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              placeholder="4.43"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cena (Kč/kg)</label>
            <input
              type="number"
              step="1"
              value={newMaterial.price}
              onChange={e => setNewMaterial({ ...newMaterial, price: e.target.value })}
              onKeyDown={handleNumericKeyDown}
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              placeholder="Volitelné"
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={handleAdd}
            disabled={!newMaterial.name || !newMaterial.density}
            className="w-full md:w-auto bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
          >
            <Plus size={18} /> Přidat
          </button>
        </div>
      </section>

      {/* List Section */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Seznam materiálů ({materials.length})</h2>
          <button
            onClick={handleDownload}
            className="bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium flex items-center gap-2 px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <Download size={16} /> Stáhnout materials.json
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Název</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ID (Systémové)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Hustota (g/cm³)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cena (Kč/kg)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Akce</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {materials.map((material) => (
                <tr key={material.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{material.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-mono text-xs">{material.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{material.density.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                    {material.defaultPricePerKg ? `${material.defaultPricePerKg} Kč` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDelete(material.id)}
                      className="text-slate-300 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50"
                      title="Odstranit"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {materials.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 text-sm">
                    Žádné materiály. Přidejte první materiál nahoře.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};