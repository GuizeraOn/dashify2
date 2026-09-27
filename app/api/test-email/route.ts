import { NextResponse } from 'next/server';
import { sendAccessEmail } from '@/lib/email-service';

export async function GET() {
  try {
    const result = await sendAccessEmail({
      customerName: 'Guilherme Malvar',
      customerEmail: 'guimalvaroliveira@gmail.com',
      productName: 'El Protocolo del Vinagre',
    });

    if (!result || !result.success) {
      return NextResponse.json(
        { error: 'Falha ao enviar. Verifique se a RESEND_API_KEY está configurada na Vercel e se o domínio está verificado.', details: result?.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'E-mail de teste enviado com sucesso para guimalvaroliveira@gmail.com!', data: result.data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
