
// WHOIS API Service - Handles API calls to the WHOIS service
import { WhoisResult, Contact } from '../types/WhoisTypes';
import { whoisServers, specialTlds, isSpecialTld } from '@/utils/whois-servers';
import { parseBasicWhoisText } from './whoisParser';

// Special TLD handling functions
const specialTldHandlers: Record<string, (domain: string) => WhoisResult> = {
  "ge": (domain) => {
    return {
      domain: domain,
      registrar: "Georgian Domain Name Registry",
      source: "special-handler",
      status: ["registryLocked"],
      nameservers: ["使用官方网站查询"],
      created: "请访问官方网站查询",
      updated: "请访问官方网站查询",
      expires: "请访问官方网站查询",
      error: `格鲁吉亚(.ge)域名需通过官方网站查询: https://registration.ge/`,
      rawData: `格鲁吉亚域名管理机构不提供标准WHOIS查询接口，请访问 https://registration.ge/ 查询 ${domain} 的信息。`
    };
  },
  "cn": (domain) => {
    // 中国域名需要特殊处理
    return {
      domain: domain,
      registrar: "中国互联网络信息中心CNNIC",
      source: "special-handler-cn",
      error: `查询中国域名(.cn)可能会受到限制，正在尝试通过标准WHOIS查询`,
      nameservers: ["请等待查询完成..."]
    };
  },
  "jp": (domain) => {
    return {
      domain: domain,
      registrar: "Japan Registry Services",
      source: "special-handler-jp",
      error: `日本域名(.jp)可能需要通过官方网站查询更多信息: https://jprs.jp/`,
      nameservers: ["正在尝试通过标准WHOIS查询..."]
    };
  }
};

/**
 * Query the domain-info API (backup method)
 */
