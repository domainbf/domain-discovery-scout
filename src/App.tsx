
import React, { useState } from 'react';
import { FaSearch, FaRegLightbulb, FaRegCopy, FaDownload } from 'react-icons/fa'; 
import { lookupDomain } from './utils/domainLookup';
import { ScrollArea } from './components/ui/scroll-area';
import DomainStatusTag from './components/whois/DomainStatusTag';
import { translateStatusCode } from './utils/domainStatusUtils';

const App = () => {
  const [domain, setDomain] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleLookup = async () => {
    setLoading(true);
    const lookupResult = await lookupDomain(domain);
    setResult(lookupResult);
    setLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('数据已复制到剪贴板');
  };

  const downloadData = () => {
    if (!result || !result.rawData) return;
    
    const blob = new Blob([result.rawData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${domain}-whois.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-indigo-50 flex flex-col">
      <div className="w-full max-w-2xl mx-auto px-4 py-8">
        {/* 顶部警告文字 */}
        <div className="flex items-center justify-center mb-6">
          <FaRegLightbulb className="mr-2 text-gray-500" />
          <p className="text-sm text-gray-500">
            我们不存储不记录所有查询内容
          </p>
        </div>

        {/* 搜索框部分 */}
        <h1 className="text-2xl font-bold mb-2 text-center text-gray-800 flex items-center justify-center">
          <FaSearch className="mr-2" />
          域名信息查询
        </h1>
        <p className="text-sm text-gray-500 mb-6 text-center">
          请在下方输入要查找的域名或IP等信息
        </p>

        <div className="flex mb-6">
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="example.com"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleLookup}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-r-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? '查询中...' : '➡️'}
          </button>
        </div>

        {/* 查询结果 - 使用ScrollArea确保内容可滚动 */}
        {result && (
          <ScrollArea className="h-[65vh] rounded-lg">
            <div className="bg-white rounded-lg shadow-md p-6 mb-4">
              <h2 className="text-lg font-medium text-gray-800 mb-4">查询结果</h2>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <strong className="text-gray-700 mr-2">域名:</strong> 
                  <span>{result.domain}</span>
                  
                  {/* Add domain age tag here */}
                  {result.creationDate && (
                    <div className="ml-2">
                      {/* Use the new domain age category component here */}
                      <DomainStatusTag status={result.creationDate || ''} />
                    </div>
                  )}
                </div>
                
                {result.status && Array.isArray(result.status) && result.status.length > 0 && (
                  <div>
                    <strong className="text-gray-700">状态:</strong>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {result.status.map((s: string, index: number) => (
                        <span 
                          key={index} 
                          className="inline-block bg-gray-100 px-2 py-1 rounded text-xs text-gray-700"
                        >
                          {translateStatusCode(s)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <strong className="text-gray-700">注册商:</strong> {result.registrar || '未知'}
                </div>
                
                <div>
                  <strong className="text-gray-700">注册日期:</strong> {result.creationDate || result.created || '未知'}
                </div>
                
                <div>
                  <strong className="text-gray-700">更新日期:</strong> {result.updatedDate || result.updated || '未知'}
                </div>
                
                <div>
                  <strong className="text-gray-700">到期日期:</strong> {result.expiryDate || result.expires || '未知'}
                </div>
                
                {/* 名称服务器 */}
                {result.nameservers && Array.isArray(result.nameservers) && result.nameservers.length > 0 && (
                  <div>
                    <strong className="text-gray-700">DNS:</strong>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {result.nameservers.map((dns: string, index: number) => (
                        <span 
                          key={index} 
                          className="inline-block bg-gray-100 px-2 py-1 rounded text-xs text-gray-700"
                        >
                          {dns}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <strong className="text-gray-700">DNSSEC:</strong> {result.dnssec ? '是' : '否'}
                </div>
              </div>
              
              {/* 原始数据 */}
              {result.rawData && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <details>
                    <summary className="cursor-pointer text-gray-600 font-medium mb-2">
                      查看原始WHOIS数据
                    </summary>
                    <pre className="bg-gray-50 p-4 rounded text-xs overflow-x-auto whitespace-pre-wrap">
                      {result.rawData}
                    </pre>
                    
                    <div className="flex justify-end mt-4 gap-2">
                      <button
                        onClick={() => copyToClipboard(result.rawData)}
                        className="flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        <FaRegCopy className="mr-1" />
                        复制
                      </button>
                      <button
                        onClick={downloadData}
                        className="flex items-center px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                      >
                        <FaDownload className="mr-1" />
                        下载
                      </button>
                    </div>
                  </details>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

export default App;
