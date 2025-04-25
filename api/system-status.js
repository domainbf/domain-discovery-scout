
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
    try {
      const domainInfoResponse = await fetch(`${req.headers.host.startsWith('localhost') ? 'http' : 'https'}://${req.headers.host}/api/domain-info?domain=example.com`);
      domainInfoStatus = {
        status: domainInfoResponse.ok ? 'online' : 'error',
        latency: Date.now() - domainInfoStart,
        statusCode: domainInfoResponse.status
      };
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
      version: '2.0.0',
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
