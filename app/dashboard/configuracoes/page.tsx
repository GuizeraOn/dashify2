'use client';

import { useState, useEffect } from 'react';
import { useSummary } from '@/hooks/useSummary';
import { getEmailTemplate, saveEmailTemplate } from './actions';

export default function ConfigPage() {
  const { data, isLoading } = useSummary({});
  const availableProducts = data?.available_products || [];

  // Product Categories State
  const [productCategories, setProductCategories] = useState<Record<string, 'front' | 'order_bump' | 'upsell' | 'ignore'>>({});
  const [isSavingCategories, setIsSavingCategories] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [saveMessageCategories, setSaveMessageCategories] = useState('');

  // Email Template State
  const [emailSubject, setEmailSubject] = useState('');
  const [emailSender, setEmailSender] = useState('');
  const [emailHtml, setEmailHtml] = useState('');
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [saveMessageEmail, setSaveMessageEmail] = useState('');

  // Fetch current settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        // Load Product Categories
        const res = await fetch('/api/settings?key=product_categories');
        const json = await res.json();
        
        if (json.data && json.data.length > 0) {
          const value = json.data[0].value;
          // Compatibility with old "front_products" array format if needed, but we saved it as a different key here
          if (typeof value === 'object' && !Array.isArray(value)) {
            setProductCategories(value);
          }
        } else {
          // If product_categories doesn't exist, try loading old front_products to migrate
          const resOld = await fetch('/api/settings?key=front_products');
          const jsonOld = await resOld.json();
          if (jsonOld.data && jsonOld.data.length > 0) {
            const oldArray = jsonOld.data[0].value || [];
            if (Array.isArray(oldArray)) {
              const migrated: Record<string, any> = {};
              oldArray.forEach(p => { migrated[p] = 'front'; });
              setProductCategories(migrated);
            }
          }
        }

        // Load Email Template
        const emailRes = await getEmailTemplate();
        if (emailRes.success && emailRes.data) {
          setEmailSubject(emailRes.data.subject || '');
          setEmailSender(emailRes.data.sender_email || '');
          setEmailHtml(emailRes.data.html_body || '');
        } else {
          // Default fallbacks if empty
          setEmailSubject('✅ Tu acceso a El Protocolo del Vinagre está listo, [nome]');
          setEmailSender('Dr. Alejandro Vargas <contacto@noticiasde-ultimahora.online>');
          setEmailHtml('<p>Hola [nome],</p>\\n<p>Tu acceso: [email]</p>\\n<p>Tu producto: [produto]</p>');
        }
      } catch (e) {
        console.error('Error loading settings', e);
      } finally {
        setIsLoadingSettings(false);
      }
    }
    loadSettings();
  }, []);

  const setCategory = (prod: string, cat: 'front' | 'order_bump' | 'upsell' | 'ignore') => {
    setProductCategories(prev => ({
      ...prev,
      [prod]: cat
    }));
  };

  const handleSaveCategories = async () => {
    setIsSavingCategories(true);
    setSaveMessageCategories('');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'product_categories', value: productCategories })
      });
      
      if (!res.ok) throw new Error('Falha ao salvar');
      
      setSaveMessageCategories('Configurações salvas com sucesso!');
      setTimeout(() => setSaveMessageCategories(''), 3000);
    } catch (e: any) {
      setSaveMessageCategories('Erro: ' + e.message);
    } finally {
      setIsSavingCategories(false);
    }
  };

  const handleSaveEmail = async () => {
    setIsSavingEmail(true);
    setSaveMessageEmail('');
    try {
      const res = await saveEmailTemplate({
        subject: emailSubject,
        sender_email: emailSender,
        html_body: emailHtml
      });
      
      if (!res.success) throw new Error(res.error || 'Erro desconhecido');
      
      setSaveMessageEmail('Template de e-mail atualizado!');
      setTimeout(() => setSaveMessageEmail(''), 3000);
    } catch (e: any) {
      setSaveMessageEmail('Erro: ' + e.message);
    } finally {
      setIsSavingEmail(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-12 animate-in fade-in duration-500">
      <h1 className="text-2xl font-bold text-white mb-6">Configurações do Sistema</h1>
      
      {/* 1. Configurações de Produtos e CPA */}
      <div className="bg-[#1E1E1E] rounded-xl p-6 shadow-sm border border-[#333]">
        <h2 className="text-xl font-semibold text-white mb-2">Categorização de Produtos (Funil e CPA)</h2>
        <p className="text-gray-400 text-sm mb-6">
          Classifique seus produtos para que o Dashboard calcule as métricas corretamente. <br/>
          O <strong>CPA e a Conversão de Checkout</strong> são calculados exclusivamente sobre os produtos marcados como <strong>Front-end</strong>.
        </p>

        {isLoading || isLoadingSettings ? (
          <div className="text-gray-500 text-sm animate-pulse">Carregando lista de produtos da PerfectPay...</div>
        ) : (
          <div className="space-y-4">
            {availableProducts.length === 0 ? (
              <p className="text-gray-500 text-sm">Nenhum produto encontrado nas vendas recentes.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {availableProducts.map(prod => {
                  const currentCat = productCategories[prod] || 'ignore';
                  return (
                    <div key={prod} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-[#333] bg-[#242424] gap-4">
                      <span className="text-sm text-gray-200 font-medium truncate flex-1">{prod}</span>
                      <div className="flex gap-2">
                        <label className={`cursor-pointer px-3 py-1.5 text-xs rounded-md border transition-colors ${currentCat === 'front' ? 'bg-[#0f62fe]/20 border-[#0f62fe] text-[#0f62fe]' : 'border-[#444] text-gray-400 hover:border-gray-500'}`}>
                          <input type="radio" className="hidden" checked={currentCat === 'front'} onChange={() => setCategory(prod, 'front')} />
                          Front-end
                        </label>
                        <label className={`cursor-pointer px-3 py-1.5 text-xs rounded-md border transition-colors ${currentCat === 'order_bump' ? 'bg-amber-500/20 border-amber-500 text-amber-500' : 'border-[#444] text-gray-400 hover:border-gray-500'}`}>
                          <input type="radio" className="hidden" checked={currentCat === 'order_bump'} onChange={() => setCategory(prod, 'order_bump')} />
                          Order Bump
                        </label>
                        <label className={`cursor-pointer px-3 py-1.5 text-xs rounded-md border transition-colors ${currentCat === 'upsell' ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'border-[#444] text-gray-400 hover:border-gray-500'}`}>
                          <input type="radio" className="hidden" checked={currentCat === 'upsell'} onChange={() => setCategory(prod, 'upsell')} />
                          Upsell
                        </label>
                        <label className={`cursor-pointer px-3 py-1.5 text-xs rounded-md border transition-colors ${currentCat === 'ignore' ? 'bg-gray-500/20 border-gray-500 text-gray-300' : 'border-[#444] text-gray-400 hover:border-gray-500'}`}>
                          <input type="radio" className="hidden" checked={currentCat === 'ignore'} onChange={() => setCategory(prod, 'ignore')} />
                          Ignorar
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-4 flex items-center gap-4 border-t border-[#333] mt-6">
              <button 
                onClick={handleSaveCategories}
                disabled={isSavingCategories}
                className="bg-[#0f62fe] hover:bg-[#0353e9] disabled:opacity-50 text-white px-6 py-2 rounded-md font-medium transition-colors"
              >
                {isSavingCategories ? 'Salvando...' : 'Salvar Classificações'}
              </button>
              
              {saveMessageCategories && (
                <span className={`text-sm ${saveMessageCategories.includes('Erro') ? 'text-red-500' : 'text-green-500'}`}>
                  {saveMessageCategories}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. Editor de Template de E-mails */}
      <div className="bg-[#1E1E1E] rounded-xl p-6 shadow-sm border border-[#333]">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-xl font-semibold text-white">Editor de Template de E-mails ✉️</h2>
        </div>
        <p className="text-gray-400 text-sm mb-6">
          Personalize o e-mail de acesso automático enviado pela PerfectPay via Webhook. <br/>
          <strong>Variáveis disponíveis:</strong> <code className="text-[#0f62fe] bg-[#0f62fe]/10 px-1 py-0.5 rounded">[nome]</code>, <code className="text-[#0f62fe] bg-[#0f62fe]/10 px-1 py-0.5 rounded">[email]</code>, <code className="text-[#0f62fe] bg-[#0f62fe]/10 px-1 py-0.5 rounded">[produto]</code>.
        </p>

        {isLoadingSettings ? (
          <div className="text-gray-500 text-sm animate-pulse">Carregando template...</div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">E-mail do Remetente (De: / Responder para:)</label>
              <input 
                type="text" 
                value={emailSender}
                onChange={(e) => setEmailSender(e.target.value)}
                placeholder="Ex: Equipe de Suporte <contato@meudominio.com>"
                className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#0f62fe] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Assunto do E-mail</label>
              <input 
                type="text" 
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Ex: ✅ Seu acesso ao [produto] está liberado, [nome]"
                className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#0f62fe] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Corpo do E-mail (Código HTML)
              </label>
              <p className="text-xs text-gray-500 mb-2">Você pode usar tags HTML básicas como {'<p>, <b>, <a>, <div>'} etc.</p>
              <textarea 
                value={emailHtml}
                onChange={(e) => setEmailHtml(e.target.value)}
                rows={12}
                className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-sm text-gray-300 font-mono focus:outline-none focus:border-[#0f62fe] transition-colors custom-scrollbar"
                placeholder="<p>Olá [nome]...</p>"
              />
            </div>

            <div className="pt-4 flex items-center gap-4 border-t border-[#333] mt-6">
              <button 
                onClick={handleSaveEmail}
                disabled={isSavingEmail}
                className="bg-[#0f62fe] hover:bg-[#0353e9] disabled:opacity-50 text-white px-6 py-2 rounded-md font-medium transition-colors flex items-center gap-2"
              >
                {isSavingEmail ? 'Salvando...' : 'Salvar Template'}
              </button>
              
              {saveMessageEmail && (
                <span className={`text-sm ${saveMessageEmail.includes('Erro') ? 'text-red-500' : 'text-green-500'}`}>
                  {saveMessageEmail}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
