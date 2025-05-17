
import React, { useState, useEffect } from 'react';
import DomainSearch from '@/components/DomainSearch';
import WhoisResults from '@/components/WhoisResults';
import { WhoisResult } from '@/api/whoisService';
import { toast, domainToast } from "@/components/ui/use-toast";
import { MegaphoneIcon, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { lookupDomain, isValidDomain, isWellKnownDomain, isSupportedTld } from '@/utils/domainLookup';
import DomainPricing from '@/components/domain/DomainPricing';
import { Alert, AlertDescription } from "@/components/ui/alert";

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [searchedDomain, setSearchedDomain] = useState('');
  const [whoisData, setWhoisData] = useState<WhoisResult | null>(null);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'unknown'>('unknown');

  // Monitor network status
  useEffect(() => {
    const updateNetworkStatus = () => {
      setNetworkStatus(navigator.onLine ? 'online' : 'offline');
    };

    // Set initial status
    updateNetworkStatus();

    // Add event listeners
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    // Clean up
    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
    };
  }, []);

  const handleSearch = async (domain: string) => {
    if (!domain || !domain.trim()) {
      domainToast.formatError();
      return;
    }

    // Pre-validate domain format to save API calls
    if (!isValidDomain(domain)) {
      domainToast.formatError();
      return;
    }
    
    // Check if TLD is supported
    const tldSupported = isSupportedTld(domain);
    
    if (!tldSupported) {
      // If TLD is not directly supported, show a warning toast but allow the search to continue
      // as we now attempt to use alternative methods
      toast({
        title: "注意：非直接支持的域名后缀",
        description: `该域名后缀不在我们直接支持的列表中，将尝试使用其他方式查询`,
        variant: "warning",
      });
    }

    // Check network status first
    if (networkStatus === 'offline') {
      domainToast.offlineError();
      
      // If it's a well-known domain, we can try to use fallback data
      if (isWellKnownDomain(domain)) {
        domainToast.usingFallbackData();
      } else {
        return; // Don't proceed with search if offline and no fallback
      }
    }

    setIsLoading(true);
    setSearchedDomain(domain);
    setWhoisData(null); // Clear previous results
    setSearchAttempted(true);
    
    try {
      console.log(`开始查询域名: ${domain}`);
      // Use our optimized domain lookup service
      const result = await lookupDomain(domain);
      
      setWhoisData(result);
      
      if (result.error) {
        console.error('查询返回错误:', result.error);
        
        // Show appropriate toast based on error type
        if (result.source === 'unsupported-tld') {
          toast({
            title: "不支持的域名后缀",
            description: `我们不直接支持查询该域名后缀，请使用官方WHOIS服务`,
            variant: "warning",
          });
        } else if (result.error.includes('网络') || result.error.includes('连接') || result.error.includes('CORS')) {
          domainToast.networkError();
        } else if (result.error.includes('服务器')) {
          domainToast.serverError();
        } else if (result.source === 'fallback-data') {
          domainToast.fallbackData(domain);
        } else {
          domainToast.error(result.error);
        }
      } else {
        console.log(`成功获取域名 ${domain} 的WHOIS信息`);
        domainToast.success(domain);
      }
    } catch (error) {
      console.error("查询过程中发生错误:", error);
      domainToast.error("无法完成域名查询，请稍后再试");
      setWhoisData({ 
        domain,
        error: `查询处理错误: ${error instanceof Error ? error.message : String(error)}`,
        rawData: String(error)
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-indigo-50 py-16 px-4">
      <div className="container mx-auto max-w-3xl">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            域名信息查询
          </h1>
          <p className="text-gray-500 text-md">请在下方输入要查找的域名或IP等信息</p>
        </header>

        {/* 隐私提示 */}
        <div className="bg-white/80 backdrop-blur-md rounded-lg p-3 mb-6 border border-gray-100 flex items-center shadow-sm">
          <MegaphoneIcon size={18} className="text-gray-500 mr-2 flex-shrink-0" />
          <p className="text-sm text-gray-600">我们不存储不记录所有查询内容</p>
        </div>

        {/* 网络状态提示 */}
        {networkStatus === 'offline' && (
          <Alert variant="destructive" className="mb-4 animate-pulse">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center">
              <WifiOff size={16} className="mr-2" />
              您当前处于离线状态，无法进行网络查询。某些知名域名将使用缓存数据显示。
            </AlertDescription>
          </Alert>
        )}

        <div className="relative z-10">
          <DomainSearch onSearch={handleSearch} isLoading={isLoading} />
        </div>
        
        {/* 域名价格信息 - 在搜索框下方，查询结果上方 */}
        {searchedDomain && (
          <DomainPricing domain={searchedDomain} />
        )}
        
        <div className="mt-4">
          {whoisData && <WhoisResults data={whoisData} domain={searchedDomain} />}
          
          {/* 当搜索已尝试但数据为null时显示的提示 */}
          {searchAttempted && !whoisData && !isLoading && (
            <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4 mt-4">
              <p className="text-yellow-800">正在尝试获取域名信息，但尚未成功。请稍后重试。</p>
            </div>
          )}
        </div>
        
        <footer className="mt-16 text-center text-gray-400 text-xs">
          © {new Date().getFullYear()} WHOIS查询服务 | 适配 Vercel 部署
        </footer>
      </div>
    </div>
  );
};

export default Index;
