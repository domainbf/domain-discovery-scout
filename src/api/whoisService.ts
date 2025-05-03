
// WHOIS 查询服务 - 使用优化的查询系统，优先采用RDAP

import { whoisServers, rdapBootstrap } from '@/utils/whois-servers';

// Import the types from our library
export interface Contact {
  name?: string;
  org?: string;
  email?: string[];
  phone?: string[];
  address?: string;
  country?: string; 
}

export interface DNSData {
  a?: string[];
  mx?: Array<{exchange: string, priority: number}>;
  txt?: string[];
  ns?: string[];
  caa?: any[];
  dnssec?: boolean;
}

export interface WhoisResult {
  domain?: string;
  registrar?: string;
  nameservers?: string[];
  dnssec?: boolean;
  status?: string[];
  created?: string;
  updated?: string;
  expires?: string;
  dns_records?: DNSData;
  registrant?: Contact;
  admin?: Contact;
  tech?: Contact;
  abuse?: Contact;
  source?: string;
  error?: string;
  rawData?: string;
  creationDate?: string; // For backward compatibility
  expiryDate?: string;   // For backward compatibility
  lastUpdated?: string;  // For backward compatibility
  registrantEmail?: string; // For backward compatibility
  registrantPhone?: string; // For backward compatibility
}

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

// Query RDAP directly (primary method)
async function queryRdapInfo(domain: string): Promise<WhoisResult> {
  const rdapUrl = `${rdapBootstrap}${encodeURIComponent(domain)}`;
  
  console.log("Requesting RDAP info:", rdapUrl);
  
  // Set timeout to 15 seconds
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  
  try {
    const response = await fetch(rdapUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
      cache: 'no-cache'
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return {
        error: `RDAP请求失败: ${response.status}`,
        rawData: await response.text()
      };
    }
    
    const data = await response.json();
    
    // Parse RDAP response
    const result: WhoisResult = {
      domain,
      source: 'rdap',
      rawData: JSON.stringify(data, null, 2)
    };
    
    // Extract basic information
    if (data.entities) {
      for (const entity of data.entities) {
        if (entity.roles && entity.roles.includes('registrar')) {
          result.registrar = entity.vcardArray?.[1]?.find(arr => arr[0] === 'fn')?.[3] || 
                             entity.publicIds?.[0]?.identifier ||
                             entity.handle;
        }
        
        if (entity.roles && entity.roles.includes('registrant')) {
          const registrant: Contact = {};
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
        } else if (event.eventAction === 'last changed') {
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
    
    return result;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { error: "RDAP查询超时", rawData: "请求超时" };
    }
    
    throw error;
  }
}

// Query the domain-info API (backup method)
async function queryDomainInfoApi(domain: string): Promise<WhoisResult> {
  const apiUrl = `/api/domain-info?domain=${encodeURIComponent(domain)}`;
  
  console.log("Requesting domain-info API:", apiUrl);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  
  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      signal: controller.signal,
      cache: 'no-cache'
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      let errorText = await response.text();
      
      try {
        // Try to parse as JSON if it looks like JSON
        if (errorText.trim().startsWith('{') || errorText.trim().startsWith('[')) {
          const errorJson = JSON.parse(errorText);
          errorText = errorJson.error || errorJson.message || errorText;
        }
      } catch (e) {
        // If can't parse, use the text as is
      }
      
      return { 
        error: `API请求失败: ${response.status}`,
        rawData: errorText
      };
    }
    
    // Get response content type to check if it's JSON
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const responseText = await response.text();
    
    // Only try to parse if it's JSON content or looks like JSON
    if (isJson || (responseText.trim().startsWith('{') || responseText.trim().startsWith('['))) {
      try {
        const data = JSON.parse(responseText);
        
        // If API returned an error
        if (data.error) {
          return {
            error: data.error,
            rawData: data.message || data.rawData || "无错误详情"
          };
        }
        
        // Return API result directly
        return data;
      } catch (parseError) {
        return { 
          error: `无法解析API响应JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
          rawData: responseText
        };
      }
    } else {
      // Handle HTML or other non-JSON responses
      return {
        error: "API响应格式无效(非JSON)",
        rawData: responseText.length > 500 ? 
          responseText.substring(0, 500) + "... (response trimmed)" : 
          responseText
      };
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { error: "API查询超时", rawData: "请求超时" };
    }
    
    throw error;
  }
}

// Query direct WHOIS (last resort)
async function queryDirectWhois(domain: string): Promise<WhoisResult> {
  const tld = domain.split('.').pop()?.toLowerCase() || "";
  
  // 直接使用从whois-servers.ts导入的服务器列表
  const whoisServer = whoisServers[tld as keyof typeof whoisServers];
  
  if (!whoisServer) {
    return { 
      error: `不支持的顶级域名: .${tld}`,
      rawData: `No WHOIS server defined for .${tld}`
    };
  }
  
  const apiUrl = `/api/whois-direct?domain=${encodeURIComponent(domain)}&server=${encodeURIComponent(whoisServer)}`;
  
  console.log(`Trying direct WHOIS API with server ${whoisServer}...`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  
  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal,
      cache: 'no-cache'
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      // Try to handle non-standard responses
      try {
        const responseText = await response.text();
        
        // Check content type
        const contentType = response.headers.get('content-type');
        const isJson = contentType && contentType.includes('application/json');
        
        // If response looks like HTML rather than JSON, it may be an API redirect or server error
        if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html')) {
          console.warn("Received HTML response instead of JSON, trying to extract error info");
          return {
            error: `WHOIS服务器 ${whoisServer} 响应格式错误或无法连接`,
            rawData: responseText.substring(0, 500) + "... (response trimmed)" // Only keep first 500 chars to avoid oversized
          };
        }
        
        // Try to parse JSON response if it looks like JSON
        if (isJson || responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
          try {
            const errorJson = JSON.parse(responseText);
            return {
              error: errorJson.error || `请求失败: ${response.status}`,
              rawData: errorJson.message || errorJson.rawData || responseText
            };
          } catch (e) {
            // Parse failed, use original response text
          }
        }
        
        return {
          error: `直接WHOIS API请求失败: ${response.status}`,
          rawData: responseText.length > 500 ? 
            responseText.substring(0, 500) + "... (response trimmed)" : 
            responseText
        };
      } catch (parseError) {
        return {
          error: `解析API响应失败: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
          rawData: `原始HTTP状态: ${response.status}`
        };
      }
    }
    
    // Get content type to check if it's JSON
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const responseText = await response.text();
    
    // Try to parse as JSON if it's JSON content or looks like JSON
    if (isJson || (responseText.trim().startsWith('{') || responseText.trim().startsWith('['))) {
      try {
        const data = JSON.parse(responseText);
        
        if (data.error) {
          return {
            error: data.error,
            rawData: data.message || "无错误详情"
          };
        }
        
        return data;
      } catch (jsonError) {
        return {
          error: `解析WHOIS结果失败: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`,
          rawData: responseText
        };
      }
    } else {
      // Handle HTML or other non-JSON responses
      if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html')) {
        return {
          error: "API返回了HTML而非JSON响应",
          rawData: responseText.substring(0, 500) + "... (response trimmed)"
        };
      }
      
      // If it's plain text, it might be a raw WHOIS result we can parse manually
      try {
        // Try to parse basic WHOIS info from plain text
        const parsedWhois = parseBasicWhoisText(responseText, domain);
        return parsedWhois;
      } catch (parseError) {
        return {
          error: "无法解析服务器响应",
          rawData: responseText.length > 500 ? 
            responseText.substring(0, 500) + "... (response trimmed)" : 
            responseText
        };
      }
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { error: "WHOIS API超时", rawData: "请求超时" };
    }
    throw error;
  }
}

