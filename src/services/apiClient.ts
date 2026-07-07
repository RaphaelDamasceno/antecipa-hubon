import { auth } from './firebaseService';

/**
 * Faz uma chamada autenticada ao backend proxy.
 * Anexa o Firebase ID Token no header Authorization.
 */
export async function apiCall<T>(endpoint: string, body?: any): Promise<T> {
  const token = await auth.currentUser?.getIdToken();

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || `API Error: ${response.status}`);
  }

  return response.json();
}
