
import { Check, X, Star, CalendarCheck, Info, Clock } from "lucide-react";

// Status code translations to Chinese
export const translateStatusCode = (status: string): string => {
  const statusMap: Record<string, string> = {
    // Common domain statuses
    'clientTransferProhibited': '注册商禁止转移',
    'serverTransferProhibited': '服务器禁止转移',
    'clientDeleteProhibited': '禁止删除',
    'clientUpdateProhibited': '禁止更新',
    'clientRenewProhibited': '禁止续费',
    'clientHold': '注册商冻结',
    'serverHold': '服务器冻结',
    'inactive': '未激活',
    'ok': '正常',
    'active': '活跃',
    'pending': '待处理',
    'redemptionPeriod': '赎回期',
    'pendingDelete': '待删除',
    'autoRenewPeriod': '自动续费期',
    'addPeriod': '新增期',
    'renewPeriod': '续费期',
    'transferPeriod': '转移期',
  };
  
  // Normalize status code by converting to lowercase and removing spaces
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '');
  
  for (const [key, value] of Object.entries(statusMap)) {
    if (normalizedStatus.includes(key.toLowerCase())) {
      return value;
    }
  }
  
  return status; // Return original if no translation found
};

// Determine domain age category based on creation date
export const getDomainAgeCategory = (creationDate?: string, expiryDate?: string): {
  tag: string;
  icon: any;
  color: string;
} => {
  if (!creationDate) {
    return { tag: '未知注册时间', icon: Info, color: 'text-gray-500' };
  }
  
  try {
    const created = new Date(creationDate);
    const now = new Date();
    const diffYears = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 365);
    
    // Check if the domain has been renewed
    let isRenewed = false;
    if (expiryDate) {
      const expiry = new Date(expiryDate);
      const registrationYears = (expiry.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 365);
      if (registrationYears > 2) {
        isRenewed = true;
      }
    }
    
    if (diffYears < 0.1) {
      return { tag: '新注册', icon: Star, color: 'text-pink-500' };
    } else if (diffYears <= 1) {
      return { tag: '1年域名', icon: Clock, color: 'text-blue-500' };
    } else if (diffYears <= 5) {
      return { tag: '5年域名', icon: Clock, color: 'text-indigo-600' };
    } else if (diffYears > 10 && isRenewed) {
      return { tag: '已续费10年', icon: Star, color: 'text-amber-500' };
    } else if (diffYears > 10) {
      return { tag: '10年老米', icon: Star, color: 'text-purple-600' };
    } else {
      return { 
        tag: `${Math.floor(diffYears)}年域名`, 
        icon: Clock, 
        color: 'text-green-600' 
      };
    }
  } catch (e) {
    return { tag: '未知注册时间', icon: Info, color: 'text-gray-500' };
  }
};

// Determine domain status health
export const getDomainStatusHealth = (statuses: string[]): {
  overall: 'good' | 'warning' | 'bad';
  icon: any;
} => {
  const normalizedStatuses = statuses.map(s => s.toLowerCase());
  
  // Check for bad statuses
  const badKeywords = ['hold', 'delete', 'prohibited', 'inactive', 'redemption', 'pending'];
  const hasBadStatus = normalizedStatuses.some(status => 
    badKeywords.some(keyword => status.includes(keyword))
  );
  
  // Check for good status
  const goodKeywords = ['ok', 'active'];
  const hasGoodStatus = normalizedStatuses.some(status => 
    goodKeywords.some(keyword => status.includes(keyword))
  );
  
  if (hasBadStatus) {
    return { overall: 'bad', icon: X };
  } else if (hasGoodStatus) {
    return { overall: 'good', icon: Check };
  } else {
    return { overall: 'warning', icon: Info };
  }
};
