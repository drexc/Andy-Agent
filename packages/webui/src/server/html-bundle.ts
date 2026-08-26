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
  </style>
</head>
<body class="bg-surface-900 text-slate-100 min-h-[100dvh] h-[100dvh] max-h-[100dvh] h-screen w-full flex overflow-hidden antialiased">

  <!-- Mobile Backdrop Overlay for Sidebar Drawer -->
  <div id="sidebarBackdrop" onclick="toggleSidebar(false)" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"></div>

  <!-- ========================================================================= -->
  <!-- SIDEBAR (DRAWER ON MOBILE) -->
  <!-- ========================================================================= -->
  <aside id="sidebar" class="fixed inset-y-0 left-0 z-50 transform -translate-x-full md:translate-x-0 md:relative md:flex transition-transform duration-300 ease-in-out w-72 max-w-[85vw] bg-surface-850 border-r border-surface-750 flex flex-col justify-between shrink-0 shadow-2xl md:shadow-none h-full overflow-hidden">
    <div class="p-4 border-b border-surface-750 flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20 font-bold text-white tracking-wider">
          Ψ
        </div>
        <div>
          <h1 class="font-bold text-sm leading-tight text-white flex items-center gap-1.5">
            Andy Agent
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-100 font-mono">RLM</span>
          </h1>
          <p class="text-[11px] text-slate-400">Context Engine & WebUI</p>
        </div>
      </div>
      <button onclick="toggleSidebar()" class="text-slate-400 hover:text-white p-1 rounded-md hover:bg-surface-750 md:hidden">
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
    <div class="p-3">
      <button onclick="createNewSession()" class="w-full bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-medium text-xs py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 shadow-md shadow-brand-600/20 transition-all duration-150">
        <i data-lucide="plus" class="w-4 h-4"></i>
        Nueva Conversación
      </button>
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
        <button onclick="toggleTheme()" title="Cambiar tema" class="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-surface-750">
          <i data-lucide="moon" class="w-4 h-4"></i>
        </button>
      </div>
    </div>
  </aside>

  <!-- ========================================================================= -->
  <!-- MAIN WORKSPACE -->
  <!-- ========================================================================= -->
  <main class="flex-1 flex flex-col h-full overflow-hidden bg-surface-900 relative">
    
    <!-- Header Navigation -->
    <header class="h-14 border-b border-surface-750 bg-surface-850/90 backdrop-blur px-2.5 sm:px-4 flex items-center justify-between z-20 shrink-0">
      <div class="flex items-center gap-2 sm:gap-3 overflow-hidden">
        <button onclick="toggleSidebar()" aria-label="Menu" class="text-slate-300 hover:text-white p-2 rounded-lg hover:bg-surface-750 transition-colors shrink-0">
          <i data-lucide="panel-left" class="w-5 h-5"></i>
        </button>

        <!-- Project Badge in Header -->
        <button onclick="openProjectsModal()" title="Proyecto activo - Clic para cambiar" class="hidden sm:flex items-center gap-1.5 bg-surface-800 hover:bg-surface-750 border border-surface-700/80 px-2.5 py-1 rounded-lg text-xs text-slate-300 hover:text-white transition-colors max-w-[170px] md:max-w-[240px] truncate shrink-0">
          <i data-lucide="folder-kanban" class="w-3.5 h-3.5 text-cyan-400 shrink-0"></i>
          <span id="headerProjectName" class="truncate font-medium">Proyecto Principal</span>
        </button>

        <div class="h-5 w-px bg-surface-700 hidden sm:block shrink-0"></div>

        <!-- Navigation Tabs (Horizontally scrollable on mobile) -->
        <nav class="flex items-center gap-1 bg-surface-800/90 p-1 rounded-lg border border-surface-700/60 text-xs overflow-x-auto no-scrollbar max-w-[calc(100vw-180px)] sm:max-w-none flex-nowrap scroll-smooth">
          <button id="tabChatBtn" onclick="switchView('chat')" class="px-2.5 py-1 rounded-md font-medium text-white bg-brand-600 shadow-sm flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0">
            <i data-lucide="message-square" class="w-3.5 h-3.5"></i>
            Chat & RLM
          </button>
          <button id="tabProvidersBtn" onclick="switchView('providers')" class="px-2.5 py-1 rounded-md font-medium text-slate-300 hover:text-white hover:bg-surface-700/50 flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0">
            <i data-lucide="zap" class="w-3.5 h-3.5 text-amber-400"></i>
            Proveedores
          </button>
          <button id="tabGraftBtn" onclick="switchView('graft')" class="px-2.5 py-1 rounded-md font-medium text-slate-300 hover:text-white hover:bg-surface-700/50 flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0">
            <i data-lucide="git-fork" class="w-3.5 h-3.5 text-cyan-400"></i>
            Graft Studio
          </button>
          <button id="tabMemoryBtn" onclick="switchView('memory')" class="px-2.5 py-1 rounded-md font-medium text-slate-300 hover:text-white hover:bg-surface-700/50 flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0">
            <i data-lucide="brain" class="w-3.5 h-3.5 text-purple-400"></i>
            Memoria
          </button>
          <button id="tabSkillsBtn" onclick="switchView('skills')" class="px-2.5 py-1 rounded-md font-medium text-slate-300 hover:text-white hover:bg-surface-700/50 flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0">
            <i data-lucide="sparkles" class="w-3.5 h-3.5 text-indigo-400"></i>
            Skills
          </button>
          <button id="tabTreeBtn" onclick="switchView('tree')" class="px-2.5 py-1 rounded-md font-medium text-slate-300 hover:text-white hover:bg-surface-700/50 flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0">
            <i data-lucide="git-branch" class="w-3.5 h-3.5 text-rose-400"></i>
            Ramas
          </button>
          <button id="tabLogsBtn" onclick="switchView('logs')" class="px-2.5 py-1 rounded-md font-medium text-slate-300 hover:text-white hover:bg-surface-700/50 flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0">
            <i data-lucide="scroll-text" class="w-3.5 h-3.5 text-emerald-400"></i>
            Logs
          </button>
          <button id="tabFilesBtn" onclick="switchView('files')" class="px-2.5 py-1 rounded-md font-medium text-slate-300 hover:text-white hover:bg-surface-700/50 flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0">
            <i data-lucide="folder-tree" class="w-3.5 h-3.5 text-amber-400"></i>
            Archivos
          </button>
        </nav>
      </div>

      <!-- Controls -->
      <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <!-- Model Selector Dropdown with Provider Categorization -->
        <div class="relative">
          <button onclick="toggleModelDropdown()" id="modelSelectorBtn" class="flex items-center gap-1.5 bg-surface-800 hover:bg-surface-750 border border-surface-700 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 transition-colors shadow-sm max-w-[125px] sm:max-w-[200px] md:max-w-none truncate">
            <span id="selectedProviderDot" class="w-2 h-2 rounded-full bg-brand-500 shrink-0"></span>
            <span id="selectedModelLabel" class="truncate text-[11px] sm:text-xs">auto/best-coding</span>
            <i data-lucide="chevron-down" class="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0"></i>
          </button>
          
          <!-- Rich Categorized Dropdown Popover (Centered modal on smartphone) -->
          <div id="modelDropdownMenu" class="hidden fixed inset-x-3 top-16 md:absolute md:inset-auto md:right-0 md:top-auto md:mt-1.5 md:w-96 max-w-[calc(100vw-1.5rem)] bg-surface-850 border border-surface-700 rounded-xl shadow-2xl z-50 text-xs overflow-hidden flex flex-col max-h-[75vh] md:max-h-[28rem]">
            <!-- Search bar -->
            <div class="p-2.5 border-b border-surface-750 bg-surface-800/80">
              <div class="relative">
                <i data-lucide="search" class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5"></i>
                <input id="modelSearchInput" type="text" placeholder="Buscar modelo (ej: best-coding, gpt-4o, claude)..." oninput="filterDropdownCatalog(this.value)" class="w-full bg-surface-750 border border-surface-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-brand-500">
              </div>
            </div>

            <!-- Provider Selection Tabs -->
            <div id="dropdownProviderTabs" class="flex items-center gap-1 p-1.5 border-b border-surface-750 bg-surface-800 overflow-x-auto no-scrollbar text-[10px]"></div>

            <!-- Dynamic Model List -->
            <div id="modelsDropdownList" class="flex-1 overflow-y-auto p-1.5 space-y-0.5 max-h-64 select-none"></div>

            <!-- Footer link to Providers tab -->
            <div class="p-2 border-t border-surface-750 bg-surface-800/50 flex items-center justify-between text-[11px] text-slate-400">
              <span id="dropdownModelCountText">0 modelos</span>
              <button onclick="switchView('providers'); toggleModelDropdown();" class="text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1">
                <i data-lucide="settings" class="w-3 h-3"></i>
                Gestionar Proveedores
              </button>
            </div>
          </div>
        </div>

        <select id="thinkingLevelSelect" onchange="setThinkingLevel(this.value)" class="hidden sm:block bg-surface-800 hover:bg-surface-750 border border-surface-700 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-300 focus:outline-none focus:border-brand-500 cursor-pointer">
          <option value="off">Thinking: Off</option>
          <option value="low">Thinking: Low</option>
          <option value="medium" selected>Thinking: Med</option>
          <option value="high">Thinking: High</option>
        </select>

        <button onclick="clearCurrentChat()" title="Limpiar chat" class="p-1.5 sm:p-2 text-slate-400 hover:text-white rounded-lg hover:bg-surface-750 transition-colors">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    </header>

    <!-- ======================================================================= -->
    <!-- VIEW: CHAT & RLM -->
    <!-- ======================================================================= -->
    <div id="viewChat" class="flex-1 flex flex-col h-[calc(100dvh-3.5rem)] pb-14 md:pb-0 overflow-hidden relative">
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
        <div class="max-w-4xl mx-auto relative bg-surface-800 border border-surface-700 rounded-xl shadow-xl focus-within:border-brand-500 transition-all duration-200">
          <textarea
            id="promptInput"
            rows="1"
            placeholder="Envía un mensaje a Andy Agent o usa /..."
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
    <div id="viewProviders" class="hidden flex-1 flex flex-col h-[calc(100dvh-3.5rem)] pb-16 md:pb-6 overflow-y-auto p-3 sm:p-6 max-w-7xl w-full mx-auto space-y-4 sm:space-y-6">
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
    <div id="viewMemory" class="hidden flex-1 flex flex-col h-[calc(100dvh-3.5rem)] pb-16 md:pb-6 overflow-y-auto p-3 sm:p-6 max-w-6xl w-full mx-auto space-y-4">
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
    <div id="viewSkills" class="hidden flex-1 flex flex-col h-[calc(100dvh-3.5rem)] pb-16 md:pb-6 overflow-y-auto p-3 sm:p-6 max-w-6xl w-full mx-auto space-y-4">
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
    <div id="viewTree" class="hidden flex-1 flex flex-col h-[calc(100dvh-3.5rem)] pb-16 md:pb-6 overflow-y-auto p-3 sm:p-6 max-w-6xl w-full mx-auto space-y-4">
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
    <div id="viewLogs" class="hidden flex-1 flex flex-col h-[calc(100dvh-3.5rem)] pb-16 md:pb-6 overflow-y-auto p-3 sm:p-6 max-w-6xl w-full mx-auto space-y-4">
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
    <!-- VIEW: GRAFT STUDIO -->
    <!-- ======================================================================= -->
    <div id="viewGraft" class="hidden flex-1 flex flex-col h-[calc(100dvh-3.5rem)] pb-16 md:pb-6 overflow-y-auto p-3 sm:p-6 max-w-6xl w-full mx-auto space-y-4 sm:space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <i data-lucide="git-fork" class="w-5 h-5 text-cyan-400"></i>
            Graft Context Studio
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">Exploración estructural sin coste de tokens.</p>
        </div>

        <div class="flex items-center gap-2">
          <button onclick="fetchGraftMap()" class="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors">
            <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
            Actualizar Mapa
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <div class="bg-surface-800 border border-surface-700 rounded-xl p-3.5 space-y-2.5">
          <div class="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <i data-lucide="file-code" class="w-4 h-4 text-brand-400"></i>
            Esqueleto de Archivo
          </div>
          <p class="text-[11px] text-slate-400">Extraer firmas y tipos.</p>
          <div class="flex gap-1.5">
            <input id="graftSkeletonInput" type="text" placeholder="packages/openai-bridge/src/server.ts" class="flex-1 bg-surface-750 border border-surface-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500">
            <button onclick="fetchGraftSkeleton()" class="bg-brand-600 hover:bg-brand-500 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors">Ver</button>
          </div>
        </div>

        <div class="bg-surface-800 border border-surface-700 rounded-xl p-3.5 space-y-2.5">
          <div class="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <i data-lucide="phone-call" class="w-4 h-4 text-emerald-400"></i>
            Búsqueda de Callers
          </div>
          <p class="text-[11px] text-slate-400">Módulos que llaman a una función.</p>
          <div class="flex gap-1.5">
            <input id="graftCallersInput" type="text" placeholder="createAgentSession" class="flex-1 bg-surface-750 border border-surface-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500">
            <button onclick="fetchGraftCallers()" class="bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors">Buscar</button>
          </div>
        </div>

        <div class="bg-surface-800 border border-surface-700 rounded-xl p-3.5 space-y-2.5">
          <div class="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <i data-lucide="target" class="w-4 h-4 text-amber-400"></i>
            Radio de Impacto (Blast)
          </div>
          <p class="text-[11px] text-slate-400">Impacto en cascada.</p>
          <div class="flex gap-1.5">
            <input id="graftBlastInput" type="text" placeholder="packages/openai-bridge/src/types.ts" class="flex-1 bg-surface-750 border border-surface-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500">
            <button onclick="fetchGraftBlast()" class="bg-amber-600 hover:bg-amber-500 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors">Evaluar</button>
          </div>
        </div>
      </div>

      <div class="flex-1 min-h-[250px] bg-surface-850 border border-surface-750 rounded-xl overflow-hidden flex flex-col">
        <div class="p-3 bg-surface-800 border-b border-surface-750 flex items-center justify-between text-xs text-slate-300 font-medium">
          <span id="graftResultsTitle" class="flex items-center gap-1.5">
            <i data-lucide="terminal" class="w-4 h-4 text-cyan-400"></i>
            Visor de Resultados
          </span>
          <button onclick="copyGraftResult()" class="text-slate-400 hover:text-white flex items-center gap-1">
            <i data-lucide="copy" class="w-3.5 h-3.5"></i>
            Copiar
          </button>
        </div>
        <pre id="graftResultContent" class="flex-1 p-3 sm:p-4 overflow-auto text-xs font-mono text-slate-200 leading-relaxed bg-surface-900/60 select-text min-h-[200px]"></pre>
      </div>
    </div>

    <!-- ======================================================================= -->
    <!-- VIEW: WORKSPACE FILES -->
    <!-- ======================================================================= -->
    <div id="viewFiles" class="hidden flex-1 flex flex-col h-[calc(100dvh-3.5rem)] pb-16 md:pb-6 overflow-y-auto p-3 sm:p-6 max-w-6xl w-full mx-auto space-y-4">
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

    <!-- Mobile Bottom Navigation Bar (< md) -->
    <nav id="mobileBottomNav" class="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-surface-850/95 backdrop-blur-md border-t border-surface-750 flex items-center justify-around z-40 px-1 safe-pb">
      <button onclick="switchView('chat')" id="mobTabChat" class="flex flex-col items-center justify-center w-14 h-full text-brand-400 font-medium text-[10px] transition-colors">
        <i data-lucide="message-square" class="w-5 h-5"></i>
        <span class="mt-0.5">Chat</span>
      </button>
      <button onclick="switchView('providers')" id="mobTabProviders" class="flex flex-col items-center justify-center w-14 h-full text-slate-400 hover:text-white font-medium text-[10px] transition-colors">
        <i data-lucide="zap" class="w-5 h-5"></i>
        <span class="mt-0.5">Modelos</span>
      </button>
      <button onclick="switchView('graft')" id="mobTabGraft" class="flex flex-col items-center justify-center w-14 h-full text-slate-400 hover:text-white font-medium text-[10px] transition-colors">
        <i data-lucide="git-fork" class="w-5 h-5"></i>
        <span class="mt-0.5">Graft</span>
      </button>
      <button onclick="switchView('memory')" id="mobTabMemory" class="flex flex-col items-center justify-center w-14 h-full text-slate-400 hover:text-white font-medium text-[10px] transition-colors">
        <i data-lucide="brain" class="w-5 h-5"></i>
        <span class="mt-0.5">Memoria</span>
      </button>
      <button onclick="switchView('logs')" id="mobTabLogs" class="flex flex-col items-center justify-center w-14 h-full text-slate-400 hover:text-white font-medium text-[10px] transition-colors">
        <i data-lucide="scroll-text" class="w-5 h-5"></i>
        <span class="mt-0.5">Logs</span>
      </button>
    </nav>
  </main>

  <!-- ========================================================================= -->
  <!-- SETTINGS MODAL -->
  <!-- ========================================================================= -->
  <div id="settingsModal" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-surface-850 border border-surface-700 rounded-t-2xl sm:rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh]">
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
        <button onclick="switchSettingsTab('media')" id="setTabMediaBtn" class="px-3 py-2 font-medium text-slate-400 hover:text-white whitespace-nowrap shrink-0">Medios & Imágenes</button>
        <button onclick="switchSettingsTab('appearance')" id="setTabAppearanceBtn" class="px-3 py-2 font-medium text-slate-400 hover:text-white whitespace-nowrap shrink-0">Apariencia & Rutas</button>
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
                Compactación automática activa
              </label>
            </div>
          </div>
        </div>

        <div id="setTabMcp" class="hidden space-y-4">
          <div class="bg-surface-800 p-4 rounded-xl border border-surface-700 space-y-3">
            <h4 class="font-semibold text-sm text-slate-200 flex items-center gap-2">
              <i data-lucide="cpu" class="w-4 h-4 text-emerald-400"></i>
              Servidores MCP Conectados
            </h4>
            <div id="mcpServerList" class="space-y-2"></div>
            
            <h5 class="font-medium text-slate-300 pt-2">Añadir Servidor MCP</h5>
            <div class="grid grid-cols-2 gap-2">
              <input id="newMcpName" type="text" placeholder="Nombre (ej: gitlab)" class="bg-surface-750 border border-surface-700 rounded-lg p-2 text-white font-mono text-xs">
              <input id="newMcpUrl" type="text" placeholder="URL o Comando stdio" class="bg-surface-750 border border-surface-700 rounded-lg p-2 text-white font-mono text-xs">
            </div>
            <button onclick="addMcpServer()" class="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3 py-1.5 rounded-lg text-xs">Añadir Servidor</button>
          </div>
        </div>

        <div id="setTabShell" class="hidden space-y-4">
          <div class="bg-surface-800 p-4 rounded-xl border border-surface-700 space-y-3">
            <h4 class="font-semibold text-sm text-slate-200">Terminal & Ejecución</h4>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-slate-300 mb-1">Ruta del Shell</label>
                <input id="settingShellPath" type="text" placeholder="powershell.exe / bash" class="w-full bg-surface-750 border border-surface-700 rounded-lg px-3 py-2 text-white font-mono text-xs">
              </div>
            </div>
          </div>
        </div>

        <div id="setTabMedia" class="hidden space-y-4">
          <div class="bg-surface-800 p-4 rounded-xl border border-surface-700 space-y-3">
            <h4 class="font-semibold text-sm text-slate-200">Gestión de Imágenes</h4>
            <div class="space-y-2">
              <label class="flex items-center gap-2 text-slate-300">
                <input id="settingAutoResizeImages" type="checkbox" checked class="rounded bg-surface-750 border-surface-700 text-brand-500">
                Redimensionar imágenes automáticamente
              </label>
            </div>
          </div>
        </div>

        <div id="setTabAppearance" class="hidden space-y-4">
          <div class="bg-surface-800 p-4 rounded-xl border border-surface-700 space-y-3">
            <h4 class="font-semibold text-sm text-slate-200">Apariencia & Directorio de Sesiones</h4>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-slate-300 mb-1">Tema Visual</label>
                <select id="settingTheme" class="w-full bg-surface-750 border border-surface-700 rounded-lg px-3 py-2 text-white text-xs">
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
  <div id="projectsModal" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
    <div class="bg-surface-850 border border-surface-700 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh]">
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

    document.addEventListener('DOMContentLoaded', async () => {
      lucide.createIcons();
      await fetchProjects();
      await fetchModelCatalogs();
      await fetchProviders();
      await fetchSessions();
      await loadSession(currentSessionId);
      initLogsStream();
    });

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

        card.innerHTML = \`
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <span class="font-bold text-xs \${isActive ? 'text-cyan-300' : 'text-white'} truncate flex items-center gap-1.5">
                <i data-lucide="folder-kanban" class="w-3.5 h-3.5 \${isActive ? 'text-cyan-400' : 'text-slate-400'}"></i>
                \${p.name}
              </span>
              \${isActive ? '<span class="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30">Activo</span>' : ''}
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

          // Refresh all views for new project
          await fetchSessions();
          await createNewSession();
          fetchActiveDoc();
          fetchSkillsAndPrompts();
          refreshWorkspaceFiles();
          fetchGraftMap();
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

      const name = nameInput.value.trim();
      const path = pathInput.value.trim();
      const description = descInput.value.trim();

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
          body: JSON.stringify({ name, path, description })
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
    function switchView(view) {
      ['viewChat', 'viewProviders', 'viewGraft', 'viewMemory', 'viewSkills', 'viewTree', 'viewLogs', 'viewFiles'].forEach(v => {
        const el = document.getElementById(v);
        if (el) el.classList.add('hidden');
      });

      ['tabChatBtn', 'tabProvidersBtn', 'tabGraftBtn', 'tabMemoryBtn', 'tabSkillsBtn', 'tabTreeBtn', 'tabLogsBtn', 'tabFilesBtn'].forEach(t => {
        const el = document.getElementById(t);
        if (el) el.className = 'px-2.5 py-1 rounded-md font-medium text-slate-300 hover:text-white hover:bg-surface-700/50 flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0';
      });

      // Reset mobile bottom nav buttons
      ['mobTabChat', 'mobTabProviders', 'mobTabGraft', 'mobTabMemory', 'mobTabLogs'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.className = 'flex flex-col items-center justify-center w-14 h-full text-slate-400 hover:text-white font-medium text-[10px] transition-colors';
      });

      if (view === 'chat') {
        document.getElementById('viewChat').classList.remove('hidden');
        document.getElementById('tabChatBtn').className = 'px-2.5 py-1 rounded-md font-medium text-white bg-brand-600 shadow-sm flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0';
        const mob = document.getElementById('mobTabChat');
        if (mob) mob.className = 'flex flex-col items-center justify-center w-14 h-full text-brand-400 font-medium text-[10px] transition-colors';
      } else if (view === 'providers') {
        document.getElementById('viewProviders').classList.remove('hidden');
        document.getElementById('tabProvidersBtn').className = 'px-2.5 py-1 rounded-md font-medium text-white bg-brand-600 shadow-sm flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0';
        const mob = document.getElementById('mobTabProviders');
        if (mob) mob.className = 'flex flex-col items-center justify-center w-14 h-full text-brand-400 font-medium text-[10px] transition-colors';
        fetchProviders();
      } else if (view === 'graft') {
        document.getElementById('viewGraft').classList.remove('hidden');
        document.getElementById('tabGraftBtn').className = 'px-2.5 py-1 rounded-md font-medium text-white bg-brand-600 shadow-sm flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0';
        const mob = document.getElementById('mobTabGraft');
        if (mob) mob.className = 'flex flex-col items-center justify-center w-14 h-full text-brand-400 font-medium text-[10px] transition-colors';
        fetchGraftMap();
      } else if (view === 'memory') {
        document.getElementById('viewMemory').classList.remove('hidden');
        document.getElementById('tabMemoryBtn').className = 'px-2.5 py-1 rounded-md font-medium text-white bg-brand-600 shadow-sm flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0';
        const mob = document.getElementById('mobTabMemory');
        if (mob) mob.className = 'flex flex-col items-center justify-center w-14 h-full text-brand-400 font-medium text-[10px] transition-colors';
        fetchActiveDoc();
      } else if (view === 'skills') {
        document.getElementById('viewSkills').classList.remove('hidden');
        document.getElementById('tabSkillsBtn').className = 'px-2.5 py-1 rounded-md font-medium text-white bg-brand-600 shadow-sm flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0';
        fetchSkillsAndPrompts();
      } else if (view === 'tree') {
        document.getElementById('viewTree').classList.remove('hidden');
        document.getElementById('tabTreeBtn').className = 'px-2.5 py-1 rounded-md font-medium text-white bg-brand-600 shadow-sm flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0';
        refreshBranchTree();
      } else if (view === 'logs') {
        document.getElementById('viewLogs').classList.remove('hidden');
        document.getElementById('tabLogsBtn').className = 'px-2.5 py-1 rounded-md font-medium text-white bg-brand-600 shadow-sm flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0';
        const mob = document.getElementById('mobTabLogs');
        if (mob) mob.className = 'flex flex-col items-center justify-center w-14 h-full text-brand-400 font-medium text-[10px] transition-colors';
        renderLogs();
      } else if (view === 'files') {
        document.getElementById('viewFiles').classList.remove('hidden');
        document.getElementById('tabFilesBtn').className = 'px-2.5 py-1 rounded-md font-medium text-white bg-brand-600 shadow-sm flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0';
        refreshWorkspaceFiles();
      }
      
      // Auto close sidebar on mobile if open
      if (window.innerWidth < 768) {
        toggleSidebar(false);
      }
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
        if (typeof forceState === 'boolean') {
          if (forceState) sidebar.classList.remove('hidden');
          else sidebar.classList.add('hidden');
        } else {
          sidebar.classList.toggle('hidden');
        }
      }
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
        document.getElementById('sessionCountBadge').innerText = data.sessions.length;

        data.sessions.forEach(session => {
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

      const assistantMsgContainer = createAssistantMessageCard();
      document.getElementById('chatMessages').appendChild(assistantMsgContainer);
      chatMessages.scrollTop = chatMessages.scrollHeight;

      activeAbortController = new AbortController();

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: currentSessionId,
            projectId: currentProjectId,
            model: currentModelId,
            provider: currentProviderId || 'omniroute',
            thinkingLevel: currentThinkingLevel,
            messages: [{ role: 'user', content: text }]
          }),
          signal: activeAbortController.signal
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullAssistantContent = '';
        let fullReasoningContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6).trim();
              if (jsonStr === '[DONE]') continue;

              try {
                const event = JSON.parse(jsonStr);

                if (event.type === 'token') {
                  fullAssistantContent += event.content;
                  updateAssistantContent(assistantMsgContainer, fullAssistantContent);
                } else if (event.type === 'reasoning') {
                  fullReasoningContent += event.content;
                  updateReasoningBlock(assistantMsgContainer, fullReasoningContent);
                } else if (event.type === 'tool_start') {
                  document.getElementById('liveExecutionText').innerText = \`Ejecutando herramienta: \${event.tool}...\`;
                  appendToolCallCard(assistantMsgContainer, event.tool, event.input);
                } else if (event.type === 'tool_result') {
                  updateToolCallResult(assistantMsgContainer, event.tool, event.output);
                } else if (event.type === 'error') {
                  appendErrorCard(assistantMsgContainer, event.error || 'Error en el proveedor');
                }
              } catch (e) {}
            }
          }
          chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        if (!fullAssistantContent && !assistantMsgContainer.querySelector('.tool-card-') && !assistantMsgContainer.querySelector('.error-card')) {
          appendErrorCard(assistantMsgContainer, 'No se recibió texto del modelo. Por favor verifica que el proveedor esté activo o ingresa tu API Key.');
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          appendErrorCard(assistantMsgContainer, err.message || String(err));
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
        div.className = 'flex gap-3.5 p-4 rounded-xl bg-surface-850 border border-surface-750/70 text-xs shadow-sm my-2 group';
        div.innerHTML = \`
          <div class="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shrink-0 font-bold shadow-md shadow-brand-500/20">
            Ψ
          </div>
          <div class="flex-1 space-y-2 overflow-hidden">
            <div class="flex items-center justify-between border-b border-surface-750/50 pb-1 mb-1">
              <span class="text-[11px] font-semibold text-brand-300">Andy Agent</span>
              <button onclick="copyMessageText(this, decodeURIComponent('\${encodeURIComponent(rawText)}'))" title="Copiar mensaje" class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white p-1 rounded transition-opacity">
                <i data-lucide="copy" class="w-3.5 h-3.5"></i>
              </button>
            </div>
            <div class="assistant-content prose-custom text-slate-100 leading-relaxed select-text">
              \${formatMarkdown(rawText)}
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

    // --- GRAFT STUDIO API ---
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
      out.innerText = \`Buscando callers de \${symbol}...\`;
      try {
        const res = await fetch(\`/v1/graft/callers?symbol=\${encodeURIComponent(symbol)}&projectId=\${encodeURIComponent(currentProjectId)}\`);
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

      const payload = {
        defaultModel,
        defaultProvider,
        customBaseUrl,
        customApiKey,
        customProvider: defaultProvider,
        rlmMaxDepth: Number(rlmMaxDepth),
        compaction: { enabled: compactionEnabled },
      };

      try {
        await Promise.all([
          fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
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
        alert(\`Configuración guardada: Proveedor '\${defaultProvider}', Modelo '\${defaultModel}', Auto-Learn: \${autoLearnEnabled ? 'Activo' : 'Desactivado'}.\`);
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

    function toggleTheme() {
      document.documentElement.classList.toggle('dark');
    }
  </script>
</body>
</html>`;
}
