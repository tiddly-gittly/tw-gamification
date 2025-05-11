const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// 获取项目根目录
const rootDir = path.join(__dirname, '..');
const inputDir = path.join(rootDir, 'src', 'project-babel-library', 'images', 'objects', 'raw', 'variants');
const outputDir = path.join(inputDir, 'cropped');

async function processImage(filePath) {
  const fileName = path.basename(filePath);
  const image = sharp(filePath);
  const metadata = await image.metadata();

  // 计算九分之一的高度
  const newHeight = Math.floor(metadata.height / 9);
  
  // 裁剪图片，保留最上面的九分之一
  await image
    .extract({ left: 0, top: 0, width: metadata.width, height: newHeight })
    .toFile(path.join(outputDir, fileName));
}

async function main() {
  // 确保输出目录存在
  await fs.mkdir(outputDir, { recursive: true });
  
  // 获取所有 PNG 文件
  const files = await fs.readdir(inputDir);
  const pngFiles = files.filter(file => file.toLowerCase().endsWith('.png'));
  
  // 处理每个图片
  for (const file of pngFiles) {
    try {
      await processImage(path.join(inputDir, file));
      console.log(`Successfully processed ${file}`);
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
    }
  }
}

main().catch(console.error);
