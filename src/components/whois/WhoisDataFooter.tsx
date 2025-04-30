
import React, { useState } from 'react';
import { Copy, Download } from 'lucide-react';
import { toast } from "@/components/ui/use-toast";

interface WhoisDataFooterProps {
  source?: string;
  rawData?: string;
}

const WhoisDataFooter: React.FC<WhoisDataFooterProps> = ({ source = '未知', rawData = '' }) => {
  const [copied, setCopied] = useState(false);
  
  // 复制WHOIS数据
  const handleCopy = () => {
    if (rawData) {
      navigator.clipboard.writeText(rawData)
        .then(() => {
          setCopied(true);
          toast({
            title: "复制成功",
            description: "WHOIS数据已复制到剪贴板",
          });
          setTimeout(() => setCopied(false), 2000);
        })
        .catch((err) => {
          console.error('复制失败:', err);
          toast({
            title: "复制失败",
            description: "请手动复制数据",
            variant: "destructive",
          });
        });
    }
  };
  
  // 下载WHOIS数据
  const handleDownload = () => {
    if (rawData) {
      const blob = new Blob([rawData], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'whois-data.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "下载成功",
        description: "WHOIS数据已开始下载",
      });
    }
  };
  
  return (
    <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500 flex items-center justify-between">
      <div className="flex items-center">
        <span>数据来源: {source}</span>
      </div>
      <div className="flex items-center gap-4">
        <div>查询时间: {new Date().toLocaleString('zh-CN')}</div>
        <div className="flex items-center gap-3">
          <button 
            className="p-1 hover:bg-gray-100 rounded transition-colors" 
            onClick={handleCopy}
            title="复制WHOIS数据"
          >
            <Copy size={16} className={`${copied ? 'text-green-500' : 'text-gray-500'}`} />
          </button>
          <button 
            className="p-1 hover:bg-gray-100 rounded transition-colors" 
            onClick={handleDownload}
            title="下载WHOIS数据"
          >
            <Download size={16} className="text-gray-500" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhoisDataFooter;
