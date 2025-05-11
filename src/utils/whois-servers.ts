
// Local WHOIS servers configuration
export const whoisServers: Record<string, string> = {
  "com": "whois.verisign-grs.com",
  "net": "whois.verisign-grs.com",
  "org": "whois.pir.org",
  "cn": "whois.cnnic.cn",
  "io": "whois.nic.io",
  "info": "whois.afilias.net",
  "biz": "whois.neulevel.biz",
  "mobi": "whois.dotmobiregistry.net",
  "name": "whois.nic.name",
  "co": "whois.nic.co",
  "tv": "whois.nic.tv",
  "me": "whois.nic.me",
  "cc": "ccwhois.verisign-grs.com",
  "us": "whois.nic.us",
  "de": "whois.denic.de",
  "uk": "whois.nic.uk",
  "jp": "whois.jprs.jp",
  "fr": "whois.nic.fr",
  "au": "whois.auda.org.au",
  "ru": "whois.tcinet.ru",
  "ch": "whois.nic.ch",
  "es": "whois.nic.es",
  "ca": "whois.cira.ca",
  "in": "whois.registry.in",
  "nl": "whois.domain-registry.nl",
  "it": "whois.nic.it",
  "se": "whois.iis.se",
  "no": "whois.norid.no",
  "bb": "whois.nic.bb",
  "fi": "whois.fi",
  "dk": "whois.dk-hostmaster.dk",
  "pl": "whois.dns.pl",
  "be": "whois.dns.be",
  "br": "whois.registro.br",
  "eu": "whois.eu",
  "app": "whois.nic.google",
  "dev": "whois.nic.google",
  "top": "whois.nic.top",
  "xyz": "whois.nic.xyz",
  "online": "whois.nic.online",
  "site": "whois.nic.site",
  "club": "whois.nic.club",
  // Additional country code TLDs
  "rw": "whois.ricta.org.rw",
  "ge": "whois.nic.ge", // 注意: .ge 域名有特殊处理
  "kr": "whois.kr",
  "hk": "whois.hkirc.hk",
  "tw": "whois.twnic.net.tw",
  "sg": "whois.sgnic.sg",
  "my": "whois.mynic.my",
  "id": "whois.id",
  "th": "whois.thnic.co.th",
  "ph": "whois.dot.ph",
  "vn": "whois.vnnic.vn",
  "nz": "whois.srs.net.nz",
  "mx": "whois.mx",
  "ar": "whois.nic.ar",
  "cl": "whois.nic.cl",
  "za": "whois.registry.net.za",
  // 常用TLD
  "ai": "whois.nic.ai",
  "ac": "whois.nic.ac",
  "ag": "whois.nic.ag",
  "am": "whois.amnic.net",
  "as": "whois.nic.as",
  "at": "whois.nic.at",
  "cd": "whois.nic.cd",
  "cx": "whois.nic.cx",
  "cz": "whois.nic.cz",
  "digital": "whois.nic.digital",
  "email": "whois.nic.email",
  "fm": "whois.nic.fm",
  "gs": "whois.nic.gs",
  "hn": "whois.nic.hn",
  "hr": "whois.dns.hr",
  "hu": "whois.nic.hu",
  "ie": "whois.iedr.ie",
  "im": "whois.nic.im",
  "is": "whois.isnic.is",
  "kz": "whois.nic.kz",
  "la": "whois.nic.la",
  "lc": "whois.nic.lc",
  "li": "whois.nic.li",
  "live": "whois.nic.live",
  "lt": "whois.domreg.lt",
  "lu": "whois.dns.lu",
  "lv": "whois.nic.lv",
  "ly": "whois.nic.ly",
  "ma": "whois.registre.ma",
  "ms": "whois.nic.ms",
  "mu": "whois.nic.mu",
  "news": "whois.nic.news",
  "nu": "whois.nic.nu",
  "nyc": "whois.nic.nyc",
  "om": "whois.registry.om",
  "pe": "kero.yachay.pe",
  "pt": "whois.dns.pt",
  "pw": "whois.nic.pw",
  "ro": "whois.rotld.ro",
  "rs": "whois.rnids.rs",
  "sc": "whois.nic.sc",
  "sh": "whois.nic.sh",
  "si": "whois.register.si",
  "sk": "whois.sk-nic.sk",
  "sm": "whois.nic.sm",
  "so": "whois.nic.so",
  "st": "whois.nic.st",
  "su": "whois.tcinet.ru",
  "sx": "whois.sx",
  "tc": "whois.nic.tc",
  "tech": "whois.nic.tech",
  "tel": "whois.nic.tel",
  "tf": "whois.nic.tf",
  "tk": "whois.dot.tk",
  "tl": "whois.nic.tl",
  "tm": "whois.nic.tm",
  "to": "whois.tonic.to",
  "today": "whois.nic.today",
  "tr": "whois.nic.tr",
  "tz": "whois.tznic.or.tz",
  "ua": "whois.ua",
  "uy": "whois.nic.org.uy",
  "uz": "whois.cctld.uz",
  "vc": "whois.nic.vc",
  "ve": "whois.nic.ve",
  "vg": "whois.nic.vg",
  "website": "whois.nic.website",
  "wiki": "whois.nic.wiki",
  "ws": "whois.website.ws",
  "xn--p1ai": "whois.tcinet.ru",
  "xxx": "whois.nic.xxx"
};

// RDAP endpoints for different TLDs
export const rdapEndpoints: Record<string, string> = {
  "com": "https://rdap.verisign.com/com/v1/",
  "net": "https://rdap.verisign.com/net/v1/",
  "org": "https://rdap.publicinterestregistry.org/rdap/",
  "info": "https://rdap.afilias.net/rdap/",
  "biz": "https://rdap.bizregistry.net/rdap/",
  "io": "https://rdap.nic.io/",
  "app": "https://rdap.nominet.uk/app/",
  "dev": "https://rdap.nominet.uk/dev/",
  "xyz": "https://rdap.centralnic.com/xyz/",
  "online": "https://rdap.centralnic.com/online/",
  "site": "https://rdap.centralnic.com/site/",
  "club": "https://rdap.nic.club/"
};

// Central RDAP bootstrap service
export const rdapBootstrap = "https://rdap.org/domain/";

// Special TLD handlers configuration
export const specialTlds: string[] = ["ge", "cn", "jp", "kr"];

// TLD categories for better organization and handling
export const tldCategories: Record<string, string[]> = {
  "common": ["com", "net", "org", "info", "biz", "io"],
  "country": ["cn", "de", "uk", "fr", "jp", "ru", "au", "ca", "br", "es", "it", "nl"],
  "new": ["app", "dev", "top", "xyz", "online", "site", "club", "digital", "email"],
  "special": ["ge", "kr", "jp", "cn", "ru"] // These have unique handling requirements
};

/**
 * Check if a TLD is supported for WHOIS queries
 */
export function isSupportedTld(tld: string): boolean {
  return tld in whoisServers;
}

/**
 * Check if a TLD supports RDAP protocol
 */
export function isRdapSupported(tld: string): boolean {
  return tld in rdapEndpoints || tld === "com" || tld === "net";
}

/**
 * Check if a TLD requires special handling
 */
export function isSpecialTld(tld: string): boolean {
  return specialTlds.includes(tld);
}
