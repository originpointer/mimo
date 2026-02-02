/**
 * Mozilla Readability Page Content Extraction Tool Types
 *
 * This tool uses Mozilla's Readability library to efficiently extract
 * the main content from web pages, avoiding the need to load entire pages.
 */

export const READABILITY_EXTRACT = "READABILITY_EXTRACT" as const

/**
 * Options for configuring the Readability parser
 */
export type ReadabilityExtractOptions = {
  /**
   * Maximum number of elements to parse (0 = no limit)
   * Useful for performance on very large documents
   */
  maxElemsToParse: number
  /**
   * Number of top candidate nodes to consider when determining main content
   * A higher number might lead to better results but could increase processing time
   */
  nbTopCandidates: number
  /**
   * Minimum number of characters required for a text node to be considered significant
   */
  charThreshold: number
  /**
   * Whether to preserve the original class names of elements
   */
  keepClasses: boolean
  /**
   * An array of class names to preserve (if keepClasses is true)
   */
  classesToPreserve: string[]
  /**
   * Whether to skip JSON-LD structured data parsing
   */
  disableJSONLD: boolean
}

/**
 * Payload for the readability extract request
 */
export type ReadabilityExtractPayload = {
  /**
   * Target tab ID for the extraction (used internally)
   */
  targetTabId?: number
  /**
   * Optional configuration for the Readability parser
   */
  options?: Partial<ReadabilityExtractOptions>
  /**
   * Output format preference
   * - 'html': Return HTML content only
   * - 'text': Return plain text content only
   * - 'both': Return both HTML and text content (default)
   */
  format?: 'html' | 'text' | 'both'
  /**
   * Maximum characters for text content (0 = no limit)
   * Applied only when format is 'text' or 'both'
   */
  maxChars?: number
  /**
   * Whether to include metadata (title, author, etc.)
   */
  includeMetadata?: boolean
}

/**
 * Extracted article data returned by Readability
 */
export type ReadabilityArticle = {
  /** Article title */
  title?: string
  /** HTML content of the article */
  content?: string
  /** Plain text content with HTML tags removed */
  textContent?: string
  /** Length of article content in characters */
  length?: number
  /** Article description or short excerpt */
  excerpt?: string
  /** Author byline */
  byline?: string
  /** Content direction (ltr/rtl) */
  dir?: string
  /** Name of the site */
  siteName?: string
  /** Content language */
  lang?: string
  /** Published time */
  publishedTime?: string
}

/**
 * Response from the readability extract operation
 */
export type ReadabilityExtractResponse =
  | {
      ok: true
      /** Extracted article data (null if page couldn't be parsed) */
      article: ReadabilityArticle | null
      /** Whether the page appears to be article-like based on quick check */
      isProbablyReaderable: boolean
      /** Metadata about the extraction operation */
      meta?: {
        /** Time taken for the extraction in milliseconds */
        durationMs?: number
        /** Tab ID where extraction was performed */
        tabId?: number
      }
    }
  | {
      ok: false
      /** Error message if extraction failed */
      error: string
    }
