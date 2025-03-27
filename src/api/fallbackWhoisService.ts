
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

    // 使用免费的RDAP API代替WhoisXML API
    const apiUrl = `https://rdap.org/domain/${encodeURIComponent(domain)}`;
    
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
    
    // 解析RDAP响应，提取WHOIS类似信息
    return {
      registrar: extractRegistrarFromRDAP(data),
      creationDate: extractDateFromEvents(data, 'registration'),
      expiryDate: extractDateFromEvents(data, 'expiration'),
      lastUpdated: extractDateFromEvents(data, 'last changed'),
      status: extractStatus(data),
      nameServers: extractNameServers(data),
      registrant: extractEntityName(data, 'registrant'),
      registrantEmail: extractEntityEmail(data, 'registrant'),
      registrantPhone: extractEntityPhone(data, 'registrant'),
      rawData: JSON.stringify(data, null, 2)
    };
  } catch (error) {
    console.error("备用WHOIS查询错误:", error);
    
    // 第二备用方案 - 使用另一个免费API
    try {
      console.log("尝试使用第二备用API...");
      return await queryAltWhoisAPI(domain);
    } catch (secondError) {
      console.error("第二备用API也失败:", secondError);
      return { 
        error: `无法查询域名信息: ${error instanceof Error ? error.message : String(error)}`,
        rawData: String(error)
      };
    }
  }
}

// 第二备用API查询函数
async function queryAltWhoisAPI(domain: string): Promise<WhoisResult> {
  const apiUrl = `https://api.domainsdb.info/v1/domains/search?domain=${encodeURIComponent(domain)}`;
  
  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`API请求失败: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!data.domains || data.domains.length === 0) {
    throw new Error("未找到域名信息");
  }
  
  const domainInfo = data.domains[0];
  
  return {
    creationDate: domainInfo.create_date,
    lastUpdated: domainInfo.update_date,
    expiryDate: null,
    registrar: null,
    status: null,
    nameServers: null,
    rawData: JSON.stringify(data, null, 2)
  };
}

// 从RDAP响应中提取注册商信息
function extractRegistrarFromRDAP(data: any): string | undefined {
  if (data.entities) {
    const registrar = data.entities.find((entity: any) => 
      entity.roles && entity.roles.includes('registrar')
    );
    if (registrar) {
      return registrar.vcardArray?.[1]?.find((arr: any) => arr[0] === 'fn')?.[3] || 
             registrar.publicIds?.[0]?.identifier ||
             registrar.handle;
    }
  }
  return data.registrarName || data.registrar || undefined;
}

// 从RDAP事件中提取日期
function extractDateFromEvents(data: any, eventType: string): string | undefined {
  if (data.events) {
    const event = data.events.find((evt: any) => 
      evt.eventAction.toLowerCase().includes(eventType.toLowerCase())
    );
    return event?.eventDate;
  }
  return undefined;
}

// 从RDAP响应中提取状态
function extractStatus(data: any): string | undefined {
  if (data.status && Array.isArray(data.status)) {
    return data.status.join(', ');
  }
  return data.status || undefined;
}

// 从RDAP响应中提取域名服务器
function extractNameServers(data: any): string[] | undefined {
  if (data.nameservers && Array.isArray(data.nameservers)) {
    return data.nameservers.map((ns: any) => ns.ldhName || ns);
  }
  return undefined;
}

// 从RDAP实体中提取名称
function extractEntityName(data: any, role: string): string | undefined {
  if (data.entities) {
    const entity = data.entities.find((ent: any) => 
      ent.roles && ent.roles.includes(role)
    );
    if (entity) {
      if (entity.vcardArray && Array.isArray(entity.vcardArray[1])) {
        const fnEntry = entity.vcardArray[1].find((arr: any) => arr[0] === 'fn');
        if (fnEntry) return fnEntry[3];
      }
      return entity.handle;
    }
  }
  return undefined;
}

// 从RDAP实体中提取电子邮件
function extractEntityEmail(data: any, role: string): string | undefined {
  if (data.entities) {
    const entity = data.entities.find((ent: any) => 
      ent.roles && ent.roles.includes(role)
    );
    if (entity && entity.vcardArray && Array.isArray(entity.vcardArray[1])) {
      const emailEntry = entity.vcardArray[1].find((arr: any) => arr[0] === 'email');
      if (emailEntry) return emailEntry[3];
    }
  }
  return undefined;
}

// 从RDAP实体中提取电话
function extractEntityPhone(data: any, role: string): string | undefined {
  if (data.entities) {
    const entity = data.entities.find((ent: any) => 
      ent.roles && ent.roles.includes(role)
    );
    if (entity && entity.vcardArray && Array.isArray(entity.vcardArray[1])) {
      const telEntry = entity.vcardArray[1].find((arr: any) => arr[0] === 'tel');
      if (telEntry) return telEntry[3];
    }
  }
  return undefined;
}
