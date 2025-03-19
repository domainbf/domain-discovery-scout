
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

    // 修改为使用前端服务的路径
    const apiUrl = `/api/whois-query?domain=${encodeURIComponent(domain)}`;
    
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
    
    // 读取响应文本（只读取一次）
    const responseText = await response.text();
    
    console.log("API响应状态:", response.status, response.statusText);
    console.log("API响应头:", JSON.stringify(Object.fromEntries([...response.headers.entries()])));
    console.log("API响应内容预览:", responseText.substring(0, 200) + '...');
    
    // 尝试解析为JSON
    try {
      const data = JSON.parse(responseText);
      
      // 如果API返回了错误信息
      if (data.error) {
        return { 
          error: data.error,
          rawData: data.message || data.rawData
        };
      }
      
      return data;
    } catch (e) {
      console.error("解析JSON响应失败:", e);
      // 如果响应文本包含JavaScript函数或HTML，说明返回的是API文件本身而不是执行结果
      if (responseText.includes('function') || responseText.includes('module.exports') || responseText.includes('<html>')) {
        return {
          error: "API端点配置错误，返回了代码文件而不是执行结果",
          rawData: responseText.substring(0, 1000) // 仅显示一部分以避免过长
        };
      }
      
      return {
        error: "服务器返回了非JSON格式的数据",
        rawData: responseText
      };
    }
  } catch (error) {
    console.error("WHOIS查询错误:", error);
    return { 
      error: `查询出错: ${error instanceof Error ? error.message : String(error)}`,
      rawData: String(error)
    };
  }
}
