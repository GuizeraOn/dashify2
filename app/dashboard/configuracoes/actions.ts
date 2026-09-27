'use server';

import { getSupabaseAdmin } from '@/lib/supabase';

export async function getEmailTemplate() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'email_template_default')
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Erro ao buscar template de e-mail:', error);
  }

  return { success: true, data: data?.value || null };
}

export async function saveEmailTemplate({
  subject,
  html_body,
  sender_email
}: {
  subject: string;
  html_body: string;
  sender_email: string;
}) {
  const supabase = getSupabaseAdmin();

  const value = { subject, html_body, sender_email };

  const { error } = await supabase
    .from('app_settings')
    .upsert({
      key: 'email_template_default',
      value,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

  if (error) {
    console.error('Erro ao salvar template de e-mail:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
