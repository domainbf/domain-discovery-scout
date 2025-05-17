
import React from 'react';
import { Calendar } from "lucide-react";
import InfoPanel from './InfoPanel';
import { Badge } from "@/components/ui/badge";

interface DateInfoProps {
  created?: string;
  updated?: string;
  expires?: string;
  registrar?: string;
  label?: string;
  date?: string;
  additionalText?: string | null;
  additionalTextClass?: string;
}

const DateInfo: React.FC<DateInfoProps> = ({ 
  label,
  date,
  created,
  updated,
  expires,
  registrar,
  additionalText,
  additionalTextClass 
}) => {
  const icon = <Calendar className="h-4 w-4 mr-1 text-indigo-500" />;
  
  // Support both the new pattern and the old pattern
  if (created || updated || expires) {
    return (
      <div className="space-y-4 py-4">
        {created && (
          <InfoPanel
            icon={icon}
            label="注册日期"
            value={created}
          />
        )}
        {updated && (
          <InfoPanel
            icon={icon}
            label="更新日期"
            value={updated}
          />
        )}
        {expires && (
          <InfoPanel
            icon={icon}
            label="到期日期"
            value={expires}
          />
        )}
        {registrar && (
          <InfoPanel
            icon={<Calendar className="h-4 w-4 mr-1 text-blue-500" />}
            label="注册商"
            value={registrar}
          />
        )}
      </div>
    );
  }

  // Original implementation for backward compatibility
  // Display additionalText in a badge if it exists
  const additionalInfo = additionalText ? (
    <div className="mt-2">
      <Badge variant="outline" className={`${additionalTextClass || ''} border border-gray-200 font-normal`}>
        {additionalText}
      </Badge>
    </div>
  ) : null;

  return (
    <InfoPanel
      icon={icon}
      label={label || "日期"}
      value={date || "未知"}
      additionalInfo={additionalInfo}
    />
  );
};

export default DateInfo;
