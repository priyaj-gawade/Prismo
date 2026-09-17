/**
 * PosterEditor: Programmatic, non-destructive agent editability for browser-native posters.
 * Targets semantic elements by stable `data-od-id` attributes without fragile pixel coordinates.
 */

export interface EditableElement {
  id: string;
  tagName: string;
  content: string;
  attributes: Record<string, string>;
}

export class PosterEditor {
  /**
   * Discovers and inspects all semantic elements marked with `data-od-id`.
   */
  public static inspectElements(html: string): EditableElement[] {
    const openTagRegex = /<([a-zA-Z0-9-]+)\b([^>]*\bdata-od-id=["']([^"']+)["'][^>]*)(\/?)>/gi;
    const elements: EditableElement[] = [];
    let match: RegExpExecArray | null;

    while ((match = openTagRegex.exec(html)) !== null) {
      const tagName = match[1].toLowerCase();
      const rawAttrs = match[2];
      const id = match[3];
      const isSelfClosing = match[4] === '/' || ['img', 'input', 'hr', 'br'].includes(tagName);

      const attributes: Record<string, string> = {};
      const attrRegex = /([a-zA-Z0-9-]+)=["']([^"']*)["']/g;
      let aMatch: RegExpExecArray | null;
      while ((aMatch = attrRegex.exec(rawAttrs)) !== null) {
        attributes[aMatch[1]] = aMatch[2];
      }

      let content = '';
      if (!isSelfClosing) {
        const startIndex = match.index + match[0].length;
        const closeTag = `</${tagName}>`;
        const closeIndex = html.indexOf(closeTag, startIndex);
        if (closeIndex !== -1) {
          content = html.substring(startIndex, closeIndex).trim();
        }
      }

      elements.push({
        id,
        tagName,
        content,
        attributes
      });
    }

    return elements;
  }

  /**
   * Returns a list of all editable IDs present in the poster HTML.
   */
  public static listEditableIds(html: string): string[] {
    const elements = this.inspectElements(html);
    return Array.from(new Set(elements.map((e) => e.id)));
  }

  /**
   * Updates the inner text or markup of a semantic element targeted by data-od-id.
   */
  public static updateContent(html: string, dataOdId: string, newContent: string): string {
    const escapedId = dataOdId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(
      `(<([a-zA-Z0-9-]+)\\b[^>]*\\bdata-od-id=["']${escapedId}["'][^>]*>)([\\s\\S]*?)(<\\/\\2>)`,
      'i'
    );
    if (!regex.test(html)) {
      return html;
    }
    return html.replace(regex, `$1${newContent}$4`);
  }

  /**
   * Updates an attribute (e.g. src, alt, class) on an element targeted by data-od-id.
   */
  public static updateAttribute(
    html: string,
    dataOdId: string,
    attrName: string,
    attrValue: string
  ): string {
    const escapedId = dataOdId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tagRegex = new RegExp(
      `(<[a-zA-Z0-9-]+\\b[^>]*\\bdata-od-id=["']${escapedId}["'][^>]*>)`,
      'i'
    );

    const match = html.match(tagRegex);
    if (!match) return html;

    const originalTag = match[1];
    let newTag: string;

    const attrRegex = new RegExp(`\\b${attrName}=["'][^"']*["']`, 'i');
    if (attrRegex.test(originalTag)) {
      newTag = originalTag.replace(attrRegex, `${attrName}="${attrValue}"`);
    } else {
      // Insert attribute before closing >
      newTag = originalTag.replace(/\/?>$/, ` ${attrName}="${attrValue}"$&`);
    }

    return html.replace(originalTag, newTag);
  }

  /**
   * Programmatic update helper for an editable element: updates content and/or attributes.
   */
  public static editElement(
    html: string,
    dataOdId: string,
    patch: {
      text?: string;
      src?: string;
      alt?: string;
      className?: string;
    }
  ): string {
    let result = html;
    if (patch.text !== undefined) {
      result = this.updateContent(result, dataOdId, patch.text);
    }
    if (patch.src !== undefined) {
      result = this.updateAttribute(result, dataOdId, 'src', patch.src);
    }
    if (patch.alt !== undefined) {
      result = this.updateAttribute(result, dataOdId, 'alt', patch.alt);
    }
    if (patch.className !== undefined) {
      result = this.updateAttribute(result, dataOdId, 'class', patch.className);
    }
    return result;
  }
}
