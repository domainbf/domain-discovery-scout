
// WHOIS 查询服务 - 使用优化的查询系统，集成RDAP和WHOIS方法

import { WhoisResult } from './types/WhoisTypes';
import { queryWhoisLocally, queryRdapLocally, queryDomainWithBestMethod, isTldSupported } from './whois/localWhoisService';
import { convertToLegacyFormat } from './whois/whoisParser';
import { isRdapSupported, getAlternativeRdapEndpoints } from './rdap/rdapEndpoints';
import { whoisServers, specialTlds } from '@/utils/whois-servers';
import { queryLocalWhois, queryDirectWhois } from './utils/apiHelper';

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
        try {
          // 尝试直接查询CN域名 - 使用直接API
          const cnApiResult = await queryDirectWhois(domain);
          if (!cnApiResult.error) {
            return {
              ...cnApiResult,
              source: "direct-cn-query"
            };
          }
          
          // 如果直接查询失败，返回带有官方链接的结果
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
        } catch (error) {
          console.error("CN域名查询失败:", error);
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
    }

    // Try RDAP first for supported TLDs (more structured data)
    if (supportedRdap) {
      try {
        console.log(`Trying RDAP for ${domain}...`);
        const rdapResult = await queryRdapLocally(domain);
        if (!rdapResult.error) {
          console.log(`RDAP query successful for ${domain}`);
          return rdapResult;
        }
        console.warn(`RDAP query failed: ${rdapResult.error}`);
      } catch (error) {
        console.warn(`RDAP error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Try WHOIS next
    if (supportedWhois) {
      try {
        console.log(`Trying WHOIS for ${domain}...`);
        const whoisResult = await queryWhoisLocally(domain);
        if (!whoisResult.error) {
          console.log(`WHOIS query successful for ${domain}`);
          return whoisResult;
        }
        console.warn(`WHOIS query failed: ${whoisResult.error}`);
        
        // Even if there's an error, if we got some data, return it
        if (whoisResult.rawData && 
            (whoisResult.registrar || whoisResult.created || whoisResult.nameservers)) {
          console.log(`Returning partial WHOIS data for ${domain}`);
          return whoisResult;
        }
      } catch (error) {
        console.warn(`WHOIS error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // Try direct WHOIS API (new fallback)
    try {
      console.log(`Trying direct WHOIS API for ${domain}...`);
      const directResult = await queryDirectWhois(domain);
      if (!directResult.error || 
          (directResult.rawData && directResult.rawData.length > 50)) {
        console.log(`Direct WHOIS query returned data for ${domain}`);
        return directResult;
      }
      console.warn("Direct WHOIS API failed or returned incomplete data");
    } catch (directError) {
      console.warn(`Direct API error: ${directError instanceof Error ? directError.message : String(directError)}`);
    }
    
    // Last resort: Try direct API integration
    try {
      console.log(`Trying local API for ${domain}...`);
      const localResult = await queryLocalWhois(domain, 'whois');
      if (!localResult.error || 
          (localResult.rawData && localResult.rawData.length > 50)) {
        console.log(`Local API query returned data for ${domain}`);
        return localResult;
      }
    } catch (error) {
      console.warn(`Local API error: ${error instanceof Error ? error.message : String(error)}`);
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
      error: `无法通过任何渠道获取域名数据`,
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
