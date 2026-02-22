import { stripQuotedContent, sanitizeEmailHtml } from '../sanitize'

describe('stripQuotedContent', () => {
  describe('HTML stripping', () => {
    it('removes <blockquote> elements', () => {
      const html = '<p>New reply here</p><blockquote><p>Old message content</p></blockquote>'
      const result = stripQuotedContent(html, null)
      expect(result.html).toBe('<p>New reply here</p>')
      expect(result.text).toBeNull()
    })

    it('removes Gmail quote wrapper (gmail_quote)', () => {
      const html = '<p>My reply</p><div class="gmail_quote"><p>On Mon wrote:</p><p>Original text</p></div>'
      const result = stripQuotedContent(html, null)
      expect(result.html).toBe('<p>My reply</p>')
    })

    it('removes Gmail extra wrapper (gmail_extra)', () => {
      const html = '<p>Reply text</p><div class="gmail_extra"><br><div class="gmail_quote">quoted</div></div>'
      const result = stripQuotedContent(html, null)
      expect(result.html).toBe('<p>Reply text</p>')
    })

    it('removes Outlook appendonsend and everything after', () => {
      const html = '<p>Reply</p><div id="appendonsend"></div><hr><p>From: sender</p><p>Original</p>'
      const result = stripQuotedContent(html, null)
      expect(result.html).toBe('<p>Reply</p>')
    })

    it('removes Outlook message header block', () => {
      const html = '<p>Reply</p><div class="OutlookMessageHeader"><p>From: someone</p></div>'
      const result = stripQuotedContent(html, null)
      expect(result.html).toBe('<p>Reply</p>')
    })

    it('removes Yahoo quoted content', () => {
      const html = '<p>My response</p><div class="yahoo_quoted"><p>Previous message</p></div>'
      const result = stripQuotedContent(html, null)
      expect(result.html).toBe('<p>My response</p>')
    })

    it('removes "On ... wrote:" wrapper elements', () => {
      const html = '<p>Thanks!</p><p>On Mon, Jan 1, 2025 John wrote:</p><blockquote><p>Hi there</p></blockquote>'
      const result = stripQuotedContent(html, null)
      expect(result.html).toBe('<p>Thanks!</p>')
    })

    it('preserves content when no quotes are present', () => {
      const html = '<p>Just a normal email with no quotes</p>'
      const result = stripQuotedContent(html, null)
      expect(result.html).toBe('<p>Just a normal email with no quotes</p>')
    })

    it('returns null for null HTML input', () => {
      const result = stripQuotedContent(null, null)
      expect(result.html).toBeNull()
    })

    it('preserves Hebrew content in the reply', () => {
      const html = '<p>שלום, תודה על ההודעה</p><blockquote><p>הודעה מקורית</p></blockquote>'
      const result = stripQuotedContent(html, null)
      expect(result.html).toBe('<p>שלום, תודה על ההודעה</p>')
    })

    it('cleans up empty tags left after stripping', () => {
      const html = '<p>Reply</p><div></div><blockquote><p>Quoted</p></blockquote><p></p>'
      const result = stripQuotedContent(html, null)
      expect(result.html).toBe('<p>Reply</p>')
    })

    it('handles nested blockquotes', () => {
      const html = '<p>Reply</p><blockquote><p>Level 1</p><blockquote><p>Level 2</p></blockquote></blockquote>'
      const result = stripQuotedContent(html, null)
      expect(result.html).toBe('<p>Reply</p>')
    })
  })

  describe('text stripping', () => {
    it('removes lines starting with >', () => {
      const text = 'My reply\n\n> Original message\n> More quoted text'
      const result = stripQuotedContent(null, text)
      expect(result.text).toBe('My reply')
      expect(result.html).toBeNull()
    })

    it('stops at "On ... wrote:" separator', () => {
      const text = 'Thanks for the info!\n\nOn Mon, Jan 1, 2025 John Smith wrote:\n> Original text here'
      const result = stripQuotedContent(null, text)
      expect(result.text).toBe('Thanks for the info!')
    })

    it('stops at "Original Message" separator', () => {
      const text = 'My reply\n\n-------- Original Message --------\nFrom: sender\nSubject: test'
      const result = stripQuotedContent(null, text)
      expect(result.text).toBe('My reply')
    })

    it('stops at Hebrew "הודעה מקורית" separator', () => {
      const text = 'תשובה שלי\n\n-------- הודעה מקורית --------\nמאת: שולח'
      const result = stripQuotedContent(null, text)
      expect(result.text).toBe('תשובה שלי')
    })

    it('stops at Outlook "From: ... Sent:" header block', () => {
      const text = 'My reply\n\nFrom: John Smith\nSent: Monday, January 1, 2025\nSubject: Hello'
      const result = stripQuotedContent(null, text)
      expect(result.text).toBe('My reply')
    })

    it('preserves content when no quotes are present', () => {
      const text = 'Just a normal email\nwith multiple lines\nand no quoted content'
      const result = stripQuotedContent(null, text)
      expect(result.text).toBe('Just a normal email\nwith multiple lines\nand no quoted content')
    })

    it('returns null for null text input', () => {
      const result = stripQuotedContent(null, null)
      expect(result.text).toBeNull()
    })

    it('handles text with mixed quoted and non-quoted lines', () => {
      const text = 'First line of reply\nSecond line of reply\n\n> Quoted line 1\n> Quoted line 2'
      const result = stripQuotedContent(null, text)
      expect(result.text).toBe('First line of reply\nSecond line of reply')
    })
  })

  describe('combined HTML and text', () => {
    it('strips both HTML and text independently', () => {
      const html = '<p>HTML reply</p><blockquote><p>HTML quoted</p></blockquote>'
      const text = 'Text reply\n\n> Text quoted'
      const result = stripQuotedContent(html, text)
      expect(result.html).toBe('<p>HTML reply</p>')
      expect(result.text).toBe('Text reply')
    })
  })
})

describe('sanitizeEmailHtml', () => {
  it('preserves class and id attributes for quote detection', () => {
    const dirty = '<div class="gmail_quote"><p>Quoted</p></div>'
    const sanitized = sanitizeEmailHtml(dirty)
    expect(sanitized).toContain('class="gmail_quote"')
  })

  it('preserves blockquote tags', () => {
    const dirty = '<blockquote><p>Quoted text</p></blockquote>'
    const sanitized = sanitizeEmailHtml(dirty)
    expect(sanitized).toContain('<blockquote>')
  })

  it('strips script tags', () => {
    const dirty = '<p>Safe</p><script>alert("xss")</script>'
    const sanitized = sanitizeEmailHtml(dirty)
    expect(sanitized).not.toContain('<script>')
    expect(sanitized).toContain('<p>Safe</p>')
  })
})
