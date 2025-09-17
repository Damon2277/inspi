/**
 * 邀请管理组件
 */

'use client'

import { useEffect, useState } from 'react'
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  StopIcon,
  PlayIcon
} from '@heroicons/react/24/outline'

interface InviteData {
  id: string
  code: string
  inviterName: string
  inviterEmail: string
  createdAt: Date
  usageCount: number
  maxUsage: number
  isActive: boolean
  expiresAt?: Date
}

interface InviteManagementData {
  invites: InviteData[]
  totalCount: number
  pagination: {
    page: number
    limit: number
    totalPages: number
  }
}

export default function InviteManagement() {
  const [data, setData] = useState<InviteManagementData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // 筛选和搜索状态
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'inactive' | 'expired'>('all')
  const [page, setPage] = useState(1)
  const [limit] = useState(20)

  useEffect(() => {
    fetchInvites()
  }, [page, search, status])

  const fetchInvites = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(status !== 'all' && { status })
      })

      const response = await fetch(`/api/admin/invites?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch invites')
      }

      const result = await response.json()
      setData(result.data)
    } catch (error) {
      console.error('Fetch invites error:', error)
      setError('Failed to load invites')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (inviteId: string, action: 'activate' | 'deactivate') => {
    try {
      const response = await fetch('/api/admin/invites', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          codeId: inviteId,
          reason: `Admin ${action} action`
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to ${action} invite`)
      }

      // 刷新数据
      fetchInvites()
    } catch (error) {
      console.error(`${action} invite error:`, error)
      alert(`Failed to ${action} invite`)
    }
  }

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        type: 'invites',
        ...(search && { search }),
        ...(status !== 'all' && { status })
      })

      const response = await fetch(`/api/admin/export?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to export data')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `invites_export_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export data')
    }
  }

  const getStatusBadge = (invite: InviteData) => {
    if (!invite.isActive) {
      return <span className=\"inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800\">已停用</span>
    }
    
    if (invite.expiresAt && new Date(invite.expiresAt) <= new Date()) {
      return <span className=\"inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800\">已过期</span>
    }
    
    if (invite.maxUsage > 0 && invite.usageCount >= invite.maxUsage) {
      return <span className=\"inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800\">已用完</span>
    }
    
    return <span className=\"inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800\">活跃</span>
  }

  if (loading && !data) {
    return (
      <div className=\"bg-white shadow rounded-lg p-6\">
        <div className=\"animate-pulse space-y-4\">
          <div className=\"h-4 bg-gray-300 rounded w-1/4\"></div>
          <div className=\"space-y-3\">
            {[...Array(5)].map((_, i) => (
              <div key={i} className=\"h-4 bg-gray-300 rounded\"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className=\"bg-white shadow rounded-lg\">
      {/* 搜索和筛选 */}
      <div className=\"px-6 py-4 border-b border-gray-200\">
        <div className=\"flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0\">
          <div className=\"flex-1 flex items-center space-x-4\">
            <div className=\"relative flex-1 max-w-md\">
              <div className=\"absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none\">
                <MagnifyingGlassIcon className=\"h-5 w-5 text-gray-400\" />
              </div>
              <input
                type=\"text\"
                className=\"block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500\"
                placeholder=\"搜索邀请码、邀请人...\"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div className=\"relative\">
              <select
                className=\"block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md\"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <option value=\"all\">所有状态</option>
                <option value=\"active\">活跃</option>
                <option value=\"inactive\">已停用</option>
                <option value=\"expired\">已过期</option>
              </select>
            </div>
          </div>
          
          <div className=\"flex items-center space-x-3\">
            <button
              onClick={handleExport}
              className=\"inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500\"
            >
              <ArrowDownTrayIcon className=\"-ml-1 mr-2 h-5 w-5\" />
              导出
            </button>
          </div>
        </div>
      </div>

      {/* 邀请列表 */}
      <div className=\"overflow-hidden\">
        <table className=\"min-w-full divide-y divide-gray-200\">
          <thead className=\"bg-gray-50\">
            <tr>
              <th className=\"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider\">
                邀请码
              </th>
              <th className=\"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider\">
                邀请人
              </th>
              <th className=\"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider\">
                使用情况
              </th>
              <th className=\"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider\">
                状态
              </th>
              <th className=\"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider\">
                创建时间
              </th>
              <th className=\"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider\">
                操作
              </th>
            </tr>
          </thead>
          <tbody className=\"bg-white divide-y divide-gray-200\">
            {data?.invites.map((invite) => (
              <tr key={invite.id} className=\"hover:bg-gray-50\">
                <td className=\"px-6 py-4 whitespace-nowrap\">
                  <div className=\"text-sm font-medium text-gray-900\">{invite.code}</div>
                </td>
                <td className=\"px-6 py-4 whitespace-nowrap\">
                  <div className=\"text-sm text-gray-900\">{invite.inviterName}</div>
                  <div className=\"text-sm text-gray-500\">{invite.inviterEmail}</div>
                </td>
                <td className=\"px-6 py-4 whitespace-nowrap\">
                  <div className=\"text-sm text-gray-900\">
                    {invite.usageCount} / {invite.maxUsage || '无限制'}
                  </div>
                  <div className=\"w-full bg-gray-200 rounded-full h-2 mt-1\">
                    <div
                      className=\"bg-indigo-600 h-2 rounded-full\"
                      style={{
                        width: invite.maxUsage > 0 
                          ? `${Math.min((invite.usageCount / invite.maxUsage) * 100, 100)}%`
                          : '0%'
                      }}
                    ></div>
                  </div>
                </td>
                <td className=\"px-6 py-4 whitespace-nowrap\">
                  {getStatusBadge(invite)}
                </td>
                <td className=\"px-6 py-4 whitespace-nowrap text-sm text-gray-500\">
                  {new Date(invite.createdAt).toLocaleDateString('zh-CN')}
                </td>
                <td className=\"px-6 py-4 whitespace-nowrap text-sm font-medium\">
                  <div className=\"flex items-center space-x-2\">
                    <button className=\"text-indigo-600 hover:text-indigo-900\">
                      <EyeIcon className=\"h-5 w-5\" />
                    </button>
                    {invite.isActive ? (
                      <button
                        onClick={() => handleStatusChange(invite.id, 'deactivate')}
                        className=\"text-red-600 hover:text-red-900\"
                        title=\"停用\"
                      >
                        <StopIcon className=\"h-5 w-5\" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStatusChange(invite.id, 'activate')}
                        className=\"text-green-600 hover:text-green-900\"
                        title=\"激活\"
                      >
                        <PlayIcon className=\"h-5 w-5\" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {data && data.pagination.totalPages > 1 && (
        <div className=\"bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6\">
          <div className=\"flex-1 flex justify-between sm:hidden\">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className=\"relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed\"
            >
              上一页
            </button>
            <button
              onClick={() => setPage(Math.min(data.pagination.totalPages, page + 1))}
              disabled={page === data.pagination.totalPages}
              className=\"ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed\"
            >
              下一页
            </button>
          </div>
          <div className=\"hidden sm:flex-1 sm:flex sm:items-center sm:justify-between\">
            <div>
              <p className=\"text-sm text-gray-700\">
                显示第 <span className=\"font-medium\">{(page - 1) * limit + 1}</span> 到{' '}
                <span className=\"font-medium\">{Math.min(page * limit, data.totalCount)}</span> 条，
                共 <span className=\"font-medium\">{data.totalCount}</span> 条记录
              </p>
            </div>
            <div>
              <nav className=\"relative z-0 inline-flex rounded-md shadow-sm -space-x-px\">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className=\"relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed\"
                >
                  上一页
                </button>
                {/* 页码按钮 */}
                {Array.from({ length: Math.min(5, data.pagination.totalPages) }, (_, i) => {
                  const pageNum = i + 1
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === pageNum
                          ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                <button
                  onClick={() => setPage(Math.min(data.pagination.totalPages, page + 1))}
                  disabled={page === data.pagination.totalPages}
                  className=\"relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed\"
                >
                  下一页
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* 空状态 */}
      {data && data.invites.length === 0 && (
        <div className=\"text-center py-12\">
          <div className=\"text-gray-500\">
            <p className=\"text-lg font-medium\">没有找到邀请记录</p>
            <p className=\"mt-1\">尝试调整搜索条件或筛选器</p>
          </div>
        </div>
      )}
    </div>
  )
}