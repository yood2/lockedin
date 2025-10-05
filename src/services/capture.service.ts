import { desktopCapturer, screen, Display } from 'electron';
import fs from 'fs';
import path from 'path';

interface CaptureOptions {
  displayId?: number;
  area?: { x: number; y: number; width: number; height: number };
}

interface CaptureResult {
  imageBuffer: Buffer;
  mimeType: 'image/png';
  localPath: string;
}

class CaptureService {
  private isProcessing = false;

  listDisplays() {
    return screen.getAllDisplays().map(d => ({
      id: d.id,
      bounds: d.bounds,
      size: d.size,
      scaleFactor: d.scaleFactor,
      rotation: d.rotation,
      touchSupport: d.touchSupport || 'unknown'
    }));
  }

  async captureAndProcess(options: CaptureOptions = {}): Promise<CaptureResult> {
    if (this.isProcessing) throw new Error('Capture already in progress');
    this.isProcessing = true;

    try {
      const { image } = await this.captureScreenshot(options);

      let finalImage = image;
      if (options.area && this._isValidArea(options.area)) {
        try {
          finalImage = image.crop(options.area);
        } catch {
          // fallback to full image
        }
      }

      const buffer = finalImage.toPNG();

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screenshot_${timestamp}.png`;
      const screenshotsDir = path.join(__dirname, '../../screenshots');

      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }

      const filepath = path.join(screenshotsDir, filename);
      fs.writeFileSync(filepath, buffer);

      return {
        imageBuffer: buffer,
        mimeType: 'image/png',
        localPath: filepath
      };
    } finally {
      this.isProcessing = false;
    }
  }

  private async captureScreenshot(options: CaptureOptions = {}) {
    const targetDisplay = this._getTargetDisplay(options.displayId);
    const { width, height } = targetDisplay.size;

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width, height }
    });

    if (sources.length === 0) throw new Error('No screen sources available');

    // Match source by display size
    const source = sources.find(s => {
      const size = s.thumbnail.getSize();
      return size.width === width && size.height === height;
    }) || sources[0];

    const image = source.thumbnail;
    if (!image) throw new Error('Failed to capture screen');

    return { image };
  }

  private _getTargetDisplay(displayId?: number): Display {
    const all = screen.getAllDisplays();
    if (!all.length || displayId == null) return screen.getPrimaryDisplay();
    return all.find(d => d.id === displayId) || screen.getPrimaryDisplay();
  }

  private _isValidArea(area: { x: number; y: number; width: number; height: number }) {
    return area.width > 0 && area.height > 0;
  }

  getSavedScreenshots() {
    const screenshotsDir = path.join(__dirname, '../../screenshots');
    if (!fs.existsSync(screenshotsDir)) return [];

    return fs.readdirSync(screenshotsDir)
      .filter(file => file.endsWith('.png'))
      .map(file => path.join(screenshotsDir, file));
  }

  cleanupOldScreenshots(keepCount = 10) {
    const screenshots = this.getSavedScreenshots();
    const toDelete = screenshots.slice(keepCount);
    toDelete.forEach(file => fs.unlinkSync(file));
  }
}

export default new CaptureService();
