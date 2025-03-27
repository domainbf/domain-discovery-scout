
// WHOIS 查询服务 - 调用本地 API 获取数据
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
export const whoisServers: Record<string, string> = {
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
  "se": "whois.iis.se", // 确保.se使用正确的服务器地址
  "no": "whois.norid.no",
  // 可以根据需要添加更多顶级域名服务器
  "bb": "whois.nic.bb",  // 例如: 添加巴巴多斯域名服务器
  "fi": "whois.fi",      // 添加芬兰域名服务器
  "dk": "whois.dk-hostmaster.dk", // 添加丹麦域名服务器
  "nz": "whois.irs.net.nz",  // 添加新西兰域名服务器
  "pl": "whois.dns.pl",  // 添加波兰域名服务器
  "be": "whois.dns.be",  // 添加比利时域名服务器
  "br": "whois.registro.br", // 添加巴西域名服务器
  "eu": "whois.eu"       // 添加欧盟域名服务器
};

/**
 * 查询域名的WHOIS信息
 * 使用本地Express服务器通过Socket连接到官方WHOIS服务器
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
      return { error: `不支持的顶级域名: .${tld}，请在whoisServers对象中添加对应的WHOIS服务器` };
    }
    
    console.log(`正在查询 ${domain} 的WHOIS信息...`);

    // 调用本地WHOIS API
    const apiUrl = `/api/whois?domain=${encodeURIComponent(domain)}`;
    
    console.log("请求API URL:", apiUrl);
    
    // 设置15秒的超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    // 调用API
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      signal: controller.signal,
      cache: 'no-cache' // 禁用缓存
    });
    
    clearTimeout(timeoutId);
    
    // 确保响应是有效的
    if (!response.ok) {
      console.error(`API请求失败: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error("错误响应:", errorText);
      
      // 尝试解析错误响应，如果是JSON
      let parsedError = "";
      try {
        const errorJson = JSON.parse(errorText);
        parsedError = errorJson.error || errorJson.message || errorText;
      } catch (e) {
        parsedError = errorText;
      }
      
      return { 
        error: `API请求失败: ${response.status}`,
        rawData: parsedError
      };
    }
    
    try {
      const data = await response.json();
      
      // 如果API返回了错误信息
      if (data.error) {
        console.error("API返回错误:", data.error);
        return {
          error: data.error,
          rawData: data.message || data.rawData || "无错误详情"
        };
      }
      
      // 直接返回API结果
      return {
        registrar: data.registrar,
        creationDate: data.creationDate,
        expiryDate: data.expiryDate,
        lastUpdated: data.lastUpdated,
        status: data.status,
        nameServers: data.nameServers,
        registrant: data.registrant,
        registrantEmail: data.registrantEmail,
        registrantPhone: data.registrantPhone,
        rawData: data.rawData
      };
    } catch (error) {
      console.error("解析API响应失败:", error);
      return { 
        error: `解析API响应失败: ${error instanceof Error ? error.message : String(error)}`,
        rawData: String(error)
      };
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.error("WHOIS查询超时");
      return { 
        error: "查询超时，请稍后再试",
        rawData: "请求超时"
      };
    }
    
    console.error("WHOIS查询错误:", error);
    return { 
      error: `查询错误: ${error instanceof Error ? error.message : String(error)}`,
      rawData: String(error)
    };
  }
}
