/**
 * public/favicon.svg (Turnuvaist Taekwondo) -> build/icon.ico
 * Electron Windows ikonu için ana turnuva simgesi kullanılır.
 */
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const toIco = require('to-ico');

async function main() {
  const svgPath = path.join(__dirname, '..', 'public', 'favicon.svg');
  const outDir = path.join(__dirname, '..', 'build');
  const outPath = path.join(outDir, 'icon.ico');

  const sizes = [256, 128, 64, 48, 32, 16];
  const pngBuffers = await Promise.all(
    sizes.map((size) =>
      sharp(svgPath).resize(size, size).png().toBuffer()
    )
  );

  const ico = await toIco(pngBuffers);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, ico);
  console.log('build/icon.ico oluşturuldu (Turnuvaist simgesi).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
