import fs from 'fs';
const content = fs.readFileSync('server.js', 'utf8');

// match function definitions: "function foo(" or "const foo = " or "let foo = "
const funcRegex = /(?:function\s+([a-zA-Z0-9_]+)\s*\()|(?:(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?(?:function|\([^)]*\)\s*=>|[^=]*=>))/g;

const funcs = new Set();
let match;
while ((match = funcRegex.exec(content)) !== null) {
    const name = match[1] || match[2];
    if (name) funcs.add(name);
}

// Filter out known express stuff
const ignoreList = ['require', 'import', 'app', 'express', 'router', 'map', 'filter', 'reduce', 'forEach', 'find', 'findIndex', 'some', 'every'];
const definedFuncs = Array.from(funcs).filter(f => !ignoreList.includes(f) && f.length > 2);

console.log("Total functions defined:", definedFuncs.length);

const unused = [];
definedFuncs.forEach(func => {
    // Check how many times it appears. If only 1 (the definition), it's unused.
    const regex = new RegExp(`\\b${func}\\b`, 'g');
    const matches = content.match(regex);
    if (matches && matches.length === 1) {
        unused.push(func);
    }
});

console.log("Unused functions:", unused);
