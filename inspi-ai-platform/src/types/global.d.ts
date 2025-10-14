/// <reference path="./stubs/index.d.ts" />

// 全局类型声明
declare global {
  interface Window {
    gtag?: Function;
    dataLayer?: any[];
  }
}

// 扩展现有类型
export {};
