
import React, { useState } from 'react';
import DomainSearch from '@/components/DomainSearch';
import WhoisResults from '@/components/WhoisResults';
import { queryWhois, WhoisResult } from '@/api/whoisService';
import { toast } from "@/components/ui/use-toast";

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [searchedDomain, setSearchedDomain] = useState('');
  const [whoisData, setWhoisData] = useState<WhoisResult | null>(null);

  const handleSearch = async (domain: string) => {
    setIsLoading(true);
    setSearchedDomain(domain);
    setWhoisData(null); // Clear previous results
    
    try {
      console.log(`开始查询域名: ${domain}`);
      const result = await queryWhois(domain);
      
      setWhoisData(result);
      
      if (result.error) {
        console.error('查询返回错误:', result.error);
        toast({
          title: "查询失败",
          description: result.error,
          variant: "destructive",
        });
      } else {
        console.log(`成功获取域名 ${domain} 的WHOIS信息`);
        toast({
          title: "查询成功",
          description: `已获取 ${domain} 的信息`,
        });
      }
    } catch (error) {
      console.error("查询过程中发生错误:", error);
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
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-indigo-50 py-16 px-4">
      <div className="container mx-auto max-w-3xl">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            域名信息查询
          </h1>
          <p className="text-gray-500 text-md">快速查询、轻松获取完整域名信息</p>
        </header>

        <div className="relative z-10">
          <DomainSearch onSearch={handleSearch} isLoading={isLoading} />
        </div>
        
        <div className="mt-8">
          {whoisData && <WhoisResults data={whoisData} domain={searchedDomain} />}
        </div>
        
        <footer className="mt-16 text-center text-gray-400 text-xs">
          © {new Date().getFullYear()} WHOIS查询服务 | 适配 Vercel 部署
        </footer>
      </div>
    </div>
  );
};

export default Index;
