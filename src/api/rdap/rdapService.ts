
// RDAP Service - Handles RDAP protocol lookups
import { WhoisResult, Contact } from '../types/WhoisTypes';
import { rdapBootstrap, rdapEndpoints, isRdapSupported } from '@/utils/whois-servers';

/**
 * Query domain information using RDAP protocol
 * @param domain Domain to query
 * @returns Promise with WhoisResult
 */
export async function queryRdapInfo(domain: string): Promise<WhoisResult> {
  // 更宽松的域名正则表达式，支持更多有效域名格式，包括 com.net 这样的格式
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!domainRegex.test(domain)) {
    return { 
      domain,
      error: "域名格式无效",
      rawData: `Invalid domain format: ${domain}`,
      errorDetails: {
        formatError: true,
        patternError: true
      }
    };
  }

  // 对于例如 com.net 这样的组合域名，可能需要特殊处理
  // 检查是否包含多个点，如果有，判断是否可能是一个有效的 TLD 组合
  const parts = domain.split('.');
  if (parts.length > 2) {
    console.log(`Complex domain detected: ${domain} with multiple parts: ${parts.join(', ')}`);
  }

  const tld = domain.split('.').pop()?.toLowerCase() || "";
  
  // Check if RDAP is supported for this TLD
  if (!isRdapSupported(tld)) {
    console.log(`RDAP not supported for .${tld} domain`);
    return {
      error: `RDAP协议不支持 .${tld} 域名`,
      domain,
      errorDetails: {
        notSupported: true
      }
    };
  }
  
  // Use direct RDAP endpoint if available or fallback to bootstrap
  let rdapUrl = rdapBootstrap + encodeURIComponent(domain);
  
  // If we have a specific RDAP endpoint for this TLD, use it
  if (tld in rdapEndpoints) {
    rdapUrl = `${rdapEndpoints[tld]}domain/${encodeURIComponent(domain)}`;
  }
  
  console.log("Requesting RDAP info:", rdapUrl);
  
  // 降低超时时间到6秒，提高用户体验
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 second timeout
  
  try {
    console.log("RDAP fetch started...");
    
    // 尝试通过后端代理来解决CORS问题
    const useProxy = true; // 设置为true使用代理，解决CORS问题
    
    // 如果使用代理，则请求我们自己的API端点，而不是直接请求RDAP服务器
    const requestUrl = useProxy 
      ? `/api/domain-info?domain=${encodeURIComponent(domain)}&source=rdap` 
      : rdapUrl;
    
    console.log(`Using ${useProxy ? 'proxy' : 'direct'} RDAP request to: ${requestUrl}`);
    
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Domain-Info-Tool/1.0'
      },
      signal: controller.signal,
      cache: 'no-store', // Disable caching for fresh results
      credentials: 'omit' // 明确不发送凭据，减少CORS问题
    });
    
    clearTimeout(timeoutId);
    console.log("RDAP fetch completed with status:", response.status);
    
    if (!response.ok) {
      // Check if this was a 404 - domain might not exist
      if (response.status === 404) {
        return {
          domain,
          error: "域名未注册或RDAP服务器中无记录",
          source: 'rdap',
          errorDetails: {
            notFound: true,
            statusCode: response.status
          }
        };
      }
      
      // Try to get more detailed error information
      let errorMessage = `RDAP请求失败: ${response.status} - ${response.statusText}`;
      let responseText = "";
      
      try {
        responseText = await response.text();
        console.log("RDAP error response:", responseText.substring(0, 200));
        
        // Check if response is HTML 
        if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html')) {
          return {
            domain,
            error: "RDAP查询返回了HTML而非预期的JSON数据",
            rawData: responseText.substring(0, 500) + "... (response truncated)",
            errorDetails: {
              formatError: true,
              parseError: true,
              serverError: true
            }
          };
        }
        
        // Try to parse as JSON if it looks like JSON
        if (responseText.trim().startsWith('{')) {
          try {
            const errorJson = JSON.parse(responseText);
            if (errorJson.errorCode || errorJson.error || errorJson.message) {
              errorMessage = `RDAP错误: ${errorJson.errorCode || ""} ${errorJson.error || errorJson.message || ""}`;
            }
          } catch (e) {
            // Not valid JSON
          }
        }
      } catch (e) {
        console.error("Failed to read RDAP error response:", e);
      }
      
      return {
        error: errorMessage,
        rawData: responseText || `状态码: ${response.status}`,
        domain,
        errorDetails: {
          apiError: true,
          statusCode: response.status
        }
      };
    }
    
    // Check for HTML content first
    const contentType = response.headers.get('content-type');
    const responseText = await response.text();
    
    if (responseText.trim().startsWith('<!DOCTYPE html>') || 
        responseText.trim().startsWith('<html') || 
        (contentType && contentType.includes('text/html'))) {
      console.log("RDAP API returned HTML instead of JSON");
      return { 
        domain,
        error: `RDAP API返回了HTML而非JSON数据，这可能是由于服务器配置问题或CORS限制`,
        rawData: responseText.substring(0, 500) + "... (response truncated)",
        errorDetails: {
          formatError: true,
          parseError: true,
          serverError: true
        }
      };
    }
    
    // Try to parse the JSON response
    let data;
    try {
      data = JSON.parse(responseText);
      console.log("RDAP data received successfully");
    } catch (jsonError) {
      console.error("Failed to parse RDAP JSON:", jsonError);
      return {
        domain,
        error: `RDAP响应解析错误: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`,
        rawData: responseText,
        errorDetails: {
          parseError: true
        }
      };
    }
    
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
          result.registrar = entity.vcardArray?.[1]?.find((arr: any[]) => arr[0] === 'fn')?.[3] || 
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
              } else if (entry[0] === 'adr') {
                try {
                  // Try to construct an address from the parts
                  const addressParts = entry[3] || [];
                  if (Array.isArray(addressParts) && addressParts.length > 0) {
                    registrant.address = addressParts.filter(Boolean).join(", ");
                  }
                } catch (e) {
                  console.warn("Error parsing RDAP address:", e);
                }
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
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.log("RDAP query timed out");
      return { 
        error: "RDAP查询超时", 
        rawData: "请求超时", 
        domain,
        errorDetails: {
          timeout: true
        }
      };
    }
    
    console.error(`RDAP error for ${domain}:`, error);
    
    // Provide more detailed network-related error information
    let errorMessage = "RDAP查询错误";
    const errorStr = String(error);
    
    if (error instanceof Error) {
      errorMessage += `: ${error.message}`;
      // Network errors like CORS or connection issues
      if (error.message === "Load failed" || 
          error.message.includes("NetworkError") ||
          error.message.includes("Failed to fetch") ||
          error.message.includes("CORS")) {
        errorMessage = `RDAP网络连接错误: 可能由于CORS策略限制或网络连接问题导致无法连接到RDAP服务器`;
        
        // Add suggestion for CORS issues
        if (error.message.includes("CORS")) {
          errorMessage += `\n建议: 尝试使用其他查询方式或通过代理服务器查询`;
        }
      }
      
      // Check for pattern matching errors
      if (errorStr.includes('expected pattern')) {
        errorMessage = `RDAP格式错误: 域名格式不符合RDAP服务器要求`;
      }
    }
    
    return {
      domain,
      error: errorMessage,
      source: 'rdap',
      rawData: errorStr,
      errorDetails: {
        network: errorStr.includes('fetch') || errorStr.includes('network'),
        cors: errorStr.includes('CORS') || errorStr.includes('origin'),
        patternError: errorStr.includes('expected pattern')
      }
    };
  }
}
