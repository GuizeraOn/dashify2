import { NextRequest, NextResponse } from 'next/server';
import { savePushSubscription, removePushSubscription } from '@/lib/push-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscription, userAgent } = body;

    if (!subscription?.endpoint || !subscription?.keys) {
      return NextResponse.json({ error: 'Inscrição push inválida' }, { status: 400 });
    }

    await savePushSubscription(subscription, userAgent || request.headers.get('user-agent') || undefined);

    return NextResponse.json({ success: true, message: 'Dispositivo inscrito com sucesso para notificações.' });
  } catch (error: any) {
    console.error('Erro ao salvar inscrição push:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint ausente' }, { status: 400 });
    }

    await removePushSubscription(endpoint);

    return NextResponse.json({ success: true, message: 'Dispositivo desinscrito com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao remover inscrição push:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
