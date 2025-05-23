
// Domain lookup utilities to optimize search and caching
import { WhoisResult, queryWhois } from '@/api/whoisService';
import { whoisServers } from '@/utils/whois-servers';

// Simple in-memory cache for domain results
const cache = new Map<string, { data: WhoisResult, timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes cache

/**
 * Optimized domain lookup with caching and error handling
 * @param domain Domain to lookup
 * @returns Promise with WhoisResult
 */
export async function lookupDomain(domain: string): Promise<WhoisResult> {
  // Normalize domain for consistent caching
  const normalizedDomain = domain.toLowerCase().trim();
  
  // Check cache first
  const cachedResult = cache.get(normalizedDomain);
  if (cachedResult && (Date.now() - cachedResult.timestamp) < CACHE_TTL) {
    console.log(`Using cached result for ${normalizedDomain}`);
    return cachedResult.data;
  }
  
  // Check if TLD is supported before making the request
  const tld = normalizedDomain.split('.').pop()?.toLowerCase();
  const isTldSupported = tld ? (tld in whoisServers) : false;
  
  // Perform the query
  try {
    console.log(`Fetching fresh result for ${normalizedDomain}`);
    const result = await queryWhois(normalizedDomain);
    
    // Add TLD support info to result
    const formattedResult: WhoisResult = {
      ...result,
      domain: normalizedDomain,
      tldSupported: isTldSupported
    };
    
    // Cache the result even if it has errors (to prevent repeated failing requests)
    cache.set(normalizedDomain, {
      data: formattedResult,
      timestamp: Date.now()
    });
    
    return formattedResult;
  } catch (error) {
    console.error(`Error in domain lookup: ${error}`);
    
    // Return a standard error structure
    const errorMsg = `查询失败: ${error instanceof Error ? error.message : String(error)}`;
    
    const errorResult: WhoisResult = {
      domain: normalizedDomain,
      error: errorMsg,
      rawData: String(error),
      tldSupported: isTldSupported,
      errorDetails: {
        network: true,
        cors: String(error).includes('CORS') || String(error).includes('cross-origin'),
        apiError: String(error).includes('500') || String(error).includes('API')
      },
      alternativeLinks: generateAlternativeLinks(normalizedDomain)
    };
    
    // Cache error result too to prevent hammering servers
    cache.set(normalizedDomain, {
      data: errorResult,
      timestamp: Date.now()
    });
    
    return errorResult;
  }
}

/**
 * Clear the domain lookup cache
 */
export function clearLookupCache(): void {
  cache.clear();
  console.log("Domain lookup cache cleared");
}

/**
 * Pre-validate domain format before actual lookup
 * @param domain Domain to validate
 * @returns boolean indicating if the domain format is valid
 */
export function isValidDomain(domain: string): boolean {
  // Support single-character domains and country-code TLDs
  // Format like: x.com, a.cn, t.io, etc.
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*(\.[a-zA-Z]{2,})+$/;
  const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  
  if (!domainRegex.test(domain) && !ipRegex.test(domain)) {
    return false;
  }
  
  // Just verify the domain format is valid
  return true;
}

/**
 * Check if the domain's TLD is directly supported by our WHOIS servers
 * @param domain Domain to check
 * @returns boolean indicating if the TLD is supported
 */
export function isSupportedTld(domain: string): boolean {
  const tld = domain.split('.').pop()?.toLowerCase() || "";
  return tld in whoisServers;
}

/**
 * Get formatted domain status display text
 * @param status Status code or array of status codes
 * @returns Formatted status text
 */
export function formatDomainStatus(status: string | string[]): string {
  if (!status) return '未知';
  
  if (Array.isArray(status)) {
    return status.length > 0 ? status[0] : '未知';
  }
  
  return status;
}

/**
 * Generate alternative links for domain lookup
 */
function generateAlternativeLinks(domain: string): Array<{name: string, url: string}> {
  return [
    {
      name: 'ICANN Lookup',
      url: `https://lookup.icann.org/en/lookup?q=${domain}&t=a`
    },
    {
      name: 'WhoisXmlApi',
      url: `https://www.whoisxmlapi.com/whois-lookup-result.php?domain=${domain}`
    },
    {
      name: 'DomainTools',
      url: `https://whois.domaintools.com/${domain}`
    },
    {
      name: 'Whois.com',
      url: `https://www.whois.com/whois/${domain}`
    }
  ];
}
