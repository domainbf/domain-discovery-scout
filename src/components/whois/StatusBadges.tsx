
import React from 'react';
import { Shield } from "lucide-react";
import DomainStatusTag from './DomainStatusTag';
import { getDomainStatusHealth } from '@/utils/domainStatusUtils';

interface StatusBadgesProps {
  status: string | string[];
}

const StatusBadges: React.FC<StatusBadgesProps> = ({ status }) => {
  if (!status) return null;
  
  const statusArray = Array.isArray(status) ? status : [status];
  const { overall, icon: StatusIcon } = getDomainStatusHealth(statusArray);
  
  // Set the icon color based on overall status
  const iconColorClass = 
    overall === 'good' ? 'text-green-500' : 
    overall === 'bad' ? 'text-red-500' : 
    'text-amber-500';
  
  return (
    <div className="bg-gray-50/80 rounded-lg p-4">
      <div className="text-sm text-gray-500 mb-2 flex items-center">
        <StatusIcon className={`h-4 w-4 mr-1 ${iconColorClass}`} />
        域名状态
      </div>
      <div className="flex flex-wrap gap-2">
        {statusArray.map((status, index) => (
          <DomainStatusTag key={index} status={status} />
        ))}
      </div>
    </div>
  );
};

export default StatusBadges;
