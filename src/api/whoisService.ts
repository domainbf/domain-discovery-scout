
// WHOIS 查询服务 - 调用后端 API 获取数据

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
 * 使用后端API实现Socket连接到WHOIS服务器
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
    
    console.log(`正在通过API查询 ${domain} 的WHOIS信息...`);

    // 构建API URL
    const apiUrl = `/api/whois?domain=${encodeURIComponent(domain)}`;
    
    // 调用API
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      try {
        const errorData = await response.json();
        return { 
          error: errorData.error || `服务器返回错误: ${response.status}`,
          rawData: errorData.message
        };
      } catch (e) {
        // 如果响应不是JSON格式
        const errorText = await response.text();
        return {
          error: `服务器返回错误: ${response.status}`,
          rawData: errorText
        };
      }
    }
    
    // 解析API响应
    let data;
    try {
      data = await response.json();
    } catch (e) {
      const text = await response.text();
      return {
        error: "解析响应失败",
        rawData: text
      };
    }
    
    // 如果API返回了错误信息
    if (data.error) {
      return { 
        error: data.error,
        rawData: data.message || data.rawData
      };
    }
    
    return data;
  } catch (error) {
    console.error("WHOIS查询错误:", error);
    return { error: `查询出错: ${error instanceof Error ? error.message : String(error)}` };
  }
}
