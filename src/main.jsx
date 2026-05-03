import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { css } from '@codemirror/lang-css';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { dracula } from '@uiw/codemirror-theme-dracula';
import { EditorView } from '@codemirror/view';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Bot, Boxes, Bug, CheckCircle2, ChevronDown, ChevronRight, Code2, Command,
  Copy, Database, Edit3, FileCode2, FileJson, FileText, Folder, FolderOpen,
  GitBranch, GripVertical, LayoutPanelLeft, Lightbulb, Maximize2, Minus,
  Moon, Play, Plus, RefreshCw, Search, Settings, Sparkles, SplitSquareHorizontal,
  Sun, Terminal, Type, WrapText, X, Zap,
} from 'lucide-react';
import { streamGeminiCodeReview } from './geminiChat';
import './styles.css';

const STORAGE_KEY = 'ai-code-studio-pro-v5';

const themeOptions = [
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
  { id: 'dracula', label: 'Dracula' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'forest', label: 'Forest' },
  { id: 'contrast', label: 'High Contrast' },
];

const initialFiles = [
  {
    id: 'src',
    name: 'src',
    type: 'folder',
    expanded: true,
    children: [
      {
        id: 'app',
        name: 'App.jsx',
        type: 'file',
        language: 'javascript',
        content: `import { useMemo, useState } from 'react';

export default function App() {
  const [prompt, setPrompt] = useState('refactor panel resize logic');
  const suggestions = useMemo(() => analyzePrompt(prompt), [prompt]);

  return (
    <main className="studio-shell">
      <EditorWorkspace suggestions={suggestions} />
      <Assistant prompt={prompt} onPromptChange={setPrompt} />
    </main>
  );
}

function analyzePrompt(value) {
  if (value.includes('resize')) {
    return ['Debounce pointer events', 'Persist panel width in local storage'];
  }

  return ['Generate unit tests', 'Explain selected function'];
}

console.log('AI Code Studio running');`,
      },
      {
        id: 'assistant',
        name: 'assistant.ts',
        type: 'file',
        language: 'typescript',
        content: `type HintKind = 'debug' | 'completion' | 'refactor';

export interface AssistantHint {
  kind: HintKind;
  title: string;
  confidence: number;
  patch?: string;
}

export function createHint(input: string): AssistantHint {
  const normalized = input.trim().toLowerCase();

  if (normalized.includes('error')) {
    return {
      kind: 'debug',
      title: 'Trace the failing branch before rendering',
      confidence: 0.91,
    };
  }

  return {
    kind: 'completion',
    title: 'Complete component state transitions',
    confidence: 0.84,
  };
}`,
      },
      {
        id: 'styles',
        name: 'theme.css',
        type: 'file',
        language: 'css',
        content: `.editor-pane {
  display: grid;
  grid-template-rows: auto 1fr auto;
  background: var(--surface);
  transition: background 180ms ease, color 180ms ease;
}

.resizer {
  inline-size: 6px;
  cursor: col-resize;
  touch-action: none;
}`,
      },
    ],
  },
  {
    id: 'config',
    name: 'config',
    type: 'folder',
    expanded: true,
    children: [
      {
        id: 'package',
        name: 'package.json',
        type: 'file',
        language: 'json',
        content: `{
  "scripts": {
    "dev": "vite --host localhost --port 5173",
    "build": "vite build"
  },
  "dependencies": {
    "@uiw/react-codemirror": "latest",
    "react": "latest",
    "vite": "latest"
  }
}`,
      },
      {
        id: 'readme',
        name: 'README.md',
        type: 'file',
        language: 'markdown',
        content: `# AI Code Studio

A frontend-only real-time IDE with editable files, Gemini streaming AI chat, localStorage persistence, shortcuts, themes, and simulated run output.`,
      },
    ],
  },
  {
    id: 'tests',
    name: 'tests',
    type: 'folder',
    expanded: true,
    children: [
      {
        id: 'layout-test',
        name: 'layout.spec.ts',
        type: 'file',
        language: 'typescript',
        content: `import { describe, expect, it } from 'vitest';

describe('layout persistence', () => {
  it('keeps panel sizes inside visible bounds', () => {
    expect(clampPanelWidth(220)).toBe(260);
    expect(clampPanelWidth(720)).toBe(620);
  });
});`,
      },
    ],
  },
];

const shortcutRows = [
  ['Run Current File', 'Ctrl Enter'],
  ['Command Palette', 'Ctrl Shift P'],
  ['Quick Open', 'Ctrl P'],
  ['Show Explorer', 'Ctrl Shift E'],
  ['Show Search', 'Ctrl Shift F'],
  ['Show Source Control', 'Ctrl Shift G'],
  ['Show Debug', 'Ctrl Shift D'],
  ['Show Extensions', 'Ctrl Shift X'],
  ['Toggle Sidebar', 'Ctrl B'],
  ['Toggle Console', 'Ctrl J'],
  ['Save Workspace', 'Ctrl S'],
  ['Focus AI Chat', 'Ctrl I'],
  ['Close Tab', 'Ctrl W'],
  ['Rename File', 'F2'],
  ['Word Wrap', 'Alt Z'],
  ['Zoom In', 'Ctrl +'],
  ['Zoom Out', 'Ctrl -'],
  ['Refresh Workspace', 'Ctrl R'],
];

