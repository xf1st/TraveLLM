const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        if (file.includes('node_modules') || file.includes('.git') || file.includes('.next')) return;
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(fullPath));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(fullPath);
        }
    });
    return results;
}

const files = walk('.');
let totalReplaced = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    // Replace shadow-2xl and shadow-xl with shadow-md on mobile
    content = content.replace(/\bshadow-2xl\b/g, 'shadow-md md:shadow-2xl');
    content = content.replace(/\bshadow-xl\b/g, 'shadow-md md:shadow-xl');
    
    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        totalReplaced++;
    }
});

console.log('Total files with shadows optimized:', totalReplaced);
