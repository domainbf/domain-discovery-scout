
/**
 * Local WHOIS service with proxy to avoid CORS issues
 * Integrated with RDAP for enhanced lookup capabilities
 */

import { WhoisResult } from '../types/WhoisTypes';
import { queryLocalWhois } from '../utils/apiHelper';
import { whoisServers } from '@/utils/whois-servers';
import { isRdapSupported } from '../rdap/rdapEndpoints';

/**
 * Validate domain format with improved regex
 */
export const isValidDomain = (domain: string): boolean => {
  // 更宽松的域名正则表达式，支持更多格式
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return domainRegex.test(domain);
};

/**
 * Query domain using local API proxy with WHOIS
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
 * Query domain using local API proxy with RDAP
 */
export async function queryRdapLocally(domain: string): Promise<WhoisResult> {
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

  // Check if RDAP is supported for this TLD
  const tld = domain.split('.').pop()?.toLowerCase() || "";
  if (!isRdapSupported(tld)) {
    return {
      domain,
      error: `该域名后缀(.${tld})不支持RDAP协议查询`,
      source: 'rdap-unsupported',
      errorDetails: {
        notSupported: true
      }
    };
  }

  try {
    console.log(`使用本地API代理查询RDAP: ${domain}`);
    // Use our local API proxy to avoid CORS
    const result = await queryLocalWhois(domain, 'rdap');
    
    // Ensure we have domain in the result
    if (!result.domain) {
      result.domain = domain;
    }
    
    // Check if the response has an error field
    if (result.error) {
      console.warn(`本地RDAP查询返回错误: ${result.error}`);
    } else {
      console.log(`本地RDAP查询成功: ${domain}`);
    }
    
    return result;
  } catch (error) {
    console.error(`本地RDAP查询失败: ${error}`);
    
    return {
      domain,
      error: `本地RDAP查询失败: ${error instanceof Error ? error.message : String(error)}`,
      source: 'local-rdap-proxy',
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

/**
 * Query API with appropriate method based on domain
 */
export async function queryDomainWithBestMethod(domain: string): Promise<WhoisResult> {
  const tld = domain.split('.').pop()?.toLowerCase() || "";
  
  // Special case for Chinese domains
  if (tld === 'cn') {
    return {
      domain,
      error: "中国域名管理机构CNNIC可能对WHOIS查询有限制",
      source: 'special-handler',
      rawData: `中国域名管理机构CNNIC对WHOIS查询有限制，建议访问 http://whois.cnnic.cn/ 查询 ${domain} 信息。`,
      alternativeLinks: [{
        name: '中国域名信息查询中心',
        url: `http://whois.cnnic.cn/WhoisServlet?domain=${domain}`
      }]
    };
  }
  
  // Try RDAP first for supported TLDs
  if (isRdapSupported(tld)) {
    try {
      console.log(`使用RDAP协议查询: ${domain}`);
      const rdapResult = await queryRdapLocally(domain);
      if (!rdapResult.error) {
        console.log('RDAP查询成功');
        return rdapResult;
      }
      console.warn(`RDAP查询返回错误: ${rdapResult.error}`);
    } catch (error) {
      console.warn(`RDAP查询异常: ${error}`);
    }
  }
  
  // Fall back to WHOIS
  try {
    console.log(`使用WHOIS查询: ${domain}`);
    return await queryWhoisLocally(domain);
  } catch (error) {
    console.error(`所有查询方法均失败: ${error}`);
    return {
      domain,
      error: `无法通过任何方法获取域名信息: ${error instanceof Error ? error.message : String(error)}`,
      source: 'all-methods-failed',
      errorDetails: {
        network: true,
        apiError: true
      }
    };
  }
}
