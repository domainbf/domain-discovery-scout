
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
      
      const responseText = await response.text();
      console.log("RDAP error response:", responseText.substring(0, 200));
      
      return {
        error: `RDAP请求失败: ${response.status}`,
        rawData: responseText,
        domain
      };
    }
    
    const data = await response.json();
    console.log("RDAP data received successfully");
    
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
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.log("RDAP query timed out");
      return { error: "RDAP查询超时", rawData: "请求超时", domain };
    }
    
    console.error(`RDAP error for ${domain}:`, error);
    return {
      domain,
      error: `RDAP查询错误: ${error instanceof Error ? error.message : String(error)}`,
      source: 'rdap'
    };
  }
}
