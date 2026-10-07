const fs = require('fs');
const path = require('path');

const DIRECTORIES = ['./src/pages', './src/components'];

const REPLACEMENTS = [
    // Remove heavy glassmorphism
    { regex: /bg-white\/[0-9]+\s+backdrop-blur-(md|lg|xl)/g, replacement: 'bg-white' },
    { regex: /bg-slate-50\/[0-9]+/g, replacement: 'bg-slate-50' },
    { regex: /backdrop-blur-(md|lg|xl)/g, replacement: '' },
    
    // Reduce oversized border radius
    { regex: /rounded-3xl/g, replacement: 'rounded-xl' },
    { regex: /rounded-\[2rem\]/g, replacement: 'rounded-2xl' },
    { regex: /rounded-\[3rem\]/g, replacement: 'rounded-2xl' },
    
    // Simplify borders
    { regex: /border-slate-200\/60/g, replacement: 'border-slate-200' },
    { regex: /border-slate-200\/80/g, replacement: 'border-slate-200' },
    { regex: /border-slate-200\/50/g, replacement: 'border-slate-200' },
    
    // Reduce heavy shadows
    { regex: /shadow-soft/g, replacement: 'shadow-sm' },
    { regex: /shadow-2xl/g, replacement: 'shadow-lg' },
    { regex: /shadow-xl/g, replacement: 'shadow-md' },
    
    // Tone down gradients
    { regex: /bg-gradient-to-(r|l|t|b|tr|tl|br|bl)\s+from-primary-[0-9]+\s+(via-primary-[0-9]+\/[0-9]+\s+)?to-(secondary|primary)-[0-9]+/g, replacement: 'bg-primary-600 text-white' },
    { regex: /bg-gradient-to-(r|l|t|b|tr|tl|br|bl)\s+from-rose-[0-9]+\s+to-orange-[0-9]+/g, replacement: 'bg-rose-50 text-rose-900' },
    { regex: /bg-gradient-to-(r|l|t|b|tr|tl|br|bl)\s+from-rose-[0-9]+\/?[0-9]*\s+to-orange-[0-9]+\/?[0-9]*/g, replacement: 'bg-rose-50' },
    
    // Clean up extra spaces caused by replacements
    { regex: /\s{2,}/g, replacement: ' ' },
    { regex: /className="\s+/g, replacement: 'className="' },
    { regex: /\s+"/g, replacement: '"' }
];

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
            processFile(fullPath);
        }
    }
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    for (const rule of REPLACEMENTS) {
        content = content.replace(rule.regex, rule.replacement);
    }
    
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
}

DIRECTORIES.forEach(dir => processDirectory(dir));
console.log('UI Polish complete.');
