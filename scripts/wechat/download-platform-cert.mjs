import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const baseUrl = 'https://api.mch.weixin.qq.com/v3';

const {
  WECHAT_MCH_ID,
  WECHAT_MCH_SERIAL_NO,
  WECHAT_API_V3_KEY,
  WECHAT_PRIVATE_KEY_PATH = '/secure/apiclient_key.pem',
  WECHAT_CERT_OUTPUT = './certs/platform_cert.pem',
} = process.env;

if (!WECHAT_MCH_ID || !WECHAT_MCH_SERIAL_NO || !WECHAT_API_V3_KEY) {
  console.error('Missing required env vars: WECHAT_MCH_ID, WECHAT_MCH_SERIAL_NO, WECHAT_API_V3_KEY');
  process.exit(1);
}

const merchantPrivateKey = crypto.createPrivateKey(
  fs.readFileSync(WECHAT_PRIVATE_KEY_PATH, 'utf8'),
);

const buildAuthorization = (method, urlPath, body = '') => {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonceStr = crypto.randomBytes(16).toString('hex');
  const message = `${method}\n${urlPath}\n${timestamp}\n${nonceStr}\n${body}\n`;
  const signature = crypto.createSign('RSA-SHA256')
    .update(message)
    .sign(merchantPrivateKey, 'base64');

  return `WECHATPAY2-SHA256-RSA2048 mchid="${WECHAT_MCH_ID}",serial_no="${WECHAT_MCH_SERIAL_NO}",nonce_str="${nonceStr}",timestamp="${timestamp}",signature="${signature}"`;
};

const decryptResource = resource => {
  const key = Buffer.from(WECHAT_API_V3_KEY, 'utf8');
  const ciphertext = Buffer.from(resource.ciphertext, 'base64');
  const authTag = ciphertext.subarray(ciphertext.length - 16);
  const data = ciphertext.subarray(0, ciphertext.length - 16);

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(resource.nonce, 'utf8'),
  );

  if (resource.associated_data) {
    decipher.setAAD(Buffer.from(resource.associated_data, 'utf8'));
  }

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
};

const main = async () => {
  const pathUrl = '/certificates';
  const response = await fetch(`${baseUrl}${pathUrl}`, {
    method: 'GET',
    headers: {
      Authorization: buildAuthorization('GET', pathUrl),
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    console.error('Failed to download certificates:', await response.text());
    process.exit(1);
  }

  const payload = await response.json();
  const latest = payload?.data?.[0];

  if (!latest) {
    throw new Error('No platform certificates returned');
  }

  const certData = decryptResource(latest.encrypt_certificate);
  fs.mkdirSync(path.dirname(WECHAT_CERT_OUTPUT), { recursive: true });
  fs.writeFileSync(WECHAT_CERT_OUTPUT, certData.cert);
  fs.writeFileSync(`${WECHAT_CERT_OUTPUT}.serial`, latest.serial_no);

  console.log(`Platform certificate saved to ${WECHAT_CERT_OUTPUT}`);
};

main().catch(error => {
  console.error(error);
  process.exit(1);
});
