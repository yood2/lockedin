const { desktopCapturer, screen } = require('electron');
const fs = require('fs');
const path = require('path');
const logger = require('../core/logger').createServiceLogger('CAPTURE');

class CaptureService {
  constructor() {
    this.isProcessing = false;
  }

  listDisplays() {
    try {
      const displays = screen.getAllDisplays().map(d => ({
        id: d.id,
        bounds: d.bounds,
        size: d.size,
        scaleFactor: d.scaleFactor,
        rotation: d.rotation,
        touchSupport: d.touchSupport || 'unknown'
      }));
      return { success: true, displays };
    } catch (error) {
      logger.error('Failed to list displays', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Capture screenshot and return an image buffer.
   * options: { displayId?: number, area?: { x, y, width, height } }
   */
  async captureAndProcess(options = {}) {
    if (this.isProcessing) throw new Error('Capture already in progress');
    this.isProcessing = true;
    const startTime = Date.now();
    try {
      const { image, metadata } = await this.captureScreenshot(options);

      // Crop if area specified
      let finalImage = image;
      if (options.area && this._isValidArea(options.area)) {
        try {
          finalImage = image.crop(options.area);
        } catch (e) {
          logger.warn('Crop failed, returning full image', { error: e.message, area: options.area });
        }
      }

      const buffer = finalImage.toPNG();
      
      // Save screenshot locally first
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screenshot_${timestamp}.png`;
      const screenshotsDir = path.join(__dirname, '../../screenshots');
      
      // Create screenshots directory if it doesn't exist
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }
      
      const filepath = path.join(screenshotsDir, filename);
      
      try {
        fs.writeFileSync(filepath, buffer);
        logger.debug('Screenshot saved locally', { filepath, size: buffer.length });
      } catch (saveError) {
        logger.warn('Failed to save screenshot locally', { error: saveError.message });
      }
      
      logger.logPerformance('Screenshot capture', startTime, {
        bytes: buffer.length,
        dimensions: finalImage.getSize(),
        savedTo: filepath
      });

      return {
        imageBuffer: buffer,
        mimeType: 'image/png',
        localPath: filepath,
        metadata: {
          timestamp: new Date().toISOString(),
          source: metadata,
          processingTime: Date.now() - startTime,
          savedLocally: true
        }
      };
    } finally {
      this.isProcessing = false;
    }
  }

  async captureScreenshot(options = {}) {
    const targetDisplay = this._getTargetDisplay(options.displayId);
    const { width, height } = targetDisplay.size || { width: 1920, height: 1080 };

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width, height }
    });

    if (sources.length === 0) {
      throw new Error('No screen sources available for capture');
    }

    // Find source matching the target display by comparing sizes as heuristic
    let source = sources[0];
    const match = sources.find(s => {
      const size = s.thumbnail.getSize();
      return size.width === width && size.height === height;
    });
    if (match) source = match;

    const image = source.thumbnail;
    if (!image) throw new Error('Failed to capture screen thumbnail');

    const imageSize = image.getSize();
    if (imageSize.width === 0 || imageSize.height === 0) {
      throw new Error('Screenshot has zero dimensions. This usually indicates missing screen recording permissions. Please grant permission in System Preferences > Security & Privacy > Privacy > Screen Recording.');
    }

    logger.debug('Screenshot captured successfully', {
      sourceName: source.name,
      imageSize: imageSize
    });

    return {
      image,
      metadata: {
        displayId: targetDisplay.id,
        sourceName: source.name,
        dimensions: image.getSize(),
        captureTime: new Date().toISOString()
      }
    };
  }

  _getTargetDisplay(displayId) {
    const all = screen.getAllDisplays();
    if (!all || all.length === 0) return screen.getPrimaryDisplay();
    if (displayId == null) return screen.getPrimaryDisplay();
    const found = all.find(d => d.id === displayId);
    return found || screen.getPrimaryDisplay();
  }

  _isValidArea(area) {
    return area && Number.isFinite(area.x) && Number.isFinite(area.y) &&
      Number.isFinite(area.width) && Number.isFinite(area.height) &&
      area.width > 0 && area.height > 0;
  }

  /**
   * Get list of saved screenshots
   */
  getSavedScreenshots() {
    const screenshotsDir = path.join(__dirname, '../../screenshots');
    
    if (!fs.existsSync(screenshotsDir)) {
      return [];
    }
    
    try {
      const files = fs.readdirSync(screenshotsDir)
        .filter(file => file.endsWith('.png'))
        .map(file => {
          const filepath = path.join(screenshotsDir, file);
          const stats = fs.statSync(filepath);
          return {
            filename: file,
            filepath: filepath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime
          };
        })
        .sort((a, b) => b.created - a.created); // Sort by newest first
      
      return files;
    } catch (error) {
      logger.error('Failed to list saved screenshots', { error: error.message });
      return [];
    }
  }

  /**
   * Clean up old screenshots (keep only last 10)
   */
  cleanupOldScreenshots(keepCount = 10) {
    const screenshots = this.getSavedScreenshots();
    
    if (screenshots.length <= keepCount) {
      return;
    }
    
    const toDelete = screenshots.slice(keepCount);
    
    toDelete.forEach(screenshot => {
      try {
        fs.unlinkSync(screenshot.filepath);
        logger.debug('Deleted old screenshot', { filename: screenshot.filename });
      } catch (error) {
        logger.warn('Failed to delete old screenshot', { 
          filename: screenshot.filename, 
          error: error.message 
        });
      }
    });
    
    logger.info('Cleaned up old screenshots', { 
      deleted: toDelete.length, 
      remaining: keepCount 
    });
  }
}

module.exports = new CaptureService();
