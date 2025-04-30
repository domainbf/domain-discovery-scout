
import React from 'react';
import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface StatusBadgesProps {
  status: string | string[];
}

const StatusBadges: React.FC<StatusBadgesProps> = ({ status }) => {
  if (!status) return null;
  
  const statusArray = Array.isArray(status) ? status : [status];
  
  return (
    <div className="bg-gray-50/80 rounded-lg p-4">
      <div className="text-sm text-gray-500 mb-2 flex items-center">
        <Shield className="h-4 w-4 mr-1 text-indigo-500" />
        域名状态
      </div>
      <div className="flex flex-wrap gap-2">
        {statusArray.map((status, index) => (
          <Badge key={index} variant="outline" className="bg-white text-gray-700 border-indigo-100">
            {status}
          </Badge>
        ))}
      </div>
    </div>
  );
};

export default StatusBadges;
