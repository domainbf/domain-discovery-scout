
// Domain Info API - Core serverless function to handle domain lookups
const { getDomainInfo } = require('../lib/lookup');

module.exports = async (req, res) => {
  // Set CORS and content type headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ status: 'ok' });
  }

  // Only allow GET and POST requests
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Only GET and POST requests are supported' });
  }

  try {
    // Get domain from query parameter or request body
    const domain = (req.method === 'GET') 
      ? req.query.domain 
      : (req.body ? req.body.domain : null);
    
    // Get optional source parameter (rdap, whois, dns, all)
    const source = ((req.method === 'GET') ? req.query.source : (req.body ? req.body.source : null)) || 'all';

    if (!domain) {
      return res.status(400).json({ error: 'Domain parameter is required' });
    }

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return res.status(400).json({ error: 'Invalid domain format' });
    }

    console.log(`Processing domain info request for ${domain} using source: ${source}`);
    
    // Get domain info using our core lookup library
    const result = await getDomainInfo(domain, source);
    
    // Return the result
    return res.status(200).json(result);
  } catch (error) {
    console.error('Domain lookup error:', error);
    return res.status(500).json({
      error: `Lookup error: ${error.message}`,
      message: error.toString()
    });
  }
};
