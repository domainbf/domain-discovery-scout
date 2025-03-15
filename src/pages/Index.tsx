
import React, { useState } from 'react';
import DomainSearch from '@/components/DomainSearch';
import WhoisResults from '@/components/WhoisResults';
import { queryWhois, WhoisResult } from '@/api/whoisService';
import { toast } from "@/components/ui/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [searchedDomain, setSearchedDomain] = useState('');
  const [whoisData, setWhoisData] = useState<WhoisResult | null>(null);

  const handleSearch = async (domain: string) => {
    setIsLoading(true);
    setSearchedDomain(domain);
    
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
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>浏览器环境限制</AlertTitle>
          <AlertDescription>
            由于浏览器安全限制，无法直接建立Socket连接到WHOIS服务器。要实现完整功能，您需要创建一个后端服务来处理Socket连接。目前显示的是模拟数据。
          </AlertDescription>
        </Alert>

        <DomainSearch onSearch={handleSearch} isLoading={isLoading} />
        
        {whoisData && <WhoisResults data={whoisData} domain={searchedDomain} />}
        
        <footer className="mt-16 text-center text-gray-500 text-sm">
          <p>域名查询系统 • 支持 .com .net .org .cn .io 等顶级域名</p>
          <p className="mt-1">注：完整实现需要后端服务来处理Socket连接</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
