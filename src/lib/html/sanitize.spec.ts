import { sanitizeHtml } from './sanitize';

describe('sanitizeHtml', () => {
  it('keeps paragraphs, lists, emphasis and web links', () => {
    expect(
      sanitizeHtml(
        '<p class="x">Hi <strong>there</strong></p><ul><li>One</li></ul><a href="https://a.b/c" onclick="x()">link</a>',
      ),
    ).toBe(
      '<p>Hi <strong>there</strong></p><ul><li>One</li></ul><a href="https://a.b/c" target="_blank" rel="noopener noreferrer">link</a>',
    );
  });

  it('drops scripts, handlers, unsafe links and unknown tags', () => {
    expect(
      sanitizeHtml(
        '<script>alert(1)</script><img src=x onerror="alert(1)"><div>Text <a href="javascript:alert(1)">bad</a></div>',
      ),
    ).toBe('Text <a>bad</a>');
  });
});
