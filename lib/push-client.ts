'use client';

/**
 * Utilitário para converter a chave pública VAPID (URL-safe base64) para Uint8Array
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Verifica se o navegador atual suporta Service Worker e Push API
 */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Obtém o status da inscrição atual no navegador
 */
export async function getPushSubscriptionState(): Promise<{
  supported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  subscription: PushSubscription | null;
}> {
  if (!isPushSupported()) {
    return {
      supported: false,
      permission: 'default',
      isSubscribed: false,
      subscription: null,
    };
  }

  const permission = Notification.permission;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return {
      supported: true,
      permission,
      isSubscribed: Boolean(subscription),
      subscription,
    };
  } catch (error) {
    console.warn('Erro ao verificar inscrição push:', error);
    return {
      supported: true,
      permission,
      isSubscribed: false,
      subscription: null,
    };
  }
}

/**
 * Solicita permissão e inscreve o dispositivo atual para receber notificações de venda
 */
export async function subscribeToPushNotifications(): Promise<{
  success: boolean;
  message?: string;
}> {
  if (!isPushSupported()) {
    return { success: false, message: 'Seu navegador não suporta notificações push.' };
  }

  // 1. Solicita permissão ao usuário
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return {
      success: false,
      message: permission === 'denied'
        ? 'Permissão negada. Você pode reativar nas configurações do seu navegador.'
        : 'Permissão não concedida.',
    };
  }

  // 2. Garante que o Service Worker está pronto
  let registration: ServiceWorkerRegistration;
  try {
    registration = await navigator.serviceWorker.ready;
  } catch (swErr: any) {
    // Se ainda não estava registrado, tenta registrar manualmente
    registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
  }

  // 3. Busca a chave pública VAPID do servidor
  const keyResponse = await fetch('/api/push/public-key');
  if (!keyResponse.ok) {
    throw new Error('Falha ao obter chave de push do servidor');
  }
  const { publicKey } = await keyResponse.json();
  if (!publicKey) {
    throw new Error('Chave pública VAPID não configurada');
  }

  // 4. Inscreve no PushManager do navegador
  const applicationServerKey = urlBase64ToUint8Array(publicKey);
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey as any,
  });

  // 5. Salva a inscrição no backend
  const saveRes = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      userAgent: navigator.userAgent,
    }),
  });

  if (!saveRes.ok) {
    throw new Error('Falha ao registrar dispositivo no servidor');
  }

  return { success: true, message: 'Notificações de vendas ativadas com sucesso!' };
}

/**
 * Desinscreve o dispositivo atual
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      await subscription.unsubscribe();
    }
    return true;
  } catch (error) {
    console.error('Erro ao desinscrever notificações:', error);
    return false;
  }
}

/**
 * Dispara uma notificação de teste imediata
 */
export async function triggerPushTest(): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/push/test', { method: 'POST' });
  const data = await res.json();
  return data;
}
