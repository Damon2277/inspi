/**
 * 奖励配置管理页面
 */

'use client'

import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import AdminLayout from '@/components/admin/AdminLayout'
import RewardRulesManagement from '@/components/admin/RewardRulesManagement'
import RewardActivitiesManagement from '@/components/admin/RewardActivitiesManagement'
import RewardApprovalsManagement from '@/components/admin/RewardApprovalsManagement'
import RewardStatistics from '@/components/admin/RewardStatistics'
import { 
  Settings, 
  Calendar, 
  CheckCircle, 
  BarChart3,
  Gift,
  Users,
  TrendingUp,
  Award
} from 'lucide-react'

export default function RewardConfigPage() {
  const [activeTab, setActiveTab] = useState('rules')

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">奖励配置管理</h1>
            <p className="text-gray-600 mt-2">管理奖励规则、活动设置和审核流程</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Gift className="h-4 w-4" />
            <span>奖励系统</span>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="rules" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              奖励规则
            </TabsTrigger>
            <TabsTrigger value="activities" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              活动管理
            </TabsTrigger>
            <TabsTrigger value="approvals" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              审核管理
            </TabsTrigger>
            <TabsTrigger value="statistics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              统计报表
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rules">
            <RewardRulesManagement />
          </TabsContent>

          <TabsContent value="activities">
            <RewardActivitiesManagement />
          </TabsContent>

          <TabsContent value="approvals">
            <RewardApprovalsManagement />
          </TabsContent>

          <TabsContent value="statistics">
            <RewardStatistics />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}