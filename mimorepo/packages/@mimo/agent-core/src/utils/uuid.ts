import { v4 as uuidv4Module } from 'uuid';
import { nanoid as nanoidModule } from 'nanoid';

/**
 * 生成UUID v4 (使用 uuid 包)
 */
export function uuidv4(): string {
    return uuidv4Module();
}

/**
 * 生成短UUID (用于消息ID)
 */
export function shortUuid(): string {
    return uuidv4Module().substring(0, 8);
}

/**
 * 生成Nano ID (使用 nanoid 包)
 * @param size ID长度 (默认21)
 */
export function nanoId(size?: number): string {
    return nanoidModule(size);
}
