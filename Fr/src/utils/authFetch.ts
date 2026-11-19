export async function authFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('footballAppToken');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });
  if (response.status === 401 || response.status === 403) {
    // Opțional: poți declanșa delogarea dacă tokenul a expirat
    console.warn('Sesiune expirată sau neautorizată');
  }
  return response;
}