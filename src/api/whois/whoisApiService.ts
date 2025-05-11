
// WHOIS API Service - Handles API calls to the WHOIS service
import { WhoisResult } from '../types/WhoisTypes';
import { whoisServers, specialTlds } from '@/utils/whois-servers';
import { parseBasicWhoisText } from './whoisParser';

/**
 * Query the domain-info API (backup method)
 */
export async function queryDomainInfoApi(domain: string): Promise<WhoisResult> {
  const apiUrl = `/api/domain-info?domain=${encodeURIComponent(domain)}`;
  
  console.log("Requesting domain-info API:", apiUrl);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  
  try {
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
    
    if (!response.ok) {
      let errorText = await response.text();
      
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
        rawData: errorText
      };
    }
    
    // Get response content type to check if it's JSON
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const responseText = await response.text();
    
    // Check for HTML content first
    if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html')) {
      return {
        error: "API返回了HTML而非JSON响应",
        rawData: responseText.substring(0, 500) + "... (response trimmed)"
      };
    }
    
    // Only try to parse if it's JSON content or looks like JSON
    if (isJson || (responseText.trim().startsWith('{') || responseText.trim().startsWith('['))) {
      try {
        const data = JSON.parse(responseText);
        
        // If API returned an error
        if (data.error) {
          return {
            error: data.error,
            rawData: data.message || data.rawData || "无错误详情"
          };
        }
        
        // Return API result directly
        return data;
      } catch (parseError) {
        return { 
          error: `无法解析API响应JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
          rawData: responseText
        };
      }
    } else {
      // Handle non-JSON responses
      return {
        error: "API响应格式无效(非JSON)",
        rawData: responseText.length > 500 ? 
          responseText.substring(0, 500) + "... (response trimmed)" : 
          responseText
      };
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { error: "API查询超时", rawData: "请求超时" };
    }
    
    throw error;
  }
}

/**
 * Query direct WHOIS server via API
 */
export async function queryDirectWhois(domain: string): Promise<WhoisResult> {
  const tld = domain.split('.').pop()?.toLowerCase() || "";
  
  // Check if this is a special TLD that needs custom handling
  if (specialTlds.includes(tld)) {
    console.log(`Special TLD handler for .${tld} domain: ${domain}`);
    if (tld === "ge") {
      return {
        domain: domain,
        registrar: "Georgian Domain Name Registry",
        source: "special-handler",
        status: ["registryLocked"],
        nameservers: ["使用官方网站查询"],
        created: "请访问官方网站查询",
        updated: "请访问官方网站查询",
        expires: "请访问官方网站查询",
        rawData: `格鲁吉亚域名管理机构不提供标准WHOIS查询接口，请访问 https://registration.ge/ 查询 ${domain} 的信息。`
      };
    }
  }
  
  const whoisServer = whoisServers[tld as keyof typeof whoisServers];
  
  if (!whoisServer) {
    return { 
      error: `不支持的顶级域名: .${tld}`,
      rawData: `No WHOIS server defined for .${tld}`
    };
  }
  
  const apiUrl = `/api/whois?domain=${encodeURIComponent(domain)}`;
  
  console.log(`Trying direct WHOIS API with server ${whoisServer}...`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // Increased timeout
  
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
      // Try to handle non-standard responses
      try {
        const responseText = await response.text();
        
        // Check content type
        const contentType = response.headers.get('content-type');
        const isJson = contentType && contentType.includes('application/json');
        
        // If response looks like HTML rather than JSON, it may be an API redirect or server error
        if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html')) {
          console.warn("Received HTML response instead of JSON, trying to extract error info");
          return {
            error: `WHOIS服务器 ${whoisServer} 响应格式错误或无法连接`,
            rawData: responseText.substring(0, 500) + "... (response trimmed)" 
          };
        }
        
        // Try to parse JSON response if it looks like JSON
        if (isJson || responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
          try {
            const errorJson = JSON.parse(responseText);
            return {
              error: errorJson.error || `请求失败: ${response.status}`,
              rawData: errorJson.message || errorJson.rawData || responseText
            };
          } catch (e) {
            // Parse failed, use original response text
          }
        }
        
        return {
          error: `直接WHOIS API请求失败: ${response.status}`,
          rawData: responseText.length > 500 ? 
            responseText.substring(0, 500) + "... (response trimmed)" : 
            responseText
        };
      } catch (parseError) {
        return {
          error: `解析API响应失败: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
          rawData: `原始HTTP状态: ${response.status}`
        };
      }
    }
    
    // Get content type to check if it's JSON
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const responseText = await response.text();
    
    // Check for HTML content first - most important check!
    if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html')) {
      return {
        error: "API返回了HTML而非JSON响应",
        rawData: responseText.substring(0, 500) + "... (response trimmed)"
      };
    }
    
    // Try to parse as JSON if it's JSON content or looks like JSON
    if (isJson || (responseText.trim().startsWith('{') || responseText.trim().startsWith('['))) {
      try {
        const data = JSON.parse(responseText);
        
        if (data.error) {
          return {
            error: data.error,
            rawData: data.message || "无错误详情"
          };
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
        return {
          error: "无法解析服务器响应",
          rawData: responseText.length > 500 ? 
            responseText.substring(0, 500) + "... (response trimmed)" : 
            responseText
        };
      }
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { error: "WHOIS API超时", rawData: "请求超时" };
    }
    throw error;
  }
}
