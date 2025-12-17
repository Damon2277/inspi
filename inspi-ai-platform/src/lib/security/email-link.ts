const STORAGE_KEY = 'inspi_security_email_map';

type Mapping = Record<string, string>;

const safeWindow = typeof window !== 'undefined' ? window : undefined;

function readStore(): Mapping {
  if (!safeWindow) return {};
  try {
    const raw = safeWindow.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error('Failed to read security email map:', error);
    return {};
  }
}

function writeStore(data: Mapping) {
  if (!safeWindow) return;
  try {
    safeWindow.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to write security email map:', error);
  }
}

export function setSecurityEmailForAccount(accountEmail: string, securityEmail?: string) {
  if (!accountEmail) return;
  const normalizedAccount = accountEmail.trim().toLowerCase();
  if (!normalizedAccount) return;

  const store = readStore();
  if (securityEmail && securityEmail.trim()) {
    store[normalizedAccount] = securityEmail.trim();
  } else {
    delete store[normalizedAccount];
  }
  writeStore(store);
}

export function getSecurityEmailForAccount(accountEmail: string): string | null {
  if (!accountEmail) return null;
  const normalizedAccount = accountEmail.trim().toLowerCase();
  if (!normalizedAccount) return null;

  const store = readStore();
  return store[normalizedAccount] || null;
}

export function maskEmail(email?: string | null) {
  if (!email) return '';
  const [localPart, domain = ''] = email.split('@');
  if (localPart.length <= 2) {
    return `${localPart[0] || ''}***@${domain}`;
  }
  return `${localPart.slice(0, 2)}***@${domain}`;
}
