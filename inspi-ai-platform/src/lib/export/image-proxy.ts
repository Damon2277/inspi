export const IMAGE_PROXY_ALLOW_LIST = [
  'ark-content-generation-v2-cn-beijing.tos-cn-beijing.volces.com',
  'ark-content-generation-v2.tos-cn-beijing.volces.com',
  'tos-cn-beijing.volces.com',
];

function normalizeHost(hostname: string): string {
  return hostname?.trim().toLowerCase();
}

export function isAllowedImageHost(hostname: string): boolean {
  if (!hostname) {
    return false;
  }

  const normalized = normalizeHost(hostname);
  return IMAGE_PROXY_ALLOW_LIST.some((allowed) => {
    const normalizedAllowed = normalizeHost(allowed);
    return normalized === normalizedAllowed || normalized.endsWith(`.${normalizedAllowed}`);
  });
}

export function buildProxiedImageUrl(src: string): string {
  const encoded = encodeURIComponent(src);
  return `/api/proxy/image?src=${encoded}`;
}

export function shouldProxyImageUrl(url: URL, currentOrigin?: string): boolean {
  if (!url) {
    return false;
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return false;
  }

  const isSameOrigin = currentOrigin ? url.origin === currentOrigin : false;
  if (isSameOrigin) {
    return false;
  }

  return isAllowedImageHost(url.hostname);
}

export function needsProxying(src: string, currentOrigin?: string): { shouldProxy: boolean; targetUrl?: string } {
  try {
    const url = new URL(src, currentOrigin);
    if (shouldProxyImageUrl(url, currentOrigin)) {
      return { shouldProxy: true, targetUrl: url.toString() };
    }
  } catch (error) {
    return { shouldProxy: false };
  }

  return { shouldProxy: false };
}
