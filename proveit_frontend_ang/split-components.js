const fs = require('fs');
const path = require('path');

const adminDir = path.join(__dirname, 'src/app/features/pages/admin-dashboard');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.ts') && !fullPath.endsWith('.spec.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');

            const templateRegex = /template:\s*`([\s\S]*?)`\s*,/;
            const stylesRegex = /styles:\s*\[\s*`([\s\S]*?)`\s*\],?/;

            let modified = false;
            const tMatch = content.match(templateRegex);
            const sMatch = content.match(stylesRegex);

            if (tMatch) {
                const baseName = path.basename(fullPath, '.ts');
                const htmlFile = path.join(dir, baseName + '.html');
                fs.writeFileSync(htmlFile, tMatch[1].trim());
                content = content.replace(templateRegex, `templateUrl: './${baseName}.html',`);
                modified = true;
            }

            if (sMatch) {
                const baseName = path.basename(fullPath, '.ts');
                const cssFile = path.join(dir, baseName + '.css');
                fs.writeFileSync(cssFile, sMatch[1].trim());
                content = content.replace(stylesRegex, `styleUrl: './${baseName}.css',`);
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(fullPath, content);
                console.log(`Split component: ${fullPath}`);
            }
        }
    }
}

processDir(adminDir);
