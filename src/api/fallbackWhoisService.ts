
// 备用WHOIS查询服务 - 使用公共API

import { WhoisResult } from './whoisService';

// 使用公共WHOIS API的备用查询服务
export async function fallbackQueryWhois(domain: string): Promise<WhoisResult> {
  try {
    // 验证域名格式
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return { error: "无效的域名格式" };
    }

    console.log(`正在使用备用API查询 ${domain} 的WHOIS信息...`);

    // 使用第三方公共API
    const apiUrl = `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=at_demo&domainName=${encodeURIComponent(domain)}&outputFormat=JSON`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      cache: 'no-cache'
    });
    
    if (!response.ok) {
      return {
        error: `API请求失败: ${response.status} ${response.statusText}`,
        rawData: await response.text()
      };
    }
    
    const data = await response.json();
    
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
      return {
        error: "API返回的数据格式不正确",
        rawData: JSON.stringify(data)
      };
    }
  } catch (error) {
    console.error("备用WHOIS查询错误:", error);
    return { 
      error: `备用查询出错: ${error instanceof Error ? error.message : String(error)}`,
      rawData: String(error)
    };
  }
}
