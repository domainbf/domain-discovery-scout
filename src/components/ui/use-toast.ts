
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
  }
};

export { useToast, toast, domainToast };
