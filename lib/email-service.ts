import { Resend } from 'resend';

// Verifica se a chave de API existe
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface SendAccessEmailOptions {
  customerName: string;
  customerEmail: string;
  productName: string;
}

export async function sendAccessEmail({ customerName, customerEmail, productName }: SendAccessEmailOptions) {
  if (!resend) {
    console.warn('RESEND_API_KEY não está configurada no .env.local. E-mail não enviado.');
    return;
  }

  // Pegue apenas o primeiro nome do cliente
  const firstName = customerName.split(' ')[0] || 'Cliente';

  try {
    const { data, error } = await resend.emails.send({
      from: 'Suporte <contato@seudominio.com.br>', // Altere para o e-mail do seu domínio verificado
      to: customerEmail,
      subject: `Seu acesso chegou: ${productName} 🚀`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <h2 style="color: #0f62fe;">Olá, ${firstName}!</h2>
          <p>O seu pagamento foi <strong>aprovado</strong> e o seu acesso ao <strong>${productName}</strong> já está liberado.</p>
          
          <div style="background-color: #f4f4f4; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Link de Acesso:</strong> <a href="#">https://seusite.com.br/acesso</a></p>
            <p style="margin: 10px 0 0 0;"><strong>E-mail:</strong> ${customerEmail}</p>
            <p style="margin: 10px 0 0 0;"><strong>Senha:</strong> (Enviada no seu WhatsApp ou defina na plataforma)</p>
          </div>
          
          <p>Se tiver qualquer dúvida, basta responder a este e-mail que nossa equipe de suporte irá te ajudar.</p>
          <br>
          <p>Um abraço,<br><strong>Equipe ${productName}</strong></p>
        </div>
      `,
    });

    if (error) {
      console.error('Erro ao enviar e-mail via Resend:', error);
      return { success: false, error };
    }

    console.log(`E-mail de acesso enviado com sucesso para ${customerEmail} (ID: ${data?.id})`);
    return { success: true, data };
  } catch (error) {
    console.error('Exceção ao enviar e-mail via Resend:', error);
    return { success: false, error };
  }
}
