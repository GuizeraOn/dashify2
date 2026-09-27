'use client';

import { useState, useEffect } from 'react';
import { useSummary } from '@/hooks/useSummary';
import { getEmailTemplate, saveEmailTemplate } from './actions';

export default function ConfigPage() {
  const { data, isLoading } = useSummary({});
  const availableProducts = data?.available_products || [];

  // Front-end Products State
  const [frontProducts, setFrontProducts] = useState<string[]>([]);
  const [isSavingFront, setIsSavingFront] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [saveMessageFront, setSaveMessageFront] = useState('');

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
        // Load Front Products
        const res = await fetch('/api/settings?key=front_products');
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          setFrontProducts(json.data[0].value || []);
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
          setEmailSender('Soporte <contacto@noticiasde-ultimahora.online>');
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

  const toggleProduct = (prod: string) => {
    setFrontProducts(prev => 
      prev.includes(prod) 
        ? prev.filter(p => p !== prod)
        : [...prev, prod]
    );
  };

  const handleSaveFront = async () => {
    setIsSavingFront(true);
    setSaveMessageFront('');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'front_products', value: frontProducts })
      });
      
      if (!res.ok) throw new Error('Falha ao salvar');
      
      setSaveMessageFront('Configurações salvas com sucesso!');
      setTimeout(() => setSaveMessageFront(''), 3000);
    } catch (e: any) {
      setSaveMessageFront('Erro: ' + e.message);
    } finally {
      setIsSavingFront(false);
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
      
      {/* 1. Configurações de CPA */}
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
                onClick={handleSaveFront}
                disabled={isSavingFront}
                className="bg-[#0f62fe] hover:bg-[#0353e9] disabled:opacity-50 text-white px-6 py-2 rounded-md font-medium transition-colors"
              >
                {isSavingFront ? 'Salvando...' : 'Salvar Configurações'}
              </button>
              
              {saveMessageFront && (
                <span className={`text-sm ${saveMessageFront.includes('Erro') ? 'text-red-500' : 'text-green-500'}`}>
                  {saveMessageFront}
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
