// Domain lookup utilities to optimize search and caching
import { WhoisResult, queryWhois } from '@/api/whoisService';
import { whoisServers } from '@/utils/whois-servers';

// Simple in-memory cache for domain results
const cache = new Map<string, { data: WhoisResult, timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes cache

// Hard-coded fallback data for common domains when lookup fails
const fallbackData: Record<string, Partial<WhoisResult>> = {
  "google.com": {
    registrar: "MarkMonitor Inc.",
    created: "1997-09-15",
    expires: "2028-09-14",
    status: ["clientDeleteProhibited", "clientTransferProhibited", "clientUpdateProhibited"]
  },
  "facebook.com": {
    registrar: "RegistrarSafe, LLC",
    created: "1997-03-29",
    expires: "2028-03-30",
    status: ["clientDeleteProhibited", "clientTransferProhibited", "clientUpdateProhibited"]
  },
  "microsoft.com": {
    registrar: "MarkMonitor Inc.",
    created: "1991-05-02",
    expires: "2023-05-03",
    status: ["clientDeleteProhibited", "clientTransferProhibited", "clientUpdateProhibited"]
  },
  "hello.com": {
    registrar: "GoDaddy.com, LLC",
    created: "1995-01-28",
    updated: "2023-01-28",
    expires: "2024-01-28",
    status: ["clientDeleteProhibited", "clientTransferProhibited"],
    nameservers: ["ns1.hello.com", "ns2.hello.com"]
  }
};

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
    
    // Check if we got a meaningful error and if we have fallback data
    if (result.error && normalizedDomain in fallbackData) {
      console.log(`Using fallback data for ${normalizedDomain} due to lookup error: ${result.error}`);
      
      // Combine the error info with fallback data for transparency
      const fallbackResult: WhoisResult = {
        domain: normalizedDomain,
        ...fallbackData[normalizedDomain],
        error: `查询出错，使用缓存数据: ${result.error}`,
        source: 'fallback-data',
        rawData: `原始错误: ${result.error}\n\n使用预设的域名信息作为备用数据。这些信息可能不是最新的，仅供参考。`,
        tldSupported: isTldSupported,
        errorDetails: {
          ...(result.errorDetails || {}),
          network: result.error.includes('网络') || result.error.includes('connect'),
          cors: result.error.includes('CORS') || result.error.includes('跨域'),
          apiError: result.error.includes('API') || result.error.includes('500')
        }
      };
      
      // Add alternative links for lookup
      if (!fallbackResult.alternativeLinks) {
        fallbackResult.alternativeLinks = generateAlternativeLinks(normalizedDomain);
      }
      
      // Store in cache
      cache.set(normalizedDomain, {
        data: fallbackResult,
        timestamp: Date.now()
      });
      
      return fallbackResult;
    }
    
    // 确保总是返回格式一致的结构
    const formattedResult: WhoisResult = {
      domain: normalizedDomain,
      ...result,
      // 添加TLD支持信息，便于前端了解查询过程
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
    
    // 如果是不支持的TLD，返回更具体的错误消息
    if (!isTldSupported) {
      const unsupportedResult: WhoisResult = {
        domain: normalizedDomain,
        error: `不支持查询 .${tld} 域名, 请使用官方WHOIS服务`,
        source: 'unsupported-tld',
        rawData: `当前服务不支持查询 .${tld} 域名。请使用官方WHOIS查询服务或域名注册商提供的查询工具。`,
        tldSupported: false,
        errorDetails: {
          notSupported: true
        },
        alternativeLinks: generateAlternativeLinks(normalizedDomain)
      };
      
      cache.set(normalizedDomain, {
        data: unsupportedResult,
        timestamp: Date.now()
      });
      
      return unsupportedResult;
    }
    
    // Check if we have fallback data for common domains
    if (normalizedDomain in fallbackData) {
      console.log(`Using fallback data for ${normalizedDomain}`);
      
      const fallbackResult: WhoisResult = {
        domain: normalizedDomain,
        ...fallbackData[normalizedDomain],
        error: `查询失败，使用缓存数据: ${error instanceof Error ? error.message : String(error)}`,
        source: 'fallback-data',
        rawData: `原始错误: ${error}\n\n使用预设的域名信息作为备用数据。这些信息可能不是最新的，仅供参考。`,
        tldSupported: isTldSupported,
        errorDetails: {
          network: true, // Assume network error since all methods failed
          cors: String(error).includes('CORS')
        },
        alternativeLinks: generateAlternativeLinks(normalizedDomain)
      };
      
      // Store in cache
      cache.set(normalizedDomain, {
        data: fallbackResult,
        timestamp: Date.now()
      });
      
      return fallbackResult;
    }
    
    // 返回一个标准的错误结构
    const errorMsg = `查询失败: ${error instanceof Error ? error.message : String(error)}`;
    
    return {
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
  }
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
  
  // We don't check if TLD is supported anymore - we'll use alternative lookup methods
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
 * Check if a domain is likely to be a popular/well-known domain
 * Used to determine if we should use fallback data
 */
export function isWellKnownDomain(domain: string): boolean {
  const normalizedDomain = domain.toLowerCase().trim();
  return normalizedDomain in fallbackData;
}
