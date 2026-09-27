import { NextResponse } from 'next/server';
import { sendAccessEmail } from '@/lib/email-service';

export async function GET() {
  try {
    const testEmails = [
      'guimalvaroliveira@gmail.com',
      'zguizeradragon@gmail.com',
      'nitrocortes98@gmail.com',
      'suporte.vyse@gmail.com'
    ];

    const results = await Promise.all(
      testEmails.map(email => 
        sendAccessEmail({
          customerName: 'Guilherme Malvar',
          customerEmail: email,
          productName: 'El Protocolo del Vinagre',
        })
      )
    );

    const hasErrors = results.some(r => !r || !r.success);

    if (hasErrors) {
      return NextResponse.json(
        { error: 'Falha ao enviar para alguns ou todos os emails. Verifique os detalhes no console da Vercel.', results },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'E-mails de teste enviados com sucesso para todas as contas!', 
      emails: testEmails,
      results 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
