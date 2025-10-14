#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

const fonts = [
  {
    name: 'Inter Variable',
    url: 'https://rsms.me/inter/font-files/Inter-VariableFont_slnt,wght.woff2',
    file: 'Inter-Variable.woff2',
  },
  {
    name: 'Noto Sans SC Regular',
    url: 'https://fonts.gstatic.com/s/notosanssc/v20/k3kXo84MPvpLmixcA63oeALZTYKLBOXv.woff2',
    file: 'NotoSansSC-Regular.woff2',
  },
  {
    name: 'Noto Sans SC Medium',
    url: 'https://fonts.gstatic.com/s/notosanssc/v20/k3kWo84MPvpLmixcA63oeALZTYqlNv77Gg.woff2',
    file: 'NotoSansSC-Medium.woff2',
  },
];

const fontsDir = path.resolve(__dirname, '..', 'public', 'fonts');

function ensureFontsDir() {
  if (!fs.existsSync(fontsDir)) {
    fs.mkdirSync(fontsDir, { recursive: true });
  }
}

function downloadFont({ name, url, file }) {
  return new Promise((resolve, reject) => {
    const destination = path.join(fontsDir, file);
    const fileStream = fs.createWriteStream(destination);

    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download ${name}: ${response.statusCode}`));
          return;
        }

        response.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close(() => resolve(destination));
        });
      })
      .on('error', (error) => {
        fs.unlink(destination, () => reject(error));
      });
  });
}

async function main() {
  ensureFontsDir();

  for (const font of fonts) {
    process.stdout.write(`📥 Downloading ${font.name}... `);
    try {
      const location = await downloadFont(font);
      console.log(`done (${path.relative(process.cwd(), location)})`);
    } catch (error) {
      console.log('failed');
      console.error(error.message);
    }
  }

  console.log('\n✅ Fonts downloaded. If you are running the dev server,
    restart it to pick up the local fonts.');
}

main();
