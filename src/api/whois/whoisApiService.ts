
// WHOIS API Service - Handles WHOIS queries through API endpoints
import { WhoisResult } from '../types/WhoisTypes';
import { parseBasicWhoisText } from './whoisParser';
import { whoisServers } from '@/utils/whois-servers';

/**
 * Query domain information using the domain-info API
 */
export async function queryDomainInfoApi(domain: string): Promise<WhoisResult> {
  console.log(`Requesting domain-info API: /api/domain-info?domain=${domain}`);
  
  // 更宽松的域名正则表达式
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
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
  
  try {
    console.log("Starting domain-info API fetch...");
    const response = await fetch(`/api/domain-info?domain=${encodeURIComponent(domain)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Domain-Info-Tool/1.0'
      },
      cache: 'no-store'
    });
    
    console.log("domain-info API fetch completed with status:", response.status);
    
    if (!response.ok) {
      let errorText;
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = "无法读取错误响应";
      }
      
      console.log("domain-info API error response:", errorText);
      return { 
        domain,
        error: `API请求失败: ${response.status}${errorText ? ` - ${errorText}` : ''}`,
        rawData: errorText || `状态码: ${response.status}`,
        errorDetails: {
          apiError: true,
          statusCode: response.status
        }
      };
    }
    
    try {
      const contentType = response.headers.get('content-type');
      // 检查内容类型是否为HTML
      if (contentType && contentType.includes('text/html')) {
        const htmlText = await response.text();
        return { 
          domain,
          error: `API返回了HTML而非JSON数据`,
          rawData: htmlText.substring(0, 500) + "... (response truncated)",
          errorDetails: {
            formatError: true,
            parseError: true
          }
        };
      }
      
      const data = await response.json();
      return data;
    } catch (parseError) {
      console.error("Error parsing domain-info API response:", parseError);
      const errorText = await response.text();
      return {
        domain,
        error: `API响应解析错误: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        rawData: errorText.length > 500 ? errorText.substring(0, 500) + "... (response truncated)" : errorText,
        errorDetails: {
          parseError: true,
          formatError: errorText.includes('<!DOCTYPE html>') || errorText.includes('<html')
        }
      };
    }
  } catch (error) {
    console.error("Domain info API error:", error);
    // Check specifically for pattern matching errors
    const errorStr = String(error);
    if (errorStr.includes('expected pattern')) {
      return { 
        domain,
        error: `域名格式验证失败: "${domain}" 不符合API要求的格式`,
        rawData: errorStr,
        errorDetails: {
          formatError: true,
          patternError: true
        }
      };
    }
    
    return { 
      domain,
      error: `API请求错误: ${error instanceof Error ? error.message : String(error)}`,
      rawData: String(error),
      errorDetails: {
        network: errorStr.includes('fetch') || errorStr.includes('network'),
        cors: errorStr.includes('CORS') || errorStr.includes('origin')
      }
    };
  }
}

/**
 * Query domain information using direct WHOIS lookup
 */
export async function queryDirectWhois(domain: string): Promise<WhoisResult> {
  // 使用更宽松的域名验证正则表达式
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
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
  
  const tld = domain.split('.').pop()?.toLowerCase() || "";
  const server = whoisServers[tld];
  
  if (!server) {
    return {
      domain,
      error: `不支持的顶级域名: .${tld}`,
      rawData: `未找到 .${tld} 的WHOIS服务器配置`,
      errorDetails: {
        notSupported: true
      }
    };
  }
  
  console.log(`Trying direct WHOIS API with server ${server}...`);
  
  try {
    console.log("Starting direct WHOIS fetch...");
    const response = await fetch(`/api/whois?domain=${encodeURIComponent(domain)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Domain-Info-Tool/1.0'
      },
      cache: 'no-store' // Disable caching to avoid stale responses
    });
    
    console.log("Direct WHOIS fetch completed with status:", response.status);
    
    if (!response.ok) {
      let errorText;
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = "无法读取错误响应";
      }
      
      console.log("Direct WHOIS error response:", errorText);
      return { 
        domain,
        error: `WHOIS API请求失败: ${response.status}${errorText ? ` - ${errorText}` : ''}`,
        rawData: errorText || `状态码: ${response.status}`,
        errorDetails: {
          apiError: true,
          statusCode: response.status
        }
      };
    }
    
    try {
      const contentType = response.headers.get('content-type');
      // 检查内容类型是否为HTML
      if (contentType && contentType.includes('text/html')) {
        const htmlText = await response.text();
        console.log("WHOIS API returned HTML instead of JSON");
        return { 
          domain,
          error: `WHOIS API返回了HTML而非JSON数据`,
          rawData: htmlText.substring(0, 500) + "... (response truncated)",
          errorDetails: {
            formatError: true,
            parseError: true
          }
        };
      }
      
      const data = await response.json();
      return data;
    } catch (parseError) {
      console.error("Error parsing WHOIS response:", parseError);
      
      // Check for pattern matching errors
      const errorStr = String(parseError);
      if (errorStr.includes('expected pattern')) {
        const errorContent = await response.text();
        return {
          domain,
          error: `WHOIS响应解析错误: 域名格式不符合WHOIS服务器要求`,
          rawData: errorStr + "\n\n响应内容: " + errorContent.substring(0, 500),
          errorDetails: {
            formatError: true,
            patternError: true
          }
        };
      }
      
      return {
        domain,
        error: `WHOIS响应解析错误: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        rawData: String(parseError),
        errorDetails: {
          parseError: true
        }
      };
    }
  } catch (error) {
    console.error("Direct WHOIS error:", error);
    return { 
      domain,
      error: `WHOIS请求错误: ${error instanceof Error ? error.message : String(error)}`,
      rawData: String(error),
      errorDetails: {
        network: String(error).includes('fetch') || String(error).includes('network'),
        cors: String(error).includes('CORS') || String(error).includes('cross-origin'),
      }
    };
  }
}
