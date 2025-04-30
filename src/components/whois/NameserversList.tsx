
import React from 'react';
import { Server } from "lucide-react";

interface NameserversListProps {
  nameservers: string[];
}

const NameserversList: React.FC<NameserversListProps> = ({ nameservers }) => {
  if (!nameservers || nameservers.length === 0) return null;
  
  return (
    <div className="bg-gray-50/80 rounded-lg p-4">
      <div className="text-sm text-gray-500 mb-2 flex items-center">
        <Server className="h-4 w-4 mr-1 text-indigo-500" />
        域名服务器
      </div>
      <ul className="space-y-1">
        {nameservers.map((ns, index) => (
          <li key={index} className="text-gray-800 bg-white px-3 py-2 rounded text-sm border border-indigo-50">
            {ns}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NameserversList;
