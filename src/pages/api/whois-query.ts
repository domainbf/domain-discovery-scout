
import { Request, Response } from 'express';
import net from 'net';
import https from 'https';
import { whoisServers } from '@/utils/whois-servers';

export default async function handler(req: Request, res: Response) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ status: 'ok' });
  }

  try {
    const domain = req.query.domain as string;
    const queryType = req.query.type as string || 'whois'; // 'whois' or 'rdap'
    
    if (!domain || typeof domain !== 'string') {
      return res.status(200).json({ error: '请提供域名参数' });
    }

    // 验证域名格式 - 使用更宽松的正则表达式
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?)+$/;
    if (!domainRegex.test(domain)) {
      return res.status(200).json({ error: '无效的域名格式' });
    }

    // Extract the TLD
    const tld = domain.split('.').pop()?.toLowerCase() || "";
    
    // Special handling for .cn domains
    if (tld === 'cn') {
      return res.status(200).json({
        domain,
        error: "中国域名管理机构CNNIC有查询限制",
        source: 'special-handler',
        rawData: `中国域名管理机构CNNIC对WHOIS查询有限制，请使用官方查询接口: http://whois.cnnic.cn/WhoisServlet?domain=${domain}`,
        alternativeLinks: [{
          name: '中国域名信息查询中心',
          url: `http://whois.cnnic.cn/WhoisServlet?domain=${domain}`
        }]
      });
    }
    
    // If RDAP query is requested
    if (queryType === 'rdap') {
      try {
        const rdapData = await queryRDAP(domain);
        return res.status(200).json(rdapData);
      } catch (rdapError) {
        console.error('RDAP查询错误:', rdapError);
        return res.status(200).json({
          domain,
          error: `RDAP查询失败: ${rdapError instanceof Error ? rdapError.message : String(rdapError)}`,
          rawData: String(rdapError)
        });
      }
    }
    
    // Default to WHOIS query
    const whoisServer = whoisServers[tld];
    
    if (!whoisServer) {
      return res.status(200).json({ 
        domain,
        error: `不支持的顶级域名: .${tld}`,
        rawData: `未找到 .${tld} 的WHOIS服务器配置，请在whoisServers中添加对应服务器。`
      });
    }
    
    console.log(`正在查询WHOIS服务器 ${whoisServer} 获取 ${domain} 的信息...`);
    
    try {
      const whoisData = await queryWhoisServer(domain, whoisServer);
      
      // 检查是否返回了HTML而不是WHOIS数据
      if (whoisData.includes('<!DOCTYPE html>') || whoisData.includes('<html') || whoisData.includes('<body')) {
        return res.status(200).json({ 
          error: `WHOIS服务器 ${whoisServer} 返回了HTML而非预期的文本格式`,
          domain,
          rawData: whoisData.substring(0, 500) + "... (response truncated)"
        });
      }
      
      // 检查是否找不到域名
      if (whoisData.match(/no match|not found|no data found|not registered|no entries found|not available|没有找到|not exist/i)) {
        return res.status(200).json({ 
          domain,
          error: "域名未注册或无法找到记录",
          rawData: whoisData
        });
      }
      
      const parsedResult = parseWhoisResponse(whoisData, domain);
      return res.status(200).json(parsedResult);
    } catch (whoisError) {
      console.error('WHOIS服务器查询错误:', whoisError);
      return res.status(200).json({
        domain,
        error: `WHOIS查询失败: ${whoisError instanceof Error ? whoisError.message : String(whoisError)}`,
        rawData: String(whoisError)
      });
    }
  } catch (error) {
    console.error('WHOIS查询错误:', error);
    return res.status(200).json({
      error: `查询出错: ${error instanceof Error ? error.message : String(error)}`,
      message: String(error)
    });
  }
}

// Query WHOIS server via socket connection with improved error handling
function queryWhoisServer(domain: string, server: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = net.createConnection({ port: 43, host: server }, () => {
      // WHOIS protocol: Send domain name followed by CRLF
      client.write(domain + '\r\n');
    });
    
    let data = '';
    client.on('data', (chunk) => {
      data += chunk.toString();
    });
    
    client.on('end', () => {
      resolve(data);
    });
    
    client.on('error', (err) => {
      reject(err);
    });
    
    // Reduce timeout for faster error response
    client.setTimeout(8000, () => {
      client.destroy();
      reject(new Error('连接超时'));
    });
  });
}

