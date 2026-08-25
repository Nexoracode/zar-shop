/**
 * Reads an image's pixel size in the browser before it is uploaded.
 *
 * The project has no image-processing dependency, and adding one server-side to read two numbers
 * is not worth the weight. The values are only ever used for display and for `width`/`height`
 * hints, so a browser-reported size is good enough; nothing is trusted to it.
 */
export async function readImageDimensions(file: File): Promise<{ width?: number; height?: number }> {
  if (!file.type.startsWith("image/")) return {};
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    // An unsupported or corrupt image should still upload; it just arrives without dimensions.
    return {};
  }
}
