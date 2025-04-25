
// WHOIS 查询服务 - 使用重构的查询系统

// Import the types from our library
export interface Contact {
  name?: string;
  org?: string;
  email?: string[];
  phone?: string[];
  address?: string;
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

// Support list of whois servers (synchronized with lib/lookup.js)
export const whoisServers: Record<string, string> = {
  "com": "whois.verisign-grs.com",
  "net": "whois.verisign-grs.com",
  "org": "whois.pir.org",
  "cn": "whois.cnnic.cn",
  "io": "whois.nic.io",
  "info": "whois.afilias.net",
  "biz": "whois.neulevel.biz",
  "mobi": "whois.dotmobiregistry.net",
  "name": "whois.nic.name",
  "co": "whois.nic.co",
  "tv": "whois.nic.tv",
  "me": "whois.nic.me",
  "cc": "ccwhois.verisign-grs.com",
  "us": "whois.nic.us",
  "de": "whois.denic.de",
  "uk": "whois.nic.uk",
  "jp": "whois.jprs.jp",
  "fr": "whois.nic.fr",
  "au": "whois.auda.org.au",
  "ru": "whois.tcinet.ru",
  "ch": "whois.nic.ch",
  "es": "whois.nic.es",
  "ca": "whois.cira.ca",
  "in": "whois.registry.in",
  "nl": "whois.domain-registry.nl",
  "it": "whois.nic.it",
  "se": "whois.iis.se",
  "no": "whois.norid.no",
  "bb": "whois.nic.bb",
  "fi": "whois.fi",
  "dk": "whois.dk-hostmaster.dk",
  "nz": "whois.irs.net.nz",
  "pl": "whois.dns.pl",
  "be": "whois.dns.be",
  "br": "whois.registro.br",
  "eu": "whois.eu"
};

/**
 * Query domain information using the unified domain-info API
 */
export async function queryWhois(domain: string): Promise<WhoisResult> {
  try {
    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return { error: "Invalid domain format" };
    }

    console.log(`Querying information for ${domain}...`);

    // First try the new domain-info API
    try {
      const result = await queryDomainInfoApi(domain);
      if (!result.error) {
        return convertToLegacyFormat(result);
      }
      console.warn(`domain-info API query failed: ${result.error}`);
      // If the primary API fails, try the fallback APIs
      return await queryFallbackApis(domain);
    } catch (error) {
      console.warn(`domain-info API error: ${error}`);
      // If the primary API errors, try the fallback APIs
      return await queryFallbackApis(domain);
    }
  } catch (error) {
    console.error("Domain lookup error:", error);
    return { 
      error: `Query error: ${error instanceof Error ? error.message : String(error)}`,
      rawData: String(error)
    };
  }
}

// Query the new unified domain-info API
async function queryDomainInfoApi(domain: string): Promise<WhoisResult> {
  // Use the new API endpoint
  const apiUrl = `/api/domain-info?domain=${encodeURIComponent(domain)}`;
  
  console.log("Requesting domain-info API:", apiUrl);
  
  // Set timeout to 20 seconds
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  
  try {
    // Call API
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
    
    // Check if response is valid
    if (!response.ok) {
      console.error(`domain-info API request failed: ${response.status} ${response.statusText}`);
      let errorText = "";
      
      try {
        // Try to get the response as text first
        errorText = await response.text();
        console.error("Error response:", errorText);
      } catch (e) {
        errorText = "Could not read response";
      }
      
      // Try to parse error response if it's JSON
      let parsedError = "";
      try {
        // Only attempt to parse if the text looks like JSON
        if (errorText.trim().startsWith('{') || errorText.trim().startsWith('[')) {
          const errorJson = JSON.parse(errorText);
          parsedError = errorJson.error || errorJson.message || errorText;
        } else {
          parsedError = errorText;
        }
      } catch (e) {
        parsedError = errorText;
      }
      
      return { 
        error: `API request failed: ${response.status}`,
        rawData: parsedError
      };
    }
    
    try {
      // Get response as text first
      const responseText = await response.text();
      
      // Debug log to check the response format
      console.debug(`Raw API response (first 200 chars): ${responseText.substring(0, 200)}...`);
      
      // Only try to parse if it looks like JSON
      if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
        const data = JSON.parse(responseText);
        
        // If API returned an error
        if (data.error) {
          console.error("domain-info API returned error:", data.error);
          return {
            error: data.error,
            rawData: data.message || data.rawData || "No error details"
          };
        }
        
        // Return API result directly
        return data;
      } else {
        // Not JSON, return as raw data
        return {
          error: "Invalid API response format (not JSON)",
          rawData: responseText
        };
      }
    } catch (error) {
      console.error("Failed to parse domain-info API response:", error);
      return { 
        error: `Failed to parse API response: ${error instanceof Error ? error.message : String(error)}`,
        rawData: String(error)
      };
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.error("domain-info API query timeout");
      return { 
        error: "Query timeout, trying fallback APIs",
        rawData: "Request timeout"
      };
    }
    
    console.error("domain-info API query error:", error);
    return { 
      error: `Query error: ${error instanceof Error ? error.message : String(error)}`,
      rawData: String(error)
    };
  }
}

