import { whoisServers } from '@/utils/whois-servers';
import net from 'net';

export interface WhoisResult {
  domain?: string;
  registrar?: string;
  nameservers?: string[];
  dnssec?: boolean;
  status?: string[];
  created?: string;
  updated?: string;
  expires?: string;
  source?: string; // Indicates the source of the query (RDAP or local WHOIS)
  error?: string;
  rawData?: string;
}

/**
 * Query domain information using prioritized lookup sources
 */
export async function queryWhois(domain: string): Promise<WhoisResult> {
  const tld = domain.split('.').pop()?.toLowerCase() || "";

  if (!tld) {
    return { error: "Invalid domain format: TLD not detected" };
  }

  console.log(`Starting WHOIS/RDAP query for domain: ${domain}, TLD: ${tld}`);

  // Check if TLD is supported for RDAP
  const isRdapSupported = !!whoisServers[tld]?.rdap;
  if (isRdapSupported) {
    console.log("RDAP is supported for this TLD. Attempting RDAP query...");
    try {
      const rdapResult = await queryRdap(domain);
      if (!rdapResult.error) {
        rdapResult.source = 'RDAP';
        return rdapResult;
      }
      console.warn(`RDAP query failed: ${rdapResult.error}`);
    } catch (error) {
      console.error(`RDAP query error for domain (${domain}):`, error);
    }
  } else {
    console.log(`RDAP is not supported for TLD: ${tld}. Proceeding to local WHOIS.`);
  }

  // Query local WHOIS server
  return queryLocalWhois(domain, tld);
}

/**
 * Query RDAP service.
 */
async function queryRdap(domain: string): Promise<WhoisResult> {
  const tld = domain.split('.').pop()?.toLowerCase() || "";
  const rdapUrl = whoisServers[tld]?.rdap;

  if (!rdapUrl) {
    return { error: `RDAP URL not configured for TLD: ${tld}` };
  }

  console.log(`RDAP query: ${rdapUrl}${encodeURIComponent(domain)}`);

  try {
    const response = await fetch(`${rdapUrl}${encodeURIComponent(domain)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return { error: `RDAP request failed with status: ${response.status}` };
    }

    const data = await response.json();
    return {
      domain,
      rawData: JSON.stringify(data, null, 2),
    };
  } catch (error) {
    return { error: `RDAP query error: ${error.message}` };
  }
}

/**
 * Query local WHOIS server using socket connection.
 */
function queryLocalWhois(domain: string, tld: string): Promise<WhoisResult> {
  const whoisServer = whoisServers[tld]?.whois;
  if (!whoisServer) {
    return Promise.resolve({
      error: `No WHOIS server configured for TLD: .${tld}`,
    });
  }

  console.log(`Attempting local WHOIS query: domain=${domain}, server=${whoisServer}`);

  return new Promise((resolve, reject) => {
    const client = net.createConnection({ port: 43, host: whoisServer }, () => {
      console.log(`Connected to WHOIS server: ${whoisServer}`);
      client.write(`${domain}\r\n`);
    });

    let rawData = '';
    client.on('data', (chunk) => {
      rawData += chunk.toString();
    });

    client.on('end', () => {
      console.log(`WHOIS query completed for domain: ${domain}`);
      resolve({ domain, rawData, source: 'Local WHOIS' });
    });

    client.on('error', (error) => {
      console.error(`WHOIS query error for domain (${domain}):`, error);
      reject({ error: `WHOIS query failed: ${error.message}` });
    });

    client.setTimeout(10000, () => {
      client.destroy();
      reject({ error: 'WHOIS query timed out' });
    });
  });
}
