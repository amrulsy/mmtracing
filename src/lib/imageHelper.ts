/**
 * Loads an image from a URL, draws it to an off-screen HTML canvas,
 * and extracts the raw ImageData needed for ESC/POS dithering.
 */
export async function loadImageToImageData(url: string, maxWidth: number = 384): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    
    img.onload = () => {
      // Limit actual drawn image size to make Bluetooth transfer faster (max 250x150)
      const MAX_DRAW_WIDTH = 250;
      const MAX_DRAW_HEIGHT = 150;
      
      let drawWidth = img.width;
      let drawHeight = img.height;
      
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
      
      // Keep canvas width = maxWidth (e.g. 384) to guarantee centering
      // Ensure maxWidth is a multiple of 8 for standard ESC/POS bytes
      const canvasWidth = Math.floor(maxWidth / 8) * 8;
      const canvasHeight = drawHeight;
      
      const canvas = document.createElement("canvas");
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        return reject(new Error("Cannot get 2D canvas context"));
      }
      
      // Fill with white background
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      
      // Draw image centered
      const xOffset = Math.round((canvasWidth - drawWidth) / 2);
      ctx.drawImage(img, xOffset, 0, drawWidth, drawHeight);
      
      resolve(ctx.getImageData(0, 0, canvasWidth, canvasHeight));
    };
    
    img.onerror = () => reject(new Error(`Failed to load image from URL: ${url}`));
    img.src = url;
  });
}