// Simple function to parse basic WHOIS text when receiving non-JSON responses
function parseBasicWhoisText(text: string, domain: string): WhoisResult {
  const result: WhoisResult = {
    domain,
    source: 'direct-whois-text',
    rawData: text
  };
  
  // Define regex patterns for different WHOIS data fields
  const patterns: Record<string, RegExp[]> = {
    registrar: [
      /Registrar:\s*(.*?)[\r\n]/i,
      /Sponsoring Registrar:\s*(.*?)[\r\n]/i,
      /注册商:\s*(.*?)[\r\n]/i
    ],
    created: [
      /Creation Date:\s*(.*?)[\r\n]/i, 
      /Created on:\s*(.*?)[\r\n]/i,
      /Registration Date:\s*(.*?)[\r\n]/i,
      /注册时间:\s*(.*?)[\r\n]/i,
      /Registry Creation Date:\s*(.*?)[\r\n]/i
    ],
    expires: [
      /Expir(?:y|ation) Date:\s*(.*?)[\r\n]/i,
      /Registry Expiry Date:\s*(.*?)[\r\n]/i,
      /Expiration Date:\s*(.*?)[\r\n]/i,
      /到期时间:\s*(.*?)[\r\n]/i
    ],
    updated: [
      /Updated Date:\s*(.*?)[\r\n]/i,
      /Last Modified:\s*(.*?)[\r\n]/i,
      /更新时间:\s*(.*?)[\r\n]/i,
      /Last update:\s*(.*?)[\r\n]/i,
      /Update Date:\s*(.*?)[\r\n]/i
    ]
  };
  
  // Process each pattern to extract information
  for (const [field, patternsList] of Object.entries(patterns)) {
    for (const pattern of patternsList) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].trim()) {
        (result as any)[field] = match[1].trim(); // Fix the type error by using type assertion
        // Also set legacy field names for backward compatibility
        if (field === 'created') result.creationDate = match[1].trim();
        if (field === 'expires') result.expiryDate = match[1].trim();
        if (field === 'updated') result.lastUpdated = match[1].trim();
        break;
      }
    }
  }
  
  // Extract nameservers
  const nameserverPatterns = [
    /Name Server:\s*(.*?)[\r\n]/ig,
    /Nameservers?:\s*(.*?)[\r\n]/ig,
    /域名服务器:\s*(.*?)[\r\n]/ig,
    /nserver:\s*(.*?)[\r\n]/ig
  ];
  
  const nameservers: string[] = [];
  for (const pattern of nameserverPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1] && match[1].trim()) {
        nameservers.push(match[1].trim());
      }
    }
  }
  
  if (nameservers.length > 0) {
    result.nameservers = nameservers;
  }
  
  // Extract status
  const statusPatterns = [
    /Status:\s*(.*?)[\r\n]/ig,
    /Domain Status:\s*(.*?)[\r\n]/ig,
    /状态:\s*(.*?)[\r\n]/ig
  ];
  
  const statuses: string[] = [];
  for (const pattern of statusPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1] && match[1].trim()) {
        statuses.push(match[1].trim());
      }
    }
  }
  
  if (statuses.length > 0) {
    result.status = statuses;
  }
  
  return result;
}

// Convert the new domain-info API format to the legacy WhoisResult format for backward compatibility
function convertToLegacyFormat(info: WhoisResult): WhoisResult {
  return {
    ...info,
    creationDate: info.created,
    expiryDate: info.expires,
    lastUpdated: info.updated,
    registrantEmail: info.registrant?.email?.[0],
    registrantPhone: info.registrant?.phone?.[0]
  };
}
