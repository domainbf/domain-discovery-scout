
// WHOIS 查询服务 - 使用优化的查询系统，优先采用RDAP

import { WhoisResult, Contact } from './types/WhoisTypes';
import { queryRdapInfo } from './rdap/rdapService';
import { queryDomainInfoApi, queryDirectWhois } from './whois/whoisApiService';
import { convertToLegacyFormat } from './whois/whoisParser';

// Re-export types for use in other files
export { WhoisResult, Contact } from './types/WhoisTypes';

/**
 * Query domain information using prioritized lookup sources
 */
export async function queryWhois(domain: string): Promise<WhoisResult> {
  try {
    // 更新域名格式验证，支持单字符域名和国别域名
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*(\.[a-zA-Z]{2,})+$/;
    if (!domainRegex.test(domain)) {
      return { error: "域名格式无效" };
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
        message: `格鲁吉亚(.ge)域名需通过官方网站查询: https://registration.ge/`,
        rawData: `格鲁吉亚域名管理机构不提供标准WHOIS查询接口，请访问 https://registration.ge/ 查询 ${domain} 的信息。`
      };
    }

    // First try RDAP (preferred method)
    try {
      console.log("Trying RDAP lookup first...");
      const rdapResult = await queryRdapInfo(domain);
      if (!rdapResult.error) {
        console.log("RDAP lookup successful");
        return rdapResult;
      }
      console.warn(`RDAP lookup failed: ${rdapResult.error}`);
    } catch (error) {
      console.warn(`RDAP error: ${error}`);
    }

    // If RDAP fails, try the domain-info API
    try {
      console.log("Trying domain-info API...");
      const result = await queryDomainInfoApi(domain);
      if (!result.error) {
        return convertToLegacyFormat(result);
      }
      console.warn(`domain-info API query failed: ${result.error}`);
    } catch (error) {
      console.warn(`domain-info API error: ${error}`);
    }

    // Finally try direct WHOIS
    return await queryDirectWhois(domain);
  } catch (error) {
    console.error("Domain lookup error:", error);
    return { 
      error: `查询错误: ${error instanceof Error ? error.message : String(error)}`,
      rawData: String(error)
    };
  }
}