// Query RDAP information via HTTP
async function queryRDAP(domain: string): Promise<any> {
  const tld = domain.split('.').pop()?.toLowerCase() || "";
  let rdapUrl = '';
  
  // Default to RDAP bootstrap service
  rdapUrl = `https://rdap.org/domain/${encodeURIComponent(domain)}`;
  
  // TLD-specific RDAP endpoints
  const rdapEndpoints: Record<string, string> = {
    "com": "https://rdap.verisign.com/com/v1/",
    "net": "https://rdap.verisign.com/net/v1/",
    "org": "https://rdap.publicinterestregistry.org/rdap/",
    "info": "https://rdap.afilias.net/rdap/",
    "io": "https://rdap.nic.io/",
    "app": "https://rdap.nominet.uk/app/",
    "xyz": "https://rdap.centralnic.com/xyz/"
  };
  
  if (rdapEndpoints[tld]) {
    rdapUrl = `${rdapEndpoints[tld]}domain/${encodeURIComponent(domain)}`;
  }
  
  return new Promise((resolve, reject) => {
    const request = https.get(rdapUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Domain-Info-Tool/1.0'
      },
      timeout: 5000
    }, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        if (response.statusCode !== 200) {
          if (response.statusCode === 404) {
            resolve({
              domain,
              error: "域名在RDAP服务中未找到",
              source: 'rdap',
              rawData: data
            });
            return;
          }
          
          reject(new Error(`RDAP请求失败: ${response.statusCode} ${response.statusMessage}`));
          return;
        }
        
        try {
          if (data.includes('<!DOCTYPE html>') || data.includes('<html')) {
            reject(new Error('RDAP返回了HTML而非JSON数据'));
            return;
          }
          
          const rdapData = JSON.parse(data);
          const result = parseRDAPResponse(rdapData, domain);
          resolve(result);
        } catch (e) {
          reject(new Error(`解析RDAP响应失败: ${e instanceof Error ? e.message : String(e)}`));
        }
      });
    });
    
    request.on('error', (error) => {
      reject(error);
    });
    
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('RDAP请求超时'));
    });
  });
}

// Parse RDAP response to extract domain information
function parseRDAPResponse(data: any, domain: string): any {
  const result: any = {
    domain,
    source: 'rdap',
    rawData: JSON.stringify(data, null, 2)
  };
  
  // Extract registrar
  if (data.entities) {
    for (const entity of data.entities) {
      if (entity.roles && entity.roles.includes('registrar')) {
        result.registrar = entity.vcardArray?.[1]?.find((arr: any[]) => arr[0] === 'fn')?.[3] || 
                          entity.publicIds?.[0]?.identifier ||
                          entity.handle;
      }
      
      // Extract registrant information
      if (entity.roles && entity.roles.includes('registrant')) {
        const registrant: any = {};
        const vcard = entity.vcardArray?.[1];
        
        if (vcard) {
          for (const entry of vcard) {
            if (entry[0] === 'fn') registrant.name = entry[3];
            else if (entry[0] === 'org') registrant.org = entry[3];
            else if (entry[0] === 'email') {
              registrant.email = registrant.email || [];
              registrant.email.push(entry[3]);
            } else if (entry[0] === 'tel') {
              registrant.phone = registrant.phone || [];
              registrant.phone.push(entry[3]);
            }
          }
          
          if (Object.keys(registrant).length > 0) {
            result.registrant = registrant;
          }
        }
      }
    }
  }
  
  // Extract dates
  if (data.events) {
    for (const event of data.events) {
      if (event.eventAction === 'registration') {
        result.created = event.eventDate;
        result.creationDate = event.eventDate;
      } else if (event.eventAction === 'expiration') {
        result.expires = event.eventDate;
        result.expiryDate = event.eventDate;
      } else if (event.eventAction === 'last changed' || event.eventAction === 'last update') {
        result.updated = event.eventDate;
        result.lastUpdated = event.eventDate;
      }
    }
  }
  
  // Extract status
  if (data.status) {
    result.status = Array.isArray(data.status) ? data.status : [data.status];
  }
  
  // Extract nameservers
  if (data.nameservers) {
    result.nameservers = data.nameservers.map((ns: any) => ns.ldhName || ns);
  }
  
  // Extract DNSSEC information
  if (data.secureDNS) {
    result.dnssec = Boolean(data.secureDNS.delegationSigned);
  }
  
  return result;
}

