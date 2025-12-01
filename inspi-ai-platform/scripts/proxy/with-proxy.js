import { setGlobalDispatcher, ProxyAgent } from 'undici';

const getProxyUrl = () => {
  if (process.env.HTTPS_PROXY) return process.env.HTTPS_PROXY;
  if (process.env.HTTP_PROXY) return process.env.HTTP_PROXY;
  if (process.env.GLOBAL_AGENT_HTTP_PROXY) return process.env.GLOBAL_AGENT_HTTP_PROXY;
  return null;
};

const proxyUrl = getProxyUrl();

if (proxyUrl) {
  try {
    const agent = new ProxyAgent(proxyUrl);
    setGlobalDispatcher(agent);
    console.log(`[proxy] Undici global dispatcher set via ${proxyUrl}`);
  } catch (error) {
    console.error('[proxy] Failed to set proxy agent:', error);
  }
} else {
  console.log('[proxy] No proxy configuration detected');
}
