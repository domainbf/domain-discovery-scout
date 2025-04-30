
import React from 'react';
import { Globe } from "lucide-react";

interface DomainHeaderProps {
  domain: string;
}

const DomainHeader: React.FC<DomainHeaderProps> = ({ domain }) => {
  return (
    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-white/10 backdrop-blur-sm"></div>
      <div className="flex items-center relative z-10">
        <Globe className="h-6 w-6 text-white mr-3" strokeWidth={1.5} />
        <h3 className="text-xl font-bold text-white">{domain}</h3>
      </div>
    </div>
  );
};

export default DomainHeader;
