
// WHOIS Parser - Parses raw WHOIS text responses
import { WhoisResult } from '../types/WhoisTypes';

/**
 * Simple function to parse basic WHOIS text when receiving non-JSON responses
 */
export function parseBasicWhoisText(text: string, domain: string): WhoisResult {
  const result: WhoisResult = {
    domain,
    source: 'direct-whois-text',
    rawData: text
  };
  
  if (!text || text.trim() === '') {
    result.error = "WHOIS服务器返回空响应";
    return result;
  }
  
  // Check if the response contains "No match" or similar phrases that indicate domain is not registered
  if (text.match(/no match|not found|no data found|not registered|no entries found/i)) {
    result.error = "域名未注册或无法找到记录";
    return result;
  }
  
  // Define regex patterns for different WHOIS data fields
  const patterns: Record<string, RegExp[]> = {
    registrar: [
      /Registrar:\s*(.*?)[\r\n]/i,
      /Sponsoring Registrar:\s*(.*?)[\r\n]/i,
      /注册商:\s*(.*?)[\r\n]/i
    ],
    created: [
      /Creation Date:\s*(.*?)[\r\n]/i, 
      /Created on:\s*(.*?)[\r\n]/i,
      /Registration Date:\s*(.*?)[\r\n]/i,
      /注册时间:\s*(.*?)[\r\n]/i,
      /Registry Creation Date:\s*(.*?)[\r\n]/i
    ],
    expires: [
      /Expir(?:y|ation) Date:\s*(.*?)[\r\n]/i,
      /Registry Expiry Date:\s*(.*?)[\r\n]/i,
      /Expiration Date:\s*(.*?)[\r\n]/i,
      /到期时间:\s*(.*?)[\r\n]/i
    ],
    updated: [
      /Updated Date:\s*(.*?)[\r\n]/i,
      /Last Modified:\s*(.*?)[\r\n]/i,
      /更新时间:\s*(.*?)[\r\n]/i,
      /Last update:\s*(.*?)[\r\n]/i,
      /Update Date:\s*(.*?)[\r\n]/i
    ]
  };
  
  // Process each pattern to extract information
  for (const [field, patternsList] of Object.entries(patterns)) {
    for (const pattern of patternsList) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].trim()) {
        (result as any)[field] = match[1].trim(); // Using type assertion
        // Also set legacy field names for backward compatibility
        if (field === 'created') result.creationDate = match[1].trim();
        if (field === 'expires') result.expiryDate = match[1].trim();
        if (field === 'updated') result.lastUpdated = match[1].trim();
        break;
      }
    }
  }
  
  // Extract nameservers
  const nameserverPatterns = [
    /Name Server:\s*(.*?)[\r\n]/ig,
    /Nameservers?:\s*(.*?)[\r\n]/ig,
    /域名服务器:\s*(.*?)[\r\n]/ig,
    /nserver:\s*(.*?)[\r\n]/ig
  ];
  
  const nameservers: string[] = [];
  for (const pattern of nameserverPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1] && match[1].trim()) {
        nameservers.push(match[1].trim());
      }
    }
  }
  
  if (nameservers.length > 0) {
    result.nameservers = nameservers;
  }
  
  // Extract status
  const statusPatterns = [
    /Status:\s*(.*?)[\r\n]/ig,
    /Domain Status:\s*(.*?)[\r\n]/ig,
    /状态:\s*(.*?)[\r\n]/ig
  ];
  
  const statuses: string[] = [];
  for (const pattern of statusPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1] && match[1].trim()) {
        statuses.push(match[1].trim());
      }
    }
  }
  
  if (statuses.length > 0) {
    result.status = statuses;
  }
  
  // 如果什么都没提取到但有原始数据，则设置基本信息
  if (!result.registrar && !result.created && !result.expires && !result.nameservers && text.length > 0) {
    // 至少显示一些基本信息
    result.source = 'raw-whois';
    result.domain = domain;
  }
  
  return result;
}

/**
 * Convert the new domain-info API format to the legacy WhoisResult format for backward compatibility
 */
export function convertToLegacyFormat(info: WhoisResult): WhoisResult {
  return {
    ...info,
    creationDate: info.created,
    expiryDate: info.expires,
    lastUpdated: info.updated,
    registrantEmail: info.registrant?.email?.[0],
    registrantPhone: info.registrant?.phone?.[0]
  };
}
