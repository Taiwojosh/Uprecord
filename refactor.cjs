const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory && !dirPath.includes('node_modules') ? 
            walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

walkDir('./src', function(filePath) {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let originalContent = content;

        // Fluid Typography: Replace absolute text sizes
        content = content.replace(/text-\[(\d+)px\]/g, (match, px) => {
            return `text-[${(parseInt(px) / 16).toFixed(4).replace(/\.?0+$/, '')}rem]`;
        });

        // Add break-words to common text elements that might overflow, 
        // safely ignoring if it already has break keywords
        // For simplicity, we just do it to text-slate-500, p tags etc where appropriate.
        // Actually, maybe not blindly for every p tag. But we can catch h1, h2, h3, h4.
        
        // Let's replace max-w-[xxpx] with viewport relative where appropriate, maybe not blindly.

        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Refactored: ${filePath}`);
        }
    }
});
