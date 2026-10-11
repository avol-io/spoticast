/** Tags kept from episode descriptions; anything else keeps only its text. */
const ALLOWED = new Set([
  'P',
  'BR',
  'A',
  'B',
  'STRONG',
  'I',
  'EM',
  'U',
  'UL',
  'OL',
  'LI',
]);

function clean(source: Node, target: Node, doc: Document) {
  for (const child of Array.from(source.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      target.appendChild(doc.createTextNode(child.textContent ?? ''));
      continue;
    }
    if (!(child instanceof Element)) continue;
    if (child.tagName === 'SCRIPT' || child.tagName === 'STYLE') continue;
    if (!ALLOWED.has(child.tagName)) {
      clean(child, target, doc);
      continue;
    }
    const element = doc.createElement(child.tagName.toLowerCase());
    if (child.tagName === 'A') {
      const href = child.getAttribute('href') ?? '';
      // Only web and mail links: no javascript: or data: URLs.
      if (/^(https?:|mailto:)/i.test(href.trim())) {
        element.setAttribute('href', href.trim());
        element.setAttribute('target', '_blank');
        element.setAttribute('rel', 'noopener noreferrer');
      }
    }
    clean(child, element, doc);
    target.appendChild(element);
  }
}

/**
 * Keeps the formatting of an HTML episode description (paragraphs, lists,
 * emphasis, links) and drops everything else, attributes included.
 */
export function sanitizeHtml(html: string): string {
  const source = new DOMParser().parseFromString(html, 'text/html');
  const doc = document.implementation.createHTMLDocument('');
  const root = doc.createElement('div');
  clean(source.body, root, doc);
  return root.innerHTML;
}
