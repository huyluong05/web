const fs = require('fs');
const path = require('path');

const DIRECTORIES = ['./src/pages', './src/components'];

const regex = /(\/\/(?:(?!\b(?:const|let|var|function|return|export|import|if|for|while|switch|class|export|default)\b|<\/?(?:div|span|p|a|button|input|form|label|motion|AnimatePresence|h1|h2|h3|h4|header|footer|section|main|table|thead|tbody|tr|td|th|ul|li|strong|b|i|em|svg|path|img|nav)).)*?)\s+(?=\b(?:const|let|var|function|return|export|import|if|for|while|switch|class|export|default)\b|<\/?(?:div|span|p|a|button|input|form|label|motion|AnimatePresence|h1|h2|h3|h4|header|footer|section|main|table|thead|tbody|tr|td|th|ul|li|strong|b|i|em|svg|path|img|nav))/g;

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
    
    // Some lines might not have any keywords after the comment but still have JSX or logic.
    // However, this regex helps un-comment the majority of swallowed keywords.
    // We will do a replace.
    let newContent = content.replace(regex, '$1\n');
    
    // Another safety pass: if a line has `}` followed by `//`, we should break it
    newContent = newContent.replace(/\}\s*\/\//g, '}\n//');
    
    // Also insert newline before any '//' to give it its own line 
    // BUT only if it's not inside a string (hard to detect, but a simple fix)
    // Actually, `newContent.replace(regex, '$1\n')` does the job for swallowed code.
    
    if (content !== newContent) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Fixed comments in: ${filePath}`);
    }
}

DIRECTORIES.forEach(dir => processDirectory(dir));
console.log('Comment fix complete.');