// Parse WHOIS response to extract important information
function parseWhoisResponse(response: string, domain: string) {
  // Always include raw data for debugging and display
  const result: any = {
    domain,
    rawData: response,
    source: 'whois'
  };

  // Define regex patterns for different WHOIS data fields
  const patterns: Record<string, RegExp[]> = {
    registrar: [
      /Registrar:\s*(.*?)[\r\n]/i,
      /Sponsoring Registrar:\s*(.*?)[\r\n]/i,
      /注册商:\s*(.*?)[\r\n]/i
    ],
    creationDate: [
      /Creation Date:\s*(.*?)[\r\n]/i, 
      /Created on:\s*(.*?)[\r\n]/i,
      /Registration Date:\s*(.*?)[\r\n]/i,
      /注册时间:\s*(.*?)[\r\n]/i,
      /Registry Creation Date:\s*(.*?)[\r\n]/i
    ],
    expiryDate: [
      /Expir(?:y|ation) Date:\s*(.*?)[\r\n]/i,
      /Registry Expiry Date:\s*(.*?)[\r\n]/i,
      /Expiration Date:\s*(.*?)[\r\n]/i,
      /到期时间:\s*(.*?)[\r\n]/i
    ],
    lastUpdated: [
      /Updated Date:\s*(.*?)[\r\n]/i,
      /Last Modified:\s*(.*?)[\r\n]/i,
      /更新时间:\s*(.*?)[\r\n]/i,
      /Last update:\s*(.*?)[\r\n]/i,
      /Update Date:\s*(.*?)[\r\n]/i
    ],
    status: [
      /Status:\s*(.*?)[\r\n]/i,
      /Domain Status:\s*(.*?)[\r\n]/i,
      /状态:\s*(.*?)[\r\n]/i
    ],
    nameservers: [
      /Name Server:\s*(.*?)[\r\n]/ig,
      /Nameservers?:\s*(.*?)[\r\n]/ig,
      /域名服务器:\s*(.*?)[\r\n]/ig,
      /nserver:\s*(.*?)[\r\n]/ig
    ],
    registrant: [
      /Registrant(?:\s+Organization)?:\s*(.*?)[\r\n]/i,
      /注册人:\s*(.*?)[\r\n]/i,
      /Registrant Name:\s*(.*?)[\r\n]/i
    ],
    registrantEmail: [
      /Registrant Email:\s*(.*?)[\r\n]/i,
      /注册人邮箱:\s*(.*?)[\r\n]/i
    ],
    registrantPhone: [
      /Registrant Phone(?:\s+Number)?:\s*(.*?)[\r\n]/i,
      /注册人电话:\s*(.*?)[\r\n]/i
    ]
  };

  // Check for empty response
  if (!response || response.trim() === '') {
    result.error = "WHOIS服务器返回空响应";
    return result;
  }

  // Process each pattern
  for (const [field, patternsList] of Object.entries(patterns)) {
    if (field === 'nameservers') {
      const nameServers: string[] = [];
      for (const pattern of patternsList) {
        let match;
        // Reset lastIndex to ensure regex works correctly with global flag
        pattern.lastIndex = 0;
        while ((match = pattern.exec(response)) !== null) {
          if (match[1] && match[1].trim()) {
            nameServers.push(match[1].trim());
          }
        }
      }
      
      if (nameServers.length > 0) {
        result.nameservers = nameServers;
      }
    } else if (field === 'status') {
      const statuses: string[] = [];
      for (const pattern of patternsList) {
        const regex = new RegExp(pattern.source, 'gi'); // Create a global version
        let match;
        while ((match = regex.exec(response)) !== null) {
          if (match[1] && match[1].trim()) {
            statuses.push(match[1].trim());
          }
        }
      }
      
      if (statuses.length > 0) {
        result.status = statuses;
      }
    } else {
      for (const pattern of patternsList) {
        const match = response.match(pattern);
        if (match && match[1] && match[1].trim()) {
          result[field] = match[1].trim();
          break;
        }
      }
    }
  }

  return result;
}
