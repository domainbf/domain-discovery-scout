/**
 * WHOIS 查询服务 - 使用优化的查询系统，优先采用 RDAP
 * 如果 RDAP 不支持或失败，则切换到本地 WHOIS 查询
 */

import { whoisServers } from '@/utils/whois-servers';
import net from 'net';

export interface Contact {
  name?: string;
  org?: string;
  email?: string[];
  phone?: string[];
  address?: string;
  country?: string;
}

export interface WhoisResult {
  domain?: string;
  registrar?: string;
  nameservers?: string[];
  dnssec?: boolean;
  status?: string[];
  created?: string;
  updated?: string;
  expires?: string;
  source?: string; // 查询来源（RDAP 或 Local WHOIS）
  error?: string;
  rawData?: string;
}

/**
 * 主查询接口：优先使用 RDAP，如果失败则切换到本地 WHOIS
 */
export async function queryWhois(domain: string): Promise<WhoisResult> {
  const tld = domain.split('.').pop()?.toLowerCase() || '';

  if (!tld) {
    return { error: '域名格式无效：无法解析 TLD' };
  }

  console.log(`开始查询域名信息：${domain}，TLD：${tld}`);

  // 检查是否支持 RDAP
  const isRdapSupported = !!whoisServers[tld]?.rdap;
  if (isRdapSupported) {
    console.log('RDAP 支持该 TLD，尝试使用 RDAP 查询...');
    try {
      const rdapResult = await queryRdap(domain);
      if (!rdapResult.error) {
        rdapResult.source = 'RDAP';
        return rdapResult;
      }
      console.warn(`RDAP 查询失败：${rdapResult.error}`);
    } catch (error) {
      console.error(`RDAP 查询异常：`, error);
    }
  } else {
    console.log(`RDAP 不支持该 TLD：${tld}，切换到本地 WHOIS`);
  }

  // 使用本地 WHOIS 查询
  return queryLocalWhois(domain, tld);
}

/**
 * 使用 RDAP 查询域名信息
 */
async function queryRdap(domain: string): Promise<WhoisResult> {
  const tld = domain.split('.').pop()?.toLowerCase() || '';
  const rdapUrl = whoisServers[tld]?.rdap;

  if (!rdapUrl) {
    return { error: `RDAP URL 未配置 TLD：${tld}` };
  }

  console.log(`RDAP 查询 URL：${rdapUrl}${encodeURIComponent(domain)}`);

  try {
    const response = await fetch(`${rdapUrl}${encodeURIComponent(domain)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return { error: `RDAP 请求失败，状态码：${response.status}` };
    }

    const data = await response.json();
    return {
      domain,
      rawData: JSON.stringify(data, null, 2),
    };
  } catch (error) {
    return { error: `RDAP 查询错误：${error.message}` };
  }
}

/**
 * 使用本地 WHOIS 查询域名信息
 */
function queryLocalWhois(domain: string, tld: string): Promise<WhoisResult> {
  const whoisServer = whoisServers[tld]?.whois;
  if (!whoisServer) {
    return Promise.resolve({
      error: `未配置 WHOIS 服务器 TLD：.${tld}`,
    });
  }

  console.log(`尝试本地 WHOIS 查询：域名=${domain}，服务器=${whoisServer}`);

  return new Promise((resolve, reject) => {
    const client = net.createConnection({ port: 43, host: whoisServer }, () => {
      console.log(`已连接到 WHOIS 服务器：${whoisServer}`);
      client.write(`${domain}\r\n`);
    });

    let rawData = '';
    client.on('data', (chunk) => {
      rawData += chunk.toString();
    });

    client.on('end', () => {
      console.log(`WHOIS 查询完成：域名=${domain}`);
      resolve({ domain, rawData, source: 'Local WHOIS' });
    });

    client.on('error', (error) => {
      console.error(`WHOIS 查询错误：域名=${domain}`, error);
      reject({ error: `WHOIS 查询失败：${error.message}` });
    });

    client.setTimeout(10000, () => {
      client.destroy();
      reject({ error: 'WHOIS 查询超时' });
    });
  });
}
