const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.{js,jsx}');
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let hasMotionTag = /<motion/.test(content);
  
  if (hasMotionTag) {
    if (content.includes("import { AnimatePresence } from 'framer-motion'")) {
      content = content.replace("import { AnimatePresence } from 'framer-motion'", "import { motion, AnimatePresence } from 'framer-motion'");
      fs.writeFileSync(f, content);
      console.log('Fixed', f);
    } else if (content.includes("import { AnimatePresence, motion } from 'framer-motion'") || content.includes("import { motion, AnimatePresence } from 'framer-motion'") || content.includes("import { motion } from 'framer-motion'")) {
      // Already correct
    } else if (content.includes("from 'framer-motion'")) {
      content = content.replace(/(import\s*\{)([^}]*)(\}\s*from\s*'framer-motion')/, "$1 motion, $2$3");
      fs.writeFileSync(f, content);
      console.log('Fixed', f);
    } else {
      content = content.replace(/import ([^\n]+)\n/, "import $1\nimport { motion } from 'framer-motion';\n");
      fs.writeFileSync(f, content);
      console.log('Added framer-motion to', f);
    }
  }
});
