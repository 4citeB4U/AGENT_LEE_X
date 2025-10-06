/*
LEEWAY HEADER — DO NOT REMOVE
REGION: UI.UNKNOWN
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_ASCII: family=lucide glyph=layout-dashboard ICON_SIG=CD534113
5WH: WHAT=Module: RenderSinks.ts; WHY=standardize; WHO=RapidWebDevelop; WHERE=F:\4leeway-multitool\src\ui\RenderSinks.ts; WHEN=2025-10-05; HOW=React/Tailwind
SIG: 00000000
AGENTS: AZR, PHI3, GEMINI, QWEN, LLAMA, ECHO
SPDX-License-Identifier: MIT
*/

// D:\AGENT_LEE_X\src\ui\RenderSinks.ts
import type { GenOut } from '../engines/engine.types';

/**
 * Renders the output of an image generation engine to the appropriate DOM element.
 * It handles different data formats by updating either an <img> tag or a <canvas>.
 * @param img The HTMLImageElement to render base64 or blob data to.
 * @param canvas The HTMLCanvasElement to render raw pixel data to.
 * @param out The generation output from an ImageEngine.
 */
export function renderTo(
    img: HTMLImageElement, 
    canvas: HTMLCanvasElement, 
    out: GenOut
) {
  // Ensure elements are visible/hidden correctly
  img.style.display = 'none';
  canvas.style.display = 'none';

  if (out.type === 'base64') {
    img.style.display = 'block';
    img.src = `data:image/png;base64,${out.data}`;
  } else if (out.type === 'blob') {
    img.style.display = 'block';
    const url = URL.createObjectURL(out.data);
    // Revoke the object URL once the image is loaded to free up memory.
    img.onload = () => URL.revokeObjectURL(url);
    img.src = url;
  } else if (out.type === 'rgba') {
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error("Could not get 2D context from canvas.");
        return;
    }
    
    // Ensure canvas dimensions match the image data
    canvas.width = out.width;
    canvas.height = out.height;
    
    const imageData = new ImageData(out.data, out.width, out.height);
    ctx.putImageData(imageData, 0, 0);
  } else {
    console.warn("Unsupported GenOut type for rendering:", out);
  }
}
