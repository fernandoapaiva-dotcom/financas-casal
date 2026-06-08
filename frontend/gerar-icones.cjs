const fs = require('fs');
const path = require('path');

// Gera um PNG mínimo válido com fundo roxo e letra "F" branca
// usando apenas código puro (sem canvas) — PNG spec manual

// Implementação de PNG minimalista via Buffer raw
// Usaremos a lib "jimp" se disponível, senão geramos um PNG placeholder simples

try {
  // Tenta com sharp se disponível
  const sharp = require('sharp');
  
  function gerarComSharp(tamanho, arquivo) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${tamanho}" height="${tamanho}">
      <rect width="${tamanho}" height="${tamanho}" fill="#7c3aed"/>
      <text x="50%" y="50%" font-family="Arial,sans-serif" font-size="${Math.floor(tamanho*0.55)}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">F</text>
    </svg>`;
    return sharp(Buffer.from(svg)).png().toFile(arquivo);
  }
  
  Promise.all([
    gerarComSharp(192, 'public/icon-192.png'),
    gerarComSharp(512, 'public/icon-512.png'),
  ]).then(() => console.log('Ícones gerados com sharp')).catch(err => { throw err; });
  
} catch(e) {
  // Fallback: gerar SVG e converter com Inkscape ou simplesmente criar arquivo placeholder válido
  // Geramos um PNG 1x1 roxo puro como placeholder
  
  // PNG header + IHDR + IDAT + IEND para imagem 1x1 roxa
  // Iremos gerar SVGs que o browser aceita como ícone de fallback
  const svg192 = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192">
    <rect width="192" height="192" fill="#7c3aed"/>
    <text x="96" y="96" font-family="Arial" font-size="105" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">F</text>
  </svg>`;
  
  const svg512 = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
    <rect width="512" height="512" fill="#7c3aed"/>
    <text x="256" y="256" font-family="Arial" font-size="280" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">F</text>
  </svg>`;
  
  fs.writeFileSync('public/icon-192.svg', svg192);
  fs.writeFileSync('public/icon-512.svg', svg512);
  
  // Criar PNG válidos minimalistas (roxos) via Buffer
  // PNG signature + chunks mínimos
  function criarPNGRoxo(tamanho) {
    const { createDeflate } = require('zlib');
    // Usamos pngjs se disponível
    try {
      const PNG = require('pngjs').PNG;
      const png = new PNG({ width: tamanho, height: tamanho });
      for (let y = 0; y < tamanho; y++) {
        for (let x = 0; x < tamanho; x++) {
          const idx = (tamanho * y + x) * 4;
          png.data[idx] = 124;   // R
          png.data[idx+1] = 58; // G
          png.data[idx+2] = 237; // B
          png.data[idx+3] = 255; // A
        }
      }
      return PNG.sync.write(png);
    } catch(e2) {
      console.log('pngjs não disponível:', e2.message);
      return null;
    }
  }
  
  const buf192 = criarPNGRoxo(192);
  const buf512 = criarPNGRoxo(512);
  
  if (buf192) fs.writeFileSync('public/icon-192.png', buf192);
  if (buf512) fs.writeFileSync('public/icon-512.png', buf512);
  
  if (buf192 && buf512) {
    console.log('Ícones PNG gerados com pngjs');
  } else {
    console.log('SVGs de fallback criados. Instale sharp ou pngjs para PNGs: npm i -g sharp');
  }
}
