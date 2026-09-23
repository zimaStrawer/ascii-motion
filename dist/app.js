const NS = 'http://www.w3.org/2000/svg';
const scenes = {
  owl: { file: './assets/glyph-motion/owl.json', index: '01', title: '猫头鹰与树枝', palette: 'BLUE / ORANGE / GREEN', accent: '#247df0', description: '字符猫头鹰降落并收拢翅膀，停在由标点和括号组成的树枝上。' },
  rabbit: { file: './assets/glyph-motion/rabbit.json', index: '02', title: '白兔、胡萝卜与草', palette: 'WHITE / GREEN / ORANGE', accent: '#f3f3ef', viewBox: [105, 90, 720, 490], description: '白兔完成耳朵变化和姿态过渡，周围的胡萝卜与草逐步生长。' },
  spider: { file: './assets/glyph-motion/spider.json', index: '03', title: '蜘蛛下行', palette: 'ORANGE / WHITE', accent: '#ff6900', description: '蜘蛛由字符片段组成，并沿垂直方向完成一次下行动作。' },
  frog: { file: './assets/glyph-motion/frog.json', index: '04', title: '青蛙弹跳与捕虫', palette: 'GREEN / BLUE / ORANGE', accent: '#46c324', viewBox: [45, 520, 1000, 830], description: '青蛙先压缩蓄力，再弹跳、落地并吐舌捕捉飞虫。' }
};

const svg = document.querySelector('#motion-svg');
const defs = document.querySelector('#glyph-defs');
const art = document.querySelector('#glyph-art');
const guides = document.querySelector('#glyph-guides');
const tabs = [...document.querySelectorAll('[data-scene]')];
const ui = Object.fromEntries(['scene-index','scene-title','scene-description','scene-role','motion-state','glyph-count','fps-value','frame-total','current-time','duration','progress','play','play-icon','play-label','restart','previous','next','frame-readout','guide-toggle','principle-toggle','principle-close'].map(id => [id, document.getElementById(id)]));
const cache = new Map();
let sceneName = 'owl';
let scene = null;
let frame = 0;
let cursor = 0;
let playing = !matchMedia('(prefers-reduced-motion: reduce)').matches;
let previousTime = null;
let token = 0;

function svgElement(tag, attrs = {}, parent) {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  parent?.append(node);
  return node;
}

function formatTime(value) {
  return value.toFixed(2).padStart(5, '0');
}

function displayGlyphChar(value = '') {
  if (value === 'accent') return 'ˆ';
  if (value === 'featherL') return '/';
  if (value === 'featherR') return '\\';
  return value;
}

async function getScene(name) {
  if (!cache.has(name)) {
    const response = await fetch(scenes[name].file);
    if (!response.ok) throw new Error(`Unable to load ${name}`);
    cache.set(name, await response.json());
  }
  return cache.get(name);
}

function buildGlyphAtlas() {
  defs.replaceChildren();
  scene.glyphs.forEach((glyph, index) => svgElement('path', { id: `glyph-${sceneName}-${index}`, d: glyph.path }, defs));
}

function render(nextFrame) {
  if (!scene) return;
  frame = Math.max(0, Math.min(scene.frames.length - 1, Math.floor(nextFrame)));
  const parts = scene.frames[frame];
  const fragment = document.createDocumentFragment();
  const guideFragment = document.createDocumentFragment();
  for (const part of parts) {
    const [x, y, w, h] = part.b;
    const glyph = scene.glyphs[part.g];
    svgElement('use', {
      href: `#glyph-${sceneName}-${part.g}`,
      fill: part.c,
      transform: `translate(${x} ${y}) scale(${w / 1000} ${h / 1000})`
    }, fragment);
    svgElement('rect', { class: 'glyph-guide', x, y, width: w, height: h }, guideFragment);
    const label = svgElement('text', {
      class: 'glyph-label', x, y, fill: part.c,
      'text-anchor': 'middle', 'dominant-baseline': 'central'
    }, guideFragment);
    label.textContent = displayGlyphChar(glyph?.char);
  }
  art.replaceChildren(fragment);
  guides.replaceChildren(guideFragment);
  ui.progress.value = String(frame);
  ui.progress.style.setProperty('--progress', `${frame / Math.max(1, scene.frames.length - 1) * 100}%`);
  ui.progress.setAttribute('aria-valuetext', `第 ${frame + 1} 帧，共 ${scene.frames.length} 帧`);
  ui['current-time'].textContent = formatTime(frame / scene.fps);
  ui['frame-readout'].textContent = `${String(frame + 1).padStart(3, '0')} / ${String(scene.frames.length).padStart(3, '0')}`;
}

