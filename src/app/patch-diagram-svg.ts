export function patchDiagramSvg(svg: string): string {
  let patched = svg;

  // Add class to <text> elements that are participant labels
  patched = patched.replace(
    /(<text[^>]*data-id="actor-([^"]+)"[^>]*>)([^<]+)(<\/text>)/g,
    (m: any, p1: any, p2: any, p3: any, p4: any) => {
      if (p1.includes('class="')) {
        return p1.replace('class="', 'class="participant-label ') + p3 + p4;
      } else {
        return p1.replace('<text', '<text class="participant-label"') + p3 + p4;
      }
    }
  );

  // Add class to <rect> elements that are actor-top or actor-bottom
  patched = patched.replace(
    /(<rect[^>]*class="[^"]*actor-(top|bottom)[^"]*"[^>]*>)/g,
    (m: any, rectTag: string, actorType: string) => {
      if (rectTag.includes('class="')) {
        return rectTag.replace('class="', 'class="participant-rect ');
      } else {
        return rectTag.replace('<rect', '<rect class="participant-rect"');
      }
    }
  );
  // Add class and data-action-idx to message text elements (arrows)
  // This regex matches <text ...>message</text> for arrows
  let actionIdx = 0;
  patched = patched.replace(
    /(<text[^>]*>)([^<]+)(<\/text>)/g,
    (m: any, p1: any, p2: any, p3: any) => {
      // Only patch if this is likely a message (not a participant label)
      if (p1.includes('participant-label')) return m;
      // Heuristic: message text is not a number and not empty
      if (/^\s*\d+\s*$/.test(p2) || !p2.trim()) return m;
      // Add class and data-action-idx
      if (p1.includes('class="')) {
        return (
          p1.replace('class="', `class="messageText `) +
          `<tspan data-action-idx="${actionIdx++}">${p2}</tspan>` +
          p3
        );
      } else {
        return (
          p1.replace('<text', `<text class="messageText"`) +
          `<tspan data-action-idx="${actionIdx++}">${p2}</tspan>` +
          p3
        );
      }
    }
  );
  return patched;
}