export async function queryDomainInfoApi(domain: string): Promise<WhoisResult> {
  const tld = domain.split('.').pop()?.toLowerCase() || "";
  
  // 先检查是否需要特殊处理
  if (isSpecialTld(tld) && specialTldHandlers[tld]) {
    console.log(`使用特殊处理程序处理 .${tld} 域名: ${domain}`);
    // 返回特殊处理程序的初始结果
    const specialResult = specialTldHandlers[tld](domain);
    
    // 对于某些特殊TLD，我们仍然尝试标准查询作为备用
    if (tld === "cn" || tld === "jp") {
      console.log(`尝试为特殊TLD .${tld} 执行标准查询`);
      // 继续执行标准查询，如果失败返回特殊处理结果
    } else {
      // 对于完全不支持标准查询的TLD，直接返回特殊结果
      return specialResult;
    }
  }

  const apiUrl = `/api/domain-info?domain=${encodeURIComponent(domain)}`;
  
  console.log("Requesting domain-info API:", apiUrl);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  
  try {
    console.log("Starting domain-info API fetch...");
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Domain-Info-Tool/1.0'
      },
      signal: controller.signal,
      cache: 'no-cache'
    });
    
    clearTimeout(timeoutId);
    console.log("domain-info API fetch completed with status:", response.status);
    
    if (!response.ok) {
      let errorText = await response.text();
      console.log("domain-info API error response:", errorText.substring(0, 200));
      
      try {
        // Try to parse as JSON if it looks like JSON
        if (errorText.trim().startsWith('{') || errorText.trim().startsWith('[')) {
          const errorJson = JSON.parse(errorText);
          errorText = errorJson.error || errorJson.message || errorText;
        }
      } catch (e) {
        // If can't parse, use the text as is
      }
      
      return { 
        error: `API请求失败: ${response.status}`,
        rawData: errorText,
        domain
      };
    }
    
    // Get response content type to check if it's JSON
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const responseText = await response.text();
    console.log("domain-info API returned content type:", contentType);
    
    // Check for HTML content first
    if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html')) {
      console.log("domain-info API returned HTML instead of JSON");
      return {
        error: "API返回了HTML而非JSON响应",
        rawData: responseText.substring(0, 500) + "... (response trimmed)",
        domain
      };
    }
    
    // Only try to parse if it's JSON content or looks like JSON
    if (isJson || (responseText.trim().startsWith('{') || responseText.trim().startsWith('['))) {
      try {
        const data = JSON.parse(responseText);
        console.log("domain-info API successfully parsed JSON response");
        
        // If API returned an error
        if (data.error) {
          return {
            error: data.error,
            rawData: data.message || data.rawData || "无错误详情",
            domain
          };
        }
        
        // Ensure domain is set
        if (!data.domain) {
          data.domain = domain;
        }
        
        // Return API result directly
        return data;
      } catch (parseError) {
        console.error("Failed to parse domain-info API JSON:", parseError);
        return { 
          error: `无法解析API响应JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
          rawData: responseText,
          domain
        };
      }
    } else {
      // Handle non-JSON responses - try to parse as WHOIS text
      console.log("domain-info API returned non-JSON response, attempting to parse as WHOIS text");
      try {
        return parseBasicWhoisText(responseText, domain);
      } catch (parseError) {
        // If parsing fails, return error
        console.error("Failed to parse domain-info API response as WHOIS text:", parseError);
        return {
          error: "API响应格式无效(非JSON)",
          rawData: responseText.length > 500 ? 
            responseText.substring(0, 500) + "... (response trimmed)" : 
            responseText,
          domain
        };
      }
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.log("domain-info API query timed out");
      return { error: "API查询超时", rawData: "请求超时", domain };
    }
    
    console.error("domain-info API error:", error);
    throw error;
  }
}

/**
 * Query direct WHOIS server via API
 */
export async function queryDirectWhois(domain: string): Promise<WhoisResult> {
  const tld = domain.split('.').pop()?.toLowerCase() || "";
  
  // Check if this is a special TLD that needs custom handling
  if (isSpecialTld(tld) && specialTldHandlers[tld]) {
    console.log(`Special TLD handler for .${tld} domain: ${domain}`);
    return specialTldHandlers[tld](domain);
  }
  
  const whoisServer = whoisServers[tld];
  
  if (!whoisServer) {
    return { 
      error: `不支持的顶级域名: .${tld}`,
      rawData: `No WHOIS server defined for .${tld}`,
      domain
    };
  }
  
  const apiUrl = `/api/whois?domain=${encodeURIComponent(domain)}`;
  
  console.log(`Trying direct WHOIS API with server ${whoisServer}...`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // Increased timeout
  
  try {
    console.log("Starting direct WHOIS fetch...");
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Domain-Info-Tool/1.0'
      },
      signal: controller.signal,
      cache: 'no-cache'
    });
    
    clearTimeout(timeoutId);
    console.log("Direct WHOIS fetch completed with status:", response.status);
    
    if (!response.ok) {
      // Try to handle non-standard responses
      try {
        const responseText = await response.text();
        console.log("Direct WHOIS error response:", responseText.substring(0, 200));
        
        // Check content type
        const contentType = response.headers.get('content-type');
        const isJson = contentType && contentType.includes('application/json');
        
        // If response looks like HTML rather than JSON, it may be an API redirect or server error
        if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html')) {
          console.warn("Received HTML response instead of JSON from WHOIS API");
          return {
            error: `WHOIS服务器 ${whoisServer} 响应格式错误或无法连接`,
            rawData: responseText.substring(0, 500) + "... (response trimmed)",
            domain 
          };
        }
        
        // Try to parse JSON response if it looks like JSON
        if (isJson || responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
          try {
            const errorJson = JSON.parse(responseText);
            return {
              error: errorJson.error || `请求失败: ${response.status}`,
              rawData: errorJson.message || errorJson.rawData || responseText,
              domain
            };
          } catch (e) {
            // Parse failed, use original response text
            console.error("Failed to parse error JSON from WHOIS API:", e);
          }
        }
        
        return {
          error: `直接WHOIS API请求失败: ${response.status}`,
          rawData: responseText.length > 500 ? 
            responseText.substring(0, 500) + "... (response trimmed)" : 
            responseText,
          domain
        };
      } catch (parseError) {
        console.error("Failed to parse WHOIS API error response:", parseError);
        return {
          error: `解析API响应失败: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
          rawData: `原始HTTP状态: ${response.status}`,
          domain
        };
      }
    }
    
    // Get content type to check if it's JSON
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const responseText = await response.text();
    console.log("Direct WHOIS API returned content type:", contentType);
    
    // Check for HTML content first - most important check!
    if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html')) {
      console.log("Direct WHOIS API returned HTML instead of JSON");
      return {
        error: "API返回了HTML而非JSON响应",
        rawData: responseText.substring(0, 500) + "... (response trimmed)",
        domain
      };
    }
    
    // Try to parse as JSON if it's JSON content or looks like JSON
    if (isJson || (responseText.trim().startsWith('{') || responseText.trim().startsWith('['))) {
      try {
        const data = JSON.parse(responseText);
        console.log("Direct WHOIS API successfully parsed JSON response");
        
        if (data.error) {
          return {
            error: data.error,
            rawData: data.message || "无错误详情",
            domain
          };
        }
        
        // Ensure domain is set
        if (!data.domain) {
          data.domain = domain;
        }
        
        return data;
      } catch (jsonError) {
        // If JSON parsing fails, try to parse the raw WHOIS response
        console.warn(`JSON parsing failed: ${jsonError}. Attempting to parse raw WHOIS text.`);
        const parsedWhois = parseBasicWhoisText(responseText, domain);
        return parsedWhois;
      }
    } else {
      // If it's plain text, it might be a raw WHOIS result we can parse manually
      try {
        console.log("Received plain text response, attempting to parse WHOIS format");
        // Try to parse basic WHOIS info from plain text
        const parsedWhois = parseBasicWhoisText(responseText, domain);
        return parsedWhois;
      } catch (parseError) {
        console.error("Failed to parse WHOIS plain text:", parseError);
        return {
          error: "无法解析服务器响应",
          rawData: responseText.length > 500 ? 
            responseText.substring(0, 500) + "... (response trimmed)" : 
            responseText,
          domain
        };
      }
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.log("Direct WHOIS API query timed out");
      return { error: "WHOIS API超时", rawData: "请求超时", domain };
    }
    console.error("Direct WHOIS API error:", error);
    throw error;
  }
}
