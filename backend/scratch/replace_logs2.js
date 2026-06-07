const fs = require('fs');

function replaceLogs(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes("import { logger }")) {
    content = `import { logger } from '../../utils/logger';\n` + content;
  }
  content = content.replace(/console\.log\(/g, 'logger.info(');
  content = content.replace(/console\.error\(/g, 'logger.error(');
  content = content.replace(/console\.warn\(/g, 'logger.warn(');
  fs.writeFileSync(filePath, content);
}

replaceLogs('c:/dev/mmtracing/backend/src/modules/whatsapp/whatsapp.notification.ts');
console.log('Replaced logs in whatsapp.notification.ts');
