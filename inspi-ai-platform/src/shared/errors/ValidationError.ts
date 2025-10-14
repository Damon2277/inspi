/**
 * 验证错误类
 */
import { CustomError } from './CustomError';
import { ErrorCode, ErrorDetails, ErrorContext } from './types';

/**
 * 验证错误类
 */
export class ValidationError extends CustomError {
  constructor(
    message?: string,
    details?: ErrorDetails[],
    context?: ErrorContext,
  ) {
    super(ErrorCode.VALIDATION_FAILED, message, details, context);
    this.name = 'ValidationError';
  }

  /**
   * 必填字段缺失错误
   */
  static required(field: string, context?: ErrorContext): ValidationError {
    const message = `Field '${field}' is required`;
    const details: ErrorDetails[] = [
      {
        field,
        constraint: 'required',
        message: `${field} is required`,
      },
    ];

    return new ValidationError(message, details, context);
  }

  /**
   * 字段格式无效错误
   */
  static invalidFormat(
    field: string,
    value: any,
    expectedFormat: string,
    context?: ErrorContext,
  ): ValidationError {
    const message = `Field '${field}' has invalid format`;
    const details: ErrorDetails[] = [
      {
        field,
        value,
        constraint: `format_${expectedFormat}`,
        message: `${field} must be in ${expectedFormat} format`,
      },
    ];

    return new ValidationError(message, details, context);
  }

  /**
   * 字段长度无效错误
   */
  static invalidLength(
    field: string,
    value: any,
    min?: number,
    max?: number,
    context?: ErrorContext,
  ): ValidationError {
    let constraint = 'length';
    let message = `${field} length is invalid`;

    if (min !== undefined && max !== undefined) {
      constraint = `length_${min}_${max}`;
      message = `${field} must be between ${min} and ${max} characters`;
    } else if (min !== undefined) {
      constraint = `min_length_${min}`;
      message = `${field} must be at least ${min} characters`;
    } else if (max !== undefined) {
      constraint = `max_length_${max}`;
      message = `${field} must be at most ${max} characters`;
    }

    const details: ErrorDetails[] = [
      {
        field,
        value,
        constraint,
        message,
      },
    ];

    return new ValidationError(`Field '${field}' has invalid length`, details, context);
  }

  /**
   * 字段值超出范围错误
   */
  static outOfRange(
    field: string,
    value: any,
    min?: number,
    max?: number,
    context?: ErrorContext,
  ): ValidationError {
    let constraint = 'range';
    let message = `${field} is out of range`;

    if (min !== undefined && max !== undefined) {
      constraint = `range_${min}_${max}`;
      message = `${field} must be between ${min} and ${max}`;
    } else if (min !== undefined) {
      constraint = `min_${min}`;
      message = `${field} must be at least ${min}`;
    } else if (max !== undefined) {
      constraint = `max_${max}`;
      message = `${field} must be at most ${max}`;
    }

    const details: ErrorDetails[] = [
      {
        field,
        value,
        constraint,
        message,
      },
    ];

    return new ValidationError(`Field '${field}' is out of range`, details, context);
  }

  /**
   * 字段值不在允许列表中错误
   */
  static notInEnum(
    field: string,
    value: any,
    allowedValues: any[],
    context?: ErrorContext,
  ): ValidationError {
    const message = `Field '${field}' has invalid value`;
    const details: ErrorDetails[] = [
      {
        field,
        value,
        constraint: `enum_${allowedValues.join('_')}`,
        message: `${field} must be one of: ${allowedValues.join(', ')}`,
      },
    ];

    return new ValidationError(message, details, context);
  }

  /**
   * 邮箱格式无效错误
   */
  static invalidEmail(field: string, value: string, context?: ErrorContext): ValidationError {
    return ValidationError.invalidFormat(field, value, 'email', context);
  }

  /**
   * URL格式无效错误
   */
  static invalidUrl(field: string, value: string, context?: ErrorContext): ValidationError {
    return ValidationError.invalidFormat(field, value, 'URL', context);
  }

  /**
   * 日期格式无效错误
   */
  static invalidDate(field: string, value: string, context?: ErrorContext): ValidationError {
    return ValidationError.invalidFormat(field, value, 'date', context);
  }

