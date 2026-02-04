
import { EventEmitter } from 'events';
import { ExtensionState } from './types';
import type { ExtensionManagerEvents, ExtensionStateChangeEvent } from './types';

/**
 * Extension State Manager (Content Script)
 * Manages the interactive state of the extension: Idle, Hidden, Ongoing, Takeover.
 */
export class ExtensionStateManager extends EventEmitter {
    private _currentState: ExtensionState;

    constructor(initialState: ExtensionState = ExtensionState.Idle) {
        super();
        this._currentState = initialState;
    }

    /**
     * Get the current state
     */
    get state(): ExtensionState {
        return this._currentState;
    }

    /**
     * Transition to a new state
     * @param newState The target state to transition to
     */
    setState(newState: ExtensionState): void {
        if (this._currentState === newState) return;

        const oldState = this._currentState;
        this._currentState = newState;

        const event: ExtensionStateChangeEvent = {
            newState,
            oldState,
            timestamp: Date.now(),
        };

        this.emit('state_changed', event);
    }

    /**
     * Set state to Idle
     */
    setIdle(): void {
        this.setState(ExtensionState.Idle);
    }

    /**
     * Set state to Hidden
     */
    setHidden(): void {
        this.setState(ExtensionState.Hidden);
    }

    /**
     * Set state to Ongoing
     */
    setOngoing(): void {
        this.setState(ExtensionState.Ongoing);
    }

    /**
     * Set state to Takeover
     */
    setTakeover(): void {
        this.setState(ExtensionState.Takeover);
    }

    /**
     * Check if currently in a specific state
     */
    is(state: ExtensionState): boolean {
        return this._currentState === state;
    }
}

/**
 * Type-safe interface for ExtensionStateManager
 */
export interface ExtensionStateManager {
    on<K extends keyof ExtensionManagerEvents>(
        event: K,
        listener: (...args: ExtensionManagerEvents[K]) => void
    ): this;
    emit<K extends keyof ExtensionManagerEvents>(
        event: K,
        ...args: ExtensionManagerEvents[K]
    ): boolean;
    off<K extends keyof ExtensionManagerEvents>(
        event: K,
        listener: (...args: ExtensionManagerEvents[K]) => void
    ): this;
}
