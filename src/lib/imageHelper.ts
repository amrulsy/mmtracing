/**
 * Loads an image from a URL, draws it to an off-screen HTML canvas,
 * and extracts the raw ImageData needed for ESC/POS dithering.
 * Optimized for Web Bluetooth transfer speed.
 */
export async function loadImageToImageData(url: string, maxWidth: number = 384): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    
    img.onload = () => {
      // Limit actual drawn image size to make Bluetooth transfer faster
      // Smaller dimensions drastically reduce payload size for BLE
      const MAX_DRAW_WIDTH = 160;
      const MAX_DRAW_HEIGHT = 100;
      
      let drawWidth = img.width;
      let drawHeight = img.height;
      
      // Scale down if necessary
      if (drawWidth > MAX_DRAW_WIDTH) {
        const ratio = MAX_DRAW_WIDTH / drawWidth;
        drawWidth = MAX_DRAW_WIDTH;
        drawHeight = Math.round(drawHeight * ratio);
      }
      if (drawHeight > MAX_DRAW_HEIGHT) {
        const ratio = MAX_DRAW_HEIGHT / drawHeight;
        drawHeight = MAX_DRAW_HEIGHT;
        drawWidth = Math.round(drawWidth * ratio);
      }
      
      // Ensure canvas width is a multiple of 8 for standard ESC/POS bytes
      // We do NOT pad to maxWidth here; the printer's align(1) will center it.
      const canvasWidth = Math.floor(drawWidth / 8) * 8;
      
      // Re-adjust drawHeight slightly if we cropped width
      const finalHeight = drawHeight;
      
      const canvas = document.createElement("canvas");
      canvas.width = canvasWidth;
      canvas.height = finalHeight;
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        return reject(new Error("Cannot get 2D canvas context"));
      }
      
      // Fill with white background
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvasWidth, finalHeight);
      
      // Draw image
      ctx.drawImage(img, 0, 0, canvasWidth, finalHeight);
      
      resolve(ctx.getImageData(0, 0, canvasWidth, finalHeight));
    };
    
    img.onerror = () => reject(new Error(`Failed to load image from URL: ${url}`));
    img.src = url;
  });
}
