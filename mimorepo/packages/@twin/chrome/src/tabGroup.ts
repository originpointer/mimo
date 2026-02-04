import { EventEmitter } from 'events';
import { TabGroupState, TabGroupColor } from './types';
import { TwinControlCenter } from './controlCenter';

export class TabGroup extends EventEmitter {
    private _state: TabGroupState;
    private _controlCenter?: TwinControlCenter;

    constructor(state: TabGroupState, controlCenter?: TwinControlCenter) {
        super();
        this._state = { ...state };
        this._controlCenter = controlCenter;
    }

    // ========== 属性访问器 ==========

    get id(): number {
        return this._state.id;
    }

    get collapsed(): boolean {
        return this._state.collapsed;
    }

    get color(): TabGroupColor {
        return this._state.color;
    }

    get title(): string | undefined {
        return this._state.title;
    }

    get windowId(): number {
        return this._state.windowId;
    }

    // ========== 同步更新方法 ==========

    /**
     * Update internal state from a state object
     * @param state New state
     */
    updateFromState(state: TabGroupState): void {
        const changes: Partial<TabGroupState> = {};

        if (this._state.collapsed !== state.collapsed) changes.collapsed = state.collapsed;
        if (this._state.color !== state.color) changes.color = state.color;
        if (this._state.title !== state.title) changes.title = state.title;
        if (this._state.windowId !== state.windowId) changes.windowId = state.windowId;

        this._state = { ...state };

        if (Object.keys(changes).length > 0) {
            this.emit('updated', changes);
        }
    }

    // ========== 操作方法 (通过 TwinControlCenter) ==========

    /**
     * Update group properties (title, color, collapsed)
     */
    async update(properties: { collapsed?: boolean; color?: TabGroupColor; title?: string }): Promise<void> {
        if (!this._controlCenter) {
            console.warn(`TabGroup ${this.id}: Control center not available for update`);
            return;
        }

        await this._controlCenter.dispatch('browser_update_tab_group', {
            groupId: this.id,
            ...properties
        });
    }

    /**
     * Collapse or expand the group
     */
    async collapse(collapsed: boolean): Promise<void> {
        return this.update({ collapsed });
    }

    /**
     * Move the group to a new index
     */
    async move(index: number, windowId?: number): Promise<void> {
        if (!this._controlCenter) {
            console.warn(`TabGroup ${this.id}: Control center not available for move`);
            return;
        }

        await this._controlCenter.dispatch('browser_move_tab_group', {
            groupId: this.id,
            index,
            windowId
        });
    }

    /**
     * To JSON
     */
    toJSON(): TabGroupState {
        return { ...this._state };
    }
}