function App() {
  const stored = useMemo(loadStoredState, []);
  const [theme, setTheme] = useState(stored.theme || 'dark');
  const [files, setFiles] = useState(stored.files || initialFiles);
  const openableFiles = useMemo(() => flattenFiles(files), [files]);

  const [activeSidebar, setActiveSidebar] = useState(stored.activeSidebar || 'explorer');
  const [sidebarVisible, setSidebarVisible] = useState(stored.sidebarVisible ?? true);
  const [consoleVisible, setConsoleVisible] = useState(stored.consoleVisible ?? true);
  const [openTabs, setOpenTabs] = useState(stored.openTabs || ['app', 'assistant', 'package']);
  const [activeFileId, setActiveFileId] = useState(stored.activeFileId || 'app');
  const [leftWidth, setLeftWidth] = useState(stored.leftWidth || 308);
  const [rightWidth, setRightWidth] = useState(stored.rightWidth || 410);
  const [consoleHeight, setConsoleHeight] = useState(stored.consoleHeight || 184);
  const [chatInput, setChatInput] = useState(stored.chatInput || 'Check my code and explain the mistakes.');
  const [assistantMode, setAssistantMode] = useState(stored.assistantMode || 'debug');
  const [messages, setMessages] = useState(stored.messages || []);
  const [consoleEntries, setConsoleEntries] = useState(stored.consoleEntries || defaultConsole());
  const [wordWrap, setWordWrap] = useState(stored.wordWrap ?? true);
  const [fontSize, setFontSize] = useState(stored.fontSize || 15);
  const [searchQuery, setSearchQuery] = useState(stored.searchQuery || '');
  const [editorPositions, setEditorPositions] = useState(stored.editorPositions || {});
  const [palette, setPalette] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const assistantInputRef = useRef(null);

  const tabs = openTabs.map((id) => openableFiles.find((file) => file.id === id)).filter(Boolean);
  const activeFile = tabs.find((file) => file.id === activeFileId) || null;

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        theme, files, activeSidebar, sidebarVisible, consoleVisible, openTabs, activeFileId,
        leftWidth, rightWidth, consoleHeight, chatInput, assistantMode, messages, consoleEntries,
        wordWrap, fontSize, searchQuery, editorPositions,
      }),
    );
  }, [
    theme, files, activeSidebar, sidebarVisible, consoleVisible, openTabs, activeFileId,
    leftWidth, rightWidth, consoleHeight, chatInput, assistantMode, messages, consoleEntries,
    wordWrap, fontSize, searchQuery, editorPositions,
  ]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const ctrl = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (ctrl && event.shiftKey && key === 'p') {
        event.preventDefault();
        setPalette('command');
      } else if (ctrl && event.shiftKey && key === 'e') {
        event.preventDefault();
        showSidebar('explorer');
      } else if (ctrl && event.shiftKey && key === 'f') {
        event.preventDefault();
        showSidebar('search');
      } else if (ctrl && event.shiftKey && key === 'g') {
        event.preventDefault();
        showSidebar('source');
      } else if (ctrl && event.shiftKey && key === 'd') {
        event.preventDefault();
        showSidebar('debug');
      } else if (ctrl && event.shiftKey && key === 'x') {
        event.preventDefault();
        showSidebar('tools');
      } else if (ctrl && key === 'p') {
        event.preventDefault();
        setPalette('quickOpen');
      } else if (ctrl && key === 'b') {
        event.preventDefault();
        setSidebarVisible((value) => !value);
      } else if (ctrl && key === 'j') {
        event.preventDefault();
        setConsoleVisible((value) => !value);
      } else if (ctrl && event.key === 'Enter') {
        event.preventDefault();
        runCurrentFile();
      } else if (ctrl && key === 's') {
        event.preventDefault();
        saveWorkspace();
      } else if (ctrl && key === 'i') {
        event.preventDefault();
        assistantInputRef.current?.focus();
      } else if (ctrl && key === 'w') {
        event.preventDefault();
        if (activeFile) closeTab(activeFile.id);
      } else if (ctrl && key === 'r') {
        event.preventDefault();
        refreshWorkspace();
      } else if (event.altKey && key === 'z') {
        event.preventDefault();
        setWordWrap((value) => !value);
      } else if (event.key === 'F2') {
        event.preventDefault();
        if (activeFile) beginRename(activeFile);
      } else if (ctrl && (event.key === '+' || event.key === '=')) {
        event.preventDefault();
        setFontSize((size) => Math.min(24, size + 1));
      } else if (ctrl && event.key === '-') {
        event.preventDefault();
        setFontSize((size) => Math.max(11, size - 1));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  function showSidebar(id) {
    setActiveSidebar(id);
    setSidebarVisible(true);
  }

  function openFile(fileId) {
    setOpenTabs((current) => (current.includes(fileId) ? current : [...current, fileId]));
    setActiveFileId(fileId);
  }

  function closeTab(fileId) {
    setOpenTabs((current) => {
      const next = current.filter((id) => id !== fileId);
      if (activeFileId === fileId) setActiveFileId(next[next.length - 1] || null);
      return next;
    });
  }

  function toggleFolder(id) {
    setFiles((current) => updateTree(current, id, (node) => ({ ...node, expanded: !node.expanded })));
  }

  function updateFileContent(fileId, content) {
    setFiles((current) => updateTree(current, fileId, (node) => ({ ...node, content })));
  }

  function beginRename(file) {
    if (!file) return;
    setRenamingId(file.id);
    setRenameValue(file.name);
  }

  function commitRename() {
    const cleanName = renameValue.trim();

    if (!renamingId || !cleanName) {
      setRenamingId(null);
      return;
    }

    setFiles((current) =>
      updateTree(current, renamingId, (node) => ({
        ...node,
        name: cleanName,
        language: detectLanguage(cleanName, node.language),
      })),
    );

    setConsoleVisible(true);
    setConsoleEntries((current) => [...current, { type: 'success', text: `[rename] file renamed to ${cleanName}` }]);
    setRenamingId(null);
  }

  function createNewFile() {
    const name = window.prompt('New file name', 'new-file.js');
    if (!name) return;

    const newFile = {
      id: `file-${Date.now()}`,
      name,
      type: 'file',
      language: detectLanguage(name, 'javascript'),
      content: `// ${name}\nconsole.log('Hello from ${name}');`,
    };

    setFiles((current) =>
      updateTree(current, 'src', (node) => ({
        ...node,
        expanded: true,
        children: [...(node.children || []), newFile],
      })),
    );

    setOpenTabs((current) => [...current, newFile.id]);
    setActiveFileId(newFile.id);
  }

  function moveFileToFolder(fileId, targetFolderId) {
    let movingFile = null;

    const remove = (nodes) =>
      nodes
        .map((node) => {
          if (node.id === fileId && node.type === 'file') {
            movingFile = node;
            return null;
          }

          return { ...node, children: node.children ? remove(node.children) : node.children };
        })
        .filter(Boolean);

    const insert = (nodes) =>
      nodes.map((node) => {
        if (node.id === targetFolderId && node.type === 'folder' && movingFile) {
          return { ...node, expanded: true, children: [...(node.children || []), movingFile] };
        }

        return { ...node, children: node.children ? insert(node.children) : node.children };
      });

    setFiles(insert(remove(files)));
  }

  async function askAssistant() {
    if (!activeFile) {
      setMessages((current) => [
        ...current,
        {
          role: 'ai',
          text: 'No file is open right now. Open a file first, then I can review the current code.',
          time: nowTime(),
        },
      ]);
      return;
    }

    const question = chatInput.trim() || 'Review this file.';
    const aiMessageId = `ai-${Date.now()}`;

    setMessages((current) => [
      ...current,
      { role: 'user', text: question, time: nowTime() },
      {
        id: aiMessageId,
        role: 'ai',
        text: 'Thinking...',
        time: nowTime(),
      },
    ]);

    setConsoleVisible(true);
    setConsoleEntries((current) => [
      ...current,
      { type: 'command', text: `$ gemini stream ${activeFile.name}` },
      { type: 'info', text: '[ai] streaming Gemini response...' },
    ]);

    try {
      await streamGeminiCodeReview({
        file: activeFile,
        question,
        mode: assistantMode,
        onChunk: (_chunk, fullText) => {
          setMessages((current) =>
            current.map((message) =>
              message.id === aiMessageId
                ? { ...message, text: fullText }
                : message,
            ),
          );
        },
      });

      setConsoleEntries((current) => [
        ...current,
        { type: 'success', text: `[ai] Gemini finished reviewing ${activeFile.name}` },
      ]);
    } catch (error) {
      const fallback = analyzeCode(activeFile, question, assistantMode);

      setMessages((current) =>
        current.map((message) =>
          message.id === aiMessageId
            ? {
                ...message,
                text: `Gemini API failed, so I used local mock analysis instead.\n\n${fallback}`,
              }
            : message,
        ),
      );

      setConsoleEntries((current) => [
        ...current,
        { type: 'error', text: `[ai] ${error.message}` },
        { type: 'warn', text: '[ai] fallback mock assistant used' },
      ]);
    }
  }

  function runCurrentFile(file = activeFile) {
    setConsoleVisible(true);

    if (!file) {
      setConsoleEntries([
        { type: 'command', text: '$ run' },
        { type: 'warn', text: 'No file is currently open.' },
        { type: 'info', text: 'Open a file from Explorer or Quick Open, then run again.' },
      ]);
      return;
    }

    setConsoleEntries([{ type: 'command', text: `$ run ${file.name}` }, ...simulateRun(file)]);
  }

  function saveWorkspace() {
    setConsoleVisible(true);
    setConsoleEntries((current) => [
      ...current,
      { type: 'success', text: `[save] workspace saved in localStorage at ${nowTime()}` },
    ]);
  }

  function refreshWorkspace() {
    localStorage.removeItem(STORAGE_KEY);
    setTheme('dark');
    setFiles(initialFiles);
    setActiveSidebar('explorer');
    setSidebarVisible(true);
    setConsoleVisible(true);
    setOpenTabs([]);
    setActiveFileId(null);
    setLeftWidth(308);
    setRightWidth(410);
    setConsoleHeight(184);
    setChatInput('Check my code and explain the mistakes.');
    setAssistantMode('debug');
    setMessages([]);
    setWordWrap(true);
    setFontSize(15);
    setSearchQuery('');
    setEditorPositions({});
    setConsoleEntries([
      { type: 'command', text: '$ workspace refresh' },
      { type: 'success', text: 'Workspace reset successfully' },
      { type: 'info', text: 'No file is open. Use Quick Open or Explorer to start.' },
    ]);
  }

  function runCommand(id) {
    const actions = {
      run: () => runCurrentFile(),
      save: saveWorkspace,
      rename: () => activeFile && beginRename(activeFile),
      wrap: () => setWordWrap((value) => !value),
      console: () => setConsoleVisible((value) => !value),
      sidebar: () => setSidebarVisible((value) => !value),
      explorer: () => showSidebar('explorer'),
      search: () => showSidebar('search'),
      source: () => showSidebar('source'),
      debug: () => showSidebar('debug'),
      tools: () => showSidebar('tools'),
      ai: () => assistantInputRef.current?.focus(),
      reset: refreshWorkspace,
    };

    actions[id]?.();
    setPalette(null);
  }

  return (
    <div className={`${theme} app-theme-${theme}`}>
      <div className="h-screen overflow-hidden bg-[var(--app-bg)] text-[var(--app-text)] transition-colors duration-300">
        <TopBar
          theme={theme}
          setTheme={setTheme}
          onShortcuts={() => setPalette('shortcuts')}
          onRefresh={refreshWorkspace}
          onRun={() => runCurrentFile()}
          onCommand={() => setPalette('command')}
        />

        <main className="flex h-[calc(100vh-44px)] min-w-0">
          <ActivityRail active={activeSidebar} visible={sidebarVisible} onSelect={(id) => showSidebar(id)} />

          {sidebarVisible && (
            <ResizablePanel width={leftWidth} min={232} max={420} side="left" onResize={setLeftWidth}>
              <SidebarPanel
                active={activeSidebar}
                files={files}
                openableFiles={openableFiles}
                activeFileId={activeFileId}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onOpen={openFile}
                onToggle={toggleFolder}
                onMoveFile={moveFileToFolder}
                draggedId={draggedId}
                setDraggedId={setDraggedId}
                onNewFile={createNewFile}
                onRun={() => runCurrentFile()}
                onAsk={askAssistant}
              />
            </ResizablePanel>
          )}

          <section className="flex min-w-0 flex-1 flex-col bg-[var(--editor-bg)]">
            <div className="flex min-h-0 min-w-0 flex-1">
              <div className="flex min-w-0 flex-1 flex-col">
                {activeFile ? (
                  <>
                    <TabStrip
                      tabs={tabs}
                      activeFileId={activeFileId}
                      onActivate={setActiveFileId}
                      onClose={closeTab}
                      renamingId={renamingId}
                      renameValue={renameValue}
                      setRenameValue={setRenameValue}
                      commitRename={commitRename}
                      cancelRename={() => setRenamingId(null)}
                    />

                    <EditorToolbar
                      file={activeFile}
                      wordWrap={wordWrap}
                      setWordWrap={setWordWrap}
                      fontSize={fontSize}
                      setFontSize={setFontSize}
                      onRename={() => beginRename(activeFile)}
                      onRun={() => runCurrentFile(activeFile)}
                    />

                    <Editor
                      file={activeFile}
                      theme={theme}
                      wordWrap={wordWrap}
                      fontSize={fontSize}
                      position={editorPositions[activeFile.id]}
                      onPositionChange={(position) =>
                        setEditorPositions((current) => ({
                          ...current,
                          [activeFile.id]: position,
                        }))
                      }
                      onChange={(value) => updateFileContent(activeFile.id, value)}
                    />
                  </>
                ) : (
                  <WelcomeScreen onQuickOpen={() => setPalette('quickOpen')} onNewFile={createNewFile} />
                )}
              </div>

              <ResizablePanel width={rightWidth} min={320} max={560} side="right" onResize={setRightWidth}>
                <AssistantPanel
                  input={chatInput}
                  onInput={setChatInput}
                  mode={assistantMode}
                  setMode={setAssistantMode}
                  activeFile={activeFile}
                  messages={messages}
                  onAsk={askAssistant}
                  inputRef={assistantInputRef}
                />
              </ResizablePanel>
            </div>

            {consoleVisible && <ConsolePanel entries={consoleEntries} height={consoleHeight} setHeight={setConsoleHeight} />}
          </section>
        </main>

        {palette && (
          <Palette
            type={palette}
            files={openableFiles}
            onClose={() => setPalette(null)}
            onOpenFile={(id) => {
              openFile(id);
              setPalette(null);
            }}
            onCommand={runCommand}
          />
        )}
      </div>
    </div>
  );
}

