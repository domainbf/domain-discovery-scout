
import React from 'react';
import { User, Building2, MailQuestion, Phone } from "lucide-react";
import { Contact } from '@/api/types/WhoisTypes';
import InfoPanel from './InfoPanel';

interface RegistrantInfoProps {
  registrant: Contact;
  admin?: Contact;
  tech?: Contact;
  abuse?: Contact;
}

const RegistrantInfo: React.FC<RegistrantInfoProps> = ({ registrant, admin, tech, abuse }) => {
  if (!registrant && !admin && !tech && !abuse) return null;
  
  return (
    <div className="my-4 space-y-4">
      {registrant && (registrant.name || registrant.org) && (
        <InfoPanel
          icon={<User className="h-4 w-4 mr-1 text-indigo-500" />}
          label="注册人"
          value={registrant.name || registrant.org || "未知"}
          additionalInfo={registrant.address ? (
            <div className="text-sm text-gray-600 mt-1">
              {registrant.address}
              {registrant.country && <span className="ml-2">({registrant.country})</span>}
            </div>
          ) : null}
        />
      )}

      {admin && (admin.name || admin.org) && (
        <InfoPanel
          icon={<Building2 className="h-4 w-4 mr-1 text-blue-500" />}
          label="管理联系人"
          value={admin.name || admin.org || "未知"}
          additionalInfo={admin.email && admin.email.length > 0 ? (
            <div className="text-sm text-gray-600 mt-1">
              <span className="flex items-center">
                <MailQuestion className="h-3 w-3 mr-1" />
                {admin.email[0]}
              </span>
            </div>
          ) : null}
        />
      )}

      {tech && (tech.name || tech.org) && (
        <InfoPanel
          icon={<Building2 className="h-4 w-4 mr-1 text-green-500" />}
          label="技术联系人"
          value={tech.name || tech.org || "未知"}
          additionalInfo={tech.email && tech.email.length > 0 ? (
            <div className="text-sm text-gray-600 mt-1">
              <span className="flex items-center">
                <MailQuestion className="h-3 w-3 mr-1" />
                {tech.email[0]}
              </span>
            </div>
          ) : null}
        />
      )}

      {abuse && (abuse.name || abuse.org || abuse.email) && (
        <InfoPanel
          icon={<Phone className="h-4 w-4 mr-1 text-red-500" />}
          label="滥用联系人"
          value={abuse.name || abuse.org || abuse.email?.[0] || "未知"}
          additionalInfo={abuse.email && abuse.email.length > 0 ? (
            <div className="text-sm text-gray-600 mt-1">
              <span className="flex items-center">
                <MailQuestion className="h-3 w-3 mr-1" />
                {abuse.email[0]}
              </span>
            </div>
          ) : null}
        />
      )}
    </div>
  );
};

export default RegistrantInfo;
