
// WHOIS API Service - Handles WHOIS queries through API endpoints
import { WhoisResult } from '../types/WhoisTypes';
import { parseBasicWhoisText } from './whoisParser';
import { whoisServers } from '@/utils/whois-servers';

/**
 * Query domain information using the domain-info API
 */
export async function queryDomainInfoApi(domain: string): Promise<WhoisResult> {
  console.log(`Requesting domain-info API: /api/domain-info?domain=${domain}`);
  
  try {
    console.log("Starting domain-info API fetch...");
    const response = await fetch(`/api/domain-info?domain=${domain}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Domain-Info-Tool/1.0'
      }
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
        rawData: errorText || `状态码: ${response.status}`
      };
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Domain info API error:", error);
    return { 
      domain,
      error: `API请求错误: ${error instanceof Error ? error.message : String(error)}`,
      rawData: String(error)
    };
  }
}

/**
 * Query domain information using direct WHOIS lookup
 */
export async function queryDirectWhois(domain: string): Promise<WhoisResult> {
  const tld = domain.split('.').pop()?.toLowerCase() || "";
  const server = whoisServers[tld];
  
  if (!server) {
    return {
      domain,
      error: `不支持的顶级域名: .${tld}`,
      rawData: `未找到 .${tld} 的WHOIS服务器配置`
    };
  }
  
  console.log(`Trying direct WHOIS API with server ${server}...`);
  
  try {
    console.log("Starting direct WHOIS fetch...");
    const response = await fetch(`/api/whois?domain=${domain}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Domain-Info-Tool/1.0'
      }
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
        rawData: errorText || `状态码: ${response.status}` 
      };
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Direct WHOIS error:", error);
    return { 
      domain,
      error: `WHOIS请求错误: ${error instanceof Error ? error.message : String(error)}`,
      rawData: String(error)
    };
  }
}
