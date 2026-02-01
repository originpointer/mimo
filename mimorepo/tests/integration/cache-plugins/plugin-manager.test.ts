import { describe, it, expect } from 'vitest';
import { PluginManager, type CachePlugin } from '@mimo/agent-cache';

describe('Stage04 Cache Plugins - PluginManager', () => {
  it('register() initializes a plugin only once', async () => {
    const pm = new PluginManager();
    let initCount = 0;

    const plugin: CachePlugin = {
      name: 'p1',
      init: () => {
        initCount++;
      },
    };

    const first = await pm.register(plugin);
    const second = await pm.register(plugin);

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(initCount).toBe(1);
  });

  it('unregister() calls destroy() when provided', async () => {
    const pm = new PluginManager();
    let destroyCount = 0;

    const plugin: CachePlugin = {
      name: 'p2',
      init: () => {},
      destroy: () => {
        destroyCount++;
      },
    };

    await pm.register(plugin);
    const removed = await pm.unregister('p2');
    const removedAgain = await pm.unregister('p2');

    expect(removed).toBe(true);
    expect(removedAgain).toBe(false);
    expect(destroyCount).toBe(1);
  });

  it('getHooks(hookName) returns hooks in registration order', async () => {
    const pm = new PluginManager();

    const h1 = async () => {};
    const h2 = async () => {};

    await pm.register({ name: 'a', hooks: { afterTrack: h1 } });
    await pm.register({ name: 'b', hooks: { afterTrack: h2 } });

    const hooks = pm.getHooks('afterTrack');
    expect(hooks).toHaveLength(2);
    expect(hooks[0]).toBe(h1);
    expect(hooks[1]).toBe(h2);
  });
});

