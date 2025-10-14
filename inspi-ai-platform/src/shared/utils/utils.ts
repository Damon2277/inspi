/**
 * 工具函数
 */

// 简化版本的类名合并函数
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
