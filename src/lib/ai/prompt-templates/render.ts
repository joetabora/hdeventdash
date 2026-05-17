/**
 * Replace `{{varName}}` placeholders in a template string.
 * Unknown keys become empty strings.
 */
export function interpolatePlaceholders(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{\{([\w.]+)\}\}/g, (_, key: string) => {
    const v = vars[key];
    return v ?? "";
  });
}
