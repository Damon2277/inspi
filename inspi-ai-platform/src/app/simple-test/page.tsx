'use client'

import { useState, useEffect } from 'react'

export default function SimpleTestPage() {
  const [status, setStatus] = useState('loading')
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 测试API调用
    fetch('/api/health')
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        }
        return res.json()
      })
      .then(data => {
        setData(data)
        setStatus('success')
        setError(null)
      })
      .catch(error => {
        console.error('API Error:', error)
        setError(error.message)
        setStatus('error')
      })
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          简单测试页面
        </h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">API健康检查</h2>
          <div className="space-y-4">
            <div>
              <span className="font-medium">状态: </span>
              <span className={`px-2 py-1 rounded text-sm ${
                status === 'success' ? 'bg-green-100 text-green-800' :
                status === 'error' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {status === 'loading' ? '检查中...' : 
                 status === 'success' ? '正常' : '错误'}
              </span>
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <h3 className="font-medium text-red-800 mb-2">错误信息:</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}
            
            {data && (
              <div>
                <h3 className="font-medium mb-2">响应数据:</h3>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">测试链接</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a 
              href="/test-dashboard" 
              className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <div className="font-medium text-gray-900">测试仪表板</div>
              <div className="text-sm text-gray-600">完整的测试功能页面</div>
            </a>
            
            <a 
              href="/api/health" 
              target="_blank"
              className="block p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
            >
              <div className="font-medium text-gray-900">API健康检查</div>
              <div className="text-sm text-gray-600">查看API状态</div>
            </a>
            
            <a 
              href="/api/test-status" 
              target="_blank"
              className="block p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
            >
              <div className="font-medium text-gray-900">测试状态API</div>
              <div className="text-sm text-gray-600">查看测试运行状态</div>
            </a>
            
            <a 
              href="/" 
              className="block p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium text-gray-900">主页</div>
              <div className="text-sm text-gray-600">返回应用主页</div>
            </a>
          </div>
        </div>
        
        <div className="mt-6 text-center text-gray-600">
          <p>测试环境运行在端口 3003</p>
          <p>如果遇到问题，请查看浏览器控制台</p>
        </div>
      </div>
    </div>
  )
}