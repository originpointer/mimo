
import { BrowserTwinStore } from './src/store';
import { TabState, WindowState } from './src/types';

const store = new BrowserTwinStore();

// Create a window
const window: WindowState = {
    id: 1,
    focused: true,
    top: 0,
    left: 0,
    width: 1000,
    height: 800,
    type: 'normal',
    tabIds: [],
    lastUpdated: Date.now(),
};

store.applyEvent({
    type: 'window_created',
    window,
    timestamp: Date.now(),
});

// Create two tabs
const tab1: TabState = {
    id: 101,
    windowId: 1,
    url: 'https://example.com/1',
    title: 'Tab 1',
    favIconUrl: null,
    status: 'complete',
    active: true, // Initially active
    pinned: false,
    hidden: false,
    index: 0,
    openerTabId: null,
    lastUpdated: Date.now(),
};

const tab2: TabState = {
    id: 102,
    windowId: 1,
    url: 'https://example.com/2',
    title: 'Tab 2',
    favIconUrl: null,
    status: 'complete',
    active: false, // Initially inactive
    pinned: false,
    hidden: false,
    index: 1,
    openerTabId: null,
    lastUpdated: Date.now(),
};

store.applyEvent({
    type: 'tab_created',
    tab: tab1,
    timestamp: Date.now(),
});

store.applyEvent({
    type: 'tab_created',
    tab: tab2,
    timestamp: Date.now(),
});

console.log('--- Scenario 1: applyTabActivated ---');
// Activate tab2 via tab_activated event
store.applyEvent({
    type: 'tab_activated',
    tabId: 102,
    windowId: 1,
    timestamp: Date.now(),
});

console.log('Tab 1 active:', store.getTab(101)?.active);
console.log('Tab 2 active:', store.getTab(102)?.active);

if (store.getTab(101)?.active === false && store.getTab(102)?.active === true) {
    console.log('[PASS] Scenario 1');
} else {
    console.log('[FAIL] Scenario 1');
}


console.log('\n--- Scenario 2: applyTabUpdated (activating via update) ---');
// Set Tab 1 active via update
const tab1Active = { ...tab1, active: true };
store.applyEvent({
    type: 'tab_updated',
    tab: tab1Active,
    changes: { status: true },
    timestamp: Date.now(),
});

console.log('Tab 1 active:', store.getTab(101)?.active);
console.log('Tab 2 active:', store.getTab(102)?.active);

if (store.getTab(101)?.active === true && store.getTab(102)?.active === false) {
    console.log('[PASS] Scenario 2');
} else {
    console.log('[FAIL] Scenario 2');
}

console.log('\n--- Scenario 3: applyTabUpdated (non-active update) ---');
// Update Tab 1 title (should not change active status)
const tab1Updated = { ...tab1Active, title: 'New Title' };
store.applyEvent({
    type: 'tab_updated',
    tab: tab1Updated,
    changes: { title: true },
    timestamp: Date.now(),
});

console.log('Tab 1 active:', store.getTab(101)?.active);
console.log('Tab 2 active:', store.getTab(102)?.active);

if (store.getTab(101)?.active === true && store.getTab(102)?.active === false) {
    console.log('[PASS] Scenario 3');
} else {
    console.log('[FAIL] Scenario 3');
}