  /**
   * 数字格式无效错误
   */
  static invalidNumber(field: string, value: any, context?: ErrorContext): ValidationError {
    return ValidationError.invalidFormat(field, value, 'number', context);
  }

  /**
   * 布尔值格式无效错误
   */
  static invalidBoolean(field: string, value: any, context?: ErrorContext): ValidationError {
    return ValidationError.invalidFormat(field, value, 'boolean', context);
  }

  /**
   * 数组格式无效错误
   */
  static invalidArray(field: string, value: any, context?: ErrorContext): ValidationError {
    return ValidationError.invalidFormat(field, value, 'array', context);
  }

  /**
   * 对象格式无效错误
   */
  static invalidObject(field: string, value: any, context?: ErrorContext): ValidationError {
    return ValidationError.invalidFormat(field, value, 'object', context);
  }

  /**
   * 自定义验证规则失败错误
   */
  static customRule(
    field: string,
    value: any,
    ruleName: string,
    ruleMessage: string,
    context?: ErrorContext,
  ): ValidationError {
    const message = `Field '${field}' failed custom validation`;
    const details: ErrorDetails[] = [
      {
        field,
        value,
        constraint: `custom_${ruleName}`,
        message: ruleMessage,
      },
    ];

    return new ValidationError(message, details, context);
  }

  /**
   * 多个字段验证错误
   */
  static multiple(errors: ErrorDetails[], context?: ErrorContext): ValidationError {
    const message = 'Multiple validation errors occurred';
    return new ValidationError(message, errors, context);
  }

  /**
   * 从验证结果创建错误
   */
  static fromValidationResult(
    result: { field: string; message: string; value?: any }[],
    context?: ErrorContext,
  ): ValidationError {
    const details: ErrorDetails[] = result.map(item => ({
      field: item.field,
      value: item.value,
      constraint: 'validation',
      message: item.message,
    }));

    return ValidationError.multiple(details, context);
  }
}

/**
 * 表单验证错误
 */
export class FormValidationError extends ValidationError {
  constructor(
    formName: string,
    errors: ErrorDetails[],
    context?: ErrorContext,
  ) {
    const message = `Form '${formName}' validation failed`;
    super(message, errors, context);
    this.name = 'FormValidationError';
  }

  /**
   * 创建表单验证错误
   */
  static create(
    formName: string,
    fieldErrors: Record<string, string>,
    context?: ErrorContext,
  ): FormValidationError {
    const details: ErrorDetails[] = Object.entries(fieldErrors).map(([field, message]) => ({
      field,
      constraint: 'validation',
      message,
    }));

    return new FormValidationError(formName, details, context);
  }
}

/**
 * API参数验证错误
 */
export class ApiValidationError extends ValidationError {
  constructor(
    endpoint: string,
    method: string,
    errors: ErrorDetails[],
    context?: ErrorContext,
  ) {
    const message = `API ${method} ${endpoint} parameter validation failed`;
    super(message, errors, context);
    this.name = 'ApiValidationError';
  }

  /**
   * 查询参数验证错误
   */
  static queryParams(
    endpoint: string,
    method: string,
    paramErrors: Record<string, string>,
    context?: ErrorContext,
  ): ApiValidationError {
    const details: ErrorDetails[] = Object.entries(paramErrors).map(([param, message]) => ({
      field: `query.${param}`,
      constraint: 'validation',
      message,
    }));

    return new ApiValidationError(endpoint, method, details, context);
  }

  /**
   * 请求体验证错误
   */
  static requestBody(
    endpoint: string,
    method: string,
    bodyErrors: Record<string, string>,
    context?: ErrorContext,
  ): ApiValidationError {
    const details: ErrorDetails[] = Object.entries(bodyErrors).map(([field, message]) => ({
      field: `body.${field}`,
      constraint: 'validation',
      message,
    }));

    return new ApiValidationError(endpoint, method, details, context);
  }

  /**
   * 路径参数验证错误
   */
  static pathParams(
    endpoint: string,
    method: string,
    paramErrors: Record<string, string>,
    context?: ErrorContext,
  ): ApiValidationError {
    const details: ErrorDetails[] = Object.entries(paramErrors).map(([param, message]) => ({
      field: `path.${param}`,
      constraint: 'validation',
      message,
    }));

    return new ApiValidationError(endpoint, method, details, context);
  }
}
