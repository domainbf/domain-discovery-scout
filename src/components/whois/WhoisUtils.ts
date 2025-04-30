
/**
 * Collection of utility functions for formatting WHOIS data
 */

export const formatDate = (dateString?: string) => {
  if (!dateString || dateString === "未知") return "未知";
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch (e) {
    return dateString;
  }
};

// Calculate domain age if creation date is available
export const getDomainAge = (dateString?: string) => {
  if (!dateString) return null;
  
  try {
    const creationDate = new Date(dateString);
    if (isNaN(creationDate.getTime())) return null;
    
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - creationDate.getTime());
    const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365));
    const diffMonths = Math.floor((diffTime % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));
    
    return `${diffYears} 年 ${diffMonths} 个月`;
  } catch (e) {
    return null;
  }
};

// Calculate expiry date remaining time
export const getExpiryRemaining = (dateString?: string) => {
  if (!dateString) return null;
  
  try {
    const expiryDate = new Date(dateString);
    if (isNaN(expiryDate.getTime())) return null;
    
    const today = new Date();
    
    // If already expired
    if (expiryDate < today) {
      const diffTime = Math.abs(today.getTime() - expiryDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return `已过期 ${diffDays} 天`;
    }
    
    // If not expired yet
    const diffTime = Math.abs(expiryDate.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 365) {
      const years = Math.floor(diffDays / 365);
      const days = diffDays % 365;
      return `剩余 ${years} 年 ${days} 天`;
    }
    
    return `剩余 ${diffDays} 天`;
  } catch (e) {
    return null;
  }
};
