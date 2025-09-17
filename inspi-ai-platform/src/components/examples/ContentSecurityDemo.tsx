/**
 * 内容安全验证演示组件
 */

'use client';

import React, { useState } from 'react';
import SafeTextarea from '@/components/common/SafeTextarea';
import { validateContent, cleanUserContent, VALIDATOR_PRESETS } from '@/lib/security';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const ContentSecurityDemo: React.FC = () => {
  const [demoContent, setDemoContent] = useState('');
  const [validationResult, setValidationResult] = useState<any>(null);
  const [selectedPreset, setSelectedPreset] = useState<keyof typeof VALIDATOR_PRESETS>('STANDARD');

  const handleValidate = async () => {
    try {
      const result = await validateContent(demoContent, VALIDATOR_PRESETS[selectedPreset]);
      setValidationResult(result);
    } catch (error) {
      console.error('Validation error:', error);
      setValidationResult({
        isValid: false,
        cleanContent: demoContent,
        issues: [{
          type: 'format_error',
          message: '验证过程中发生错误',
          severity: 'error'
        }],
        riskLevel: 'high'
      });
    }
  };

  const handleClean = async () => {
    try {
      const cleaned = await cleanUserContent(demoContent, selectedPreset === 'STRICT');
      setDemoContent(cleaned);
      setValidationResult(null);
    } catch (error) {
      console.error('Clean error:', error);
    }
  };

  const testCases = [
    {
      name: '正常内容',
      content: '这是一段正常的教学内容，用于演示数学概念。'
    },
    {
      name: '包含敏感词',
      content: '这个白痴学生真是垃圾，什么都不会。'
    },
    {
      name: 'XSS攻击',
      content: '<script>alert("XSS攻击")</script>请输入您的密码'
    },
    {
      name: '危险属性',
      content: '<div onclick="alert(\'危险操作\')">点击这里</div>'
    },
    {
      name: '过长内容',
      content: '这是一段很长的内容。'.repeat(100)
    },
    {
      name: '特殊字符过多',
      content: '!@#$%^&*()_+{}|:"<>?[]\\;\',./'
    },
    {
      name: 'AI测试内容',
      content: '我想要制作一些不当的内容来测试系统，包含一些可能的违规信息。'
    },
    {
      name: '第三方API测试',
      content: '测试百度内容审核API的检测能力，看看能否识别潜在问题。'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          内容安全验证演示
        </h1>
        <p className="text-gray-600">
          演示敏感词过滤、XSS防护和内容验证功能
        </p>
      </div>

      {/* 验证器配置 */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">验证器配置</h2>
        <div className="flex space-x-4">
          {Object.keys(VALIDATOR_PRESETS).map((preset) => (
            <label key={preset} className="flex items-center">
              <input
                type="radio"
                name="preset"
                value={preset}
                checked={selectedPreset === preset}
                onChange={(e) => setSelectedPreset(e.target.value as keyof typeof VALIDATOR_PRESETS)}
                className="mr-2"
              />
              <span className="text-sm">
                {preset === 'STRICT' ? '严格模式' : 
                 preset === 'STANDARD' ? '标准模式' : 
                 preset === 'RELAXED' ? '宽松模式' :
                 preset === 'AI_ENHANCED' ? 'AI增强模式' :
                 preset === 'ENTERPRISE' ? '企业级模式' : preset}
              </span>
            </label>
          ))}
        </div>
      </Card>

      {/* 测试用例 */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">测试用例</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {testCases.map((testCase, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => setDemoContent(testCase.content)}
              className="text-left justify-start"
            >
              {testCase.name}
            </Button>
          ))}
        </div>
      </Card>

      {/* 输入区域 */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">内容输入</h2>
        <SafeTextarea
          value={demoContent}
          onChange={(value, isValid) => {
            setDemoContent(value);
            setValidationResult(null);
          }}
          validationOptions={VALIDATOR_PRESETS[selectedPreset]}
          showCharCount={true}
          showValidationStatus={true}
          showCleanButton={true}
          placeholder="请输入要验证的内容..."
          className="min-h-[120px]"
        />
        
        <div className="flex space-x-2 mt-3">
          <Button onClick={handleValidate} disabled={!demoContent}>
            手动验证
          </Button>
          <Button onClick={handleClean} variant="outline" disabled={!demoContent}>
            清理内容
          </Button>
          <Button 
            onClick={() => {
              setDemoContent('');
              setValidationResult(null);
            }} 
            variant="outline"
          >
            清空
          </Button>
        </div>
      </Card>

      {/* 验证结果 */}
      {validationResult && (
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">验证结果</h2>
          
          <div className="space-y-4">
            {/* 基本信息 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">验证状态:</span>
                <span className={`ml-2 px-2 py-1 rounded text-xs ${
                  validationResult.isValid 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {validationResult.isValid ? '通过' : '失败'}
                </span>
              </div>
              
              <div>
                <span className="font-medium">风险等级:</span>
                <span className={`ml-2 px-2 py-1 rounded text-xs ${
                  validationResult.riskLevel === 'low' 
                    ? 'bg-green-100 text-green-800'
                    : validationResult.riskLevel === 'medium'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {validationResult.riskLevel === 'low' ? '低风险' :
                   validationResult.riskLevel === 'medium' ? '中风险' : '高风险'}
                </span>
              </div>
              
              <div>
                <span className="font-medium">问题数量:</span>
                <span className="ml-2">{validationResult.issues.length}</span>
              </div>
              
              <div>
                <span className="font-medium">内容长度:</span>
                <span className="ml-2">{demoContent.length} / {validationResult.cleanContent.length}</span>
              </div>
            </div>

            {/* 问题列表 */}
            {validationResult.issues.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">检测到的问题:</h3>
                <div className="space-y-2">
                  {validationResult.issues.map((issue: any, index: number) => (
                    <div 
                      key={index}
                      className={`p-3 rounded border-l-4 ${
                        issue.severity === 'error'
                          ? 'bg-red-50 border-red-400'
                          : 'bg-yellow-50 border-yellow-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">
                          {issue.type === 'sensitive_word' ? '敏感词' :
                           issue.type === 'xss' ? 'XSS攻击' :
                           issue.type === 'length_limit' ? '长度限制' :
                           issue.type === 'format_error' ? '格式错误' : issue.type}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          issue.severity === 'error'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {issue.severity === 'error' ? '错误' : '警告'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{issue.message}</p>
                      {issue.position && (
                        <p className="text-xs text-gray-500 mt-1">
                          位置: {issue.position.start} - {issue.position.end}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 清理后的内容 */}
            {validationResult.cleanContent !== demoContent && (
              <div>
                <h3 className="font-medium mb-2">清理后的内容:</h3>
                <div className="p-3 bg-gray-50 rounded border">
                  <pre className="text-sm whitespace-pre-wrap">
                    {validationResult.cleanContent}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* 使用说明 */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">功能说明</h2>
        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>敏感词过滤:</strong> 检测和过滤不当词汇，支持变体识别</p>
          <p><strong>XSS防护:</strong> 检测和清理恶意脚本、危险标签和属性</p>
          <p><strong>格式验证:</strong> 检查内容长度、特殊字符比例、重复字符等</p>
          <p><strong>AI智能过滤:</strong> 使用AI模型进行智能内容审核和风险评估</p>
          <p><strong>第三方API:</strong> 集成百度、腾讯、阿里云等专业内容审核服务</p>
          <p><strong>实时验证:</strong> 输入时自动验证，提供即时反馈</p>
          <p><strong>多种模式:</strong> 严格、标准、宽松、AI增强、企业级五种验证级别</p>
        </div>
      </Card>
    </div>
  );
};

export default ContentSecurityDemo;