
// System status API to check health of all services

module.exports = async (req, res) => {
  // Set CORS and content type headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ status: 'ok' });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Only GET requests are supported' });
  }

  try {
    // Check domain-info API
    let domainInfoStatus = { status: 'unknown', latency: null };
    const domainInfoStart = Date.now();
    let domainInfoResponseText = null;
    
    try {
      const host = req.headers.host || 'localhost';
      const protocol = host.startsWith('localhost') ? 'http' : 'https';
      const domainInfoResponse = await fetch(`${protocol}://${host}/api/domain-info?domain=example.com`);
      
      try {
        // Get response as text for debugging
        domainInfoResponseText = await domainInfoResponse.text();
        
        // Try to parse as JSON if response looks like JSON
        if (domainInfoResponseText.trim().startsWith('{') || domainInfoResponseText.trim().startsWith('[')) {
          const responseJson = JSON.parse(domainInfoResponseText);
          domainInfoStatus = {
            status: domainInfoResponse.ok ? 'online' : 'error',
            latency: Date.now() - domainInfoStart,
            statusCode: domainInfoResponse.status,
            responseType: 'json'
          };
        } else {
          // Not valid JSON
          domainInfoStatus = {
            status: 'error',
            latency: Date.now() - domainInfoStart,
            statusCode: domainInfoResponse.status,
            responseType: 'text',
            responsePreview: domainInfoResponseText.substring(0, 100) + (domainInfoResponseText.length > 100 ? '...' : '')
          };
        }
      } catch (parseError) {
        // JSON parse error
        domainInfoStatus = {
          status: 'parse_error',
          latency: Date.now() - domainInfoStart,
          statusCode: domainInfoResponse.status,
          error: parseError.message,
          responseType: 'invalid',
          responsePreview: domainInfoResponseText ? 
            (domainInfoResponseText.substring(0, 100) + (domainInfoResponseText.length > 100 ? '...' : '')) : 
            'Empty response'
        };
      }
    } catch (error) {
      domainInfoStatus = {
        status: 'offline',
        latency: Date.now() - domainInfoStart,
        error: error.message
      };
    }

    // Check RDAP service
    let rdapStatus = { status: 'unknown', latency: null };
    const rdapStart = Date.now();
    try {
      const rdapResponse = await fetch('https://rdap.org/domain/example.com');
      rdapStatus = {
        status: rdapResponse.ok ? 'online' : 'error',
        latency: Date.now() - rdapStart,
        statusCode: rdapResponse.status
      };
    } catch (error) {
      rdapStatus = {
        status: 'offline',
        latency: Date.now() - rdapStart,
        error: error.message
      };
    }

    // Return overall system status
    return res.status(200).json({
      timestamp: new Date().toISOString(),
      version: '2.1.0',
      services: {
        domainInfo: domainInfoStatus,
        rdap: rdapStatus
      },
      overall: domainInfoStatus.status === 'online' || rdapStatus.status === 'online' ? 'operational' : 'degraded'
    });
  } catch (error) {
    console.error('Status check error:', error);
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      error: error.message,
      overall: 'error'
    });
  }
};
