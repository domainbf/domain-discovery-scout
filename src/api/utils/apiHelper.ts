
/**
 * API Helper utility to handle WHOIS and RDAP queries through a local proxy
 */

// Check if response contains HTML content with improved detection
export const isHtmlResponse = (content: string): boolean => {
  return content.trim().startsWith('<!DOCTYPE html>') || 
         content.trim().startsWith('<html') ||
         content.includes('<body') ||
         content.includes('<head') ||
         content.includes('<div') && content.includes('</div>') ||
         content.includes('<script') && content.includes('</script>');
};

// Parse response safely, ensuring JSON format with better error handling
export const safeParseResponse = async (response: Response): Promise<any> => {
  const contentType = response.headers.get('content-type');
  const responseText = await response.text();
  
  // Check if we got HTML instead of JSON
  if (isHtmlResponse(responseText) || (contentType && contentType.includes('text/html'))) {
    console.error('API returned HTML instead of expected JSON', responseText.substring(0, 200));
    throw new Error('API返回了HTML而非JSON数据');
  }
  
  // Check for empty or malformed response
  if (!responseText || responseText.trim() === '') {
    throw new Error('API返回了空响应');
  }
  
  try {
    // Try to parse the response as JSON
    return JSON.parse(responseText);
  } catch (e) {
    console.error('Failed to parse API response:', responseText.substring(0, 200));
    throw new Error(`解析响应失败: ${e instanceof Error ? e.message : String(e)}\n原始响应: ${responseText.substring(0, 200)}...`);
  }
};

// Make a fetch request with proper error handling and retry logic
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
    
    // Add retry logic for network errors
    let attempts = 0;
    const maxAttempts = 2;
    
    while (attempts < maxAttempts) {
      try {
        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);
        
        // Check if response is ok
        if (!response.ok) {
          console.warn(`API request failed with status: ${response.status} ${response.statusText}`);
          if (response.status === 429) {
            throw new Error('请求频率过高，请稍后再试');
          }
        }
        
        return response;
      } catch (fetchError) {
        attempts++;
        
        // If it's the last attempt, throw the error
        if (attempts >= maxAttempts) {
          throw fetchError;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log(`Retrying fetch, attempt ${attempts + 1} of ${maxAttempts}`);
      }
    }
    
    // This should never be reached, but TypeScript requires a return
    throw new Error('All fetch attempts failed');
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('请求超时，请稍后再试');
    }
    
    // Improve error messages
    if (error instanceof Error) {
      if (error.message.includes('networkerror') || error.message.includes('failed to fetch')) {
        throw new Error('网络连接错误，请检查您的网络连接');
      }
      
      if (error.message.includes('CORS')) {
        throw new Error('跨域请求被阻止，这可能是由于安全设置导致的');
      }
    }
    
    throw error;
  }
};

// Query our local API proxy for WHOIS data with improved error handling
export const queryLocalWhois = async (domain: string, type: string = 'whois'): Promise<any> => {
  try {
    console.log(`使用本地API代理查询${type === 'rdap' ? 'RDAP' : 'WHOIS'}: ${domain}`);
    
    // Use proxy API for better error handling
    const apiEndpoint = `/api/whois-query?domain=${encodeURIComponent(domain)}&type=${type}`;
    console.log(`Querying API endpoint: ${apiEndpoint}`);
    
    const response = await fetchWithTimeout(
      apiEndpoint,
      { 
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      },
      30000 // Increased timeout to 30 seconds
    );
    
    // Now handle the response with our improved parser
    const result = await safeParseResponse(response);
    
    // Check if the response contains valid data
    if (!result) {
      throw new Error(`API返回了无效的数据格式`);
    }
    
    // If we have an error in the result, propagate it
    if (result.error) {
      console.warn(`API returned error: ${result.error}`);
    }
    
    return result;
  } catch (error) {
    console.error(`本地API代理查询失败:`, error);
    throw error;
  }
};

// Query domain info through our proxy API with improved error handling
export const queryDomainInfoProxy = async (domain: string): Promise<any> => {
  try {
    console.log(`使用代理API查询域名信息: ${domain}`);
    
    const response = await fetchWithTimeout(
      `/api/domain-info?domain=${encodeURIComponent(domain)}&format=json`,
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      },
      30000 // Increased timeout
    );
    
    return await safeParseResponse(response);
  } catch (error) {
    console.error('代理API查询失败:', error);
    throw error;
  }
};

// Direct WHOIS query using the dedicated WHOIS endpoint
export const queryDirectWhois = async (domain: string): Promise<any> => {
  try {
    console.log(`使用直接WHOIS API查询: ${domain}`);
    
    const response = await fetchWithTimeout(
      `/api/whois-direct?domain=${encodeURIComponent(domain)}`,
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      },
      30000 // Increased timeout
    );
    
    return await safeParseResponse(response);
  } catch (error) {
    console.error('直接WHOIS查询失败:', error);
    throw error;
  }
};
