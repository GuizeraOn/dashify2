import { VendasRow } from '@/lib/types';
import { StatusBadge } from './StatusBadge';
import { X } from 'lucide-react';
import { useEffect } from 'react';

interface SaleDetailsModalProps {
  sale: VendasRow | null;
  onClose: () => void;
}

export function SaleDetailsModal({ sale, onClose }: SaleDetailsModalProps) {
  // Prevent scrolling on body when modal is open
  useEffect(() => {
    if (sale) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [sale]);

  if (!sale) return null;

  const formatCurrency = (val: number, currency: 'BRL' | 'USD' = 'BRL') => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(val || 0);

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    // If it's a valid date string (like "2023-10-10 14:00:00")
    try {
      const parts = dateStr.split(' ');
      if (parts.length === 2) {
        const [date, time] = parts;
        const [year, month, day] = date.split('-');
        return `${day}/${month}/${year} às ${time}`;
      }
      return new Date(dateStr).toLocaleString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl bg-[#1a1a1a] border border-[#333] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#333] bg-[#1E1E1E]">
          <div>
            <h2 className="text-xl font-bold text-white">Detalhes da Venda</h2>
            <p className="text-sm text-gray-400 mt-1">ID: <span className="font-mono text-gray-300">{sale.key}</span></p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#333] rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {/* Main Info */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status Atual</span>
              <StatusBadge status={sale.status} />
            </div>
            <div className="flex flex-col gap-1 items-end">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Data da Compra</span>
              <span className="text-white font-medium">{formatDateTime(sale.date)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wide border-b border-[#333] pb-2">Cliente</h3>
              <div className="space-y-3">
                <div>
                  <span className="block text-xs text-gray-500">Nome</span>
                  <span className="block text-sm text-gray-200 font-medium">{sale.cliente || 'Não informado'}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500">E-mail</span>
                  <span className="block text-sm text-gray-200">{sale.email || 'Não informado'}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500">Telefone</span>
                  <span className="block text-sm text-gray-200">{sale.phone || 'Não informado'}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500">País</span>
                  <span className="block text-sm text-gray-200">{sale.country || 'Não informado'}</span>
                </div>
              </div>
            </div>

            {/* Product & Payment Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wide border-b border-[#333] pb-2">Produto & Pagamento</h3>
              <div className="space-y-3">
                <div>
                  <span className="block text-xs text-gray-500">Produto</span>
                  <span className="block text-sm text-gray-200 font-medium">{sale.produto || 'Não informado'}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500">Método de Pagamento</span>
                  <span className="block text-sm text-gray-200 capitalize">{sale.payment_method || 'Não informado'}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500">Faturamento Líquido (BRL)</span>
                  <span className="block text-lg text-emerald-400 font-bold">{formatCurrency(sale.net_revenue_brl)}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500">Faturamento Bruto (BRL)</span>
                  <span className="block text-sm text-gray-300">{formatCurrency(sale.gross_revenue_brl)}</span>
                </div>
                {sale.gross_value_usd > 0 && (
                  <div>
                    <span className="block text-xs text-gray-500">Faturamento Original (USD)</span>
                    <span className="block text-sm text-gray-300">{formatCurrency(sale.gross_value_usd, 'USD')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tracking / UTMs */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wide border-b border-[#333] pb-2">Rastreamento (UTMs)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-[#111] p-4 rounded-xl border border-[#222]">
              <div>
                <span className="block text-[10px] text-gray-500 uppercase">Origem (Source)</span>
                <span className="block text-sm text-gray-300 truncate" title={sale.utm_source}>{sale.utm_source || '-'}</span>
              </div>
              <div>
                <span className="block text-[10px] text-gray-500 uppercase">Campanha</span>
                <span className="block text-sm text-gray-300 truncate" title={sale.utm_campaign}>{sale.utm_campaign || '-'}</span>
              </div>
              <div>
                <span className="block text-[10px] text-gray-500 uppercase">Meio (Medium)</span>
                <span className="block text-sm text-gray-300 truncate" title={sale.utm_medium}>{sale.utm_medium || '-'}</span>
              </div>
              <div>
                <span className="block text-[10px] text-gray-500 uppercase">Conteúdo</span>
                <span className="block text-sm text-gray-300 truncate" title={sale.utm_content}>{sale.utm_content || '-'}</span>
              </div>
              <div>
                <span className="block text-[10px] text-gray-500 uppercase">Termo</span>
                <span className="block text-sm text-gray-300 truncate" title={sale.utm_term}>{sale.utm_term || '-'}</span>
              </div>
              <div>
                <span className="block text-[10px] text-gray-500 uppercase">Etapa do Funil</span>
                <span className="block text-sm text-gray-300 truncate" title={sale.funnel_step}>{sale.funnel_step || '-'}</span>
              </div>
            </div>
          </div>

        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-[#333] bg-[#1a1a1a] flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-[#2a2a2a] hover:bg-[#333] text-white text-sm font-medium rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
