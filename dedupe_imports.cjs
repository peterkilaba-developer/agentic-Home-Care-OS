const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.{js,jsx}');
let fixed = 0;
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let original = content;
  
  // Find the framer-motion import line
  const match = content.match(/import\s*\{([^}]+)\}\s*from\s*['"]framer-motion['"];?/);
  if (match) {
    const imports = match[1].split(',').map(s => s.trim()).filter(s => s.length > 0);
    const uniqueImports = [...new Set(imports)];
    
    // Replace the import block
    content = content.replace(match[0], `import { ${uniqueImports.join(', ')} } from 'framer-motion';`);
  }
  
  if (content !== original) {
    fs.writeFileSync(f, content);
    console.log('Cleaned up framer-motion in', f);
    fixed++;
  }
});
console.log('Done cleaning up', fixed, 'files');
