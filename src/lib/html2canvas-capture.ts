const UNSUPPORTED_COLOR_RE = /oklab|oklch|lab\(|lch\(|color-mix\(/i;

const CAPTURE_STYLE_PROPS = [
  "color",
  "background-color",
  "background-image",
  "background-size",
  "background-position",
  "background-repeat",
  "border-top-width",
  "border-top-style",
  "border-top-color",
  "border-right-width",
  "border-right-style",
  "border-right-color",
  "border-bottom-width",
  "border-bottom-style",
  "border-bottom-color",
  "border-left-width",
  "border-left-style",
  "border-left-color",
  "border-radius",
  "box-shadow",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "line-height",
  "letter-spacing",
  "text-transform",
  "text-align",
  "text-decoration",
  "text-decoration-color",
  "display",
  "flex-direction",
  "flex-wrap",
  "align-items",
  "justify-content",
  "gap",
  "flex",
  "grid-template-columns",
  "width",
  "height",
  "min-width",
  "min-height",
  "max-width",
  "max-height",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "position",
  "top",
  "left",
  "right",
  "bottom",
  "z-index",
  "overflow",
  "opacity",
  "object-fit",
  "object-position",
  "white-space",
  "word-break",
  "vertical-align",
  "list-style-type",
  "transform",
  "box-sizing",
] as const;

let colorProbeCanvas: HTMLCanvasElement | null = null;

function cssColorToRgb(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "transparent" || trimmed === "currentcolor") {
    return trimmed;
  }

  colorProbeCanvas = colorProbeCanvas ?? document.createElement("canvas");
  colorProbeCanvas.width = 1;
  colorProbeCanvas.height = 1;
  const ctx = colorProbeCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return trimmed;

  try {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000000";
    ctx.fillStyle = trimmed;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    if (a === 0) return "transparent";
    return a === 255
      ? `rgb(${r}, ${g}, ${b})`
      : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(4)})`;
  } catch {
    return trimmed;
  }
}

function sanitizeCSSValue(property: string, value: string): string {
  if (!value || !UNSUPPORTED_COLOR_RE.test(value)) return value;

  if (property === "background-image") {
    return "none";
  }

  if (property === "box-shadow") {
    return value.replace(/oklab\([^)]*\)|oklch\([^)]*\)|lab\([^)]*\)|lch\([^)]*\)|color-mix\([^)]*\)/gi, (match) =>
      cssColorToRgb(match)
    );
  }

  if (
    property.includes("color") ||
    property === "border" ||
    property.includes("shadow")
  ) {
    return cssColorToRgb(value);
  }

  return value;
}

function isHTMLElement(node: Element): node is HTMLElement {
  return node instanceof HTMLElement;
}

function applyCaptureStyles(
  source: HTMLElement,
  target: HTMLElement,
  view: Window
): void {
  const computed = view.getComputedStyle(source);
  for (const prop of CAPTURE_STYLE_PROPS) {
    const raw = computed.getPropertyValue(prop);
    if (!raw) continue;
    const safe = sanitizeCSSValue(prop, raw);
    target.style.setProperty(prop, safe, computed.getPropertyPriority(prop));
  }
  target.removeAttribute("class");
}

/** Clone a report node with rgb-only inline styles (no Tailwind classes). */
export function buildCaptureClone(sourceRoot: HTMLElement): HTMLElement {
  const clone = sourceRoot.cloneNode(true) as HTMLElement;
  prepareElementTreeForCapture(sourceRoot, clone, window);
  return clone;
}

function prepareElementTreeForCapture(
  source: HTMLElement,
  target: HTMLElement,
  view: Window
): void {
  applyCaptureStyles(source, target, view);

  const sourceChildren = Array.from(source.children).filter(isHTMLElement);
  const targetChildren = Array.from(target.children).filter(isHTMLElement);
  const count = Math.min(sourceChildren.length, targetChildren.length);
  for (let i = 0; i < count; i += 1) {
    prepareElementTreeForCapture(sourceChildren[i], targetChildren[i], view);
  }
}

/**
 * html2canvas cannot parse Tailwind v4 oklab/oklch colors. Strip stylesheets in the
 * capture iframe and keep only sanitized inline styles.
 */
export function prepareClonedDocumentForHtml2Canvas(
  clonedDoc: Document,
  clonedRoot: HTMLElement
): void {
  const view = clonedDoc.defaultView;
  if (!view) return;

  const elements = [
    clonedRoot,
    ...clonedRoot.querySelectorAll<HTMLElement>("*"),
  ];
  for (const el of elements) {
    if (!(el instanceof HTMLElement)) continue;
    const computed = view.getComputedStyle(el);
    for (const prop of CAPTURE_STYLE_PROPS) {
      const raw = computed.getPropertyValue(prop);
      if (!raw) continue;
      const safe = sanitizeCSSValue(prop, raw);
      el.style.setProperty(prop, safe, computed.getPropertyPriority(prop));
    }
    el.removeAttribute("class");
  }

  clonedDoc.documentElement.style.backgroundColor = "#ffffff";
  clonedDoc.documentElement.style.color = "#141312";
  clonedDoc.body.style.backgroundColor = "#ffffff";
  clonedDoc.body.style.color = "#141312";
  clonedDoc.body.style.margin = "0";

  clonedDoc
    .querySelectorAll('link[rel="stylesheet"], style')
    .forEach((node) => node.remove());
}
