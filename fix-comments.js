const fs = require('fs');
const path = require('path');

const content = fs.readFileSync('./src/pages/user/DevicesPage.jsx', 'utf8');

// Try to find all single-line comments that accidentally absorbed code
// We look for '//' followed by text, up until a common React/JS keyword or tag
const regex = /(\/\/(?:(?!\b(?:const|let|var|function|return|export|import|if|for|while|switch|class|export|default)\b|<\/?(?:div|span|p|a|button|input|form|label|motion|AnimatePresence|h1|h2|h3|h4|header|footer|section|main|table|thead|tbody|tr|td|th|ul|li|strong|b|i|em|svg|path|img|nav)).)*?)\s+(?=\b(?:const|let|var|function|return|export|import|if|for|while|switch|class|export|default)\b|<\/?(?:div|span|p|a|button|input|form|label|motion|AnimatePresence|h1|h2|h3|h4|header|footer|section|main|table|thead|tbody|tr|td|th|ul|li|strong|b|i|em|svg|path|img|nav))/g;

let newContent = content.replace(regex, '$1\n');
fs.writeFileSync('./test-fix.jsx', newContent, 'utf8');
console.log('Done fixing comments for testing.');
