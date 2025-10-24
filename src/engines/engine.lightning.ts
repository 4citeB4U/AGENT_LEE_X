import * as lightning from '../services/lightningService';
import type { GenOut, GenReq, ImageEngine } from './engine.types';

class LightningEngine implements ImageEngine {
  name = 'lightning';

  async available(): Promise<boolean> {
    return lightning.available();
  }

  async generate(req: GenReq): Promise<GenOut> {
    const dataUrl = await lightning.generateImageWithLightning(req.prompt);
    const base64Data = dataUrl.split(',')[1];
    if (!base64Data) throw new Error('Invalid base64 from Lightning');
    return { type: 'base64', data: base64Data };
  }
}

const lightningEngine = new LightningEngine();
export default lightningEngine;
