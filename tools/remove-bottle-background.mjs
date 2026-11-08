import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = join(root, 'assets-src', 'aurelle-body.webp.jpg');
const outputDirectory = join(root, 'public', 'images', 'hero');
const pngPath = join(outputDirectory, 'aurelle-body-transparent.png');
const webpPath = join(outputDirectory, 'aurelle-body-transparent.webp');
const previewDirectory = join(tmpdir(), 'aurelle-bottle-previews');
const temporaryDirectory = await mkdtemp(join(tmpdir(), 'aurelle-rembg-'));
const removedPath = join(temporaryDirectory, 'removed.png');
const checkerTileSize = 26;
const checkerOriginX = 12;
const checkerOriginY = 10;

try {
  const sourceMetadata = await sharp(sourcePath).metadata();
  if (!sourceMetadata.width || !sourceMetadata.height) {
    throw new Error('The original bottle image has no readable dimensions.');
  }

  const python = process.env.PYTHON ?? 'python';
  const removeBackground = spawnSync(python, [
    '-c',
    [
      'import sys',
      'from rembg import new_session, remove',
      'session = new_session("u2net")',
      'source = open(sys.argv[1], "rb").read()',
      'result = remove(source, session=session)',
      'open(sys.argv[2], "wb").write(result)'
    ].join('; '),
    sourcePath,
    removedPath
  ], { encoding: 'utf8', stdio: 'inherit' });
  if (removeBackground.error) throw removeBackground.error;
  if (removeBackground.status !== 0) {
    throw new Error(`rembg exited with status ${removeBackground.status}.`);
  }

  const mask = await sharp(removedPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = mask.info;
  if (channels !== 4) throw new Error(`Expected RGBA from rembg, received ${channels} channels.`);

  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask.data[(y * width + x) * 4 + 3] < 8) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left || bottom < top) throw new Error('Background removal produced an empty alpha mask.');

  const padding = Math.ceil(Math.max(right - left + 1, bottom - top + 1) * 0.02);
  const crop = {
    left: Math.max(0, left - padding),
    top: Math.max(0, top - padding),
    width: Math.min(width, right + padding + 1) - Math.max(0, left - padding),
    height: Math.min(height, bottom + padding + 1) - Math.max(0, top - padding)
  };
  const cropped = await sharp(removedPath)
    .extract(crop)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width: cropWidth, height: cropHeight } = cropped.info;
  const rgba = Buffer.from(cropped.data);
  let removedCheckerPixels = 0;
  for (let y = 0; y < cropHeight; y++) {
    for (let x = 0; x < cropWidth; x++) {
      const offset = (y * cropWidth + x) * 4;
      const originalAlpha = cropped.data[offset + 3];
      let alpha = 255;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const sx = Math.max(0, Math.min(cropWidth - 1, x + ox));
          const sy = Math.max(0, Math.min(cropHeight - 1, y + oy));
          alpha = Math.min(alpha, cropped.data[(sy * cropWidth + sx) * 4 + 3]);
        }
      }

      rgba[offset + 3] = alpha;
      if (alpha === 0) {
        rgba[offset] = 0;
        rgba[offset + 1] = 0;
        rgba[offset + 2] = 0;
      } else if (originalAlpha > 0 && originalAlpha < 255) {
        for (let channel = 0; channel < 3; channel++) {
          rgba[offset + channel] = Math.min(255, Math.round(rgba[offset + channel] * 255 / originalAlpha));
        }
      }

      const sourceX = x + crop.left;
      const sourceY = y + crop.top;
      const tileX = Math.floor((sourceX - checkerOriginX) / checkerTileSize);
      const tileY = Math.floor((sourceY - checkerOriginY) / checkerTileSize);
      const expectedGray = (tileX + tileY) % 2 === 0 ? 247 : 209;
      const red = rgba[offset];
      const green = rgba[offset + 1];
      const blue = rgba[offset + 2];
      const luminance = (red + green + blue) / 3;
      const saturation = Math.max(red, green, blue) - Math.min(red, green, blue);
      if (alpha > 0 && saturation <= 12 && Math.abs(luminance - expectedGray) <= 10) {
        rgba[offset + 3] = 0;
        rgba[offset] = 0;
        rgba[offset + 1] = 0;
        rgba[offset + 2] = 0;
        removedCheckerPixels++;
      }
    }
  }

  const outputHeight = Math.min(cropHeight, 1600);
  let processed = sharp(rgba, { raw: { width: cropWidth, height: cropHeight, channels: 4 } });
  if (outputHeight < cropHeight) processed = processed.resize({ height: outputHeight, withoutEnlargement: true });
  const png = await processed.png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
  await mkdir(outputDirectory, { recursive: true });
  await mkdir(previewDirectory, { recursive: true });
  await sharp(png).toFile(pngPath);
  await sharp(png).webp({ quality: 90, alphaQuality: 100, effort: 6 }).toFile(webpPath);

  const finalImage = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const finalWidth = finalImage.info.width;
  const finalHeight = finalImage.info.height;
  const pixel = (x, y) => finalImage.data[(y * finalWidth + x) * 4 + 3];
  const corners = [
    pixel(0, 0),
    pixel(finalWidth - 1, 0),
    pixel(0, finalHeight - 1),
    pixel(finalWidth - 1, finalHeight - 1)
  ];

  let partialAlphaPixels = 0;
  let opaqueCheckerLikePixels = 0;
  for (let i = 0; i < finalWidth * finalHeight; i++) {
    const offset = i * 4;
    const alpha = finalImage.data[offset + 3];
    if (alpha > 0 && alpha < 255) partialAlphaPixels++;
    if (alpha < 250) continue;
    const [red, green, blue] = finalImage.data.subarray(offset, offset + 3);
    const sourceX = i % finalWidth + crop.left;
    const sourceY = Math.floor(i / finalWidth) + crop.top;
    const tileX = Math.floor((sourceX - checkerOriginX) / checkerTileSize);
    const tileY = Math.floor((sourceY - checkerOriginY) / checkerTileSize);
    const expectedGray = (tileX + tileY) % 2 === 0 ? 247 : 209;
    const luminance = (red + green + blue) / 3;
    const saturation = Math.max(red, green, blue) - Math.min(red, green, blue);
    if (saturation <= 12 && Math.abs(luminance - expectedGray) <= 10) opaqueCheckerLikePixels++;
  }
  const outputMetadata = await sharp(png).metadata();
  if (outputMetadata.channels !== 4 || corners.some(alpha => alpha !== 0)) {
    throw new Error(`Alpha verification failed: channels=${outputMetadata.channels}, corners=${corners.join(',')}.`);
  }

  await sharp(png).flatten({ background: '#12060a' }).png().toFile(join(previewDirectory, 'aurelle-on-dark.png'));
  await sharp(png).flatten({ background: '#e9dfd2' }).png().toFile(join(previewDirectory, 'aurelle-on-light.png'));
  const [pngStats, webpStats] = await Promise.all([stat(pngPath), stat(webpPath)]);

  console.log(JSON.stringify({
    source: sourcePath,
    sourceDimensions: `${sourceMetadata.width}x${sourceMetadata.height}`,
    crop: { ...crop, outputWidth: finalWidth, outputHeight: finalHeight },
    pngHasAlpha: outputMetadata.channels === 4,
    cornerAlpha: corners,
    partialAlphaPixels,
    removedCheckerPixels,
    opaqueCheckerLikePixels,
    outputBytes: { png: pngStats.size, webp: webpStats.size },
    outputs: { png: pngPath, webp: webpPath },
    previews: {
      dark: join(previewDirectory, 'aurelle-on-dark.png'),
      light: join(previewDirectory, 'aurelle-on-light.png')
    }
  }, null, 2));
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
