'use client';

export default function TestBasicPage() {
  return (
    <div>
      <h1>基础测试页面</h1>
      <p>如果你能看到这个页面，说明Next.js基础功能正常。</p>
      <ul>
        <li>✅ React组件渲染正常</li>
        <li>✅ 路由系统工作正常</li>
        <li>✅ 没有严重的配置错误</li>
      </ul>
      <style jsx>{`
        div {
          padding: 2rem;
          font-family: system-ui, sans-serif;
        }
        h1 {
          color: #2563eb;
          margin-bottom: 1rem;
        }
        p {
          margin-bottom: 1rem;
          color: #6b7280;
        }
        ul {
          list-style: none;
          padding: 0;
        }
        li {
          padding: 0.5rem 0;
          color: #16a34a;
        }
      `}</style>
    </div>
  );
}