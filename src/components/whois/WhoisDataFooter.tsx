
import React from 'react';

interface WhoisDataFooterProps {
  source?: string;
}

const WhoisDataFooter: React.FC<WhoisDataFooterProps> = ({ source = '未知' }) => {
  return (
    <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400 flex items-center justify-between">
      <div>数据来源: {source}</div>
      <div>查询时间: {new Date().toLocaleString('zh-CN')}</div>
    </div>
  );
};

export default WhoisDataFooter;
