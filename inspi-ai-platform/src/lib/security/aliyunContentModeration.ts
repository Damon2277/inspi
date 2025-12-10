import crypto from 'crypto';

const POP_REGION = process.env.ALIYUN_CONTENT_REGION || 'cn-shanghai';
const ACCESS_KEY_ID = process.env.ALIYUN_ACCESS_KEY_ID;
const ACCESS_KEY_SECRET = process.env.ALIYUN_ACCESS_KEY_SECRET;

interface AliyunModerationResponse {
  code?: string;
  msg?: string;
  data?: Array<{
    code?: number;
    msg?: string;
    results?: Array<{
      suggestion?: 'pass' | 'review' | 'block';
      label?: string;
      rate?: string;
    }>;
  }>;
}

const ENDPOINT = `https://green.${POP_REGION}.aliyuncs.com/green/text/scan`;

export async function aliyunTextScan(
  content: string,
): Promise<{ isValid: boolean; suggestion?: string; details?: any }> {
  if (!ACCESS_KEY_ID || !ACCESS_KEY_SECRET) {
    return { isValid: true };
  }

  const requestBody = {
    bizType: 'inspi_ai_text',
    scenes: ['antispam'],
    tasks: [
      {
        dataId: crypto.randomUUID(),
        content,
      },
    ],
  };

  const body = JSON.stringify(requestBody);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Content-MD5': createContentMD5(body),
    Date: new Date().toUTCString(),
    'x-acs-version': '2018-05-09',
    'x-acs-action': 'TextScan',
    'x-acs-region-id': POP_REGION,
    'x-acs-signature-nonce': crypto.randomUUID(),
  };

  const stringToSign = buildStringToSign('POST', headers, '/green/text/scan');
  const signature = signString(stringToSign, ACCESS_KEY_SECRET);
  headers.Authorization = `acs ${ACCESS_KEY_ID}:${signature}`;

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers,
    body,
  });

  if (!response.ok) {
    return {
      isValid: false,
      details: { status: response.status, statusText: response.statusText },
    };
  }

  const payload: AliyunModerationResponse = await response.json();

  if (payload.code !== '200') {
    return { isValid: false, details: payload };
  }

  const firstTask = payload.data?.[0];
  if (!firstTask || firstTask.code !== 200 || !firstTask.results || firstTask.results.length === 0) {
    return { isValid: true };
  }

  const result = firstTask.results[0];
  return {
    isValid: result.suggestion !== 'block',
    suggestion: result.suggestion,
    details: result,
  };
}

function createContentMD5(body: string): string {
  const hash = crypto.createHash('md5');
  hash.update(body, 'utf8');
  return hash.digest('base64');
}

function buildStringToSign(
  method: string,
  headers: Record<string, string>,
  canonicalizedResource: string,
): string {
  const contentMd5 = headers['Content-MD5'] || headers['content-md5'] || '';
  const contentType = headers['Content-Type'] || headers['content-type'] || '';
  const date = headers.Date || headers.date || '';

  const canonicalizedHeaders = Object.keys(headers)
    .filter(key => key.toLowerCase().startsWith('x-acs-'))
    .sort((a, b) => a.localeCompare(b))
    .map(key => `${key.toLowerCase()}:${headers[key]}`)
    .join('\n');

  const parts = [method.toUpperCase(), contentMd5, contentType, date, canonicalizedHeaders, canonicalizedResource];
  return parts.filter(Boolean).join('\n');
}

function signString(stringToSign: string, accessKeySecret: string): string {
  const signature = crypto
    .createHmac('sha1', accessKeySecret + '&')
    .update(stringToSign, 'utf8')
    .digest('base64');
  return signature;
}
