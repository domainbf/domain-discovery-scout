
// This file implements a real WHOIS API service using public WHOIS API

export interface WhoisResult {
  registrar?: string;
  creationDate?: string;
  expiryDate?: string;
  status?: string;
  error?: string;
  nameServers?: string[];
  registrant?: string;
  admin?: string;
  tech?: string;
  lastUpdated?: string;
}

// 这是我们支持查询的顶级域名列表
const supportedTLDs = [
  "com", "net", "org", "cn", "io", 
  "info", "biz", "mobi", "name", "co",
  "tv", "me", "cc", "us", "de", "uk", 
  "jp", "fr", "au", "ru", "ch", "es", 
  "ca", "in", "nl", "it", "se", "no"
];

/**
 * 查询域名的WHOIS信息
 * 使用公共WHOIS API服务
 */
export async function queryWhois(domain: string): Promise<WhoisResult> {
  try {
    // 验证域名格式
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return { error: "无效的域名格式" };
    }

    const tld = domain.split('.').pop() || "";
    
    if (!supportedTLDs.includes(tld)) {
      return { error: `不支持的顶级域名: .${tld}` };
    }
    
    // 使用公共WHOIS API服务 - WHOIS API by APILayer
    const apiUrl = `https://api.apilayer.com/whois/query?domain=${domain}`;
    
    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          // 注意：这是一个免费API密钥的示例，实际上可能需要用户注册获取自己的API密钥
          // 或者使用其他免费的WHOIS API服务
          'apikey': 'Cg98v7LL8e6RCjZJuOgkdoLJGKA3cWj9'
        }
      });

      if (!response.ok) {
        console.error("WHOIS API error:", response.statusText);
        return { error: `API错误: ${response.status} ${response.statusText}` };
      }

      const data = await response.json();
      
      // 解析API响应数据
      return {
        registrar: data.result?.registrar || "未知",
        creationDate: data.result?.created_date || "未知",
        expiryDate: data.result?.expiry_date || "未知",
        status: data.result?.domain_status || "未知",
        nameServers: data.result?.name_servers || [],
        registrant: data.result?.registrant || "未知",
        admin: data.result?.admin || "未知",
        tech: data.result?.tech || "未知",
        lastUpdated: data.result?.updated_date || "未知"
      };
      
    } catch (apiError) {
      console.error("WHOIS API连接错误:", apiError);
      
      // 尝试备用API - whoisfreaks API (备用选项)
      try {
        const backupApiUrl = `https://api.whoisfreaks.com/v1.0/whois?apiKey=your_api_key_here&domainName=${domain}&type=live`;
        const backupResponse = await fetch(backupApiUrl);
        
        if (!backupResponse.ok) {
          throw new Error(`备用API错误: ${backupResponse.status}`);
        }
        
        const backupData = await backupResponse.json();
        
        return {
          registrar: backupData.registrar?.name || "未知",
          creationDate: backupData.create_date || "未知",
          expiryDate: backupData.expire_date || "未知",
          status: Array.isArray(backupData.domain_status) ? backupData.domain_status.join(', ') : backupData.domain_status || "未知",
          nameServers: backupData.name_servers || [],
          lastUpdated: backupData.update_date || "未知"
        };
      } catch (backupError) {
        console.error("备用WHOIS API错误:", backupError);
        return { error: "无法连接到WHOIS API服务，请稍后再试" };
      }
    }
  } catch (error) {
    console.error("WHOIS查询错误:", error);
    return { error: `查询出错: ${error instanceof Error ? error.message : String(error)}` };
  }
}
