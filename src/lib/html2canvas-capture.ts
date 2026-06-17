/**
 * html2canvas cannot parse modern CSS color functions (oklab/oklch) that Tailwind v4
 * emits in stylesheets. Inline resolved computed styles, then drop stylesheets.
 */
export function prepareClonedDocumentForHtml2Canvas(
  clonedDoc: Document,
  clonedRoot: HTMLElement
): void {
  const view = clonedDoc.defaultView;
  if (!view) return;

  const elements = [clonedRoot, ...clonedRoot.querySelectorAll<HTMLElement>("*")];
  for (const el of elements) {
    const computed = view.getComputedStyle(el);
    for (let i = 0; i < computed.length; i += 1) {
      const prop = computed.item(i);
      const value = computed.getPropertyValue(prop);
      if (!value) continue;
      el.style.setProperty(
        prop,
        value,
        computed.getPropertyPriority(prop)
      );
    }
  }

  clonedDoc
    .querySelectorAll('link[rel="stylesheet"], style')
    .forEach((node) => node.remove());
}
