import { whoisServers, rdapBootstrap } from '@/utils/whois-servers';

// Import the types from our library
export interface Contact {
  name?: string;
  org?: string;
  email?: string[];
  phone?: string[];
  address?: string;
  country?: string; // Added country property to fix the TypeScript error
}

export interface DNSData {
  a?: string[];
  mx?: Array<{ exchange: string, priority: number }>;
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
  source?: string; // Indicates the source of the query (RDAP or WHOIS)
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
    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
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
        rdapResult.source = "RDAP";
        return rdapResult;
      }
      console.warn(`RDAP lookup failed: ${rdapResult.error}`);
    } catch (error) {
      console.warn(`RDAP error: ${error}`);
    }

    // If RDAP fails, try direct WHOIS
    try {
      console.log("Falling back to WHOIS lookup...");
      const whoisResult = await queryDirectWhois(domain);
      whoisResult.source = "WHOIS";
      return whoisResult;
    } catch (error) {
      console.error("WHOIS lookup error:", error);
      return {
        error: `WHOIS lookup failed: ${error instanceof Error ? error.message : String(error)}`,
        rawData: String(error)
      };
    }
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
      headers: { 'Accept': 'application/json' },
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
      source: 'RDAP',
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

// Query direct WHOIS (fallback method)
async function queryDirectWhois(domain: string): Promise<WhoisResult> {
  const tld = domain.split('.').pop()?.toLowerCase() || "";
  const whoisServer = whoisServers[tld];

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
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
      cache: 'no-cache'
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const responseText = await response.text();
      return {
        error: `WHOIS请求失败: ${response.status}`,
        rawData: responseText
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { error: "WHOIS查询超时", rawData: "请求超时" };
    }

    throw error;
  }
}
