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
      from: 'Soporte <contacto@noticiasde-ultimahora.online>',
      reply_to: 'contacto@noticiasde-ultimahora.online',
      to: customerEmail,
      subject: `✅ Tu acceso a El Protocolo del Vinagre está listo, ${firstName}`,
      html: `
        <div style="display: none; max-height: 0px; overflow: hidden;">
          Tu receta de 3 ingredientes + todos tus bonos te esperan adentro &rarr;
        </div>
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.6;">
          <p>Hola ${firstName},</p>
          <p>Tu compra fue confirmada y tu programa ya está disponible.</p>
          <p>Antes de darte el acceso, quiero que sepas algo importante: lo que compraste no es información genérica. Es un protocolo específico de 21 días que miles de personas en América Latina ya están usando para respirar mejor, incluso sin dejar de fumar.</p>
          <p>Y empieza hoy. No mañana.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://pdel-vinagre.vercel.app" style="background-color: #0f62fe; color: #ffffff; padding: 14px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">▶ ENTRA A TU PROGRAMA AQUÍ</a>
          </div>

          <div style="background-color: #f4f4f4; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Tu correo de acceso:</strong> ${customerEmail}</p>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #555;"><em>Sin contraseña — solo ingresa tu correo y entras directo.</em></p>
          </div>

          <h3>Lo primero que vas a ver al entrar:</h3>
          <p>Tu receta completa con los 3 ingredientes exactos, las cantidades precisas y el modo de preparación. Está en la pantalla principal, no tienes que buscarla.</p>
          <p>Tómate 2 minutos ahora para entrar y leerla. Solo eso.</p>

          <h3>¿Qué es este programa exactamente?</h3>
          <p>Durante 21 días, cada mañana vas a preparar una mezcla simple con ingredientes que probablemente ya tienes en tu cocina. El app te guía día a día, te recuerda qué hacer y registra tu progreso.</p>
          <p>La mayoría de las personas nota los primeros cambios en los días 7 a 9.</p>

          <p><strong>Guarda este email.</strong><br>
          Es tu llave de acceso permanente. Si alguna vez cierras sesión o cambias de dispositivo, vuelve aquí y entra con el mismo correo.</p>
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
