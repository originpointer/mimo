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

        // 3. 转换 type 数组格式为 anyOf
        jsonSchema = this.convertTypeArrayToAnyOf(jsonSchema);

        // 4. 移除minItems (可选)
        if (options.removeMinItems) {
            jsonSchema = this.removeMinItems(jsonSchema);
        }

        // 5. 移除defaults (可选)
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
                // Recursively process all keys including properties
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
     * 将 type: [T1, T2, ...] 格式转换为 anyOf 格式
     * 处理 zod-to-json-schema 产生的简化联合类型格式
     */
    private static convertTypeArrayToAnyOf(schema: JsonSchema): JsonSchema {
        const convertNode = (node: any): any => {
            if (Array.isArray(node)) {
                return node.map(convertNode);
            }

            if (node && typeof node === 'object') {
                const newNode = { ...node };

                // Convert type: [T1, T2, ...] to anyOf: [{ type: T1 }, { type: T2 }, ...]
                if (Array.isArray(newNode.type) && newNode.type.length > 1) {
                    const types = newNode.type;
                    delete newNode.type;
                    newNode.anyOf = types.map((t: string) => ({ type: t }));
                }

                // Recursively process all properties
                Object.keys(newNode).forEach(key => {
                    newNode[key] = convertNode(newNode[key]);
                });

                return newNode;
            }

            return node;
        };

        return convertNode(schema);
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

    /**
     * 为JSON Schema添加严格模式约束
     * 添加 additionalProperties: false 到所有对象类型
     */
    static addStrictMode(schema: JsonSchema): JsonSchema {
        if (!schema || typeof schema !== 'object') {
            return schema;
        }

        const addStrictToNode = (node: any): any => {
            if (Array.isArray(node)) {
                return node.map(addStrictToNode);
            }

            if (node && typeof node === 'object') {
                const newNode = { ...node };

                // Add additionalProperties: false to object types
                if (newNode.type === 'object' && newNode.additionalProperties === undefined) {
                    newNode.additionalProperties = false;
                }

                // Recursively process all properties
                for (const key of Object.keys(newNode)) {
                    newNode[key] = addStrictToNode(newNode[key]);
                }

                return newNode;
            }

            return node;
        };

        return addStrictToNode(schema);
    }

    /**
     * 解析 anyOf 结构，尝试简化为更直接的形式
     * 对于简单的可选类型（如 anyOf: [type, null]），转换为 nullable
     * 对于联合类型，保持 anyOf 结构但优化子项
     */
    static resolveAnyOf(schema: JsonSchema): JsonSchema {
        if (!schema || typeof schema !== 'object') {
            return schema;
        }

        const resolveNode = (node: any): any => {
            if (Array.isArray(node)) {
                return node.map(resolveNode);
            }

            if (node && typeof node === 'object') {
                const newNode = { ...node };

                // Handle anyOf - try to simplify nullable patterns
                if (newNode.anyOf && Array.isArray(newNode.anyOf)) {
                    const anyOf = newNode.anyOf.map(resolveNode);

                    // Check for nullable pattern: anyOf: [{ type: 'T' }, { type: 'null' }]
                    if (anyOf.length === 2) {
                        const hasNull = anyOf.some(
                            (item: any) => item.type === 'null'
                        );
                        const nonNullItem = anyOf.find(
                            (item: any) => item.type !== 'null'
                        );

                        if (hasNull && nonNullItem) {
                            // Convert to nullable
                            const resolved = { ...nonNullItem };
                            if (resolved.type === 'object' || resolved.type === 'array') {
                                resolved.nullable = true;
                            } else {
                                // For primitive types, return array with null
                                return [nonNullItem.type, 'null'];
                            }
                            return resolved;
                        }
                    }

                    // Keep anyOf but process children
                    newNode.anyOf = anyOf;
                }

                // Recursively process all properties
                for (const key of Object.keys(newNode)) {
                    if (key !== 'anyOf') {
                        newNode[key] = resolveNode(newNode[key]);
                    }
                }

                return newNode;
            }

            return node;
        };

        return resolveNode(schema);
    }

    /**
     * 完整优化流程：展平引用 + 添加严格模式 + 解析 anyOf
     */
    static optimizeFull<T extends z.ZodType>(
        schema: T,
        options: SchemaOptimizeOptions = {}
    ): JsonSchema {
        let jsonSchema = zodToJsonSchema(schema, {
            target: 'jsonSchema7',
            strictMode: options.strictMode !== false,
        } as any);

        // Step 1: Flatten refs
        jsonSchema = this.flattenRefs(jsonSchema);

        // Step 2: Add strict mode
        if (options.strictMode !== false) {
            jsonSchema = this.addStrictMode(jsonSchema);
        }

        // Step 3: Resolve anyOf
        jsonSchema = this.resolveAnyOf(jsonSchema);

        // Step 4: Remove minItems (optional)
        if (options.removeMinItems) {
            jsonSchema = this.removeMinItems(jsonSchema);
        }

        // Step 5: Remove defaults (optional)
        if (options.removeDefaults) {
            jsonSchema = this.removeDefaults(jsonSchema);
        }

        return jsonSchema;
    }
}
