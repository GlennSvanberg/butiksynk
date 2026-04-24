declare module "exif-parser" {
  export interface ExifParseResult {
    tags?: { Orientation?: number; [key: string]: unknown };
  }
  export interface ExifParserHandle {
    parse: () => ExifParseResult;
  }
  export function create(buffer: Buffer): ExifParserHandle;
  const _default: { create: typeof create };
  export default _default;
}
