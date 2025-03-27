
import React, { useState } from 'react';
import DomainSearch from '@/components/DomainSearch';
import WhoisResults from '@/components/WhoisResults';
import { queryWhois, WhoisResult, whoisServers } from '@/api/whoisService';
import { fallbackQueryWhois } from '@/api/fallbackWhoisService';
import { toast } from "@/components/ui/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon, Globe, Server, AlertTriangle, HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [searchedDomain, setSearchedDomain] = useState('');
  const [whoisData, setWhoisData] = useState<WhoisResult | null>(null);
  const [hasError, setHasError] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);
  const [apiErrorDetails, setApiErrorDetails] = useState<string | null>(null);

  // 获取当前支持的顶级域名列表
  const supportedTLDs = Object.keys(whoisServers).sort();

  const handleSearch = async (domain: string) => {
    setIsLoading(true);
    setSearchedDomain(domain);
    setWhoisData(null); // 清除之前的结果
    setHasError(false);
    setUsedFallback(false);
    setApiErrorDetails(null);
    
    try {
      console.log(`开始查询域名: ${domain}`);
      // 使用直连WHOIS服务器的API进行查询
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
        
        // 如果主API返回错误，尝试使用备用API
        console.log("主API返回错误，切换到备用API...", result.error);
        toast({
          title: "切换到备用API",
          description: "主API无法使用，正在使用备用服务...",
        });
        
        // 记录之前的错误详情
        setApiErrorDetails(result.error);
        
        const fallbackResult = await fallbackQueryWhois(domain);
        setUsedFallback(true);
        
        if (!fallbackResult.error) {
          setWhoisData(fallbackResult);
          console.log(`成功使用备用API获取域名 ${domain} 的WHOIS信息`);
          toast({
            title: "通过备用服务查询成功",
            description: `已获取 ${domain} 的 WHOIS 信息`,
          });
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100 py-10 px-4">
      <div className="container mx-auto">
        <header className="mb-10 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">域名查询系统</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            查询任何域名的WHOIS信息，包括注册商、创建日期、过期日期和域名状态
          </p>
        </header>

        <Alert className="mb-6 max-w-3xl mx-auto">
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>关于本服务</AlertTitle>
          <AlertDescription>
            <p>本系统使用后端服务器通过Socket连接到官方WHOIS服务器获取真实数据。支持多种顶级域名，包括.com、.net、.org、.cn等。</p>
            <div className="mt-2 flex items-center text-sm text-gray-600">
              <Server className="h-4 w-4 mr-1" />
              <span>数据来源：直连WHOIS官方服务器，确保数据真实可靠</span>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="ml-2 inline-flex items-center cursor-help">
                    <HelpCircle className="h-4 w-4 text-blue-500" />
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-md p-4">
                  <p className="font-medium">如何添加新的顶级域名支持？</p>
                  <p className="mt-1 text-sm">在源代码的 <code>whoisService.ts</code> 文件中的 <code>whoisServers</code> 对象中添加新的顶级域名和对应的WHOIS服务器地址。</p>
                  <p className="mt-2 text-sm">例如: <code>"bb": "whois.nic.bb"</code></p>
                </TooltipContent>
              </Tooltip>
            </div>
            
            <div className="mt-2 flex flex-wrap gap-1 text-xs text-gray-500">
              <span>当前支持的顶级域名: </span>
              {supportedTLDs.map(tld => (
                <span key={tld} className="px-1.5 py-0.5 bg-gray-100 rounded">
                  .{tld}
                </span>
              ))}
            </div>
            
            {usedFallback && (
              <div className="mt-2 flex items-center text-sm text-amber-600">
                <AlertTriangle className="h-4 w-4 mr-1" />
                <span>注意：当前使用备用API提供查询服务</span>
              </div>
            )}
            {apiErrorDetails && (
              <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                <p className="font-medium">主API错误详情:</p>
                <p className="font-mono text-xs break-all">{apiErrorDetails}</p>
              </div>
            )}
          </AlertDescription>
        </Alert>

        <DomainSearch onSearch={handleSearch} isLoading={isLoading} />
        
        {whoisData && <WhoisResults data={whoisData} domain={searchedDomain} />}
        
        <footer className="mt-16 text-center text-gray-500 text-sm">
          <p>域名查询系统 • 支持 {supportedTLDs.map(tld => `.${tld}`).join(' ')} 等多种顶级域名</p>
          <p className="mt-1">© {new Date().getFullYear()} WHOIS查询服务</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
