
import React, { useState, useEffect } from 'react';
import DomainSearch from '@/components/DomainSearch';
import WhoisResults from '@/components/WhoisResults';
import { queryWhois, WhoisResult, whoisServers } from '@/api/whoisService';
import { fallbackQueryWhois } from '@/api/fallbackWhoisService';
import { toast } from "@/components/ui/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon, AlertTriangle, HelpCircle, CheckCircle, Search, Server, Activity } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [searchedDomain, setSearchedDomain] = useState('');
  const [whoisData, setWhoisData] = useState<WhoisResult | null>(null);
  const [hasError, setHasError] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);
  const [apiErrorDetails, setApiErrorDetails] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [showSystemInfo, setShowSystemInfo] = useState(false);

  // Get the list of supported TLDs
  const supportedTLDs = Object.keys(whoisServers).sort();
  
  // Check local API server status
  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        // Try connecting to the local API health check endpoint
        const response = await fetch('/api/health', { 
          method: 'GET',
          cache: 'no-cache'
        });
        
        setServerStatus(response.ok ? 'online' : 'offline');
      } catch (error) {
        console.warn('本地API服务器可能离线:', error);
        setServerStatus('offline');
      }
    };

    checkServerStatus();
    // Check server status every 30 seconds
    const intervalId = setInterval(checkServerStatus, 30000);
    
    return () => clearInterval(intervalId);
  }, []);

  const handleSearch = async (domain: string) => {
    setIsLoading(true);
    setSearchedDomain(domain);
    setWhoisData(null); // Clear previous results
    setHasError(false);
    setUsedFallback(false);
    setApiErrorDetails(null);
    
    try {
      console.log(`开始查询域名: ${domain}`);
      // Query using direct WHOIS server API
      const result = await queryWhois(domain);
      
      setWhoisData(result);
      
      if (result.error) {
        setHasError(true);
        console.error('查询返回错误:', result.error);
        toast({
          title: "查询失败",
          description: result.error,
          variant: "destructive",
        });
        
        // If main API returns error, try using fallback API but don't show toast
        console.log("主API返回错误，切换到备用API...", result.error);
        
        // Record previous error details
        setApiErrorDetails(result.error);
        
        const fallbackResult = await fallbackQueryWhois(domain);
        setUsedFallback(true);
        
        if (!fallbackResult.error) {
          setWhoisData(fallbackResult);
          console.log(`成功使用备用API获取域名 ${domain} 的WHOIS信息`);
          // Don't show a toast when using fallback API successfully
        }
      } else {
        console.log(`成功获取域名 ${domain} 的WHOIS信息`);
        toast({
          title: "查询成功",
          description: `已获取 ${domain} 的 WHOIS 信息`,
        });
      }
    } catch (error) {
      console.error("查询过程中发生错误:", error);
      setHasError(true);
      toast({
        title: "查询错误",
        description: "无法完成域名查询，请稍后再试",
        variant: "destructive",
      });
      setWhoisData({ 
        error: `查询处理错误: ${error instanceof Error ? error.message : String(error)}`,
        rawData: String(error)
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-indigo-50 py-12 px-4">
      <div className="container mx-auto max-w-5xl">
        <header className="mb-10 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-indigo-900 mb-3">域名查询系统</h1>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            快速查询任何域名的详细信息，包括注册商、创建日期、过期日期等
          </p>
        </header>

        <DomainSearch onSearch={handleSearch} isLoading={isLoading} />
        
        {!whoisData && (
          <Card className="p-8 mt-8 bg-white/80 backdrop-blur shadow-xl border-none">
            <div className="flex flex-col items-center justify-center text-center py-6 gap-4">
              <Search className="w-16 h-16 text-indigo-300" strokeWidth={1.5} />
              <div>
                <h3 className="text-xl font-medium text-gray-800 mb-2">输入域名开始查询</h3>
                <p className="text-gray-600 max-w-md">
                  输入完整域名（如 example.com）进行查询，获取域名的注册信息、状态和DNS配置
                </p>
              </div>
              
              <div className="mt-4 flex flex-wrap justify-center gap-2 max-w-lg">
                {supportedTLDs.slice(0, 15).map(tld => (
                  <span key={tld} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs">
                    .{tld}
                  </span>
                ))}
                <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs">
                  +{supportedTLDs.length - 15} 种顶级域名
                </span>
              </div>
              
              <button
                onClick={() => setShowSystemInfo(!showSystemInfo)}
                className="mt-4 text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
              >
                <Server className="h-4 w-4 mr-1" />
                {showSystemInfo ? "隐藏系统信息" : "查看系统信息"}
              </button>
              
              {showSystemInfo && (
                <div className="mt-4 w-full max-w-md text-left p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">系统状态</span>
                    <Activity className="h-4 w-4 text-gray-500" />
                  </div>
                  <Separator className="my-2" />
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      {serverStatus === 'checking' && (
                        <span className="text-blue-600 flex items-center">
                          <InfoIcon className="h-4 w-4 mr-1 animate-pulse" />
                          正在检查API服务器状态...
                        </span>
                      )}
                      
                      {serverStatus === 'online' && (
                        <span className="text-green-600 flex items-center">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          主API服务器运行正常
                        </span>
                      )}
                      
                      {serverStatus === 'offline' && (
                        <span className="text-amber-600 flex items-center">
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          主API服务器可能离线，将使用备用服务
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-500">
                      系统使用多个API源查询域名信息，包括直连WHOIS服务器和RDAP协议。当主API不可用时，系统会自动切换到备用API。
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}
        
        {whoisData && <WhoisResults data={whoisData} domain={searchedDomain} />}
        
        <footer className="mt-16 text-center text-gray-500 text-sm">
          <p>域名查询系统 • 支持 {supportedTLDs.length} 种顶级域名</p>
          <p className="mt-1">© {new Date().getFullYear()} WHOIS查询服务</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