function TopBar({ theme, setTheme, onShortcuts, onRefresh, onRun, onCommand }) {
  return (
    <header className="flex h-11 items-center justify-between border-b border-[var(--border)] bg-[var(--panel-bg)] px-3 text-sm shadow-sm">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex min-w-0 items-center gap-2 font-semibold">
          <div className="grid size-7 shrink-0 place-items-center rounded bg-indigo-600 text-white shadow-glow">
            <Code2 size={16} />
          </div>
          <span className="truncate">AI Code Studio</span>
        </div>
        <div className="hidden items-center gap-1 text-xs text-[var(--muted)] md:flex">
          <GitBranch size={14} />
          feature/realtime-editor
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <IconButton label="Run current file" icon={Play} onClick={onRun} accent />
        <IconButton label="Command palette" icon={Command} onClick={onCommand} />
        <IconButton label="Refresh workspace" icon={RefreshCw} onClick={onRefresh} />
        <IconButton label="Keyboard shortcuts" icon={Settings} onClick={onShortcuts} />

        <select
          value={theme}
          onChange={(event) => setTheme(event.target.value)}
          className="h-8 rounded border border-[var(--border)] bg-[var(--button-bg)] px-2 text-xs outline-none"
          title="Theme"
        >
          {themeOptions.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>

        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="grid size-8 place-items-center rounded border border-[var(--border)] bg-[var(--button-bg)] transition hover:bg-[var(--button-hover)]"
          title="Toggle light/dark"
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>
    </header>
  );
}

function ActivityRail({ active, visible, onSelect }) {
  const items = [
    ['explorer', LayoutPanelLeft, 'Explorer'],
    ['search', Search, 'Search'],
    ['source', GitBranch, 'Source Control'],
    ['debug', Bug, 'Debug'],
    ['tools', Boxes, 'Extensions and Tools'],
  ];

  return (
    <nav className="hidden w-12 shrink-0 flex-col items-center gap-2 border-r border-[var(--border)] bg-[var(--panel-bg)] py-3 sm:flex">
      {items.map(([id, Icon, label]) => (
        <button
          key={id}
          onClick={() => onSelect(id)}
          className={`grid size-9 place-items-center rounded transition ${
            visible && active === id
              ? 'bg-indigo-600 text-white shadow-glow'
              : 'text-[var(--muted)] hover:bg-[var(--button-hover)] hover:text-[var(--app-text)]'
          }`}
          title={label}
        >
          <Icon size={18} />
        </button>
      ))}
    </nav>
  );
}

function SidebarPanel(props) {
  if (props.active === 'search') return <SearchPanel {...props} />;
  if (props.active === 'source') return <SourcePanel {...props} />;
  if (props.active === 'debug') return <DebugPanel {...props} />;
  if (props.active === 'tools') return <ToolsPanel {...props} />;
  return <Explorer {...props} />;
}

function Explorer({ files, activeFileId, onOpen, onToggle, onMoveFile, draggedId, setDraggedId, onNewFile }) {
  return (
    <div className="flex h-full flex-col">
      <PanelHeader title="Explorer">
        <IconButton label="New file" icon={Plus} small onClick={onNewFile} />
        <IconButton label="Split panel" icon={SplitSquareHorizontal} small />
      </PanelHeader>

      <div className="min-h-0 flex-1 overflow-auto p-2">
        {files.map((node) => (
          <FileNode
            key={node.id}
            node={node}
            activeFileId={activeFileId}
            level={0}
            onOpen={onOpen}
            onToggle={onToggle}
            onMoveFile={onMoveFile}
            draggedId={draggedId}
            setDraggedId={setDraggedId}
          />
        ))}
      </div>

      <div className="border-t border-[var(--border)] p-3 text-xs text-[var(--muted)]">
        Files, layout, themes, AI messages, and editor positions are saved locally.
      </div>
    </div>
  );
}

function SearchPanel({ openableFiles, searchQuery, setSearchQuery, onOpen }) {
  const matches = openableFiles.flatMap((file) =>
    file.content
      .split('\n')
      .map((line, index) => ({ file, line, index: index + 1 }))
      .filter((item) => searchQuery && item.line.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <div className="flex h-full flex-col">
      <PanelHeader title="Search" />
      <div className="border-b border-[var(--border)] p-3">
        <input
          autoFocus
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search in files"
          className="h-9 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 text-sm outline-none ring-indigo-500/30 focus:ring-4"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-2">
        {!searchQuery && <Empty text="Type to search all local files." />}
        {searchQuery && matches.length === 0 && <Empty text="No matches found." />}
        {matches.map((item, index) => (
          <button
            key={`${item.file.id}-${index}`}
            onClick={() => onOpen(item.file.id)}
            className="mb-2 w-full rounded border border-[var(--border)] bg-[var(--soft-bg)] p-2 text-left text-xs hover:border-indigo-500"
          >
            <div className="font-semibold">{item.file.name}:{item.index}</div>
            <div className="mt-1 truncate text-[var(--muted)]">{item.line.trim()}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SourcePanel({ openableFiles }) {
  return (
    <div className="flex h-full flex-col">
      <PanelHeader title="Source Control" />
      <div className="space-y-2 p-3 text-sm">
        <button className="h-9 w-full rounded bg-indigo-600 font-semibold text-white">Commit mock changes</button>
        <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Changes</div>
        {openableFiles.slice(0, 5).map((file) => (
          <div key={file.id} className="flex items-center gap-2 rounded bg-[var(--soft-bg)] p-2 text-xs">
            <GitBranch size={14} className="text-emerald-500" />
            <span className="truncate">M {file.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DebugPanel({ onRun, onAsk }) {
  return (
    <div className="flex h-full flex-col">
      <PanelHeader title="Run And Debug" />
      <div className="space-y-3 p-3 text-sm">
        <button onClick={onRun} className="flex h-10 w-full items-center justify-center gap-2 rounded bg-emerald-600 font-semibold text-white">
          <Play size={16} />
          Run Active File
        </button>
        <button onClick={onAsk} className="flex h-10 w-full items-center justify-center gap-2 rounded bg-indigo-600 font-semibold text-white">
          <Bot size={16} />
          Ask AI To Debug
        </button>
        <div className="rounded border border-[var(--border)] bg-[var(--soft-bg)] p-3 text-xs leading-5">
          Breakpoints, call stack, watch values, and runtime logs are simulated on the frontend.
        </div>
      </div>
    </div>
  );
}

function ToolsPanel() {
  const tools = ['Gemini Streaming AI Chat', 'Prettier Formatter', 'ESLint Hints', 'GitLens Mock', 'Tailwind Helper'];

  return (
    <div className="flex h-full flex-col">
      <PanelHeader title="Extensions" />
      <div className="space-y-2 p-3">
        {tools.map((tool, index) => (
          <div key={tool} className="rounded border border-[var(--border)] bg-[var(--soft-bg)] p-3 text-sm">
            <div className="font-semibold">{tool}</div>
            <div className="mt-1 text-xs text-[var(--muted)]">
              {index === 0 ? 'Uses VITE_GEMINI_API_KEY and streams responses when available.' : 'Enabled for this mock workspace.'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FileNode({ node, level, activeFileId, onOpen, onToggle, onMoveFile, draggedId, setDraggedId }) {
  const isFolder = node.type === 'folder';
  const Icon = isFolder ? (node.expanded ? FolderOpen : Folder) : fileIcon(node.language);

  return (
    <div>
      <button
        draggable={!isFolder}
        onDragStart={() => setDraggedId(node.id)}
        onDragEnd={() => setDraggedId(null)}
        onDragOver={(event) => {
          if (isFolder && draggedId) event.preventDefault();
        }}
        onDrop={() => {
          if (isFolder && draggedId) onMoveFile(draggedId, node.id);
          setDraggedId(null);
        }}
        onClick={() => (isFolder ? onToggle(node.id) : onOpen(node.id))}
        className={`group flex h-8 w-full items-center gap-2 rounded px-2 text-left text-sm transition ${
          activeFileId === node.id ? 'bg-indigo-600 text-white' : 'text-[var(--app-text)] hover:bg-[var(--button-hover)]'
        } ${isFolder && draggedId ? 'ring-1 ring-inset ring-indigo-400' : ''}`}
        style={{ paddingLeft: 8 + level * 16 }}
      >
        {isFolder ? node.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} /> : <span className="w-3" />}
        <Icon size={16} className={isFolder ? 'text-amber-500' : 'text-sky-500'} />
        <span className="min-w-0 truncate">{node.name}</span>
      </button>

      {isFolder && node.expanded && (
        <div className="animate-slide-in">
          {node.children?.map((child) => (
            <FileNode
              key={child.id}
              node={child}
              level={level + 1}
              activeFileId={activeFileId}
              onOpen={onOpen}
              onToggle={onToggle}
              onMoveFile={onMoveFile}
              draggedId={draggedId}
              setDraggedId={setDraggedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TabStrip({ tabs, activeFileId, onActivate, onClose, renamingId, renameValue, setRenameValue, commitRename, cancelRename }) {
  return (
    <div className="flex h-10 min-w-0 items-end border-b border-[var(--border)] bg-[var(--panel-bg)]">
      <div className="flex min-w-0 flex-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onActivate(tab.id)}
            className={`group flex h-10 min-w-40 max-w-60 items-center gap-2 border-r border-[var(--border)] px-3 text-sm transition ${
              activeFileId === tab.id ? 'bg-[var(--editor-bg)] text-[var(--app-text)]' : 'text-[var(--muted)] hover:bg-[var(--soft-bg)]'
            }`}
          >
            {React.createElement(fileIcon(tab.language), { size: 15, className: 'text-sky-500 shrink-0' })}

            {renamingId === tab.id ? (
              <input
                autoFocus
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                onBlur={commitRename}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') commitRename();
                  if (event.key === 'Escape') cancelRename();
                }}
                onClick={(event) => event.stopPropagation()}
                className="min-w-0 flex-1 rounded bg-[var(--input-bg)] px-2 py-1 text-xs outline-none ring-2 ring-indigo-500"
              />
            ) : (
              <span className="truncate">{tab.name}</span>
            )}

            <span
              onClick={(event) => {
                event.stopPropagation();
                onClose(tab.id);
              }}
              className="ml-auto grid size-5 shrink-0 place-items-center rounded opacity-70 hover:bg-[var(--button-hover)] group-hover:opacity-100"
              title="Close tab"
            >
              <X size={13} />
            </span>
          </button>
        ))}
      </div>

      <div className="hidden h-10 items-center gap-1 px-2 md:flex">
        <IconButton label="Copy active file" icon={Copy} small />
        <IconButton label="Maximize editor" icon={Maximize2} small />
      </div>
    </div>
  );
}

function EditorToolbar({ file, wordWrap, setWordWrap, fontSize, setFontSize, onRename, onRun }) {
  return (
    <div className="flex h-10 items-center justify-between border-b border-[var(--border)] bg-[var(--editor-bg)] px-3 text-xs text-[var(--muted)]">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate">{file.name} - {file.language}</span>
        <span className="hidden rounded bg-emerald-500/10 px-2 py-1 text-emerald-400 md:inline">live editable</span>
      </div>

      <div className="flex items-center gap-1">
        <IconButton label="Run current file" icon={Play} small onClick={onRun} />
        <IconButton label="Rename file" icon={Edit3} small onClick={onRename} />
        <IconButton label="Toggle word wrap" icon={WrapText} small onClick={() => setWordWrap((value) => !value)} />
        <IconButton label="Zoom out" icon={Minus} small onClick={() => setFontSize((size) => Math.max(11, size - 1))} />
        <span className="flex h-7 items-center gap-1 rounded bg-[var(--soft-bg)] px-2 font-mono">
          <Type size={13} />
          {fontSize}px
        </span>
        <IconButton label="Zoom in" icon={Plus} small onClick={() => setFontSize((size) => Math.min(24, size + 1))} />
      </div>
    </div>
  );
}

function Editor({ file, theme, wordWrap, fontSize, position, onPositionChange, onChange }) {
  const viewRef = useRef(null);
  const restoredFileRef = useRef(null);
  const editorTheme = useMemo(() => getEditorTheme(theme), [theme]);

  const extensions = useMemo(() => {
    const list = [languageExtension(file.language)];
    if (wordWrap) list.push(EditorView.lineWrapping);
    return list;
  }, [file.language, wordWrap]);

  const restorePosition = (view) => {
    if (!view || !position || restoredFileRef.current === file.id) return;

    const safeCursor = Math.min(position.cursor || 0, view.state.doc.length);

    view.dispatch({
      selection: { anchor: safeCursor },
      effects: EditorView.scrollIntoView(safeCursor, { y: 'center' }),
    });

    requestAnimationFrame(() => {
      view.scrollDOM.scrollTop = position.scrollTop || 0;
      view.scrollDOM.scrollLeft = position.scrollLeft || 0;
    });

    restoredFileRef.current = file.id;
  };

  useEffect(() => {
    restoredFileRef.current = null;
    requestAnimationFrame(() => restorePosition(viewRef.current));
  }, [file.id]);

  return (
    <div className="min-h-0 flex-1 overflow-hidden" style={{ '--editor-font-size': `${fontSize}px` }}>
      <CodeMirror
        value={file.content}
        height="100%"
        theme={editorTheme}
        extensions={extensions}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: true,
          autocompletion: true,
          bracketMatching: true,
          closeBrackets: true,
          searchKeymap: true,
        }}
        onCreateEditor={(view) => {
          viewRef.current = view;
          restorePosition(view);
        }}
        onUpdate={(update) => {
          if (update.docChanged || update.selectionSet || update.scrollChanged) {
            onPositionChange({
              cursor: update.state.selection.main.head,
              scrollTop: update.view.scrollDOM.scrollTop,
              scrollLeft: update.view.scrollDOM.scrollLeft,
            });
          }
        }}
        onChange={onChange}
        className="realtime-editor h-full"
      />
    </div>
  );
}

function WelcomeScreen({ onQuickOpen, onNewFile }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[var(--editor-bg)] p-8">
      <div className="max-w-xl text-center animate-slide-in">
        <div className="mx-auto mb-6 grid size-24 place-items-center rounded-2xl bg-indigo-600 text-white shadow-glow">
          <Code2 size={46} />
        </div>
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">Welcome</p>
        <h1 className="text-4xl font-bold tracking-tight text-[var(--app-text)] sm:text-5xl">AI Code Studio</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[var(--muted)]">
          Your real-time frontend IDE is ready. Open a file, create a new one, or use Quick Open to start editing.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button onClick={onQuickOpen} className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500">
            Quick Open
          </button>
          <button
            onClick={onNewFile}
            className="rounded border border-[var(--border)] bg-[var(--button-bg)] px-4 py-2 text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--button-hover)]"
          >
            New File
          </button>
        </div>
      </div>
    </div>
  );
}

function AssistantPanel({ input, onInput, mode, setMode, activeFile, messages, onAsk, inputRef }) {
  const quickInsights = activeFile
    ? inspectFile(activeFile)
    : [{ title: 'No file open', body: 'Open a file from Explorer or Quick Open so the assistant can review your code.' }];

  return (
    <div className="flex h-full flex-col bg-[var(--panel-bg)]">
      <PanelHeader title="AI Assistant">
        <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-1 text-emerald-400">
          <Zap size={12} />
          Online
        </span>
      </PanelHeader>

      <div className="flex gap-1 border-b border-[var(--border)] p-2">
        {[
          ['debug', Bug, 'Debug'],
          ['complete', Sparkles, 'Complete'],
          ['refactor', Lightbulb, 'Refactor'],
        ].map(([key, Icon, label]) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`flex h-10 flex-1 items-center justify-center gap-2 rounded text-xs font-semibold transition ${
              mode === key ? 'bg-indigo-600 text-white' : 'bg-[var(--button-bg)] text-[var(--app-text)] hover:bg-[var(--button-hover)]'
            }`}
          >
            <Icon size={15} />
            <span className="hidden xl:inline">{label}</span>
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3">
        <div className="rounded border border-[var(--border)] bg-[var(--soft-bg)] p-3 shadow-sm animate-slide-in">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Bot size={16} className="text-indigo-400" />
            Gemini streaming code analysis
          </div>
          <p className="text-sm leading-5 text-[var(--muted)]">
            {activeFile
              ? `I am reading your current editor text from ${activeFile.name}. Ask about mistakes, output, fixes, or completions.`
              : 'No file is currently open. Open a file first and I will analyze the current code in real time.'}
          </p>
          <div className="mt-3 space-y-2">
            {quickInsights.map((item, index) => (
              <div key={index} className="rounded bg-[var(--panel-bg)] p-2 text-xs leading-5">
                <b>{item.title}</b>
                <br />
                {item.body}
              </div>
            ))}
          </div>
        </div>

        {messages.length === 0 && <Empty text="Try: What mistakes are in my code?" />}

        {messages.map((message, index) => (
          <div
            key={message.id || index}
            className={`rounded border p-3 text-sm leading-6 animate-slide-in ${
              message.role === 'user'
                ? 'ml-8 border-indigo-500/30 bg-indigo-500/10'
                : 'mr-8 border-[var(--border)] bg-[var(--soft-bg)]'
            }`}
          >
            <div className="mb-1 flex items-center justify-between text-xs text-[var(--muted)]">
              <span>{message.role === 'user' ? 'You' : 'AI Code Assistant'}</span>
              <span>{message.time}</span>
            </div>
            {message.role === 'ai' ? (
              <MarkdownMessage text={message.text} />
            ) : (
              <div className="whitespace-pre-wrap">{message.text}</div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-[var(--border)] p-3">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(event) => onInput(event.target.value)}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') onAsk();
          }}
          className="h-24 w-full resize-none rounded border border-[var(--border)] bg-[var(--input-bg)] p-3 text-sm outline-none ring-indigo-500/30 transition focus:ring-4"
          placeholder="Ask Gemini about bugs, output, refactoring, or code completion..."
        />
        <button onClick={onAsk} className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded bg-indigo-600 px-3 text-sm font-semibold text-white transition hover:bg-indigo-500">
          <Bot size={16} />
          Ask Gemini assistant
        </button>
      </div>
    </div>
  );
}

function MarkdownMessage({ text }) {
  return (
    <div className="ai-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {text}
      </ReactMarkdown>
    </div>
  );
}

function ConsolePanel({ entries, height, setHeight }) {
  const startRef = useRef(null);

  const onPointerDown = (event) => {
    startRef.current = { y: event.clientY, height };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event) => {
    if (!startRef.current) return;
    const delta = startRef.current.y - event.clientY;
    setHeight(Math.max(118, Math.min(310, startRef.current.height + delta)));
  };

  return (
    <section className="relative shrink-0 border-t border-[var(--border)] bg-[var(--panel-bg)]" style={{ height }}>
      <div
        className="absolute -top-1 left-0 right-0 h-2 cursor-row-resize bg-transparent hover:bg-indigo-500/20"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => (startRef.current = null)}
      />

      <div className="flex h-9 items-center justify-between border-b border-[var(--border)] px-3 text-sm">
        <div className="flex items-center gap-2 font-semibold">
          <Terminal size={16} />
          Output Console
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <CheckCircle2 size={14} className="text-emerald-500" />
          real-time mock runner
        </div>
      </div>

      <div className="h-[calc(100%-36px)] overflow-auto p-3 font-mono text-xs">
        {entries.map((entry, index) => (
          <div key={index} className={`py-0.5 ${consoleColor(entry.type)}`}>
            {entry.text}
          </div>
        ))}
      </div>
    </section>
  );
}

function Palette({ type, files, onClose, onOpenFile, onCommand }) {
  const [query, setQuery] = useState('');

  const commands = [
    ['run', 'Run Current File', 'Ctrl Enter'],
    ['save', 'Save Workspace', 'Ctrl S'],
    ['rename', 'Rename File', 'F2'],
    ['wrap', 'Toggle Word Wrap', 'Alt Z'],
    ['console', 'Toggle Console', 'Ctrl J'],
    ['sidebar', 'Toggle Sidebar', 'Ctrl B'],
    ['explorer', 'Show Explorer', 'Ctrl Shift E'],
    ['search', 'Show Search', 'Ctrl Shift F'],
    ['source', 'Show Source Control', 'Ctrl Shift G'],
    ['debug', 'Show Debug', 'Ctrl Shift D'],
    ['tools', 'Show Extensions', 'Ctrl Shift X'],
    ['ai', 'Focus AI Chat', 'Ctrl I'],
    ['reset', 'Refresh Workspace', 'Ctrl R'],
  ];

  const isQuick = type === 'quickOpen';
  const rows = isQuick
    ? files.filter((file) => file.name.toLowerCase().includes(query.toLowerCase()))
    : commands.filter((command) => command[1].toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-40 bg-black/40 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div
        className="mx-auto mt-16 w-full max-w-2xl rounded border border-[var(--border)] bg-[var(--panel-bg)] shadow-2xl animate-slide-in"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') onClose();
          }}
          placeholder={type === 'shortcuts' ? 'Keyboard shortcuts' : isQuick ? 'Quick open file...' : 'Run command...'}
          className="h-12 w-full border-b border-[var(--border)] bg-[var(--input-bg)] px-4 outline-none"
        />

        {type === 'shortcuts' ? (
          <div className="grid max-h-[60vh] gap-2 overflow-auto p-3 sm:grid-cols-2">
            {shortcutRows.map(([name, keys]) => (
              <div key={name} className="flex items-center justify-between gap-3 rounded border border-[var(--border)] bg-[var(--soft-bg)] p-3 text-sm">
                <span>{name}</span>
                <kbd className="rounded bg-[var(--button-bg)] px-2 py-1 font-mono text-xs">{keys}</kbd>
              </div>
            ))}
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-auto p-2">
            {rows.map((row) => (
              <button
                key={isQuick ? row.id : row[0]}
                onClick={() => (isQuick ? onOpenFile(row.id) : onCommand(row[0]))}
                className="flex h-10 w-full items-center gap-3 rounded px-3 text-left text-sm hover:bg-[var(--button-hover)]"
              >
                {isQuick ? <FileCode2 size={16} className="text-sky-500" /> : <Command size={16} className="text-indigo-400" />}
                <span className="min-w-0 flex-1 truncate">{isQuick ? row.name : row[1]}</span>
                {!isQuick && row[2] && (
                  <kbd className="shrink-0 rounded border border-[var(--border)] bg-[var(--button-bg)] px-2 py-1 font-mono text-[11px] text-[var(--muted)]">
                    {row[2]}
                  </kbd>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ResizablePanel({ width, min, max, side, onResize, children }) {
  const startRef = useRef(null);

  const onPointerDown = (event) => {
    startRef.current = { x: event.clientX, width };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event) => {
    if (!startRef.current) return;
    const delta = event.clientX - startRef.current.x;
    const next = side === 'left' ? startRef.current.width + delta : startRef.current.width - delta;
    onResize(Math.max(min, Math.min(max, next)));
  };

  return (
    <aside
      className={`relative hidden min-h-0 shrink-0 border-[var(--border)] bg-[var(--panel-bg)] lg:block ${
        side === 'left' ? 'border-r' : 'border-l'
      }`}
      style={{ width }}
    >
      {children}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => (startRef.current = null)}
        className={`absolute top-0 z-20 flex h-full w-2 cursor-col-resize items-center justify-center text-transparent transition hover:bg-indigo-500/20 hover:text-indigo-500 ${
          side === 'left' ? '-right-1' : '-left-1'
        }`}
      >
        <GripVertical size={14} />
      </div>
    </aside>
  );
}

function PanelHeader({ title, children }) {
  return (
    <div className="flex h-10 items-center justify-between border-b border-[var(--border)] px-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
      {title}
      <div className="flex items-center gap-1">{children}</div>
    </div>
  );
}

function IconButton({ label, icon: Icon, onClick, accent = false, small = false }) {
  return (
    <button
      onClick={onClick}
      className={`grid place-items-center rounded transition ${small ? 'size-7' : 'size-8'} ${
        accent
          ? 'bg-emerald-600 text-white hover:bg-emerald-500'
          : 'text-[var(--muted)] hover:bg-[var(--button-hover)] hover:text-[var(--app-text)]'
      }`}
      title={label}
    >
      <Icon size={small ? 14 : 16} />
    </button>
  );
}

function Empty({ text }) {
  return <div className="rounded border border-dashed border-[var(--border)] p-3 text-sm text-[var(--muted)]">{text}</div>;
}

function updateTree(nodes, id, updater) {
  return nodes.map((node) => {
    if (node.id === id) return updater(node);
    return { ...node, children: node.children ? updateTree(node.children, id, updater) : node.children };
  });
}

function flattenFiles(nodes) {
  return nodes.flatMap((node) => (node.type === 'file' ? [node] : flattenFiles(node.children || [])));
}

function loadStoredState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function languageExtension(language) {
  if (language === 'typescript') return javascript({ typescript: true, jsx: false });
  if (language === 'json') return json();
  if (language === 'css') return css();
  if (language === 'markdown') return markdown();
  return javascript({ jsx: true });
}

function detectLanguage(name, fallback) {
  if (name.endsWith('.ts') || name.endsWith('.tsx')) return 'typescript';
  if (name.endsWith('.json')) return 'json';
  if (name.endsWith('.css')) return 'css';
  if (name.endsWith('.md')) return 'markdown';
  if (name.endsWith('.js') || name.endsWith('.jsx')) return 'javascript';
  return fallback || 'javascript';
}

function getEditorTheme(theme) {
  if (theme === 'dracula') return dracula;
  if (theme === 'light') return 'light';
  if (theme === 'dark') return oneDark;

  const palettes = {
    ocean: { bg: '#071923', fg: '#d7f3ff', gutter: '#123142', active: '#0e2d3b' },
    forest: { bg: '#0c1711', fg: '#e7f7ea', gutter: '#14261a', active: '#183322' },
    contrast: { bg: '#000000', fg: '#ffffff', gutter: '#111111', active: '#1d1d1d' },
  };

  const selected = palettes[theme] || palettes.ocean;

  return EditorView.theme(
    {
      '&': { backgroundColor: selected.bg, color: selected.fg },
      '.cm-content': { caretColor: '#8b5cf6' },
      '.cm-gutters': { backgroundColor: selected.gutter, color: '#94a3b8', border: 'none' },
      '.cm-activeLine': { backgroundColor: selected.active },
      '.cm-activeLineGutter': { backgroundColor: selected.active },
      '.cm-selectionBackground': { backgroundColor: '#4f46e5aa !important' },
    },
    { dark: theme !== 'light' },
  );
}

function inspectFile(file) {
  const code = file.content;
  const issues = [];

  if (code.includes('useMemo') && !code.includes('useCallback')) {
    issues.push({
      title: 'Optimization note',
      body: 'Handlers passed into child components may recreate every render. useCallback can help when children are memoized.',
    });
  }

  if (code.includes('localStorage') && !code.includes('try')) {
    issues.push({
      title: 'Storage safety',
      body: 'localStorage can fail in restricted browser modes. Wrap parsing and writing in try/catch.',
    });
  }

  if (code.includes('includes(') && !code.includes('toLowerCase')) {
    issues.push({
      title: 'Input handling',
      body: 'String matching is case-sensitive. Convert user input to lowercase before checking keywords.',
    });
  }

  if (code.includes('return (') && !code.includes('aria-') && !code.includes('title=')) {
    issues.push({
      title: 'Accessibility',
      body: 'Interactive controls should have title or aria labels.',
    });
  }

  if (issues.length === 0) {
    issues.push({ title: 'Looks stable', body: 'No obvious issue was found by the mock analyzer.' });
  }

  return issues.slice(0, 3);
}

function analyzeCode(file, question, mode) {
  const issues = inspectFile(file);
  const lower = question.toLowerCase();

  if (lower.includes('output') || lower.includes('result')) {
    return `## Desired output for ${file.name}\n\n${simulateRun(file).map((entry) => `- ${entry.text}`).join('\n')}`;
  }

  if (lower.includes('mistake') || lower.includes('bug') || lower.includes('error') || mode === 'debug') {
    return `## Mistakes or risks in ${file.name}\n\n${issues
      .map((issue, index) => `${index + 1}. **${issue.title}:** ${issue.body}`)
      .join('\n\n')}\n\n## How I would tackle them\n\n- Reproduce the issue with the current file content.\n- Fix unsafe state or browser API access.\n- Run the current file again.\n- Confirm the console output is clean.`;
  }

  if (lower.includes('complete') || mode === 'complete') {
    return `## Suggested completion\n\n\`\`\`js\nfunction clampSize(value, min, max) {\n  return Math.max(min, Math.min(max, value));\n}\n\`\`\`\n\nUse it for editor panels and console height so stretching never creates blank gaps.`;
  }

  return `## Refactor suggestion for ${file.name}\n\nSeparate editor state, file tree operations, runner output, and AI message generation into smaller helper functions.`;
}

function simulateRun(file) {
  const code = file.content;
  const logs = [...code.matchAll(/console\.log\((['"`])([\s\S]*?)\1\)/g)].map((match) => match[2]);

  if (code.includes('throw new Error')) {
    return [
      { type: 'error', text: `RuntimeError in ${file.name}: manual error was thrown` },
      { type: 'warn', text: 'AI hint: inspect throw new Error(...) and guard that branch.' },
    ];
  }

  if (code.includes('undefined.') || code.includes('null.')) {
    return [
      { type: 'error', text: `TypeError in ${file.name}: attempted to read from unsafe value` },
      { type: 'warn', text: 'AI hint: add optional chaining or a fallback before accessing the property.' },
    ];
  }

  if (logs.length) {
    return [{ type: 'success', text: `${file.name} executed successfully` }, ...logs.map((text) => ({ type: 'log', text }))];
  }

  return [
    { type: 'success', text: `${file.name} executed successfully` },
    { type: 'info', text: 'No console.log output found. UI render simulated successfully.' },
  ];
}

function defaultConsole() {
  return [
    { type: 'command', text: '$ npm run dev' },
    { type: 'success', text: 'VITE ready at http://localhost:5173/' },
    { type: 'info', text: '[editor] CodeMirror real-time editing enabled' },
    { type: 'log', text: '[storage] files, layout, sidebar, themes, shortcuts, and editor positions are saved in localStorage' },
  ];
}

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fileIcon(language) {
  if (language === 'json') return FileJson;
  if (language === 'markdown') return FileText;
  if (language === 'css') return Database;
  return FileCode2;
}

function consoleColor(type) {
  return {
    command: 'text-zinc-500',
    success: 'text-emerald-400',
    info: 'text-sky-400',
    log: 'text-[var(--app-text)]',
    warn: 'text-amber-400',
    error: 'text-rose-400',
  }[type];
}

createRoot(document.getElementById('root')).render(<App />);
