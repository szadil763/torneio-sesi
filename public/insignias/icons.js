// Ícones SVG reutilizáveis — mesmo arquivo do projeto torneio-insignias.
const ICONS = {
  bridge: '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 22c4-8 20-8 24 0" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M4 22v4M10 22v4M16 22v4M22 22v4M28 22v4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  tower:  '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="4" width="12" height="6" rx="1.5" stroke="currentColor" stroke-width="2.2"/><rect x="7" y="12" width="18" height="6" rx="1.5" stroke="currentColor" stroke-width="2.2"/><rect x="4" y="20" width="24" height="6" rx="1.5" stroke="currentColor" stroke-width="2.2"/></svg>',
  maze:   '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 5h9v9h9v-6h4M5 5v22h13v-9h9" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  ball:   '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="11" stroke="currentColor" stroke-width="2.2"/><path d="M5 16h22" stroke="currentColor" stroke-width="2.2"/><circle cx="16" cy="16" r="3.4" fill="currentColor"/></svg>',
  leaf:   '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 24C6 14 14 6 24 6c1 10-7 18-17 18Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M8 24 20 12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  cadeado:'<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="14" width="16" height="12" rx="2.5" stroke="currentColor" stroke-width="2.2"/><path d="M11 14v-3a5 5 0 0 1 10 0v3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  selo:   '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 3 27 9v10L16 29 5 19V9Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="16" cy="15" r="4" stroke="currentColor" stroke-width="2.2"/></svg>',
};

function icone(nome, cls) {
  return `<span class="${cls || 'icone'}">${ICONS[nome] || ICONS.selo}</span>`;
}
