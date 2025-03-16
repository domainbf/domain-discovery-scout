
import React, { useState } from 'react';
import DomainSearch from '@/components/DomainSearch';
import WhoisResults from '@/components/WhoisResults';
import { queryWhois, WhoisResult } from '@/api/whoisService';
import { toast } from "@/components/ui/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon, Globe, Server } from 'lucide-react';

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [searchedDomain, setSearchedDomain] = useState('');
  const [whoisData, setWhoisData] = useState<WhoisResult | null>(null);

  const handleSearch = async (domain: string) => {
    setIsLoading(true);
    setSearchedDomain(domain);
    setWhoisData(null); // 清除之前的结果
    
    try {
      const result = await queryWhois(domain);
      setWhoisData(result);
      
      if (result.error) {
        toast({
          title: "查询失败",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "查询成功",
          description: `已获取 ${domain} 的 WHOIS 信息`,
        });
      }
    } catch (error) {
      console.error("Error during WHOIS query:", error);
      toast({
        title: "查询错误",
        description: "无法完成域名查询，请稍后再试",
        variant: "destructive",
      });
      setWhoisData({ error: "查询处理错误，请稍后再试" });
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
            </div>
          </AlertDescription>
        </Alert>

        <DomainSearch onSearch={handleSearch} isLoading={isLoading} />
        
        {whoisData && <WhoisResults data={whoisData} domain={searchedDomain} />}
        
        <footer className="mt-16 text-center text-gray-500 text-sm">
          <p>域名查询系统 • 支持 .com .net .org .cn .io 等多种顶级域名</p>
          <p className="mt-1">© {new Date().getFullYear()} WHOIS查询服务</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
