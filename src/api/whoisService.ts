
// WHOIS 查询服务 - 使用优化的查询系统，集成RDAP和WHOIS方法

import { WhoisResult } from './types/WhoisTypes';
import { queryWhoisLocally, queryRdapLocally, queryDomainWithBestMethod, isTldSupported } from './whois/localWhoisService';
import { convertToLegacyFormat } from './whois/whoisParser';
import { isRdapSupported } from './rdap/rdapEndpoints';
import { whoisServers, specialTlds } from '@/utils/whois-servers';

// Re-export types for use in other files
export type { WhoisResult, Contact } from './types/WhoisTypes';

/**
 * Query domain information using prioritized lookup sources
 */
export async function queryWhois(domain: string): Promise<WhoisResult> {
  try {
    // 更宽松的域名格式验证，支持更多有效域名格式
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!domainRegex.test(domain)) {
      return { 
        error: "域名格式无效", 
        domain,
        status: ["invalid"],
        errorDetails: {
          formatError: true,
          patternError: true
        }
      };
    }

    console.log(`Querying information for ${domain}...`);
    
    // Extract TLD for special handling logic
    const tld = domain.split('.').pop()?.toLowerCase() || "";
    
    // Check if the TLD is supported by our local WHOIS servers
    const supportedWhois = tld in whoisServers;
    const supportedRdap = isRdapSupported(tld);
    
    // Special TLD handling - 优先处理特殊的国别域名
    if (specialTlds.includes(tld)) {
      console.log(`Special handling for ${tld} domain`);
      
      if (tld === "ge") {
        return {
          domain: domain,
          registrar: "Georgian Domain Name Registry",
          source: "special-handler",
          status: ["registryLocked"],
          nameservers: ["使用官方网站查询"],
          created: "请访问官方网站查询",
          updated: "请访问官方网站查询",
          expires: "请访问官方网站查询",
          error: `格鲁吉亚(.ge)域名需通过官方网站查询: https://registration.ge/`,
          rawData: `格鲁吉亚域名管理机构不提供标准WHOIS查询接口，请访问 https://registration.ge/ 查询 ${domain} 的信息。`,
          errorDetails: {
            notSupported: true
          },
          alternativeLinks: [{
            name: '格鲁吉亚域名注册局',
            url: 'https://registration.ge/'
          }]
        };
      }
      
      if (tld === "cn") {
        return {
          domain: domain,
          registrar: "中国互联网络信息中心CNNIC",
          source: "special-handler-cn",
          status: ["ok"],
          nameservers: ["请访问官方网站查询..."],
          error: `中国域名(.cn)查询可能受到限制，请访问官方网站查询: http://whois.cnnic.cn/`,
          rawData: `中国域名管理机构CNNIC可能对WHOIS查询有限制，建议访问 http://whois.cnnic.cn/ 查询 ${domain} 信息。`,
          errorDetails: {
            notSupported: true,
            serverError: true
          },
          alternativeLinks: [{
            name: '中国域名信息查询中心',
            url: `http://whois.cnnic.cn/WhoisServlet?domain=${domain}`
          }]
        };
      }
    }

    // Use the best available query method based on domain
    try {
      console.log(`Using best available query method for ${domain}`);
      const result = await queryDomainWithBestMethod(domain);
      
      if (!result.error) {
        console.log(`Successfully retrieved information for ${domain}`);
        return result;
      }
      
      console.warn(`Best method query failed: ${result.error}`);
      // Return the error result but continue trying other methods
      return result;
    } catch (error) {
      console.warn(`Best method error: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // If no support for both WHOIS and RDAP, return a clear error
    if (!supportedWhois && !supportedRdap) {
      return {
        domain,
        error: `不支持的顶级域名: .${tld}，无法获取注册信息`,
        source: "no-supported-method",
        status: ["error"],
        rawData: `当前系统不支持查询 .${tld} 域名，没有可用的WHOIS服务器和RDAP端点配置。`,
        errorDetails: {
          notSupported: true
        },
        alternativeLinks: [{
          name: 'ICANN Lookup',
          url: `https://lookup.icann.org/en/lookup?q=${domain}&t=a`
        }]
      };
    }
    
    return {
      domain,
      error: `所有查询方法均失败，无法获取域名数据`,
      source: "all-methods-failed",
      status: ["error"],
      rawData: `尝试了所有可用查询方法，但均无法获取 ${domain} 的有效注册数据。`,
      errorDetails: {
        apiError: true,
        serverError: true
      },
      alternativeLinks: [
        {
          name: 'ICANN Lookup',
          url: `https://lookup.icann.org/en/lookup?q=${domain}&t=a`
        },
        {
          name: 'WhoisXmlApi',
          url: `https://www.whoisxmlapi.com/whois-lookup-result.php?domain=${domain}`
        }
      ]
    };
  } catch (error) {
    console.error("Domain lookup error:", error);
    return { 
      domain,
      error: `查询错误: ${error instanceof Error ? error.message : String(error)}`,
      status: ["error"],
      rawData: String(error),
      errorDetails: {
        network: true,
        parseError: String(error).includes('parse') || String(error).includes('解析'),
        formatError: String(error).includes('pattern') || String(error).includes('格式')
      }
    };
  }
}
