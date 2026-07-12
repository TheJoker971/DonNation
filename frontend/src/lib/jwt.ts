export function parseJwt<T = Record<string, unknown>>(token: string): T | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const binary = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const jsonPayload = decodeURIComponent(
      binary
        .split('')
        .map((char) => {
          const code = char.charCodeAt(0).toString(16).padStart(2, '0');
          return `%${code}`;
        })
        .join(''),
    );
    return JSON.parse(jsonPayload) as T;
  } catch {
    return null;
  }
}
