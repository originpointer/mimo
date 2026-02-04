
import { EventEmitter } from 'events';
import type { SystemState, SystemManagerEvents, SystemStateChangeEvent } from './types';

/**
 * System State Manager (Background Session)
 * Manages the lifecycle state of the background session.
 */
export class SystemStateManager extends EventEmitter {
    private _currentState: SystemState;

    constructor(initialState: SystemState = 'stopped') {
        super();
        this._currentState = initialState;
    }

    /**
     * Get the current state
     */
    get state(): SystemState {
        return this._currentState;
    }

    /**
     * Transition to a new state
     * @param newState The target state to transition to
     */
    setState(newState: SystemState): void {
        if (this._currentState === newState) return;

        const oldState = this._currentState;
        this._currentState = newState;

        const event: SystemStateChangeEvent = {
            newState,
            oldState,
            timestamp: Date.now(),
        };

        this.emit('state_changed', event);
    }

    /**
     * Helper methods for setting specific states
     */

    setRunning(): void {
        this.setState('running');
    }

    setStopped(): void {
        this.setState('stopped');
    }

    setTakeover(): void {
        this.setState('takeover');
    }

    setOngoing(): void {
        this.setState('ongoing');
    }

    setCompleted(): void {
        this.setState('completed');
    }

    setWaiting(): void {
        this.setState('waiting');
    }

    setError(): void {
        this.setState('error');
    }

    /**
     * Check if currently in a specific state
     */
    is(state: SystemState): boolean {
        return this._currentState === state;
    }
}

/**
 * Type-safe interface for SystemStateManager
 */
export interface SystemStateManager {
    on<K extends keyof SystemManagerEvents>(
        event: K,
        listener: (...args: SystemManagerEvents[K]) => void
    ): this;
    emit<K extends keyof SystemManagerEvents>(
        event: K,
        ...args: SystemManagerEvents[K]
    ): boolean;
    off<K extends keyof SystemManagerEvents>(
        event: K,
        listener: (...args: SystemManagerEvents[K]) => void
    ): this;
}