// Try fallback APIs in sequence
async function queryFallbackApis(domain: string): Promise<WhoisResult> {
  console.log("Trying fallback APIs...");
  
  // First try the original whois API
  try {
    const result = await queryOriginalWhoisApi(domain);
    if (!result.error) {
      return result;
    }
    console.warn(`Original WHOIS API failed: ${result.error}`);
  } catch (error) {
    console.warn(`Original WHOIS API error: ${error}`);
  }
  
  // Then try the direct WHOIS API
  const tld = domain.split('.').pop()?.toLowerCase() || "";
  const whoisServer = whoisServers[tld];
  
  if (whoisServer) {
    try {
      console.log(`Trying direct WHOIS API with server ${whoisServer}...`);
      return await queryDirectWhoisApi(domain, whoisServer);
    } catch (error) {
      console.warn(`Direct WHOIS API error: ${error}`);
    }
  }
  
  // Finally try the RDAP fallback
  try {
    console.log("Trying RDAP fallback...");
    return await queryRdapFallback(domain);
  } catch (error) {
    console.error("All fallback attempts failed:", error);
    return {
      error: "All lookup methods failed",
      rawData: String(error)
    };
  }
}

// Original WHOIS API
async function queryOriginalWhoisApi(domain: string): Promise<WhoisResult> {
  const apiUrl = `/api/whois?domain=${encodeURIComponent(domain)}`;
  
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
      return {
        error: `Original WHOIS API request failed: ${response.status}`,
        rawData: await response.text()
      };
    }
    
    const data = await response.json();
    
    if (data.error) {
      return {
        error: data.error,
        rawData: data.message || "No error details"
      };
    }
    
    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { error: "Original WHOIS API timeout", rawData: "Request timeout" };
    }
    throw error;
  }
}

// Direct WHOIS API
async function queryDirectWhoisApi(domain: string, server: string): Promise<WhoisResult> {
  const apiUrl = `/api/whois-direct?domain=${encodeURIComponent(domain)}&server=${encodeURIComponent(server)}`;
  
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
      const responseText = await response.text();
      let errorMessage = "Direct WHOIS API request failed";
      
      try {
        // Try to parse as JSON to extract detailed error
        const errorData = JSON.parse(responseText);
        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (parseError) {
        // If can't parse JSON, use the text response
        if (responseText) errorMessage += `: ${responseText}`;
      }
      
      return {
        error: errorMessage,
        rawData: responseText
      };
    }
    
    const data = await response.json();
    
    if (data.error) {
      return {
        error: data.error,
        rawData: data.message || "No error details"
      };
    }
    
    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { error: "Direct WHOIS API timeout", rawData: "Request timeout" };
    }
    throw error;
  }
}

// RDAP fallback
async function queryRdapFallback(domain: string): Promise<WhoisResult> {
  try {
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
        error: `RDAP request failed: ${response.status}`,
        rawData: await response.text()
      };
    }
    
    const data = await response.json();
    
    // Parse RDAP response
    const result: WhoisResult = {
      domain,
      rawData: JSON.stringify(data, null, 2),
      source: 'rdap'
    };
    
    // Extract data from RDAP response
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
    
    if (data.status) {
      result.status = Array.isArray(data.status) ? data.status : [data.status];
    }
    
    if (data.nameservers) {
      result.nameservers = data.nameservers.map((ns: any) => ns.ldhName || ns);
    }
    
    return result;
  } catch (error) {
    console.error("RDAP fallback error:", error);
    throw error;
  }
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
