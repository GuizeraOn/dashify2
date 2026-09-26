import { NextResponse } from 'next/server';
import { getVapidPublicKey } from '@/lib/push-service';

export async function GET() {
  try {
    const publicKey = await getVapidPublicKey();
    return NextResponse.json({ publicKey });
  } catch (error: any) {
    console.error('Erro ao recuperar chave pública VAPID:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
