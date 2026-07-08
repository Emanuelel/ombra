// Read an image File into a small square-ish JPEG data URL. Downscaling keeps avatars
// comfortably under the server's 400 KB cap (a 256px JPEG is ~10–40 KB) and speeds uploads.
// Falls back to the raw data URL if the canvas path is unavailable.
export async function fileToDataUrl(file: File, maxPx = 256, quality = 0.85): Promise<string> {
  const raw = await new Promise<string>((resolve, reject) => {
    const rd = new FileReader()
    rd.onload = () => resolve(String(rd.result))
    rd.onerror = () => reject(rd.error ?? new Error('read failed'))
    rd.readAsDataURL(file)
  })
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image()
      im.onload = () => resolve(im)
      im.onerror = () => reject(new Error('decode failed'))
      im.src = raw
    })
    const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
    const w = Math.max(1, Math.round(img.width * scale))
    const h = Math.max(1, Math.round(img.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return raw
    ctx.drawImage(img, 0, 0, w, h)
    return canvas.toDataURL('image/jpeg', quality)
  } catch {
    return raw
  }
}
