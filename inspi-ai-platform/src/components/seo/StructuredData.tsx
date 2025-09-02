import Script from 'next/script';

interface StructuredDataProps {
  data: object;
  id?: string;
}

/**
 * 结构化数据组件
 * 用于在页面中插入JSON-LD结构化数据
 */
export default function StructuredData({ data, id }: StructuredDataProps) {
  const jsonLd = JSON.stringify(data, null, 2);
  
  return (
    <Script
      id={id || 'structured-data'}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLd }}
      strategy="beforeInteractive"
    />
  );
}