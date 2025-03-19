
// WHOIS 查询服务 - 调用后端 API 获取数据
import { fallbackQueryWhois } from './fallbackWhoisService';

export interface WhoisResult {
  registrar?: string;
  creationDate?: string;
  expiryDate?: string;
  status?: string;
  error?: string;
  nameServers?: string[];
  registrant?: string;
  registrantEmail?: string;
  registrantPhone?: string;
  admin?: string;
  tech?: string;
  lastUpdated?: string;
  rawData?: string; // 原始WHOIS数据
}

// 支持查询的顶级域名列表及其对应的WHOIS服务器
const whoisServers: Record<string, string> = {
  "com": "whois.verisign-grs.com",
  "net": "whois.verisign-grs.com",
  "org": "whois.pir.org",
  "cn": "whois.cnnic.cn",
  "io": "whois.nic.io",
  "info": "whois.afilias.net",
  "biz": "whois.neulevel.biz",
  "mobi": "whois.dotmobiregistry.net",
  "name": "whois.nic.name",
  "co": "whois.nic.co",
  "tv": "whois.nic.tv",
  "me": "whois.nic.me",
  "cc": "ccwhois.verisign-grs.com",
  "us": "whois.nic.us",
  "de": "whois.denic.de",
  "uk": "whois.nic.uk",
  "jp": "whois.jprs.jp",
  "fr": "whois.nic.fr",
  "au": "whois.auda.org.au",
  "ru": "whois.tcinet.ru",
  "ch": "whois.nic.ch",
  "es": "whois.nic.es",
  "ca": "whois.cira.ca",
  "in": "whois.registry.in",
  "nl": "whois.domain-registry.nl",
  "it": "whois.nic.it",
  "se": "whois.iis.se",
  "no": "whois.norid.no"
};

/**
 * 查询域名的WHOIS信息
 * 直接使用公共API实现WHOIS查询
 */
export async function queryWhois(domain: string): Promise<WhoisResult> {
  try {
    // 验证域名格式
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return { error: "无效的域名格式" };
    }

    const tld = domain.split('.').pop()?.toLowerCase() || "";
    if (!whoisServers[tld]) {
      return { error: `不支持的顶级域名: .${tld}` };
    }
    
    console.log(`正在查询 ${domain} 的WHOIS信息...`);

    // 直接使用公共WHOIS API
    const apiUrl = `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=at_demo&domainName=${encodeURIComponent(domain)}&outputFormat=JSON`;
    
    console.log("请求API URL:", apiUrl);
    
    // 调用API
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      cache: 'no-cache' // 禁用缓存
    });
    
    // 确保响应是有效的
    if (!response.ok) {
      console.error(`API请求失败: ${response.status} ${response.statusText}`);
      return fallbackQueryWhois(domain); // 使用备用服务
    }
    
    try {
      const data = await response.json();
      
      // 如果API返回了错误信息
      if (data.ErrorMessage) {
        console.error("API返回错误:", data.ErrorMessage);
        return fallbackQueryWhois(domain); // 使用备用服务
      }
      
      // 提取WHOIS信息
      if (data && data.WhoisRecord) {
        const record = data.WhoisRecord;
        
        return {
          registrar: record.registrarName || record.registrar,
          creationDate: record.createdDate || record.registryData?.createdDate,
          expiryDate: record.expiryDate || record.registryData?.expiryDate,
          lastUpdated: record.updatedDate || record.registryData?.updatedDate,
          status: Array.isArray(record.status) ? record.status.join(', ') : record.status,
          nameServers: record.nameServers?.hostNames || [],
          registrant: record.registrant?.name || record.registrant?.organization,
          registrantEmail: record.registrant?.email,
          registrantPhone: record.registrant?.telephone,
          rawData: record.rawText
        };
      } else {
        console.error("API返回数据格式不正确");
        return fallbackQueryWhois(domain); // 使用备用服务
      }
    } catch (error) {
      console.error("解析API响应失败:", error);
      return fallbackQueryWhois(domain); // 使用备用服务
    }
  } catch (error) {
    console.error("WHOIS查询错误:", error);
    return fallbackQueryWhois(domain); // 使用备用服务
  }
}
