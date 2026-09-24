/**
 * Utilitários de Formatação e Simplificação de Status / Erros de Gateway
 *
 * Converte mensagens técnicas longas de gateways e adquirentes (ex: "Transaction not authorized...")
 * em termos amigáveis e concisos em português, preservando a mensagem original completa para tooltips.
 */

export interface FormattedStatus {
  label: string;
  original: string;
  category: 'approved' | 'pending' | 'refused' | 'cancelled' | 'refunded' | 'other';
  color: string;
}

export function formatStatus(rawStatus?: string | null): FormattedStatus {
  const original = String(rawStatus || '').trim();
  const lower = original.toLowerCase();

  // 1. Aprovado
  if (
    lower === 'aprovado' ||
    lower === 'approved' ||
    lower === 'completo' ||
    lower === 'completed' ||
    lower === 'authorized'
  ) {
    return {
      label: 'Aprovado',
      original,
      category: 'approved',
      color: '#22c55e', // verde
    };
  }

  // 2. Aguardando Pagamento
  if (
    lower === 'aguardando' ||
    lower === 'aguardando pagamento' ||
    lower === 'pending' ||
    lower === 'in_process' ||
    lower === 'in_review'
  ) {
    return {
      label: 'Aguardando',
      original,
      category: 'pending',
      color: '#facc15', // amarelo
    };
  }

  // 3. Abandono de Checkout
  if (
    lower === 'abandono' ||
    lower.includes('abandon') ||
    lower.includes('checkout_saved') ||
    lower.includes('checkout_abandonment')
  ) {
    return {
      label: 'Abandono',
      original,
      category: 'other',
      color: '#a855f7', // roxo
    };
  }

  // 4. Cancelado
  if (
    lower === 'cancelado' ||
    lower === 'cancelled' ||
    lower === 'canceled' ||
    lower === 'expired'
  ) {
    return {
      label: 'Cancelado',
      original,
      category: 'cancelled',
      color: '#94a3b8', // ardósia claro
    };
  }

  // 5. Reembolsado
  if (lower === 'reembolsado' || lower === 'refunded') {
    return {
      label: 'Reembolsado',
      original,
      category: 'refunded',
      color: '#8b5cf6', // violeta
    };
  }

  // 6. Chargeback / Estornado
  if (
    lower === 'estornado' ||
    lower === 'chargeback' ||
    lower.includes('chargeback') ||
    lower === 'charged_back'
  ) {
    return {
      label: 'Chargeback',
      original,
      category: 'refunded',
      color: '#f97316', // laranja
    };
  }

  // 7. Erros específicos de cartão / recusa
  if (
    lower.includes('invalid card number') ||
    lower.includes('número de cartão inválido') ||
    lower.includes('invalid card') ||
    lower.includes('cartao invalido')
  ) {
    return {
      label: 'Cartão Inválido',
      original,
      category: 'refused',
      color: '#f43f5e', // rose avermelhado
    };
  }

  if (
    lower.includes('cvv') ||
    lower.includes('security code') ||
    lower.includes('código de segurança')
  ) {
    return {
      label: 'CVV Incorreto',
      original,
      category: 'refused',
      color: '#e11d48',
    };
  }

  if (
    lower.includes('expired') ||
    lower.includes('expirado') ||
    lower.includes('validade')
  ) {
    return {
      label: 'Cartão Expirado',
      original,
      category: 'refused',
      color: '#be123c',
    };
  }

  if (
    lower.includes('insufficient funds') ||
    lower.includes('saldo insuficiente') ||
    lower.includes('limite insuficiente')
  ) {
    return {
      label: 'Saldo Insuficiente',
      original,
      category: 'refused',
      color: '#f87171',
    };
  }

  if (
    lower.includes('fraud') ||
    lower.includes('fraude') ||
    lower.includes('risk') ||
    lower.includes('security')
  ) {
    return {
      label: 'Bloqueio do Banco',
      original,
      category: 'refused',
      color: '#dc2626',
    };
  }

  if (
    lower.includes('not authorized') ||
    lower.includes('não autorizado') ||
    lower.includes('nao autorizado') ||
    lower.includes('unauthorized') ||
    lower.includes('ecom')
  ) {
    return {
      label: 'Não Autorizado',
      original,
      category: 'refused',
      color: '#ef4444', // vermelho padrão de recusa
    };
  }

  if (
    lower.includes('check the entered data') ||
    lower.includes('dados incorretos') ||
    lower.includes('check the credit card details')
  ) {
    return {
      label: 'Dados Incorretos',
      original,
      category: 'refused',
      color: '#fb7185',
    };
  }

  if (lower === 'recusado' || lower === 'recusada' || lower === 'rejected') {
    return {
      label: 'Recusado',
      original,
      category: 'refused',
      color: '#ef4444',
    };
  }

  if (lower === 'outro' || lower === 'outros' || lower === 'other') {
    return {
      label: 'Outros',
      original,
      category: 'other',
      color: '#64748b',
    };
  }

  // Fallback seguro
  const cleanFallback = original.length > 25
    ? original.substring(0, 22) + '...'
    : original || 'Outros';

  return {
    label: cleanFallback,
    original,
    category: 'other',
    color: '#64748b',
  };
}
