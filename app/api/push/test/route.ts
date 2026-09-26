import { NextResponse } from 'next/server';
import { sendPushToAll } from '@/lib/push-service';

export async function POST() {
  try {
    const result = await sendPushToAll({
      title: 'Venda Realizada (Cartão de crédito)',
      body: 'Sua comissão: US$ 37.50',
      url: '/dashboard/vendas',
      tag: `test-${Date.now()}`,
    });

    if (result.total === 0) {
      return NextResponse.json({
        success: false,
        message: 'Nenhum dispositivo inscrito para receber notificações ainda. Ative o sininho no topo do site primeiro!',
        ...result,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Notificação de teste enviada para ${result.sent} de ${result.total} dispositivo(s).`,
      ...result,
    });
  } catch (error: any) {
    console.error('Erro ao enviar notificação de teste:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
