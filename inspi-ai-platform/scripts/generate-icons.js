#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 创建一个简单的Canvas来生成图标
function generateIcon(size, filename) {
  // 创建一个简单的SVG内容
  const svg = `<svg width="${size}" height="${size}" viewBox=
    "0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" rx="${size * 0.125}" fill="#FF8C00"/>
    <circle cx="${size * 0.5}" cy="${size * 0.4}" r="${size * 0.15}" fill="white"/>
    <rect x="${size * 0.35}" y="${size * 0.55}" width="${size * 0.3}" height=
      "${size * 0.05}" rx="${size * 0.025}" fill="white"/>
    <text x="${size * 0.5}" y="${size * 0.85}" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="${size * 0.08}" font-weight="bold">AI</text>
  </svg>`;
  
  // 将SVG保存为文件（在实际项目中，你可能需要使用sharp或其他库来转换为PNG）
  const svgPath = path.join(__dirname, '..', 'public', 'icons', filename.replace('.png', '.svg'));
  fs.writeFileSync(svgPath, svg);
  
  console.log(`Generated ${filename} (as SVG)`);
}

// 生成不同尺寸的图标
const sizes = [
  { size: 16, filename: 'icon-16x16.png' },
  { size: 32, filename: 'icon-32x32.png' },
  { size: 144, filename: 'icon-144x144.png' },
  { size: 192, filename: 'icon-192x192.png' },
];

sizes.forEach(({ size, filename }) => {
  generateIcon(size, filename);
});

console.log('Icon generation completed!');
console.log('Note: Generated as SVG files. For production,
  consider using a proper image conversion tool.');