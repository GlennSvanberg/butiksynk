const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

export const MAX_DISPLAY_NAME = 120;
export const MAX_CONTACT = 500;
export const MAX_NOTE = 2000;

export function assertHexColor(value: string, label: string): void {
  if (!HEX_COLOR.test(value)) {
    throw new Error(`${label} måste vara hex i formatet #RRGGBB.`);
  }
}

export function normalizeOptionalHex(
  value: string | undefined,
  label: string,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const t = value.trim();
  if (t.length === 0) {
    return undefined;
  }
  assertHexColor(t, label);
  return t;
}

export function trimToMax(
  value: string | undefined,
  max: number,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const t = value.trim();
  if (t.length === 0) {
    return undefined;
  }
  if (t.length > max) {
    throw new Error(`Fältet får högst ${max} tecken.`);
  }
  return t;
}
