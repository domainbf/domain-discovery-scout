
// Domain lookup utilities to optimize search and caching
import { WhoisResult, queryWhois } from '@/api/whoisService';
import { whoisServers } from '@/utils/whois-servers';

// Simple in-memory cache for domain results
const cache = new Map<string, { data: WhoisResult, timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes cache

/**
 * Optimized domain lookup with caching
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
  
  // Perform the query
  try {
    console.log(`Fetching fresh result for ${normalizedDomain}`);
    const result = await queryWhois(normalizedDomain);
    
    // 确保总是返回格式一致的结构
    const formattedResult: WhoisResult = {
      domain: normalizedDomain,
      ...result
    };
    
    // Cache the result even if it has errors (to prevent repeated failing requests)
    cache.set(normalizedDomain, {
      data: formattedResult,
      timestamp: Date.now()
    });
    
    return formattedResult;
  } catch (error) {
    console.error(`Error in domain lookup: ${error}`);
    // 返回一个标准的错误结构
    return {
      domain: normalizedDomain,
      error: `查询失败: ${error instanceof Error ? error.message : String(error)}`,
      rawData: String(error)
    };
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
  
  // Additional check: verify if the TLD is in our supported list
  const tld = domain.split('.').pop()?.toLowerCase();
  if (!tld) return false;
  
  // Check if we support this TLD in our whois servers list
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
