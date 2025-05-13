
// Re-export from hooks
import { useToast, toast } from "@/hooks/use-toast";

// Add enhanced toast helpers for domain lookups
const domainToast = {
  success: (domain: string) => {
    toast({
      title: "查询成功",
      description: `已获取 ${domain} 的信息`,
    });
  },
  error: (message: string) => {
    toast({
      title: "查询失败",
      description: message,
      variant: "destructive",
    });
  },
  networkError: () => {
    toast({
      title: "网络错误",
      description: "无法连接到查询服务器，请检查您的网络连接",
      variant: "destructive",
    });
  },
  serverError: () => {
    toast({
      title: "服务器错误",
      description: "查询服务器暂时不可用，请稍后再试",
      variant: "destructive",
    });
  },
  formatError: () => {
    toast({
      title: "输入格式错误", 
      description: "请输入有效的域名格式",
      variant: "destructive",
    });
  },
  offlineError: () => {
    toast({
      title: "您当前处于离线状态",
      description: "无法连接到查询服务器，请检查您的网络连接",
      variant: "destructive",
    });
  },
  usingFallbackData: () => {
    toast({
      title: "使用缓存数据",
      description: "由于网络问题，将使用本地缓存的数据（可能不是最新）",
      variant: "warning",
    });
  },
  fallbackData: (domain: string) => {
    toast({
      title: "使用备用数据",
      description: `由于查询失败，显示的 ${domain} 信息可能不是最新`,
      variant: "warning",
    });
  },
  corsError: () => {
    toast({
      title: "CORS策略限制",
      description: "浏览器跨域策略阻止了查询请求，尝试使用其他查询方式",
      variant: "destructive",
    });
  }
};

export { useToast, toast, domainToast };
