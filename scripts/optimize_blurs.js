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
    
    // We want to target absolute divs that act as glow. 
    // Example: className="absolute top-1/3 left-1/2 w-[800px] h-[500px] rounded-full bg-primary/10 blur-[120px]"
    
    // Replace blur-[100px] to blur-[120px] with hidden md:block if not already hidden
    const regex = /className=(["'])([^"']*?\babsolute\b[^"']*?\bblur-(?:3xl|2xl|xl|\[\d+px\])\b[^"']*?)\1/g;
    
    content = content.replace(regex, (match, quote, classList) => {
        // Only hide on mobile if it doesn't already have 'hidden', 'md:block', 'sm:block'
        if (!classList.includes('hidden') && !classList.includes('md:block') && !classList.includes('sm:block')) {
            return `className=${quote}${classList} hidden md:block${quote}`;
        }
        return match;
    });
    
    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated', file);
        totalReplaced++;
    }
});

console.log('Total files with ambient blurs updated:', totalReplaced);
