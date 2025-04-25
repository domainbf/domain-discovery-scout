
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, X } from "lucide-react";

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

  const handleClear = () => {
    setDomain('');
    setError('');
  };

  return (
    <Card className="p-8 shadow-xl bg-white/90 backdrop-blur rounded-xl border-none">
      <h2 className="text-2xl font-bold mb-6 text-center text-indigo-900">域名 WHOIS 查询</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <Input
              type="text"
              placeholder="输入域名，例如: google.com"
              value={domain}
              onChange={handleInputChange}
              className="pl-4 pr-10 py-6 w-full rounded-lg border border-indigo-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm text-lg"
              disabled={isLoading}
            />
            {domain && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={isLoading}
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          <Button 
            type="submit" 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-6 rounded-lg transition-colors text-lg shadow-md"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                查询中...
              </span>
            ) : (
              <span className="flex items-center">
                <Search className="mr-2 h-5 w-5" />
                查询
              </span>
            )}
          </Button>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm flex items-start">
            <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div className="text-sm text-gray-500 mt-4 text-center">
          输入完整域名（包含后缀，如 example.com）以查询详细WHOIS信息
        </div>
      </form>
    </Card>
  );
};

export default DomainSearch;
