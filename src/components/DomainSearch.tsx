
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search } from "lucide-react";

interface DomainSearchProps {
  onSearch: (domain: string) => void;
  isLoading: boolean;
}

const DomainSearch: React.FC<DomainSearchProps> = ({ onSearch, isLoading }) => {
  const [domain, setDomain] = useState('');
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDomain(e.target.value);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    if (!domain) {
      setError('请输入域名');
      return;
    }
    if (!domainRegex.test(domain)) {
      setError('请输入有效的域名格式');
      return;
    }
    
    onSearch(domain);
  };

  return (
    <Card className="p-6 w-full max-w-3xl mx-auto shadow-lg bg-white">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">域名 WHOIS 查询</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-grow">
            <Input
              type="text"
              placeholder="输入域名，例如: google.com"
              value={domain}
              onChange={handleInputChange}
              className="pl-4 pr-10 py-2 w-full rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <Button 
            type="submit" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                查询中...
              </span>
            ) : (
              <span className="flex items-center">
                <Search className="mr-2 h-4 w-4" />
                查询
              </span>
            )}
          </Button>
        </div>
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      </form>
    </Card>
  );
};

export default DomainSearch;
