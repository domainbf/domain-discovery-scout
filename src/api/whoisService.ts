
// WHOIS 查询服务 - 使用优化的查询系统，优先采用RDAP

import { WhoisResult } from './types/WhoisTypes';
import { queryRdapInfo } from './rdap/rdapService';
import { queryDomainInfoApi, queryDirectWhois } from './whois/whoisApiService';
import { convertToLegacyFormat } from './whois/whoisParser';

// Re-export types for use in other files
export type { WhoisResult, Contact } from './types/WhoisTypes';

/**
 * Query domain information using prioritized lookup sources
 */
export async function queryWhois(domain: string): Promise<WhoisResult> {
  try {
    // 更新域名格式验证，支持单字符域名和国别域名
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*(\.[a-zA-Z]{2,})+$/;
    if (!domainRegex.test(domain)) {
      return { 
        error: "域名格式无效", 
        domain,
        status: ["invalid"]
      };
    }

    console.log(`Querying information for ${domain}...`);
    
    // Extract TLD for special handling logic
    const tld = domain.split('.').pop()?.toLowerCase() || "";

    // Special TLD handling - 优先处理特殊的国别域名
    if (tld === "ge") {
      console.log("Special handling for Georgian (.ge) domain");
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
        rawData: `格鲁吉亚域名管理机构不提供标准WHOIS查询接口，请访问 https://registration.ge/ 查询 ${domain} 的信息。`
      };
    }

    // First try RDAP (preferred method)
    let rdapError = null;
    try {
      console.log("Trying RDAP lookup first...");
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

    // If RDAP fails, try the domain-info API
    let apiError = null;
    try {
      console.log("Trying domain-info API...");
      const result = await queryDomainInfoApi(domain);
      if (!result.error) {
        return convertToLegacyFormat(result);
      }
      console.warn(`domain-info API query failed: ${result.error}`);
      apiError = result.error;
    } catch (error) {
      console.warn(`domain-info API error: ${error instanceof Error ? error.message : String(error)}`);
      apiError = error instanceof Error ? error.message : String(error);
    }

    // Finally try direct WHOIS
    try {
      const directResult = await queryDirectWhois(domain);
      if (!directResult.error) {
        return directResult;
      }
      
      // If all methods failed, return a comprehensive error with debug information
      return {
        domain,
        error: "无法通过任何渠道获取域名信息",
        source: "all-methods-failed",
        status: ["error"],
        rawData: `所有查询方法均失败:\n- RDAP: ${rdapError}\n- API: ${apiError}\n- 直接WHOIS: ${directResult.error}\n\n可能原因:\n- 网络连接问题\n- WHOIS服务器不可用\n- 域名注册局限制查询`
      };
    } catch (error) {
      // All methods failed, return a comprehensive error
      return {
        domain,
        error: "所有查询方法均失败，无法获取域名信息",
        source: "fatal-error",
        status: ["error"],
        rawData: `所有查询方法均失败:\n- RDAP: ${rdapError}\n- API: ${apiError}\n- 直接WHOIS: ${error instanceof Error ? error.message : String(error)}\n\n可能是网络连接问题或WHOIS服务器暂时不可用，请稍后再试。`
      };
    }
  } catch (error) {
    console.error("Domain lookup error:", error);
    return { 
      domain,
      error: `查询错误: ${error instanceof Error ? error.message : String(error)}`,
      status: ["error"],
      rawData: String(error)
    };
  }
}
