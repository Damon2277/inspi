#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Create proper PNG icons using HTML5 Canvas in Node.js
async function createCanvasIcons() {
  const sizes = [144, 192];
  const iconsDir = path.join(__dirname, '../public/icons');
  
  // Ensure icons directory exists
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  // Since we can't use Canvas in Node.js without additional dependencies,
  // let's create a proper PNG using a different approach
  // We'll create a simple colored PNG programmatically
  
  const createColoredPNG = (size, color = '#FF8C00') => {
    // Create a simple PNG with proper headers
    // This is a more robust approach than the previous one
    
    // Convert hex color to RGB
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    
    // Create PNG data
    const width = size;
    const height = size;
    const bytesPerPixel = 4; // RGBA
    const rowBytes = width * bytesPerPixel;
    const pixelData = Buffer.alloc(height * (rowBytes + 1)); // +1 for filter byte per row
    
    // Fill with color
    for (let y = 0; y < height; y++) {
      const rowStart = y * (rowBytes + 1);
      pixelData[rowStart] = 0; // Filter type (0 = None)
      
      for (let x = 0; x < width; x++) {
        const pixelStart = rowStart + 1 + (x * bytesPerPixel);
        pixelData[pixelStart] = r;     // Red
        pixelData[pixelStart + 1] = g; // Green
        pixelData[pixelStart + 2] = b; // Blue
        pixelData[pixelStart + 3] = 255; // Alpha (fully opaque)
      }
    }
    
    // Create PNG chunks
    const chunks = [];
    
    // IHDR chunk
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;  // Bit depth
    ihdr[9] = 6;  // Color type (RGBA)
    ihdr[10] = 0; // Compression method
    ihdr[11] = 0; // Filter method
    ihdr[12] = 0; // Interlace method
    
    chunks.push(createChunk('IHDR', ihdr));
    
    // IDAT chunk (compressed pixel data)
    const zlib = require('zlib');
    const compressedData = zlib.deflateSync(pixelData);
    chunks.push(createChunk('IDAT', compressedData));
    
    // IEND chunk
    chunks.push(createChunk('IEND', Buffer.alloc(0)));
    
    // Combine PNG signature + chunks
    const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    return Buffer.concat([pngSignature, ...chunks]);
  };
  
  function createChunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    
    const typeBuffer = Buffer.from(type, 'ascii');
    const crc = require('crypto').createHash('crc32');
    crc.update(typeBuffer);
    crc.update(data);
    const crcBuffer = Buffer.alloc(4);
    crcBuffer.writeUInt32BE(parseInt(crc.digest('hex'), 16), 0);
    
    return Buffer.concat([length, typeBuffer, data, crcBuffer]);
  }

  // Create PNG files for each size
  for (const size of sizes) {
    const filename = `icon-${size}x${size}.png`;
    const filepath = path.join(iconsDir, filename);
    
    try {
      const pngData = createColoredPNG(size);
      fs.writeFileSync(filepath, pngData);
      console.log(`Created ${filename} (${pngData.length} bytes)`);
    } catch (error) {
      console.error(`Failed to create ${filename}:`, error);
    }
  }
}

createCanvasIcons().catch(console.error);