
import React from 'react';
import { Copy, Download } from 'lucide-react';

interface WhoisDataFooterProps {
  source?: string;
}

const WhoisDataFooter: React.FC<WhoisDataFooterProps> = ({ source = '未知' }) => {
  return (
    <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500 flex items-center justify-between">
      <div className="flex items-center">
        <span>数据来源: {source}</span>
      </div>
      <div className="flex items-center gap-4">
        <div>查询时间: {new Date().toLocaleString('zh-CN')}</div>
        <div className="flex items-center gap-3">
          <button className="p-1 hover:bg-gray-100 rounded transition-colors">
            <Copy size={16} className="text-gray-500" />
          </button>
          <button className="p-1 hover:bg-gray-100 rounded transition-colors">
            <Download size={16} className="text-gray-500" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhoisDataFooter;
