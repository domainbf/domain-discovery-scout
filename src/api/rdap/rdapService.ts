
// RDAP Service - Handles RDAP protocol lookups
import { WhoisResult, Contact } from '../types/WhoisTypes';
import { rdapBootstrap } from '@/utils/whois-servers';

/**
 * Query domain information using RDAP protocol
 * @param domain Domain to query
 * @returns Promise with WhoisResult
 */
export async function queryRdapInfo(domain: string): Promise<WhoisResult> {
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
