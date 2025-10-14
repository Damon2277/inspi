/**
 * 内容验证Hook测试
 */

import { renderHook, act } from '@testing-library/react';

import { validateContent, cleanUserContent, createValidationSummary } from '@/lib/security';

import { useContentValidation } from '@/shared/hooks/useContentValidation';

// Mock 安全模块
jest.mock('@/lib/security', () => ({
    validateContent: jest.fn(),
    cleanUserContent: jest.fn(),
    createValidationSummary: jest.fn(),
}));

const mockValidateContent = validateContent as jest.MockedFunction<typeof validateContent>;
const mockCleanUserContent = cleanUserContent as jest.MockedFunction<typeof cleanUserContent>;
const mockCreateValidationSummary = createValidationSummary as jest.MockedFunction<typeof createValidationSummary>;

describe('useContentValidation', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // 默认mock返回值
        mockValidateContent.mockReturnValue({
            isValid: true,
            cleanContent: 'test content',
            issues: [],
            riskLevel: 'low',
        });

        mockCreateValidationSummary.mockReturnValue({
            isValid: true,
            riskLevel: 'low',
            hasErrors: false,
            hasWarnings: false,
            errorCount: 0,
            warningCount: 0,
            errors: [],
            warnings: [],
            cleanContent: 'test content',
        });

        mockCleanUserContent.mockReturnValue('cleaned content');
    });

    test('应该初始化默认状态', () => {
        const { result } = renderHook(() => useContentValidation());

        expect(result.current.content).toBe('');
        expect(typeof result.current.cleanContent).toBe('string');
        expect(result.current.validation).toBeNull();
        expect(result.current.isValidating).toBe(false);
        expect(result.current.hasErrors).toBe(false);
        expect(result.current.hasWarnings).toBe(false);
        expect(result.current.canSubmit).toBe(false);
    });

    test('应该更新内容', () => {
        const { result } = renderHook(() => useContentValidation());

        act(() => {
            result.current.updateContent('test content');
        });

        expect(result.current.content).toBe('test content');
    });

    test('应该在实时验证模式下自动验证', async () => {
        const { result } = renderHook(() =>
            useContentValidation({ realTimeValidation: true, debounceDelay: 0 }),
        );

        act(() => {
            result.current.updateContent('test content');
        });

        // 等待防抖
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
        });

        expect(mockValidateContent).toHaveBeenCalledWith('test content', expect.any(Object));
    });

    test('应该处理验证错误', async () => {
        mockValidateContent.mockReturnValue({
            isValid: false,
            cleanContent: 'test content',
            issues: [
                { type: 'sensitive_word', message: '包含敏感词', severity: 'error' },
            ],
            riskLevel: 'high',
        });

        mockCreateValidationSummary.mockReturnValue({
            isValid: false,
            riskLevel: 'high',
            hasErrors: true,
            hasWarnings: false,
            errorCount: 1,
            warningCount: 0,
            errors: ['包含敏感词'],
            warnings: [],
            cleanContent: 'test content',
        });

        const { result } = renderHook(() =>
            useContentValidation({ realTimeValidation: true, debounceDelay: 0 }),
        );

        act(() => {
            result.current.updateContent('test content');
        });

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
        });

        expect(result.current.hasErrors).toBe(true);
        expect(result.current.errors).toContain('包含敏感词');
        expect(result.current.riskLevel).toBe('high');
        expect(result.current.canSubmit).toBe(false);
    });

    test('应该处理验证警告', async () => {
        mockValidateContent.mockReturnValue({
            isValid: true,
            cleanContent: 'test content',
            issues: [
                { type: 'format_error', message: '格式警告', severity: 'warning' },
            ],
            riskLevel: 'medium',
        });

        mockCreateValidationSummary.mockReturnValue({
            isValid: true,
            riskLevel: 'medium',
            hasErrors: false,
            hasWarnings: true,
            errorCount: 0,
            warningCount: 1,
            errors: [],
            warnings: ['格式警告'],
            cleanContent: 'test content',
        });

        const { result } = renderHook(() =>
            useContentValidation({ realTimeValidation: true, debounceDelay: 0 }),
        );

        act(() => {
            result.current.updateContent('test content');
        });

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
        });

        expect(result.current.hasWarnings).toBe(true);
        expect(result.current.warnings).toContain('格式警告');
        expect(result.current.canSubmit).toBe(true); // 警告不影响提交
    });

    test('应该支持手动验证', () => {
        const { result } = renderHook(() =>
            useContentValidation({ realTimeValidation: false }),
        );

        act(() => {
            result.current.updateContent('test content');
        });

        act(() => {
            result.current.validate();
        });

        expect(mockValidateContent).toHaveBeenCalledWith('test content', expect.any(Object));
    });

    test('应该支持内容清理', () => {
        const { result } = renderHook(() => useContentValidation());

        act(() => {
            result.current.updateContent('dirty content');
        });

        act(() => {
            result.current.cleanContent();
        });

        expect(mockCleanUserContent).toHaveBeenCalledWith('dirty content');
        expect(result.current.content).toBe('cleaned content');
    });

    test('应该支持自动清理模式', async () => {
        const { result } = renderHook(() =>
            useContentValidation({
                realTimeValidation: true,
                autoClean: true,
                debounceDelay: 0,
            }),
        );

        act(() => {
            result.current.updateContent('test content');
        });

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
        });

        expect(typeof result.current.cleanContent).toBe('string'); // 来自验证结果
    });

    test('应该支持重置状态', () => {
        const { result } = renderHook(() => useContentValidation());

        act(() => {
            result.current.updateContent('test content');
        });

        act(() => {
            result.current.reset();
        });

        expect(result.current.content).toBe('');
        expect(result.current.validation).toBeNull();
        expect(result.current.hasErrors).toBe(false);
    });

    test('应该正确计算canSubmit状态', async () => {
        const { result } = renderHook(() =>
            useContentValidation({ realTimeValidation: true, debounceDelay: 0 }),
        );

        // 空内容不能提交
        expect(result.current.canSubmit).toBe(false);

        // 有内容且无错误可以提交
        act(() => {
            result.current.updateContent('valid content');
        });

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
        });

        expect(result.current.canSubmit).toBe(true);

        // 有错误不能提交
        mockValidateContent.mockReturnValue({
            isValid: false,
            cleanContent: 'test content',
            issues: [{ type: 'sensitive_word', message: '错误', severity: 'error' }],
            riskLevel: 'high',
        });

        mockCreateValidationSummary.mockReturnValue({
            isValid: false,
            riskLevel: 'high',
            hasErrors: true,
            hasWarnings: false,
            errorCount: 1,
            warningCount: 0,
            errors: ['错误'],
            warnings: [],
            cleanContent: 'test content',
        });

        act(() => {
            result.current.updateContent('invalid content');
        });

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
        });

        expect(result.current.canSubmit).toBe(false);
    });

    test('应该提供第一个错误和警告', async () => {
        mockValidateContent.mockReturnValue({
            isValid: false,
            cleanContent: 'test content',
            issues: [
                { type: 'sensitive_word', message: '第一个错误', severity: 'error' },
                { type: 'format_error', message: '第一个警告', severity: 'warning' },
            ],
            riskLevel: 'high',
        });

        mockCreateValidationSummary.mockReturnValue({
            isValid: false,
            riskLevel: 'high',
            hasErrors: true,
            hasWarnings: true,
            errorCount: 1,
            warningCount: 1,
            errors: ['第一个错误'],
            warnings: ['第一个警告'],
            cleanContent: 'test content',
        });

        const { result } = renderHook(() =>
            useContentValidation({ realTimeValidation: true, debounceDelay: 0 }),
        );

        act(() => {
            result.current.updateContent('test content');
        });

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
        });

        expect(result.current.firstError).toBe('第一个错误');
        expect(result.current.firstWarning).toBe('第一个警告');
    });
});
