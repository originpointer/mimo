/**
 * Stagehand XPath Manager
 *
 * Manages CDP-based XPath scanning and tool coordination.
 * This class focuses ONLY on:
 * - 8 library class instantiations
 * - CDP coordination logic
 * - Tool execution coordination
 * - Extension registration
 *
 * Message routing is handled by MessageRouter and handler registries.
 */

import { registerExtensionId } from '@/apis';
import { StagehandXPathScanner } from '../libs/StagehandXPathScanner';
import { StagehandViewportScreenshotter } from '../libs/StagehandViewportScreenshotter';
import { ResumeBlocksExtractor } from '../libs/ResumeBlocksExtractor';
import { ResumeXpathValidator } from '../libs/ResumeXpathValidator';
import { JsonCommonXpathFinder } from '../libs/JsonCommonXpathFinder';
import { XpathMarker } from '../libs/XpathMarker';
import { XpathHtmlGetter } from '../libs/XpathHtmlGetter';
import { TabGroupManager } from '../libs/TabGroupManager';
import { ReadabilityExtractor } from '../libs/ReadabilityExtractor';

/**
 * Stagehand XPath Manager
 *
 * Core manager for CDP-based XPath scanning and related tools.
 * Maintains functional independence without message routing concerns.
 */
export class StagehandXPathManager {
  private readonly scanner: StagehandXPathScanner;
  private readonly screenshotter: StagehandViewportScreenshotter;
  private readonly resumeBlocksExtractor: ResumeBlocksExtractor;
  private readonly resumeXpathValidator: ResumeXpathValidator;
  private readonly jsonCommonXpathFinder: JsonCommonXpathFinder;
  private readonly xpathMarker: XpathMarker;
  private readonly xpathHtmlGetter: XpathHtmlGetter;
  private readonly tabGroupManager: TabGroupManager;
  private readonly readabilityExtractor: ReadabilityExtractor;

  constructor() {
    // Initialize all tool/library classes
    this.scanner = new StagehandXPathScanner();
    this.screenshotter = new StagehandViewportScreenshotter();
    this.resumeBlocksExtractor = new ResumeBlocksExtractor();
    this.resumeXpathValidator = new ResumeXpathValidator();
    this.jsonCommonXpathFinder = new JsonCommonXpathFinder();
    this.xpathMarker = new XpathMarker();
    this.xpathHtmlGetter = new XpathHtmlGetter();
    this.tabGroupManager = new TabGroupManager();
    this.readabilityExtractor = new ReadabilityExtractor();

    // Report extension ID to server
    this.reportExtensionId();

    console.log('[StagehandXPathManager] Initialized with CDP tools');
  }

  // ==================== Getters for Handler Registries ====================

  /**
   * Get the XPath scanner instance
   */
  getScanner(): StagehandXPathScanner {
    return this.scanner;
  }

  /**
   * Get the viewport screenshotter instance
   */
  getScreenshotter(): StagehandViewportScreenshotter {
    return this.screenshotter;
  }

  /**
   * Get the resume blocks extractor instance
   */
  getResumeBlocksExtractor(): ResumeBlocksExtractor {
    return this.resumeBlocksExtractor;
  }

  /**
   * Get the resume xpath validator instance
   */
  getResumeXpathValidator(): ResumeXpathValidator {
    return this.resumeXpathValidator;
  }

  /**
   * Get the JSON common xpath finder instance
   */
  getJsonCommonXpathFinder(): JsonCommonXpathFinder {
    return this.jsonCommonXpathFinder;
  }

  /**
   * Get the xpath marker instance
   */
  getXpathMarker(): XpathMarker {
    return this.xpathMarker;
  }

  /**
   * Get the xpath HTML getter instance
   */
  getXpathHtmlGetter(): XpathHtmlGetter {
    return this.xpathHtmlGetter;
  }

  /**
   * Get the tab group manager instance
   */
  getTabGroupManager(): TabGroupManager {
    return this.tabGroupManager;
  }

  /**
   * Get the Readability extractor instance
   */
  getReadabilityExtractor(): ReadabilityExtractor {
    return this.readabilityExtractor;
  }

  // ==================== Private Methods ====================

  /**
   * Report extension ID to the server
   *
   * This allows the server to identify and route commands to this extension.
   */
  private reportExtensionId(): void {
    const extensionId = chrome.runtime?.id;
    if (!extensionId) {
      console.warn('[StagehandXPathManager] extensionId not available');
      return;
    }

    const extensionName = chrome.runtime.getManifest?.().name;
    if (!extensionName) {
      console.warn('[StagehandXPathManager] extensionName not available');
      return;
    }

    registerExtensionId(extensionId, extensionName).catch((e) => {
      console.warn('[StagehandXPathManager] report extensionId failed', e);
    });

    console.log('[StagehandXPathManager] Extension ID reported:', extensionId);
  }

  /**
   * Clean up resources
   *
   * Call this when the extension is being unloaded.
   */
  destroy(): void {
    console.log('[StagehandXPathManager] Destroying manager');
    // No explicit cleanup needed for current implementation
    // This method is provided for future extensibility
  }
}
