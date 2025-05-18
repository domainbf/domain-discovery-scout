
/**
 * Local WHOIS service with proxy to avoid CORS issues
 */

import { WhoisResult } from '../types/WhoisTypes';
import { queryLocalWhois, queryDomainInfoProxy } from '../utils/apiHelper';
import { whoisServers } from '@/utils/whois-servers';

/**
 * Validate domain format with improved regex
 */
export const isValidDomain = (domain: string): boolean => {
  // 更宽松的域名正则表达式，支持更多格式
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return domainRegex.test(domain);
};

/**
 * Query domain using local API proxy
 */
export async function queryWhoisLocally(domain: string): Promise<WhoisResult> {
  if (!isValidDomain(domain)) {
    return {
      domain,
      error: "域名格式无效",
      rawData: `Invalid domain format: ${domain}`,
      errorDetails: {
        formatError: true,
        patternError: true
      }
    };
  }

  try {
    console.log(`使用本地API代理查询WHOIS: ${domain}`);
    // Use our local API proxy to avoid CORS
    const result = await queryLocalWhois(domain);
    
    // Ensure we have domain in the result
    if (!result.domain) {
      result.domain = domain;
    }
    
    // Check if the response has an error field
    if (result.error) {
      console.warn(`本地WHOIS查询返回错误: ${result.error}`);
    } else {
      console.log(`本地WHOIS查询成功: ${domain}`);
    }
    
    return result;
  } catch (error) {
    console.error(`本地WHOIS查询失败: ${error}`);
    
    return {
      domain,
      error: `本地WHOIS查询失败: ${error instanceof Error ? error.message : String(error)}`,
      source: 'local-whois-proxy',
      errorDetails: {
        network: String(error).includes('网络') || String(error).includes('fetch'),
        apiError: true,
        parseError: String(error).includes('解析') || String(error).includes('parse'),
        formatError: String(error).includes('HTML')
      }
    };
  }
}

/**
 * Query domain using proxy API for domain info
 */
export async function queryDomainInfoLocally(domain: string): Promise<WhoisResult> {
  if (!isValidDomain(domain)) {
    return {
      domain,
      error: "域名格式无效",
      rawData: `Invalid domain format: ${domain}`,
      errorDetails: {
        formatError: true,
        patternError: true
      }
    };
  }

  try {
    console.log(`使用代理API查询域名信息: ${domain}`);
    // Use our proxy API to avoid CORS
    const result = await queryDomainInfoProxy(domain);
    
    // Ensure we have domain in the result
    if (!result.domain) {
      result.domain = domain;
    }
    
    // Check if the response has an error field
    if (result.error) {
      console.warn(`代理API查询返回错误: ${result.error}`);
    } else {
      console.log(`代理API查询成功: ${domain}`);
    }
    
    return result;
  } catch (error) {
    console.error(`代理API查询失败: ${error}`);
    
    return {
      domain,
      error: `代理API查询失败: ${error instanceof Error ? error.message : String(error)}`,
      source: 'domain-info-proxy',
      errorDetails: {
        network: String(error).includes('网络') || String(error).includes('fetch'),
        apiError: true,
        parseError: String(error).includes('解析') || String(error).includes('parse'),
        formatError: String(error).includes('HTML')
      }
    };
  }
}

/**
 * Check if TLD is supported by our local WHOIS servers
 */
export function isTldSupported(domain: string): boolean {
  const tld = domain.split('.').pop()?.toLowerCase() || "";
  return tld in whoisServers;
}
