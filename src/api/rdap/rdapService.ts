
// RDAP Service - Handles RDAP protocol lookups
import { WhoisResult, Contact } from '../types/WhoisTypes';
import { rdapBootstrap, rdapEndpoints, isRdapSupported } from '@/utils/whois-servers';

/**
 * Query domain information using RDAP protocol
 * @param domain Domain to query
 * @returns Promise with WhoisResult
 */
export async function queryRdapInfo(domain: string): Promise<WhoisResult> {
  const tld = domain.split('.').pop()?.toLowerCase() || "";
  
  // Check if RDAP is supported for this TLD
  if (!isRdapSupported(tld)) {
    console.log(`RDAP not supported for .${tld} domain`);
    return {
      error: `RDAP协议不支持 .${tld} 域名`,
      domain
    };
  }
  
  // Use direct RDAP endpoint if available or fallback to bootstrap
  let rdapUrl = rdapBootstrap + encodeURIComponent(domain);
  
  // If we have a specific RDAP endpoint for this TLD, use it
  if (tld in rdapEndpoints) {
    rdapUrl = `${rdapEndpoints[tld]}domain/${encodeURIComponent(domain)}`;
  }
  
  console.log("Requesting RDAP info:", rdapUrl);
  
  // Set timeout to 15 seconds
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  
  try {
    console.log("RDAP fetch started...");
    
    // First try using fetch with no-cors to test connectivity
    try {
      const testResponse = await fetch(rdapUrl, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache'
      });
      console.log("RDAP server reachable");
    } catch (testError) {
      console.warn("RDAP server not reachable in no-cors mode:", testError);
      // Continue anyway as this was just a test
    }
    
    // Now do the actual request
    const response = await fetch(rdapUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Domain-Info-Tool/1.0'
      },
      signal: controller.signal,
      cache: 'no-cache'
    });
    
    clearTimeout(timeoutId);
    console.log("RDAP fetch completed with status:", response.status);
    
    if (!response.ok) {
      // Check if this was a 404 - domain might not exist
      if (response.status === 404) {
        return {
          domain,
          error: "域名未注册或RDAP服务器中无记录",
          source: 'rdap'
        };
      }
      
      // Try to get more detailed error information
      let errorMessage = `RDAP请求失败: ${response.status} - ${response.statusText}`;
      let responseText = "";
      
      try {
        responseText = await response.text();
        console.log("RDAP error response:", responseText.substring(0, 200));
        
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
        domain
      };
    }
    
    // Try to parse the JSON response
    let data;
    try {
      data = await response.json();
      console.log("RDAP data received successfully");
    } catch (jsonError) {
      console.error("Failed to parse RDAP JSON:", jsonError);
      return {
        domain,
        error: `RDAP响应解析错误: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`,
        rawData: await response.text()
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
      return { error: "RDAP查询超时", rawData: "请求超时", domain };
    }
    
    console.error(`RDAP error for ${domain}:`, error);
    
    // Provide more detailed network-related error information
    let errorMessage = "RDAP查询错误";
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
    }
    
    return {
      domain,
      error: errorMessage,
      source: 'rdap',
      rawData: String(error)
    };
  }
}
