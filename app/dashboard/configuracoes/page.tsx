'use client';

import { useState, useEffect } from 'react';
import { useSummary } from '@/hooks/useSummary';

export default function ConfigPage() {
  const { data, isLoading } = useSummary({});
  const availableProducts = data?.available_products || [];

  const [frontProducts, setFrontProducts] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [saveMessage, setSaveMessage] = useState('');

  // Fetch current settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings?key=front_products');
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          setFrontProducts(json.data[0].value || []);
        }
      } catch (e) {
        console.error('Error loading settings', e);
      } finally {
        setIsLoadingSettings(false);
      }
    }
    loadSettings();
  }, []);

  const toggleProduct = (prod: string) => {
    setFrontProducts(prev => 
      prev.includes(prod) 
        ? prev.filter(p => p !== prod)
        : [...prev, prod]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'front_products', value: frontProducts })
      });
      
      if (!res.ok) throw new Error('Falha ao salvar');
      
      setSaveMessage('Configurações salvas com sucesso!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (e: any) {
      setSaveMessage('Erro: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-[#1E1E1E] rounded-xl p-6 shadow-sm border border-[#333]">
        <h2 className="text-xl font-semibold text-white mb-2">Configurações de CPA (Produtos Front-end)</h2>
        <p className="text-gray-400 text-sm mb-6">
          Selecione abaixo quais produtos são considerados <strong>Front-end</strong> (produto principal). 
          O cálculo de CPA dividirá os gastos apenas pelo número de vendas dos produtos selecionados, 
          ignorando Order Bumps e Upsells. Se nenhum for selecionado, todas as vendas aprovadas serão contadas.
        </p>

        {isLoading || isLoadingSettings ? (
          <div className="text-gray-500 text-sm animate-pulse">Carregando lista de produtos da Hotmart...</div>
        ) : (
          <div className="space-y-4">
            {availableProducts.length === 0 ? (
              <p className="text-gray-500 text-sm">Nenhum produto encontrado nas planilhas recentes.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableProducts.map(prod => {
                  const isSelected = frontProducts.includes(prod);
                  return (
                    <label 
                      key={prod} 
                      className={`flex items-start p-4 rounded-lg border cursor-pointer transition-colors ${
                        isSelected 
                          ? 'border-[#0f62fe] bg-[#0f62fe]/10' 
                          : 'border-[#333] bg-[#242424] hover:border-gray-500'
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        className="mt-1 mr-3 w-4 h-4 rounded border-gray-600 bg-gray-700 text-[#0f62fe] focus:ring-[#0f62fe]"
                        checked={isSelected}
                        onChange={() => toggleProduct(prod)}
                      />
                      <span className="text-sm text-gray-200">{prod}</span>
                    </label>
                  );
                })}
              </div>
            )}

            <div className="pt-4 flex items-center gap-4 border-t border-[#333] mt-6">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="bg-[#0f62fe] hover:bg-[#0353e9] disabled:opacity-50 text-white px-6 py-2 rounded-md font-medium transition-colors"
              >
                {isSaving ? 'Salvando...' : 'Salvar Configurações'}
              </button>
              
              {saveMessage && (
                <span className={`text-sm ${saveMessage.includes('Erro') ? 'text-red-500' : 'text-green-500'}`}>
                  {saveMessage}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