function updatePlayButton() {
  ui['play-icon'].textContent = playing ? 'Ⅱ' : '▶';
  ui['play-label'].textContent = playing ? '暂停' : '播放';
  ui.play.setAttribute('aria-label', playing ? '暂停动画' : '播放动画');
  ui['motion-state'].textContent = playing ? 'PLAYING' : frame === scene?.frames.length - 1 ? 'COMPLETE' : 'PAUSED';
}

function setPlaying(value) {
  playing = value;
  previousTime = null;
  updatePlayButton();
}

function seek(value) {
  setPlaying(false);
  cursor = Math.max(0, Math.min(scene.frames.length - 1, value));
  render(cursor);
}

async function selectScene(name, autoplay = true) {
  const request = ++token;
  sceneName = name;
  const nextScene = await getScene(name);
  if (request !== token) return;
  scene = nextScene;
  const config = scenes[name];
  frame = 0;
  cursor = 0;
  document.documentElement.style.setProperty('--accent', config.accent);
  document.documentElement.style.setProperty('--stage-ratio', `${scene.viewBox[2]} / ${scene.viewBox[3]}`);
  document.querySelector('#stage').dataset.scene = name;
  svg.setAttribute('viewBox', (config.viewBox || scene.viewBox).join(' '));
  ui['scene-index'].textContent = `SCENE ${config.index}`;
  ui['scene-title'].textContent = config.title;
  ui['scene-description'].textContent = config.description;
  ui['scene-role'].textContent = config.palette;
  ui['glyph-count'].textContent = String(scene.glyphs.length).padStart(2, '0');
  ui['fps-value'].textContent = scene.fps;
  ui['frame-total'].textContent = scene.frames.length;
  ui.duration.textContent = formatTime((scene.frames.length - 1) / scene.fps);
  ui.progress.max = String(scene.frames.length - 1);
  tabs.forEach(tab => tab.setAttribute('aria-selected', String(tab.dataset.scene === name)));
  buildGlyphAtlas();
  render(0);
  setPlaying(autoplay && !matchMedia('(prefers-reduced-motion: reduce)').matches);
}

tabs.forEach(tab => tab.addEventListener('click', () => selectScene(tab.dataset.scene)));
ui.play.addEventListener('click', () => {
  if (frame === scene.frames.length - 1 && !playing) { cursor = 0; render(0); }
  setPlaying(!playing);
});
ui.restart.addEventListener('click', () => { cursor = 0; render(0); setPlaying(true); });
ui.previous.addEventListener('click', () => seek(frame - 1));
ui.next.addEventListener('click', () => seek(frame + 1));
ui.progress.addEventListener('input', () => seek(Number(ui.progress.value)));
ui['guide-toggle'].addEventListener('click', () => {
  const active = ui['guide-toggle'].getAttribute('aria-pressed') !== 'true';
  ui['guide-toggle'].setAttribute('aria-pressed', String(active));
  ui['guide-toggle'].querySelector('span:last-child').textContent = active ? '隐藏字符框' : '显示字符框';
  document.querySelector('#stage').classList.toggle('show-guides', active);
});

const principlePanel = document.querySelector('#principle-panel');
function setPrincipleOpen(active) {
  principlePanel.classList.toggle('is-open', active);
  ui['principle-toggle'].setAttribute('aria-expanded', String(active));
}
ui['principle-toggle'].addEventListener('click', () => setPrincipleOpen(!principlePanel.classList.contains('is-open')));
ui['principle-close'].addEventListener('click', () => {
  setPrincipleOpen(false);
  ui['principle-toggle'].focus();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && principlePanel.classList.contains('is-open')) {
    setPrincipleOpen(false);
    ui['principle-toggle'].focus();
    return;
  }
  if (event.target.closest('button,input,a')) return;
  if (event.code === 'Space') { event.preventDefault(); ui.play.click(); }
  if (event.code === 'ArrowLeft') { event.preventDefault(); seek(frame - 1); }
  if (event.code === 'ArrowRight') { event.preventDefault(); seek(frame + 1); }
});
document.addEventListener('visibilitychange', () => { previousTime = null; });
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', event => { if (event.matches) setPlaying(false); });

function tick(now) {
  if (playing && scene && !document.hidden && previousTime !== null) {
    cursor += Math.min((now - previousTime) / 1000, .1) * scene.fps;
    if (cursor >= scene.frames.length - 1) {
      cursor = scene.frames.length - 1;
      render(cursor);
      setPlaying(false);
    } else if (Math.floor(cursor) !== frame) {
      render(cursor);
    }
  }
  previousTime = now;
  requestAnimationFrame(tick);
}

selectScene('owl');
requestAnimationFrame(tick);
