export function getWebUiHtml(): string {
	return `<!DOCTYPE html>
<html lang="es" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="theme-color" content="#090a0f">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <title>Andy Agent WebUI - RLM, Graft Studio, Memory & Multi-Provider Hub</title>
  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: {
              50: '#f5f3ff',
              100: '#ede9fe',
              500: '#8b5cf6',
              600: '#7c3aed',
              700: '#6d28d9',
            },
            surface: {
              950: '#06070a',
              900: '#090a0f',
              850: '#0f1117',
              800: '#161922',
              750: '#1d222e',
              700: '#252b3b',
              600: '#333b50',
            }
          }
        }
      }
    }
  </script>
  <!-- Lucide Icons -->
  <script src="https://unpkg.com/lucide@latest"></script>
  <!-- Marked.js (Markdown) -->
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <!-- Highlight.js (Code Syntax Highlighting) -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  <!-- KaTeX (Math Rendering) -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
    html, body {
      font-family: 'Inter', sans-serif;
      height: 100%;
      height: 100dvh;
      overflow: hidden;
      touch-action: manipulation;
      -webkit-text-size-adjust: 100%;
    }
    pre, code, .font-mono { font-family: 'JetBrains Mono', monospace; }
    
    /* Smooth touch scrolling */
    .overflow-y-auto, .overflow-x-auto, #chatMessages, #sessionsList, #logsConsole, #providersGridContainer, #treeContainer {
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
    }
    
    /* Custom scrollbar */
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #252b3b; border-radius: 9999px; }
    ::-webkit-scrollbar-thumb:hover { background: #333b50; }
    
    /* Hide scrollbars for clean horizontal tab scroll */
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    
    /* Safe areas for mobile devices */
    .safe-top { padding-top: env(safe-area-inset-top, 0px); }
    .safe-bottom { padding-bottom: max(0.5rem, env(safe-area-inset-bottom, 0px)); }
    .safe-pb { padding-bottom: env(safe-area-inset-bottom, 0px); }
    
    /* Prose Custom Styling for Clean Chat Messages */
    .prose-custom { font-size: 0.8125rem; line-height: 1.65; color: #f1f5f9; }
    .prose-custom p { margin-bottom: 0.75rem; }
    .prose-custom p:last-child { margin-bottom: 0; }
    .prose-custom strong { color: #ffffff; font-weight: 600; }
    .prose-custom em { color: #cbd5e1; font-style: italic; }
    .prose-custom h1 { font-size: 1.35rem; font-weight: 700; color: #ffffff; margin-top: 1.25rem; margin-bottom: 0.6rem; border-bottom: 1px solid #252b3b; padding-bottom: 0.35rem; }
    .prose-custom h2 { font-size: 1.15rem; font-weight: 600; color: #f8fafc; margin-top: 1rem; margin-bottom: 0.5rem; }
    .prose-custom h3 { font-size: 1rem; font-weight: 600; color: #e2e8f0; margin-top: 0.85rem; margin-bottom: 0.35rem; }
    .prose-custom h4 { font-size: 0.875rem; font-weight: 600; color: #cbd5e1; margin-top: 0.75rem; margin-bottom: 0.25rem; }
    .prose-custom ul { list-style-type: disc; padding-left: 1.4rem; margin-bottom: 0.75rem; }
    .prose-custom ol { list-style-type: decimal; padding-left: 1.4rem; margin-bottom: 0.75rem; }
    .prose-custom li { margin-bottom: 0.25rem; line-height: 1.6; }
    .prose-custom li > p { margin-bottom: 0.25rem; }
    .prose-custom code:not(pre code) { background: #1e1b4b; color: #c4b5fd; padding: 0.15rem 0.4rem; border-radius: 0.375rem; font-size: 0.85em; border: 1px solid rgba(139, 92, 246, 0.25); }
    .prose-custom pre { margin-top: 0.5rem; margin-bottom: 0.5rem; border-radius: 0.5rem; overflow: hidden; background: #0b0d13; border: 1px solid #252b3b; }
    .prose-custom pre code { display: block; padding: 0.85rem 1rem; overflow-x: auto; font-size: 0.8em; line-height: 1.55; }
    .prose-custom blockquote { border-left: 3px solid #8b5cf6; padding: 0.4rem 0.85rem; background: rgba(139, 92, 246, 0.05); color: #cbd5e1; border-radius: 0 0.375rem 0.375rem 0; margin: 0.75rem 0; }
    .prose-custom table { width: 100%; border-collapse: collapse; margin-top: 0.75rem; margin-bottom: 0.75rem; font-size: 0.8rem; border-radius: 0.5rem; overflow: hidden; }
    .prose-custom th, .prose-custom td { border: 1px solid #252b3b; padding: 0.5rem 0.75rem; text-align: left; }
    .prose-custom th { background: #161922; font-weight: 600; color: #e2e8f0; }
    .prose-custom tr:nth-child(even) { background: rgba(22, 25, 34, 0.4); }
    .prose-custom hr { border: 0; border-top: 1px solid #252b3b; margin: 1rem 0; }
    .prose-custom a { color: #a78bfa; text-decoration: underline; text-underline-offset: 2px; }
    .prose-custom a:hover { color: #c4b5fd; }
    .code-block-wrapper { position: relative; margin: 0.75rem 0; border-radius: 0.5rem; overflow: hidden; border: 1px solid #252b3b; background: #0b0d13; }
    .code-block-header { display: flex; align-items: center; justify-content: space-between; padding: 0.35rem 0.75rem; background: #161922; border-bottom: 1px solid #252b3b; font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: #94a3b8; }
    .code-copy-btn { padding: 0.2rem 0.5rem; border-radius: 0.25rem; font-size: 0.7rem; color: #94a3b8; background: #1d222e; border: 1px solid #252b3b; transition: all 0.15s; cursor: pointer; }
    .code-copy-btn:hover { color: #fff; background: #252b3b; }

    /* Light Theme Overrides */
    html.light {
      --bg-surface-950: #f8fafc;
      --bg-surface-900: #f1f5f9;
      --bg-surface-850: #ffffff;
      --bg-surface-800: #f8fafc;
      --bg-surface-750: #e2e8f0;
      --bg-surface-700: #cbd5e1;
    }
    html.light body { background-color: #f8fafc !important; color: #0f172a !important; }
    html.light .bg-surface-950 { background-color: #f8fafc !important; }
    html.light .bg-surface-900 { background-color: #f1f5f9 !important; }
    html.light .bg-surface-850 { background-color: #ffffff !important; }
    html.light .bg-surface-800 { background-color: #f8fafc !important; }
    html.light .bg-surface-750 { background-color: #e2e8f0 !important; }
    html.light .bg-surface-700 { background-color: #cbd5e1 !important; }
    html.light .border-surface-750 { border-color: #e2e8f0 !important; }
    html.light .border-surface-700 { border-color: #cbd5e1 !important; }
    html.light .text-slate-100, html.light .text-slate-200 { color: #0f172a !important; }
    html.light .text-slate-300 { color: #334155 !important; }
    html.light .text-slate-400 { color: #64748b !important; }
    html.light .text-white { color: #0f172a !important; }
    html.light textarea, html.light input, html.light select {
      background-color: #ffffff !important;
      color: #0f172a !important;
      border-color: #cbd5e1 !important;
    }
    html.light textarea::placeholder, html.light input::placeholder {
      color: #94a3b8 !important;
    }
    html.light .prose-custom { color: #1e293b !important; }
    html.light .prose-custom p, html.light .prose-custom li { color: #334155 !important; }
    html.light .prose-custom strong, html.light .prose-custom h1, html.light .prose-custom h2, html.light .prose-custom h3 { color: #0f172a !important; }
    html.light .prose-custom code:not(pre code) { background: #ede9fe !important; color: #6d28d9 !important; border-color: #ddd6fe !important; }
    html.light .prose-custom pre { background: #f8fafc !important; border-color: #e2e8f0 !important; }
    html.light .prose-custom blockquote { background: #f5f3ff !important; color: #475569 !important; border-left-color: #7c3aed !important; }
    html.light .prose-custom th { background: #f1f5f9 !important; color: #1e293b !important; }
    html.light .prose-custom td, html.light .prose-custom th { border-color: #e2e8f0 !important; }
    html.light .code-block-header { background: #f1f5f9 !important; border-color: #e2e8f0 !important; color: #475569 !important; }
    html.light .code-copy-btn { background: #ffffff !important; border-color: #cbd5e1 !important; color: #475569 !important; }
    html.light #footerNav, html.light header { background-color: rgba(255, 255, 255, 0.95) !important; }
    html.light #sidebar { background-color: #ffffff !important; }
  </style>
</head>
<body class="bg-surface-900 text-slate-100 min-h-[100dvh] h-[100dvh] max-h-[100dvh] h-screen w-full flex overflow-hidden antialiased">

  <!-- Mobile Backdrop Overlay for Sidebar Drawer -->
  <div id="sidebarBackdrop" onclick="toggleSidebar(false)" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"></div>

  <!-- ========================================================================= -->
  <!-- SIDEBAR (DRAWER ON MOBILE / SLIDEABLE ON DESKTOP) -->
  <!-- ========================================================================= -->
  <aside id="sidebar" class="fixed inset-y-0 left-0 z-50 transform -translate-x-full md:translate-x-0 md:static transition-all duration-300 ease-in-out w-72 max-w-[85vw] bg-surface-850 border-r border-surface-750 flex flex-col justify-between shrink-0 shadow-2xl md:shadow-none h-full overflow-hidden">
    <div class="p-4 border-b border-surface-750 flex items-center justify-between">
      <div class="flex items-center gap-2.5 overflow-hidden">
        <div id="appLogoContainer" class="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20 font-bold text-white tracking-wider shrink-0 overflow-hidden text-base">
          Ψ
        </div>
        <div class="overflow-hidden">
          <h1 class="font-bold text-sm leading-tight text-white flex items-center gap-1.5 truncate">
            <span id="appNameText" class="truncate">Andy Agent</span>
            <span id="appBadgeText" class="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-100 font-mono shrink-0">RLM</span>
          </h1>
          <p id="appSloganText" class="text-[11px] text-slate-400 truncate">Context Engine & WebUI</p>
        </div>
      </div>
      <button onclick="toggleSidebar(false)" title="Cerrar menú" class="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-surface-750 transition-colors md:hidden cursor-pointer">
        <i data-lucide="x" class="w-4 h-4"></i>
      </button>
    </div>

    <!-- Project Selector Widget -->
    <div class="px-3 pt-3">
      <div class="bg-surface-800/90 hover:bg-surface-750 border border-surface-700/80 rounded-xl p-2.5 transition-all">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 overflow-hidden flex-1 cursor-pointer" onclick="openProjectsModal()">
            <div class="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <i data-lucide="folder-kanban" class="w-4 h-4 text-cyan-400"></i>
            </div>
            <div class="overflow-hidden flex-1">
              <div class="flex items-center gap-1.5">
                <span id="sidebarProjectName" class="text-xs font-semibold text-white truncate">Cargando...</span>
                <span class="text-[9px] px-1 py-0.2 rounded bg-surface-700 text-cyan-300 font-mono">Proj</span>
              </div>
              <p id="sidebarProjectPath" class="text-[10px] text-slate-400 font-mono truncate">...</p>
            </div>
          </div>
          <button onclick="openProjectsModal()" title="Gestionar y cambiar proyectos" class="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-surface-700 transition-colors shrink-0 ml-1">
            <i data-lucide="chevrons-up-down" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- New Chat Button -->
    <div class="p-3 pb-1.5 space-y-2">
      <button onclick="createNewSession()" class="w-full bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-medium text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-brand-600/20 transition-all duration-150 cursor-pointer">
        <i data-lucide="plus" class="w-4 h-4"></i>
        Nueva Conversación
      </button>

      <!-- Pantheon Studio Quick Navigation Card in Sidebar -->
      <div class="bg-surface-800/90 border border-purple-500/30 rounded-xl p-2.5 space-y-2 shadow-md">
        <div class="flex items-center justify-between">
          <button onclick="switchView('pantheon')" class="flex items-center gap-1.5 text-xs font-bold text-white hover:text-purple-300 transition-colors cursor-pointer">
            <i data-lucide="crown" class="w-4 h-4 text-purple-400"></i>
            <span>Pantheon Studio</span>
          </button>
          <span class="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">Swarm</span>
        </div>
        <div class="flex items-center gap-1.5">
          <button onclick="openCreateAgentModal()" title="Crear Nuevo Agente Bot" class="flex-1 bg-surface-750 hover:bg-purple-600/30 border border-surface-700 hover:border-purple-500/40 text-[11px] font-medium py-1.5 px-2 rounded-lg text-slate-200 hover:text-white flex items-center justify-center gap-1 transition-all cursor-pointer">
            <i data-lucide="user-plus" class="w-3.5 h-3.5 text-purple-400"></i>
            <span>+ Agente</span>
          </button>
          <button onclick="openCreateSquadModal()" title="Crear Nuevo Escuadrón" class="flex-1 bg-surface-750 hover:bg-indigo-600/30 border border-surface-700 hover:border-indigo-500/40 text-[11px] font-medium py-1.5 px-2 rounded-lg text-slate-200 hover:text-white flex items-center justify-center gap-1 transition-all cursor-pointer">
            <i data-lucide="shield-plus" class="w-3.5 h-3.5 text-indigo-400"></i>
            <span>+ Escuadrón</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Sessions List -->
    <div class="flex-1 overflow-y-auto px-3 py-1 space-y-1" id="sessionsList">
      <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1 flex items-center justify-between">
        <span>Historial de Sesiones</span>
        <span id="sessionCountBadge" class="text-[10px] bg-surface-750 px-1.5 py-0.2 rounded text-slate-300">0</span>
      </div>
      <div id="sessionsContainer" class="space-y-1"></div>
    </div>

    <!-- System Telemetry Widget -->
    <div class="p-3 bg-surface-800/60 border-t border-surface-750 space-y-2">
      <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1 flex items-center justify-between">
        <span>Estado del Sistema</span>
        <span id="autoLearnIndicatorText" class="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">Auto-Learn</span>
      </div>
      <div class="grid grid-cols-3 gap-1 text-[10px]">
        <div class="bg-surface-750/70 p-1.5 rounded border border-surface-700/50 flex flex-col">
          <span class="text-slate-400 text-[9px] flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            RLM
          </span>
          <span class="font-mono text-emerald-300 font-semibold mt-0.5">Online</span>
        </div>
        <div class="bg-surface-750/70 p-1.5 rounded border border-surface-700/50 flex flex-col">
          <span class="text-slate-400 text-[9px] flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            Graft
          </span>
          <span id="graftFileCountStatus" class="font-mono text-cyan-300 font-semibold mt-0.5">Activo</span>
        </div>
        <div class="bg-surface-750/70 p-1.5 rounded border border-surface-700/50 flex flex-col">
          <span class="text-slate-400 text-[9px] flex items-center gap-1">
            <span id="autoLearnDot" class="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
            Learn
          </span>
          <span id="autoLearnBadge" class="font-mono text-purple-300 font-semibold mt-0.5">Activo</span>
        </div>
      </div>
    </div>

    <!-- Footer Controls -->
    <div class="p-3 border-t border-surface-750 flex items-center justify-between bg-surface-850">
      <button onclick="openSettingsModal()" class="flex items-center gap-2 text-xs text-slate-300 hover:text-white p-1.5 rounded-md hover:bg-surface-750 transition-colors">
        <i data-lucide="settings" class="w-4 h-4 text-slate-400"></i>
        <span>Configuración</span>
      </button>
      <div class="flex items-center gap-1">
        <button onclick="toggleTheme()" title="Cambiar tema (Oscuro / Claro)" class="theme-toggle-btn p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-surface-750 transition-colors cursor-pointer">
          <i data-lucide="moon" class="theme-toggle-icon w-4 h-4"></i>
        </button>
      </div>
    </div>
  </aside>

  <!-- ========================================================================= -->
  <!-- MAIN WORKSPACE -->
  <!-- ========================================================================= -->
  <main class="flex-1 flex flex-col h-full overflow-hidden bg-surface-900 relative">
    
    <!-- Header Navigation -->
    <header class="h-14 border-b border-surface-750 bg-surface-850/95 backdrop-blur px-3 sm:px-4 flex items-center justify-between z-20 shrink-0 gap-3">
      <!-- Left side: Sidebar Toggle & Project Selector -->
      <div class="flex items-center gap-2 shrink-0">
        <button onclick="toggleSidebar()" aria-label="Menu" title="Alternar panel lateral" class="text-slate-300 hover:text-white p-2 rounded-xl hover:bg-surface-750 transition-colors shrink-0 cursor-pointer">
          <i data-lucide="panel-left" class="w-5 h-5"></i>
        </button>

        <!-- Project Badge in Header -->
        <button onclick="openProjectsModal()" title="Proyecto activo - Clic para cambiar o crear proyectos" class="flex items-center gap-2 bg-surface-800 hover:bg-surface-750 border border-surface-700/80 px-3 py-1.5 rounded-xl text-xs text-slate-200 hover:text-white transition-all shadow-sm max-w-[200px] sm:max-w-[300px] md:max-w-[400px] truncate group cursor-pointer">
          <div class="w-6 h-6 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <i data-lucide="folder-kanban" class="w-3.5 h-3.5 text-cyan-400"></i>
          </div>
          <span id="headerProjectName" class="truncate font-semibold text-xs text-slate-100">Proyecto Principal</span>
          <i data-lucide="chevrons-up-down" class="w-3.5 h-3.5 text-slate-400 shrink-0 opacity-60 group-hover:opacity-100"></i>
        </button>
      </div>

      <!-- Right side: Controls -->
      <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <!-- Pantheon Squad Selector Dropdown -->
        <div class="relative">
          <button onclick="toggleSquadDropdown()" id="squadSelectorBtn" class="flex items-center gap-1.5 bg-surface-800 hover:bg-surface-750 border border-purple-500/40 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-100 transition-all shadow-sm max-w-[150px] sm:max-w-[240px] md:max-w-none truncate cursor-pointer group">
            <span class="w-2 h-2 rounded-full bg-purple-400 animate-pulse shrink-0"></span>
            <i data-lucide="shield" class="w-3.5 h-3.5 text-purple-400 shrink-0"></i>
            <span id="selectedSquadLabel" class="truncate text-[11px] sm:text-xs">FullStack Engineering Squad</span>
            <span id="selectedSquadCountBadge" class="hidden sm:inline text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">4 agentes</span>
            <i data-lucide="chevron-down" class="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0 group-hover:text-white transition-colors"></i>
          </button>
          
          <!-- Squads Dropdown Popover -->
          <div id="squadDropdownMenu" class="hidden fixed inset-x-3 top-16 md:absolute md:inset-auto md:right-0 md:top-auto md:mt-1.5 md:w-96 max-w-[calc(100vw-1.5rem)] bg-surface-850 border border-surface-700 rounded-2xl shadow-2xl z-50 text-xs overflow-hidden flex flex-col max-h-[75vh] md:max-h-[30rem]">
            <!-- Header & Search -->
            <div class="p-3 border-b border-surface-750 bg-surface-800/80 space-y-2">
              <div class="flex items-center justify-between">
                <span class="font-bold text-white text-xs flex items-center gap-1.5">
                  <i data-lucide="shield" class="w-4 h-4 text-purple-400"></i>
                  Escuadrones Multi-Agente
                </span>
                <span id="squadDropdownCountText" class="text-[10px] font-mono text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded-full">3 disponibles</span>
              </div>
              <div class="relative">
                <i data-lucide="search" class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5"></i>
                <input id="squadSearchInput" type="text" placeholder="Buscar escuadrón..." oninput="filterSquadDropdown(this.value)" class="w-full bg-surface-750 border border-surface-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-purple-500">
              </div>
            </div>

            <!-- Dynamic Squad List -->
            <div id="squadsDropdownList" class="flex-1 overflow-y-auto p-2 space-y-1.5 max-h-72 select-none"></div>

            <!-- Footer link to Pantheon Studio -->
            <div class="p-2.5 border-t border-surface-750 bg-surface-800/60 flex items-center justify-between text-[11px] text-slate-400">
              <span>Configuración de escuadrones</span>
              <button onclick="switchView('pantheon'); toggleSquadDropdown();" class="text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 cursor-pointer">
                <i data-lucide="settings" class="w-3.5 h-3.5"></i>
                <span>Pantheon Studio</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Goose-Style Autonomous Agent Toggle Button -->
        <button onclick="toggleActiveProjectAutonomy()" id="autonomyHeaderBtn" title="Alternar Modo Autónomo (Goose-style auto-edit sin confirmación)" class="flex items-center gap-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-300 transition-all shadow-sm shrink-0">
          <span id="autonomyHeaderDot" class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span id="autonomyHeaderText" class="hidden sm:inline">Autónomo: ON</span>
        </button>

        <select id="thinkingLevelSelect" onchange="setThinkingLevel(this.value)" class="hidden sm:block bg-surface-800 hover:bg-surface-750 border border-surface-700 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-300 focus:outline-none focus:border-brand-500 cursor-pointer">
          <option value="off">Thinking: Off</option>
          <option value="low">Thinking: Low</option>
          <option value="medium" selected>Thinking: Med</option>
          <option value="high">Thinking: High</option>
        </select>

        <button onclick="clearCurrentChat()" title="Limpiar chat" class="p-1.5 sm:p-2 text-slate-400 hover:text-white rounded-lg hover:bg-surface-750 transition-colors cursor-pointer">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>

        <!-- User Profile Dropdown -->
        <div class="relative">
          <button onclick="toggleUserDropdown()" id="userProfileBtn" class="flex items-center gap-1.5 bg-surface-800 hover:bg-surface-750 border border-surface-700 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-200 transition-colors shadow-sm shrink-0">
            <div class="w-5 h-5 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
              <span id="userAvatarLetter">A</span>
            </div>
            <span id="headerUserName" class="hidden md:inline font-medium text-xs max-w-[100px] truncate">admin</span>
            <span id="headerUserRoleBadge" class="hidden sm:inline text-[9px] px-1 py-0.2 rounded bg-brand-500/20 text-brand-300 font-mono">admin</span>
            <i data-lucide="chevron-down" class="w-3 h-3 text-slate-400"></i>
          </button>

          <div id="userDropdownMenu" class="hidden absolute right-0 mt-1.5 w-56 bg-surface-850 border border-surface-700 rounded-xl shadow-2xl z-50 text-xs overflow-hidden py-1">
            <div class="px-3 py-2 border-b border-surface-750 bg-surface-800/50">
              <div id="userDropdownDisplayName" class="font-semibold text-white truncate">Administrador</div>
              <div id="userDropdownUsername" class="text-[11px] text-slate-400 font-mono truncate">@admin</div>
            </div>
            <button onclick="openChangePasswordModal(); toggleUserDropdown(false);" class="w-full text-left px-3 py-2 hover:bg-surface-750 text-slate-300 hover:text-white flex items-center gap-2 transition-colors">
              <i data-lucide="key-round" class="w-3.5 h-3.5 text-yellow-400"></i>
              <span>Cambiar Contraseña</span>
            </button>
            <button id="userDropdownUsersAdminBtn" onclick="switchView('users'); toggleUserDropdown(false);" class="w-full text-left px-3 py-2 hover:bg-surface-750 text-slate-300 hover:text-white flex items-center gap-2 transition-colors">
              <i data-lucide="users" class="w-3.5 h-3.5 text-cyan-400"></i>
              <span>Gestión de Usuarios</span>
            </button>
            <div class="border-t border-surface-750 my-1"></div>
            <button onclick="performLogout()" class="w-full text-left px-3 py-2 hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 flex items-center gap-2 transition-colors">
              <i data-lucide="log-out" class="w-3.5 h-3.5"></i>
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- ======================================================================= -->
    <!-- VIEW: CHAT & RLM -->
    <!-- ======================================================================= -->
    <div id="viewChat" class="flex-1 flex flex-col min-h-0 overflow-hidden relative">
      <div id="chatMessages" class="flex-1 overflow-y-auto p-3 sm:p-4 md:px-8 space-y-4 sm:space-y-6 max-w-5xl w-full mx-auto select-text">
        <div id="welcomeScreen" class="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-8 sm:py-12 space-y-4 sm:space-y-6">
          <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-purple-400 flex items-center justify-center shadow-xl shadow-brand-500/25">
            <i data-lucide="sparkles" class="w-6 h-6 sm:w-7 sm:h-7 text-white"></i>
          </div>
          <div>
            <h2 class="text-lg sm:text-xl font-bold text-white tracking-tight">¿En qué trabajamos hoy?</h2>
            <p class="text-[11px] sm:text-xs text-slate-400 mt-1 max-w-sm">
              Andy Agent RLM con kernel interactivo Python, motor estructural Graft, MEMORY.md, AGENTS.md y soporte multimodelo.
            </p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 w-full text-left">
            <button onclick="sendQuickPrompt('Mapea la arquitectura del proyecto actual usando Graft')" class="p-3 bg-surface-800/80 hover:bg-surface-750 border border-surface-700/70 rounded-xl transition-all hover:border-brand-500/50 group flex flex-col gap-1">
              <span class="text-xs font-semibold text-slate-200 group-hover:text-brand-300 flex items-center gap-1.5">
                <i data-lucide="git-fork" class="w-3.5 h-3.5 text-cyan-400"></i>
                Mapear Repositorio
              </span>
              <span class="text-[11px] text-slate-400">Analizar clusters y entrypoints con Graft</span>
            </button>

            <button onclick="sendQuickPrompt('Ejecuta en IPython: import rlm.graft as graft; print(graft.map())')" class="p-3 bg-surface-800/80 hover:bg-surface-750 border border-surface-700/70 rounded-xl transition-all hover:border-brand-500/50 group flex flex-col gap-1">
              <span class="text-xs font-semibold text-slate-200 group-hover:text-brand-300 flex items-center gap-1.5">
                <i data-lucide="terminal" class="w-3.5 h-3.5 text-emerald-400"></i>
                Kernel IPython RLM
              </span>
              <span class="text-[11px] text-slate-400">Ejecutar Python con contexto nativo</span>
            </button>

            <button onclick="sendQuickPrompt('Revisa la memoria en MEMORY.md y las instrucciones de AGENTS.md')" class="p-3 bg-surface-800/80 hover:bg-surface-750 border border-surface-700/70 rounded-xl transition-all hover:border-brand-500/50 group flex flex-col gap-1">
              <span class="text-xs font-semibold text-slate-200 group-hover:text-brand-300 flex items-center gap-1.5">
                <i data-lucide="brain" class="w-3.5 h-3.5 text-purple-400"></i>
                Memoria & Reglas
              </span>
              <span class="text-[11px] text-slate-400">Consultar directivas persistentes</span>
            </button>

            <button onclick="sendQuickPrompt('Encuentra los callers y el blast radius de createAgentSession')" class="p-3 bg-surface-800/80 hover:bg-surface-750 border border-surface-700/70 rounded-xl transition-all hover:border-brand-500/50 group flex flex-col gap-1">
              <span class="text-xs font-semibold text-slate-200 group-hover:text-brand-300 flex items-center gap-1.5">
                <i data-lucide="target" class="w-3.5 h-3.5 text-amber-400"></i>
                Blast Radius
              </span>
              <span class="text-[11px] text-slate-400">Impacto de cambios y dependientes</span>
            </button>
          </div>
        </div>
      </div>

      <div id="liveExecutionIndicator" class="hidden max-w-4xl mx-auto w-full px-3 sm:px-4 mb-2">
        <div class="bg-surface-800/90 border border-brand-500/30 rounded-lg p-2.5 flex items-center justify-between text-xs backdrop-blur shadow-lg shadow-brand-500/10">
          <div class="flex items-center gap-2.5">
            <span class="relative flex h-2.5 w-2.5">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-500"></span>
            </span>
            <span id="liveExecutionText" class="font-medium text-slate-200 text-xs truncate">Ejecutando...</span>
          </div>
          <button onclick="abortCurrentExecution()" class="text-xs text-rose-400 hover:text-rose-300 font-medium px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 transition-colors shrink-0">
            Cancelar
          </button>
        </div>
      </div>

      <div class="p-2 sm:p-4 bg-surface-900/95 border-t border-surface-750/80 shrink-0 safe-bottom">
        <div class="max-w-4xl mx-auto relative bg-surface-800 border border-surface-700 rounded-2xl shadow-xl focus-within:border-purple-500 transition-all duration-200 overflow-hidden">
          <!-- Chat Quick Mention Chips Bar -->
          <div id="chatMentionChips" class="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-3 pt-2 pb-1 text-xs border-b border-surface-750/40 bg-surface-850/60">
            <span class="text-[10px] text-slate-400 font-semibold shrink-0 mr-0.5">Mencionar:</span>
            <!-- Dynamically populated via JS -->
          </div>

          <textarea
            id="promptInput"
            rows="1"
            placeholder="Envía una instrucción al escuadrón o menciona a un especialista (@Hermes, @Athena, @Argos)..."
            oninput="autoExpandTextarea(this)"
            onkeydown="handleInputKeyDown(event)"
            class="w-full bg-transparent text-sm text-slate-100 placeholder-slate-400 px-3 py-2.5 sm:px-4 sm:py-3 resize-none focus:outline-none max-h-36 sm:max-h-48 overflow-y-auto leading-relaxed"
          ></textarea>

          <div class="flex items-center justify-between px-2.5 pb-2 pt-1 text-xs">
            <div class="flex items-center gap-1 text-slate-400 overflow-x-auto no-scrollbar flex-nowrap pr-2">
              <button onclick="insertPromptPrefix('/graft:map')" class="px-2 py-0.5 rounded bg-surface-700 hover:bg-surface-600 text-slate-300 text-[10px] sm:text-[11px] whitespace-nowrap shrink-0 transition-colors">/map</button>
              <button onclick="insertPromptPrefix('/graft:skeleton ')" class="px-2 py-0.5 rounded bg-surface-700 hover:bg-surface-600 text-slate-300 text-[10px] sm:text-[11px] whitespace-nowrap shrink-0 transition-colors">/skeleton</button>
              <button onclick="insertPromptPrefix('/graft:callers ')" class="px-2 py-0.5 rounded bg-surface-700 hover:bg-surface-600 text-slate-300 text-[10px] sm:text-[11px] whitespace-nowrap shrink-0 transition-colors">/callers</button>
              <button onclick="insertPromptPrefix('/graft:blast ')" class="px-2 py-0.5 rounded bg-surface-700 hover:bg-surface-600 text-slate-300 text-[10px] sm:text-[11px] whitespace-nowrap shrink-0 transition-colors">/blast</button>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <button id="sendPromptBtn" onclick="submitPrompt()" class="bg-brand-600 hover:bg-brand-500 text-white font-medium p-2 rounded-lg transition-all duration-150 shadow-md shadow-brand-600/30 flex items-center justify-center">
                <i data-lucide="arrow-up" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        </div>
        <p class="text-center text-[10px] sm:text-[11px] text-slate-400 mt-1 sm:mt-2">Andy Agent RLM • Context Engine & Memory Activos</p>
      </div>
    </div>

    <!-- ======================================================================= -->
    <!-- VIEW: MULTI-PROVIDER HUB (AUTO-FETCH MODELS DROPDOWNS) -->
    <!-- ======================================================================= -->
    <!-- VIEW: MULTI-PROVIDER HUB (AUTO-FETCH MODELS DROPDOWNS) -->
    <!-- ======================================================================= -->
    <div id="viewProviders" class="hidden flex-1 flex flex-col min-h-0 overflow-y-auto p-3 sm:p-6 max-w-7xl w-full mx-auto space-y-4 sm:space-y-6">
      <!-- Mobile Back to Chat Button -->
      <div class="sm:hidden flex items-center justify-between gap-2 shrink-0 pb-1">
        <button onclick="switchView('chat')" class="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 px-3 py-1.5 rounded-xl font-semibold cursor-pointer shadow-sm transition-colors">
          <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i>
          <span>Volver al Chat</span>
        </button>
        <span class="text-[11px] font-bold text-amber-400 font-mono">Proveedores</span>
      </div>

      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-white flex items-center gap-2">
            <i data-lucide="zap" class="w-5 h-5 text-amber-400"></i>
            Centro de Proveedores & Conexiones de IA
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">Ingresa tu API Key y el catálogo de modelos se cargará automáticamente en un menú desplegable.</p>
        </div>

        <!-- Filter Category Tabs -->
        <div class="flex items-center gap-1 bg-surface-800 p-1 rounded-xl border border-surface-700 text-xs overflow-x-auto">
          <button onclick="filterProviders('ALL')" class="provider-filter-btn px-3 py-1.5 rounded-lg font-medium bg-brand-600 text-white" data-pfilter="ALL">Todos</button>
          <button onclick="filterProviders('Routers & Proxy')" class="provider-filter-btn px-3 py-1.5 rounded-lg font-medium text-slate-300 hover:text-white" data-pfilter="Routers & Proxy">Routers & Proxy</button>
          <button onclick="filterProviders('Propietarios')" class="provider-filter-btn px-3 py-1.5 rounded-lg font-medium text-slate-300 hover:text-white" data-pfilter="Propietarios">Propietarios</button>
          <button onclick="filterProviders('Open-Weight')" class="provider-filter-btn px-3 py-1.5 rounded-lg font-medium text-slate-300 hover:text-white" data-pfilter="Open-Weight">Open-Weight</button>
          <button onclick="filterProviders('Inferencia Rápida')" class="provider-filter-btn px-3 py-1.5 rounded-lg font-medium text-slate-300 hover:text-white" data-pfilter="Inferencia Rápida">Inferencia Rápida</button>
          <button onclick="filterProviders('Local / Autohospedado')" class="provider-filter-btn px-3 py-1.5 rounded-lg font-medium text-slate-300 hover:text-white" data-pfilter="Local / Autohospedado">Locales</button>
        </div>
      </div>

      <!-- Providers Grid Dynamic Container -->
      <div id="providersGridContainer" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"></div>
    </div>

    <!-- ======================================================================= -->
    <!-- VIEW: MEMORY & AGENT RULES (MEMORY.MD & AGENTS.MD) -->
    <!-- ======================================================================= -->
    <div id="viewMemory" class="hidden flex-1 flex flex-col min-h-0 overflow-y-auto p-3 sm:p-6 max-w-6xl w-full mx-auto space-y-4">
      <!-- Mobile Back to Chat Button -->
      <div class="sm:hidden flex items-center justify-between gap-2 shrink-0 pb-1">
        <button onclick="switchView('chat')" class="flex items-center gap-1.5 text-xs text-purple-300 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 px-3 py-1.5 rounded-xl font-semibold cursor-pointer shadow-sm transition-colors">
          <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i>
          <span>Volver al Chat</span>
        </button>
        <span class="text-[11px] font-bold text-purple-400 font-mono">Memoria</span>
      </div>

      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <i data-lucide="brain" class="w-5 h-5 text-purple-400"></i>
            Memoria Persistente & Reglas
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">MEMORY.md y AGENTS.md.</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <div class="bg-surface-800 p-1 rounded-lg border border-surface-700 flex items-center text-xs">
            <button id="docTypeMemoryBtn" onclick="switchDocType('memory')" class="px-2.5 py-1 rounded font-medium bg-purple-600 text-white">MEMORY.md</button>
            <button id="docTypeAgentsBtn" onclick="switchDocType('agents')" class="px-2.5 py-1 rounded font-medium text-slate-400 hover:text-white">AGENTS.md</button>
          </div>

          <div class="bg-surface-800 p-1 rounded-lg border border-surface-700 flex items-center text-xs">
            <button id="memoryScopeProjectBtn" onclick="switchMemoryScope('project')" class="px-2.5 py-1 rounded font-medium bg-brand-600 text-white">Proyecto</button>
            <button id="memoryScopeGlobalBtn" onclick="switchMemoryScope('global')" class="px-2.5 py-1 rounded font-medium text-slate-400 hover:text-white">Global</button>
          </div>

          <button onclick="downloadMemoryBackup()" title="Descargar respaldo" class="bg-surface-800 hover:bg-surface-750 border border-surface-700 text-xs font-medium p-2 sm:px-3 sm:py-2 rounded-lg flex items-center gap-1.5 text-slate-200 transition-colors">
            <i data-lucide="download" class="w-4 h-4 text-cyan-400"></i>
            <span class="hidden sm:inline">Descargar</span>
          </button>

          <label title="Restaurar respaldo" class="bg-surface-800 hover:bg-surface-750 border border-surface-700 text-xs font-medium p-2 sm:px-3 sm:py-2 rounded-lg flex items-center gap-1.5 text-slate-200 transition-colors cursor-pointer">
            <i data-lucide="upload" class="w-4 h-4 text-amber-400"></i>
            <span class="hidden sm:inline">Restaurar</span>
            <input type="file" accept=".md,.txt" onchange="restoreMemoryBackup(event)" class="hidden">
          </label>

          <button onclick="saveActiveDoc()" class="bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-md shadow-brand-600/20 transition-all">
            <i data-lucide="save" class="w-4 h-4"></i>
            Guardar
          </button>
        </div>
      </div>

      <div class="flex-1 min-h-[300px] bg-surface-850 border border-surface-750 rounded-xl overflow-hidden flex flex-col">
        <div class="p-3 bg-surface-800 border-b border-surface-750 flex items-center justify-between text-xs text-slate-300 font-mono">
          <span id="memoryFilePathLabel" class="truncate">Cargando archivo...</span>
          <span id="memorySaveStatus" class="text-[11px] text-emerald-400 font-sans font-medium shrink-0 ml-2"></span>
        </div>
        <textarea id="memoryEditorText" class="flex-1 p-3 sm:p-4 bg-surface-900/80 font-mono text-xs text-slate-200 leading-relaxed focus:outline-none resize-none min-h-[250px]"></textarea>
      </div>
    </div>

    <!-- ======================================================================= -->
    <!-- VIEW: SKILLS & PROMPTS STUDIO -->
    <!-- ======================================================================= -->
    <div id="viewSkills" class="hidden flex-1 flex flex-col min-h-0 overflow-y-auto p-3 sm:p-6 max-w-6xl w-full mx-auto space-y-4">
      <!-- Mobile Back to Chat Button -->
      <div class="sm:hidden flex items-center justify-between gap-2 shrink-0 pb-1">
        <button onclick="switchView('chat')" class="flex items-center gap-1.5 text-xs text-indigo-300 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 px-3 py-1.5 rounded-xl font-semibold cursor-pointer shadow-sm transition-colors">
          <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i>
          <span>Volver al Chat</span>
        </button>
        <span class="text-[11px] font-bold text-indigo-400 font-mono">Skills Studio</span>
      </div>

      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <i data-lucide="sparkles" class="w-5 h-5 text-indigo-400"></i>
            Skills & Prompts Studio
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">Habilidades activas y plantillas de prompts.</p>
        </div>

        <button onclick="openCreateSkillModal()" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors">
          <i data-lucide="plus" class="w-4 h-4"></i>
          Nueva Habilidad
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
        <div class="bg-surface-850 border border-surface-750 rounded-xl p-4 flex flex-col space-y-3 min-h-[250px]">
          <h3 class="font-bold text-sm text-slate-200 flex items-center gap-2">
            <i data-lucide="zap" class="w-4 h-4 text-indigo-400"></i>
            Habilidades Registradas (.andy/skills)
          </h3>
          <div id="skillsListContainer" class="flex-1 overflow-y-auto space-y-2 text-xs">
            <div class="text-slate-400 p-4 text-center">Cargando habilidades...</div>
          </div>
        </div>

        <div class="bg-surface-850 border border-surface-750 rounded-xl p-4 flex flex-col space-y-3 min-h-[250px]">
          <h3 class="font-bold text-sm text-slate-200 flex items-center gap-2">
            <i data-lucide="file-text" class="w-4 h-4 text-amber-400"></i>
            Plantillas de Prompts (.andy/prompts)
          </h3>
          <div id="promptsListContainer" class="flex-1 overflow-y-auto space-y-2 text-xs">
            <div class="text-slate-400 p-4 text-center">Cargando plantillas...</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================================================================= -->
    <!-- VIEW: BRANCH TREE (TIME TRAVEL DAG) -->
    <!-- ======================================================================= -->
    <div id="viewTree" class="hidden flex-1 flex flex-col min-h-0 overflow-y-auto p-3 sm:p-6 max-w-6xl w-full mx-auto space-y-4">
      <!-- Mobile Back to Chat Button -->
      <div class="sm:hidden flex items-center justify-between gap-2 shrink-0 pb-1">
        <button onclick="switchView('chat')" class="flex items-center gap-1.5 text-xs text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 px-3 py-1.5 rounded-xl font-semibold cursor-pointer shadow-sm transition-colors">
          <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i>
          <span>Volver al Chat</span>
        </button>
        <span class="text-[11px] font-bold text-rose-400 font-mono">Árbol DAG</span>
      </div>

      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <i data-lucide="git-branch" class="w-5 h-5 text-rose-400"></i>
            Árbol de Ramas (Time Travel)
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">Puntos de decisión de la sesión actual.</p>
        </div>

        <button onclick="refreshBranchTree()" class="bg-surface-800 hover:bg-surface-750 border border-surface-700 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 text-slate-200">
          <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
          Refrescar
        </button>
      </div>

      <div class="flex-1 bg-surface-850 border border-surface-750 rounded-xl p-4 sm:p-6 overflow-y-auto space-y-4">
        <div id="treeContainer" class="space-y-3"></div>
      </div>
    </div>

    <!-- ======================================================================= -->
    <!-- VIEW: LOGS & TRAZAS -->
    <!-- ======================================================================= -->
    <div id="viewLogs" class="hidden flex-1 flex flex-col min-h-0 overflow-y-auto p-3 sm:p-6 max-w-6xl w-full mx-auto space-y-4">
      <!-- Mobile Back to Chat Button -->
      <div class="sm:hidden flex items-center justify-between gap-2 shrink-0 pb-1">
        <button onclick="switchView('chat')" class="flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 px-3 py-1.5 rounded-xl font-semibold cursor-pointer shadow-sm transition-colors">
          <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i>
          <span>Volver al Chat</span>
        </button>
        <span class="text-[11px] font-bold text-emerald-400 font-mono">Consola Logs</span>
      </div>

      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <i data-lucide="scroll-text" class="w-5 h-5 text-emerald-400"></i>
            Consola de Logs en Vivo
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">Stream de peticiones API y eventos del kernel.</p>
        </div>

        <div class="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <div class="flex items-center gap-1 text-xs">
            <button onclick="filterLogs('ALL')" class="px-2.5 py-1 rounded bg-surface-750 hover:bg-surface-700 text-white font-medium log-filter-btn" data-filter="ALL">Todos</button>
            <button onclick="filterLogs('RLM')" class="px-2.5 py-1 rounded bg-surface-800 hover:bg-surface-700 text-purple-400 font-medium log-filter-btn" data-filter="RLM">RLM</button>
            <button onclick="filterLogs('TOOL')" class="px-2.5 py-1 rounded bg-surface-800 hover:bg-surface-700 text-cyan-400 font-medium log-filter-btn" data-filter="TOOL">Tools</button>
            <button onclick="filterLogs('INFO')" class="px-2.5 py-1 rounded bg-surface-800 hover:bg-surface-700 text-emerald-400 font-medium log-filter-btn" data-filter="INFO">Info</button>
            <button onclick="filterLogs('ERROR')" class="px-2.5 py-1 rounded bg-surface-800 hover:bg-surface-700 text-rose-400 font-medium log-filter-btn" data-filter="ERROR">Error</button>
          </div>
          <button onclick="clearLogsConsole()" class="p-2 text-slate-400 hover:text-white bg-surface-800 border border-surface-700 rounded-lg shrink-0">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>

      <div id="logsConsole" class="flex-1 bg-surface-950 border border-surface-750 rounded-xl p-3 sm:p-4 overflow-y-auto font-mono text-xs space-y-2 select-text min-h-[300px]"></div>
    </div>

    <!-- ======================================================================= -->
    <!-- VIEW: GRAFT STUDIO (GRAPH ENGINEERING & CODE KNOWLEDGE GRAPH) -->
    <!-- ======================================================================= -->
    <div id="viewGraft" class="hidden flex-1 flex flex-col min-h-0 overflow-y-auto p-3 sm:p-6 max-w-6xl w-full mx-auto space-y-4">
      <!-- Mobile Back to Chat Button -->
      <div class="sm:hidden flex items-center justify-between gap-2 shrink-0 pb-1">
        <button onclick="switchView('chat')" class="flex items-center gap-1.5 text-xs text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 px-3 py-1.5 rounded-xl font-semibold cursor-pointer shadow-sm transition-colors">
          <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i>
          <span>Volver al Chat</span>
        </button>
        <span class="text-[11px] font-bold text-cyan-400 font-mono">Graft Studio</span>
      </div>

      <!-- Header with sub-tabs -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-750 pb-3">
        <div>
          <h2 class="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <i data-lucide="git-fork" class="w-5 h-5 text-cyan-400"></i>
            Graft Studio 2.0
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-normal">Graph Engineering</span>
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">Exploración estructural del proyecto, AST y grafo de conocimiento.</p>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <!-- Sub-Tab switcher -->
          <div class="bg-surface-800 p-1 rounded-xl border border-surface-700 flex items-center text-xs">
            <button id="graftSubTabVisualBtn" onclick="switchGraftSubTab('visual')" class="px-3 py-1.5 rounded-lg font-semibold bg-cyan-600 text-white shadow-sm transition-all flex items-center gap-1.5">
              <i data-lucide="network" class="w-3.5 h-3.5"></i>
              Grafo 2D
            </button>
            <button id="graftSubTabAuditBtn" onclick="switchGraftSubTab('audit')" class="px-3 py-1.5 rounded-lg font-medium text-slate-400 hover:text-white transition-all flex items-center gap-1.5">
              <i data-lucide="shield-alert" class="w-3.5 h-3.5"></i>
              Auditoría & Ciclos
            </button>
            <button id="graftSubTabToolsBtn" onclick="switchGraftSubTab('tools')" class="px-3 py-1.5 rounded-lg font-medium text-slate-400 hover:text-white transition-all flex items-center gap-1.5">
              <i data-lucide="wrench" class="w-3.5 h-3.5"></i>
              Herramientas
            </button>
          </div>

          <button onclick="refreshGraftData()" title="Reindexar grafo" class="bg-surface-800 hover:bg-surface-750 border border-surface-700 text-xs font-medium px-3 py-2 rounded-xl text-slate-200 hover:text-white flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer">
            <i data-lucide="refresh-cw" class="w-3.5 h-3.5 text-cyan-400"></i>
            <span class="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      <!-- SUBTAB 1: 2D VISUAL CODE GRAPH CANVAS -->
      <div id="graftSubTabVisual" class="flex flex-col flex-1 min-h-[500px] space-y-3">
        <!-- Controls Bar -->
        <div class="bg-surface-850 border border-surface-750 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div class="flex items-center gap-2 flex-1 min-w-[200px]">
            <div class="relative flex-1">
              <i data-lucide="search" class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5"></i>
              <input id="graftNodeSearchInput" type="text" placeholder="Buscar archivo o símbolo en el grafo..." oninput="filterGraphNodes(this.value)" class="w-full bg-surface-750 border border-surface-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500">
            </div>
            <select id="graftClusterSelect" onchange="filterGraphByCluster(this.value)" class="bg-surface-750 border border-surface-700 text-xs text-slate-200 px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-cyan-500">
              <option value="ALL">Todos los Clusters</option>
            </select>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <span id="graftMetricsBadge" class="text-[11px] font-mono text-slate-400 bg-surface-800 px-2.5 py-1 rounded-lg border border-surface-700">0 nodos | 0 conexiones</span>
            <button onclick="resetGraphZoom()" title="Centrar grafo" class="p-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-slate-300 hover:text-white border border-surface-700 cursor-pointer">
              <i data-lucide="maximize-2" class="w-4 h-4"></i>
            </button>
          </div>
        </div>

        <!-- Main Graph Area & Side Inspector -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-[440px]">
          <!-- Interactive Canvas Container -->
          <div class="lg:col-span-2 bg-surface-950 border border-surface-750 rounded-2xl relative overflow-hidden flex flex-col min-h-[380px]">
            <canvas id="graftCanvas" class="w-full h-full cursor-grab active:cursor-grabbing block"></canvas>
            <div class="absolute bottom-3 left-3 bg-surface-900/90 backdrop-blur border border-surface-750 rounded-xl p-2 text-[10px] text-slate-400 flex items-center gap-3">
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-blue-500"></span> TypeScript</span>
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> Python</span>
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-purple-500"></span> C#</span>
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-cyan-500"></span> Go</span>
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-amber-500"></span> Rust</span>
            </div>
          </div>

          <!-- Node Inspector Card -->
          <div id="graftNodeInspector" class="bg-surface-850 border border-surface-750 rounded-2xl p-4 flex flex-col space-y-3 overflow-y-auto max-h-[500px]">
            <div class="flex items-center justify-between border-b border-surface-750 pb-2">
              <span class="text-xs font-bold text-white flex items-center gap-1.5">
                <i data-lucide="info" class="w-4 h-4 text-cyan-400"></i>
                Inspector de Nodo
              </span>
              <span id="inspectorLangBadge" class="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-750 text-cyan-300">Selecciona un nodo</span>
            </div>

            <div id="inspectorEmptyState" class="text-center text-slate-500 text-xs py-12 italic">
              Haz clic en cualquier nodo del grafo interactivo para inspeccionar sus llamadas, tipos, esqueleto y radio de impacto.
            </div>

            <div id="inspectorContent" class="hidden space-y-3 text-xs">
              <div>
                <label class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Ruta del Archivo</label>
                <div id="inspectorFilePath" class="font-mono text-white text-[11px] break-all bg-surface-800 p-2 rounded-lg border border-surface-700 mt-1 select-all"></div>
              </div>

              <div class="grid grid-cols-3 gap-2 text-center text-[10px]">
                <div class="bg-surface-800 p-2 rounded-lg border border-surface-700">
                  <div class="text-slate-400">Líneas</div>
                  <div id="inspectorLineCount" class="font-mono font-bold text-white text-xs mt-0.5">0</div>
                </div>
                <div class="bg-surface-800 p-2 rounded-lg border border-surface-700">
                  <div class="text-slate-400">Dependientes (Fan-In)</div>
                  <div id="inspectorFanIn" class="font-mono font-bold text-emerald-400 text-xs mt-0.5">0</div>
                </div>
                <div class="bg-surface-800 p-2 rounded-lg border border-surface-700">
                  <div class="text-slate-400">Dependencias (Fan-Out)</div>
                  <div id="inspectorFanOut" class="font-mono font-bold text-amber-400 text-xs mt-0.5">0</div>
                </div>
              </div>

              <div>
                <label class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Símbolos Exportados (<span id="inspectorSymbolCount">0</span>)</label>
                <div id="inspectorSymbolsList" class="space-y-1 mt-1 max-h-36 overflow-y-auto"></div>
              </div>

              <div class="pt-2 flex gap-2">
                <button onclick="inspectSelectedNodeSkeleton()" class="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-medium py-1.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer">
                  <i data-lucide="file-code" class="w-3.5 h-3.5"></i>
                  Ver Esqueleto
                </button>
                <button onclick="inspectSelectedNodeBlast()" class="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-medium py-1.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer">
                  <i data-lucide="target" class="w-3.5 h-3.5"></i>
                  Radio de Impacto
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- SUBTAB 2: AUDIT & CYCLES -->
      <div id="graftSubTabAudit" class="hidden flex flex-col flex-1 space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Circular Dependencies Card -->
          <div class="bg-surface-850 border border-surface-750 rounded-2xl p-4 flex flex-col space-y-3 min-h-[350px]">
            <div class="flex items-center justify-between border-b border-surface-750 pb-2">
              <h3 class="font-bold text-sm text-white flex items-center gap-2">
                <i data-lucide="repeat" class="w-4 h-4 text-rose-400"></i>
                Dependencias Circulares
              </h3>
              <span id="auditCyclesCountBadge" class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">0 ciclos</span>
            </div>
            <p class="text-[11px] text-slate-400">Los ciclos de importación generan acoplamiento indeseado y posibles errores de inicialización.</p>
            <div id="auditCyclesList" class="flex-1 overflow-y-auto space-y-2 text-xs font-mono"></div>
          </div>

          <!-- Dead Code Card -->
          <div class="bg-surface-850 border border-surface-750 rounded-2xl p-4 flex flex-col space-y-3 min-h-[350px]">
            <div class="flex items-center justify-between border-b border-surface-750 pb-2">
              <h3 class="font-bold text-sm text-white flex items-center gap-2">
                <i data-lucide="ghost" class="w-4 h-4 text-amber-400"></i>
                Código Muerto / Símbolos Huérfanos
              </h3>
              <span id="auditDeadCodeCountBadge" class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">0 símbolos</span>
            </div>
            <p class="text-[11px] text-slate-400">Funciones y tipos exportados que no reciben invocaciones directas ni referencias en el código.</p>
            <div id="auditDeadCodeList" class="flex-1 overflow-y-auto space-y-2 text-xs font-mono"></div>
          </div>

          <!-- Static Diagnostics Card -->
          <div class="col-span-1 md:col-span-2 bg-surface-850 border border-surface-750 rounded-2xl p-4 flex flex-col space-y-3">
            <div class="flex items-center justify-between border-b border-surface-750 pb-2">
              <h3 class="font-bold text-sm text-white flex items-center gap-2">
                <i data-lucide="stethoscope" class="w-4 h-4 text-emerald-400"></i>
                Diagnósticos Estáticos en Tiempo Real (Sintaxis, JSON, Python, Brackets)
              </h3>
              <div class="flex items-center gap-2">
                <span id="auditDiagErrorsBadge" class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">0 errores</span>
                <span id="auditDiagWarningsBadge" class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">0 advertencias</span>
                <button onclick="loadGraftDiagnostics()" class="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium cursor-pointer">
                  <i data-lucide="refresh-cw" class="w-3 h-3"></i>
                  Escanear
                </button>
              </div>
            </div>
            <p class="text-[11px] text-slate-400">Verifica la integridad de llaves no balanceadas, sintaxis JSON, colons en Python y marcadores de conflicto Git.</p>
            <div id="auditDiagList" class="overflow-y-auto space-y-2 text-xs font-mono max-h-60"></div>
          </div>
        </div>
      </div>

      <!-- SUBTAB 3: STRUCTURAL TOOLS (Skeleton, Callers, Blast, Grep) -->
      <div id="graftSubTabTools" class="hidden flex flex-col flex-1 space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          <div class="bg-surface-800 border border-surface-700 rounded-xl p-3.5 space-y-2.5">
            <div class="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <i data-lucide="file-code" class="w-4 h-4 text-brand-400"></i>
              Esqueleto de Archivo
            </div>
            <p class="text-[11px] text-slate-400">Extraer firmas y tipos sin coste de tokens.</p>
            <div class="flex gap-1.5">
              <input id="graftSkeletonInput" type="text" placeholder="ej: src/server.ts o Comandos.cs" class="flex-1 bg-surface-750 border border-surface-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500">
              <button onclick="fetchGraftSkeleton()" class="bg-brand-600 hover:bg-brand-500 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors cursor-pointer">Ver</button>
            </div>
          </div>

          <div class="bg-surface-800 border border-surface-700 rounded-xl p-3.5 space-y-2.5">
            <div class="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <i data-lucide="phone-call" class="w-4 h-4 text-emerald-400"></i>
              Búsqueda de Callers / Cadena
            </div>
            <p class="text-[11px] text-slate-400">Módulos que invocan una función o método.</p>
            <div class="flex gap-1.5">
              <input id="graftCallersInput" type="text" placeholder="ej: CrearTrama o switchView" class="flex-1 bg-surface-750 border border-surface-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500">
              <button onclick="fetchGraftCallers()" class="bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors cursor-pointer">Buscar</button>
            </div>
          </div>

          <div class="bg-surface-800 border border-surface-700 rounded-xl p-3.5 space-y-2.5">
            <div class="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <i data-lucide="target" class="w-4 h-4 text-amber-400"></i>
              Radio de Impacto (Blast Radius)
            </div>
            <p class="text-[11px] text-slate-400">Impacto en cascada pre-edición.</p>
            <div class="flex gap-1.5">
              <input id="graftBlastInput" type="text" placeholder="ej: Comandos.cs o tipos" class="flex-1 bg-surface-750 border border-surface-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500">
              <button onclick="fetchGraftBlast()" class="bg-amber-600 hover:bg-amber-500 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors cursor-pointer">Evaluar</button>
            </div>
          </div>
        </div>

        <div class="flex-1 min-h-[250px] bg-surface-850 border border-surface-750 rounded-xl overflow-hidden flex flex-col">
          <div class="p-3 bg-surface-800 border-b border-surface-750 flex items-center justify-between text-xs text-slate-300 font-medium">
            <span id="graftResultsTitle" class="flex items-center gap-1.5">
              <i data-lucide="terminal" class="w-4 h-4 text-cyan-400"></i>
              Visor de Resultados Estructurales
            </span>
            <button onclick="copyGraftResult()" class="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer">
              <i data-lucide="copy" class="w-3.5 h-3.5"></i>
              Copiar
            </button>
          </div>
          <pre id="graftResultContent" class="flex-1 p-3 sm:p-4 overflow-auto text-xs font-mono text-slate-200 leading-relaxed bg-surface-900/60 select-text min-h-[200px]"></pre>
        </div>
      </div>
    </div>

    <!-- ======================================================================= -->
    <!-- VIEW: PANTHEON STUDIO (MULTI-AGENT SOCIETY & SQUADS) -->
    <!-- ======================================================================= -->
    <div id="viewPantheon" class="hidden flex-1 flex flex-col min-h-0 overflow-y-auto p-3 sm:p-6 max-w-7xl w-full mx-auto space-y-4">
      <!-- Mobile Back to Chat Button -->
      <div class="sm:hidden flex items-center justify-between gap-2 shrink-0 pb-1">
        <button onclick="switchView('chat')" class="flex items-center gap-1.5 text-xs text-purple-300 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 px-3 py-1.5 rounded-xl font-semibold cursor-pointer shadow-sm transition-colors">
          <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i>
          <span>Volver al Chat</span>
        </button>
        <span class="text-[11px] font-bold text-purple-400 font-mono">Pantheon 2.0</span>
      </div>

      <!-- Header with subtabs -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-750 pb-3 shrink-0">
        <div>
          <h2 class="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <i data-lucide="crown" class="w-5 h-5 text-purple-400"></i>
            Pantheon Studio
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono font-normal">Multi-Agent Swarm</span>
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">Sociedad coordinada de agentes especializados con identidades persistentes, mensajería peer-to-peer y contexto Graft/RLM.</p>
        </div>

        <div class="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <!-- Sub-Tab switcher -->
          <div class="bg-surface-800 p-1 rounded-xl border border-surface-700 flex items-center text-xs w-full sm:w-auto overflow-x-auto no-scrollbar">
            <button id="pantheonSubTabRosterBtn" onclick="switchPantheonSubTab('roster')" class="px-3 py-1.5 rounded-lg font-semibold bg-purple-600 text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer shrink-0">
              <i data-lucide="users" class="w-3.5 h-3.5"></i>
              Escuadrones & Agentes
            </button>
            <button id="pantheonSubTabTopologyBtn" onclick="switchPantheonSubTab('topology')" class="px-3 py-1.5 rounded-lg font-medium text-slate-400 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shrink-0">
              <i data-lucide="share-2" class="w-3.5 h-3.5"></i>
              Topología de Malla
            </button>
          </div>

          <button onclick="loadPantheonData()" title="Refrescar datos Pantheon" class="bg-surface-800 hover:bg-surface-750 border border-surface-700 text-xs font-medium px-3 py-2 rounded-xl text-slate-200 hover:text-white flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer shrink-0 ml-auto sm:ml-0">
            <i data-lucide="refresh-cw" class="w-3.5 h-3.5 text-purple-400"></i>
            <span class="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      <!-- SUBTAB 1: AGENT ROSTER & SQUADS (VISUAL BUILDER) -->
      <div id="pantheonSubTabRoster" class="flex flex-col flex-1 space-y-6">
        <!-- Section 1: Squads of the Pantheon -->
        <div class="space-y-3">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-750 pb-2">
            <div>
              <h3 class="font-bold text-sm text-white flex items-center gap-2">
                <i data-lucide="shield" class="w-4 h-4 text-indigo-400"></i>
                Escuadrones Colaborativos
              </h3>
              <p class="text-xs text-slate-400 mt-0.5">Equipos tácticos de agentes con un líder coordinador y flujos jerárquicos, secuenciales o colaborativos.</p>
            </div>

            <button onclick="openCreateSquadModal()" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer shrink-0">
              <i data-lucide="shield-plus" class="w-4 h-4"></i>
              Crear Nuevo Escuadrón
            </button>
          </div>

          <div id="pantheonSquadsGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- Populated dynamically via JS -->
          </div>
        </div>

        <!-- Section 2: Specialists Society -->
        <div class="space-y-3 pt-4 border-t border-surface-750">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-750 pb-2">
            <div>
              <h3 class="font-bold text-sm text-white flex items-center gap-2">
                <i data-lucide="users" class="w-4 h-4 text-purple-400"></i>
                Sociedad de Agentes Registrados
              </h3>
              <p class="text-xs text-slate-400 mt-0.5">Bots con identidades persistentes, especialidades asignadas, modelos de IA y herramientas independientes.</p>
            </div>

            <button onclick="openCreateAgentModal()" class="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition-all cursor-pointer shrink-0">
              <i data-lucide="user-plus" class="w-4 h-4"></i>
              Crear Nuevo Agente
            </button>
          </div>

          <div id="pantheonAgentsGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- Populated dynamically via JS -->
          </div>
        </div>
      </div>

      <!-- SUBTAB 2: TOPOLOGY & LIVE MESH -->
      <div id="pantheonSubTabTopology" class="hidden flex flex-col flex-1 space-y-4">
        <div class="bg-surface-850 border border-surface-750 rounded-2xl p-4 sm:p-5 flex flex-col space-y-3">
          <div class="flex items-center justify-between border-b border-surface-750 pb-2">
            <h3 class="font-bold text-sm text-white flex items-center gap-2">
              <i data-lucide="network" class="w-4 h-4 text-purple-400"></i>
              Topología de Comunicación & Delegación Peer-to-Peer
            </h3>
            <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">Malla Activa</span>
          </div>
          <p class="text-xs text-slate-400">Visualización de las conexiones entre el líder de escuadrón y los especialistas, con soporte de contexto Graft AST compartido.</p>

          <div id="pantheonTopologyDiagram" class="p-6 bg-surface-950 border border-surface-750 rounded-2xl min-h-[350px] flex flex-col items-center justify-center">
            <!-- Rendered by JS -->
          </div>
        </div>
      </div>
    </div>

    <!-- ======================================================================= -->
    <!-- VIEW: WORKSPACE FILES -->
    <!-- ======================================================================= -->
    <div id="viewFiles" class="hidden flex-1 flex flex-col min-h-0 overflow-y-auto p-3 sm:p-6 max-w-6xl w-full mx-auto space-y-4">
      <!-- Mobile Back to Chat Button -->
      <div class="sm:hidden flex items-center justify-between gap-2 shrink-0 pb-1">
        <button onclick="switchView('chat')" class="flex items-center gap-1.5 text-xs text-brand-300 bg-brand-500/15 hover:bg-brand-500/25 border border-brand-500/30 px-3 py-1.5 rounded-xl font-semibold cursor-pointer shadow-sm transition-colors">
          <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i>
          <span>Volver al Chat</span>
        </button>
        <span class="text-[11px] font-bold text-brand-400 font-mono">Archivos</span>
      </div>

      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <i data-lucide="folder-tree" class="w-5 h-5 text-amber-400"></i>
            Explorador de Archivos
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">Espacio de trabajo local.</p>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="saveActiveWorkspaceFile()" class="bg-brand-600 hover:bg-brand-500 text-xs font-medium px-3 py-2 rounded-lg text-white flex items-center gap-1.5 shadow-sm">
            <i data-lucide="save" class="w-3.5 h-3.5"></i>
            Guardar
          </button>
          <button onclick="refreshWorkspaceFiles()" class="bg-surface-800 hover:bg-surface-750 border border-surface-700 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 text-slate-200">
            <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>

      <div class="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[350px]">
        <div id="fileListContainer" class="bg-surface-850 border border-surface-750 rounded-xl overflow-y-auto p-2 space-y-1 text-xs font-mono text-slate-300 max-h-60 md:max-h-none"></div>

        <div class="md:col-span-2 bg-surface-850 border border-surface-750 rounded-xl overflow-hidden flex flex-col min-h-[250px]">
          <div class="p-3 bg-surface-800 border-b border-surface-750 flex items-center justify-between text-xs text-slate-300">
            <span id="previewFileName" class="font-mono text-brand-300 truncate">Selecciona un archivo</span>
            <span id="fileSaveStatus" class="text-[11px] text-emerald-400 shrink-0 ml-2"></span>
          </div>
          <textarea id="filePreviewEditor" class="flex-1 p-3 sm:p-4 overflow-auto text-xs font-mono text-slate-200 leading-relaxed bg-surface-900/80 focus:outline-none resize-none min-h-[200px]"></textarea>
        </div>
      </div>
    </div>

    <!-- ======================================================================= -->
    <!-- VIEW: API KEYS & IDE INTEGRATION -->
    <!-- ======================================================================= -->
    <div id="viewApiKeys" class="hidden flex-1 flex flex-col min-h-0 overflow-y-auto p-3 sm:p-6 max-w-6xl w-full mx-auto space-y-5">
      <!-- Mobile Back to Chat Button -->
      <div class="sm:hidden flex items-center justify-between gap-2 shrink-0 pb-1">
        <button onclick="switchView('chat')" class="flex items-center gap-1.5 text-xs text-yellow-300 bg-yellow-500/15 hover:bg-yellow-500/25 border border-yellow-500/30 px-3 py-1.5 rounded-xl font-semibold cursor-pointer shadow-sm transition-colors">
          <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i>
          <span>Volver al Chat</span>
        </button>
        <span class="text-[11px] font-bold text-yellow-400 font-mono">API Keys</span>
      </div>

      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <i data-lucide="key" class="w-5 h-5 text-yellow-400"></i>
            API Keys & Integración con IDEs
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">Conecta VS Code, Kilo Code, Cursor, Windsurf o scripts con la API OpenAI-compatible de Andy Agent.</p>
        </div>

        <button onclick="openCreateApiKeyModal()" class="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all self-start sm:self-auto">
          <i data-lucide="plus" class="w-4 h-4 text-slate-950"></i>
          Crear Nueva API Key
        </button>
      </div>

      <!-- Endpoint Status Card -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="md:col-span-2 bg-surface-850 border border-surface-750 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span class="text-xs font-semibold text-white">Servidor OpenAI Compatible Activo</span>
            </div>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">v1 REST API</span>
          </div>

          <div class="space-y-2">
            <label class="block text-[11px] font-medium text-slate-400">URL Base para Extensiones e IDEs (OpenAI Base URL):</label>
            <div class="flex items-center gap-2">
              <input id="apiBaseUrlDisplay" type="text" readonly value="http://ia.v2nethost.cl:3000/v1" class="flex-1 bg-surface-900 border border-surface-700 rounded-xl px-3 py-2 text-xs text-brand-300 font-mono focus:outline-none select-all">
              <button onclick="copyToClipboard(document.getElementById('apiBaseUrlDisplay').value, this)" class="bg-surface-750 hover:bg-surface-700 text-slate-200 px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0">
                <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                <span>Copiar</span>
              </button>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 pt-1">
            <span>Modelos recomendados:</span>
            <span class="px-2 py-0.5 rounded bg-surface-750 text-slate-300 font-mono font-semibold text-brand-300">auto/best-coding</span>
            <span class="px-2 py-0.5 rounded bg-surface-750 text-slate-300 font-mono">gpt-4o</span>
            <span class="px-2 py-0.5 rounded bg-surface-750 text-slate-300 font-mono">claude-3-5-sonnet</span>
          </div>
        </div>

        <div class="bg-gradient-to-br from-surface-850 to-surface-800 border border-surface-750 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-3">
          <div>
            <div class="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <i data-lucide="shield-check" class="w-4 h-4 text-brand-400"></i>
              Seguridad & Acceso
            </div>
            <p class="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
              Las claves API autentican peticiones externas mediante encabezados <code class="text-brand-300 font-mono">Authorization: Bearer &lt;key&gt;</code>.
            </p>
          </div>
          <div class="text-[10px] text-slate-500 font-mono">Storage: ~/.andy/agent/api_keys.json</div>
        </div>
      </div>

      <!-- Active API Keys Table / Cards -->
      <div class="bg-surface-850 border border-surface-750 rounded-2xl p-4 sm:p-5 space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-sm text-slate-200 flex items-center gap-2">
            <i data-lucide="list" class="w-4 h-4 text-yellow-400"></i>
            Tus Claves API Registradas
          </h3>
          <button onclick="fetchApiKeys()" class="text-xs text-slate-400 hover:text-white flex items-center gap-1">
            <i data-lucide="refresh-cw" class="w-3 h-3"></i>
            Refrescar
          </button>
        </div>

        <div id="apiKeysListContainer" class="space-y-2 text-xs">
          <div class="text-slate-400 p-6 text-center">Cargando claves API...</div>
        </div>
      </div>

      <!-- Integration Guides (Tabs / Cards) -->
      <div class="bg-surface-850 border border-surface-750 rounded-2xl p-4 sm:p-5 space-y-4">
        <h3 class="font-bold text-sm text-slate-200 flex items-center gap-2">
          <i data-lucide="book-open" class="w-4 h-4 text-indigo-400"></i>
          Guía de Integración Rápida con tu IDE
        </h3>

        <!-- Guide Selector Tabs -->
        <div class="flex items-center gap-1.5 border-b border-surface-750 pb-2 overflow-x-auto no-scrollbar text-xs">
          <button onclick="switchIdeGuide('vscode')" id="ideTabVscodeBtn" class="px-3 py-1.5 rounded-lg font-medium bg-brand-600 text-white flex items-center gap-1.5 transition-colors">
            <i data-lucide="code" class="w-3.5 h-3.5"></i>
            VS Code (Cline / Roo / Continue)
          </button>
          <button onclick="switchIdeGuide('kilocode')" id="ideTabKilocodeBtn" class="px-3 py-1.5 rounded-lg font-medium text-slate-300 hover:text-white hover:bg-surface-750 flex items-center gap-1.5 transition-colors">
            <i data-lucide="zap" class="w-3.5 h-3.5 text-amber-400"></i>
            Kilo Code / Cursor
          </button>
          <button onclick="switchIdeGuide('python')" id="ideTabPythonBtn" class="px-3 py-1.5 rounded-lg font-medium text-slate-300 hover:text-white hover:bg-surface-750 flex items-center gap-1.5 transition-colors">
            <i data-lucide="terminal" class="w-3.5 h-3.5 text-emerald-400"></i>
            Python SDK & Curl
          </button>
        </div>

        <!-- IDE Guide 1: VS Code -->
        <div id="ideGuideVscode" class="space-y-3 text-xs leading-relaxed">
          <p class="text-slate-300">
            En VS Code, puedes usar extensiones como <strong>Cline</strong>, <strong>Roo Code</strong> o <strong>Continue.dev</strong> seleccionando el proveedor <em>OpenAI Compatible</em>:
          </p>
          <div class="bg-surface-900 border border-surface-750 rounded-xl p-3.5 font-mono text-[11px] text-slate-200 relative group select-text">
            <button onclick="copyToClipboard(document.getElementById('vscodeConfigCode').innerText, this)" class="absolute right-2.5 top-2.5 bg-surface-800 hover:bg-surface-700 text-slate-300 px-2 py-1 rounded text-[10px] flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
              <i data-lucide="copy" class="w-3.5 h-3.5"></i>
              <span>Copiar</span>
            </button>
            <pre id="vscodeConfigCode" class="overflow-x-auto text-cyan-300">{
  "apiProvider": "openai-compatible",
  "baseUrl": "http://ia.v2nethost.cl:3000/v1",
  "apiKey": "TU_ANDY_API_KEY_AQUI",
  "modelId": "auto/best-coding"
}</pre>
          </div>
          <ul class="list-disc list-inside text-[11px] text-slate-400 space-y-1">
            <li><strong>Base URL:</strong> <code class="text-brand-300">http://ia.v2nethost.cl:3000/v1</code></li>
            <li><strong>Model ID:</strong> <code class="text-brand-300">auto/best-coding</code></li>
            <li><strong>API Key:</strong> Tu clave generada arriba que comienza con <code class="text-yellow-400">andy_sk_...</code></li>
          </ul>
        </div>

        <!-- IDE Guide 2: Kilo Code / Cursor -->
        <div id="ideGuideKilocode" class="hidden space-y-3 text-xs leading-relaxed">
          <p class="text-slate-300">
            En <strong>Kilo Code</strong> o <strong>Cursor</strong> (Settings -> Models -> OpenAI Compatible):
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="bg-surface-900 border border-surface-750 p-3 rounded-xl">
              <div class="text-[10px] text-slate-400 uppercase font-semibold">OpenAI Base URL</div>
              <div class="font-mono text-cyan-300 text-xs mt-1 truncate">http://ia.v2nethost.cl:3000/v1</div>
            </div>
            <div class="bg-surface-900 border border-surface-750 p-3 rounded-xl">
              <div class="text-[10px] text-slate-400 uppercase font-semibold">Model Name / ID</div>
              <div class="font-mono text-cyan-300 text-xs mt-1 truncate">auto/best-coding</div>
            </div>
            <div class="bg-surface-900 border border-surface-750 p-3 rounded-xl">
              <div class="text-[10px] text-slate-400 uppercase font-semibold">API Key</div>
              <div class="font-mono text-yellow-300 text-xs mt-1 truncate">andy_sk_••••••••</div>
            </div>
          </div>
        </div>

        <!-- IDE Guide 3: Python & Curl -->
        <div id="ideGuidePython" class="hidden space-y-3 text-xs leading-relaxed">
          <p class="text-slate-300">
            Puedes consumir Andy Agent usando la biblioteca oficial de OpenAI en Python:
          </p>
          <div class="bg-surface-900 border border-surface-750 rounded-xl p-3.5 font-mono text-[11px] text-slate-200 relative group select-text">
            <pre class="overflow-x-auto text-emerald-300">from openai import OpenAI
 
client = OpenAI(
    base_url="http://ia.v2nethost.cl:3000/v1",
    api_key="TU_ANDY_API_KEY_AQUI"
)

response = client.chat.completions.create(
    model="auto/best-coding",
    messages=[{"role": "user", "content": "Hola Andy Agent"}],
    stream=True
)

for chunk in response:
    print(chunk.choices[0].delta.content or "", end="")</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================================================================= -->
    <!-- VIEW: USERS & SECURITY MANAGEMENT (ADMIN ONLY) -->
    <!-- ======================================================================= -->
    <div id="viewUsers" class="hidden flex-1 flex flex-col min-h-0 overflow-y-auto p-3 sm:p-6 max-w-7xl w-full mx-auto space-y-4 sm:space-y-6">
      <!-- Mobile Back to Chat Button -->
      <div class="sm:hidden flex items-center justify-between gap-2 shrink-0 pb-1">
        <button onclick="switchView('chat')" class="flex items-center gap-1.5 text-xs text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 px-3 py-1.5 rounded-xl font-semibold cursor-pointer shadow-sm transition-colors">
          <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i>
          <span>Volver al Chat</span>
        </button>
        <span class="text-[11px] font-bold text-cyan-400 font-mono">Usuarios</span>
      </div>

      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-white flex items-center gap-2">
            <i data-lucide="users" class="w-5 h-5 text-cyan-400"></i>
            Gestión de Usuarios & Capa de Seguridad
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">Control de acceso, roles de usuario, reseteo de contraseñas y sesiones activas.</p>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="fetchUsersList()" class="px-3 py-2 bg-surface-800 hover:bg-surface-750 border border-surface-700 text-slate-300 hover:text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors">
            <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
            Actualizar
          </button>
          <button onclick="openCreateUserModal()" class="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-600/25 transition-all">
            <i data-lucide="user-plus" class="w-4 h-4"></i>
            Nuevo Usuario
          </button>
        </div>
      </div>

      <!-- Users Table Card -->
      <div class="bg-surface-850 border border-surface-750/70 rounded-2xl overflow-hidden shadow-xl">
        <div class="p-4 border-b border-surface-750 flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-300 uppercase tracking-wider">Cuentas Registradas (<span id="usersTableCount">0</span>)</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-surface-800/80 text-slate-400 text-[11px] font-semibold uppercase tracking-wider border-b border-surface-750">
              <tr>
                <th class="px-4 py-3">Usuario</th>
                <th class="px-4 py-3">Nombre</th>
                <th class="px-4 py-3">Rol</th>
                <th class="px-4 py-3">Estado</th>
                <th class="px-4 py-3">Creado</th>
                <th class="px-4 py-3">Último Acceso</th>
                <th class="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody id="usersTableBody" class="divide-y divide-surface-750/60">
              <tr>
                <td colspan="7" class="px-4 py-8 text-center text-slate-500 italic">Cargando usuarios...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- CREATE USER MODAL -->
    <!-- CREATE USER MODAL -->
    <div id="createUserModal" onclick="if (event.target === this) closeCreateUserModal()" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div class="bg-surface-850 border border-surface-700 rounded-2xl w-full max-w-md max-h-[92dvh] sm:max-h-[85vh] flex flex-col overflow-hidden shadow-2xl p-4 sm:p-5 space-y-4">
        <div class="flex items-center justify-between border-b border-surface-750 pb-3 shrink-0">
          <h3 class="font-bold text-sm text-white flex items-center gap-2">
            <i data-lucide="user-plus" class="w-4 h-4 text-cyan-400"></i>
            Crear Nuevo Usuario
          </h3>
          <button onclick="closeCreateUserModal()" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-surface-750 cursor-pointer">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>

        <div class="space-y-3 text-xs flex-1 overflow-y-auto min-h-0 pr-1">
          <div>
            <label class="block text-slate-300 font-medium mb-1">Nombre de Usuario (Login) <span class="text-rose-400">*</span></label>
            <input id="newUsernameInput" type="text" placeholder="ej: developer1, ana_dev" class="w-full bg-surface-750 border border-surface-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500">
          </div>

          <div>
            <label class="block text-slate-300 font-medium mb-1">Nombre para Mostrar</label>
            <input id="newDisplayNameInput" type="text" placeholder="ej: Ana Desarrolladora" class="w-full bg-surface-750 border border-surface-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500">
          </div>

          <div>
            <label class="block text-slate-300 font-medium mb-1">Contraseña Inicial <span class="text-rose-400">*</span></label>
            <input id="newPasswordInput" type="password" placeholder="Mínimo 4 caracteres" class="w-full bg-surface-750 border border-surface-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500">
          </div>

          <div>
            <label class="block text-slate-300 font-medium mb-1">Rol</label>
            <select id="newRoleSelect" class="w-full bg-surface-750 border border-surface-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 cursor-pointer">
              <option value="user" selected>Usuario Estándar (Acceso a WebUI, Chats y Proyectos)</option>
              <option value="admin">Administrador (Acceso Total y Gestión de Usuarios)</option>
            </select>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-surface-750 shrink-0">
          <button onclick="closeCreateUserModal()" class="px-3.5 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-medium">Cancelar</button>
          <button onclick="submitCreateUser()" class="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/25">Guardar Usuario</button>
        </div>
      </div>
    </div>

    <!-- EDIT USER / RESET PASSWORD MODAL -->
    <div id="editUserModal" onclick="if (event.target === this) closeEditUserModal()" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div class="bg-surface-850 border border-surface-700 rounded-2xl w-full max-w-md max-h-[92dvh] sm:max-h-[85vh] flex flex-col overflow-hidden shadow-2xl p-4 sm:p-5 space-y-4">
        <div class="flex items-center justify-between border-b border-surface-750 pb-3 shrink-0">
          <h3 class="font-bold text-sm text-white flex items-center gap-2">
            <i data-lucide="user-cog" class="w-4 h-4 text-cyan-400"></i>
            Editar Usuario: <span id="editUserModalTitleName" class="font-mono text-cyan-300">...</span>
          </h3>
          <button onclick="closeEditUserModal()" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-surface-750 cursor-pointer">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>

        <input type="hidden" id="editUserIdHidden">

        <div class="space-y-3 text-xs flex-1 overflow-y-auto min-h-0 pr-1">
          <div>
            <label class="block text-slate-300 font-medium mb-1">Nombre para Mostrar</label>
            <input id="editDisplayNameInput" type="text" class="w-full bg-surface-750 border border-surface-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500">
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-slate-300 font-medium mb-1">Rol</label>
              <select id="editRoleSelect" class="w-full bg-surface-750 border border-surface-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 cursor-pointer">
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div>
              <label class="block text-slate-300 font-medium mb-1">Estado</label>
              <select id="editStatusSelect" class="w-full bg-surface-750 border border-surface-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 cursor-pointer">
                <option value="active">Activo</option>
                <option value="disabled">Desactivado</option>
              </select>
            </div>
          </div>

          <div class="pt-2 border-t border-surface-750 space-y-2">
            <label class="block text-amber-300 font-semibold">Restablecer Contraseña (Opcional)</label>
            <input id="editNewPasswordInput" type="password" placeholder="Dejar vacío para no cambiar" class="w-full bg-surface-750 border border-surface-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500">
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-surface-750 shrink-0">
          <button onclick="closeEditUserModal()" class="px-3 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-medium">Cancelar</button>
          <button onclick="submitEditUser()" class="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/25">Guardar Cambios</button>
        </div>
      </div>
    </div>

    <!-- CHANGE PASSWORD MODAL (FOR CURRENT USER) -->
    <div id="changePasswordModal" onclick="if (event.target === this) closeChangePasswordModal()" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div class="bg-surface-850 border border-surface-700 rounded-2xl w-full max-w-md max-h-[92dvh] sm:max-h-[85vh] flex flex-col overflow-hidden shadow-2xl p-4 sm:p-5 space-y-4">
        <div class="flex items-center justify-between border-b border-surface-750 pb-3 shrink-0">
          <h3 class="font-bold text-sm text-white flex items-center gap-2">
            <i data-lucide="key-round" class="w-4 h-4 text-yellow-400"></i>
            Cambiar Mi Contraseña
          </h3>
          <button onclick="closeChangePasswordModal()" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-surface-750 cursor-pointer">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>

        <div id="changePasswordErrorAlert" class="hidden p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 shrink-0">
          <i data-lucide="alert-circle" class="w-4 h-4 shrink-0 text-rose-400"></i>
          <span id="changePasswordErrorText">Error al cambiar contraseña</span>
        </div>

        <div class="space-y-3 text-xs flex-1 overflow-y-auto min-h-0 pr-1">
          <div>
            <label class="block text-slate-300 font-medium mb-1">Contraseña Actual <span class="text-rose-400">*</span></label>
            <input id="currPasswordInput" type="password" placeholder="Tu contraseña actual" class="w-full bg-surface-750 border border-surface-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-brand-500">
          </div>

          <div>
            <label class="block text-slate-300 font-medium mb-1">Nueva Contraseña <span class="text-rose-400">*</span></label>
            <input id="changeNewPasswordInput" type="password" placeholder="Mínimo 4 caracteres" class="w-full bg-surface-750 border border-surface-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-brand-500">
          </div>

          <div>
            <label class="block text-slate-300 font-medium mb-1">Confirmar Nueva Contraseña <span class="text-rose-400">*</span></label>
            <input id="changeConfirmPasswordInput" type="password" placeholder="Repite la nueva contraseña" class="w-full bg-surface-750 border border-surface-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-brand-500">
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-surface-750 shrink-0">
          <button onclick="closeChangePasswordModal()" class="px-3 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-medium">Cancelar</button>
          <button onclick="submitChangePassword()" class="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-600/20">Actualizar Contraseña</button>
        </div>
      </div>
    </div>

    <!-- ======================================================================= -->
    <!-- LOGIN OVERLAY / FULL SCREEN AUTH -->
    <!-- ======================================================================= -->
    <div id="loginOverlay" class="hidden fixed inset-0 bg-surface-900/98 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div class="w-full max-w-md bg-surface-850/95 border border-surface-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden backdrop-blur">
        <!-- Glow accents -->
        <div class="absolute -top-24 -left-24 w-48 h-48 bg-brand-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div class="text-center space-y-2 relative">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-xl shadow-brand-500/25 font-bold text-white text-2xl mx-auto">
            Ψ
          </div>
          <h2 class="text-xl font-bold text-white tracking-tight">Andy Agent</h2>
          <p class="text-xs text-slate-400">Ingresa tus credenciales para acceder a la WebUI</p>
        </div>

        <div id="loginErrorAlert" class="hidden p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <i data-lucide="alert-circle" class="w-4 h-4 shrink-0 text-rose-400"></i>
          <span id="loginErrorText">Usuario o contraseña incorrectos</span>
        </div>

        <form onsubmit="event.preventDefault(); submitLogin();" class="space-y-4 text-xs">
          <div>
            <label class="block text-slate-300 font-medium mb-1.5">Usuario</label>
            <div class="relative">
              <i data-lucide="user" class="w-4 h-4 text-slate-400 absolute left-3.5 top-3"></i>
              <input id="loginUsernameInput" type="text" placeholder="Usuario (ej: admin)" required autocomplete="username" class="w-full bg-surface-800 border border-surface-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand-500 transition-colors">
            </div>
          </div>

          <div>
            <label class="block text-slate-300 font-medium mb-1.5">Contraseña</label>
            <div class="relative">
              <i data-lucide="lock" class="w-4 h-4 text-slate-400 absolute left-3.5 top-3"></i>
              <input id="loginPasswordInput" type="password" placeholder="••••••••" required autocomplete="current-password" class="w-full bg-surface-800 border border-surface-700 rounded-xl pl-10 pr-10 py-2.5 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand-500 transition-colors">
              <button type="button" onclick="togglePasswordVisibility('loginPasswordInput', this)" class="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200">
                <i data-lucide="eye" class="w-4 h-4"></i>
              </button>
            </div>
          </div>

          <div class="flex items-center justify-between text-[11px] pt-1">
            <label class="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input id="loginRememberMeCheckbox" type="checkbox" checked class="rounded bg-surface-750 border-surface-700 text-brand-500">
              Mantener sesión iniciada
            </label>
          </div>

          <button id="loginSubmitBtn" type="submit" class="w-full bg-gradient-to-r from-brand-600 via-brand-500 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-brand-500/25 transition-all text-xs flex items-center justify-center gap-2">
            <i data-lucide="log-in" class="w-4 h-4"></i>
            Iniciar Sesión
          </button>
        </form>

        <div class="text-center text-[10px] text-slate-500">
          Andy Agent RLM • Autenticación y Seguridad Nativa
        </div>
      </div>
    </div>

    <!-- ======================================================================= -->
    <!-- VIEW: INTERACTIVE WEB TERMINAL & SHELL -->
    <!-- ======================================================================= -->
    <div id="viewTerminal" class="hidden flex-1 flex flex-col min-h-0 overflow-hidden p-3 sm:p-5 max-w-7xl w-full mx-auto space-y-3">
      <!-- Mobile Back to Chat Button -->
      <div class="sm:hidden flex items-center justify-between gap-2 shrink-0 pb-1">
        <button onclick="switchView('chat')" class="flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 px-3 py-1.5 rounded-xl font-semibold cursor-pointer shadow-sm transition-colors">
          <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i>
          <span>Volver al Chat</span>
        </button>
        <span class="text-[11px] font-bold text-emerald-400 font-mono">Terminal Web</span>
      </div>

      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h2 class="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <i data-lucide="terminal" class="w-5 h-5 text-emerald-400"></i>
            Terminal Web Interactiva
            <span id="terminalCwdBadge" class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-normal">CWD: ./</span>
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">Ejecuta comandos de consola en el entorno del proyecto activo con streaming de salida en tiempo real.</p>
        </div>

        <!-- Quick Action Preset Buttons & Server Restart Button -->
        <div class="flex items-center gap-2 overflow-x-auto no-scrollbar flex-wrap">
          <button onclick="requestServerRestart()" class="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition-all cursor-pointer border border-rose-400/30 shrink-0" title="Reiniciar el servicio de Andy Agent (systemctl restart andy-agent / process restart)">
            <i data-lucide="rotate-cw" class="w-3.5 h-3.5"></i>
            <span>Reiniciar Andy Agent</span>
          </button>

          <button onclick="clearTerminalScreen()" class="p-1.5 bg-surface-800 hover:bg-surface-750 border border-surface-700 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer shrink-0" title="Limpiar pantalla">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>

      <!-- Quick Command Chips Bar -->
      <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 text-xs shrink-0">
        <span class="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mr-1">Acciones:</span>
        <button onclick="runTerminalPreset('systemctl status andy-agent')" class="px-2 py-1 bg-surface-800 hover:bg-surface-750 border border-surface-700 text-emerald-300 hover:text-white rounded-lg font-mono text-[11px] flex items-center gap-1 transition-colors cursor-pointer shrink-0">
          <i data-lucide="activity" class="w-3 h-3 text-emerald-400"></i>
          status andy-agent
        </button>
        <button onclick="runTerminalPreset('journalctl -u andy-agent -n 40 --no-pager')" class="px-2 py-1 bg-surface-800 hover:bg-surface-750 border border-surface-700 text-purple-300 hover:text-white rounded-lg font-mono text-[11px] flex items-center gap-1 transition-colors cursor-pointer shrink-0">
          <i data-lucide="file-text" class="w-3 h-3 text-purple-400"></i>
          logs daemon
        </button>
        <button onclick="runTerminalPreset('npm run check')" class="px-2 py-1 bg-surface-800 hover:bg-surface-750 border border-surface-700 text-slate-300 hover:text-white rounded-lg font-mono text-[11px] flex items-center gap-1 transition-colors cursor-pointer shrink-0">
          <i data-lucide="check-circle" class="w-3 h-3 text-emerald-400"></i>
          npm check
        </button>
        <button onclick="runTerminalPreset('npm run build')" class="px-2 py-1 bg-surface-800 hover:bg-surface-750 border border-surface-700 text-slate-300 hover:text-white rounded-lg font-mono text-[11px] flex items-center gap-1 transition-colors cursor-pointer shrink-0">
          <i data-lucide="package" class="w-3 h-3 text-cyan-400"></i>
          npm build
        </button>
        <button onclick="runTerminalPreset('git status')" class="px-2 py-1 bg-surface-800 hover:bg-surface-750 border border-surface-700 text-slate-300 hover:text-white rounded-lg font-mono text-[11px] flex items-center gap-1 transition-colors cursor-pointer shrink-0">
          <i data-lucide="git-commit" class="w-3 h-3 text-amber-400"></i>
          git status
        </button>
        <button onclick="runTerminalPreset('git log -n 5 --oneline')" class="px-2 py-1 bg-surface-800 hover:bg-surface-750 border border-surface-700 text-slate-300 hover:text-white rounded-lg font-mono text-[11px] flex items-center gap-1 transition-colors cursor-pointer shrink-0">
          <i data-lucide="git-pull-request" class="w-3 h-3 text-indigo-400"></i>
          git log
        </button>
      </div>

      <!-- Terminal Output Screen -->
      <div id="terminalScreen" class="flex-1 bg-surface-950 border border-surface-750 rounded-2xl p-3 sm:p-4 overflow-y-auto font-mono text-xs text-slate-200 space-y-1 select-text min-h-[320px] shadow-2xl leading-relaxed">
        <div class="text-slate-500 italic pb-2 border-b border-surface-800">Andy Agent Web Terminal v0.8 • Escribe un comando abajo o selecciona un preset rápido.</div>
      </div>

      <!-- Terminal Input Line -->
      <div class="bg-surface-850 border border-surface-700 rounded-xl p-2 flex items-center gap-2 shadow-lg shrink-0">
        <span class="text-emerald-400 font-mono font-bold text-xs pl-2 select-none">$</span>
        <input id="terminalCommandInput" type="text" placeholder="Escribe un comando de consola (ej: systemctl restart andy-agent, npm run check, git status)..." onkeydown="handleTerminalKeyDown(event)" autocomplete="off" class="flex-1 bg-transparent font-mono text-xs text-white placeholder-slate-500 focus:outline-none">
        <button id="terminalRunBtn" onclick="submitTerminalCommand()" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer">
          <i data-lucide="play" class="w-3.5 h-3.5 fill-current"></i>
          Ejecutar
        </button>
      </div>
    </div>

    <!-- CYCLE AUTO-FIX REFACTOR MODAL -->
    <div id="cycleAutoFixModal" onclick="if (event.target === this) closeCycleAutoFixModal()" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div class="bg-surface-850 border border-surface-700 rounded-2xl sm:rounded-3xl w-full max-w-xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col overflow-hidden shadow-2xl p-4 sm:p-6 space-y-4">
        <div class="flex items-center justify-between border-b border-surface-750 pb-3 shrink-0">
          <h3 class="font-bold text-sm text-white flex items-center gap-2">
            <i data-lucide="wrench" class="w-4 h-4 text-rose-400"></i>
            Auto-Fix: Propuesta de Refactorización de Ciclo
          </h3>
          <button onclick="closeCycleAutoFixModal()" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-surface-750 cursor-pointer">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>

        <div class="space-y-3 text-xs flex-1 overflow-y-auto min-h-0 pr-1">
          <div>
            <label class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Estrategia Recomendada</label>
            <div id="autoFixStrategy" class="font-semibold text-white bg-surface-800 p-2.5 rounded-xl border border-surface-700 mt-1"></div>
          </div>

          <div>
            <label class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Justificación Arquitectónica</label>
            <p id="autoFixRationale" class="text-slate-300 leading-relaxed bg-surface-800/60 p-2.5 rounded-xl border border-surface-700 mt-1"></p>
          </div>

          <div>
            <label class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Pasos de Refactorización</label>
            <div id="autoFixSteps" class="space-y-1 mt-1 font-mono text-[11px] bg-surface-900 p-3 rounded-xl border border-surface-750 text-cyan-300"></div>
          </div>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-surface-750">
          <button onclick="copyAutoFixPlan()" class="px-3 py-2 rounded-xl bg-surface-750 hover:bg-surface-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer">
            <i data-lucide="copy" class="w-3.5 h-3.5"></i>
            Copiar Pasos
          </button>
          <div class="flex items-center gap-2">
            <button onclick="closeCycleAutoFixModal()" class="px-3 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-medium">Cerrar</button>
            <button onclick="sendAutoFixToChat()" class="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-600/20 flex items-center gap-1.5 transition-all cursor-pointer">
              <i data-lucide="message-square" class="w-3.5 h-3.5"></i>
              Refactorizar con Andy
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- PANTHEON AGENT CREATOR / EDITOR MODAL -->
    <div id="pantheonAgentModal" onclick="if (event.target === this) closePantheonAgentModal()" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div class="bg-surface-850 border border-surface-700 rounded-2xl sm:rounded-3xl w-full max-w-xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col overflow-hidden shadow-2xl">
        <!-- Sticky Header with big close & back for mobile -->
        <div class="flex items-center justify-between border-b border-surface-750 p-3.5 sm:p-4 bg-surface-850 shrink-0">
          <div class="flex items-center gap-2">
            <button type="button" onclick="closePantheonAgentModal()" class="p-1.5 -ml-1 text-slate-400 hover:text-white rounded-lg hover:bg-surface-750 cursor-pointer sm:hidden" title="Cerrar modal">
              <i data-lucide="arrow-left" class="w-4 h-4"></i>
            </button>
            <h3 id="pantheonAgentModalTitle" class="font-bold text-sm sm:text-base text-white flex items-center gap-2">
              <i data-lucide="bot" class="w-4 h-4 sm:w-5 sm:h-5 text-purple-400"></i>
              Configurar Agente Pantheon
            </h3>
          </div>
          <button type="button" onclick="closePantheonAgentModal()" class="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-surface-750 cursor-pointer" title="Cerrar modal">
            <i data-lucide="x" class="w-4 h-4 sm:w-5 sm:h-5"></i>
          </button>
        </div>

        <!-- Scrollable Form Body -->
        <form id="pantheonAgentForm" onsubmit="event.preventDefault(); submitSavePantheonAgent();" class="flex-1 overflow-y-auto min-h-0 p-3.5 sm:p-5 space-y-3.5 text-xs">
          <input type="hidden" id="pAgentIsSystem" value="false">

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block text-slate-300 font-medium mb-1">ID Único</label>
              <input id="pAgentId" type="text" placeholder="ej: security_auditor" required class="w-full bg-surface-750 border border-surface-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500">
            </div>
            <div>
              <label class="block text-slate-300 font-medium mb-1">Nombre Visible</label>
              <input id="pAgentName" type="text" placeholder="ej: Aegis" required class="w-full bg-surface-750 border border-surface-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500">
            </div>
            <div>
              <label class="block text-slate-300 font-medium mb-1">Avatar Emoji</label>
              <input id="pAgentAvatar" type="text" placeholder="🛡️" value="🤖" required class="w-full bg-surface-750 border border-surface-700 rounded-xl px-3 py-2 text-center text-base focus:outline-none focus:border-purple-500">
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-slate-300 font-medium mb-1">Rol / Especialidad</label>
              <input id="pAgentRole" type="text" placeholder="ej: Security & Vulnerability Auditor" required class="w-full bg-surface-750 border border-surface-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500">
            </div>
            <div>
              <label class="block text-slate-300 font-medium mb-1">Color de Identidad</label>
              <input id="pAgentColor" type="color" value="#8B5CF6" class="w-full h-9 bg-surface-750 border border-surface-700 rounded-xl px-2 py-1 cursor-pointer">
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="relative">
              <div class="flex items-center justify-between mb-1">
                <label class="block text-slate-300 font-medium">Modelo de IA Asignado</label>
                <span id="pAgentActiveProviderBadge" class="text-[10px] text-purple-300 font-mono">Auto</span>
              </div>
              <div class="flex items-center gap-1.5">
                <div class="relative flex-1">
                  <input id="pAgentModel" list="pAgentModelDatalist" type="text" placeholder="Escribe para buscar o selecciona..." value="auto/best-coding" required class="w-full bg-surface-750 border border-surface-700 rounded-xl pl-3 pr-8 py-2 text-white font-mono text-xs focus:outline-none focus:border-purple-500">
                  <datalist id="pAgentModelDatalist"></datalist>
                  <button type="button" onclick="togglePantheonModelDropdown()" class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded cursor-pointer" title="Ver catálogo de modelos">
                    <i data-lucide="chevron-down" class="w-3.5 h-3.5"></i>
                  </button>
                </div>
                <button type="button" onclick="togglePantheonModelDropdown()" class="px-2.5 py-2 rounded-xl bg-surface-800 hover:bg-surface-750 border border-surface-700 text-purple-300 hover:text-white text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0" title="Explorar lista de modelos">
                  <i data-lucide="sparkles" class="w-3.5 h-3.5 text-purple-400"></i>
                  <span>Modelos</span>
                </button>
              </div>

              <!-- Searchable Dropdown Popover Container -->
              <div id="pantheonModelDropdownMenu" class="hidden absolute left-0 right-0 top-full mt-1.5 z-50 bg-surface-850 border border-surface-700 rounded-2xl shadow-2xl p-2.5 space-y-2 max-h-64 flex flex-col">
                <div class="flex items-center justify-between pb-1 border-b border-surface-750 text-[11px]">
                  <span class="text-slate-300 font-medium">Catálogo de Modelos</span>
                  <span id="pantheonModelCountBadge" class="text-[10px] text-purple-300 font-mono">0 modelos</span>
                </div>
                <div>
                  <input id="pantheonModelSearchInput" type="text" placeholder="Buscar modelo o proveedor..." oninput="filterPantheonModelList(this.value)" class="w-full bg-surface-750 border border-surface-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-purple-500">
                </div>
                <div id="pantheonModelOptionsList" class="overflow-y-auto max-h-40 space-y-1 text-xs no-scrollbar pr-0.5">
                  <!-- Injected via JS -->
                </div>
              </div>
            </div>
            <div>
              <label class="block text-slate-300 font-medium mb-1">Temperatura: <span id="pAgentTempLabel" class="font-mono text-purple-300">0.2</span></label>
              <input id="pAgentTemp" type="range" min="0" max="1" step="0.05" value="0.2" oninput="document.getElementById('pAgentTempLabel').innerText = this.value" class="w-full accent-purple-500 mt-2">
            </div>
          </div>

          <div>
            <label class="block text-slate-300 font-medium mb-1">Prompt de Sistema (Instrucciones del Rol)</label>
            <textarea id="pAgentSystemPrompt" rows="3" placeholder="Describe la personalidad, responsabilidades y enfoque técnico del agente..." required class="w-full bg-surface-750 border border-surface-700 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 leading-relaxed"></textarea>
          </div>

          <div>
            <label class="block text-slate-300 font-medium mb-1.5">Capacidades & Herramientas Asignadas</label>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
              <label class="flex items-center gap-1.5 text-slate-300 bg-surface-800 p-2 rounded-lg border border-surface-700 cursor-pointer">
                <input id="pCapWrite" type="checkbox" checked class="rounded bg-surface-750 border-surface-700 text-purple-500">
                <span>Edición Archivos</span>
              </label>
              <label class="flex items-center gap-1.5 text-slate-300 bg-surface-800 p-2 rounded-lg border border-surface-700 cursor-pointer">
                <input id="pCapTerminal" type="checkbox" checked class="rounded bg-surface-750 border-surface-700 text-purple-500">
                <span>Terminal / Bash</span>
              </label>
              <label class="flex items-center gap-1.5 text-slate-300 bg-surface-800 p-2 rounded-lg border border-surface-700 cursor-pointer">
                <input id="pCapGraft" type="checkbox" checked class="rounded bg-surface-750 border-surface-700 text-purple-500">
                <span>Graft Engineering</span>
              </label>
              <label class="flex items-center gap-1.5 text-slate-300 bg-surface-800 p-2 rounded-lg border border-surface-700 cursor-pointer">
                <input id="pCapRlm" type="checkbox" checked class="rounded bg-surface-750 border-surface-700 text-purple-500">
                <span>RLM Subagentes</span>
              </label>
              <label class="flex items-center gap-1.5 text-slate-300 bg-surface-800 p-2 rounded-lg border border-surface-700 cursor-pointer">
                <input id="pCapWeb" type="checkbox" checked class="rounded bg-surface-750 border-surface-700 text-purple-500">
                <span>Búsqueda Web</span>
              </label>
              <label class="flex items-center gap-1.5 text-slate-300 bg-surface-800 p-2 rounded-lg border border-surface-700 cursor-pointer">
                <input id="pCapMcp" type="checkbox" checked class="rounded bg-surface-750 border-surface-700 text-purple-500">
                <span>Protocolo MCP</span>
              </label>
            </div>
          </div>
        </form>

        <!-- Sticky Footer -->
        <div class="flex items-center justify-between sm:justify-end gap-2 p-3 sm:p-4 border-t border-surface-750 bg-surface-850 shrink-0">
          <button type="button" onclick="closePantheonAgentModal()" class="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-medium bg-surface-800 sm:bg-transparent cursor-pointer flex-1 sm:flex-initial text-center">Cancelar</button>
          <button type="button" onclick="submitSavePantheonAgent()" class="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/25 cursor-pointer flex-1 sm:flex-initial text-center">Guardar Agente</button>
        </div>
      </div>
    </div>

    <!-- PANTHEON SQUAD CREATOR / EDITOR MODAL -->
    <div id="pantheonSquadModal" onclick="if (event.target === this) closePantheonSquadModal()" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div class="bg-surface-850 border border-surface-700 rounded-2xl sm:rounded-3xl w-full max-w-lg max-h-[92dvh] sm:max-h-[88vh] flex flex-col overflow-hidden shadow-2xl">
        <!-- Sticky Header -->
        <div class="flex items-center justify-between border-b border-surface-750 p-3.5 sm:p-4 bg-surface-850 shrink-0">
          <div class="flex items-center gap-2">
            <button type="button" onclick="closePantheonSquadModal()" class="p-1.5 -ml-1 text-slate-400 hover:text-white rounded-lg hover:bg-surface-750 cursor-pointer sm:hidden" title="Cerrar modal">
              <i data-lucide="arrow-left" class="w-4 h-4"></i>
            </button>
            <h3 id="pantheonSquadModalTitle" class="font-bold text-sm sm:text-base text-white flex items-center gap-2">
              <i data-lucide="shield" class="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400"></i>
              Configurar Escuadrón Pantheon
            </h3>
          </div>
          <button type="button" onclick="closePantheonSquadModal()" class="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-surface-750 cursor-pointer" title="Cerrar modal">
            <i data-lucide="x" class="w-4 h-4 sm:w-5 sm:h-5"></i>
          </button>
        </div>

        <!-- Scrollable Form Body -->
        <form id="pantheonSquadForm" onsubmit="event.preventDefault(); submitSavePantheonSquad();" class="flex-1 overflow-y-auto min-h-0 p-3.5 sm:p-5 space-y-3.5 text-xs">
          <div>
            <label class="block text-slate-300 font-medium mb-1">ID Único del Escuadrón</label>
            <input id="pSquadId" type="text" placeholder="ej: backend-security-squad" required class="w-full bg-surface-750 border border-surface-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500">
          </div>
          <div>
            <label class="block text-slate-300 font-medium mb-1">Nombre del Escuadrón</label>
            <input id="pSquadName" type="text" placeholder="ej: Security & Audit Squad" required class="w-full bg-surface-750 border border-surface-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500">
          </div>
          <div>
            <label class="block text-slate-300 font-medium mb-1">Descripción del Propósito</label>
            <textarea id="pSquadDesc" rows="2" placeholder="Describe el objetivo y dinámica de este escuadrón..." class="w-full bg-surface-750 border border-surface-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"></textarea>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-slate-300 font-medium mb-1">Líder del Escuadrón</label>
              <select id="pSquadLeaderSelect" class="w-full bg-surface-750 border border-surface-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"></select>
            </div>
            <div>
              <label class="block text-slate-300 font-medium mb-1">Modo de Flujo</label>
              <select id="pSquadWorkflowMode" class="w-full bg-surface-750 border border-surface-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 cursor-pointer">
                <option value="hierarchical">Jerárquico (Líder coordina y delega)</option>
                <option value="collaborative">Colaborativo (Malla abierta)</option>
                <option value="sequential">Secuencial (Cadena de relevos)</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-slate-300 font-medium mb-1.5">Miembros Asignados</label>
            <div id="pSquadMembersCheckboxes" class="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-surface-800 p-2.5 rounded-xl border border-surface-700 max-h-40 overflow-y-auto"></div>
          </div>
        </form>

        <!-- Sticky Footer -->
        <div class="flex items-center justify-between sm:justify-end gap-2 p-3 sm:p-4 border-t border-surface-750 bg-surface-850 shrink-0">
          <button type="button" onclick="closePantheonSquadModal()" class="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-medium bg-surface-800 sm:bg-transparent cursor-pointer flex-1 sm:flex-initial text-center">Cancelar</button>
          <button type="button" onclick="submitSavePantheonSquad()" class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 cursor-pointer flex-1 sm:flex-initial text-center">Guardar Escuadrón</button>
        </div>
      </div>
    </div>

    <!-- CREATE API KEY MODAL -->
    <div id="createApiKeyModal" onclick="if (event.target === this) closeCreateApiKeyModal()" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div class="bg-surface-850 border border-surface-700 rounded-2xl w-full max-w-md max-h-[92dvh] sm:max-h-[85vh] flex flex-col overflow-hidden shadow-2xl p-4 sm:p-5 space-y-4">
        <div class="flex items-center justify-between border-b border-surface-750 pb-3 shrink-0">
          <h3 class="font-bold text-sm text-white flex items-center gap-2">
            <i data-lucide="key" class="w-4 h-4 text-yellow-400"></i>
            Crear Nueva API Key
          </h3>
          <button onclick="closeCreateApiKeyModal()" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-surface-750 cursor-pointer">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>

        <div class="space-y-3 text-xs flex-1 overflow-y-auto min-h-0 pr-1">
          <div>
            <label class="block text-slate-300 font-medium mb-1">Nombre / Identificador</label>
            <input id="newKeyNameInput" type="text" placeholder="Ej: VS Code Laptop, Kilo Code Desktop..." class="w-full bg-surface-750 border border-surface-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500">
          </div>

          <div>
            <label class="block text-slate-300 font-medium mb-1">Expiración</label>
            <select id="newKeyExpiresSelect" class="w-full bg-surface-750 border border-surface-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500 cursor-pointer">
              <option value="0">Nunca expira</option>
              <option value="30">30 días</option>
              <option value="90">90 días</option>
              <option value="365">1 año</option>
            </select>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-surface-750 shrink-0">
          <button onclick="closeCreateApiKeyModal()" class="px-3.5 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-medium">Cancelar</button>
          <button onclick="saveNewApiKey()" class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20">Crear Clave</button>
        </div>
      </div>
    </div>

    <!-- ======================================================================= -->
    <!-- UNIFIED FOOTER WORKSPACE NAVIGATION DOCK -->
    <!-- ======================================================================= -->
    <footer id="footerNav" class="h-12 sm:h-13 bg-surface-850/95 backdrop-blur-md border-t border-surface-750 flex items-center px-1.5 sm:px-2.5 z-30 shrink-0 safe-pb relative w-full overflow-hidden">
      <!-- Scroll Left Arrow Button -->
      <button id="footerScrollLeftBtn" onclick="scrollFooterTabs(-220)" aria-label="Desplazar pestañas a la izquierda" title="Desplazar pestañas a la izquierda" class="hidden p-1.5 rounded-xl bg-surface-800/95 hover:bg-surface-700 text-slate-300 hover:text-white border border-surface-700 shadow-md z-10 mr-1 shrink-0 transition-all items-center justify-center cursor-pointer">
        <i data-lucide="chevron-left" class="w-4 h-4"></i>
      </button>

      <!-- Footer Tabs Container -->
      <div id="footerNavTabs" onscroll="updateFooterNavScrollButtons()" onwheel="handleFooterNavWheel(event)" class="flex-1 min-w-0 flex items-center justify-start overflow-x-auto no-scrollbar scroll-smooth gap-1 sm:gap-1.5 py-1 select-none">
        <button id="tabChatBtn" onclick="switchView('chat')" class="px-3 py-1.5 rounded-xl font-semibold text-xs text-white bg-brand-600 shadow-md shadow-brand-500/25 flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap shrink-0">
          <i data-lucide="message-square" class="w-4 h-4"></i>
          <span>Chat & RLM</span>
        </button>
        <button id="tabPantheonBtn" onclick="switchView('pantheon')" class="px-3 py-1.5 rounded-xl font-medium text-xs text-slate-400 hover:text-slate-200 hover:bg-surface-750 flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap shrink-0">
          <i data-lucide="crown" class="w-4 h-4 text-purple-400"></i>
          <span>Pantheon Studio</span>
        </button>
        <button id="tabTerminalBtn" onclick="switchView('terminal')" class="px-3 py-1.5 rounded-xl font-medium text-xs text-slate-400 hover:text-slate-200 hover:bg-surface-750 flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap shrink-0">
          <i data-lucide="terminal" class="w-4 h-4 text-emerald-400"></i>
          <span>Terminal</span>
        </button>
        <button id="tabProvidersBtn" onclick="switchView('providers')" class="px-3 py-1.5 rounded-xl font-medium text-xs text-slate-400 hover:text-slate-200 hover:bg-surface-750 flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap shrink-0">
          <i data-lucide="zap" class="w-4 h-4 text-amber-400"></i>
          <span>Proveedores</span>
        </button>
        <button id="tabGraftBtn" onclick="switchView('graft')" class="px-3 py-1.5 rounded-xl font-medium text-xs text-slate-400 hover:text-slate-200 hover:bg-surface-750 flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap shrink-0">
          <i data-lucide="git-fork" class="w-4 h-4 text-cyan-400"></i>
          <span>Graft Studio</span>
        </button>
        <button id="tabFilesBtn" onclick="switchView('files')" class="px-3 py-1.5 rounded-xl font-medium text-xs text-slate-400 hover:text-slate-200 hover:bg-surface-750 flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap shrink-0">
          <i data-lucide="folder-tree" class="w-4 h-4 text-amber-400"></i>
          <span>Archivos</span>
        </button>
        <button id="tabLogsBtn" onclick="switchView('logs')" class="px-3 py-1.5 rounded-xl font-medium text-xs text-slate-400 hover:text-slate-200 hover:bg-surface-750 flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap shrink-0">
          <i data-lucide="scroll-text" class="w-4 h-4 text-emerald-400"></i>
          <span>Logs</span>
        </button>
        <button id="tabMemoryBtn" onclick="switchView('memory')" class="px-3 py-1.5 rounded-xl font-medium text-xs text-slate-400 hover:text-slate-200 hover:bg-surface-750 flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap shrink-0">
          <i data-lucide="brain" class="w-4 h-4 text-purple-400"></i>
          <span>Memoria</span>
        </button>
        <button id="tabSkillsBtn" onclick="switchView('skills')" class="px-3 py-1.5 rounded-xl font-medium text-xs text-slate-400 hover:text-slate-200 hover:bg-surface-750 flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap shrink-0">
          <i data-lucide="sparkles" class="w-4 h-4 text-indigo-400"></i>
          <span>Skills</span>
        </button>
        <button id="tabTreeBtn" onclick="switchView('tree')" class="px-3 py-1.5 rounded-xl font-medium text-xs text-slate-400 hover:text-slate-200 hover:bg-surface-750 flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap shrink-0">
          <i data-lucide="git-branch" class="w-4 h-4 text-rose-400"></i>
          <span>Ramas</span>
        </button>
        <button id="tabApiKeysBtn" onclick="switchView('apikeys')" class="px-3 py-1.5 rounded-xl font-medium text-xs text-slate-400 hover:text-slate-200 hover:bg-surface-750 flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap shrink-0">
          <i data-lucide="key" class="w-4 h-4 text-yellow-400"></i>
          <span>API Keys & IDEs</span>
        </button>
        <button id="tabUsersBtn" onclick="switchView('users')" class="hidden px-3 py-1.5 rounded-xl font-medium text-xs text-slate-400 hover:text-slate-200 hover:bg-surface-750 flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap shrink-0">
          <i data-lucide="users" class="w-4 h-4 text-cyan-400"></i>
          <span>Usuarios & Seguridad</span>
        </button>
      </div>

      <!-- Scroll Right Arrow Button -->
      <button id="footerScrollRightBtn" onclick="scrollFooterTabs(220)" aria-label="Desplazar pestañas a la derecha" title="Desplazar pestañas a la derecha" class="hidden p-1.5 rounded-xl bg-surface-800/95 hover:bg-surface-700 text-slate-300 hover:text-white border border-surface-700 shadow-md z-10 ml-1 shrink-0 transition-all items-center justify-center cursor-pointer">
        <i data-lucide="chevron-right" class="w-4 h-4"></i>
      </button>
    </footer>
  </main>

  <!-- ========================================================================= -->
  <!-- SETTINGS MODAL -->
  <!-- ========================================================================= -->
  <div id="settingsModal" onclick="if (event.target === this) closeSettingsModal()" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
    <div class="bg-surface-850 border border-surface-700 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[90vh]">
      <div class="p-3 sm:p-4 border-b border-surface-750 flex items-center justify-between">
        <h3 class="font-bold text-sm sm:text-base text-white flex items-center gap-2">
          <i data-lucide="settings" class="w-5 h-5 text-brand-400"></i>
          Centro de Configuración de Andy Agent
        </h3>
        <button onclick="closeSettingsModal()" class="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-surface-750">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <div class="px-2 sm:px-4 pt-2 border-b border-surface-750 flex overflow-x-auto no-scrollbar flex-nowrap gap-1 bg-surface-800/60 text-xs">
        <button onclick="switchSettingsTab('models')" id="setTabModelsBtn" class="px-3 py-2 font-medium border-b-2 border-brand-500 text-brand-300 whitespace-nowrap shrink-0">Modelos & Omniroute</button>
        <button onclick="switchSettingsTab('autolearn')" id="setTabAutoLearnBtn" class="px-3 py-2 font-medium text-purple-300 hover:text-white flex items-center gap-1 whitespace-nowrap shrink-0">🧠 Autoaprendizaje</button>
        <button onclick="switchSettingsTab('thinking')" id="setTabThinkingBtn" class="px-3 py-2 font-medium text-slate-400 hover:text-white whitespace-nowrap shrink-0">Thinking Budgets</button>
        <button onclick="switchSettingsTab('rlm')" id="setTabRlmBtn" class="px-3 py-2 font-medium text-slate-400 hover:text-white whitespace-nowrap shrink-0">RLM & Subagentes</button>
        <button onclick="switchSettingsTab('compaction')" id="setTabCompactionBtn" class="px-3 py-2 font-medium text-slate-400 hover:text-white whitespace-nowrap shrink-0">Compactación</button>
        <button onclick="switchSettingsTab('mcp')" id="setTabMcpBtn" class="px-3 py-2 font-medium text-slate-400 hover:text-white whitespace-nowrap shrink-0">Servidores MCP</button>
        <button onclick="switchSettingsTab('shell')" id="setTabShellBtn" class="px-3 py-2 font-medium text-slate-400 hover:text-white whitespace-nowrap shrink-0">Terminal & Reintentos</button>
        <button onclick="switchSettingsTab('appearance')" id="setTabAppearanceBtn" class="px-3 py-2 font-medium text-slate-400 hover:text-white whitespace-nowrap shrink-0">🎨 Marca & Apariencia</button>
      </div>

      <div class="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 text-xs flex-1">
        <div id="setTabModels" class="space-y-4">
          <div class="bg-surface-800 p-4 rounded-xl border border-surface-700 space-y-3">
            <h4 class="font-semibold text-sm text-slate-200 flex items-center gap-2">
              <i data-lucide="zap" class="w-4 h-4 text-amber-400"></i>
              Proveedor Omniroute / Custom API
            </h4>
            <p class="text-[11px] text-slate-400">Configura tu endpoint compatible con OpenAI o proxy local.</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label class="block text-slate-300 mb-1 font-medium">Base URL</label>
                <input id="settingBaseUrl" type="text" placeholder="http://ia.v2nethost.cl:20128/v1" class="w-full bg-surface-750 border border-surface-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-brand-500">
              </div>
              <div>
                <label class="block text-slate-300 mb-1 font-medium">API Key</label>
                <input id="settingApiKey" type="password" placeholder="sk-..." class="w-full bg-surface-750 border border-surface-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-brand-500">
              </div>
            </div>
          </div>

          <div class="bg-surface-800 p-4 rounded-xl border border-surface-700 space-y-3">
            <h4 class="font-semibold text-sm text-slate-200 flex items-center gap-2">
              <i data-lucide="sliders" class="w-4 h-4 text-brand-400"></i>
              Parámetros de Selección de Modelo & Proveedor
            </h4>
            <p class="text-[11px] text-slate-400">Selecciona el proveedor y su modelo predeterminado desde las listas desplegables.</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label class="block text-slate-300 mb-1 font-medium">Proveedor por Defecto</label>
                <select id="settingDefaultProvider" onchange="onSettingsProviderChange(this.value)" class="w-full bg-surface-750 border border-surface-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-brand-500 cursor-pointer">
                  <!-- Dynamic provider list -->
                </select>
              </div>
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="block text-slate-300 font-medium">Modelo por Defecto</label>
                  <span id="settingModelCountBadge" class="text-[10px] text-brand-400 font-mono"></span>
                </div>
                <select id="settingDefaultModel" class="w-full bg-surface-750 border border-surface-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-brand-500 cursor-pointer">
                  <!-- Dynamic models according to selected provider -->
                </select>
              </div>
            </div>
          </div>
        </div>

        <div id="setTabAutoLearn" class="hidden space-y-4">
          <div class="bg-surface-800 p-4 rounded-xl border border-surface-700 space-y-3">
            <h4 class="font-semibold text-sm text-slate-200 flex items-center gap-2">
              <i data-lucide="brain" class="w-4 h-4 text-purple-400"></i>
              Motor de Autoaprendizaje Autónomo (Auto-Learn & Reflection)
            </h4>
            <p class="text-[11px] text-slate-400">Permite que Andy Agent reflexione automáticamente tras cada turno en segundo plano para consolidar lecciones aprendidas, comandos y decisiones en MEMORY.md.</p>
            
            <div class="space-y-2.5 pt-2">
              <label class="flex items-center gap-2 text-slate-200 font-medium cursor-pointer">
                <input id="settingAutoLearnEnabled" type="checkbox" checked class="rounded bg-surface-750 border-surface-700 text-brand-500">
                Autoaprendizaje continuo activo
              </label>
              <label class="flex items-center gap-2 text-slate-300 text-[11px] pl-6 cursor-pointer">
                <input id="settingAutoUpdateMemory" type="checkbox" checked class="rounded bg-surface-750 border-surface-700 text-brand-500">
                Actualizar automáticamente MEMORY.md con lecciones aprendidas
              </label>
              <label class="flex items-center gap-2 text-slate-300 text-[11px] pl-6 cursor-pointer">
                <input id="settingAutoCreateSkills" type="checkbox" checked class="rounded bg-surface-750 border-surface-700 text-brand-500">
                Generar habilidades automáticas (SKILL.md)
              </label>
            </div>

            <div class="pt-3 border-t border-surface-750">
              <label class="block text-slate-300 mb-1 font-medium">Destino de la Memoria</label>
              <select id="settingAutoLearnScope" class="w-full bg-surface-750 border border-surface-700 rounded-lg px-3 py-2 text-white text-xs">
                <option value="project" selected>Memoria del Proyecto actual (./MEMORY.md)</option>
                <option value="global">Memoria Global de Usuario (~/.andy/agent/MEMORY.md)</option>
              </select>
            </div>
          </div>
        </div>

        <div id="setTabThinking" class="hidden space-y-4">
          <div class="bg-surface-800 p-4 rounded-xl border border-surface-700 space-y-3">
            <h4 class="font-semibold text-sm text-slate-200 flex items-center gap-2">
              <i data-lucide="brain" class="w-4 h-4 text-purple-400"></i>
              Niveles y Presupuestos de Razonamiento (Thinking Budgets)
            </h4>
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-slate-300 mb-1 font-medium">Minimal (tokens)</label>
                <input id="thinkBudgetMinimal" type="number" value="1024" class="w-full bg-surface-750 border border-surface-700 rounded-lg px-3 py-2 text-white font-mono text-xs">
              </div>
              <div>
                <label class="block text-slate-300 mb-1 font-medium">Low (tokens)</label>
                <input id="thinkBudgetLow" type="number" value="4096" class="w-full bg-surface-750 border border-surface-700 rounded-lg px-3 py-2 text-white font-mono text-xs">
              </div>
              <div>
                <label class="block text-slate-300 mb-1 font-medium">Medium (tokens)</label>
                <input id="thinkBudgetMedium" type="number" value="8192" class="w-full bg-surface-750 border border-surface-700 rounded-lg px-3 py-2 text-white font-mono text-xs">
              </div>
            </div>
          </div>
        </div>

        <div id="setTabRlm" class="hidden space-y-4">
          <div class="bg-surface-800 p-4 rounded-xl border border-surface-700 space-y-3">
            <h4 class="font-semibold text-sm text-slate-200 flex items-center gap-2">
              <i data-lucide="layers" class="w-4 h-4 text-purple-400"></i>
              Profundidad Máxima de Subagentes (RLM Max Depth)
            </h4>
            <input id="settingRlmMaxDepth" type="number" min="0" max="10" value="2" class="w-32 bg-surface-750 border border-surface-700 rounded-lg px-3 py-2 text-white font-mono text-xs">
          </div>
        </div>

        <div id="setTabCompaction" class="hidden space-y-4">
          <div class="bg-surface-800 p-4 rounded-xl border border-surface-700 space-y-3">
            <h4 class="font-semibold text-sm text-slate-200 flex items-center gap-2">
              <i data-lucide="minimize-2" class="w-4 h-4 text-cyan-400"></i>
              Límites y Parámetros de Compactación
            </h4>
            <div class="space-y-3">
              <label class="flex items-center gap-2 text-slate-300">
                <input id="settingCompactionEnabled" type="checkbox" checked class="rounded bg-surface-750 border-surface-700 text-brand-500">
                Habilitar auto-compactación de contexto en ramas largas
              </label>
            </div>
          </div>
        </div>

        <div id="setTabMcp" class="hidden space-y-4">
          <div class="bg-surface-800 p-4 rounded-xl border border-surface-700 space-y-3">
            <div class="flex items-center justify-between">
              <h4 class="font-semibold text-sm text-slate-200 flex items-center gap-2">
                <i data-lucide="plug" class="w-4 h-4 text-indigo-400"></i>
                Servidores MCP (Model Context Protocol)
              </h4>
            </div>
            <p class="text-[11px] text-slate-400">Servidores MCP activos y herramientas conectadas.</p>
            <div id="mcpServersContainer" class="space-y-2">
              <div class="text-slate-500 text-xs p-2">Cargando servidores MCP...</div>
            </div>
          </div>
        </div>

        <div id="setTabShell" class="hidden space-y-4">
          <div class="bg-surface-800 p-4 rounded-xl border border-surface-700 space-y-3">
            <h4 class="font-semibold text-sm text-slate-200 flex items-center gap-2">
              <i data-lucide="terminal" class="w-4 h-4 text-emerald-400"></i>
              Configuración de Terminal
            </h4>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-slate-300 mb-1">Ruta del Shell</label>
                <input id="settingShellPath" type="text" placeholder="powershell.exe / bash" class="w-full bg-surface-750 border border-surface-700 rounded-lg px-3 py-2 text-white font-mono text-xs">
              </div>
            </div>
          </div>
        </div>

        <div id="setTabAppearance" class="hidden space-y-4">
          <!-- Branding / Custom Identity Card -->
          <div class="bg-surface-800 p-4 rounded-xl border border-brand-500/30 space-y-4 shadow-lg">
            <div class="flex items-center justify-between border-b border-surface-750 pb-2.5">
              <div>
                <h4 class="font-bold text-sm text-white flex items-center gap-2">
                  <i data-lucide="palette" class="w-4 h-4 text-brand-400"></i>
                  Identidad Visual, Marca & Logo (Personalización)
                </h4>
                <p class="text-[11px] text-slate-400">Modifica el nombre, eslogan, insignia y logotipo de la interfaz WebUI tantas veces como desees.</p>
              </div>
              <button onclick="resetBrandingDefaults()" type="button" class="text-[11px] text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-surface-750 hover:bg-surface-700 transition-colors flex items-center gap-1 cursor-pointer">
                <i data-lucide="rotate-ccw" class="w-3 h-3"></i>
                Restablecer por Defecto
              </button>
            </div>

            <!-- Live Preview Box -->
            <div class="bg-surface-900/90 border border-surface-700/80 rounded-xl p-3 space-y-1.5">
              <div class="text-[10px] uppercase font-mono text-slate-400 tracking-wider">Vista Previa en Vivo de la Cabecera</div>
              <div class="flex items-center gap-2.5 p-2 rounded-lg bg-surface-850 border border-surface-750 max-w-sm">
                <div id="brandingPreviewLogo" class="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20 font-bold text-white tracking-wider shrink-0 text-base overflow-hidden">
                  Ψ
                </div>
                <div class="overflow-hidden">
                  <h1 class="font-bold text-sm leading-tight text-white flex items-center gap-1.5 truncate">
                    <span id="brandingPreviewName" class="truncate">Andy Agent</span>
                    <span id="brandingPreviewBadge" class="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-100 font-mono shrink-0">RLM</span>
                  </h1>
                  <p id="brandingPreviewSlogan" class="text-[11px] text-slate-400 truncate">Context Engine & WebUI</p>
                </div>
              </div>
            </div>

            <!-- Branding Form Fields -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label class="block text-slate-300 mb-1 font-medium">Nombre de la Aplicación</label>
                <input id="brandingAppName" type="text" oninput="updateBrandingLivePreview()" placeholder="Ej: Andy Agent" value="Andy Agent" class="w-full bg-surface-750 border border-surface-700 rounded-lg px-3 py-2 text-white font-medium text-xs focus:outline-none focus:border-brand-500">
              </div>
              <div>
                <label class="block text-slate-300 mb-1 font-medium">Eslogan / Subtítulo</label>
                <input id="brandingAppSlogan" type="text" oninput="updateBrandingLivePreview()" placeholder="Ej: Context Engine & WebUI" value="Context Engine & WebUI" class="w-full bg-surface-750 border border-surface-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand-500">
              </div>
              <div>
                <label class="block text-slate-300 mb-1 font-medium">Insignia / Badge (Opcional)</label>
                <input id="brandingAppBadge" type="text" oninput="updateBrandingLivePreview()" placeholder="Ej: RLM, PRO, AI, v2.0" value="RLM" class="w-full bg-surface-750 border border-surface-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-brand-500">
              </div>
            </div>

            <!-- Logo Configuration -->
            <div class="space-y-3 pt-2 border-t border-surface-750/70">
              <div class="flex items-center justify-between">
                <label class="block text-slate-200 font-medium">Logotipo / Ícono</label>
                <div class="flex items-center gap-1 bg-surface-750 p-0.5 rounded-lg text-[11px]">
                  <button type="button" onclick="setBrandingLogoMode('icon')" id="bModeIconBtn" class="px-2.5 py-1 rounded font-medium bg-brand-600 text-white cursor-pointer">Texto / Emoji</button>
                  <button type="button" onclick="setBrandingLogoMode('image')" id="bModeImageBtn" class="px-2.5 py-1 rounded font-medium text-slate-400 hover:text-white cursor-pointer">URL / Imagen</button>
                </div>
              </div>

              <!-- Mode 1: Icon / Text / Emoji -->
              <div id="brandingIconModeContainer" class="space-y-2">
                <div class="flex items-center gap-2">
                  <input id="brandingLogoValue" type="text" oninput="updateBrandingLivePreview()" placeholder="Ej: Ψ, ⚡, 🤖, 🚀" value="Ψ" maxlength="10" class="w-28 bg-surface-750 border border-surface-700 rounded-lg px-3 py-2 text-white text-center font-bold text-base focus:outline-none focus:border-brand-500">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-[11px] text-slate-400">Atajos rápidos:</span>
                    <button type="button" onclick="quickSelectLogo('Ψ')" class="w-7 h-7 rounded bg-surface-750 hover:bg-surface-700 text-white text-xs font-bold transition-all cursor-pointer">Ψ</button>
                    <button type="button" onclick="quickSelectLogo('⚡')" class="w-7 h-7 rounded bg-surface-750 hover:bg-surface-700 text-white text-xs transition-all cursor-pointer">⚡</button>
                    <button type="button" onclick="quickSelectLogo('🤖')" class="w-7 h-7 rounded bg-surface-750 hover:bg-surface-700 text-white text-xs transition-all cursor-pointer">🤖</button>
                    <button type="button" onclick="quickSelectLogo('🚀')" class="w-7 h-7 rounded bg-surface-750 hover:bg-surface-700 text-white text-xs transition-all cursor-pointer">🚀</button>
                    <button type="button" onclick="quickSelectLogo('🧠')" class="w-7 h-7 rounded bg-surface-750 hover:bg-surface-700 text-white text-xs transition-all cursor-pointer">🧠</button>
                    <button type="button" onclick="quickSelectLogo('👑')" class="w-7 h-7 rounded bg-surface-750 hover:bg-surface-700 text-white text-xs transition-all cursor-pointer">👑</button>
                    <button type="button" onclick="quickSelectLogo('🔮')" class="w-7 h-7 rounded bg-surface-750 hover:bg-surface-700 text-white text-xs transition-all cursor-pointer">🔮</button>
                    <button type="button" onclick="quickSelectLogo('🏛️')" class="w-7 h-7 rounded bg-surface-750 hover:bg-surface-700 text-white text-xs transition-all cursor-pointer">🏛️</button>
                    <button type="button" onclick="quickSelectLogo('🔥')" class="w-7 h-7 rounded bg-surface-750 hover:bg-surface-700 text-white text-xs transition-all cursor-pointer">🔥</button>
                    <button type="button" onclick="quickSelectLogo('💎')" class="w-7 h-7 rounded bg-surface-750 hover:bg-surface-700 text-white text-xs transition-all cursor-pointer">💎</button>
                  </div>
                </div>
              </div>

              <!-- Mode 2: Image URL / Upload -->
              <div id="brandingImageModeContainer" class="hidden space-y-2">
                <div class="flex items-center gap-2">
                  <input id="brandingImageUrlInput" type="text" oninput="updateBrandingLivePreview()" placeholder="https://ejemplo.com/logo.png o Data URL" class="flex-1 bg-surface-750 border border-surface-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-brand-500">
                  <label class="px-3 py-2 rounded-lg bg-surface-750 hover:bg-surface-700 text-slate-200 hover:text-white font-medium text-xs cursor-pointer border border-surface-700 flex items-center gap-1.5 shrink-0">
                    <i data-lucide="upload" class="w-3.5 h-3.5"></i>
                    <span>Subir imagen</span>
                    <input type="file" id="brandingLogoFileInput" accept="image/*" onchange="handleBrandingFileUpload(event)" class="hidden">
                  </label>
                </div>
              </div>

              <!-- Gradient Palette Selector -->
              <div class="space-y-1.5 pt-2">
                <label class="block text-slate-300 text-[11px] font-medium">Gradiente / Color de Fondo del Logo</label>
                <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  <button type="button" onclick="setLogoGradient('from-brand-600 to-indigo-500')" class="h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 border-2 border-transparent hover:border-white text-[10px] font-bold text-white flex items-center justify-center transition-all shadow-sm cursor-pointer">Púrpura</button>
                  <button type="button" onclick="setLogoGradient('from-cyan-500 to-blue-600')" class="h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 border-2 border-transparent hover:border-white text-[10px] font-bold text-white flex items-center justify-center transition-all shadow-sm cursor-pointer">Cian/Azul</button>
                  <button type="button" onclick="setLogoGradient('from-emerald-500 to-teal-500')" class="h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-500 border-2 border-transparent hover:border-white text-[10px] font-bold text-white flex items-center justify-center transition-all shadow-sm cursor-pointer">Esmeralda</button>
                  <button type="button" onclick="setLogoGradient('from-amber-500 to-rose-500')" class="h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-rose-500 border-2 border-transparent hover:border-white text-[10px] font-bold text-white flex items-center justify-center transition-all shadow-sm cursor-pointer">Ámbar/Fuego</button>
                  <button type="button" onclick="setLogoGradient('from-pink-500 to-purple-600')" class="h-8 rounded-lg bg-gradient-to-tr from-pink-500 to-purple-600 border-2 border-transparent hover:border-white text-[10px] font-bold text-white flex items-center justify-center transition-all shadow-sm cursor-pointer">Rosa/Magenta</button>
                  <button type="button" onclick="setLogoGradient('from-slate-700 to-slate-900')" class="h-8 rounded-lg bg-gradient-to-tr from-slate-700 to-slate-900 border-2 border-transparent hover:border-white text-[10px] font-bold text-white flex items-center justify-center transition-all shadow-sm cursor-pointer">Obsidiana</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Theme card -->
          <div class="bg-surface-800 p-4 rounded-xl border border-surface-700 space-y-3">
            <h4 class="font-semibold text-sm text-slate-200 flex items-center gap-2">
              <i data-lucide="sun-moon" class="w-4 h-4 text-cyan-400"></i>
              Tema Visual & Estilo Global
            </h4>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-slate-300 mb-1">Tema</label>
                <select id="settingTheme" onchange="switchTheme(this.value)" class="w-full bg-surface-750 border border-surface-700 rounded-lg px-3 py-2 text-white text-xs">
                  <option value="dark" selected>Dark OLED</option>
                  <option value="slate">Slate Dark</option>
                  <option value="cyberpunk">Cyberpunk Neon</option>
                  <option value="light">Light</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="p-4 border-t border-surface-750 bg-surface-800 flex justify-end gap-2">
        <button onclick="closeSettingsModal()" class="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-surface-700 font-medium">Cerrar</button>
        <button onclick="saveSettings()" class="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium shadow-md shadow-brand-600/20">Guardar Cambios</button>
      </div>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- PROJECTS MANAGER MODAL -->
  <!-- ========================================================================= -->
  <div id="projectsModal" onclick="if (event.target === this) closeProjectsModal()" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
    <div class="bg-surface-850 border border-surface-700 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[85vh]">
      <div class="p-3 sm:p-4 border-b border-surface-750 flex items-center justify-between">
        <h3 class="font-bold text-sm sm:text-base text-white flex items-center gap-2">
          <i data-lucide="folder-kanban" class="w-5 h-5 text-cyan-400"></i>
          Gestor de Proyectos & Espacios de Trabajo
        </h3>
        <button onclick="closeProjectsModal()" class="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-surface-750">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <div class="px-3 sm:px-4 pt-2 border-b border-surface-750 flex gap-2 bg-surface-800/60 text-xs">
        <button onclick="switchProjectsModalTab('list')" id="projTabListBtn" class="px-3 py-2 font-medium border-b-2 border-cyan-500 text-cyan-300 flex items-center gap-1.5">
          <i data-lucide="layout-grid" class="w-3.5 h-3.5"></i>
          Mis Proyectos (<span id="modalProjectsCount">0</span>)
        </button>
        <button onclick="switchProjectsModalTab('create')" id="projTabCreateBtn" class="px-3 py-2 font-medium text-slate-400 hover:text-white flex items-center gap-1.5">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i>
          Nuevo Proyecto
        </button>
      </div>

      <div class="p-3 sm:p-6 overflow-y-auto space-y-4 text-xs flex-1">
        <!-- Tab: List of Projects -->
        <div id="projTabList" class="space-y-3">
          <div id="projectsCardsList" class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="text-slate-400 p-6 text-center col-span-full">Cargando proyectos...</div>
          </div>
        </div>

        <!-- Tab: Create Project Form -->
        <div id="projTabCreate" class="hidden space-y-4">
          <div class="bg-surface-800 p-4 rounded-xl border border-surface-700 space-y-3">
            <h4 class="font-semibold text-sm text-slate-200 flex items-center gap-2">
              <i data-lucide="plus-circle" class="w-4 h-4 text-cyan-400"></i>
              Crear o Vincular Nuevo Proyecto
            </h4>
            <p class="text-[11px] text-slate-400">Cada proyecto aísla sus propios chats, grafo AST Graft, memoria MEMORY.md, directivas AGENTS.md y habilidades.</p>
            
            <div class="space-y-3">
              <div>
                <label class="block text-slate-300 mb-1 font-medium">Nombre del Proyecto <span class="text-rose-400">*</span></label>
                <input id="newProjName" type="text" placeholder="Ej: Hitachi IH110 Protocol / Mi App" class="w-full bg-surface-750 border border-surface-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500">
              </div>

              <div>
                <label class="block text-slate-300 mb-1 font-medium">Ruta de la Carpeta en Disco <span class="text-rose-400">*</span></label>
                <input id="newProjPath" type="text" placeholder="Ej: C:/Users/.../MiProyecto o /root/projects/app" class="w-full bg-surface-750 border border-surface-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-500">
                <p class="text-[10px] text-slate-400 mt-1">Si la carpeta no existe, se creará automáticamente.</p>
              </div>

              <div>
                <label class="block text-slate-300 mb-1 font-medium">Descripción (Opcional)</label>
                <input id="newProjDescription" type="text" placeholder="Breve resumen del propósito del proyecto..." class="w-full bg-surface-750 border border-surface-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500">
              </div>

              <div class="pt-1">
                <label class="flex items-start gap-2.5 text-slate-200 text-xs font-medium cursor-pointer bg-surface-750/60 p-3 rounded-xl border border-surface-700 hover:border-emerald-500/40 transition-colors">
                  <input id="newProjAutonomy" type="checkbox" checked class="rounded bg-surface-700 border-surface-600 text-emerald-500 w-4 h-4 mt-0.5 shrink-0">
                  <div>
                    <div class="text-white font-semibold flex items-center gap-1.5">
                      <i data-lucide="zap" class="w-3.5 h-3.5 text-amber-400"></i>
                      Modo Autónomo Activo (Goose-style)
                    </div>
                    <div class="text-[11px] text-slate-400 mt-0.5">Permite al agente editar archivos, crear código y ejecutar comandos automáticamente sin pedir confirmaciones adicionales.</div>
                  </div>
                </label>
              </div>
            </div>

            <div class="pt-2 flex justify-end">
              <button onclick="submitCreateProject()" class="bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-md shadow-cyan-600/20 transition-all">
                <i data-lucide="check" class="w-4 h-4"></i>
                Crear y Activar Proyecto
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="p-3 border-t border-surface-750 bg-surface-800/80 flex justify-between items-center text-xs">
        <span class="text-slate-400 text-[11px]">Andy Agent Multi-Project Manager</span>
        <button onclick="closeProjectsModal()" class="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-surface-700 font-medium">Cerrar</button>
      </div>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- CLIENT CONTROLLER -->
  <!-- ========================================================================= -->
  <script>
    let currentUser = null;
    let authToken = localStorage.getItem('andy_session_token') || '';
    let currentSessionId = 'default';
    let currentProjectId = 'default';
    let projectsList = [];
    let activeProjectData = null;
    let availableModels = [];
    let allProvidersList = [];
    let providerCatalogs = [];
    let selectedDropdownProviderId = 'omniroute';
    let dropdownSearchQuery = '';
    let activeProviderCategory = 'ALL';
    let currentModelId = 'auto/best-coding';
    let currentProviderId = 'omniroute';
    let currentThinkingLevel = 'medium';
    let activeAbortController = null;
    let activeDocType = 'memory';
    let activeDocScope = 'project';
    let activeLogFilter = 'ALL';
    let allLogs = [];
    let activeWorkspaceFilePath = '';
    let debounceTimers = {};
    let providerModelsCache = {};

    // --- FETCH AUTH INTERCEPTOR ---
    const originalFetch = window.fetch;
    window.fetch = async function(resource, init = {}) {
      const headers = new Headers(init.headers || {});
      if (authToken && !headers.has('Authorization')) {
        headers.set('Authorization', 'Bearer ' + authToken);
      }
      init.headers = headers;
      const response = await originalFetch(resource, init);
      if (response.status === 401 && typeof resource === 'string' && resource.startsWith('/api/') && !resource.startsWith('/api/auth/login') && !resource.startsWith('/api/auth/status')) {
        showLoginOverlay('Tu sesión ha expirado o requiere autenticación.');
      }
      return response;
    };

    document.addEventListener('DOMContentLoaded', async () => {
      initTheme();
      initAppBranding();
      lucide.createIcons();
      const authenticated = await checkAuthSession();
      if (!authenticated) {
        showLoginOverlay();
        return;
      }
      await initializeApp();
    });

    async function initializeApp() {
      initAppBranding();
      await fetchProjects();
      await fetchModelCatalogs();
      await fetchProviders();

      try {
        const res = await fetch(\`/api/sessions?projectId=\${encodeURIComponent(currentProjectId)}\`);
        const data = await res.json();
        const sessions = data.sessions || [];
        if (sessions.length > 0) {
          currentSessionId = sessions[0].id;
          await loadSession(currentSessionId);
        } else {
          currentSessionId = 'session-' + Math.random().toString(36).substring(2, 9);
          await loadSession(currentSessionId);
        }
      } catch (e) {
        await loadSession(currentSessionId);
      }

      await fetchSessions();
      await loadPantheonData();
      initLogsStream();
      setTimeout(updateFooterNavScrollButtons, 150);
    }

    // --- PROJECTS MANAGEMENT ---
    async function fetchProjects() {
      try {
        const res = await fetch('/api/projects');
        const data = await res.json();
        projectsList = data.projects || [];
        currentProjectId = data.activeProjectId || (projectsList[0] ? projectsList[0].id : 'default');
        activeProjectData = data.activeProject || projectsList.find(p => p.id === currentProjectId) || projectsList[0];

        updateProjectHeaders();
        renderProjectsCards();
      } catch (err) {
        console.error('Error fetching projects:', err);
      }
    }

    function updateProjectHeaders() {
      if (!activeProjectData) return;
      const sidebarName = document.getElementById('sidebarProjectName');
      const sidebarPath = document.getElementById('sidebarProjectPath');
      const headerName = document.getElementById('headerProjectName');
      const modalCount = document.getElementById('modalProjectsCount');

      if (sidebarName) sidebarName.innerText = activeProjectData.name || 'Proyecto Principal';
      if (sidebarPath) sidebarPath.innerText = activeProjectData.path || '...';
      if (headerName) headerName.innerText = activeProjectData.name || 'Proyecto Principal';
      if (modalCount) modalCount.innerText = projectsList.length;

      updateAutonomyHeaderButton(activeProjectData.autonomousMode !== false);
    }

    function updateAutonomyHeaderButton(isAutonomous) {
      const btn = document.getElementById('autonomyHeaderBtn');
      const dot = document.getElementById('autonomyHeaderDot');
      const text = document.getElementById('autonomyHeaderText');
      if (!btn) return;

      if (isAutonomous) {
        btn.className = 'flex items-center gap-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-300 transition-all shadow-sm shrink-0';
        if (dot) dot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
        if (text) text.innerText = 'Autónomo: ON';
        btn.title = 'Modo Autónomo ACTIVO (Goose-style): El agente edita archivos y ejecuta comandos automáticamente sin pedir permisos. Haz clic para pausar.';
      } else {
        btn.className = 'flex items-center gap-1.5 bg-surface-800 hover:bg-surface-750 border border-surface-700 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 transition-all shadow-sm shrink-0';
        if (dot) dot.className = 'w-2 h-2 rounded-full bg-slate-500';
        if (text) text.innerText = 'Autónomo: OFF';
        btn.title = 'Modo Supervisado (Autónomo DESACTIVADO): Haz clic para activar el modo autónomo sin confirmaciones.';
      }
    }

    async function toggleActiveProjectAutonomy() {
      try {
        const res = await fetch('/api/projects/toggle-autonomy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: currentProjectId })
        });
        const data = await res.json();
        if (data.success) {
          if (activeProjectData) {
            activeProjectData.autonomousMode = data.autonomousMode;
          }
          updateAutonomyHeaderButton(data.autonomousMode);
          await fetchProjects();
        }
      } catch (e) {
        console.error('Error toggling autonomy:', e);
      }
    }

    async function toggleProjectAutonomyById(projectId) {
      try {
        const res = await fetch('/api/projects/toggle-autonomy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId })
        });
        const data = await res.json();
        if (data.success) {
          if (projectId === currentProjectId && activeProjectData) {
            activeProjectData.autonomousMode = data.autonomousMode;
            updateAutonomyHeaderButton(data.autonomousMode);
          }
          await fetchProjects();
        }
      } catch (e) {
        console.error('Error toggling project autonomy:', e);
      }
    }

    function renderProjectsCards() {
      const container = document.getElementById('projectsCardsList');
      if (!container) return;
      container.innerHTML = '';

      if (projectsList.length === 0) {
        container.innerHTML = '<div class="text-slate-400 p-6 text-center col-span-full">No hay proyectos registrados</div>';
        return;
      }

      projectsList.forEach(p => {
        const isActive = p.id === currentProjectId;
        const isAuto = p.autonomousMode !== false;
        const card = document.createElement('div');
        card.className = \`p-3.5 rounded-xl border transition-all flex flex-col justify-between \${isActive ? 'bg-cyan-950/30 border-cyan-500/50 shadow-md shadow-cyan-900/20' : 'bg-surface-800 border-surface-700/80 hover:border-surface-600'}\`;
        
        const descHtml = p.description ? \`<p class="text-[11px] text-slate-300 line-clamp-1">\${p.description}</p>\` : '';
        const deleteBtnHtml = (projectsList.length > 1 && !isActive) ? \`
          <button onclick="deleteProject('\${p.id}', '\${p.name.replace(/'/g, "\\\\'")}')" class="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-surface-700 transition-colors" title="Eliminar proyecto">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        \` : '';

        const actionBtnHtml = isActive ? \`
          <span class="text-[11px] text-cyan-400 font-medium flex items-center gap-1">
            <i data-lucide="check" class="w-3.5 h-3.5"></i> Espacio Actual
          </span>
        \` : \`
          <button onclick="switchProject('\${p.id}')" class="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
            <i data-lucide="log-in" class="w-3.5 h-3.5"></i> Abrir Proyecto
          </button>
        \`;

        const autonomyBadgeHtml = \`
          <button onclick="event.stopPropagation(); toggleProjectAutonomyById('\${p.id}')" title="Alternar Modo Autónomo para este proyecto" class="px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 transition-colors \${isAuto ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25' : 'bg-surface-750 border-surface-700 text-slate-400 hover:bg-surface-700'}">
            <span class="w-1.5 h-1.5 rounded-full \${isAuto ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}"></span>
            \${isAuto ? '⚡ Autónomo' : 'Supervisado'}
          </button>
        \`;

        const isIdeProject = p.source === 'ide' || p.name.startsWith('[IDE]');
        const ideBadgeHtml = isIdeProject ? \`
          <span class="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-medium border border-indigo-500/30 flex items-center gap-1">
            <i data-lucide="terminal" class="w-2.5 h-2.5"></i> \${p.clientName || 'IDE'}
          </span>
        \` : '';

        card.innerHTML = \`
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <span class="font-bold text-xs \${isActive ? 'text-cyan-300' : 'text-white'} truncate flex items-center gap-1.5">
                <i data-lucide="\${isIdeProject ? 'code-2' : 'folder-kanban'}" class="w-3.5 h-3.5 \${isActive ? 'text-cyan-400' : isIdeProject ? 'text-indigo-400' : 'text-slate-400'}"></i>
                \${p.name}
              </span>
              <div class="flex items-center gap-1.5">
                \${ideBadgeHtml}
                \${autonomyBadgeHtml}
                \${isActive ? '<span class="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30">Activo</span>' : ''}
              </div>
            </div>
            \${descHtml}
            <div class="text-[10px] font-mono text-slate-400 bg-surface-750/70 px-2 py-1 rounded truncate" title="\${p.path}">
              📂 \${p.path}
            </div>
            <div class="flex items-center gap-2 text-[10px] text-slate-400 pt-1">
              <span>💬 \${p.sessionCount || 0} chats</span>
              <span>•</span>
              <span class="text-cyan-400/80">Graft AST independiente</span>
            </div>
          </div>
          <div class="pt-3 mt-2 border-t border-surface-700/50 flex items-center justify-between">
            \${actionBtnHtml}
            \${deleteBtnHtml}
          </div>
        \`;
        container.appendChild(card);
      });
      lucide.createIcons();
    }

    async function switchProject(projectId) {
      if (projectId === currentProjectId) {
        closeProjectsModal();
        return;
      }
      try {
        const res = await fetch('/api/projects/switch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId })
        });
        const data = await res.json();
        if (data.success) {
          currentProjectId = data.activeProjectId;
          activeProjectData = data.activeProject;
          updateProjectHeaders();
          closeProjectsModal();

          // Refresh all views strictly for the new project
          try {
            const sessionsRes = await fetch(\`/api/sessions?projectId=\${encodeURIComponent(currentProjectId)}\`);
            const sessionsData = await sessionsRes.json();
            const sessions = sessionsData.sessions || [];
            if (sessions.length > 0) {
              currentSessionId = sessions[0].id;
              await loadSession(currentSessionId);
            } else {
              currentSessionId = 'session-' + Math.random().toString(36).substring(2, 9);
              await loadSession(currentSessionId);
            }
          } catch (e) {
            await createNewSession();
          }

          await fetchSessions();
          await fetchProjects();
          fetchActiveDoc();
          fetchSkillsAndPrompts();
          refreshWorkspaceFiles();
          fetchGraftMap();
          loadPantheonData();
        } else {
          alert('Error al cambiar de proyecto: ' + (data.error || 'Desconocido'));
        }
      } catch (err) {
        alert('Error al conectar con el servidor: ' + err.message);
      }
    }

    async function submitCreateProject() {
      const nameInput = document.getElementById('newProjName');
      const pathInput = document.getElementById('newProjPath');
      const descInput = document.getElementById('newProjDescription');
      const autoInput = document.getElementById('newProjAutonomy');

      const name = nameInput.value.trim();
      const path = pathInput.value.trim();
      const description = descInput.value.trim();
      const autonomousMode = autoInput ? autoInput.checked : true;

      if (!name) {
        alert('Ingresa un nombre para el proyecto.');
        nameInput.focus();
        return;
      }
      if (!path) {
        alert('Ingresa la ruta de la carpeta en disco.');
        pathInput.focus();
        return;
      }

      try {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, path, description, autonomousMode })
        });
        const data = await res.json();
        if (data.success) {
          nameInput.value = '';
          pathInput.value = '';
          descInput.value = '';
          switchProjectsModalTab('list');
          await switchProject(data.project.id);
          await fetchProjects();
        } else {
          alert('Error al crear proyecto: ' + (data.error || 'Desconocido'));
        }
      } catch (err) {
        alert('Error al crear proyecto: ' + err.message);
      }
    }

    async function deleteProject(projectId, projectName) {
      if (!confirm(\`¿Estás seguro de eliminar el proyecto "\${projectName}" de Andy Agent?\\n\\n(Tus archivos en disco NO serán eliminados).\`)) return;
      try {
        const res = await fetch(\`/api/projects/\${projectId}\`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          await fetchProjects();
          await fetchSessions();
        } else {
          alert('Error al eliminar proyecto: ' + (data.error || 'Desconocido'));
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }

    function openProjectsModal() {
      document.getElementById('projectsModal').classList.remove('hidden');
      fetchProjects();
      switchProjectsModalTab('list');
      lucide.createIcons();
    }

    function closeProjectsModal() {
      document.getElementById('projectsModal').classList.add('hidden');
    }

    function switchProjectsModalTab(tab) {
      const listTab = document.getElementById('projTabList');
      const createTab = document.getElementById('projTabCreate');
      const listBtn = document.getElementById('projTabListBtn');
      const createBtn = document.getElementById('projTabCreateBtn');

      if (tab === 'list') {
        listTab.classList.remove('hidden');
        createTab.classList.add('hidden');
        listBtn.className = 'px-3 py-2 font-medium border-b-2 border-cyan-500 text-cyan-300 flex items-center gap-1.5';
        createBtn.className = 'px-3 py-2 font-medium text-slate-400 hover:text-white flex items-center gap-1.5';
        renderProjectsCards();
      } else {
        listTab.classList.add('hidden');
        createTab.classList.remove('hidden');
        createBtn.className = 'px-3 py-2 font-medium border-b-2 border-cyan-500 text-cyan-300 flex items-center gap-1.5';
        listBtn.className = 'px-3 py-2 font-medium text-slate-400 hover:text-white flex items-center gap-1.5';
      }
      lucide.createIcons();
    }

    // --- NAVIGATION & VIEWS ---
    const TAB_BUTTON_MAP = {
      chat: 'tabChatBtn',
      pantheon: 'tabPantheonBtn',
      terminal: 'tabTerminalBtn',
      providers: 'tabProvidersBtn',
      graft: 'tabGraftBtn',
      files: 'tabFilesBtn',
      logs: 'tabLogsBtn',
      memory: 'tabMemoryBtn',
      skills: 'tabSkillsBtn',
      tree: 'tabTreeBtn',
      apikeys: 'tabApiKeysBtn',
      users: 'tabUsersBtn'
    };

    function scrollFooterTabs(offset) {
      const nav = document.getElementById('footerNavTabs');
      if (!nav) return;
      nav.scrollBy({ left: offset, behavior: 'smooth' });
      setTimeout(updateFooterNavScrollButtons, 180);
    }

    function handleFooterNavWheel(e) {
      if (e.deltaY !== 0) {
        e.preventDefault();
        const nav = document.getElementById('footerNavTabs');
        if (nav) {
          nav.scrollLeft += e.deltaY;
          updateFooterNavScrollButtons();
        }
      }
    }

    function updateFooterNavScrollButtons() {
      const nav = document.getElementById('footerNavTabs');
      const leftBtn = document.getElementById('footerScrollLeftBtn');
      const rightBtn = document.getElementById('footerScrollRightBtn');
      if (!nav || !leftBtn || !rightBtn) return;
      
      const hasOverflow = nav.scrollWidth > nav.clientWidth + 4;
      if (hasOverflow) {
        if (nav.scrollLeft > 6) {
          leftBtn.classList.remove('hidden');
          leftBtn.classList.add('flex');
        } else {
          leftBtn.classList.add('hidden');
          leftBtn.classList.remove('flex');
        }
        
        if (nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 6) {
          rightBtn.classList.remove('hidden');
          rightBtn.classList.add('flex');
        } else {
          rightBtn.classList.add('hidden');
          rightBtn.classList.remove('flex');
        }
      } else {
        leftBtn.classList.add('hidden');
        leftBtn.classList.remove('flex');
        rightBtn.classList.add('hidden');
        rightBtn.classList.remove('flex');
      }
    }

    window.addEventListener('resize', updateFooterNavScrollButtons);
    if (typeof ResizeObserver !== 'undefined') {
      const footerResizeObserver = new ResizeObserver(() => {
        updateFooterNavScrollButtons();
      });
      window.addEventListener('DOMContentLoaded', () => {
        const tabsEl = document.getElementById('footerNavTabs');
        if (tabsEl) footerResizeObserver.observe(tabsEl);
      });
    }

    function switchView(view) {
      ['viewChat', 'viewPantheon', 'viewTerminal', 'viewProviders', 'viewGraft', 'viewMemory', 'viewSkills', 'viewTree', 'viewLogs', 'viewFiles', 'viewApiKeys', 'viewUsers'].forEach(v => {
        const el = document.getElementById(v);
        if (el) el.classList.add('hidden');
      });

      ['tabChatBtn', 'tabPantheonBtn', 'tabTerminalBtn', 'tabProvidersBtn', 'tabGraftBtn', 'tabMemoryBtn', 'tabSkillsBtn', 'tabTreeBtn', 'tabLogsBtn', 'tabFilesBtn', 'tabApiKeysBtn', 'tabUsersBtn'].forEach(t => {
        const el = document.getElementById(t);
        if (el) el.className = 'px-3 py-1.5 rounded-xl font-medium text-xs text-slate-400 hover:text-slate-200 hover:bg-surface-750 flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap shrink-0';
      });

      const activeBtnId = TAB_BUTTON_MAP[view];
      if (activeBtnId) {
        const btn = document.getElementById(activeBtnId);
        if (btn) {
          btn.className = 'px-3 py-1.5 rounded-xl font-semibold text-xs text-white bg-brand-600 shadow-md shadow-brand-500/25 flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap shrink-0';
          btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
      }

      if (view === 'chat') {
        document.getElementById('viewChat').classList.remove('hidden');
      } else if (view === 'pantheon') {
        document.getElementById('viewPantheon').classList.remove('hidden');
        loadPantheonData();
      } else if (view === 'terminal') {
        document.getElementById('viewTerminal').classList.remove('hidden');
        updateTerminalCwdBadge();
        const input = document.getElementById('terminalCommandInput');
        if (input) input.focus();
      } else if (view === 'providers') {
        document.getElementById('viewProviders').classList.remove('hidden');
        fetchProviders();
      } else if (view === 'graft') {
        document.getElementById('viewGraft').classList.remove('hidden');
        initGraftStudio();
      } else if (view === 'files') {
        document.getElementById('viewFiles').classList.remove('hidden');
        refreshWorkspaceFiles();
      } else if (view === 'logs') {
        document.getElementById('viewLogs').classList.remove('hidden');
        renderLogs();
      } else if (view === 'memory') {
        document.getElementById('viewMemory').classList.remove('hidden');
        fetchActiveDoc();
      } else if (view === 'skills') {
        document.getElementById('viewSkills').classList.remove('hidden');
        fetchSkillsAndPrompts();
      } else if (view === 'tree') {
        document.getElementById('viewTree').classList.remove('hidden');
        refreshBranchTree();
      } else if (view === 'apikeys') {
        document.getElementById('viewApiKeys').classList.remove('hidden');
        fetchApiKeys();
      } else if (view === 'users') {
        document.getElementById('viewUsers').classList.remove('hidden');
        fetchUsersList();
      }
      
      // Auto close sidebar on mobile if open
      if (window.innerWidth < 768) {
        toggleSidebar(false);
      }
      setTimeout(updateFooterNavScrollButtons, 120);
      lucide.createIcons();
    }

    function toggleSidebar(forceState) {
      const sidebar = document.getElementById('sidebar');
      const backdrop = document.getElementById('sidebarBackdrop');
      if (!sidebar) return;
      const isMobile = window.innerWidth < 768;
      
      if (isMobile) {
        let shouldOpen;
        if (typeof forceState === 'boolean') {
          shouldOpen = forceState;
        } else {
          shouldOpen = sidebar.classList.contains('-translate-x-full');
        }
        
        if (shouldOpen) {
          sidebar.classList.remove('-translate-x-full');
          sidebar.classList.add('translate-x-0');
          if (backdrop) backdrop.classList.remove('hidden');
        } else {
          sidebar.classList.add('-translate-x-full');
          sidebar.classList.remove('translate-x-0');
          if (backdrop) backdrop.classList.add('hidden');
        }
      } else {
        const isHidden = sidebar.classList.contains('md:-ml-72') || sidebar.classList.contains('hidden');
        let shouldHide;
        if (typeof forceState === 'boolean') {
          shouldHide = !forceState;
        } else {
          shouldHide = !isHidden;
        }
        
        if (shouldHide) {
          sidebar.classList.add('md:-ml-72');
          sidebar.classList.add('md:opacity-0');
          sidebar.classList.add('md:pointer-events-none');
        } else {
          sidebar.classList.remove('md:-ml-72');
          sidebar.classList.remove('md:opacity-0');
          sidebar.classList.remove('md:pointer-events-none');
          sidebar.classList.remove('hidden');
        }
      }
      setTimeout(updateFooterNavScrollButtons, 320);
    }

    // --- THEME SWITCHER (DARK / LIGHT MODE) ---
    function initTheme() {
      const savedTheme = localStorage.getItem('andy_theme') || 'dark';
      applyTheme(savedTheme);
    }

    function toggleTheme() {
      const isDark = document.documentElement.classList.contains('dark');
      const newTheme = isDark ? 'light' : 'dark';
      applyTheme(newTheme);
      localStorage.setItem('andy_theme', newTheme);
    }

    function applyTheme(theme) {
      const isLight = theme === 'light';
      if (isLight) {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
      }

      document.querySelectorAll('.theme-toggle-icon').forEach(icon => {
        icon.setAttribute('data-lucide', isLight ? 'sun' : 'moon');
      });
      document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
        btn.title = isLight ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro';
      });
      lucide.createIcons();
    }

    // --- MODEL CATALOGS & PROVIDER-GROUPED DROPDOWN ---
    async function fetchModelCatalogs() {
      try {
        const res = await fetch('/api/models/catalog');
        const data = await res.json();
        providerCatalogs = data.catalogs || [];
        currentProviderId = data.activeProvider || 'omniroute';
        currentModelId = data.activeModel || 'auto/best-coding';
        selectedDropdownProviderId = currentProviderId;

        updateHeaderModelButton();
        renderDropdownTabs();
        renderDropdownModelList();
      } catch (err) {
        console.error('Error fetching model catalogs:', err);
      }
    }

    function updateHeaderModelButton() {
      const label = document.getElementById('selectedModelLabel');
      const dot = document.getElementById('selectedProviderDot');
      
      const prov = providerCatalogs.find(c => c.providerId === currentProviderId) || { providerName: currentProviderId };
      label.innerText = \`\${prov.providerName}: \${currentModelId}\`;

      if (currentProviderId === 'omniroute') dot.className = 'w-2 h-2 rounded-full bg-brand-500';
      else if (currentProviderId === 'openai') dot.className = 'w-2 h-2 rounded-full bg-emerald-500';
      else if (currentProviderId === 'anthropic') dot.className = 'w-2 h-2 rounded-full bg-amber-500';
      else if (currentProviderId === 'ollama') dot.className = 'w-2 h-2 rounded-full bg-cyan-500';
      else dot.className = 'w-2 h-2 rounded-full bg-purple-500';
    }

    function renderDropdownTabs() {
      const container = document.getElementById('dropdownProviderTabs');
      if (!container) return;
      container.innerHTML = '';

      // Tab "Todos"
      const allBtn = document.createElement('button');
      allBtn.className = \`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-all \${selectedDropdownProviderId === 'ALL' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white hover:bg-surface-750'}\`;
      allBtn.innerText = 'Todos';
      allBtn.onclick = () => selectDropdownProviderTab('ALL');
      container.appendChild(allBtn);

      providerCatalogs.forEach(cat => {
        const btn = document.createElement('button');
        const isSelected = selectedDropdownProviderId === cat.providerId;
        btn.className = \`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-all flex items-center gap-1 \${isSelected ? 'bg-brand-600 text-white shadow-sm' : (cat.isActive ? 'bg-surface-750 text-brand-300' : 'text-slate-400 hover:text-white hover:bg-surface-750')}\`;
        btn.innerHTML = \`
          \${cat.isActive ? '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>' : ''}
          \${cat.providerName.split(' ')[0]}
        \`;
        btn.onclick = () => selectDropdownProviderTab(cat.providerId);
        container.appendChild(btn);
      });
    }

    function selectDropdownProviderTab(providerId) {
      selectedDropdownProviderId = providerId;
      renderDropdownTabs();
      renderDropdownModelList();
    }

    function filterDropdownCatalog(query) {
      dropdownSearchQuery = query.toLowerCase().trim();
      renderDropdownModelList();
    }

    function renderDropdownModelList() {
      const container = document.getElementById('modelsDropdownList');
      const countText = document.getElementById('dropdownModelCountText');
      if (!container) return;
      container.innerHTML = '';

      let items = [];

      if (selectedDropdownProviderId === 'ALL') {
        providerCatalogs.forEach(cat => {
          (cat.models || []).forEach(m => {
            items.push({ model: m, providerId: cat.providerId, providerName: cat.providerName });
          });
        });
      } else {
        const cat = providerCatalogs.find(c => c.providerId === selectedDropdownProviderId);
        if (cat) {
          (cat.models || []).forEach(m => {
            items.push({ model: m, providerId: cat.providerId, providerName: cat.providerName });
          });
        }
      }

      if (dropdownSearchQuery) {
        items = items.filter(i => i.model.toLowerCase().includes(dropdownSearchQuery) || i.providerName.toLowerCase().includes(dropdownSearchQuery));
      }

      if (countText) countText.innerText = \`\${items.length} modelos\`;

      if (items.length === 0) {
        container.innerHTML = '<div class="p-4 text-center text-slate-400 text-xs">No se encontraron modelos.</div>';
        return;
      }

      items.slice(0, 100).forEach(item => {
        const isSelected = item.model === currentModelId && item.providerId === currentProviderId;
        const btn = document.createElement('button');
        btn.className = \`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-all group \${isSelected ? 'bg-brand-600/20 text-brand-300 border border-brand-500/40' : 'text-slate-200 hover:bg-surface-750 hover:text-white'}\`;
        btn.onclick = () => selectCatalogModel(item.providerId, item.model);

        const isCoding = item.model.includes('coding') || item.model.includes('coder') || item.model.includes('sonnet') || item.model.includes('gpt-4');

        btn.innerHTML = \`
          <div class="flex items-center gap-2 truncate">
            <span class="w-1.5 h-1.5 rounded-full \${isSelected ? 'bg-brand-400' : 'bg-surface-600'}"></span>
            <div class="truncate">
              <div class="font-mono text-xs truncate \${isSelected ? 'font-bold text-white' : ''}">\${item.model}</div>
              <span class="text-[10px] text-slate-400 block truncate">\${item.providerName}</span>
            </div>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            \${isCoding ? '<span class="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">Code</span>' : ''}
            \${isSelected ? '<i data-lucide="check" class="w-3.5 h-3.5 text-brand-400"></i>' : ''}
          </div>
        \`;
        container.appendChild(btn);
      });
      lucide.createIcons();
    }

    async function selectCatalogModel(providerId, modelId) {
      currentProviderId = providerId;
      currentModelId = modelId;
      updateHeaderModelButton();
      toggleModelDropdown();

      // Persist active provider and model in background
      await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId, defaultModel: modelId })
      });
      await fetchModelCatalogs();
      await fetchProviders();
    }

    function toggleModelDropdown() {
      const menu = document.getElementById('modelDropdownMenu');
      menu.classList.toggle('hidden');
      if (!menu.classList.contains('hidden')) {
        const input = document.getElementById('modelSearchInput');
        if (input) {
          input.value = '';
          dropdownSearchQuery = '';
          renderDropdownModelList();
          input.focus();
        }
      }
    }

    function setThinkingLevel(level) {
      currentThinkingLevel = level;
    }

    // --- MULTI-PROVIDER HUB LOGIC ---
    async function fetchProviders() {
      try {
        const res = await fetch('/api/providers');
        const data = await res.json();
        allProvidersList = data.providers || [];
        renderProvidersGrid();
      } catch (err) {
        console.error('Error fetching providers:', err);
      }
    }

    function filterProviders(category) {
      activeProviderCategory = category;
      document.querySelectorAll('.provider-filter-btn').forEach(btn => {
        if (btn.getAttribute('data-pfilter') === category) {
          btn.className = 'provider-filter-btn px-3 py-1.5 rounded-lg font-medium bg-brand-600 text-white shadow-sm';
        } else {
          btn.className = 'provider-filter-btn px-3 py-1.5 rounded-lg font-medium text-slate-300 hover:text-white';
        }
      });
      renderProvidersGrid();
    }

    function renderProvidersGrid() {
      const container = document.getElementById('providersGridContainer');
      if (!container) return;
      container.innerHTML = '';

      const filtered = activeProviderCategory === 'ALL'
        ? allProvidersList
        : allProvidersList.filter(p => p.category === activeProviderCategory);

      if (filtered.length === 0) {
        container.innerHTML = '<div class="col-span-full text-slate-400 p-8 text-center">No hay proveedores en esta categoría.</div>';
        return;
      }

      filtered.forEach(p => {
        const isOmni = p.id === 'omniroute';
        const card = document.createElement('div');
        card.className = \`bg-surface-850 border \${p.isActive ? 'border-brand-500/80 shadow-lg shadow-brand-500/10' : 'border-surface-750'} rounded-2xl p-4 flex flex-col justify-between space-y-3 transition-all hover:border-brand-500/40\`;
        
        const badgeColor = p.isActive 
          ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30' 
          : (p.isConfigured ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-surface-750 text-slate-400 border border-surface-700');
        const badgeText = p.isActive ? 'Activo' : (p.isConfigured ? 'Guardado' : 'No Configurado');

        const cat = providerCatalogs.find(c => c.providerId === p.id);
        const cachedModels = cat ? cat.models : [];

        card.innerHTML = \`
          <div>
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-sm">
                  \${p.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 class="font-bold text-sm text-white flex items-center gap-1.5">
                    \${p.name}
                    \${isOmni ? '<span class="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">Primario</span>' : ''}
                  </h4>
                  <span class="text-[10px] text-slate-400 block">\${p.category || 'Inferencia'}</span>
                </div>
              </div>
              <span class="text-[10px] px-2 py-0.5 rounded-full font-medium \${badgeColor}">\${badgeText}</span>
            </div>

            <p class="text-[11px] text-slate-400 mt-2 line-clamp-2">\${p.description || ''}</p>

            <div class="space-y-2.5 pt-3 text-xs">
              <div>
                <label class="block text-slate-400 text-[10px] mb-0.5 font-medium">Base URL</label>
                <input id="pUrl_\${p.id}" type="text" value="\${p.baseUrl || p.defaultBaseUrl}" onchange="fetchProviderModels('\${p.id}')" class="w-full bg-surface-800 border border-surface-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-[11px] focus:outline-none focus:border-brand-500">
              </div>

              <div>
                <div class="flex items-center justify-between mb-0.5">
                  <label class="block text-slate-400 text-[10px] font-medium">API Key</label>
                  <span id="pKeyHint_\${p.id}" class="text-[9px] text-brand-300">Auto-detecta modelos</span>
                </div>
                <input id="pKey_\${p.id}" type="password" placeholder="\${isOmni ? 'sk-7fd5586a69f723fb-71d90e-838d8616' : 'sk-...'}" oninput="debouncedFetchModels('\${p.id}')" onchange="fetchProviderModels('\${p.id}')" class="w-full bg-surface-800 border border-surface-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-[11px] focus:outline-none focus:border-brand-500">
              </div>

              <div>
                <div class="flex items-center justify-between mb-0.5">
                  <label class="block text-slate-400 text-[10px] font-medium flex items-center gap-1">
                    Modelo por Defecto
                    <span id="pModelCountBadge_\${p.id}" class="text-[9px] text-brand-400 font-mono"></span>
                  </label>
                  <button onclick="fetchProviderModels('\${p.id}', true)" title="Cargar y refrescar lista de modelos" class="text-[10px] text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium">
                    <i data-lucide="refresh-cw" class="w-2.5 h-2.5"></i>
                    Cargar lista
                  </button>
                </div>

                <div class="relative">
                  <select id="pModelSelect_\${p.id}" class="w-full bg-surface-800 hover:bg-surface-750 border border-surface-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-[11px] focus:outline-none focus:border-brand-500 cursor-pointer">
                    <option value="\${p.defaultModel || 'gpt-4o'}" selected>\${p.defaultModel || 'gpt-4o'} (Predeterminado)</option>
                  </select>
                  <div id="pModelSpinner_\${p.id}" class="hidden absolute right-3 top-2 pointer-events-none">
                    <span class="w-2.5 h-2.5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin inline-block"></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="pt-2 border-t border-surface-750 flex flex-col gap-2">
            <span id="pResult_\${p.id}" class="text-[10px] font-mono text-slate-400 truncate"></span>
            <div class="flex items-center justify-between gap-1.5">
              <button onclick="testSpecificProvider('\${p.id}')" class="flex-1 bg-surface-750 hover:bg-surface-700 text-slate-200 text-xs font-medium py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1">
                <i data-lucide="activity" class="w-3 h-3 text-brand-400"></i>
                Probar
              </button>
              <button onclick="saveSpecificProvider('\${p.id}')" class="flex-1 \${p.isActive ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-brand-600 hover:bg-brand-500'} text-white text-xs font-medium py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 shadow-sm">
                <i data-lucide="check" class="w-3 h-3"></i>
                \${p.isActive ? 'Activo' : 'Activar'}
              </button>
            </div>
          </div>
        \`;
        container.appendChild(card);

        if (cachedModels && cachedModels.length > 0) {
          populateModelSelect(p.id, cachedModels, p.defaultModel);
        }
      });
      lucide.createIcons();
    }

    function debouncedFetchModels(providerId) {
      clearTimeout(debounceTimers[providerId]);
      debounceTimers[providerId] = setTimeout(() => {
        fetchProviderModels(providerId);
      }, 700);
    }

    async function fetchProviderModels(providerId, force = false) {
      const urlInput = document.getElementById(\`pUrl_\${providerId}\`);
      const keyInput = document.getElementById(\`pKey_\${providerId}\`);
      const spinner = document.getElementById(\`pModelSpinner_\${providerId}\`);
      const countBadge = document.getElementById(\`pModelCountBadge_\${providerId}\`);
      const resultBadge = document.getElementById(\`pResult_\${providerId}\`);

      const baseUrl = urlInput ? urlInput.value.trim() : '';
      let apiKey = keyInput ? keyInput.value.trim() : '';
      if (providerId === 'omniroute' && !apiKey) {
        apiKey = 'sk-7fd5586a69f723fb-71d90e-838d8616';
      }

      if (spinner) spinner.classList.remove('hidden');
      if (countBadge) countBadge.innerText = '(cargando...)';

      try {
        const res = await fetch('/api/providers/models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: providerId, baseUrl, apiKey })
        });
        const data = await res.json();

        if (data.success && Array.isArray(data.models) && data.models.length > 0) {
          providerModelsCache[providerId] = data.models;
          const targetProv = allProvidersList.find(p => p.id === providerId);
          populateModelSelect(providerId, data.models, targetProv?.defaultModel);
          if (countBadge) countBadge.innerText = \`(\${data.models.length} disponibles)\`;
          if (resultBadge) {
            resultBadge.innerText = \`✓ \${data.models.length} modelos cargados (\${data.latencyMs}ms)\`;
            resultBadge.className = 'text-[10px] font-mono text-emerald-400 font-semibold truncate';
          }
          await fetchModelCatalogs();
        } else {
          if (countBadge) countBadge.innerText = '';
        }
      } catch (e) {
        if (countBadge) countBadge.innerText = '';
      } finally {
        if (spinner) spinner.classList.add('hidden');
      }
    }

    function populateModelSelect(providerId, models, preferredDefault) {
      const select = document.getElementById(\`pModelSelect_\${providerId}\`);
      if (!select) return;

      const currentValue = select.value;
      select.innerHTML = '';

      const topModel = preferredDefault || 'auto/best-coding';
      const hasTop = models.includes(topModel);

      if (hasTop) {
        const opt = document.createElement('option');
        opt.value = topModel;
        opt.innerText = \`★ \${topModel} (Recomendado)\`;
        opt.selected = true;
        select.appendChild(opt);
      }

      models.forEach(m => {
        if (m === topModel && hasTop) return;
        const opt = document.createElement('option');
        opt.value = m;
        opt.innerText = m;
        if (!hasTop && (m === currentValue || m === preferredDefault)) {
          opt.selected = true;
        }
        select.appendChild(opt);
      });
    }

    async function testSpecificProvider(providerId) {
      const urlInput = document.getElementById(\`pUrl_\${providerId}\`);
      const keyInput = document.getElementById(\`pKey_\${providerId}\`);
      const resultBadge = document.getElementById(\`pResult_\${providerId}\`);

      const baseUrl = urlInput ? urlInput.value.trim() : '';
      let apiKey = keyInput ? keyInput.value.trim() : '';
      if (providerId === 'omniroute' && !apiKey) {
        apiKey = 'sk-7fd5586a69f723fb-71d90e-838d8616';
      }

      resultBadge.innerText = 'Probando conexión y cargando modelos...';
      resultBadge.className = 'text-[10px] font-mono text-brand-300 truncate';

      try {
        const res = await fetch('/api/providers/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: providerId, baseUrl, apiKey })
        });
        const data = await res.json();
        if (data.success) {
          resultBadge.innerText = \`✓ Conectado (\${data.latencyMs}ms, \${data.totalModels} modelos)\`;
          resultBadge.className = 'text-[10px] font-mono text-emerald-400 font-semibold truncate';

          if (Array.isArray(data.models) && data.models.length > 0) {
            providerModelsCache[providerId] = data.models;
            const targetProv = allProvidersList.find(p => p.id === providerId);
            populateModelSelect(providerId, data.models, targetProv?.defaultModel);
            const countBadge = document.getElementById(\`pModelCountBadge_\${providerId}\`);
            if (countBadge) countBadge.innerText = \`(\${data.models.length} disponibles)\`;
          }
          await fetchModelCatalogs();
        } else {
          resultBadge.innerText = \`✗ Error: \${data.error || data.status}\`;
          resultBadge.className = 'text-[10px] font-mono text-rose-400 truncate';
        }
      } catch (e) {
        resultBadge.innerText = '✗ Error de red';
        resultBadge.className = 'text-[10px] font-mono text-rose-400 truncate';
      }
    }

    async function saveSpecificProvider(providerId) {
      const urlInput = document.getElementById(\`pUrl_\${providerId}\`);
      const keyInput = document.getElementById(\`pKey_\${providerId}\`);
      const modelSelect = document.getElementById(\`pModelSelect_\${providerId}\`);

      const baseUrl = urlInput ? urlInput.value.trim() : '';
      let apiKey = keyInput ? keyInput.value.trim() : '';
      if (providerId === 'omniroute' && !apiKey) {
        apiKey = 'sk-7fd5586a69f723fb-71d90e-838d8616';
      }
      const defaultModel = modelSelect ? modelSelect.value : 'gpt-4o';

      try {
        const res = await fetch('/api/providers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: providerId, baseUrl, apiKey, defaultModel })
        });
        const data = await res.json();
        if (data.success) {
          alert(\`✓ Proveedor \${providerId} guardado con Base URL: \${baseUrl || 'por defecto'} y modelo \${defaultModel}.\`);
          await fetchModelCatalogs();
          await fetchProviders();
        }
      } catch (e) {
        alert('Error al guardar proveedor: ' + e.message);
      }
    }

    // --- SESSIONS ---
    async function fetchSessions() {
      try {
        const res = await fetch(\`/api/sessions?projectId=\${encodeURIComponent(currentProjectId)}\`);
        const data = await res.json();
        const container = document.getElementById('sessionsContainer');
        container.innerHTML = '';
        const sessions = data.sessions || [];
        document.getElementById('sessionCountBadge').innerText = sessions.length;

        if (sessions.length === 0) {
          container.innerHTML = \`
            <div class="p-4 text-center text-slate-500 text-xs italic space-y-2">
              <p>No hay chats en este proyecto</p>
              <button onclick="createNewSession()" class="text-cyan-400 hover:text-cyan-300 font-medium text-[11px] block mx-auto">+ Iniciar nueva conversación</button>
            </div>
          \`;
          return;
        }

        sessions.forEach(session => {
          const isActive = session.id === currentSessionId;
          const div = document.createElement('div');
          div.className = \`group flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-all \${isActive ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30 font-medium' : 'text-slate-300 hover:bg-surface-750 hover:text-white'}\`;
          div.onclick = () => loadSession(session.id);
          div.ondblclick = (e) => {
            e.stopPropagation();
            renameSession(session.id, session.title || session.id);
          };

          const safeTitle = (session.title || session.id).replace(/"/g, '&quot;');

          div.innerHTML = \`
            <div class="flex items-center gap-2 truncate flex-1 mr-1" title="\${safeTitle}">
              <i data-lucide="message-square" class="w-3.5 h-3.5 shrink-0 \${isActive ? 'text-brand-400' : 'text-slate-400'}"></i>
              <span class="truncate">\${session.title || session.id}</span>
            </div>
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onclick="event.stopPropagation(); renameSession('\${session.id}', '\${safeTitle}')" title="Renombrar chat" class="text-slate-400 hover:text-brand-300 p-0.5 rounded transition-colors">
                <i data-lucide="edit-3" class="w-3 h-3"></i>
              </button>
              <button onclick="event.stopPropagation(); deleteSession('\${session.id}')" title="Eliminar chat" class="text-slate-400 hover:text-rose-400 p-0.5 rounded transition-colors">
                <i data-lucide="trash" class="w-3 h-3"></i>
              </button>
            </div>
          \`;
          container.appendChild(div);
        });
        lucide.createIcons();
      } catch (err) {
        console.error('Error fetching sessions:', err);
      }
    }

    async function renameSession(sessionId, currentTitle) {
      const newTitle = prompt('Nombre personalizado para esta conversación:', currentTitle || '');
      if (!newTitle || newTitle.trim() === '' || newTitle === currentTitle) return;
      try {
        await fetch(\`/api/sessions/\${sessionId}\`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle.trim() })
        });
        await fetchSessions();
      } catch (e) {
        alert('Error al renombrar sesión: ' + e.message);
      }
    }

    async function createNewSession() {
      const newId = 'session-' + Math.random().toString(36).substring(2, 9);
      currentSessionId = newId;
      if (window.innerWidth < 768) toggleSidebar(false);
      await loadSession(newId);
      await fetchSessions();
    }

    async function loadSession(sessionId) {
      currentSessionId = sessionId;
      if (window.innerWidth < 768) toggleSidebar(false);
      const chatMessages = document.getElementById('chatMessages');
      chatMessages.innerHTML = '';
      
      try {
        const res = await fetch(\`/api/sessions/\${sessionId}/messages?projectId=\${encodeURIComponent(currentProjectId)}\`);
        const data = await res.json();

        if (data.messages && data.messages.length > 0) {
          document.getElementById('welcomeScreen')?.remove();
          data.messages.forEach(msg => renderMessage(msg));
        } else {
          chatMessages.innerHTML = \`
            <div id="welcomeScreen" class="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-8 sm:py-12 space-y-4 sm:space-y-6">
              <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-purple-400 flex items-center justify-center shadow-xl shadow-brand-500/25">
                <i data-lucide="sparkles" class="w-6 h-6 sm:w-7 sm:h-7 text-white"></i>
              </div>
              <div>
                <h2 class="text-lg sm:text-xl font-bold text-white tracking-tight">¿En qué trabajamos hoy?</h2>
                <p class="text-[11px] sm:text-xs text-slate-400 mt-1 max-w-sm">
                  Andy Agent RLM con kernel interactivo Python, motor estructural Graft, MEMORY.md, AGENTS.md y soporte multimodelo.
                </p>
              </div>
            </div>
          \`;
        }
        await fetchSessions();
        lucide.createIcons();
      } catch (err) {
        console.error('Error loading session:', err);
      }
    }

    async function deleteSession(sessionId) {
      if (!confirm('¿Eliminar esta conversación?')) return;
      await fetch(\`/api/sessions/\${sessionId}\`, { method: 'DELETE' });
      if (currentSessionId === sessionId) {
        await createNewSession();
      } else {
        await fetchSessions();
      }
    }

    // --- CHAT SUBMISSION & STREAMING ---
    async function submitPrompt() {
      const input = document.getElementById('promptInput');
      const text = input.value.trim();
      if (!text) return;

      document.getElementById('welcomeScreen')?.remove();

      renderMessage({ role: 'user', content: text });
      input.value = '';
      input.style.height = 'auto';

      const liveIndicator = document.getElementById('liveExecutionIndicator');
      liveIndicator.classList.remove('hidden');
      document.getElementById('liveExecutionText').innerText = 'Pensando y preparando respuesta...';

      activeAbortController = new AbortController();
      const chatMessages = document.getElementById('chatMessages');

      let currentAgentDiv = null;
      let currentAgentContentDiv = null;
      let currentAgentFullText = '';

      try {
        const response = await fetch('/api/pantheon/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            squadId: pantheonState.activeSquadId || 'fullstack-squad',
            prompt: text,
            projectId: currentProjectId,
            sessionId: currentSessionId
          }),
          signal: activeAbortController.signal
        });

        if (!response.ok) {
          const errText = await response.text();
          const errDiv = document.createElement('div');
          errDiv.className = 'p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs my-2';
          errDiv.innerText = 'Error en la solicitud HTTP ' + response.status + ': ' + errText;
          chatMessages.appendChild(errDiv);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const dataStr = trimmed.slice(5).trim();
            if (dataStr === '[DONE]') continue;

            try {
              const event = JSON.parse(dataStr);
              if (event.type === 'agent_start') {
                currentAgentFullText = '';
                document.getElementById('liveExecutionText').innerText = 'Agente @' + event.agentName + ' (' + event.agentRole + ') respondiendo...';
                currentAgentDiv = document.createElement('div');
                currentAgentDiv.className = 'p-4 rounded-2xl bg-surface-850 border border-surface-700 text-xs text-white space-y-2 shadow-lg my-2 transition-all';
                currentAgentDiv.style.borderLeft = \`4px solid \${event.agentColor || '#8B5CF6'}\`;
                currentAgentDiv.innerHTML = \`
                  <div class="flex items-center justify-between border-b border-surface-750/50 pb-2">
                    <div class="flex items-center gap-2.5">
                      <span class="text-xl">\${event.agentAvatar || '🤖'}</span>
                      <div>
                        <div class="font-bold text-sm" style="color: \${event.agentColor || '#FFFFFF'}">\${event.agentName}</div>
                        <div class="text-[10px] text-slate-400 font-mono">\${event.agentRole}</div>
                      </div>
                    </div>
                    <span class="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 font-mono border border-purple-500/20">Pantheon Agent</span>
                  </div>
                  <div class="agent-markdown-body prose-custom mt-2 text-slate-200 font-sans text-xs whitespace-normal break-words leading-relaxed pl-7 select-text space-y-2"></div>
                \`;
                chatMessages.appendChild(currentAgentDiv);
                currentAgentContentDiv = currentAgentDiv.querySelector('.agent-markdown-body');
                chatMessages.scrollTop = chatMessages.scrollHeight;
                lucide.createIcons();
              } else if (event.type === 'delta' && currentAgentContentDiv) {
                currentAgentFullText += event.delta || '';
                const cleaned = cleanPantheonOutput(currentAgentFullText);
                currentAgentContentDiv.innerHTML = formatMarkdown(cleaned);
                chatMessages.scrollTop = chatMessages.scrollHeight;
              } else if (event.type === 'agent_finish' && currentAgentContentDiv) {
                const cleaned = cleanPantheonOutput(currentAgentFullText);
                currentAgentContentDiv.innerHTML = formatMarkdown(cleaned);
                currentAgentContentDiv.querySelectorAll('pre code').forEach((block) => {
                  hljs.highlightElement(block);
                });
                lucide.createIcons();
                chatMessages.scrollTop = chatMessages.scrollHeight;
              } else if (event.type === 'tool_start') {
                const tDiv = document.createElement('div');
                tDiv.className = 'p-2.5 rounded-xl bg-surface-900 border border-surface-750 text-slate-300 text-xs font-mono my-1 pl-6 flex items-center justify-between shadow-sm';
                const toolName = event.tool || 'herramienta';
                const inputInfo = event.input?.path || event.input?.command || JSON.stringify(event.input || {});
                tDiv.innerHTML = \`
                  <div class="flex items-center gap-2 truncate">
                    <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                    <strong class="text-amber-300">\${toolName}:</strong>
                    <span class="truncate text-slate-300 text-[11px]">\${inputInfo}</span>
                  </div>
                  <span class="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 shrink-0">Ejecutando</span>
                \`;
                chatMessages.appendChild(tDiv);
                chatMessages.scrollTop = chatMessages.scrollHeight;
                lucide.createIcons();
              } else if (event.type === 'tool_result') {
                const rDiv = document.createElement('div');
                rDiv.className = 'p-2.5 rounded-xl bg-surface-900/90 border border-emerald-500/30 text-emerald-300 text-xs font-mono my-1 pl-6 space-y-1 shadow-sm';
                const toolName = event.tool || 'herramienta';
                rDiv.innerHTML = \`
                  <div class="flex items-center justify-between">
                    <span class="flex items-center gap-1.5 font-bold text-[11px] text-emerald-400">
                      <i data-lucide="check-circle" class="w-3.5 h-3.5"></i>
                      \${toolName} completado
                    </span>
                    <span class="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-sans">En disco</span>
                  </div>
                  <pre class="bg-surface-950 p-2 rounded text-[11px] text-slate-300 overflow-x-auto max-h-36 whitespace-pre-wrap select-text">\${typeof event.output === 'string' ? event.output : JSON.stringify(event.output, null, 2)}</pre>
                \`;
                chatMessages.appendChild(rDiv);
                chatMessages.scrollTop = chatMessages.scrollHeight;
                lucide.createIcons();
              } else if (event.type === 'delegation') {
                const delDiv = document.createElement('div');
                delDiv.className = 'p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-200 text-xs flex items-center gap-2 my-1.5 pl-6';
                delDiv.innerHTML = \`
                  <i data-lucide="arrow-right-circle" class="w-4 h-4 text-purple-400 shrink-0"></i>
                  <span><strong>Delegación:</strong> Tarea transferida a <strong>@\${event.delegation?.toAgentId || 'agente'}</strong></span>
                \`;
                chatMessages.appendChild(delDiv);
                chatMessages.scrollTop = chatMessages.scrollHeight;
                lucide.createIcons();
              } else if (event.type === 'graft_event') {
                const gDiv = document.createElement('div');
                gDiv.className = 'p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[11px] flex items-center gap-2 my-1 pl-6';
                gDiv.innerHTML = \`
                  <i data-lucide="git-fork" class="w-3.5 h-3.5 text-cyan-400 shrink-0"></i>
                  <span>Contexto Graft AST inyectado (\${event.graftData?.diagnosticsCount || 0} diagnósticos estáticos)</span>
                \`;
                chatMessages.appendChild(gDiv);
                chatMessages.scrollTop = chatMessages.scrollHeight;
                lucide.createIcons();
              } else if (event.type === 'error') {
                const errDiv = document.createElement('div');
                errDiv.className = 'p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs my-1 pl-6';
                errDiv.innerText = 'Aviso del agente: ' + (event.error || 'Error en la respuesta');
                chatMessages.appendChild(errDiv);
                chatMessages.scrollTop = chatMessages.scrollHeight;
              }
            } catch (e) {}
          }
          chatMessages.scrollTop = chatMessages.scrollHeight;
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          const errDiv = document.createElement('div');
          errDiv.className = 'p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs my-2';
          errDiv.innerText = 'Error en la sesión de Pantheon: ' + (err.message || String(err));
          chatMessages.appendChild(errDiv);
        }
      } finally {
        liveIndicator.classList.add('hidden');
        activeAbortController = null;
        await fetchSessions();
        lucide.createIcons();
      }
    }

    function appendErrorCard(container, errorText) {
      const body = container.querySelector('.assistant-content');
      if (body) {
        body.innerHTML = \`
          <div class="error-card p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono text-xs flex items-start gap-2.5 my-1">
            <i data-lucide="alert-circle" class="w-4 h-4 text-rose-400 shrink-0 mt-0.5"></i>
            <div class="flex-1 overflow-hidden">
              <div class="font-bold text-rose-200 text-xs mb-1">Aviso del Asistente</div>
              <div class="text-[11px] leading-relaxed whitespace-pre-wrap select-text">\${errorText}</div>
            </div>
          </div>
        \`;
      }
      lucide.createIcons();
    }

    function extractMessageText(content) {
      if (!content) return '';
      if (typeof content === 'string') return content;
      if (Array.isArray(content)) {
        return content
          .map(c => {
            if (typeof c === 'string') return c;
            if (c && c.type === 'text') return c.text || '';
            if (c && c.text) return c.text;
            return '';
          })
          .filter(Boolean)
          .join('\\n');
      }
      if (typeof content === 'object') {
        if (content.text) return content.text;
        if (content.content) return extractMessageText(content.content);
      }
      return String(content);
    }

    function formatMarkdown(text) {
      if (!text) return '';
      const rawHtml = marked.parse(text, { breaks: true, gfm: true });
      const temp = document.createElement('div');
      temp.innerHTML = rawHtml;
      
      temp.querySelectorAll('pre').forEach(pre => {
        const code = pre.querySelector('code');
        const langClass = code ? Array.from(code.classList).find(c => c.startsWith('language-')) : null;
        const lang = langClass ? langClass.replace('language-', '') : 'código';
        
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper my-2';
        
        const header = document.createElement('div');
        header.className = 'code-block-header';
        header.innerHTML = \`
          <span class="font-mono text-[10px] text-slate-400 font-semibold uppercase tracking-wider">\${lang}</span>
          <button onclick="copyCodeFromBlock(this)" class="code-copy-btn flex items-center gap-1">
            <i data-lucide="copy" class="w-3 h-3"></i>
            <span>Copiar</span>
          </button>
        \`;
        
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(header);
        wrapper.appendChild(pre);
      });
      
      return temp.innerHTML;
    }

    function copyCodeFromBlock(btn) {
      const wrapper = btn.closest('.code-block-wrapper');
      const code = wrapper ? wrapper.querySelector('pre code') : null;
      if (!code) return;
      navigator.clipboard.writeText(code.innerText || code.textContent).then(() => {
        const span = btn.querySelector('span');
        if (span) span.innerText = 'Copiado!';
        setTimeout(() => { if (span) span.innerText = 'Copiar'; }, 2000);
      });
    }

    function copyMessageText(btn, text) {
      navigator.clipboard.writeText(text).then(() => {
        btn.title = '¡Copiado!';
        const icon = btn.querySelector('i');
        if (icon) icon.setAttribute('data-lucide', 'check');
        lucide.createIcons();
        setTimeout(() => {
          btn.title = 'Copiar mensaje';
          if (icon) icon.setAttribute('data-lucide', 'copy');
          lucide.createIcons();
        }, 2000);
      });
    }

    function createAssistantMessageCard() {
      const card = document.createElement('div');
      card.className = 'flex gap-3.5 p-4 rounded-xl bg-surface-850 border border-surface-750/70 text-xs shadow-sm my-2 group';
      card.innerHTML = \`
        <div class="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shrink-0 font-bold shadow-md shadow-brand-500/20">
          Ψ
        </div>
        <div class="flex-1 space-y-2.5 overflow-hidden">
          <div class="flex items-center justify-between border-b border-surface-750/50 pb-1 mb-1">
            <span class="text-[11px] font-semibold text-brand-300">Andy Agent</span>
          </div>
          <div class="reasoning-drawer hidden bg-surface-800/70 border border-brand-500/20 rounded-lg p-3 text-slate-300 font-mono text-[11px] leading-relaxed">
            <div class="font-semibold text-brand-300 flex items-center gap-1.5 mb-1">
              <i data-lucide="brain" class="w-3.5 h-3.5"></i>
              Pensamiento / Cadena de Razonamiento
            </div>
            <div class="reasoning-body whitespace-pre-wrap"></div>
          </div>

          <div class="tool-calls-container space-y-2"></div>

          <div class="assistant-content prose-custom text-slate-100 leading-relaxed select-text">
            <span class="inline-block w-2 h-4 bg-brand-400 animate-pulse"></span>
          </div>
        </div>
      \`;
      return card;
    }

    function updateAssistantContent(container, text) {
      const body = container.querySelector('.assistant-content');
      if (!body) return;
      body.innerHTML = formatMarkdown(text);
      body.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
      });
      lucide.createIcons();
    }

    function updateReasoningBlock(container, reasoning) {
      const drawer = container.querySelector('.reasoning-drawer');
      const body = container.querySelector('.reasoning-body');
      drawer.classList.remove('hidden');
      body.innerText = reasoning;
    }

    function appendToolCallCard(container, toolName, input) {
      const toolsContainer = container.querySelector('.tool-calls-container');
      const toolCard = document.createElement('div');
      toolCard.className = \`tool-card-\${toolName} bg-surface-800 border border-surface-700 rounded-lg p-3 font-mono text-[11px] space-y-1.5\`;
      toolCard.innerHTML = \`
        <div class="flex items-center justify-between text-slate-300 font-semibold">
          <span class="flex items-center gap-1.5">
            <i data-lucide="terminal" class="w-3.5 h-3.5 text-emerald-400"></i>
            \${toolName}
          </span>
          <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 animate-pulse">Ejecutando...</span>
        </div>
        <pre class="bg-surface-900 p-2 rounded text-slate-300 text-[11px] overflow-x-auto">\${JSON.stringify(input, null, 2)}</pre>
        <div class="tool-result-box text-slate-400"></div>
      \`;
      toolsContainer.appendChild(toolCard);
      lucide.createIcons();
    }

    function updateToolCallResult(container, toolName, output) {
      const toolCard = container.querySelector(\`.tool-card-\${toolName}\`);
      if (toolCard) {
        const badge = toolCard.querySelector('span:last-child');
        if (badge) {
          badge.className = 'text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300';
          badge.innerText = 'Completado';
        }
        const resultBox = toolCard.querySelector('.tool-result-box');
        resultBox.innerHTML = \`<pre class="bg-surface-900/80 p-2 rounded text-emerald-300 text-[11px] mt-1 overflow-x-auto max-h-48">\${typeof output === 'string' ? output : JSON.stringify(output, null, 2)}</pre>\`;
      }
    }

    function renderMessage(msg) {
      const container = document.getElementById('chatMessages');
      const div = document.createElement('div');
      
      if (msg.role === 'user') {
        const rawText = extractMessageText(msg.content);
        div.className = 'flex justify-end items-start gap-2.5 my-2 group';
        div.innerHTML = \`
          <div class="max-w-2xl bg-gradient-to-r from-brand-700 via-brand-600 to-indigo-600 text-white px-4 py-3 rounded-2xl rounded-tr-xs text-xs leading-relaxed shadow-md select-text break-words whitespace-pre-wrap font-normal">
            \${rawText}
          </div>
          <div class="w-7 h-7 rounded-lg bg-surface-750 border border-surface-700 flex items-center justify-center text-slate-300 shrink-0 font-medium text-xs mt-0.5 shadow-sm">
            <i data-lucide="user" class="w-3.5 h-3.5 text-brand-300"></i>
          </div>
        \`;
      } else {
        const rawText = extractMessageText(msg.content);
        const hasError = msg.stopReason === 'error' || Boolean(msg.errorMessage);
        const errorText = msg.errorMessage || (msg.stopReason === 'error' ? 'El proveedor agotó el tiempo de espera o rechazó la solicitud.' : '');

        let agentName = msg.agentName || 'Andy Agent';
        let agentAvatar = msg.agentAvatar || '🤖';
        let agentColor = msg.agentColor || '#8B5CF6';
        let agentRole = msg.agentRole || 'Pantheon Specialist';
        let displayContent = rawText;

        const headerMatch = rawText.match(/^\\[([^\\]@\\(\\)]+)\\s*(?:\\(@([^\\)]+)\\))?\\]:\\s*\\n?([\\s\\S]*)$/);
        if (headerMatch) {
          agentName = headerMatch[1].trim();
          const targetAg = (pantheonState.agents || []).find(a => a.name.toLowerCase() === agentName.toLowerCase() || a.id.toLowerCase() === (headerMatch[2] || '').toLowerCase());
          if (targetAg) {
            agentAvatar = targetAg.avatar;
            agentColor = targetAg.color;
            agentRole = targetAg.role;
          }
          displayContent = headerMatch[3];
        } else if (msg.agentId) {
          const targetAg = (pantheonState.agents || []).find(a => a.id === msg.agentId || a.name === msg.agentName);
          if (targetAg) {
            agentAvatar = targetAg.avatar;
            agentColor = targetAg.color;
            agentRole = targetAg.role;
          }
        }

        const isPantheon = Boolean(msg.agentName || headerMatch || msg.agentId);

        div.className = 'flex gap-3.5 p-4 rounded-2xl bg-surface-850 border border-surface-700 text-xs shadow-lg my-2 group transition-all';
        if (isPantheon) {
          div.style.borderLeft = \`4px solid \${agentColor}\`;
        }

        div.innerHTML = \`
          <div class="w-9 h-9 rounded-2xl flex items-center justify-center text-xl bg-surface-800 border border-surface-700 shrink-0 shadow-sm">
            \${agentAvatar}
          </div>
          <div class="flex-1 space-y-2 overflow-hidden">
            <div class="flex items-center justify-between border-b border-surface-750/50 pb-2">
              <div class="flex items-center gap-2">
                <span class="font-bold text-xs" style="color: \${agentColor}">\${agentName}</span>
                <span class="text-[10px] text-slate-400 font-mono">\${agentRole}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 font-mono border border-purple-500/20">Pantheon Agent</span>
                <button onclick="copyMessageText(this, decodeURIComponent('\${encodeURIComponent(displayContent || errorText || '')}'))" title="Copiar mensaje" class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white p-1 rounded transition-opacity">
                  <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>
            \${hasError ? \`
              <div class="error-card p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono text-xs flex items-start gap-2.5 my-1">
                <i data-lucide="alert-circle" class="w-4 h-4 text-rose-400 shrink-0 mt-0.5"></i>
                <div class="flex-1 overflow-hidden">
                  <div class="font-bold text-rose-200 text-xs mb-1">Aviso del Asistente</div>
                  <div class="text-[11px] leading-relaxed whitespace-pre-wrap select-text">\${errorText}</div>
                </div>
              </div>
            \` : ''}
            <div class="assistant-content prose-custom text-slate-100 leading-relaxed select-text pl-1 space-y-2">
              \${displayContent ? formatMarkdown(cleanPantheonOutput(displayContent)) : (!hasError ? '<span class="text-slate-500 italic">Sin contenido</span>' : '')}
            </div>
          </div>
        \`;
        div.querySelectorAll('pre code').forEach((block) => {
          hljs.highlightElement(block);
        });
      }
      container.appendChild(div);
      container.scrollTop = container.scrollHeight;
      lucide.createIcons();
    }

    function sendQuickPrompt(prompt) {
      document.getElementById('promptInput').value = prompt;
      submitPrompt();
    }

    function insertPromptPrefix(prefix) {
      const input = document.getElementById('promptInput');
      input.value = prefix;
      input.focus();
    }

    function autoExpandTextarea(textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = (textarea.scrollHeight) + 'px';
    }

    function handleInputKeyDown(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitPrompt();
      }
    }

    function abortCurrentExecution() {
      if (activeAbortController) {
        activeAbortController.abort();
      }
    }

    // --- MEMORY & AGENTS.MD ---
    function switchDocType(type) {
      activeDocType = type;
      const mBtn = document.getElementById('docTypeMemoryBtn');
      const aBtn = document.getElementById('docTypeAgentsBtn');
      if (type === 'memory') {
        mBtn.className = 'px-3 py-1 rounded font-medium bg-purple-600 text-white';
        aBtn.className = 'px-3 py-1 rounded font-medium text-slate-400 hover:text-white';
      } else {
        aBtn.className = 'px-3 py-1 rounded font-medium bg-purple-600 text-white';
        mBtn.className = 'px-3 py-1 rounded font-medium text-slate-400 hover:text-white';
      }
      fetchActiveDoc();
    }

    function switchMemoryScope(scope) {
      activeDocScope = scope;
      const pBtn = document.getElementById('memoryScopeProjectBtn');
      const gBtn = document.getElementById('memoryScopeGlobalBtn');
      if (scope === 'project') {
        pBtn.className = 'px-3 py-1 rounded font-medium bg-brand-600 text-white';
        gBtn.className = 'px-3 py-1 rounded font-medium text-slate-400 hover:text-white';
      } else {
        gBtn.className = 'px-3 py-1 rounded font-medium bg-brand-600 text-white';
        pBtn.className = 'px-3 py-1 rounded font-medium text-slate-400 hover:text-white';
      }
      fetchActiveDoc();
    }

    async function fetchActiveDoc() {
      const endpoint = activeDocType === 'memory' ? '/api/memory' : '/api/instructions';
      const pathLabel = document.getElementById('memoryFilePathLabel');
      const editor = document.getElementById('memoryEditorText');
      pathLabel.innerText = 'Cargando documento...';
      try {
        const res = await fetch(\`\${endpoint}?scope=\${activeDocScope}\`);
        const data = await res.json();
        pathLabel.innerText = data.path;
        editor.value = data.content;
      } catch (e) {
        pathLabel.innerText = 'Error al cargar: ' + e.message;
      }
    }

    async function saveActiveDoc() {
      const endpoint = activeDocType === 'memory' ? '/api/memory' : '/api/instructions';
      const editor = document.getElementById('memoryEditorText');
      const status = document.getElementById('memorySaveStatus');
      status.innerText = 'Guardando...';
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scope: activeDocScope,
            content: editor.value
          })
        });
        const data = await res.json();
        if (data.success) {
          status.innerText = '✓ Guardado exitosamente';
          setTimeout(() => { status.innerText = ''; }, 3000);
        }
      } catch (e) {
        status.innerText = 'Error al guardar: ' + e.message;
      }
    }

    function downloadMemoryBackup() {
      const content = document.getElementById('memoryEditorText').value;
      const filename = (activeDocType.toUpperCase()) + '_' + activeDocScope + '_backup_' + (new Date().toISOString().slice(0, 10)) + '.md';
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    function restoreMemoryBackup(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async function(e) {
        const text = e.target.result;
        if (confirm('¿Restaurar este archivo de respaldo (' + file.name + ') en el editor actual?')) {
          document.getElementById('memoryEditorText').value = text;
          await saveActiveDoc();
          alert('Respaldo restaurado y guardado exitosamente.');
        }
      };
      reader.readAsText(file);
      event.target.value = '';
    }

    // --- SKILLS & PROMPTS STUDIO ---
    async function fetchSkillsAndPrompts() {
      const skillsContainer = document.getElementById('skillsListContainer');
      const promptsContainer = document.getElementById('promptsListContainer');
      
      try {
        const [skillsRes, promptsRes] = await Promise.all([fetch('/api/skills'), fetch('/api/prompts')]);
        const skillsData = await skillsRes.json();
        const promptsData = await promptsRes.json();

        skillsContainer.innerHTML = '';
        if (skillsData.skills && skillsData.skills.length > 0) {
          skillsData.skills.forEach(s => {
            const card = document.createElement('div');
            card.className = 'bg-surface-800 p-3 rounded-lg border border-surface-700 space-y-1';
            card.innerHTML = \`
              <div class="flex items-center justify-between font-bold text-white font-mono">
                <span>\${s.name}</span>
                <span class="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">\${s.scope}</span>
              </div>
              <p class="text-[11px] text-slate-400 line-clamp-2">\${s.content.slice(0, 100)}...</p>
            \`;
            skillsContainer.appendChild(card);
          });
        } else {
          skillsContainer.innerHTML = '<div class="text-slate-400 p-4 text-center">No hay skills creadas.</div>';
        }

        promptsContainer.innerHTML = '';
        if (promptsData.prompts && promptsData.prompts.length > 0) {
          promptsData.prompts.forEach(p => {
            const card = document.createElement('div');
            card.className = 'bg-surface-800 p-3 rounded-lg border border-surface-700 space-y-1';
            card.innerHTML = \`
              <div class="flex items-center justify-between font-bold text-white font-mono">
                <span>\${p.name}</span>
                <span class="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">\${p.scope}</span>
              </div>
              <p class="text-[11px] text-slate-400 line-clamp-2">\${p.content.slice(0, 100)}...</p>
            \`;
            promptsContainer.appendChild(card);
          });
        } else {
          promptsContainer.innerHTML = '<div class="text-slate-400 p-4 text-center">No hay plantillas de prompts.</div>';
        }
      } catch (e) {
        console.error('Error fetching skills/prompts:', e);
      }
    }

    async function openCreateSkillModal() {
      const name = prompt('Nombre de la habilidad (ej: refactor-csharp):');
      if (!name) return;
      const desc = prompt('Descripción breve:');
      const promptText = prompt('Instrucciones para la habilidad:');
      await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: desc, prompt: promptText, scope: 'project' })
      });
      fetchSkillsAndPrompts();
    }

    // --- BRANCH TREE (TIME TRAVEL) ---
    async function refreshBranchTree() {
      const container = document.getElementById('treeContainer');
      container.innerHTML = 'Cargando árbol de la conversación...';
      try {
        const res = await fetch(\`/api/sessions/\${currentSessionId}/tree\`);
        const data = await res.json();
        container.innerHTML = '';
        
        if (!data.nodes || data.nodes.length === 0) {
          container.innerHTML = '<div class="text-slate-400">Esta sesión aún no tiene mensajes.</div>';
          return;
        }

        data.nodes.forEach(node => {
          const div = document.createElement('div');
          const isUser = node.role === 'user';
          div.className = \`flex items-center gap-3 p-3 rounded-lg border \${isUser ? 'bg-brand-600/10 border-brand-500/30' : 'bg-surface-800 border-surface-700'}\`;
          div.innerHTML = \`
            <span class="w-6 h-6 rounded-full \${isUser ? 'bg-brand-600 text-white' : 'bg-surface-700 text-slate-300'} flex items-center justify-center text-[10px] font-bold shrink-0">\${node.turnIndex + 1}</span>
            <div class="flex-1 truncate">
              <span class="font-bold text-[11px] \${isUser ? 'text-brand-300' : 'text-slate-300'} block uppercase tracking-wider">\${node.role}</span>
              <span class="text-slate-200 text-xs truncate block font-mono">\${node.summary}</span>
            </div>
            <span class="text-[10px] text-slate-400">Checkpoint</span>
          \`;
          container.appendChild(div);
        });
      } catch (e) {
        container.innerHTML = 'Error al cargar el árbol de ramas';
      }
    }

    // --- LOGS STREAM ---
    async function initLogsStream() {
      try {
        const res = await fetch('/api/logs');
        const data = await res.json();
        allLogs = data.logs || [];
        renderLogs();

        const sse = new EventSource('/api/logs/stream');
        sse.onmessage = (event) => {
          try {
            const entry = JSON.parse(event.data);
            allLogs.push(entry);
            if (allLogs.length > 1000) allLogs.shift();
            appendLogEntryToDom(entry);
          } catch (e) {}
        };
      } catch (e) {
        console.error('Error initializing logs stream:', e);
      }
    }

    function filterLogs(filter) {
      activeLogFilter = filter;
      document.querySelectorAll('.log-filter-btn').forEach(btn => {
        if (btn.getAttribute('data-filter') === filter) {
          btn.className = 'px-2.5 py-1 rounded bg-brand-600 text-white font-medium log-filter-btn';
        } else {
          btn.className = 'px-2.5 py-1 rounded bg-surface-800 hover:bg-surface-700 text-slate-300 font-medium log-filter-btn';
        }
      });
      renderLogs();
    }

    function renderLogs() {
      const consoleEl = document.getElementById('logsConsole');
      consoleEl.innerHTML = '';
      const filtered = activeLogFilter === 'ALL' ? allLogs : allLogs.filter(l => l.level === activeLogFilter);
      if (filtered.length === 0) {
        consoleEl.innerHTML = '<div class="text-slate-400">No hay registros con este filtro.</div>';
        return;
      }
      filtered.forEach(entry => appendLogEntryToDom(entry));
      consoleEl.scrollTop = consoleEl.scrollHeight;
    }

    function appendLogEntryToDom(entry) {
      if (activeLogFilter !== 'ALL' && entry.level !== activeLogFilter) return;
      const consoleEl = document.getElementById('logsConsole');
      const div = document.createElement('div');
      
      const levelColors = {
        INFO: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        WARN: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        ERROR: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
        TOOL: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
        RLM: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
        HTTP: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
      };
      const badgeClass = levelColors[entry.level] || 'text-slate-400';

      div.className = 'flex items-start gap-2 text-[11px] leading-relaxed hover:bg-surface-900 p-1 rounded';
      div.innerHTML = \`
        <span class="text-slate-400 text-[10px] shrink-0">\${new Date(entry.timestamp).toLocaleTimeString()}</span>
        <span class="px-1.5 py-0.2 rounded border text-[10px] font-semibold shrink-0 \${badgeClass}">\${entry.level}</span>
        <span class="text-brand-300 font-medium shrink-0">[\${entry.category}]</span>
        <span class="text-slate-200 flex-1">\${entry.message}</span>
      \`;
      consoleEl.appendChild(div);
      consoleEl.scrollTop = consoleEl.scrollHeight;
    }

    function clearLogsConsole() {
      allLogs = [];
      document.getElementById('logsConsole').innerHTML = '<div class="text-slate-400">Consola limpiada.</div>';
    }

    // =======================================================================
    // --- GRAFT STUDIO 2.0 (GRAPH ENGINEERING ENGINE) ---
    // =======================================================================
    const LANG_COLORS = {
      typescript: '#3b82f6',
      tsx: '#60a5fa',
      javascript: '#eab308',
      jsx: '#facc15',
      python: '#10b981',
      csharp: '#a855f7',
      go: '#06b6d4',
      rust: '#f97316',
      java: '#ef4444',
      c: '#64748b',
      cpp: '#475569',
      json: '#6366f1',
      markdown: '#8b5cf6',
      default: '#94a3b8'
    };

    let graftState = {
      activeSubTab: 'visual',
      graphData: null,
      nodes: [],
      edges: [],
      selectedNode: null,
      hoveredNode: null,
      blastRadiusSet: new Set(),
      searchQuery: '',
      selectedCluster: 'ALL',
      camera: { x: 0, y: 0, zoom: 1 },
      isDragging: false,
      isPanning: false,
      draggedNode: null,
      lastMousePos: { x: 0, y: 0 },
      animFrameId: null
    };

    function switchGraftSubTab(tab) {
      graftState.activeSubTab = tab;
      const subTabs = ['visual', 'audit', 'tools'];
      subTabs.forEach(t => {
        const panel = document.getElementById('graftSubTab' + t.charAt(0).toUpperCase() + t.slice(1));
        const btn = document.getElementById('graftSubTab' + t.charAt(0).toUpperCase() + t.slice(1) + 'Btn');
        if (t === tab) {
          if (panel) panel.classList.remove('hidden');
          if (btn) btn.className = 'px-3 py-1.5 rounded-lg font-semibold bg-cyan-600 text-white shadow-sm transition-all flex items-center gap-1.5';
        } else {
          if (panel) panel.classList.add('hidden');
          if (btn) btn.className = 'px-3 py-1.5 rounded-lg font-medium text-slate-400 hover:text-white transition-all flex items-center gap-1.5';
        }
      });

      if (tab === 'visual') {
        setTimeout(initGraphCanvas, 50);
      } else if (tab === 'audit') {
        loadGraftAudit();
      }
      lucide.createIcons();
    }

    async function initGraftStudio() {
      await loadGraftGraphData();
      if (graftState.activeSubTab === 'visual') {
        initGraphCanvas();
      } else if (graftState.activeSubTab === 'audit') {
        loadGraftAudit();
      }
    }

    async function refreshGraftData() {
      await loadGraftGraphData();
      if (graftState.activeSubTab === 'visual') {
        initGraphCanvas();
      } else if (graftState.activeSubTab === 'audit') {
        loadGraftAudit();
      } else if (graftState.activeSubTab === 'tools') {
        fetchGraftMap();
      }
    }

    async function loadGraftGraphData() {
      const metricsBadge = document.getElementById('graftMetricsBadge');
      if (metricsBadge) metricsBadge.innerText = 'Indexando grafo...';
      try {
        const res = await fetch(\`/v1/graft/graph?projectId=\${encodeURIComponent(currentProjectId)}\`);
        const data = await res.json();
        graftState.graphData = data;

        if (metricsBadge) {
          metricsBadge.innerText = \`\${data.metrics.totalFiles} archivos | \${data.metrics.totalEdges} conexiones | \${data.metrics.totalSymbols} símbolos\`;
        }

        // Populate cluster select
        const clusterSelect = document.getElementById('graftClusterSelect');
        if (clusterSelect && data.clusters) {
          clusterSelect.innerHTML = '<option value="ALL">Todos los Clusters</option>';
          data.clusters.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.innerText = \`\${c.name} (\${c.nodeCount} archivos)\`;
            clusterSelect.appendChild(opt);
          });
        }

        // Setup simulation nodes & edges
        setupGraphSimulation(data);
      } catch (err) {
        if (metricsBadge) metricsBadge.innerText = 'Error al cargar grafo';
        console.error('Error loading graft graph data:', err);
      }
    }

    function setupGraphSimulation(data) {
      const canvas = document.getElementById('graftCanvas');
      const width = (canvas && canvas.clientWidth) || 800;
      const height = (canvas && canvas.clientHeight) || 500;

      const nodeMap = new Map();
      const nodeCount = data.nodes.length;
      const radius = Math.min(width, height) * 0.38;

      graftState.nodes = data.nodes.map((n, i) => {
        const angle = (i / Math.max(1, nodeCount)) * 2 * Math.PI;
        const dist = radius * (0.4 + 0.6 * Math.random());
        const x = width / 2 + dist * Math.cos(angle);
        const y = height / 2 + dist * Math.sin(angle);
        const size = Math.max(6, Math.min(18, 6 + Math.log2(Math.max(1, n.lines / 10))));

        const simNode = {
          ...n,
          x,
          y,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          radius: size,
          color: LANG_COLORS[n.language] || LANG_COLORS.default
        };
        nodeMap.set(n.id, simNode);
        return simNode;
      });

      graftState.edges = data.edges.map(e => ({
        source: nodeMap.get(e.source),
        target: nodeMap.get(e.target),
        type: e.type,
        symbols: e.symbols
      })).filter(e => e.source && e.target);
    }

    function initGraphCanvas() {
      const canvas = document.getElementById('graftCanvas');
      if (!canvas) return;

      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      // Event Listeners
      canvas.onmousedown = handleCanvasMouseDown;
      canvas.onmousemove = handleCanvasMouseMove;
      canvas.onmouseup = handleCanvasMouseUp;
      canvas.onwheel = handleCanvasWheel;
      canvas.ondblclick = handleCanvasDblClick;

      if (!graftState.animFrameId) {
        runGraphSimulation();
      }
    }

    function runGraphSimulation() {
      const canvas = document.getElementById('graftCanvas');
      if (!canvas) {
        graftState.animFrameId = null;
        return;
      }
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;

      // Physics update step
      const nodes = graftState.nodes;
      const edges = graftState.edges;
      const kRepel = 2400;
      const kSpring = 0.04;
      const restLen = 80;
      const centerGravity = 0.015;

      // 1. Repulsion between nodes
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const distSq = dx * dx + dy * dy + 100;
          const dist = Math.sqrt(distSq);
          const force = kRepel / distSq;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (n1 !== graftState.draggedNode) {
            n1.vx -= fx;
            n1.vy -= fy;
          }
          if (n2 !== graftState.draggedNode) {
            n2.vx += fx;
            n2.vy += fy;
          }
        }
      }

      // 2. Spring force along edges
      for (let i = 0; i < edges.length; i++) {
        const e = edges[i];
        const dx = e.target.x - e.source.x;
        const dy = e.target.y - e.source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - restLen) * kSpring;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (e.source !== graftState.draggedNode) {
          e.source.vx += fx;
          e.source.vy += fy;
        }
        if (e.target !== graftState.draggedNode) {
          e.target.vx -= fx;
          e.target.vy -= fy;
        }
      }

      // 3. Center gravity & integrate positions
      const cx = width / 2;
      const cy = height / 2;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (n === graftState.draggedNode) continue;

        n.vx += (cx - n.x) * centerGravity;
        n.vy += (cy - n.y) * centerGravity;

        n.vx *= 0.86;
        n.vy *= 0.86;

        n.x += n.vx;
        n.y += n.vy;
      }

      // Render step
      ctx.clearRect(0, 0, width, height);
      ctx.save();

      // Apply camera pan & zoom
      ctx.translate(width / 2 + graftState.camera.x, height / 2 + graftState.camera.y);
      ctx.scale(graftState.camera.zoom, graftState.camera.zoom);
      ctx.translate(-width / 2, -height / 2);

      // Draw Edges
      for (let i = 0; i < edges.length; i++) {
        const e = edges[i];
        const isConnectedToHover = graftState.hoveredNode && (e.source === graftState.hoveredNode || e.target === graftState.hoveredNode);
        const isConnectedToSelected = graftState.selectedNode && (e.source === graftState.selectedNode || e.target === graftState.selectedNode);
        const isHighlighted = isConnectedToHover || isConnectedToSelected;

        ctx.beginPath();
        ctx.moveTo(e.source.x, e.source.y);
        ctx.lineTo(e.target.x, e.target.y);

        if (isHighlighted) {
          ctx.strokeStyle = e.type === 'inheritance' ? '#ec4899' : '#06b6d4';
          ctx.lineWidth = 2.5;
        } else {
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
          ctx.lineWidth = 1;
        }
        ctx.stroke();

        // Draw small direction arrow
        if (isHighlighted) {
          const midX = (e.source.x + e.target.x) / 2;
          const midY = (e.source.y + e.target.y) / 2;
          const angle = Math.atan2(e.target.y - e.source.y, e.target.x - e.source.x);
          ctx.beginPath();
          ctx.arc(midX, midY, 3, 0, 2 * Math.PI);
          ctx.fillStyle = ctx.strokeStyle;
          ctx.fill();
        }
      }

      // Draw Nodes
      const query = graftState.searchQuery.toLowerCase();
      const cluster = graftState.selectedCluster;

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const isHovered = n === graftState.hoveredNode;
        const isSelected = n === graftState.selectedNode;
        const isInBlast = graftState.blastRadiusSet.has(n.id);
        const matchesSearch = !query || n.id.toLowerCase().includes(query) || (n.symbols && n.symbols.some(s => s.name.toLowerCase().includes(query)));
        const matchesCluster = cluster === 'ALL' || n.cluster === cluster;

        const opacity = matchesSearch && matchesCluster ? 1 : 0.2;

        ctx.globalAlpha = opacity;

        // Outer glow
        if (isSelected || isInBlast || isHovered) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + 6, 0, 2 * Math.PI);
          ctx.fillStyle = isSelected ? 'rgba(6, 182, 212, 0.35)' : isInBlast ? 'rgba(245, 158, 11, 0.35)' : 'rgba(255, 255, 255, 0.2)';
          ctx.fill();
        }

        // Main circle
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, 2 * Math.PI);
        ctx.fillStyle = isInBlast ? '#f59e0b' : isSelected ? '#22d3ee' : n.color;
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(15, 23, 42, 0.8)';
        ctx.lineWidth = isSelected ? 2 : 1.5;
        ctx.stroke();

        // Label
        if (matchesSearch && (isHovered || isSelected || graftState.camera.zoom >= 0.8 || n.fanIn > 2)) {
          ctx.font = isSelected || isHovered ? 'bold 11px monospace' : '9px monospace';
          ctx.fillStyle = isSelected ? '#ffffff' : '#cbd5e1';
          ctx.textAlign = 'center';
          ctx.fillText(n.label, n.x, n.y + n.radius + 12);
        }

        ctx.globalAlpha = 1.0;
      }

      ctx.restore();

      graftState.animFrameId = requestAnimationFrame(runGraphSimulation);
    }

    function getCanvasPointerPos(e) {
      const canvas = document.getElementById('graftCanvas');
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      const width = canvas.width;
      const height = canvas.height;

      // Reverse camera transforms
      const x = (clientX - width / 2 - graftState.camera.x) / graftState.camera.zoom + width / 2;
      const y = (clientY - height / 2 - graftState.camera.y) / graftState.camera.zoom + height / 2;
      return { x, y, screenX: clientX, screenY: clientY };
    }

    function findNodeAt(x, y) {
      for (let i = graftState.nodes.length - 1; i >= 0; i--) {
        const n = graftState.nodes[i];
        const dx = n.x - x;
        const dy = n.y - y;
        if (dx * dx + dy * dy <= (n.radius + 6) * (n.radius + 6)) {
          return n;
        }
      }
      return null;
    }

    function handleCanvasMouseDown(e) {
      const pos = getCanvasPointerPos(e);
      const node = findNodeAt(pos.x, pos.y);

      if (node) {
        graftState.isDragging = true;
        graftState.draggedNode = node;
        selectGraftNode(node);
      } else {
        graftState.isPanning = true;
        graftState.lastMousePos = { x: e.clientX, y: e.clientY };
      }
    }

    function handleCanvasMouseMove(e) {
      const pos = getCanvasPointerPos(e);

      if (graftState.isDragging && graftState.draggedNode) {
        graftState.draggedNode.x = pos.x;
        graftState.draggedNode.y = pos.y;
        graftState.draggedNode.vx = 0;
        graftState.draggedNode.vy = 0;
      } else if (graftState.isPanning) {
        const dx = e.clientX - graftState.lastMousePos.x;
        const dy = e.clientY - graftState.lastMousePos.y;
        graftState.camera.x += dx;
        graftState.camera.y += dy;
        graftState.lastMousePos = { x: e.clientX, y: e.clientY };
      } else {
        const node = findNodeAt(pos.x, pos.y);
        graftState.hoveredNode = node;
        const canvas = document.getElementById('graftCanvas');
        if (canvas) canvas.style.cursor = node ? 'pointer' : 'grab';
      }
    }

    function handleCanvasMouseUp() {
      graftState.isDragging = false;
      graftState.draggedNode = null;
      graftState.isPanning = false;
      const canvas = document.getElementById('graftCanvas');
      if (canvas) canvas.style.cursor = 'grab';
    }

    function handleCanvasWheel(e) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      graftState.camera.zoom = Math.max(0.2, Math.min(3.5, graftState.camera.zoom * zoomFactor));
    }

    function handleCanvasDblClick(e) {
      const pos = getCanvasPointerPos(e);
      const node = findNodeAt(pos.x, pos.y);
      if (node) {
        selectGraftNode(node);
        inspectSelectedNodeSkeleton();
      }
    }

    async function selectGraftNode(node) {
      graftState.selectedNode = node;
      graftState.blastRadiusSet.clear();

      const emptyEl = document.getElementById('inspectorEmptyState');
      const contentEl = document.getElementById('inspectorContent');
      const langBadge = document.getElementById('inspectorLangBadge');

      if (emptyEl) emptyEl.classList.add('hidden');
      if (contentEl) contentEl.classList.remove('hidden');

      if (langBadge) {
        langBadge.innerText = node.language.toUpperCase();
        langBadge.style.color = node.color;
      }

      document.getElementById('inspectorFilePath').innerText = node.id;
      document.getElementById('inspectorLineCount').innerText = node.lines || 1;
      document.getElementById('inspectorFanIn').innerText = node.fanIn || 0;
      document.getElementById('inspectorFanOut').innerText = node.fanOut || 0;
      document.getElementById('inspectorSymbolCount').innerText = node.symbolCount || 0;

      // Populate symbols list
      const symbolsListEl = document.getElementById('inspectorSymbolsList');
      symbolsListEl.innerHTML = '';
      if (node.symbols && node.symbols.length > 0) {
        node.symbols.forEach(s => {
          const symDiv = document.createElement('div');
          symDiv.className = 'flex items-center justify-between p-1.5 rounded bg-surface-800 border border-surface-750 text-[11px] font-mono hover:bg-surface-750 cursor-pointer';
          symDiv.onclick = () => {
            document.getElementById('graftCallersInput').value = s.name;
            switchGraftSubTab('tools');
            fetchGraftCallers();
          };
          symDiv.innerHTML = \`
            <span class="text-white truncate" title="\${s.signature}">\${s.name}</span>
            <span class="text-[10px] text-cyan-400 font-sans px-1.5 py-0.2 rounded bg-cyan-500/15">\${s.kind}</span>
          \`;
          symbolsListEl.appendChild(symDiv);
        });
      } else {
        symbolsListEl.innerHTML = '<div class="text-slate-500 text-[11px] italic p-1">Sin símbolos exportados directos.</div>';
      }

      // Calculate blast radius for highlight
      try {
        const res = await fetch(\`/v1/graft/blast?target=\${encodeURIComponent(node.id)}&projectId=\${encodeURIComponent(currentProjectId)}\`);
        const blastData = await res.json();
        (blastData.directDependents || []).forEach(d => graftState.blastRadiusSet.add(d));
        (blastData.indirectDependents || []).forEach(d => graftState.blastRadiusSet.add(d));
      } catch {}
      lucide.createIcons();
    }

    function inspectSelectedNodeSkeleton() {
      if (!graftState.selectedNode) return;
      document.getElementById('graftSkeletonInput').value = graftState.selectedNode.id;
      switchGraftSubTab('tools');
      fetchGraftSkeleton();
    }

    function inspectSelectedNodeBlast() {
      if (!graftState.selectedNode) return;
      document.getElementById('graftBlastInput').value = graftState.selectedNode.id;
      switchGraftSubTab('tools');
      fetchGraftBlast();
    }

    function filterGraphNodes(query) {
      graftState.searchQuery = query || '';
    }

    function filterGraphByCluster(cluster) {
      graftState.selectedCluster = cluster || 'ALL';
    }

    function resetGraphZoom() {
      graftState.camera = { x: 0, y: 0, zoom: 1 };
    }

    // --- AUDIT & CYCLES TAB ---
    async function loadGraftAudit() {
      const cyclesListEl = document.getElementById('auditCyclesList');
      const deadCodeListEl = document.getElementById('auditDeadCodeList');
      const cyclesBadge = document.getElementById('auditCyclesCountBadge');
      const deadBadge = document.getElementById('auditDeadCodeCountBadge');

      if (cyclesListEl) cyclesListEl.innerHTML = '<div class="p-3 text-slate-400">Buscando ciclos de importación...</div>';
      if (deadCodeListEl) deadCodeListEl.innerHTML = '<div class="p-3 text-slate-400">Analizando código muerto...</div>';

      try {
        const [cyclesRes, deadRes] = await Promise.all([
          fetch(\`/v1/graft/cycles?projectId=\${encodeURIComponent(currentProjectId)}\`).then(r => r.json()),
          fetch(\`/v1/graft/dead-code?projectId=\${encodeURIComponent(currentProjectId)}\`).then(r => r.json())
        ]);

        // Render cycles
        if (cyclesBadge) cyclesBadge.innerText = \`\${cyclesRes.total || 0} ciclos\`;
        graftState.cachedCycles = cyclesRes.cycles || [];
        if (cyclesListEl) {
          cyclesListEl.innerHTML = '';
          if (cyclesRes.cycles && cyclesRes.cycles.length > 0) {
            cyclesRes.cycles.forEach((c, idx) => {
              const div = document.createElement('div');
              div.className = 'p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs space-y-2';
              div.innerHTML = \`
                <div class="flex items-center justify-between">
                  <div class="font-bold flex items-center gap-1.5">
                    <i data-lucide="alert-triangle" class="w-3.5 h-3.5 text-rose-400"></i>
                    Ciclo #\${idx + 1} (Longitud: \${c.length})
                  </div>
                  <button onclick="openCycleAutoFixModal(\${idx})" class="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium text-[11px] flex items-center gap-1 shadow-sm transition-colors cursor-pointer">
                    <i data-lucide="wrench" class="w-3 h-3"></i>
                    Auto-Fix
                  </button>
                </div>
                <div class="text-[11px] text-slate-300 break-all leading-relaxed">\${c.cycle.map(p => \`<span class="px-1.5 py-0.5 rounded bg-surface-800 text-white font-mono">\${p}</span>\`).join(' ➔ ')}</div>
              \`;
              cyclesListEl.appendChild(div);
            });
          } else {
            cyclesListEl.innerHTML = '<div class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-center">✅ No se detectaron dependencias circulares. Excelente modularidad.</div>';
          }
        }

        // Render dead code
        if (deadBadge) deadBadge.innerText = \`\${deadRes.total || 0} símbolos\`;
        if (deadCodeListEl) {
          deadCodeListEl.innerHTML = '';
          if (deadRes.dead && deadRes.dead.length > 0) {
            deadRes.dead.slice(0, 30).forEach(d => {
              const div = document.createElement('div');
              div.className = 'p-2 rounded-lg bg-surface-800 border border-surface-700 flex items-center justify-between text-xs hover:bg-surface-750';
              div.innerHTML = \`
                <div class="truncate mr-2">
                  <div class="font-bold text-slate-200 truncate">\${d.symbolName} <span class="text-[10px] font-normal text-amber-400 font-sans">(\${d.kind})</span></div>
                  <div class="text-[10px] text-slate-400 truncate">\${d.file}:L\${d.line}</div>
                </div>
                <button onclick="document.getElementById('graftSkeletonInput').value='\${d.file}'; switchGraftSubTab('tools'); fetchGraftSkeleton();" class="px-2 py-1 rounded bg-surface-700 hover:bg-surface-650 text-[10px] text-slate-200 shrink-0">Ver</button>
              \`;
              deadCodeListEl.appendChild(div);
            });
          } else {
            deadCodeListEl.innerHTML = '<div class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-center">✅ No se detectaron símbolos exportados sin uso.</div>';
          }
        }

        // Load Static Diagnostics
        loadGraftDiagnostics();

        lucide.createIcons();
      } catch (err) {
        console.error('Error loading audit data:', err);
      }
    }

    // --- STATIC DIAGNOSTICS LOADER ---
    async function loadGraftDiagnostics() {
      const diagListEl = document.getElementById('auditDiagList');
      const errBadge = document.getElementById('auditDiagErrorsBadge');
      const warnBadge = document.getElementById('auditDiagWarningsBadge');

      if (diagListEl) diagListEl.innerHTML = '<div class="p-3 text-slate-400">Analizando sintaxis y estructura estática...</div>';

      try {
        const res = await fetch(\`/v1/graft/diagnostics?projectId=\${encodeURIComponent(currentProjectId)}\`);
        const data = await res.json();

        if (errBadge) errBadge.innerText = \`\${data.errorCount || 0} errores\`;
        if (warnBadge) warnBadge.innerText = \`\${data.warningCount || 0} advertencias\`;

        if (diagListEl) {
          diagListEl.innerHTML = '';
          if (data.diagnostics && data.diagnostics.length > 0) {
            data.diagnostics.slice(0, 40).forEach(d => {
              const isErr = d.severity === 'error';
              const div = document.createElement('div');
              div.className = \`p-2 rounded-lg \${isErr ? 'bg-rose-500/10 border-rose-500/30 text-rose-200' : 'bg-amber-500/10 border-amber-500/30 text-amber-200'} border text-xs flex items-start justify-between gap-2\`;
              div.innerHTML = \`
                <div class="space-y-0.5 min-w-0">
                  <div class="flex items-center gap-1.5 font-bold">
                    <span class="px-1.5 py-0.2 rounded text-[9px] \${isErr ? 'bg-rose-500/30 text-rose-300' : 'bg-amber-500/30 text-amber-300'} uppercase font-mono">\${d.severity}</span>
                    <span class="text-white truncate">\${d.file}:L\${d.line}:C\${d.column}</span>
                  </div>
                  <div class="text-slate-300 text-[11px]">\${d.message}</div>
                  \${d.fixSuggestion ? \`<div class="text-[10px] text-emerald-300 italic font-sans">💡 Sugerencia: \${d.fixSuggestion}</div>\` : ''}
                </div>
                <button onclick="document.getElementById('graftSkeletonInput').value='\${d.file}'; switchGraftSubTab('tools'); fetchGraftSkeleton();" class="px-2 py-1 rounded bg-surface-800 hover:bg-surface-700 text-[10px] text-slate-200 shrink-0 font-sans">Inspeccionar</button>
              \`;
              diagListEl.appendChild(div);
            });
          } else {
            diagListEl.innerHTML = \`<div class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-center font-sans text-xs">✅ Todo limpio (\${data.totalFilesChecked} archivos analizados). Cero errores de sintaxis o llaves desbalanceadas.</div>\`;
          }
        }
        lucide.createIcons();
      } catch (e) {
        if (diagListEl) diagListEl.innerHTML = '<div class="p-3 text-rose-400">Error al escanear diagnósticos: ' + e.message + '</div>';
      }
    }

    // --- AUTO-FIX CYCLE MODAL LOGIC ---
    let activeCycleProposal = null;

    async function openCycleAutoFixModal(cycleIdx) {
      const cycleObj = (graftState.cachedCycles || [])[cycleIdx];
      if (!cycleObj) return;

      const modal = document.getElementById('cycleAutoFixModal');
      const stratEl = document.getElementById('autoFixStrategy');
      const ratEl = document.getElementById('autoFixRationale');
      const stepsEl = document.getElementById('autoFixSteps');

      stratEl.innerText = 'Analizando estrategia de desacoplamiento...';
      ratEl.innerText = '';
      stepsEl.innerHTML = '';
      modal.classList.remove('hidden');

      try {
        const res = await fetch(\`/v1/graft/fix-cycle?projectId=\${encodeURIComponent(currentProjectId)}\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cycle: cycleObj.cycle })
        });
        const proposal = await res.json();
        activeCycleProposal = proposal;

        stratEl.innerText = proposal.strategy || 'Inversión de Dependencias (DIP)';
        ratEl.innerText = proposal.rationale || '';
        stepsEl.innerHTML = (proposal.steps || []).map(s => \`<div class="p-1">\${s}</div>\`).join('');
      } catch (err) {
        stratEl.innerText = 'Error al generar propuesta: ' + err.message;
      }
      lucide.createIcons();
    }

    function closeCycleAutoFixModal() {
      document.getElementById('cycleAutoFixModal').classList.add('hidden');
    }

    function copyAutoFixPlan() {
      if (!activeCycleProposal) return;
      const text = \`Estrategia: \${activeCycleProposal.strategy}\\n\\n\${activeCycleProposal.rationale}\\n\\nPasos:\\n\${(activeCycleProposal.steps || []).join('\\n')}\`;
      copyToClipboard(text);
    }

    function sendAutoFixToChat() {
      if (!activeCycleProposal) return;
      closeCycleAutoFixModal();
      switchView('chat');
      const prompt = \`Andy, por favor resuelve la siguiente dependencia circular siguiendo esta estrategia:\\n\\n**Estrategia:** \${activeCycleProposal.strategy}\\n**Justificación:** \${activeCycleProposal.rationale}\\n\\n**Pasos recomendados:**\\n\${(activeCycleProposal.steps || []).join('\\n')}\\n\\nEjecuta los cambios necesarios directamente y verifica que el ciclo quede eliminado.\`;
      const input = document.getElementById('promptInput');
      if (input) {
        input.value = prompt;
        autoExpandTextarea(input);
        input.focus();
      }
    }

    // --- INTERACTIVE WEB TERMINAL CLIENT ---
    const terminalState = {
      history: [],
      historyIndex: -1,
      isRunning: false
    };

    function updateTerminalCwdBadge() {
      const badge = document.getElementById('terminalCwdBadge');
      if (badge && activeProjectData) {
        badge.innerText = \`CWD: \${activeProjectData.path || './'}\`;
      }
    }

    function runTerminalPreset(command) {
      const input = document.getElementById('terminalCommandInput');
      if (input) input.value = command;
      submitTerminalCommand();
    }

    function clearTerminalScreen() {
      const screen = document.getElementById('terminalScreen');
      if (screen) {
        screen.innerHTML = '<div class="text-slate-500 italic pb-2 border-b border-surface-800">Andy Agent Web Terminal v0.8 • Pantalla limpia.</div>';
      }
    }

    function handleTerminalKeyDown(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitTerminalCommand();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (terminalState.history.length > 0) {
          if (terminalState.historyIndex < terminalState.history.length - 1) {
            terminalState.historyIndex++;
          }
          const cmd = terminalState.history[terminalState.history.length - 1 - terminalState.historyIndex];
          e.target.value = cmd || '';
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (terminalState.historyIndex > 0) {
          terminalState.historyIndex--;
          const cmd = terminalState.history[terminalState.history.length - 1 - terminalState.historyIndex];
          e.target.value = cmd || '';
        } else if (terminalState.historyIndex === 0) {
          terminalState.historyIndex = -1;
          e.target.value = '';
        }
      }
    }

    async function submitTerminalCommand() {
      const input = document.getElementById('terminalCommandInput');
      if (!input || terminalState.isRunning) return;
      const command = input.value.trim();
      if (!command) return;

      terminalState.history.push(command);
      terminalState.historyIndex = -1;
      input.value = '';

      if (
        command === 'systemctl restart andy-agent' ||
        command === 'sudo systemctl restart andy-agent' ||
        command === 'systemctl --user restart andy-agent' ||
        command === 'pm2 restart andy-agent'
      ) {
        requestServerRestart();
        return;
      }

      const screen = document.getElementById('terminalScreen');
      const runBtn = document.getElementById('terminalRunBtn');
      terminalState.isRunning = true;
      if (runBtn) {
        runBtn.disabled = true;
        runBtn.innerHTML = '<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> Ejecutando...';
      }

      // Append command entry to screen
      const cmdBlock = document.createElement('div');
      cmdBlock.className = 'pt-2 pb-1 border-t border-surface-800/80';
      cmdBlock.innerHTML = \`
        <div class="flex items-center gap-2 text-emerald-400 font-bold">
          <span>$</span>
          <span class="text-white">\${command}</span>
          <span class="text-[10px] text-slate-500 font-normal ml-auto">\${new Date().toLocaleTimeString()}</span>
        </div>
        <pre class="mt-1 text-slate-300 font-mono text-[11px] whitespace-pre-wrap break-all leading-relaxed"></pre>
        <div class="text-[10px] mt-1 font-sans text-slate-500 italic execution-status">Ejecutando proceso...</div>
      \`;
      screen.appendChild(cmdBlock);
      screen.scrollTop = screen.scrollHeight;
      lucide.createIcons();

      const outputPre = cmdBlock.querySelector('pre');
      const statusDiv = cmdBlock.querySelector('.execution-status');

      try {
        const response = await fetch('/api/terminal/exec', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command,
            projectId: currentProjectId,
            stream: true
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          outputPre.innerText = errData.error || 'Error al ejecutar comando.';
          statusDiv.innerHTML = '<span class="text-rose-400 font-semibold">✗ Error en la petición</span>';
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\\n\\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const dataStr = trimmed.slice(5).trim();
            if (dataStr === '[DONE]') continue;

            try {
              const event = JSON.parse(dataStr);
              if (event.type === 'stdout' || event.type === 'stderr') {
                outputPre.innerText += event.text;
                screen.scrollTop = screen.scrollHeight;
              } else if (event.type === 'exit') {
                const code = event.code;
                statusDiv.innerHTML = code === 0
                  ? '<span class="text-emerald-400 font-semibold">✓ Proceso finalizado con éxito (código 0)</span>'
                  : \`<span class="text-rose-400 font-semibold">✗ Proceso terminó con código \${code}</span>\`;
              } else if (event.type === 'error') {
                outputPre.innerText += \`\\nError del sistema: \${event.error}\`;
                statusDiv.innerHTML = '<span class="text-rose-400 font-semibold">✗ Error del sistema</span>';
              }
            } catch (e) {}
          }
        }
      } catch (err) {
        outputPre.innerText += \`\\nFallo de conexión: \${err.message}\`;
        statusDiv.innerHTML = '<span class="text-rose-400 font-semibold">✗ Conexión perdida</span>';
      } finally {
        terminalState.isRunning = false;
        if (runBtn) {
          runBtn.disabled = false;
          runBtn.innerHTML = '<i data-lucide="play" class="w-3.5 h-3.5 fill-current"></i> Ejecutar';
          lucide.createIcons();
        }
        screen.scrollTop = screen.scrollHeight;
      }
    }

    async function requestServerRestart() {
      if (!confirm('¿Estás seguro de reiniciar Andy Agent?\\n\\n(Se ejecutará el reinicio del servicio daemon y la WebUI se reconectará automáticamente en unos segundos).')) {
        return;
      }

      const screen = document.getElementById('terminalScreen');
      const restartBlock = document.createElement('div');
      restartBlock.className = 'pt-2 pb-2 border-t-2 border-amber-500/40 bg-amber-500/10 p-3.5 rounded-xl my-2 space-y-1.5 shadow-lg';
      restartBlock.innerHTML = \`
        <div class="flex items-center gap-2 text-amber-300 font-bold text-xs">
          <span class="animate-spin inline-block text-base">🔄</span>
          <span>Reiniciando servicio Andy Agent...</span>
          <span class="text-[10px] text-slate-400 font-mono ml-auto">systemctl restart andy-agent</span>
        </div>
        <p class="text-[11px] text-slate-300">Enviando señal de reinicio al servidor. Esperando que el daemon reinicie el proceso...</p>
        <div id="restartProgressStatus" class="text-[10px] font-mono text-amber-400 font-semibold">Paso 1/2: Notificando al backend...</div>
      \`;
      screen.appendChild(restartBlock);
      screen.scrollTop = screen.scrollHeight;

      const statusEl = document.getElementById('restartProgressStatus');

      try {
        await fetch('/api/system/restart', { method: 'POST' });
        if (statusEl) statusEl.innerText = 'Paso 2/2: Servidor reiniciando. Verificando disponibilidad...';
      } catch (err) {
        if (statusEl) statusEl.innerText = 'Paso 2/2: Reinicio en curso (conexión temporalmente cerrada). Verificando disponibilidad...';
      }

      // Polling /health until server responds
      let attempts = 0;
      const maxAttempts = 40;
      const pollInterval = setInterval(async () => {
        attempts++;
        if (statusEl) statusEl.innerText = \`Paso 2/2: Reconectando con Andy Agent (intento \${attempts}/\${maxAttempts})...\`;
        try {
          const res = await originalFetch('/health', { cache: 'no-store' });
          if (res.ok) {
            clearInterval(pollInterval);
            if (statusEl) {
              statusEl.className = 'text-[11px] font-bold text-emerald-400 font-mono';
              statusEl.innerText = '✓ ¡Andy Agent reiniciado y en línea con éxito!';
            }
            const okBlock = document.createElement('div');
            okBlock.className = 'p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 mt-2';
            okBlock.innerHTML = '<i data-lucide="check-circle" class="w-4 h-4 text-emerald-400"></i> Servicio reanudado exitosamente.';
            screen.appendChild(okBlock);
            screen.scrollTop = screen.scrollHeight;
            lucide.createIcons();
            setTimeout(() => {
              initializeApp();
            }, 1000);
          }
        } catch (e) {
          if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            if (statusEl) {
              statusEl.className = 'text-[11px] font-bold text-rose-400 font-mono';
              statusEl.innerText = '⚠️ Tiempo de espera agotado. Por favor recarga la página manualmente.';
            }
          }
        }
      }, 1000);
    }

    // --- STRUCTURAL TOOLS CALLS ---
    async function fetchGraftMap() {
      const out = document.getElementById('graftResultContent');
      out.innerText = 'Indexando repositorio con Graft Engine...';
      try {
        const res = await fetch(\`/v1/graft/map?projectId=\${encodeURIComponent(currentProjectId)}\`);
        const text = await res.text();
        out.innerText = text;
      } catch (e) {
        out.innerText = 'Error al obtener mapa Graft: ' + e.message;
      }
    }

    async function fetchGraftSkeleton() {
      const file = document.getElementById('graftSkeletonInput').value.trim();
      if (!file) return alert('Ingresa una ruta de archivo');
      const out = document.getElementById('graftResultContent');
      out.innerText = \`Generando esqueleto para \${file}...\`;
      try {
        const res = await fetch(\`/v1/graft/skeleton?file=\${encodeURIComponent(file)}&projectId=\${encodeURIComponent(currentProjectId)}\`);
        const text = await res.text();
        out.innerText = text;
      } catch (e) {
        out.innerText = 'Error: ' + e.message;
      }
    }

    async function fetchGraftCallers() {
      const symbol = document.getElementById('graftCallersInput').value.trim();
      if (!symbol) return alert('Ingresa un nombre de función o símbolo');
      const out = document.getElementById('graftResultContent');
      out.innerText = \`Buscando callers y cadena para \${symbol}...\`;
      try {
        const res = await fetch(\`/v1/graft/call-chain?symbol=\${encodeURIComponent(symbol)}&projectId=\${encodeURIComponent(currentProjectId)}\`);
        const data = await res.json();
        out.innerText = JSON.stringify(data, null, 2);
      } catch (e) {
        out.innerText = 'Error: ' + e.message;
      }
    }

    async function fetchGraftBlast() {
      const target = document.getElementById('graftBlastInput').value.trim();
      if (!target) return alert('Ingresa un archivo o símbolo');
      const out = document.getElementById('graftResultContent');
      out.innerText = \`Calculando radio de impacto para \${target}...\`;
      try {
        const res = await fetch(\`/v1/graft/blast?target=\${encodeURIComponent(target)}&projectId=\${encodeURIComponent(currentProjectId)}\`);
        const data = await res.json();
        out.innerText = JSON.stringify(data, null, 2);
      } catch (e) {
        out.innerText = 'Error: ' + e.message;
      }
    }

    function copyGraftResult() {
      const text = document.getElementById('graftResultContent').innerText;
      navigator.clipboard.writeText(text);
      alert('Resultado copiado al portapapeles');
    }

    // --- PANTHEON MULTI-AGENT STUDIO CLIENT ---
    const pantheonState = {
      activeSubTab: 'roster',
      activeSquadId: (typeof localStorage !== 'undefined' ? localStorage.getItem('andy_active_squad_id') : null) || 'fullstack-squad',
      agents: [],
      squads: [],
      isStreaming: false
    };

    function switchPantheonSubTab(tab) {
      pantheonState.activeSubTab = tab;
      ['pantheonSubTabRoster', 'pantheonSubTabTopology'].forEach(t => {
        const el = document.getElementById(t);
        if (el) el.classList.add('hidden');
      });

      ['pantheonSubTabRosterBtn', 'pantheonSubTabTopologyBtn'].forEach(b => {
        const el = document.getElementById(b);
        if (el) el.className = 'px-3 py-1.5 rounded-lg font-medium text-slate-400 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shrink-0';
      });

      if (tab === 'roster') {
        document.getElementById('pantheonSubTabRoster').classList.remove('hidden');
        document.getElementById('pantheonSubTabRosterBtn').className = 'px-3 py-1.5 rounded-lg font-semibold bg-purple-600 text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer shrink-0';
        renderPantheonSquadsList();
        renderPantheonAgents();
      } else if (tab === 'topology') {
        document.getElementById('pantheonSubTabTopology').classList.remove('hidden');
        document.getElementById('pantheonSubTabTopologyBtn').className = 'px-3 py-1.5 rounded-lg font-semibold bg-purple-600 text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer shrink-0';
        renderPantheonTopology();
      }
      lucide.createIcons();
    }

    async function loadPantheonData() {
      await Promise.all([
        fetchPantheonAgents(),
        fetchPantheonSquads()
      ]);

      const savedSquadId = (typeof currentProjectId !== 'undefined' && currentProjectId ? localStorage.getItem('andy_active_squad_' + currentProjectId) : null) || localStorage.getItem('andy_active_squad_id');
      if (savedSquadId && pantheonState.squads.some(s => s.id === savedSquadId)) {
        pantheonState.activeSquadId = savedSquadId;
      } else if (pantheonState.squads.length > 0 && !pantheonState.squads.some(s => s.id === pantheonState.activeSquadId)) {
        pantheonState.activeSquadId = pantheonState.squads[0].id;
      }

      updateHeaderSquadButton();
      renderHeaderSquadDropdown();
      renderChatMentionChips();
      renderPantheonSquadsList();
      renderPantheonAgents();
      renderPantheonTopology();
    }

    async function fetchPantheonAgents() {
      try {
        const res = await fetch(\`/v1/pantheon/agents?projectId=\${encodeURIComponent(currentProjectId)}\`);
        const data = await res.json();
        pantheonState.agents = data.agents || [];
      } catch (err) {
        console.error('Error fetching Pantheon agents:', err);
      }
    }

    async function fetchPantheonSquads() {
      try {
        const res = await fetch(\`/v1/pantheon/squads?projectId=\${encodeURIComponent(currentProjectId)}\`);
        const data = await res.json();
        pantheonState.squads = data.squads || [];
      } catch (err) {
        console.error('Error fetching Pantheon squads:', err);
      }
    }

    function updateHeaderSquadButton() {
      const label = document.getElementById('selectedSquadLabel');
      const countBadge = document.getElementById('selectedSquadCountBadge');
      const squad = pantheonState.squads.find(s => s.id === pantheonState.activeSquadId) || pantheonState.squads[0];
      if (label && squad) {
        label.innerText = squad.name;
      }
      if (countBadge && squad) {
        countBadge.innerText = (squad.memberIds?.length || 0) + ' agentes';
      }
    }

    function renderHeaderSquadDropdown() {
      const container = document.getElementById('squadsDropdownList');
      const countText = document.getElementById('squadDropdownCountText');
      if (!container) return;
      container.innerHTML = '';

      if (countText) countText.innerText = (pantheonState.squads.length || 0) + ' disponibles';

      if (pantheonState.squads.length === 0) {
        container.innerHTML = '<div class="p-4 text-center text-slate-400 text-xs">Cargando escuadrones...</div>';
        return;
      }

      pantheonState.squads.forEach(s => {
        const isSelected = s.id === pantheonState.activeSquadId;
        const members = pantheonState.agents.filter(a => s.memberIds.includes(a.id));
        const btn = document.createElement('button');
        btn.className = 'w-full text-left p-2.5 rounded-xl border transition-all flex flex-col space-y-1.5 cursor-pointer ' +
          (isSelected ? 'bg-purple-600/20 border-purple-500/50 shadow-md' : 'bg-surface-800/80 border-surface-750 hover:bg-surface-750 hover:border-surface-600');
        btn.onclick = () => selectHeaderSquad(s.id);

        const modeBadgeColor = s.workflowMode === 'hierarchical' ? 'bg-purple-500/20 text-purple-300' :
                               s.workflowMode === 'sequential' ? 'bg-amber-500/20 text-amber-300' : 'bg-cyan-500/20 text-cyan-300';

        btn.innerHTML = \`
          <div class="flex items-center justify-between w-full">
            <div class="flex items-center gap-2 truncate">
              <span class="text-base">🛡️</span>
              <span class="font-bold text-xs truncate \${isSelected ? 'text-purple-200' : 'text-white'}">\${s.name}</span>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="text-[9px] px-1.5 py-0.2 rounded font-mono \${modeBadgeColor}">\${s.workflowMode}</span>
              \${isSelected ? '<i data-lucide="check" class="w-3.5 h-3.5 text-purple-400"></i>' : ''}
            </div>
          </div>
          <p class="text-[10px] text-slate-400 line-clamp-1">\${s.description || ''}</p>
          <div class="flex items-center gap-1 pt-1 border-t border-surface-750/50">
            <span class="text-[9px] text-slate-500 mr-1">Agentes:</span>
            \${members.map(m => \`<span title="\${m.name} (\${m.role})" class="text-xs">\${m.avatar}</span>\`).join('')}
          </div>
        \`;
        container.appendChild(btn);
      });
      lucide.createIcons();
    }

    function selectHeaderSquad(squadId) {
      pantheonState.activeSquadId = squadId;
      try {
        localStorage.setItem('andy_active_squad_id', squadId);
        if (typeof currentProjectId !== 'undefined' && currentProjectId) {
          localStorage.setItem('andy_active_squad_' + currentProjectId, squadId);
        }
      } catch (e) {}
      updateHeaderSquadButton();
      renderHeaderSquadDropdown();
      toggleSquadDropdown();
      renderChatMentionChips();
    }

    function toggleSquadDropdown() {
      const menu = document.getElementById('squadDropdownMenu');
      if (!menu) return;
      menu.classList.toggle('hidden');
      if (!menu.classList.contains('hidden')) {
        renderHeaderSquadDropdown();
        const input = document.getElementById('squadSearchInput');
        if (input) {
          input.value = '';
          input.focus();
        }
      }
    }

    function filterSquadDropdown(query) {
      const q = (query || '').toLowerCase().trim();
      const container = document.getElementById('squadsDropdownList');
      if (!container) return;
      const filtered = pantheonState.squads.filter(s => s.name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q));
      container.innerHTML = '';
      if (filtered.length === 0) {
        container.innerHTML = '<div class="p-4 text-center text-slate-400 text-xs">No se encontraron escuadrones.</div>';
        return;
      }
      filtered.forEach(s => {
        const isSelected = s.id === pantheonState.activeSquadId;
        const members = pantheonState.agents.filter(a => s.memberIds.includes(a.id));
        const btn = document.createElement('button');
        btn.className = 'w-full text-left p-2.5 rounded-xl border transition-all flex flex-col space-y-1.5 cursor-pointer ' +
          (isSelected ? 'bg-purple-600/20 border-purple-500/50 shadow-md' : 'bg-surface-800/80 border-surface-750 hover:bg-surface-750 hover:border-surface-600');
        btn.onclick = () => selectHeaderSquad(s.id);
        btn.innerHTML = \`
          <div class="flex items-center justify-between w-full">
            <div class="flex items-center gap-2 truncate">
              <span class="text-base">🛡️</span>
              <span class="font-bold text-xs truncate \${isSelected ? 'text-purple-200' : 'text-white'}">\${s.name}</span>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="text-[9px] px-1.5 py-0.2 rounded font-mono bg-purple-500/20 text-purple-300">\${s.workflowMode}</span>
              \${isSelected ? '<i data-lucide="check" class="w-3.5 h-3.5 text-purple-400"></i>' : ''}
            </div>
          </div>
          <p class="text-[10px] text-slate-400 line-clamp-1">\${s.description || ''}</p>
          <div class="flex items-center gap-1 pt-1 border-t border-surface-750/50">
            <span class="text-[9px] text-slate-500 mr-1">Agentes:</span>
            \${members.map(m => \`<span title="\${m.name} (\${m.role})" class="text-xs">\${m.avatar}</span>\`).join('')}
          </div>
        \`;
        container.appendChild(btn);
      });
      lucide.createIcons();
    }

    function renderChatMentionChips() {
      const container = document.getElementById('chatMentionChips');
      if (!container) return;
      container.innerHTML = '<span class="text-[10px] text-slate-400 font-semibold shrink-0 mr-0.5">Mencionar:</span>';
      pantheonState.agents.forEach(a => {
        const btn = document.createElement('button');
        btn.className = 'px-2 py-0.5 rounded-lg bg-surface-800 hover:bg-surface-750 border border-surface-700 font-mono text-[11px] transition-colors flex items-center gap-1 cursor-pointer shrink-0';
        btn.style.color = a.color || '#A78BFA';
        btn.innerHTML = \`<span>\${a.avatar}</span> <span>@\${a.name}</span>\`;
        btn.onclick = () => insertChatMention(a.name);
        container.appendChild(btn);
      });
    }

    function insertChatMention(name) {
      const input = document.getElementById('promptInput');
      if (!input) return;
      input.value = (input.value ? input.value.trim() + ' ' : '') + '@' + name + ' ';
      input.focus();
      autoExpandTextarea(input);
    }

    function openSquadInChat(squadId) {
      pantheonState.activeSquadId = squadId;
      try {
        localStorage.setItem('andy_active_squad_id', squadId);
        if (typeof currentProjectId !== 'undefined' && currentProjectId) {
          localStorage.setItem('andy_active_squad_' + currentProjectId, squadId);
        }
      } catch (e) {}
      updateHeaderSquadButton();
      renderChatMentionChips();
      switchView('chat');
    }

    function cleanPantheonOutput(text) {
      if (!text) return '';
      return text
        .replace(/<|tool_call_start|>[\\s\\S]*?<|tool_call_end|>/gi, '')
        .replace(/<|tool_call_start|>[\\s\\S]*$/gi, '')
        .replace(/<|im_start|>[\\s\\S]*?<|im_end|>/gi, '')
        .replace(/\`\`\`(?:file|write|filepath):\\s*([^\\r\\n]+)\\r?\\n([\\s\\S]*?)\`\`\`/gi, function(_, filePath, content) {
          const ext = (filePath.split('.').pop() || '').toLowerCase();
          const langMap = { ts: 'typescript', js: 'javascript', tsx: 'typescript', jsx: 'javascript', py: 'python', json: 'json', html: 'html', css: 'css', md: 'markdown', rs: 'rust', go: 'go', sh: 'bash' };
          const lang = langMap[ext] || '';
          return '\\n\\n\`\`\`' + lang + '\\n// Archivo en disco: ' + filePath.trim() + '\\n' + content + '\\n\`\`\`\\n\\n';
        })
        .replace(/\`\`\`(?:bash|terminal|test|sh):\\s*([^\\r\\n]+)\\r?\\n?([\\s\\S]*?)\`\`\`/gi, function(_, cmd, body) {
          const fullCmd = (cmd + '\\n' + (body || '')).trim();
          return '\\n\\n\`\`\`bash\\n# Comando ejecutado en terminal:\\n' + fullCmd + '\\n\`\`\`\\n\\n';
        })
        .replace(/<tool_call>\\s*([A-Za-z0-9_-]+)[\\s\\S]*?<arg_key>([^<]*)<\\/arg_key>[\\s\\S]*?<arg_value>([\\s\\S]*?)<\\/arg_value>\\s*<\\/tool_call>/gi, function(_, tool, _k, val) {
          return '\\n\\n\`\`\`bash\\n# Comando (' + tool + '):\\n' + val.trim() + '\\n\`\`\`\\n\\n';
        })
        .replace(/<tool_call>([\\s\\S]*?)<\\/tool_call>/gi, function(_, c) {
          return '\\n\\n\`\`\`text\\n' + c.trim() + '\\n\`\`\`\\n\\n';
        })
        .replace(/\\[read\\(file_path=[^\\]]*\\)\\]/gi, '')
        .replace(/\\[write\\(file_path=[^\\]]*\\)\\]/gi, '')
        .replace(/\\[execute\\(command=[^\\]]*\\)\\]/gi, '');
    }

    function renderPantheonAgents() {
      const container = document.getElementById('pantheonAgentsGrid');
      if (!container) return;
      container.innerHTML = '';

      if (pantheonState.agents.length === 0) {
        container.innerHTML = '<div class="col-span-full p-8 text-center text-slate-400">Cargando agentes Pantheon...</div>';
        return;
      }

      pantheonState.agents.forEach(a => {
        const card = document.createElement('div');
        card.className = 'bg-surface-850 border border-surface-750 hover:border-purple-500/40 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-lg transition-all';
        card.style.borderTop = \`3px solid \${a.color || '#8B5CF6'}\`;

        const caps = [];
        if (a.capabilities.write) caps.push('Write');
        if (a.capabilities.terminal) caps.push('Terminal');
        if (a.capabilities.graft) caps.push('Graft');
        if (a.capabilities.rlm) caps.push('RLM');
        if (a.capabilities.web) caps.push('Web');
        if (a.capabilities.mcp) caps.push('MCP');

        card.innerHTML = \`
          <div>
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2.5">
                <div class="w-10 h-10 rounded-2xl flex items-center justify-center text-xl bg-surface-800 border border-surface-700 shadow-sm">
                  \${a.avatar || '🤖'}
                </div>
                <div>
                  <h4 class="font-bold text-sm text-white flex items-center gap-1.5">
                    \${a.name}
                    \${a.isSystem ? '<span class="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">Sistema</span>' : ''}
                  </h4>
                  <span class="text-[10px] text-slate-400 line-clamp-1">\${a.role}</span>
                </div>
              </div>
            </div>

            <p class="text-[11px] text-slate-300 mt-2.5 line-clamp-3 leading-relaxed">\${a.systemPrompt}</p>

            <div class="space-y-1.5 pt-3 border-t border-surface-800 text-[11px]">
              <div class="flex items-center justify-between text-slate-400">
                <span>Modelo:</span>
                <span class="font-mono text-purple-300 font-semibold truncate max-w-[140px]">\${a.model}</span>
              </div>
              <div class="flex items-center justify-between text-slate-400">
                <span>Temperatura:</span>
                <span class="font-mono text-slate-200">\${a.temperature}</span>
              </div>
              <div class="pt-1 flex flex-wrap gap-1">
                \${caps.map(c => \`<span class="text-[9px] px-1.5 py-0.5 rounded bg-surface-800 text-slate-300 font-mono">\${c}</span>\`).join('')}
              </div>
            </div>
          </div>

          <div class="pt-2 flex items-center justify-end gap-1.5 border-t border-surface-800">
            <button onclick="openEditAgentModal('\${a.id}')" class="px-2.5 py-1 rounded-lg bg-surface-800 hover:bg-surface-700 text-slate-200 text-xs flex items-center gap-1 transition-colors cursor-pointer">
              <i data-lucide="edit-3" class="w-3 h-3"></i>
              <span>Editar</span>
            </button>
            \${!a.isSystem ? \`
              <button onclick="deletePantheonAgent('\${a.id}')" class="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            \` : ''}
          </div>
        \`;
        container.appendChild(card);
      });
      lucide.createIcons();
    }

    function populatePantheonModelDatalist() {
      const datalist = document.getElementById('pAgentModelDatalist');
      const optionsContainer = document.getElementById('pantheonModelOptionsList');
      const badge = document.getElementById('pAgentActiveProviderBadge');
      const countBadge = document.getElementById('pantheonModelCountBadge');
      if (!datalist) return;

      const activeCat = providerCatalogs.find(c => c.providerId === currentProviderId) || { providerName: currentProviderId || 'Omniroute' };
      if (badge) {
        badge.innerText = \`Activo: \${activeCat.providerName.split(' ')[0]}\`;
      }

      datalist.innerHTML = '';
      if (optionsContainer) optionsContainer.innerHTML = '';

      let allModels = [];

      // 1. Put Active Provider models first
      if (activeCat && Array.isArray(activeCat.models)) {
        activeCat.models.forEach(m => {
          allModels.push({
            model: m,
            providerId: activeCat.providerId,
            providerName: activeCat.providerName,
            isActiveProvider: true
          });
        });
      }

      // 2. Add other providers
      providerCatalogs.forEach(cat => {
        if (cat.providerId === currentProviderId) return;
        (cat.models || []).forEach(m => {
          allModels.push({
            model: m,
            providerId: cat.providerId,
            providerName: cat.providerName,
            isActiveProvider: false
          });
        });
      });

      // Fallback defaults if catalogs not loaded
      if (allModels.length === 0) {
        ['auto/best-coding', 'gpt-4o', 'claude-3-5-sonnet', 'gemini-2.0-flash', 'deepseek-coder'].forEach(m => {
          allModels.push({
            model: m,
            providerId: 'omniroute',
            providerName: 'Omniroute',
            isActiveProvider: true
          });
        });
      }

      if (countBadge) countBadge.innerText = \`\${allModels.length} modelos\`;

      // Populate native datalist
      allModels.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.model;
        opt.label = \`\${item.providerName}\${item.isActiveProvider ? ' ★ (Activo)' : ''}\`;
        datalist.appendChild(opt);
      });

      // Populate interactive options list
      if (optionsContainer) {
        renderPantheonModelOptionItems(allModels);
      }
    }

    function renderPantheonModelOptionItems(items) {
      const container = document.getElementById('pantheonModelOptionsList');
      if (!container) return;
      container.innerHTML = '';

      if (items.length === 0) {
        container.innerHTML = '<div class="p-3 text-center text-slate-400 text-xs">No se encontraron modelos coincidentes.</div>';
        return;
      }

      const currVal = (document.getElementById('pAgentModel')?.value || '').trim().toLowerCase();

      items.forEach(item => {
        const btn = document.createElement('button');
        btn.type = 'button';
        const isSelected = item.model.toLowerCase() === currVal;
        btn.className = \`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer \${
          isSelected ? 'bg-purple-600/25 text-purple-200 border border-purple-500/40 font-semibold' : 'text-slate-200 hover:bg-surface-750 hover:text-white'
        }\`;
        btn.onclick = () => selectPantheonAgentModel(item.model);

        btn.innerHTML = \`
          <div class="truncate flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full \${item.isActiveProvider ? 'bg-emerald-400' : 'bg-surface-600'} shrink-0"></span>
            <span class="font-mono text-xs truncate">\${item.model}</span>
          </div>
          <span class="text-[10px] \${item.isActiveProvider ? 'text-emerald-400 font-semibold' : 'text-slate-400'} shrink-0 ml-1.5">\${item.providerName.split(' ')[0]}</span>
        \`;
        container.appendChild(btn);
      });
    }

    function togglePantheonModelDropdown() {
      const menu = document.getElementById('pantheonModelDropdownMenu');
      if (!menu) return;
      const isHidden = menu.classList.contains('hidden');
      if (isHidden) {
        populatePantheonModelDatalist();
        menu.classList.remove('hidden');
        const searchInput = document.getElementById('pantheonModelSearchInput');
        if (searchInput) {
          searchInput.value = '';
          searchInput.focus();
        }
      } else {
        menu.classList.add('hidden');
      }
    }

    function filterPantheonModelList(query) {
      const q = (query || '').toLowerCase().trim();
      let allModels = [];

      const activeCat = providerCatalogs.find(c => c.providerId === currentProviderId) || { providerName: currentProviderId || 'Omniroute' };
      if (activeCat && Array.isArray(activeCat.models)) {
        activeCat.models.forEach(m => {
          allModels.push({ model: m, providerId: activeCat.providerId, providerName: activeCat.providerName, isActiveProvider: true });
        });
      }

      providerCatalogs.forEach(cat => {
        if (cat.providerId === currentProviderId) return;
        (cat.models || []).forEach(m => {
          allModels.push({ model: m, providerId: cat.providerId, providerName: cat.providerName, isActiveProvider: false });
        });
      });

      if (allModels.length === 0) {
        ['auto/best-coding', 'gpt-4o', 'claude-3-5-sonnet', 'gemini-2.0-flash', 'deepseek-coder'].forEach(m => {
          allModels.push({ model: m, providerId: 'omniroute', providerName: 'Omniroute', isActiveProvider: true });
        });
      }

      if (q) {
        allModels = allModels.filter(i => i.model.toLowerCase().includes(q) || i.providerName.toLowerCase().includes(q));
      }

      renderPantheonModelOptionItems(allModels);
    }

    function selectPantheonAgentModel(modelId) {
      const modelInput = document.getElementById('pAgentModel');
      if (modelInput) {
        modelInput.value = modelId;
      }
      const menu = document.getElementById('pantheonModelDropdownMenu');
      if (menu) {
        menu.classList.add('hidden');
      }
    }

    function openCreateAgentModal() {
      document.getElementById('pantheonAgentModalTitle').innerText = 'Crear Nuevo Agente Pantheon';
      document.getElementById('pAgentId').value = 'agent_' + Math.random().toString(36).substring(2, 7);
      document.getElementById('pAgentId').readOnly = false;
      document.getElementById('pAgentName').value = '';
      document.getElementById('pAgentAvatar').value = '🤖';
      document.getElementById('pAgentRole').value = '';
      document.getElementById('pAgentColor').value = '#8B5CF6';
      document.getElementById('pAgentModel').value = currentModelId || 'auto/best-coding';
      document.getElementById('pAgentTemp').value = '0.2';
      document.getElementById('pAgentTempLabel').innerText = '0.2';
      document.getElementById('pAgentSystemPrompt').value = '';
      document.getElementById('pAgentIsSystem').value = 'false';
      document.getElementById('pCapWrite').checked = true;
      document.getElementById('pCapTerminal').checked = true;
      document.getElementById('pCapGraft').checked = true;
      document.getElementById('pCapRlm').checked = true;
      document.getElementById('pCapWeb').checked = true;
      document.getElementById('pCapMcp').checked = true;
      populatePantheonModelDatalist();
      document.getElementById('pantheonAgentModal').classList.remove('hidden');
    }

    function openEditAgentModal(agentId) {
      const agent = pantheonState.agents.find(a => a.id === agentId);
      if (!agent) return;
      document.getElementById('pantheonAgentModalTitle').innerText = \`Editar Agente @\${agent.name}\`;
      document.getElementById('pAgentId').value = agent.id;
      document.getElementById('pAgentId').readOnly = true;
      document.getElementById('pAgentName').value = agent.name;
      document.getElementById('pAgentAvatar').value = agent.avatar || '🤖';
      document.getElementById('pAgentRole').value = agent.role;
      document.getElementById('pAgentColor').value = agent.color || '#8B5CF6';
      document.getElementById('pAgentModel').value = agent.model;
      document.getElementById('pAgentTemp').value = String(agent.temperature ?? 0.2);
      document.getElementById('pAgentTempLabel').innerText = String(agent.temperature ?? 0.2);
      document.getElementById('pAgentSystemPrompt').value = agent.systemPrompt;
      document.getElementById('pAgentIsSystem').value = String(agent.isSystem || false);
      document.getElementById('pCapWrite').checked = Boolean(agent.capabilities?.write);
      document.getElementById('pCapTerminal').checked = Boolean(agent.capabilities?.terminal);
      document.getElementById('pCapGraft').checked = Boolean(agent.capabilities?.graft);
      document.getElementById('pCapRlm').checked = Boolean(agent.capabilities?.rlm);
      document.getElementById('pCapWeb').checked = Boolean(agent.capabilities?.web);
      document.getElementById('pCapMcp').checked = Boolean(agent.capabilities?.mcp);
      populatePantheonModelDatalist();
      document.getElementById('pantheonAgentModal').classList.remove('hidden');
    }

    function closePantheonAgentModal() {
      const menu = document.getElementById('pantheonModelDropdownMenu');
      if (menu) menu.classList.add('hidden');
      document.getElementById('pantheonAgentModal').classList.add('hidden');
    }

    async function submitSavePantheonAgent() {
      const id = document.getElementById('pAgentId').value.trim();
      const name = document.getElementById('pAgentName').value.trim();
      const avatar = document.getElementById('pAgentAvatar').value.trim() || '🤖';
      const role = document.getElementById('pAgentRole').value.trim();
      const color = document.getElementById('pAgentColor').value;
      const model = document.getElementById('pAgentModel').value.trim() || 'auto/best-coding';
      const temperature = parseFloat(document.getElementById('pAgentTemp').value) || 0.2;
      const systemPrompt = document.getElementById('pAgentSystemPrompt').value.trim();
      const isSystem = document.getElementById('pAgentIsSystem').value === 'true';

      const capabilities = {
        write: document.getElementById('pCapWrite').checked,
        terminal: document.getElementById('pCapTerminal').checked,
        graft: document.getElementById('pCapGraft').checked,
        rlm: document.getElementById('pCapRlm').checked,
        web: document.getElementById('pCapWeb').checked,
        mcp: document.getElementById('pCapMcp').checked,
      };

      try {
        const res = await fetch(\`/v1/pantheon/agents?projectId=\${encodeURIComponent(currentProjectId)}\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id, name, avatar, role, color, model, temperature, systemPrompt, capabilities, isSystem
          })
        });
        const data = await res.json();
        if (data.success) {
          closePantheonAgentModal();
          await fetchPantheonAgents();
          renderPantheonAgents();
          renderPantheonMentionChips();
        } else {
          alert('Error al guardar agente: ' + (data.error || 'Desconocido'));
        }
      } catch (err) {
        alert('Error al conectar con el servidor: ' + err.message);
      }
    }

    async function deletePantheonAgent(agentId) {
      if (!confirm(\`¿Eliminar agente @\${agentId}?\`)) return;
      try {
        const res = await fetch(\`/v1/pantheon/agents/\${encodeURIComponent(agentId)}?projectId=\${encodeURIComponent(currentProjectId)}\`, {
          method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
          await fetchPantheonAgents();
          renderPantheonAgents();
          renderPantheonMentionChips();
        } else {
          alert('No se puede eliminar este agente.');
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }

    function renderPantheonTopology() {
      const container = document.getElementById('pantheonTopologyDiagram');
      if (!container) return;
      container.innerHTML = '';

      const squad = pantheonState.squads.find(s => s.id === pantheonState.activeSquadId) || pantheonState.squads[0];
      if (!squad) return;

      const leader = pantheonState.agents.find(a => a.id === squad.leaderId) || pantheonState.agents[0];
      const members = pantheonState.agents.filter(a => squad.memberIds.includes(a.id) && a.id !== leader?.id);

      const wrapper = document.createElement('div');
      wrapper.className = 'w-full max-w-2xl flex flex-col items-center space-y-6';

      wrapper.innerHTML = \`
        <!-- Leader Node -->
        <div class="flex flex-col items-center space-y-2">
          <div class="px-5 py-3 rounded-2xl bg-surface-850 border-2 shadow-xl flex items-center gap-3 transition-all hover:scale-105" style="border-color: \${leader?.color || '#8B5CF6'}">
            <span class="text-2xl">\${leader?.avatar || '👑'}</span>
            <div>
              <div class="font-bold text-sm text-white flex items-center gap-1.5">
                \${leader?.name || 'Leader'}
                <span class="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">Squad Leader</span>
              </div>
              <div class="text-[10px] text-slate-400">\${leader?.role}</div>
            </div>
          </div>
          <div class="h-6 w-0.5 bg-gradient-to-b from-purple-500 to-indigo-500"></div>
        </div>

        <!-- Squad Connection Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-\${Math.min(3, Math.max(1, members.length))} gap-4 w-full">
          \${members.map(m => \`
            <div class="bg-surface-850 border border-surface-750 hover:border-purple-500/50 p-3.5 rounded-2xl flex flex-col justify-between space-y-2 shadow-lg transition-all" style="border-top: 3px solid \${m.color || '#3B82F6'}">
              <div class="flex items-center gap-2">
                <span class="text-xl">\${m.avatar}</span>
                <div class="min-w-0">
                  <div class="font-bold text-xs text-white truncate" style="color: \${m.color}">\${m.name}</div>
                  <div class="text-[10px] text-slate-400 truncate">\${m.role}</div>
                </div>
              </div>
              <div class="text-[10px] text-slate-400 font-mono bg-surface-900 p-1.5 rounded-lg border border-surface-800 truncate">\${m.model}</div>
            </div>
          \`).join('')}
        </div>

        <!-- Shared Core Systems Footprint -->
        <div class="w-full pt-4 border-t border-surface-800 flex items-center justify-around text-xs text-slate-400">
          <span class="flex items-center gap-1 text-cyan-300"><i data-lucide="git-fork" class="w-3.5 h-3.5"></i> Graft Shared AST</span>
          <span class="flex items-center gap-1 text-purple-300"><i data-lucide="brain" class="w-3.5 h-3.5"></i> RLM Recursive Tree</span>
          <span class="flex items-center gap-1 text-emerald-300"><i data-lucide="terminal" class="w-3.5 h-3.5"></i> System Terminal</span>
        </div>
      \`;
      container.appendChild(wrapper);
      lucide.createIcons();
    }

    function renderPantheonSquadsList() {
      const container = document.getElementById('pantheonSquadsGrid');
      if (!container) return;
      container.innerHTML = '';

      if (pantheonState.squads.length === 0) {
        container.innerHTML = '<div class="col-span-full p-6 text-center text-slate-400">Cargando escuadrones...</div>';
        return;
      }

      pantheonState.squads.forEach(s => {
        const leader = pantheonState.agents.find(a => a.id === s.leaderId) || { name: s.leaderId, avatar: '👑', color: '#8B5CF6' };
        const members = pantheonState.agents.filter(a => s.memberIds.includes(a.id));

        const card = document.createElement('div');
        card.className = 'bg-surface-850 border border-surface-750 hover:border-indigo-500/40 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-lg transition-all';
        card.style.borderTop = '3px solid #6366F1';

        card.innerHTML = \`
          <div>
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2">
                <div class="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-base">
                  🛡️
                </div>
                <div>
                  <h4 class="font-bold text-sm text-white flex items-center gap-1.5">
                    \${s.name}
                    \${s.isSystem ? '<span class="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Preset</span>' : ''}
                  </h4>
                  <span class="text-[10px] text-indigo-300 font-mono">Modo: \${s.workflowMode}</span>
                </div>
              </div>
            </div>

            <p class="text-[11px] text-slate-300 mt-2 line-clamp-2 leading-relaxed">\${s.description || 'Sin descripción'}</p>

            <div class="space-y-1.5 pt-2.5 border-t border-surface-800 text-[11px]">
              <div class="flex items-center justify-between text-slate-400">
                <span>Líder:</span>
                <span class="font-semibold text-white flex items-center gap-1">
                  <span>\${leader.avatar}</span>
                  <span>@\${leader.name}</span>
                </span>
              </div>
              <div class="flex items-center justify-between text-slate-400">
                <span>Miembros (\${members.length}):</span>
                <div class="flex items-center gap-1">
                  \${members.map(m => \`<span title="\${m.name}" class="text-sm">\${m.avatar}</span>\`).join('')}
                </div>
              </div>
            </div>
          </div>

          <div class="pt-2 flex items-center justify-end gap-1.5 border-t border-surface-800">
            <button onclick="openSquadInChat('\${s.id}')" class="px-3 py-1 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition-all cursor-pointer">
              <i data-lucide="message-square" class="w-3.5 h-3.5"></i>
              <span>Abrir en Chat</span>
            </button>
            <button onclick="openEditSquadModal('\${s.id}')" class="px-2 py-1 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-300 text-xs flex items-center gap-1 transition-colors cursor-pointer">
              <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
            </button>
            \${!s.isSystem ? \`
              <button onclick="deletePantheonSquad('\${s.id}')" class="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            \` : ''}
          </div>
        \`;
        container.appendChild(card);
      });
      lucide.createIcons();
    }

    function openCreateSquadModal() {
      document.getElementById('pantheonSquadModalTitle').innerText = 'Crear Nuevo Escuadrón Pantheon';
      document.getElementById('pSquadId').value = 'squad_' + Math.random().toString(36).substring(2, 7);
      document.getElementById('pSquadName').value = '';
      document.getElementById('pSquadDesc').value = '';
      document.getElementById('pSquadWorkflowMode').value = 'hierarchical';

      const leaderSelect = document.getElementById('pSquadLeaderSelect');
      const membersContainer = document.getElementById('pSquadMembersCheckboxes');
      leaderSelect.innerHTML = '';
      membersContainer.innerHTML = '';

      pantheonState.agents.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.id;
        opt.innerText = \`\${a.avatar} @\${a.name} (\${a.role})\`;
        leaderSelect.appendChild(opt);

        const label = document.createElement('label');
        label.className = 'flex items-center gap-1.5 text-slate-300 text-xs cursor-pointer';
        label.innerHTML = \`
          <input type="checkbox" value="\${a.id}" checked class="rounded bg-surface-700 border-surface-600 text-indigo-500">
          <span>\${a.avatar} @\${a.name}</span>
        \`;
        membersContainer.appendChild(label);
      });

      document.getElementById('pantheonSquadModal').classList.remove('hidden');
    }

    function openEditSquadModal(squadId) {
      const squad = pantheonState.squads.find(s => s.id === squadId);
      if (!squad) return;

      document.getElementById('pantheonSquadModalTitle').innerText = \`Editar Escuadrón: \${squad.name}\`;
      document.getElementById('pSquadId').value = squad.id;
      document.getElementById('pSquadName').value = squad.name;
      document.getElementById('pSquadDesc').value = squad.description || '';
      document.getElementById('pSquadWorkflowMode').value = squad.workflowMode || 'hierarchical';

      const leaderSelect = document.getElementById('pSquadLeaderSelect');
      const membersContainer = document.getElementById('pSquadMembersCheckboxes');
      leaderSelect.innerHTML = '';
      membersContainer.innerHTML = '';

      pantheonState.agents.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.id;
        opt.innerText = \`\${a.avatar} @\${a.name} (\${a.role})\`;
        if (a.id === squad.leaderId) opt.selected = true;
        leaderSelect.appendChild(opt);

        const isMember = squad.memberIds.includes(a.id);
        const label = document.createElement('label');
        label.className = 'flex items-center gap-1.5 text-slate-300 text-xs cursor-pointer';
        label.innerHTML = \`
          <input type="checkbox" value="\${a.id}" \${isMember ? 'checked' : ''} class="rounded bg-surface-700 border-surface-600 text-indigo-500">
          <span>\${a.avatar} @\${a.name}</span>
        \`;
        membersContainer.appendChild(label);
      });

      document.getElementById('pantheonSquadModal').classList.remove('hidden');
    }

    function closePantheonSquadModal() {
      document.getElementById('pantheonSquadModal').classList.add('hidden');
    }

    async function submitSavePantheonSquad() {
      const id = document.getElementById('pSquadId').value.trim();
      const name = document.getElementById('pSquadName').value.trim();
      const description = document.getElementById('pSquadDesc').value.trim();
      const leaderId = document.getElementById('pSquadLeaderSelect').value;
      const workflowMode = document.getElementById('pSquadWorkflowMode').value;

      const checkedBoxes = document.querySelectorAll('#pSquadMembersCheckboxes input[type="checkbox"]:checked');
      const memberIds = Array.from(checkedBoxes).map(c => c.value);
      if (!memberIds.includes(leaderId)) memberIds.unshift(leaderId);

      try {
        const res = await fetch(\`/v1/pantheon/squads?projectId=\${encodeURIComponent(currentProjectId)}\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, name, description, leaderId, memberIds, workflowMode })
        });
        const data = await res.json();
        if (data.success) {
          closePantheonSquadModal();
          await fetchPantheonSquads();
          renderPantheonSquadSelect();
          renderPantheonSquadsList();
          renderPantheonTopology();
        } else {
          alert('Error al guardar escuadrón: ' + (data.error || 'Desconocido'));
        }
      } catch (err) {
        alert('Error al conectar: ' + err.message);
      }
    }

    async function deletePantheonSquad(squadId) {
      if (!confirm(\`¿Eliminar escuadrón \${squadId}?\`)) return;
      try {
        const res = await fetch(\`/v1/pantheon/squads/\${encodeURIComponent(squadId)}?projectId=\${encodeURIComponent(currentProjectId)}\`, {
          method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
          await fetchPantheonSquads();
          renderPantheonSquadSelect();
          renderPantheonSquadsList();
          renderPantheonTopology();
        } else {
          alert('No se puede eliminar este escuadrón.');
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }

    // --- WORKSPACE FILES & DIRECT EDITOR ---
    async function refreshWorkspaceFiles() {
      const container = document.getElementById('fileListContainer');
      container.innerHTML = '<div class="p-4 text-slate-400 text-center">Listando archivos...</div>';
      try {
        const res = await fetch('/api/files');
        const data = await res.json();
        container.innerHTML = '';
        data.files.forEach(f => {
          const btn = document.createElement('button');
          btn.className = 'w-full text-left px-2.5 py-1.5 rounded hover:bg-surface-750 flex items-center gap-2 truncate text-slate-300';
          btn.onclick = () => previewAndEditFile(f);
          btn.innerHTML = \`<i data-lucide="file" class="w-3.5 h-3.5 text-slate-400 shrink-0"></i><span class="truncate">\${f}</span>\`;
          container.appendChild(btn);
        });
        lucide.createIcons();
      } catch (e) {
        container.innerHTML = '<div class="p-4 text-rose-400 text-center">Error al listar archivos</div>';
      }
    }

    async function previewAndEditFile(filePath) {
      activeWorkspaceFilePath = filePath;
      document.getElementById('previewFileName').innerText = filePath;
      const editor = document.getElementById('filePreviewEditor');
      editor.value = 'Cargando contenido...';
      try {
        const res = await fetch(\`/api/files/read?path=\${encodeURIComponent(filePath)}\`);
        const data = await res.json();
        editor.value = data.content || '';
      } catch (e) {
        editor.value = 'Error: ' + e.message;
      }
    }

    async function saveActiveWorkspaceFile() {
      if (!activeWorkspaceFilePath) return alert('Selecciona un archivo primero');
      const editor = document.getElementById('filePreviewEditor');
      const status = document.getElementById('fileSaveStatus');
      status.innerText = 'Guardando...';
      try {
        const res = await fetch('/api/files/write', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath: activeWorkspaceFilePath, content: editor.value })
        });
        const data = await res.json();
        if (data.success) {
          status.innerText = '✓ Guardado exitosamente';
          setTimeout(() => { status.innerText = ''; }, 3000);
        }
      } catch (e) {
        status.innerText = 'Error al guardar: ' + e.message;
      }
    }

    // --- BRANDING & WHITE-LABEL CUSTOMIZATION LOGIC ---
    const DEFAULT_BRANDING = {
      appName: 'Andy Agent',
      appSlogan: 'Context Engine & WebUI',
      appBadge: 'RLM',
      logoType: 'icon',
      logoValue: 'Ψ',
      logoGradient: 'from-brand-600 to-indigo-500'
    };

    let appBrandingState = { ...DEFAULT_BRANDING };

    function initAppBranding() {
      try {
        const stored = localStorage.getItem('andy_custom_branding');
        if (stored) {
          appBrandingState = { ...DEFAULT_BRANDING, ...JSON.parse(stored) };
          applyBranding(appBrandingState);
        }
      } catch (e) {}

      fetch('/api/branding')
        .then(r => r.json())
        .then(data => {
          if (data && data.branding) {
            appBrandingState = { ...DEFAULT_BRANDING, ...data.branding };
            applyBranding(appBrandingState);
          }
        })
        .catch(() => {});
    }

    function applyBranding(b) {
      const nameEl = document.getElementById('appNameText');
      const badgeEl = document.getElementById('appBadgeText');
      const sloganEl = document.getElementById('appSloganText');
      const logoEl = document.getElementById('appLogoContainer');

      if (nameEl) nameEl.innerText = b.appName || 'Andy Agent';
      if (badgeEl) {
        if (b.appBadge && b.appBadge.trim()) {
          badgeEl.innerText = b.appBadge.trim();
          badgeEl.classList.remove('hidden');
        } else {
          badgeEl.classList.add('hidden');
        }
      }
      if (sloganEl) {
        if (b.appSlogan && b.appSlogan.trim()) {
          sloganEl.innerText = b.appSlogan.trim();
          sloganEl.classList.remove('hidden');
        } else {
          sloganEl.classList.add('hidden');
        }
      }

      if (logoEl) {
        logoEl.className = 'w-8 h-8 rounded-lg bg-gradient-to-tr ' + (b.logoGradient || 'from-brand-600 to-indigo-500') + ' flex items-center justify-center shadow-lg shadow-brand-500/20 font-bold text-white tracking-wider shrink-0 overflow-hidden text-base';
        if (b.logoType === 'image' && b.logoValue) {
          logoEl.innerHTML = '<img src="' + b.logoValue + '" alt="Logo" class="w-full h-full object-contain p-0.5 rounded-lg">';
        } else {
          logoEl.innerHTML = b.logoValue || 'Ψ';
        }
      }

      document.title = (b.appName || 'Andy Agent') + (b.appSlogan ? ' - ' + b.appSlogan : '');
    }

    function populateBrandingForm(b) {
      const nameIn = document.getElementById('brandingAppName');
      const sloganIn = document.getElementById('brandingAppSlogan');
      const badgeIn = document.getElementById('brandingAppBadge');
      const logoValIn = document.getElementById('brandingLogoValue');
      const imgUrlIn = document.getElementById('brandingImageUrlInput');

      if (nameIn) nameIn.value = b.appName || '';
      if (sloganIn) sloganIn.value = b.appSlogan || '';
      if (badgeIn) badgeIn.value = b.appBadge || '';
      if (logoValIn) logoValIn.value = b.logoType === 'icon' ? (b.logoValue || 'Ψ') : 'Ψ';
      if (imgUrlIn) imgUrlIn.value = b.logoType === 'image' ? (b.logoValue || '') : '';

      setBrandingLogoMode(b.logoType || 'icon', false);
      updateBrandingLivePreview();
    }

    function setBrandingLogoMode(mode, updatePreview) {
      appBrandingState.logoType = mode;
      const iconContainer = document.getElementById('brandingIconModeContainer');
      const imageContainer = document.getElementById('brandingImageModeContainer');
      const iconBtn = document.getElementById('bModeIconBtn');
      const imageBtn = document.getElementById('bModeImageBtn');

      if (mode === 'image') {
        if (iconContainer) iconContainer.classList.add('hidden');
        if (imageContainer) imageContainer.classList.remove('hidden');
        if (iconBtn) iconBtn.className = 'px-2.5 py-1 rounded font-medium text-slate-400 hover:text-white cursor-pointer';
        if (imageBtn) imageBtn.className = 'px-2.5 py-1 rounded font-medium bg-brand-600 text-white cursor-pointer';
      } else {
        if (iconContainer) iconContainer.classList.remove('hidden');
        if (imageContainer) imageContainer.classList.add('hidden');
        if (iconBtn) iconBtn.className = 'px-2.5 py-1 rounded font-medium bg-brand-600 text-white cursor-pointer';
        if (imageBtn) imageBtn.className = 'px-2.5 py-1 rounded font-medium text-slate-400 hover:text-white cursor-pointer';
      }
      if (updatePreview !== false) updateBrandingLivePreview();
    }

    function quickSelectLogo(char) {
      const input = document.getElementById('brandingLogoValue');
      if (input) {
        input.value = char;
        setBrandingLogoMode('icon', false);
        updateBrandingLivePreview();
      }
    }

    function setLogoGradient(gradientClass) {
      appBrandingState.logoGradient = gradientClass;
      updateBrandingLivePreview();
    }

    function handleBrandingFileUpload(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(e) {
        const dataUrl = e.target.result;
        const imgUrlInput = document.getElementById('brandingImageUrlInput');
        if (imgUrlInput) imgUrlInput.value = dataUrl;
        setBrandingLogoMode('image', false);
        updateBrandingLivePreview();
      };
      reader.readAsDataURL(file);
    }

    function updateBrandingLivePreview() {
      const name = (document.getElementById('brandingAppName')?.value || 'Andy Agent').trim();
      const slogan = (document.getElementById('brandingAppSlogan')?.value || '').trim();
      const badge = (document.getElementById('brandingAppBadge')?.value || '').trim();
      const mode = appBrandingState.logoType || 'icon';
      const logoVal = mode === 'image'
        ? (document.getElementById('brandingImageUrlInput')?.value || '').trim()
        : (document.getElementById('brandingLogoValue')?.value || 'Ψ').trim();
      const gradient = appBrandingState.logoGradient || 'from-brand-600 to-indigo-500';

      const prevName = document.getElementById('brandingPreviewName');
      const prevSlogan = document.getElementById('brandingPreviewSlogan');
      const prevBadge = document.getElementById('brandingPreviewBadge');
      const prevLogo = document.getElementById('brandingPreviewLogo');

      if (prevName) prevName.innerText = name || 'Andy Agent';
      if (prevBadge) {
        if (badge) {
          prevBadge.innerText = badge;
          prevBadge.classList.remove('hidden');
        } else {
          prevBadge.classList.add('hidden');
        }
      }
      if (prevSlogan) {
        if (slogan) {
          prevSlogan.innerText = slogan;
          prevSlogan.classList.remove('hidden');
        } else {
          prevSlogan.classList.add('hidden');
        }
      }
      if (prevLogo) {
        prevLogo.className = 'w-8 h-8 rounded-lg bg-gradient-to-tr ' + gradient + ' flex items-center justify-center shadow-lg shadow-brand-500/20 font-bold text-white tracking-wider shrink-0 text-base overflow-hidden';
        if (mode === 'image' && logoVal) {
          prevLogo.innerHTML = '<img src="' + logoVal + '" alt="Logo" class="w-full h-full object-contain p-0.5 rounded-lg">';
        } else {
          prevLogo.innerHTML = logoVal || 'Ψ';
        }
      }
    }

    function resetBrandingDefaults() {
      if (!confirm('¿Restablecer el nombre, eslogan, insignia y logo a los valores por defecto de Andy Agent?')) return;
      appBrandingState = { ...DEFAULT_BRANDING };
      populateBrandingForm(appBrandingState);
      applyBranding(appBrandingState);
      try {
        localStorage.removeItem('andy_custom_branding');
      } catch (e) {}
      fetch('/api/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(DEFAULT_BRANDING)
      }).catch(() => {});
    }

    // --- SETTINGS MODAL (9 TABS) ---
    function switchSettingsTab(tab) {
      ['setTabModels', 'setTabAutoLearn', 'setTabThinking', 'setTabRlm', 'setTabCompaction', 'setTabMcp', 'setTabShell', 'setTabMedia', 'setTabAppearance'].forEach(t => {
        const el = document.getElementById(t);
        if (el) el.classList.add('hidden');
      });
      ['setTabModelsBtn', 'setTabAutoLearnBtn', 'setTabThinkingBtn', 'setTabRlmBtn', 'setTabCompactionBtn', 'setTabMcpBtn', 'setTabShellBtn', 'setTabMediaBtn', 'setTabAppearanceBtn'].forEach(b => {
        const el = document.getElementById(b);
        if (el) el.className = 'px-3 py-2 font-medium text-slate-400 hover:text-white';
      });

      const tabMap = {
        models: { panel: 'setTabModels', btn: 'setTabModelsBtn' },
        autolearn: { panel: 'setTabAutoLearn', btn: 'setTabAutoLearnBtn' },
        thinking: { panel: 'setTabThinking', btn: 'setTabThinkingBtn' },
        rlm: { panel: 'setTabRlm', btn: 'setTabRlmBtn' },
        compaction: { panel: 'setTabCompaction', btn: 'setTabCompactionBtn' },
        mcp: { panel: 'setTabMcp', btn: 'setTabMcpBtn' },
        shell: { panel: 'setTabShell', btn: 'setTabShellBtn' },
        media: { panel: 'setTabMedia', btn: 'setTabMediaBtn' },
        appearance: { panel: 'setTabAppearance', btn: 'setTabAppearanceBtn' },
      };

      if (tabMap[tab]) {
        document.getElementById(tabMap[tab].panel).classList.remove('hidden');
        document.getElementById(tabMap[tab].btn).className = 'px-3 py-2 font-medium border-b-2 border-brand-500 text-brand-300';
      }
      if (tab === 'mcp') fetchMcpServers();
    }

    async function openSettingsModal() {
      document.getElementById('settingsModal').classList.remove('hidden');
      try {
        if (!providerCatalogs || providerCatalogs.length === 0) {
          await fetchModelCatalogs();
        }

        const [settingsRes, autoLearnRes] = await Promise.all([
          fetch('/api/settings').then(r => r.json()),
          fetch('/api/autolearn').then(r => r.json()).catch(() => ({}))
        ]);

        const defProvider = settingsRes.defaults?.defaultProvider || currentProviderId || 'omniroute';
        const defModel = settingsRes.defaults?.defaultModel || currentModelId || 'auto/best-coding';

        // Populate Provider Select
        const provSelect = document.getElementById('settingDefaultProvider');
        provSelect.innerHTML = '';
        providerCatalogs.forEach(cat => {
          const opt = document.createElement('option');
          opt.value = cat.providerId;
          opt.innerText = \`\${cat.providerName} \${cat.isActive ? '(Activo)' : ''}\`;
          if (cat.providerId === defProvider) {
            opt.selected = true;
          }
          provSelect.appendChild(opt);
        });

        // Populate Models for selected provider
        populateSettingsModelSelect(defProvider, defModel);

        if (settingsRes.defaults) {
          const settingBaseUrl = document.getElementById('settingBaseUrl');
          if (settingBaseUrl) {
            settingBaseUrl.value = settingsRes.defaults.customBaseUrl || 'http://ia.v2nethost.cl:20128/v1';
          }
          document.getElementById('settingRlmMaxDepth').value = settingsRes.defaults.rlmMaxDepth ?? 2;
          if (settingsRes.defaults.compaction) {
            document.getElementById('settingCompactionEnabled').checked = settingsRes.defaults.compaction.enabled !== false;
          }
        }

        // Populate Auto-Learn configuration
        if (autoLearnRes.config) {
          document.getElementById('settingAutoLearnEnabled').checked = autoLearnRes.config.enabled !== false;
          document.getElementById('settingAutoUpdateMemory').checked = autoLearnRes.config.autoUpdateMemory !== false;
          document.getElementById('settingAutoCreateSkills').checked = autoLearnRes.config.autoCreateSkills !== false;
          document.getElementById('settingAutoLearnScope').value = autoLearnRes.config.scope || 'project';
        }

        // Populate Branding form
        populateBrandingForm(appBrandingState);
      } catch (e) {
        console.error('Error opening settings modal:', e);
      }
    }

    function onSettingsProviderChange(providerId) {
      populateSettingsModelSelect(providerId);
    }

    function populateSettingsModelSelect(providerId, preferredModel) {
      const modelSelect = document.getElementById('settingDefaultModel');
      const countBadge = document.getElementById('settingModelCountBadge');
      if (!modelSelect) return;
      modelSelect.innerHTML = '';

      const cat = providerCatalogs.find(c => c.providerId === providerId);
      const cached = providerModelsCache[providerId] || (cat ? cat.models : []);
      const models = (cached && cached.length > 0) ? cached : ['auto/best-coding', 'gpt-4o', 'claude-3-5-sonnet-20241022'];

      if (countBadge) {
        countBadge.innerText = \`(\${models.length} modelos)\`;
      }

      const topModel = preferredModel || (cat ? cat.models[0] : models[0]);

      models.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        const isFav = m.includes('coding') || m.includes('sonnet') || m.includes('gpt-4') || m.includes('coder');
        opt.innerText = \`\${isFav ? '★ ' : ''}\${m}\`;
        if (m === preferredModel || (!preferredModel && m === topModel)) {
          opt.selected = true;
        }
        modelSelect.appendChild(opt);
      });
    }

    function closeSettingsModal() {
      document.getElementById('settingsModal').classList.add('hidden');
    }

    async function saveSettings() {
      const defaultProvider = document.getElementById('settingDefaultProvider').value.trim();
      const defaultModel = document.getElementById('settingDefaultModel').value.trim();
      const rlmMaxDepth = document.getElementById('settingRlmMaxDepth').value;
      const compactionEnabled = document.getElementById('settingCompactionEnabled').checked;

      const baseUrlInput = document.getElementById('settingBaseUrl');
      const apiKeyInput = document.getElementById('settingApiKey');
      const customBaseUrl = baseUrlInput ? baseUrlInput.value.trim() : '';
      const customApiKey = apiKeyInput ? apiKeyInput.value.trim() : '';

      const autoLearnEnabled = document.getElementById('settingAutoLearnEnabled').checked;
      const autoUpdateMemory = document.getElementById('settingAutoUpdateMemory').checked;
      const autoCreateSkills = document.getElementById('settingAutoCreateSkills').checked;
      const autoLearnScope = document.getElementById('settingAutoLearnScope').value;

      // Extract Branding Settings
      const brandingAppName = (document.getElementById('brandingAppName')?.value || 'Andy Agent').trim();
      const brandingAppSlogan = (document.getElementById('brandingAppSlogan')?.value || '').trim();
      const brandingAppBadge = (document.getElementById('brandingAppBadge')?.value || '').trim();
      const brandingMode = appBrandingState.logoType || 'icon';
      const brandingLogoValue = brandingMode === 'image'
        ? (document.getElementById('brandingImageUrlInput')?.value || '').trim()
        : (document.getElementById('brandingLogoValue')?.value || 'Ψ').trim();
      const brandingLogoGradient = appBrandingState.logoGradient || 'from-brand-600 to-indigo-500';

      const brandingPayload = {
        appName: brandingAppName || 'Andy Agent',
        appSlogan: brandingAppSlogan,
        appBadge: brandingAppBadge,
        logoType: brandingMode,
        logoValue: brandingLogoValue || 'Ψ',
        logoGradient: brandingLogoGradient
      };

      appBrandingState = brandingPayload;
      applyBranding(appBrandingState);
      try {
        localStorage.setItem('andy_custom_branding', JSON.stringify(brandingPayload));
      } catch (e) {}

      const payload = {
        defaultModel,
        defaultProvider,
        customBaseUrl,
        customApiKey,
        customProvider: defaultProvider,
        rlmMaxDepth: Number(rlmMaxDepth),
        compaction: { enabled: compactionEnabled },
        branding: brandingPayload
      };

      try {
        await Promise.all([
          fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }),
          fetch('/api/branding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(brandingPayload)
          }),
          fetch('/api/providers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider: defaultProvider,
              baseUrl: customBaseUrl,
              apiKey: customApiKey,
              defaultModel
            })
          }),
          fetch('/api/autolearn', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              enabled: autoLearnEnabled,
              autoUpdateMemory,
              autoCreateSkills,
              scope: autoLearnScope
            })
          })
        ]);

        currentProviderId = defaultProvider;
        currentModelId = defaultModel;
        selectedDropdownProviderId = defaultProvider;

        // Update telemetry badge
        const badge = document.getElementById('autoLearnBadge');
        const dot = document.getElementById('autoLearnDot');
        if (badge) badge.innerText = autoLearnEnabled ? 'Activo' : 'Pausado';
        if (dot) dot.className = autoLearnEnabled ? 'w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse' : 'w-1.5 h-1.5 rounded-full bg-slate-500';

        await fetchModelCatalogs();
        await fetchProviders();

        closeSettingsModal();
        alert(\`Configuración guardada exitosamente.\\n\\nMarca: \${brandingPayload.appName}\\nProveedor: \${defaultProvider}\\nModelo: \${defaultModel}\`);
      } catch (e) {
        alert('Error al guardar configuración: ' + e.message);
      }
    }

    async function fetchMcpServers() {
      const container = document.getElementById('mcpServerList');
      container.innerHTML = 'Cargando servidores MCP...';
      try {
        const res = await fetch('/api/mcp');
        const data = await res.json();
        container.innerHTML = '';
        const keys = Object.keys(data.mcpServers || {});
        if (keys.length === 0) {
          container.innerHTML = '<div class="text-slate-400">No hay servidores MCP personalizados registrados.</div>';
          return;
        }
        keys.forEach(k => {
          const s = data.mcpServers[k];
          const div = document.createElement('div');
          div.className = 'flex items-center justify-between bg-surface-750 p-2.5 rounded-lg border border-surface-700';
          div.innerHTML = \`
            <div>
              <span class="font-bold text-white font-mono">\${k}</span>
              <span class="text-[10px] text-slate-400 block">\${s.url || s.command}</span>
            </div>
            <button onclick="removeMcpServer('\${k}')" class="text-rose-400 hover:text-rose-300 text-xs">Eliminar</button>
          \`;
          container.appendChild(div);
        });
      } catch (e) {
        container.innerHTML = 'Error al cargar servidores MCP';
      }
    }

    async function addMcpServer() {
      const name = document.getElementById('newMcpName').value.trim();
      const url = document.getElementById('newMcpUrl').value.trim();
      if (!name || !url) return alert('Ingresa nombre y URL/comando');
      await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          config: url.startsWith('http') ? { type: 'http', url } : { type: 'stdio', command: url }
        })
      });
      document.getElementById('newMcpName').value = '';
      document.getElementById('newMcpUrl').value = '';
      await fetchMcpServers();
    }

    async function removeMcpServer(name) {
      if (!confirm(\`¿Eliminar servidor MCP \${name}?\`)) return;
      await fetch(\`/api/mcp/\${name}\`, { method: 'DELETE' });
      await fetchMcpServers();
    }

    // --- API KEYS & IDE INTEGRATION ---
    function switchIdeGuide(guide) {
      ['ideGuideVscode', 'ideGuideKilocode', 'ideGuidePython'].forEach(g => {
        const el = document.getElementById(g);
        if (el) el.classList.add('hidden');
      });
      ['ideTabVscodeBtn', 'ideTabKilocodeBtn', 'ideTabPythonBtn'].forEach(b => {
        const el = document.getElementById(b);
        if (el) el.className = 'px-3 py-1.5 rounded-lg font-medium text-slate-300 hover:text-white hover:bg-surface-750 flex items-center gap-1.5 transition-colors';
      });

      if (guide === 'vscode') {
        document.getElementById('ideGuideVscode').classList.remove('hidden');
        document.getElementById('ideTabVscodeBtn').className = 'px-3 py-1.5 rounded-lg font-medium bg-brand-600 text-white flex items-center gap-1.5 transition-colors';
      } else if (guide === 'kilocode') {
        document.getElementById('ideGuideKilocode').classList.remove('hidden');
        document.getElementById('ideTabKilocodeBtn').className = 'px-3 py-1.5 rounded-lg font-medium bg-brand-600 text-white flex items-center gap-1.5 transition-colors';
      } else if (guide === 'python') {
        document.getElementById('ideGuidePython').classList.remove('hidden');
        document.getElementById('ideTabPythonBtn').className = 'px-3 py-1.5 rounded-lg font-medium bg-brand-600 text-white flex items-center gap-1.5 transition-colors';
      }
    }

    async function fetchApiKeys() {
      const container = document.getElementById('apiKeysListContainer');
      const baseInput = document.getElementById('apiBaseUrlDisplay');
      if (baseInput) {
        baseInput.value = window.location.origin + '/v1';
      }
      container.innerHTML = '<div class="text-slate-400 p-6 text-center">Cargando claves API...</div>';
      try {
        const res = await fetch('/api/keys');
        const data = await res.json();
        renderApiKeysList(data.keys || []);
      } catch (err) {
        container.innerHTML = '<div class="text-rose-400 p-6 text-center">Error al cargar claves API: ' + err.message + '</div>';
      }
    }

    function renderApiKeysList(keys) {
      const container = document.getElementById('apiKeysListContainer');
      if (!container) return;
      container.innerHTML = '';

      if (!keys || keys.length === 0) {
        container.innerHTML = \`
          <div class="p-6 text-center text-slate-400 bg-surface-800/40 rounded-xl border border-surface-750/50">
            <i data-lucide="key" class="w-8 h-8 mx-auto mb-2 text-slate-500 opacity-60"></i>
            <p class="font-medium text-slate-300">No hay claves API registradas</p>
            <p class="text-[11px] text-slate-500 mt-0.5">Crea una clave API para conectar Kilo Code, VS Code o Cursor.</p>
            <button onclick="openCreateApiKeyModal()" class="mt-3 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-lg text-xs">
              + Crear Primera Clave
            </button>
          </div>
        \`;
        lucide.createIcons();
        return;
      }

      keys.forEach(k => {
        const isActive = k.status === 'active';
        const card = document.createElement('div');
        card.className = 'flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-surface-800/80 hover:bg-surface-800 border border-surface-750 rounded-xl transition-all';
        
        const createdDate = new Date(k.createdAt).toLocaleDateString();
        const lastUsedText = k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : 'Sin uso reciente';
        const rawKeyEscaped = encodeURIComponent(k.key);

        card.innerHTML = \`
          <div class="space-y-1 overflow-hidden">
            <div class="flex items-center gap-2">
              <span class="font-bold text-white text-xs">\${k.name}</span>
              <span class="text-[9px] px-1.5 py-0.5 rounded-full font-mono \${isActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}">
                \${isActive ? 'Activa' : 'Revocada'}
              </span>
            </div>
            <div class="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
              <span class="bg-surface-900 px-2 py-0.5 rounded border border-surface-750 text-slate-300 select-all">\${k.maskedKey}</span>
              <button onclick="copyMessageText(this, decodeURIComponent('\${rawKeyEscaped}'))" title="Copiar clave completa" class="text-brand-400 hover:text-brand-300 p-1 rounded hover:bg-surface-700 transition-colors">
                <i data-lucide="copy" class="w-3.5 h-3.5"></i>
              </button>
            </div>
            <div class="text-[10px] text-slate-500 flex items-center gap-3">
              <span>Creada: \${createdDate}</span>
              <span>Último uso: \${lastUsedText}</span>
            </div>
          </div>

          <div class="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
            \${isActive ? \`
              <button onclick="revokeApiKey('\${k.id}')" title="Revocar clave" class="px-2.5 py-1 rounded-lg bg-surface-750 hover:bg-surface-700 text-slate-300 hover:text-white text-[11px] transition-colors">
                Revocar
              </button>
            \` : ''}
            <button onclick="deleteApiKey('\${k.id}')" title="Eliminar clave" class="p-1.5 rounded-lg bg-surface-750 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 text-[11px] transition-colors">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        \`;
        container.appendChild(card);
      });
      lucide.createIcons();
    }

    function openCreateApiKeyModal() {
      document.getElementById('createApiKeyModal').classList.remove('hidden');
      document.getElementById('newKeyNameInput').value = '';
      document.getElementById('newKeyNameInput').focus();
    }

    function closeCreateApiKeyModal() {
      document.getElementById('createApiKeyModal').classList.add('hidden');
    }

    async function saveNewApiKey() {
      const nameInput = document.getElementById('newKeyNameInput');
      const expiresSelect = document.getElementById('newKeyExpiresSelect');
      const name = nameInput.value.trim() || 'Nueva API Key';
      const days = Number(expiresSelect.value);
      const expiresAt = days > 0 ? Date.now() + (days * 24 * 60 * 60 * 1000) : null;

      try {
        const res = await fetch('/api/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, expiresAt })
        });
        const data = await res.json();
        if (data.success) {
          closeCreateApiKeyModal();
          await fetchApiKeys();
          alert('¡Clave API creada exitosamente!\\n\\n' + data.key.key + '\\n\\n(Copia esta clave ahora para configurarla en tu IDE).');
        } else {
          alert('Error al crear clave: ' + (data.error || 'Desconocido'));
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }

    async function revokeApiKey(id) {
      if (!confirm('¿Seguro que deseas revocar esta API Key? Los IDEs conectados con ella dejarán de tener acceso.')) return;
      try {
        await fetch('/api/keys/' + id + '/revoke', { method: 'POST' });
        await fetchApiKeys();
      } catch (e) {
        alert('Error al revocar: ' + e.message);
      }
    }

    async function deleteApiKey(id) {
      if (!confirm('¿Seguro que deseas eliminar permanentemente esta API Key?')) return;
      try {
        await fetch('/api/keys/' + id, { method: 'DELETE' });
        await fetchApiKeys();
      } catch (e) {
        alert('Error al eliminar: ' + e.message);
      }
    }

    // --- AUTHENTICATION & USER MANAGEMENT CLIENT LOGIC ---
    async function checkAuthSession() {
      if (!authToken) {
        showLoginOverlay();
        return false;
      }
      try {
        const res = await originalFetch('/api/auth/me', {
          headers: { 'Authorization': 'Bearer ' + authToken }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            currentUser = data.user;
            updateUserInterface();
            hideLoginOverlay();
            return true;
          }
        }
      } catch (e) {
        console.warn('Auth verification failed:', e);
      }
      showLoginOverlay();
      return false;
    }

    function showLoginOverlay(errMsg) {
      const overlay = document.getElementById('loginOverlay');
      if (overlay) overlay.classList.remove('hidden');
      const errAlert = document.getElementById('loginErrorAlert');
      const errText = document.getElementById('loginErrorText');
      if (errMsg && errAlert && errText) {
        errText.innerText = errMsg;
        errAlert.classList.remove('hidden');
      } else if (errAlert) {
        errAlert.classList.add('hidden');
      }
      const userInput = document.getElementById('loginUsernameInput');
      if (userInput) setTimeout(() => userInput.focus(), 100);
      lucide.createIcons();
    }

    function hideLoginOverlay() {
      const overlay = document.getElementById('loginOverlay');
      if (overlay) overlay.classList.add('hidden');
    }

    function togglePasswordVisibility(inputId, btn) {
      const input = document.getElementById(inputId);
      if (!input) return;
      if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = '<i data-lucide="eye-off" class="w-4 h-4"></i>';
      } else {
        input.type = 'password';
        btn.innerHTML = '<i data-lucide="eye" class="w-4 h-4"></i>';
      }
      lucide.createIcons();
    }

    async function submitLogin() {
      const usernameInput = document.getElementById('loginUsernameInput');
      const passwordInput = document.getElementById('loginPasswordInput');
      const rememberCheckbox = document.getElementById('loginRememberMeCheckbox');
      const errAlert = document.getElementById('loginErrorAlert');
      const errText = document.getElementById('loginErrorText');
      const submitBtn = document.getElementById('loginSubmitBtn');

      const username = (usernameInput?.value || '').trim();
      const password = passwordInput?.value || '';
      const rememberMe = Boolean(rememberCheckbox?.checked);

      if (!username || !password) {
        if (errText && errAlert) {
          errText.innerText = 'Ingresa tu usuario y contraseña.';
          errAlert.classList.remove('hidden');
        }
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="animate-spin inline-block mr-2">◌</span> Verificando...';
      }

      try {
        const res = await originalFetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, rememberMe })
        });
        const data = await res.json();
        if (data.success && data.token) {
          authToken = data.token;
          currentUser = data.user;
          localStorage.setItem('andy_session_token', authToken);
          updateUserInterface();
          hideLoginOverlay();
          if (errAlert) errAlert.classList.add('hidden');
          await initializeApp();
        } else {
          if (errText && errAlert) {
            errText.innerText = data.error || 'Credenciales incorrectas.';
            errAlert.classList.remove('hidden');
          }
        }
      } catch (e) {
        if (errText && errAlert) {
          errText.innerText = 'Error de conexión con el servidor: ' + e.message;
          errAlert.classList.remove('hidden');
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i data-lucide="log-in" class="w-4 h-4"></i> Iniciar Sesión';
          lucide.createIcons();
        }
      }
    }

    async function performLogout() {
      if (!confirm('¿Seguro que deseas cerrar tu sesión?')) return;
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch (e) {}
      authToken = '';
      currentUser = null;
      localStorage.removeItem('andy_session_token');
      toggleUserDropdown(false);
      showLoginOverlay('Has cerrado sesión correctamente.');
    }

    function updateUserInterface() {
      if (!currentUser) return;
      const nameLabel = document.getElementById('headerUserName');
      const roleBadge = document.getElementById('headerUserRoleBadge');
      const avatarLetter = document.getElementById('userAvatarLetter');
      const dropdownDisplayName = document.getElementById('userDropdownDisplayName');
      const dropdownUsername = document.getElementById('userDropdownUsername');
      const tabUsersBtn = document.getElementById('tabUsersBtn');
      const userDropdownUsersAdminBtn = document.getElementById('userDropdownUsersAdminBtn');

      const displayName = currentUser.displayName || currentUser.username;
      if (nameLabel) nameLabel.innerText = displayName;
      if (roleBadge) {
        roleBadge.innerText = currentUser.role === 'admin' ? 'admin' : 'usuario';
        roleBadge.className = currentUser.role === 'admin' 
          ? 'hidden sm:inline text-[9px] px-1 py-0.2 rounded bg-brand-500/20 text-brand-300 font-mono'
          : 'hidden sm:inline text-[9px] px-1 py-0.2 rounded bg-slate-700 text-slate-300 font-mono';
      }
      if (avatarLetter) avatarLetter.innerText = displayName.charAt(0).toUpperCase();
      if (dropdownDisplayName) dropdownDisplayName.innerText = displayName;
      if (dropdownUsername) dropdownUsername.innerText = '@' + currentUser.username;

      if (currentUser.role === 'admin') {
        if (tabUsersBtn) tabUsersBtn.classList.remove('hidden');
        if (userDropdownUsersAdminBtn) userDropdownUsersAdminBtn.classList.remove('hidden');
      } else {
        if (tabUsersBtn) tabUsersBtn.classList.add('hidden');
        if (userDropdownUsersAdminBtn) userDropdownUsersAdminBtn.classList.add('hidden');
      }
      setTimeout(updateFooterNavScrollButtons, 100);
      lucide.createIcons();
    }

    function toggleUserDropdown(forceState) {
      const menu = document.getElementById('userDropdownMenu');
      if (!menu) return;
      if (typeof forceState === 'boolean') {
        if (forceState) menu.classList.remove('hidden');
        else menu.classList.add('hidden');
      } else {
        menu.classList.toggle('hidden');
      }
    }

    // --- CHANGE PASSWORD MODAL ---
    function openChangePasswordModal() {
      document.getElementById('changePasswordModal').classList.remove('hidden');
      document.getElementById('currPasswordInput').value = '';
      document.getElementById('changeNewPasswordInput').value = '';
      document.getElementById('changeConfirmPasswordInput').value = '';
      const errAlert = document.getElementById('changePasswordErrorAlert');
      if (errAlert) errAlert.classList.add('hidden');
      lucide.createIcons();
    }

    function closeChangePasswordModal() {
      document.getElementById('changePasswordModal').classList.add('hidden');
    }

    async function submitChangePassword() {
      const oldPassword = document.getElementById('currPasswordInput').value;
      const newPassword = document.getElementById('changeNewPasswordInput').value;
      const confirmPassword = document.getElementById('changeConfirmPasswordInput').value;
      const errAlert = document.getElementById('changePasswordErrorAlert');
      const errText = document.getElementById('changePasswordErrorText');

      if (!oldPassword || !newPassword) {
        if (errText && errAlert) {
          errText.innerText = 'Completa todos los campos obligatorios.';
          errAlert.classList.remove('hidden');
        }
        return;
      }

      if (newPassword !== confirmPassword) {
        if (errText && errAlert) {
          errText.innerText = 'La nueva contraseña y su confirmación no coinciden.';
          errAlert.classList.remove('hidden');
        }
        return;
      }

      if (newPassword.length < 4) {
        if (errText && errAlert) {
          errText.innerText = 'La nueva contraseña debe tener al menos 4 caracteres.';
          errAlert.classList.remove('hidden');
        }
        return;
      }

      try {
        const res = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oldPassword, newPassword })
        });
        const data = await res.json();
        if (data.success) {
          closeChangePasswordModal();
          alert('✓ Contraseña actualizada exitosamente.');
        } else {
          if (errText && errAlert) {
            errText.innerText = data.error || 'Error al cambiar contraseña.';
            errAlert.classList.remove('hidden');
          }
        }
      } catch (err) {
        if (errText && errAlert) {
          errText.innerText = 'Error: ' + err.message;
          errAlert.classList.remove('hidden');
        }
      }
    }

    // --- USERS MANAGEMENT (CRUD) ---
    async function fetchUsersList() {
      const tableBody = document.getElementById('usersTableBody');
      const countLabel = document.getElementById('usersTableCount');
      if (!tableBody) return;

      tableBody.innerHTML = '<tr><td colspan="7" class="px-4 py-8 text-center text-slate-500 italic">Cargando usuarios...</td></tr>';

      try {
        const res = await fetch('/api/auth/users');
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) {
          if (countLabel) countLabel.innerText = data.users.length;
          renderUsersTable(data.users);
        } else {
          tableBody.innerHTML = \`<tr><td colspan="7" class="px-4 py-8 text-center text-rose-400">Error: \${data.error || 'No se pudieron cargar los usuarios'}</td></tr>\`;
        }
      } catch (e) {
        tableBody.innerHTML = \`<tr><td colspan="7" class="px-4 py-8 text-center text-rose-400">Error de red: \${e.message}</td></tr>\`;
      }
    }

    function renderUsersTable(users) {
      const tableBody = document.getElementById('usersTableBody');
      if (!tableBody) return;
      tableBody.innerHTML = '';

      if (users.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="px-4 py-8 text-center text-slate-500 italic">No hay usuarios registrados.</td></tr>';
        return;
      }

      users.forEach(u => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-surface-800/50 transition-colors';

        const createdDate = new Date(u.createdAt).toLocaleDateString();
        const lastLogin = u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Nunca';
        const isSelf = currentUser && currentUser.id === u.id;

        const roleBadge = u.role === 'admin'
          ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Administrador</span>'
          : '<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-700 text-slate-300">Usuario</span>';

        const statusBadge = u.status === 'active'
          ? '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Activo</span>'
          : '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30"><span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span> Desactivado</span>';

        const safeUser = JSON.stringify(u).replace(/"/g, '&quot;');

        tr.innerHTML = \`
          <td class="px-4 py-3 font-mono font-medium text-white flex items-center gap-2">
            <div class="w-6 h-6 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-[10px] font-bold text-white shadow-sm shrink-0">
              \${(u.displayName || u.username).charAt(0).toUpperCase()}
            </div>
            <span>\${u.username}</span>
            \${isSelf ? '<span class="text-[9px] bg-brand-500/20 text-brand-300 px-1 py-0.2 rounded font-mono">Tú</span>' : ''}
          </td>
          <td class="px-4 py-3 text-slate-300">\${u.displayName || u.username}</td>
          <td class="px-4 py-3">\${roleBadge}</td>
          <td class="px-4 py-3">\${statusBadge}</td>
          <td class="px-4 py-3 text-slate-400 text-[11px]">\${createdDate}</td>
          <td class="px-4 py-3 text-slate-400 text-[11px] font-mono">\${lastLogin}</td>
          <td class="px-4 py-3 text-right">
            <div class="flex items-center justify-end gap-1.5">
              <button onclick='openEditUserModal(\${safeUser})' title="Editar usuario o restablecer clave" class="p-1.5 rounded-lg bg-surface-750 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 text-xs transition-colors">
                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
              </button>
              \${!isSelf ? \`
                <button onclick="deleteUserById('\${u.id}', '\${u.username}')" title="Eliminar usuario" class="p-1.5 rounded-lg bg-surface-750 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 text-xs transition-colors">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              \` : ''}
            </div>
          </td>
        \`;
        tableBody.appendChild(tr);
      });
      lucide.createIcons();
    }

    function openCreateUserModal() {
      document.getElementById('createUserModal').classList.remove('hidden');
      document.getElementById('newUsernameInput').value = '';
      document.getElementById('newDisplayNameInput').value = '';
      document.getElementById('newPasswordInput').value = '';
      document.getElementById('newRoleSelect').value = 'user';
      document.getElementById('newUsernameInput').focus();
    }

    function closeCreateUserModal() {
      document.getElementById('createUserModal').classList.add('hidden');
    }

    async function submitCreateUser() {
      const username = document.getElementById('newUsernameInput').value.trim();
      const displayName = document.getElementById('newDisplayNameInput').value.trim();
      const password = document.getElementById('newPasswordInput').value;
      const role = document.getElementById('newRoleSelect').value;

      if (!username) return alert('Ingresa un nombre de usuario.');
      if (!password || password.length < 4) return alert('La contraseña debe tener al menos 4 caracteres.');

      try {
        const res = await fetch('/api/auth/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, displayName, password, role })
        });
        const data = await res.json();
        if (data.success) {
          closeCreateUserModal();
          await fetchUsersList();
          alert(\`✓ Usuario "\${data.user.username}" creado exitosamente.\`);
        } else {
          alert('Error al crear usuario: ' + (data.error || 'Desconocido'));
        }
      } catch (e) {
        alert('Error: ' + e.message);
      }
    }

    function openEditUserModal(user) {
      document.getElementById('editUserModal').classList.remove('hidden');
      document.getElementById('editUserIdHidden').value = user.id;
      document.getElementById('editUserModalTitleName').innerText = user.username;
      document.getElementById('editDisplayNameInput').value = user.displayName || user.username;
      document.getElementById('editRoleSelect').value = user.role || 'user';
      document.getElementById('editStatusSelect').value = user.status || 'active';
      document.getElementById('editNewPasswordInput').value = '';
    }

    function closeEditUserModal() {
      document.getElementById('editUserModal').classList.add('hidden');
    }

    async function submitEditUser() {
      const userId = document.getElementById('editUserIdHidden').value;
      const displayName = document.getElementById('editDisplayNameInput').value.trim();
      const role = document.getElementById('editRoleSelect').value;
      const status = document.getElementById('editStatusSelect').value;
      const newPassword = document.getElementById('editNewPasswordInput').value;

      try {
        const res = await fetch('/api/auth/users/' + userId, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName, role, status, newPassword: newPassword || undefined })
        });
        const data = await res.json();
        if (data.success) {
          closeEditUserModal();
          await fetchUsersList();
          alert('✓ Usuario actualizado exitosamente.');
        } else {
          alert('Error al actualizar usuario: ' + (data.error || 'Desconocido'));
        }
      } catch (e) {
        alert('Error: ' + e.message);
      }
    }

    async function deleteUserById(userId, username) {
      if (!confirm(\`¿Estás seguro de eliminar al usuario "\${username}"?\\n\\nEsta acción cerrará todas sus sesiones activas.\`)) return;
      try {
        const res = await fetch('/api/auth/users/' + userId, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          await fetchUsersList();
          alert('✓ Usuario eliminado exitosamente.');
        } else {
          alert('Error al eliminar usuario: ' + (data.error || 'Desconocido'));
        }
      } catch (e) {
        alert('Error: ' + e.message);
      }
    }

    document.addEventListener('click', (e) => {
      const pMenu = document.getElementById('pantheonModelDropdownMenu');
      if (pMenu && !pMenu.classList.contains('hidden')) {
        const isClickInside = pMenu.contains(e.target) || e.target.closest('#pAgentModel') || e.target.closest('button[onclick*="togglePantheonModelDropdown"]');
        if (!isClickInside) {
          pMenu.classList.add('hidden');
        }
      }
    });
  </script>
</body>
</html>`;
}
