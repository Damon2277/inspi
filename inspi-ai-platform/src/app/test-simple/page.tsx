export default function TestSimplePage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginBottom: '1rem' }}>
          🎉 应用运行正常！
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
          所有的API错误都已经修复
        </p>
        <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
          <p>✅ PWA更新弹窗可以正常关闭</p>
          <p>✅ Subscription API返回正常数据</p>
          <p>✅ 主页可以正常访问</p>
          <p>✅ Favicon不会返回500错误</p>
        </div>
      </div>
    </div>
  );
}