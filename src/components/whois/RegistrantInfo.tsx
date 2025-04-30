
import React from 'react';
import { User } from "lucide-react";
import { Contact } from '@/api/whoisService';
import InfoPanel from './InfoPanel';

interface RegistrantInfoProps {
  registrant: Contact;
}

const RegistrantInfo: React.FC<RegistrantInfoProps> = ({ registrant }) => {
  if (!registrant || (!registrant.name && !registrant.org)) return null;
  
  const icon = <User className="h-4 w-4 mr-1 text-indigo-500" />;
  const additionalInfo = registrant.address ? (
    <div className="text-sm text-gray-600 mt-1">
      {registrant.address}
    </div>
  ) : null;

  return (
    <InfoPanel
      icon={icon}
      label="注册人"
      value={registrant.name || registrant.org || "未知"}
      additionalInfo={additionalInfo}
    />
  );
};

export default RegistrantInfo;
