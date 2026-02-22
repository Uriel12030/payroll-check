import sanitizeHtml from 'sanitize-html'

/**
 * Sanitize inbound HTML email body to prevent XSS.
 * Allows basic formatting tags only.
 */
export function sanitizeEmailHtml(dirty: string): string {
  return sanitizeHtml(dirty, {
    allowedTags: [
      'p', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li',
      'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'table', 'thead', 'tbody', 'tr', 'td', 'th',
      'div', 'span', 'img', 'hr',
    ],
    allowedAttributes: {
      'a': ['href', 'title', 'target', 'rel'],
      'img': ['src', 'alt', 'width', 'height'],
      'td': ['colspan', 'rowspan'],
      'th': ['colspan', 'rowspan'],
      '*': ['style', 'class', 'id'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedStyles: {
      '*': {
        'color': [/.*/],
        'background-color': [/.*/],
        'font-size': [/.*/],
        'text-align': [/.*/],
        'margin': [/.*/],
        'padding': [/.*/],
      },
    },
    // Force all links to open in new tab
    transformTags: {
      'a': sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
    },
  })
}

// ---------------------------------------------------------------------------
// Quoted / forwarded content stripping
// ---------------------------------------------------------------------------

/**
 * Strip quoted/forwarded content from an email reply.
 * Extracts only the NEW content, removing the quoted thread history
 * that email clients include in replies.
 */
export function stripQuotedContent(
  html: string | null,
  text: string | null,
): { html: string | null; text: string | null } {
  return {
    html: html ? stripQuotedHtml(html) : null,
    text: text ? stripQuotedText(text) : null,
  }
}

/**
 * Remove quoted content from HTML email bodies.
 * Handles Gmail, Outlook, Yahoo, Apple Mail and generic email clients.
 * Applied AFTER sanitization so the tag set is predictable.
 */
function stripQuotedHtml(html: string): string {
  let result = html

  // 1. Gmail quote wrapper — <div class="gmail_quote"> ... </div>
  //    Use a non-greedy match anchored to the class to avoid over-matching
  result = result.replace(/<div[^>]*class="gmail_quote"[^>]*>[\s\S]*$/gi, '')
  result = result.replace(/<div[^>]*class="gmail_extra"[^>]*>[\s\S]*$/gi, '')

  // 2. Outlook "appendonsend" — everything from this div onward is quoted
  result = result.replace(/<div[^>]*id="appendonsend"[^>]*>[\s\S]*$/gi, '')

  // 3. Outlook message header block
  result = result.replace(/<div[^>]*class="OutlookMessageHeader"[^>]*>[\s\S]*?<\/div>/gi, '')

  // 4. Yahoo quoted content
  result = result.replace(/<div[^>]*class="yahoo_quoted"[^>]*>[\s\S]*$/gi, '')

  // 5. <blockquote> elements (standard email quote wrapper in most clients)
  //    Remove all blockquotes and their content, including nested ones.
  //    Iterate until no more blockquotes remain (handles nesting).
  while (/<blockquote[^>]*>[\s\S]*?<\/blockquote>/i.test(result)) {
    result = result.replace(/<blockquote[^>]*>[\s\S]*?<\/blockquote>/gi, '')
  }
  // Clean up any orphaned closing </blockquote> tags left from nested structures
  result = result.replace(/<\/blockquote>/gi, '')

  // 6. "On ... wrote:" lines that typically precede the quoted section
  //    These appear as <p> or <div> elements containing "wrote:" / "כתב:" patterns
  result = result.replace(/<(p|div)[^>]*>[^<]*(?:wrote:|כתב:|написал:)[^<]*<\/\1>/gi, '')

  // 7. <hr> followed by only whitespace/empty tags (common separator before quotes)
  //    Only strip if it's at the end of meaningful content
  result = result.replace(/<hr[^>]*>\s*$/gi, '')

  // Clean up: remove empty tags left behind
  result = result.replace(/<(p|div|span)>\s*<\/\1>/gi, '')
  result = result.trim()

  return result
}

/**
 * Remove quoted content from plain-text email bodies.
 * Strips `>` quoted lines and "On ... wrote:" separators.
 */
function stripQuotedText(text: string): string {
  const lines = text.split('\n')
  const resultLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()

    // Stop at "On ... wrote:" separator
    if (/^On\s+.+\s+wrote:\s*$/i.test(trimmed)) break

    // Stop at "-------- Original Message --------" or Hebrew equivalent
    if (/^-{2,}\s*(Original Message|Forwarded message|הודעה מקורית)\s*-{2,}/i.test(trimmed)) break

    // Stop at "From: ..." header block (Outlook plain-text quote)
    if (/^From:\s+.+/i.test(trimmed) && i + 1 < lines.length && /^Sent:\s+/i.test(lines[i + 1].trim())) break

    // Skip individual quoted lines (lines starting with >)
    if (/^\s*>/.test(lines[i])) continue

    resultLines.push(lines[i])
  }

  // Trim trailing empty lines
  while (resultLines.length > 0 && resultLines[resultLines.length - 1].trim() === '') {
    resultLines.pop()
  }

  return resultLines.join('\n')
}
