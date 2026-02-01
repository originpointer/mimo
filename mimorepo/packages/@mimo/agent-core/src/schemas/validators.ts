import { z } from 'zod';

/**
 * 验证结果
 */
export interface ValidationResult<T = any> {
    success: boolean;
    data?: T;
    errors?: string[];
}

/**
 * Schema验证器
 * 提供运行时验证功能
 */
export class SchemaValidator {
    /**
     * 验证数据是否符合Schema
     * @param schema Zod Schema
     * @param data 待验证数据
     * @returns 验证结果
     */
    static validate<T extends z.ZodTypeAny>(
        schema: T,
        data: unknown
    ): ValidationResult<z.infer<T>> {
        try {
            const result = schema.safeParse(data);
            if (result.success) {
                return {
                    success: true,
                    data: result.data,
                };
            }
            return {
                success: false,
                errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
            };
        } catch (error) {
            return {
                success: false,
                errors: [error instanceof Error ? error.message : String(error)],
            };
        }
    }

    /**
     * 验证并断言，验证失败时抛出错误
     * @param schema Zod Schema
     * @param data 待验证数据
     * @returns 验证后的数据
     * @throws 验证失败时抛出AgentError
     */
    static assertValid<T extends z.ZodTypeAny>(
        schema: T,
        data: unknown
    ): z.infer<T> {
        const result = schema.safeParse(data);
            if (!result.success) {
                const errors = result.error.errors.map(e =>
                    `${e.path.join('.')}: ${e.message}`
                ).join(', ');
                throw new Error(`Schema validation failed: ${errors}`);
            }
            return result.data;
    }

    /**
     * 创建验证函数
     * @param schema Zod Schema
     * @returns 验证函数
     */
    static createValidator<T extends z.ZodTypeAny>(
        schema: T
    ): (data: unknown) => ValidationResult<z.infer<T>> {
        return (data: unknown) => SchemaValidator.validate(schema, data);
    }

    /**
     * 批量验证
     * @param items 数据项列表
     * @param schema Zod Schema
     * @returns 批量验证结果
     */
    static validateBatch<T extends z.ZodTypeAny>(
        items: unknown[],
        schema: T
    ): ValidationResult<z.infer<T>[]> {
        const results: z.infer<T>[] = [];
        const errors: string[] = [];

        for (let i = 0; i < items.length; i++) {
            const result = SchemaValidator.validate(schema, items[i]);
            if (result.success && result.data) {
                results.push(result.data);
            } else {
                errors.push(`[${i}] ${result.errors?.join(', ')}`);
            }
        }

        if (errors.length > 0) {
            return { success: false, errors };
        }
        return { success: true, data: results };
    }
}

/**
 * JSON Schema验证器
 * 验证对象是否符合JSON Schema规范
 */
export class JsonSchemaValidator {
    /**
     * 验证是否为有效的JSON Schema
     * @param schema JSON Schema对象
     * @returns 是否有效
     */
    static isValidJsonSchema(schema: unknown): boolean {
        if (typeof schema !== 'object' || schema === null) {
            return false;
        }

        const s = schema as Record<string, unknown>;

        // 必须有 type 字段
        if (!s.type || typeof s.type !== 'string') {
            return false;
        }

        const validTypes = [
            'object', 'array', 'string', 'number', 'integer',
            'boolean', 'null'
        ];

        if (!validTypes.includes(s.type)) {
            return false;
        }

        // object类型需要properties
        if (s.type === 'object') {
            if (typeof s.properties !== 'object' || s.properties === null) {
                return false;
            }
        }

        // array类型需要items
        if (s.type === 'array') {
            if (!s.items && !s.$ref) {
                return false;
            }
        }

        return true;
    }

    /**
     * 验证OpenAI Strict模式要求
     * @param schema JSON Schema
     * @returns 验证结果
     */
    static validateOpenAIStrict(schema: unknown): ValidationResult {
        const errors: string[] = [];

        if (!JsonSchemaValidator.isValidJsonSchema(schema)) {
            return { success: false, errors: ['Invalid JSON Schema'] };
        }

        const s = schema as Record<string, unknown>;

        // 检查 additionalProperties: false
        if (s.type === 'object') {
            if (s.additionalProperties !== false) {
                errors.push('Missing additionalProperties: false for strict mode');
            }
        }

        // 检查是否没有$ref
        const hasRefs = this._hasRefs(schema);
        if (hasRefs) {
            errors.push('Contains $ref, should be flattened');
        }

        if (errors.length > 0) {
            return { success: false, errors };
        }
        return { success: true };
    }

    /**
     * 递归检查是否有$ref
     */
    private static _hasRefs(obj: unknown): boolean {
        if (typeof obj !== 'object' || obj === null) {
            return false;
        }

        if ('$ref' in obj) {
            return true;
        }

        for (const value of Object.values(obj)) {
            if (this._hasRefs(value)) {
                return true;
            }
        }

        return false;
    }
}

/**
 * 类型守卫工具
 */
export class TypeGuards {
    /**
     * 检查是否为有效的BaseMessage
     */
    static isBaseMessage(obj: unknown): obj is import('../types').BaseMessage {
        return (
            typeof obj === 'object' &&
            obj !== null &&
            'role' in obj &&
            'content' in obj
        );
    }

    /**
     * 检查是否为有效的ToolCall
     */
    static isToolCall(obj: unknown): obj is import('../types').ToolCall {
        return (
            typeof obj === 'object' &&
            obj !== null &&
            'id' in obj &&
            'name' in obj &&
            'parameters' in obj
        );
    }

    /**
     * 检查是否为有效的TokenUsage
     */
    static isTokenUsage(obj: unknown): obj is import('../types').TokenUsage {
        return (
            typeof obj === 'object' &&
            obj !== null &&
            'promptTokens' in obj &&
            'completionTokens' in obj &&
            'totalTokens' in obj
        );
    }
}
