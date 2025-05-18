
// WHOIS 查询服务 - 使用优化的查询系统，优先采用本地API代理

import { WhoisResult } from './types/WhoisTypes';
import { queryRdapInfo } from './rdap/rdapService';
import { queryWhoisLocally, queryDomainInfoLocally, isTldSupported } from './whois/localWhoisService';
import { convertToLegacyFormat } from './whois/whoisParser';
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
    const isSupportedTld = tld in whoisServers;
    
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
      
      // 可以根据需要添加其他特殊TLD处理逻辑
    }

    // For supported TLDs, first try local WHOIS proxy (our preferred and most reliable method)
    if (isSupportedTld) {
      try {
        console.log(`TLD ${tld} is supported, trying local WHOIS proxy first...`);
        const whoisResult = await queryWhoisLocally(domain);
        if (!whoisResult.error) {
          console.log("Local WHOIS proxy lookup successful");
          return whoisResult;
        }
        console.warn(`Local WHOIS proxy lookup failed: ${whoisResult.error}`);
      } catch (error) {
        console.warn(`Local WHOIS error: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      console.log(`TLD ${tld} not directly supported in our WHOIS servers list, will try alternative methods`);
    }

    // If local WHOIS fails or TLD not supported, try RDAP as next option
    let rdapError = null;
    try {
      console.log("Trying RDAP lookup...");
      const rdapResult = await queryRdapInfo(domain);
      if (!rdapResult.error) {
        console.log("RDAP lookup successful");
        return rdapResult;
      }
      console.warn(`RDAP lookup failed: ${rdapResult.error}`);
      rdapError = rdapResult.error;
    } catch (error) {
      console.warn(`RDAP error: ${error instanceof Error ? error.message : String(error)}`);
      rdapError = error instanceof Error ? error.message : String(error);
    }

    // If RDAP fails, try the domain-info API through our local proxy
    let apiError = null;
    try {
      console.log("Trying domain-info API through proxy as last resort...");
      const result = await queryDomainInfoLocally(domain);
      
      if (!result.error) {
        return convertToLegacyFormat(result);
      }
      console.warn(`domain-info API query failed: ${result.error}`);
      apiError = result.error;
    } catch (error) {
      console.warn(`domain-info API error: ${error instanceof Error ? error.message : String(error)}`);
      apiError = error instanceof Error ? error.message : String(error);
    }
    
    // All methods failed, return a comprehensive error with debug information
    return {
      domain,
      error: isSupportedTld 
        ? "无法通过任何渠道获取域名信息" 
        : `不支持的顶级域名: .${tld}，且尝试的备选查询方法均失败`,
      source: "all-methods-failed",
      status: ["error"],
      rawData: `所有查询方法均失败:\n- ${isSupportedTld ? "本地WHOIS代理: 查询失败\n- " : ""}RDAP: ${rdapError}\n- API: ${apiError}\n\n可能原因:\n- 网络连接问题\n- WHOIS服务器不可用\n- 域名注册局限制查询\n- API返回了HTML而非JSON数据`,
      errorDetails: {
        network: true,
        cors: rdapError?.includes('CORS') || String(rdapError).includes('跨域'),
        apiError: true,
        serverError: true,
        formatError: apiError?.includes('pattern') || String(apiError).includes('格式') || apiError?.includes('HTML'),
        parseError: apiError?.includes('parse') || String(apiError).includes('解析') || apiError?.includes('HTML')
      },
      alternativeLinks: [
        {
          name: 'ICANN Lookup',
          url: `https://lookup.icann.org/en/lookup?q=${domain}&t=a`
        },
        {
          name: 'WhoisXmlApi',
          url: `https://www.whoisxmlapi.com/whois-lookup-result.php?domain=${domain}`
        },
        {
          name: 'DomainTools',
          url: `https://whois.domaintools.com/${domain}`
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
