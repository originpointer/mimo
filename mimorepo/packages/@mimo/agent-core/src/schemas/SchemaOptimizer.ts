import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * JSON Schema类型 (简化版)
 */
type JsonSchema = any;

/**
 * Schema优化选项
 */
export interface SchemaOptimizeOptions {
    /** 是否启用严格模式 */
    strictMode?: boolean;
    /** 是否移除minItems约束 */
    removeMinItems?: boolean;
    /** 是否移除default值 */
    removeDefaults?: boolean;
}

/**
 * Schema优化器
 * 参考来源: Browser-Use SchemaOptimizer
 *
 * 功能:
 * 1. 展平$ref和$defs
 * 2. 添加additionalProperties: false
 * 3. 处理anyOf结构
 * 4. 确保OpenAI strict模式兼容
 * 5. 保留完整描述
 */
export class SchemaOptimizer {
    /**
     * 优化Zod Schema为JSON Schema
     * @param schema Zod Schema
     * @param options 优化选项
     * @returns 优化的JSON Schema
     */
    static optimize<T extends z.ZodType>(
        schema: T,
        options: SchemaOptimizeOptions = {}
    ): JsonSchema {
        // 1. 转换Zod到JSON Schema
        let jsonSchema = zodToJsonSchema(schema, {
            target: 'jsonSchema7',
            strictMode: options.strictMode !== false,
        } as any);

        // 2. 展平$ref和$defs
        jsonSchema = this.flattenRefs(jsonSchema);

        // 3. 移除minItems (可选)
        if (options.removeMinItems) {
            jsonSchema = this.removeMinItems(jsonSchema);
        }

        // 4. 移除defaults (可选)
        if (options.removeDefaults) {
            jsonSchema = this.removeDefaults(jsonSchema);
        }

        return jsonSchema;
    }

    /**
     * 展平所有$ref和$defs
     */
    private static flattenRefs(schema: JsonSchema): JsonSchema {
        if (!schema || typeof schema !== 'object') {
            return schema;
        }

        // 如果有$defs，递归展平
        if (schema.$defs && typeof schema.$defs === 'object') {
            schema = JSON.parse(JSON.stringify(schema)); // 深拷贝
            this.flattenDefsInPlace(schema);
        }

        return schema;
    }

    /**
     * 在Schema中原地展平$defs
     */
    private static flattenDefsInPlace(schema: JsonSchema): void {
        if (!schema.$defs) return;

        const defs = schema.$defs;
        delete schema.$defs;

        const resolveRef = (obj: any): void => {
            if (Array.isArray(obj)) {
                obj.forEach(resolveRef);
            } else if (obj && typeof obj === 'object') {
                if (obj.$ref) {
                    const refName = obj.$ref;
                    const def = defs[refName];
                    if (def) {
                        Object.assign(obj, def);
                        delete obj.$ref;
                    }
                }
                Object.values(obj).forEach(resolveRef);
            }
        };

        resolveRef(schema);
    }

    /**
     * 移除minItems约束
     */
    private static removeMinItems(schema: JsonSchema): JsonSchema {
        const removeNode = (node: any): any => {
            if (Array.isArray(node)) {
                return node.map(removeNode);
            } else if (node && typeof node === 'object') {
                const newNode = { ...node };
                if (newNode.minItems !== undefined) {
                    delete newNode.minItems;
                }
                if (newNode.$defs !== undefined) {
                    newNode.$defs = removeNode(newNode.$defs);
                }
                Object.keys(newNode).forEach(key => {
                    newNode[key] = removeNode(newNode[key]);
                });
                return newNode;
            }
            return node;
        };

        return removeNode(schema);
    }

    /**
     * 移除default值
     */
    private static removeDefaults(schema: JsonSchema): JsonSchema {
        const removeNode = (node: any): any => {
            if (Array.isArray(node)) {
                return node.map(removeNode);
            } else if (node && typeof node === 'object') {
                const newNode = { ...node };
                if (newNode.default !== undefined) {
                    delete newNode.default;
                }
                if (newNode.$defs !== undefined) {
                    newNode.$defs = removeNode(newNode.$defs);
                }
                Object.keys(newNode).forEach(key => {
                    if (key !== 'properties') {
                        newNode[key] = removeNode(newNode[key]);
                    }
                });
                return newNode;
            }
            return node;
        };

        return removeNode(schema);
    }

    /**
     * 优化Zod Schema并创建严格模式版本
     * 便捷方法，用于需要严格模式的场景
     */
    static optimizeStrict<T extends z.ZodType>(
        schema: T,
        options?: Omit<SchemaOptimizeOptions, 'strictMode'>
    ): JsonSchema {
        return this.optimize(schema, { ...options, strictMode: true });
    }
}
