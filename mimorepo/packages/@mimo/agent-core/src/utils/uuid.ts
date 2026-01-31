import { v4 as uuidv4 } from 'uuid';
import { nanoid } from 'nanoid';

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
    return uuidv4();
}

/**
 * Generate a Nano ID
 * @param size ID length (default 21)
 */
export function generateNanoId(size?: number): string {
    return nanoid(size);
}

/**
 * Check if a string is a valid UUID (any version)
 */
export function isValidUUID(uuid: unknown): boolean {
    if (typeof uuid !== 'string') {
        return false;
    }
    // Accept UUID v1-v8 (any hex digit in version position)
    const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

/**
 * Validate a UUID, throw error if invalid
 */
export function validateUUID(uuid: unknown): string {
    if (!isValidUUID(uuid)) {
        throw new Error('Invalid UUID');
    }
    return uuid as string;
}

// Legacy exports for backward compatibility
export { uuidv4, nanoid };

/**
 * Legacy alias for generateUUID
 */
export function uuidv4Fn(): string {
    return generateUUID();
}

/**
 * Legacy alias for short UUID
 */
export function shortUuid(): string {
    return generateUUID().substring(0, 8);
}

/**
 * Legacy alias for generateNanoId
 */
export function nanoId(size?: number): string {
    return generateNanoId(size);
}
