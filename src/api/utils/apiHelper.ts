
/**
 * API Helper utility to handle WHOIS and RDAP queries through a local proxy
 */

// Check if response contains HTML content
export const isHtmlResponse = (content: string): boolean => {
  return content.trim().startsWith('<!DOCTYPE html>') || 
         content.trim().startsWith('<html') ||
         content.includes('<body') ||
         content.includes('<head');
};

// Parse response safely, ensuring JSON format
export const safeParseResponse = async (response: Response): Promise<any> => {
  const contentType = response.headers.get('content-type');
  const responseText = await response.text();
  
  if (isHtmlResponse(responseText) || (contentType && contentType.includes('text/html'))) {
    throw new Error('API返回了HTML而非JSON数据');
  }
  
  try {
    return JSON.parse(responseText);
  } catch (e) {
    throw new Error(`解析响应失败: ${e instanceof Error ? e.message : String(e)}\n原始响应: ${responseText.substring(0, 200)}...`);
  }
};

// Make a fetch request with proper error handling
export const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = 15000): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const fetchOptions = {
      ...options,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Domain-Info-Tool/1.0',
        ...(options.headers || {})
      },
      cache: 'no-store' as RequestCache
    };
    
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);
    
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('请求超时，请稍后再试');
    }
    throw error;
  }
};

// Query our local API proxy for WHOIS data
export const queryLocalWhois = async (domain: string, type: string = 'whois'): Promise<any> => {
  try {
    console.log(`使用本地API代理查询${type === 'rdap' ? 'RDAP' : 'WHOIS'}: ${domain}`);
    
    const response = await fetchWithTimeout(
      `/api/whois-query?domain=${encodeURIComponent(domain)}&type=${type}`,
      { 
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API请求失败: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
    }
    
    return await safeParseResponse(response);
  } catch (error) {
    console.error(`本地API代理查询失败:`, error);
    throw error;
  }
};

// Query domain info through our proxy API
export const queryDomainInfoProxy = async (domain: string): Promise<any> => {
  try {
    console.log(`使用代理API查询域名信息: ${domain}`);
    
    const response = await fetchWithTimeout(`/api/domain-info?domain=${encodeURIComponent(domain)}&format=json`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API请求失败: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
    }
    
    return await safeParseResponse(response);
  } catch (error) {
    console.error('代理API查询失败:', error);
    throw error;
  }
};
