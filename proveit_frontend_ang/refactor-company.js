const fs = require('fs');
const path = require('path');

const companyDir = path.join(__dirname, 'src/app/features/pages/company-dashboard');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.html')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let orig = content;

            // Basic structure
            content = content.replace(/class="page-header"/g, 'class="flex flex-wrap items-center justify-between gap-3 mb-6"');
            content = content.replace(/class="page-title"/g, 'class="text-[22px] font-bold text-slate-900"');
            content = content.replace(/class="page-sub"/g, 'class="text-[13px] text-slate-500 mt-0.5"');

            // Buttons
            content = content.replace(/class="btn-primary"/g, 'class="bg-gradient-to-br from-[var(--dd-blue)] to-[var(--dd-yellow)] text-white font-semibold text-[13px] px-5 py-2.5 rounded-xl border-none cursor-pointer inline-flex items-center transition-opacity hover:opacity-90 no-underline"');
            content = content.replace(/class="btn-outline"/g, 'class="border-[1.5px] border-slate-200 bg-white text-slate-700 font-semibold text-[13px] px-5 py-2 rounded-xl cursor-pointer inline-flex items-center transition-colors hover:border-[var(--dd-blue)] hover:text-[var(--dd-blue)] no-underline"');

            // Filters
            content = content.replace(/class="filter-row mb-4"/g, 'class="flex flex-wrap gap-2 mb-4"');
            content = content.replace(/class="filter-row"/g, 'class="flex flex-wrap gap-2 mb-4"');
            content = content.replace(/class="filter-btn"/g, 'class="text-xs font-semibold px-4 py-1.5 rounded-full border-[1.5px] border-slate-200 bg-white text-slate-500 cursor-pointer transition-all duration-200 hover:bg-gradient-to-br hover:from-[var(--dd-blue)] hover:to-[var(--dd-yellow)] hover:text-white hover:border-transparent"');
            content = content.replace(/\[class\.active\]="filter === f"/g, '[ngClass]="filter === f ? \'bg-gradient-to-br from-[var(--dd-blue)] to-[var(--dd-yellow)] !text-white !border-transparent\' : \'\'"');
            content = content.replace(/\[class\.active\]="statusFilter === f"/g, '[ngClass]="statusFilter === f ? \'bg-gradient-to-br from-[var(--dd-blue)] to-[var(--dd-yellow)] !text-white !border-transparent\' : \'\'"');

            // Cards & Stats
            content = content.replace(/class="stats-grid"/g, 'class="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4"');
            content = content.replace(/class="stat-card"/g, 'class="bg-white rounded-2xl p-5 flex items-center gap-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]"');
            content = content.replace(/class="stat-icon"/g, 'class="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"');
            content = content.replace(/class="stat-value"/g, 'class="text-[26px] font-extrabold text-slate-900"');
            content = content.replace(/class="stat-label"/g, 'class="text-xs text-slate-500 mt-0.5"');
            content = content.replace(/'stat-'\+s\.color/g, "{'bg-orange-50 text-[var(--dd-orange)]': s.color === 'orange', 'bg-blue-50 text-blue-500': s.color === 'blue', 'bg-green-50 text-green-500': s.color === 'green', 'bg-purple-50 text-purple-500': s.color === 'purple'}");

            content = content.replace(/class="card"/g, 'class="bg-white rounded-2xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]"');
            content = content.replace(/class="card mt-6"/g, 'class="bg-white rounded-2xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] mt-6"');
            content = content.replace(/class="card-header"/g, 'class="flex items-center justify-between mb-4"');
            content = content.replace(/class="card-title"/g, 'class="text-[15px] font-bold text-slate-900"');
            content = content.replace(/class="card-link"/g, 'class="text-xs text-[var(--dd-orange)] font-semibold no-underline hover:underline cursor-pointer"');

            // Tables & Badges
            content = content.replace(/class="data-table"/g, 'class="w-full border-collapse text-[13px] text-left whitespace-nowrap"');
            content = content.replace(/<th>/g, '<th class="text-slate-400 text-[11px] uppercase tracking-wider pb-3 border-b border-slate-100 font-semibold pr-4">');

            content = content.replace(/class="status-badge badge-blue"/g, 'class="text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap bg-blue-50 text-blue-500"');
            content = content.replace(/class="status-badge badge-purple"/g, 'class="text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap bg-purple-50 text-purple-600"');
            content = content.replace(/class="status-badge badge-green"/g, 'class="text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap bg-green-50 text-green-600"');
            content = content.replace(/class="status-badge badge-yellow"/g, 'class="text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap bg-amber-50 text-amber-600"');
            content = content.replace(/class="status-badge badge-gray"/g, 'class="text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap bg-slate-100 text-slate-600"');
            content = content.replace(/class="status-badge badge-red"/g, 'class="text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap bg-rose-50 text-rose-600"');
            content = content.replace(/class="status-badge"/g, 'class="text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap"');

            content = content.replace(/'badge-green':/g, "'bg-green-50 text-green-600':");
            content = content.replace(/'badge-yellow':/g, "'bg-amber-50 text-amber-600':");
            content = content.replace(/'badge-red':/g, "'bg-rose-50 text-rose-600':");
            content = content.replace(/'badge-gray':/g, "'bg-slate-100 text-slate-600':");
            content = content.replace(/'badge-blue':/g, "'bg-blue-50 text-blue-500':");

            // Actions
            content = content.replace(/class="action-row"/g, 'class="flex gap-1.5"');
            content = content.replace(/class="act-btn act-warn"/g, 'class="w-[30px] h-[30px] rounded-lg border-none cursor-pointer flex items-center justify-center text-[13px] transition-opacity hover:opacity-80 bg-amber-50 text-amber-600"');
            content = content.replace(/class="act-btn act-del"/g, 'class="w-[30px] h-[30px] rounded-lg border-none cursor-pointer flex items-center justify-center text-[13px] transition-opacity hover:opacity-80 bg-rose-50 text-rose-600"');
            content = content.replace(/class="act-btn act-pub"/g, 'class="w-[30px] h-[30px] rounded-lg border-none cursor-pointer flex items-center justify-center text-[13px] transition-opacity hover:opacity-80 bg-green-50 text-green-600"');
            content = content.replace(/class="act-btn act-edit"/g, 'class="w-[30px] h-[30px] rounded-lg border-none cursor-pointer flex items-center justify-center text-[13px] transition-opacity hover:opacity-80 bg-blue-50 text-blue-500"');

            // Home specific
            content = content.replace(/class="comp-list"/g, 'class="flex flex-col gap-3"');
            content = content.replace(/class="comp-item"/g, 'class="flex items-start justify-between p-3 rounded-lg bg-slate-50 gap-3"');
            content = content.replace(/class="comp-title"/g, 'class="text-[13px] font-semibold text-slate-900"');
            content = content.replace(/class="comp-skills"/g, 'class="flex flex-wrap gap-1 mt-1"');
            content = content.replace(/class="skill-tag"/g, 'class="text-[10px] bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full font-semibold"');
            content = content.replace(/class="comp-meta"/g, 'class="text-[11px] text-slate-400 mt-1"');
            content = content.replace(/class="score-pill"/g, 'class="font-bold text-xs px-2.5 py-1 rounded-full"');
            content = content.replace(/'score-high'/g, "'bg-green-50 text-green-600'");
            content = content.replace(/'score-mid'/g, "'bg-amber-50 text-amber-600'");
            content = content.replace(/'score-low'/g, "'bg-rose-50 text-rose-600'");
            content = content.replace(/class="card mt-6 sub-card"/g, 'class="bg-white rounded-2xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] mt-6 flex items-center gap-4 flex-wrap"');
            content = content.replace(/class="sub-icon"/g, 'class="text-[28px] text-[var(--dd-orange)]"');
            content = content.replace(/class="sub-info"/g, 'class="flex-1"');
            content = content.replace(/class="sub-title"/g, 'class="text-[15px] font-bold text-slate-900"');
            content = content.replace(/class="sub-desc"/g, 'class="text-[13px] text-slate-500 mt-1"');

            // Competitions & Projects specific
            content = content.replace(/class="proj-grid"/g, 'class="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5"');
            content = content.replace(/class="proj-card"/g, 'class="bg-white rounded-[14px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col gap-4 relative"');
            content = content.replace(/class="proj-header"/g, 'class="flex justify-between items-start"');
            content = content.replace(/class="proj-title"/g, 'class="text-[15px] font-bold text-slate-900"');
            content = content.replace(/class="proj-sub"/g, 'class="text-xs text-slate-500 mt-1"');
            content = content.replace(/class="proj-meta"/g, 'class="flex items-center gap-4 text-xs text-slate-600"');
            content = content.replace(/class="meta-item"/g, 'class="flex items-center gap-1.5"');
            content = content.replace(/class="proj-ai-score"/g, 'class="bg-slate-50 rounded-lg p-3 pt-2 text-center"');
            content = content.replace(/class="score-label"/g, 'class="text-[10px] text-slate-400 font-bold uppercase tracking-wide"');
            content = content.replace(/class="score-val"/g, 'class="text-xl font-extrabold mt-1 text-slate-900"');
            content = content.replace(/class="proj-actions"/g, 'class="flex gap-2 pt-3 border-t border-slate-100 mt-auto"');
            content = content.replace(/class="btn-text"/g, 'class="flex-1 px-4 py-2 bg-slate-50 text-[var(--dd-blue)] font-bold text-xs rounded-lg cursor-pointer border-none transition-colors hover:bg-[var(--dd-blue)] hover:text-white"');
            content = content.replace(/class="btn-text btn-red"/g, 'class="flex-1 px-4 py-2 bg-rose-50 text-rose-600 font-bold text-xs rounded-lg cursor-pointer border-none transition-colors hover:bg-rose-500 hover:text-white"');

            // Modals
            content = content.replace(/class="modal-backdrop"/g, 'class="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4"');
            content = content.replace(/class="modal-content"/g, 'class="bg-white rounded-2xl w-full max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"');
            content = content.replace(/class="modal-header"/g, 'class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50"');
            content = content.replace(/class="modal-title"/g, 'class="text-base font-bold text-slate-900"');
            content = content.replace(/class="btn-close"/g, 'class="w-8 h-8 flex items-center justify-center rounded-lg bg-transparent border-none text-slate-400 cursor-pointer transition-colors hover:bg-slate-200"');
            content = content.replace(/class="modal-body"/g, 'class="p-6 overflow-y-auto flex-1 text-[13px] text-slate-700 leading-relaxed space-y-5"');
            content = content.replace(/class="modal-section"/g, 'class="space-y-4"');
            content = content.replace(/class="modal-actions"/g, 'class="p-4 border-t border-slate-100 flex gap-2 justify-end bg-slate-50"');
            content = content.replace(/class="ai-report-box"/g, 'class="bg-slate-50 border border-slate-100 rounded-xl p-4"');
            content = content.replace(/class="repo-list"/g, 'class="space-y-2 mt-2"');
            content = content.replace(/class="repo-link"/g, 'class="block bg-white border border-slate-200 p-2 rounded-lg text-slate-600 text-xs no-underline hover:border-[var(--dd-blue)] hover:text-[var(--dd-blue)] transition-colors"');

            // Interviews
            content = content.replace(/class="int-grid"/g, 'class="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5"');
            content = content.replace(/class="int-card"/g, 'class="bg-white rounded-[14px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col gap-4 relative"');
            content = content.replace(/class="int-header"/g, 'class="flex items-center gap-3"');
            content = content.replace(/class="int-ava"/g, 'class="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--dd-blue)] to-[var(--dd-yellow)] text-white font-bold text-xs flex items-center justify-center shrink-0"');
            content = content.replace(/class="int-name"/g, 'class="text-[14px] font-bold text-slate-900"');
            content = content.replace(/class="int-role"/g, 'class="text-[11px] text-slate-500 mt-0.5"');
            content = content.replace(/class="int-body"/g, 'class="bg-slate-50 rounded-xl p-3 text-[12px] text-slate-600 space-y-2"');
            content = content.replace(/class="int-info"/g, 'class="flex items-center gap-2"');

            // Chat
            content = content.replace(/class="chat-container"/g, 'class="flex h-[max(500px,calc(100vh-160px))] bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden"');
            content = content.replace(/class="chat-sidebar"/g, 'class="w-[280px] bg-slate-50 flex flex-col border-r border-slate-200 shrink-0"');
            content = content.replace(/class="chat-header"/g, 'class="p-4 border-b border-slate-200"');
            content = content.replace(/class="chat-search input-search"/g, 'class="w-full border border-slate-200 rounded-xl px-3 py-2 text-[13px] outline-none mt-3 focus:border-[var(--dd-blue)] transition-colors"');
            content = content.replace(/class="chat-list"/g, 'class="flex-1 overflow-y-auto"');
            content = content.replace(/class="chat-contact"/g, 'class="flex items-center gap-3 p-3 cursor-pointer border-b border-white transition-colors hover:bg-white"');
            content = content.replace(/class="chat-contact active"/g, 'class="flex items-center gap-3 p-3 cursor-pointer border-b border-white bg-white border-l-4 !border-l-[var(--dd-blue)]"');
            content = content.replace(/\[class\.active\]="selectedContact\?.id === c\.id"/g, '[ngClass]="selectedContact?.id === c.id ? \'bg-white border-l-4 !border-l-[var(--dd-blue)]\' : \'hover:bg-white\'"');

            content = content.replace(/class="contact-ava"/g, 'class="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-600 shrink-0"');
            content = content.replace(/class="contact-info"/g, 'class="flex-1 overflow-hidden"');
            content = content.replace(/class="contact-name"/g, 'class="text-[13px] font-bold text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis"');
            content = content.replace(/class="contact-msg"/g, 'class="text-[11px] text-slate-500 mt-1 whitespace-nowrap overflow-hidden text-ellipsis"');

            content = content.replace(/class="chat-main"/g, 'class="flex-1 flex flex-col bg-white"');
            content = content.replace(/class="chat-main-header"/g, 'class="px-5 py-4 border-b border-slate-200 flex items-center justify-between"');
            content = content.replace(/class="chat-main-title"/g, 'class="text-[14px] font-bold text-slate-900"');
            content = content.replace(/class="chat-main-sub"/g, 'class="text-[11px] text-slate-500 mt-0.5"');

            content = content.replace(/class="chat-messages"/g, 'class="flex-1 overflow-y-auto p-5 space-y-4"');
            content = content.replace(/class="msg-row"/g, 'class="flex flex-col max-w-[70%]"');
            content = content.replace(/class="msg-row msg-me"/g, 'class="flex flex-col max-w-[70%] self-end items-end"');
            content = content.replace(/\[class\.msg-me\]="m\.senderId === 'company'"/g, '[ngClass]="m.senderId === \'company\' ? \'self-end items-end\' : \'\'"');

            content = content.replace(/class="msg-bubble"/g, 'class="bg-slate-100 text-slate-700 text-[13px] px-4 py-2.5 rounded-2xl rounded-tl-none leading-relaxed"');
            content = content.replace(/class="msg-bubble me"/g, 'class="bg-[var(--dd-blue)] text-white text-[13px] px-4 py-2.5 rounded-2xl rounded-tr-none leading-relaxed"');
            content = content.replace(/\[class\.me\]="m\.senderId === 'company'"/g, '[ngClass]="m.senderId === \'company\' ? \'bg-[var(--dd-blue)] text-white !rounded-tr-none\' : \'bg-slate-100 text-slate-700 !rounded-tl-none\'"');

            content = content.replace(/class="msg-time"/g, 'class="text-[10px] text-slate-400 mt-1"');

            content = content.replace(/class="chat-input-area"/g, 'class="p-4 border-t border-slate-200 flex gap-2"');
            content = content.replace(/class="chat-input"/g, 'class="flex-1 border-[1.5px] border-slate-200 rounded-full px-4 text-[13px] outline-none transition-colors focus:border-[var(--dd-blue)]"');
            content = content.replace(/class="btn-send"/g, 'class="w-10 h-10 rounded-full bg-[var(--dd-blue)] text-white border-none cursor-pointer flex items-center justify-center transition-opacity hover:opacity-90"');

            // Billing
            content = content.replace(/class="billing-split"/g, 'class="grid grid-cols-1 lg:grid-cols-3 gap-6"');
            content = content.replace(/class="plan-col"/g, 'class="lg:col-span-2 space-y-6"');
            content = content.replace(/class="plan-cards"/g, 'class="grid grid-cols-1 md:grid-cols-2 gap-4"');
            content = content.replace(/class="plan-card"/g, 'class="bg-white border-2 border-slate-100 rounded-2xl p-5 transition-all text-center relative"');
            content = content.replace(/class="plan-card active-plan"/g, 'class="bg-white border-2 border-[var(--dd-blue)] rounded-2xl p-5 shadow-[0_4px_12px_rgba(255,106,0,0.1)] text-center relative pointer-events-none"');
            content = content.replace(/\[class\.active-plan\]="currentPlan === p\.id"/g, '[ngClass]="currentPlan === p.id ? \'border-[var(--dd-blue)] shadow-[0_4px_12px_rgba(255,106,0,0.1)] pointer-events-none\' : \'border-slate-100\'"');
            content = content.replace(/class="plan-badge"/g, 'class="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--dd-blue)] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider"');
            content = content.replace(/class="plan-name"/g, 'class="text-[15px] font-bold text-slate-900 mt-2"');
            content = content.replace(/class="plan-price"/g, 'class="text-[28px] font-extrabold text-[var(--dd-blue)] mt-2"');
            content = content.replace(/class="plan-period"/g, 'class="text-xs text-slate-400 font-normal"');
            content = content.replace(/class="plan-features"/g, 'class="mt-4 mb-5 text-left space-y-2"');
            content = content.replace(/class="feat-item"/g, 'class="flex justify-start items-center gap-2 text-xs text-slate-600 font-medium"');
            content = content.replace(/class="bi-check-circle-fill"/g, 'bi-check-circle-fill text-[var(--dd-blue)] text-[14px]');
            content = content.replace(/class="btn-plan"/g, 'class="w-full bg-[var(--dd-blue)] text-white font-bold text-[13px] py-2.5 rounded-xl border-none cursor-pointer transition-opacity hover:opacity-90 mt-auto"');

            content = content.replace(/class="usage-col"/g, 'class="flex flex-col gap-6"');
            content = content.replace(/class="usage-item"/g, 'class="mb-4 last:mb-0"');
            content = content.replace(/class="usage-label"/g, 'class="flex justify-between text-xs font-bold text-slate-600 mb-2"');
            content = content.replace(/class="usage-bar-bg"/g, 'class="h-2 w-full bg-slate-100 rounded-full overflow-hidden"');
            content = content.replace(/class="usage-bar-fill"/g, 'class="h-full bg-gradient-to-r from-[var(--dd-blue)] to-[var(--dd-yellow)] rounded-full"');

            // Settings
            content = content.replace(/class="settings-form"/g, 'class="grid grid-cols-1 md:grid-cols-2 gap-4"');
            content = content.replace(/class="form-group"/g, 'class="flex flex-col gap-1.5"');
            content = content.replace(/class="form-label"/g, 'class="text-xs font-bold text-slate-600"');
            content = content.replace(/class="form-input"/g, 'class="border-[1.5px] border-slate-200 rounded-xl px-3.5 py-2.5 text-[13px] outline-none transition-colors focus:border-[var(--dd-blue)]"');
            content = content.replace(/class="form-textarea"/g, 'class="border-[1.5px] border-slate-200 rounded-xl px-3.5 py-2.5 text-[13px] outline-none transition-colors focus:border-[var(--dd-blue)] min-h-[100px] resize-y font-sans"');

            content = content.replace(/class="section-title"/g, 'class="text-base font-bold text-slate-900"');
            content = content.replace(/class="tabs-row"/g, 'class="flex gap-1 border-b-2 border-slate-100"');
            content = content.replace(/class="tab-btn"/g, 'class="text-[13px] font-semibold px-5 py-2.5 bg-transparent border-none text-slate-400 cursor-pointer border-b-2 border-transparent -mb-[2px] transition-colors hover:text-[var(--dd-blue)] hover:border-[var(--dd-blue)]"');
            content = content.replace(/\[class\.tab-active\]="activeTab === t"/g, '[ngClass]="activeTab === t ? \'text-[var(--dd-blue)] border-[var(--dd-blue)]\' : \'text-slate-400 border-transparent hover:text-[var(--dd-blue)] hover:border-[var(--dd-blue)]\'"');

            content = content.replace(/class="toggle-switch"/g, 'class="w-12 h-[26px] rounded-full bg-slate-200 relative cursor-pointer transition-colors inline-flex items-center"');
            content = content.replace(/\[class\.on\]/g, '[class.bg-[var(--dd-blue)]]');
            content = content.replace(/class="toggle-thumb"/g, 'class="w-5 h-5 rounded-full bg-white absolute top-[3px] left-[3px] shadow-[0_1px_4px_rgba(0,0,0,0.15)] transition-all duration-200"');
            // Wait, [style.left] is better than doing the css class switching for thumb, but since logic uses .on .toggle-thumb, let's inject an ngStyle
            content = content.replace(/class="toggle-thumb"([^>]*?)>/g, 'class="toggle-thumb w-5 h-5 rounded-full bg-white absolute top-[3px] shadow-[0_1px_4px_rgba(0,0,0,0.15)] transition-all duration-200" [style.left]="s.value ? \'25px\' : \'3px\'">');
            content = content.replace(/class="toggle-thumb w-5 h-5 rounded-full bg-white absolute top-\[3px\] shadow-\[0_1px_4px_rgba\(0,0,0,0\.15\)\] transition-all duration-200" \[style\.left\]="s\.value \? '25px' : '3px'">/g, 'class="w-5 h-5 rounded-full bg-white absolute top-[3px] shadow-[0_1px_4px_rgba(0,0,0,0.15)] transition-all duration-200" [ngStyle]="{\'left\': s.value ? \'25px\' : \'3px\'}">');

            content = content.replace(/class="brand-colors"/g, 'class="flex gap-3"');
            content = content.replace(/class="color-picker"/g, 'class="w-10 h-10 rounded-full border-none cursor-pointer p-0 overflow-hidden"');

            if (orig !== content) {
                fs.writeFileSync(fullPath, content);
                console.log(`Refactored HTML for ${fullPath}`);
            }
        } else if (fullPath.endsWith('.css')) {
            // Empty the css files
            fs.writeFileSync(fullPath, '');
            console.log(`Cleared CSS for ${fullPath}`);
        }
    }
}

processDir(companyDir);
