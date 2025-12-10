const { setGlobalDispatcher, ProxyAgent } = require('undici');

const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.GLOBAL_AGENT_HTTP_PROXY;

if (proxyUrl) {
  const agent = new ProxyAgent(proxyUrl);
  setGlobalDispatcher(agent);
  console.log(`[proxy] Undici dispatcher assigned via ${proxyUrl}`);
} else {
  console.warn('[proxy] No proxy URL found. Network calls will use default dispatcher.');
}

module.exports = {};
