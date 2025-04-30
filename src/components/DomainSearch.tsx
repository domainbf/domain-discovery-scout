
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Search, X } from "lucide-react";

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
    <div className="rounded-2xl bg-white/80 backdrop-blur-md shadow-xl border border-white/20 overflow-hidden p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-grow">
            <Input
              type="text"
              placeholder="输入域名，例如: example.com"
              value={domain}
              onChange={handleInputChange}
              className="pl-4 pr-10 py-6 w-full rounded-lg border border-indigo-100 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 shadow-sm text-lg"
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
            className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white px-8 py-6 rounded-lg transition-all duration-300 text-lg shadow-md font-medium"
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
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm flex items-start">
            <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </form>
    </div>
  );
};

export default DomainSearch;
