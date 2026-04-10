const fs = require('fs');
const path = require('path');

const adminDir = path.join(__dirname, 'src/app/features/pages/admin-dashboard');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');

            // Remove styles: [...] array block completely
            const stylesRegex = /styles:\s*\[\s*`[\s\S]*?`\s*,?\s*\],?/g;
            if (stylesRegex.test(content)) {
                content = content.replace(stylesRegex, '');
                fs.writeFileSync(fullPath, content);
                console.log(`Removed styles from ${fullPath}`);
            }

        } else if (fullPath.endsWith('.html') && !fullPath.includes('overview.html') && !fullPath.includes('users.html')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let orig = content;

            // Basic structure
            content = content.replace(/class="page-header"/g, 'class="flex flex-wrap items-center justify-between gap-3 mb-6"');
            content = content.replace(/class="page-title"/g, 'class="text-[22px] font-bold text-slate-900"');
            content = content.replace(/class="page-sub"/g, 'class="text-[13px] text-slate-500 mt-0.5"');

            // Filters
            content = content.replace(/class="filter-row mb-4"/g, 'class="flex flex-wrap gap-2 mb-4"');
            content = content.replace(/class="filter-btn"/g, 'class="text-xs font-semibold px-4 py-1.5 rounded-full border-[1.5px] border-slate-200 bg-white text-slate-500 cursor-pointer transition-all duration-200 hover:bg-gradient-to-br hover:from-purple-600 hover:to-purple-500 hover:text-white hover:border-transparent"');
            content = content.replace(/\[class\.active\]="filter === f"/g, '[ngClass]="filter === f ? \'bg-gradient-to-br from-purple-600 to-purple-500 !text-white !border-transparent\' : \'\'"');

            // Cards and tables
            content = content.replace(/class="card mt-6"/g, 'class="bg-white rounded-2xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] mt-6 overflow-x-auto"');
            content = content.replace(/class="card mb-6"/g, 'class="bg-white rounded-2xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] mb-6 overflow-x-auto"');
            content = content.replace(/class="card"/g, 'class="bg-white rounded-2xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-x-auto"');

            content = content.replace(/class="data-table"/g, 'class="w-full border-collapse text-[13px] text-left whitespace-nowrap"');
            content = content.replace(/<th>/g, '<th class="text-slate-400 text-[11px] uppercase tracking-wider pb-3 border-b border-slate-100 font-semibold pr-4">');

            // Badges
            content = content.replace(/class="status-badge badge-blue"/g, 'class="text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap bg-blue-50 text-blue-500"');
            content = content.replace(/class="status-badge badge-purple"/g, 'class="text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap bg-purple-50 text-purple-600"');
            content = content.replace(/class="status-badge badge-green"/g, 'class="text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap bg-green-50 text-green-600"');
            content = content.replace(/class="status-badge badge-yellow"/g, 'class="text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap bg-amber-50 text-amber-600"');
            content = content.replace(/class="status-badge badge-gray"/g, 'class="text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap bg-slate-100 text-slate-600"');

            content = content.replace(/class="status-badge"/g, 'class="text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap"');

            // ngClass badge colors
            content = content.replace(/'badge-green':/g, "'bg-green-50 text-green-600':");
            content = content.replace(/'badge-yellow':/g, "'bg-amber-50 text-amber-600':");
            content = content.replace(/'badge-red':/g, "'bg-rose-50 text-rose-600':");

            // Actions
            content = content.replace(/class="action-row"/g, 'class="flex gap-1.5"');
            content = content.replace(/class="act-btn act-warn"/g, 'class="w-[30px] h-[30px] rounded-lg border-none cursor-pointer flex items-center justify-center text-[13px] transition-opacity hover:opacity-80 bg-amber-50 text-amber-600"');
            content = content.replace(/class="act-btn act-del"/g, 'class="w-[30px] h-[30px] rounded-lg border-none cursor-pointer flex items-center justify-center text-[13px] transition-opacity hover:opacity-80 bg-rose-50 text-rose-600"');
            content = content.replace(/class="act-btn act-pub"/g, 'class="w-[30px] h-[30px] rounded-lg border-none cursor-pointer flex items-center justify-center text-[13px] transition-opacity hover:opacity-80 bg-green-50 text-green-600"');
            content = content.replace(/class="act-btn act-edit"/g, 'class="w-[30px] h-[30px] rounded-lg border-none cursor-pointer flex items-center justify-center text-[13px] transition-opacity hover:opacity-80 bg-blue-50 text-blue-500"');

            // Forms & Settings specific
            content = content.replace(/class="settings-form"/g, 'class="grid grid-cols-1 md:grid-cols-2 gap-4"');
            content = content.replace(/class="form-group"/g, 'class="flex flex-col gap-1.5"');
            content = content.replace(/class="form-label"/g, 'class="text-xs font-bold text-slate-600"');
            content = content.replace(/class="form-input"/g, 'class="border-[1.5px] border-slate-200 rounded-xl px-3.5 py-2.5 text-[13px] outline-none transition-colors focus:border-purple-600"');
            content = content.replace(/class="btn-primary"/g, 'class="bg-gradient-to-br from-purple-600 to-purple-500 text-white font-semibold text-[13px] px-5 py-2 rounded-xl border-none cursor-pointer inline-flex items-center transition-opacity hover:opacity-90"');
            content = content.replace(/class="section-title"/g, 'class="text-base font-bold text-slate-900"');
            content = content.replace(/class="tabs-row"/g, 'class="flex gap-1 border-b-2 border-slate-100"');
            content = content.replace(/class="tab-btn"/g, 'class="text-[13px] font-semibold px-5 py-2.5 bg-transparent border-none text-slate-400 cursor-pointer border-b-2 border-transparent -mb-[2px] transition-colors hover:text-purple-600 hover:border-purple-600"');
            content = content.replace(/class="tab-btn tab-active"/g, 'class="text-[13px] font-semibold px-5 py-2.5 bg-transparent border-none cursor-pointer border-b-2 -mb-[2px] transition-colors text-purple-600 border-purple-600"');
            content = content.replace(/\[class\.tab-active\]="activeTab === t"/g, '[ngClass]="activeTab === t ? \'text-purple-600 border-purple-600\' : \'text-slate-400 border-transparent hover:text-purple-600 hover:border-purple-600\'"');

            if (orig !== content) {
                fs.writeFileSync(fullPath, content);
                console.log(`Refactored HTML for ${fullPath}`);
            }
        } else if (fullPath.endsWith('.css') && !fullPath.includes('overview.css') && !fullPath.includes('users.css')) {
            // Empty the css files
            fs.writeFileSync(fullPath, '');
            console.log(`Cleared CSS for ${fullPath}`);
        }
    }
}

processDir(adminDir);
