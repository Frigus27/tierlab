/* =========================================================
   TIERLAB
   A local-first tier list maker.
   No frameworks, no network calls except user-supplied images.
   ========================================================= */

(() => {
  "use strict";

  const STORAGE_KEY = "tierlab.board.v2";
  const MAX_HISTORY = 40;

  const PALETTE = [
    { hex: "#ff8a80", name: "珊瑚红" },
    { hex: "#ffb36b", name: "杏子橙" },
    { hex: "#ffd43b", name: "柠檬黄" },
    { hex: "#c3e86b", name: "青柠绿" },
    { hex: "#7ee0c3", name: "薄荷绿" },
    { hex: "#7cc4ff", name: "天空蓝" },
    { hex: "#a5a1ff", name: "长春花" },
    { hex: "#e9a6ff", name: "兰花紫" },
    { hex: "#ff9ac1", name: "樱花粉" },
    { hex: "#d8c9a7", name: "沙丘色" },
    { hex: "#b8b2a6", name: "岩石灰" },
    { hex: "#2f2c26", name: "墨黑" },
  ];

  const TEXT_COLORS = [
    "#ffd43b",
    "#ffb36b",
    "#ff9ac1",
    "#c3e86b",
    "#7ee0c3",
    "#7cc4ff",
    "#a5a1ff",
    "#ff8a80",
    "#e8e1d3",
    "#2f2c26",
  ];

  const TIER_DEFS = [
    { label: "S", color: "#ff8a80" },
    { label: "A", color: "#ffb36b" },
    { label: "B", color: "#ffd43b" },
    { label: "C", color: "#c3e86b" },
    { label: "D", color: "#7ee0c3" },
    { label: "E", color: "#7cc4ff" },
    { label: "F", color: "#a5a1ff" },
  ];

  const TIER_LABEL_POOL = ["S", "A", "B", "C", "D", "E", "F", "G"];

  const EMOJI_LIBRARY = [
    { e: "😀", n: "开心" },
    { e: "😭", n: "破防" },
    { e: "😎", n: "稳了" },
    { e: "🥹", n: "感动" },
    { e: "🤯", n: "震撼" },
    { e: "🫠", n: "融化" },
    { e: "💀", n: "无语" },
    { e: "👑", n: "王者" },
    { e: "🔥", n: "神作" },
    { e: "💩", n: "一坨" },
    { e: "⭐", n: "经典" },
    { e: "🌈", n: "梦幻" },
    { e: "💎", n: "宝藏" },
    { e: "🧠", n: "烧脑" },
    { e: "❤️", n: "心动" },
    { e: "💔", n: "心碎" },
    { e: "🎮", n: "游戏" },
    { e: "🎧", n: "音乐" },
    { e: "🎬", n: "电影" },
    { e: "📚", n: "书" },
    { e: "🎨", n: "艺术" },
    { e: "📷", n: "摄影" },
    { e: "⚽", n: "运动" },
    { e: "🛹", n: "滑板" },
    { e: "☕", n: "咖啡" },
    { e: "🧋", n: "奶茶" },
    { e: "🍜", n: "泡面" },
    { e: "🍣", n: "寿司" },
    { e: "🍕", n: "披萨" },
    { e: "🍰", n: "蛋糕" },
    { e: "🍉", n: "西瓜" },
    { e: "🥭", n: "芒果" },
    { e: "🍓", n: "草莓" },
    { e: "🍒", n: "车厘子" },
    { e: "🍑", n: "水蜜桃" },
    { e: "🍍", n: "菠萝" },
    { e: "🥝", n: "猕猴桃" },
    { e: "🍊", n: "橘子" },
    { e: "🍎", n: "苹果" },
    { e: "🍌", n: "香蕉" },
    { e: "🐱", n: "猫" },
    { e: "🐶", n: "狗" },
    { e: "🐼", n: "熊猫" },
    { e: "🦊", n: "狐狸" },
    { e: "🐸", n: "青蛙" },
    { e: "🦄", n: "独角兽" },
    { e: "🚀", n: "火箭" },
    { e: "🌙", n: "月亮" },
  ];

  const FRUITS = [
    { e: "🍉", n: "西瓜" },
    { e: "🥭", n: "芒果" },
    { e: "🍓", n: "草莓" },
    { e: "🍒", n: "车厘子" },
    { e: "🍑", n: "水蜜桃" },
    { e: "🍇", n: "阳光玫瑰" },
    { e: "🍍", n: "菠萝" },
    { e: "🥝", n: "猕猴桃" },
    { e: "🍊", n: "橘子" },
    { e: "🍎", n: "苹果" },
    { e: "🍌", n: "香蕉" },
    { e: "🍐", n: "梨" },
    { e: "🍋", n: "柠檬" },
    { e: "🫐", n: "蓝莓" },
    { e: "🥥", n: "椰子" },
    { e: "🍈", n: "哈密瓜" },
    { e: "🍅", n: "番茄" },
    { e: "🥑", n: "牛油果" },
  ];

  const TEMPLATES = [
    {
      id: "blank",
      name: "空白 S–F",
      desc: "经典七档，从一张白纸开始。",
      title: "我的 Tier List",
      items: [],
    },
    {
      id: "fruit",
      name: "水果摊大赏",
      desc: "夏天最爱的水果，谁配得上 S？",
      title: "水果摊大赏",
      items: FRUITS,
    },
    {
      id: "milktea",
      name: "奶茶小料世界杯",
      desc: "珍珠、椰果、芋圆，你的本命是？",
      title: "奶茶小料世界杯",
      items: [
        { e: "🟤", n: "珍珠" },
        { e: "⚪", n: "椰果" },
        { e: "🟣", n: "芋圆" },
        { e: "🟡", n: "布丁" },
        { e: "⬛", n: "仙草" },
        { e: "🔴", n: "红豆" },
        { e: "🤍", n: "奶盖" },
        { e: "🟠", n: "爆爆珠" },
        { e: "🍡", n: "麻薯" },
        { e: "🧊", n: "寒天" },
        { e: "🌾", n: "燕麦" },
        { e: "🫘", n: "绿豆" },
        { e: "🥛", n: "西米" },
        { e: "🍮", n: "奶冻" },
      ],
    },
    {
      id: "games",
      name: "游戏类型大乱斗",
      desc: "开放世界还是像素独立？没有中间地带。",
      title: "游戏类型大乱斗",
      items: [
        { e: "🗺️", n: "开放世界" },
        { e: "🕹️", n: "像素独立" },
        { e: "🎯", n: "FPS" },
        { e: "🧩", n: "解谜" },
        { e: "🏎️", n: "竞速" },
        { e: "⚔️", n: "RPG" },
        { e: "👻", n: "恐怖" },
        { e: "🃏", n: "卡牌" },
        { e: "🎵", n: "音游" },
        { e: "🏝️", n: "生存" },
        { e: "🚜", n: "种田" },
        { e: "🧠", n: "策略" },
        { e: "🕵️", n: "推理" },
        { e: "🤼", n: "格斗" },
      ],
    },
    {
      id: "drinks",
      name: "打工人续命水",
      desc: "咖啡、奶茶、冰水，谁救过你的命？",
      title: "打工人续命水",
      items: [
        { e: "☕", n: "冰美式" },
        { e: "🧋", n: "奶茶" },
        { e: "🥤", n: "可乐" },
        { e: "🧊", n: "冰水" },
        { e: "🍵", n: "热茶" },
        { e: "🧃", n: "果汁" },
        { e: "🥛", n: "牛奶" },
        { e: "🍺", n: "啤酒" },
        { e: "🍷", n: "红酒" },
        { e: "🧉", n: "马黛茶" },
        { e: "🥟", n: "夜宵" },
        { e: "🛌", n: "睡觉" },
      ],
    },
    {
      id: "screen",
      name: "周末片单",
      desc: "两个小时，把命交给谁？",
      title: "周末片单",
      items: [
        { e: "🚀", n: "科幻" },
        { e: "🕵️", n: "悬疑" },
        { e: "💥", n: "动作" },
        { e: "😂", n: "喜剧" },
        { e: "💔", n: "爱情" },
        { e: "👻", n: "恐怖" },
        { e: "🧸", n: "动画" },
        { e: "🏯", n: "古装" },
        { e: "🌆", n: "文艺" },
        { e: "🦸", n: "超英" },
        { e: "🎤", n: "音乐剧" },
        { e: "📼", n: "纪录片" },
      ],
    },
  ];

  const FONT_SANS =
    '"PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const FONT_MONO =
    '"SF Mono", "JetBrains Mono", Menlo, Consolas, "Liberation Mono", monospace';
  const FONT_EMOJI =
    '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const els = {
    body: document.body,
    board: $("#board"),
    boardTitle: $("#boardTitle"),
    pool: $("#pool"),
    poolGrid: $("#poolGrid"),
    poolFootnote: $("#poolFootnote"),
    poolCount: $("#poolCount"),
    itemCount: $("#itemCount"),
    undoBtn: $("#undoBtn"),
    redoBtn: $("#redoBtn"),
    addTierBtn: $("#addTierBtn"),
    openTemplatesBtn: $("#openTemplatesBtn"),
    openExportBtn: $("#openExportBtn"),
    newBtn: $("#newBtn"),
    saveStatus: $("#saveStatus"),
    saveText: $("#saveText"),
    selectionBar: $("#selectionBar"),
    selectionName: $("#selectionName"),
    selectionEdit: $("#selectionEdit"),
    selectionCancel: $("#selectionCancel"),
    toasts: $("#toasts"),
    fileOverlay: $("#fileOverlay"),
    addDialog: $("#addDialog"),
    addTitle: $("#addTitle"),
    uploadZone: $("#uploadZone"),
    fileInput: $("#fileInput"),
    pasteImageBtn: $("#pasteImageBtn"),
    emojiGrid: $("#emojiGrid"),
    emojiAddedNote: $("#emojiAddedNote"),
    customEmoji: $("#customEmoji"),
    customEmojiName: $("#customEmojiName"),
    addCustomEmoji: $("#addCustomEmoji"),
    textContent: $("#textContent"),
    textColorGrid: $("#textColorGrid"),
    textPreview: $("#textPreview"),
    addTextBtn: $("#addTextBtn"),
    imageUrl: $("#imageUrl"),
    imageUrlName: $("#imageUrlName"),
    addUrlBtn: $("#addUrlBtn"),
    tierDialog: $("#tierDialog"),
    tierPreview: $("#tierPreview"),
    tierPreviewLetter: $("#tierPreviewLetter"),
    tierNameInput: $("#tierNameInput"),
    tierColorGrid: $("#tierColorGrid"),
    moveTierUp: $("#moveTierUp"),
    moveTierDown: $("#moveTierDown"),
    deleteTierBtn: $("#deleteTierBtn"),
    templatesDialog: $("#templatesDialog"),
    templateGrid: $("#templateGrid"),
    helpDialog: $("#helpDialog"),
    exportDialog: $("#exportDialog"),
    exportStage: $("#exportStage"),
    exportSize: $("#exportSize"),
    exportNotice: $("#exportNotice"),
    copyImageBtn: $("#copyImageBtn"),
    downloadImageBtn: $("#downloadImageBtn"),
    itemDialog: $("#itemDialog"),
    itemEditPreview: $("#itemEditPreview"),
    itemNameInput: $("#itemNameInput"),
    itemRemoveBtn: $("#itemRemoveBtn"),
    itemSaveBtn: $("#itemSaveBtn"),
  };

  /* ---------------------------------------------------------
     Tiny utilities
     --------------------------------------------------------- */

  let uidCounter = 0;

  function uid(prefix = "id") {
    uidCounter += 1;
    return `${prefix}-${Date.now().toString(36)}-${uidCounter.toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 6)}`;
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => {
      switch (char) {
        case "&":
          return "&amp;";
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case '"':
          return "&quot;";
        case "'":
          return "&#39;";
        default:
          return char;
      }
    });
  }

  function safeColor(value, fallback = "#ffd43b") {
    return /^#[0-9a-f]{6}$/i.test(String(value)) ? value : fallback;
  }

  function contrastColor(hex) {
    const color = safeColor(hex, "#ffd43b").slice(1);
    const r = parseInt(color.slice(0, 2), 16) / 255;
    const g = parseInt(color.slice(2, 4), 16) / 255;
    const b = parseInt(color.slice(4, 6), 16) / 255;
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance > 0.55 ? "#171613" : "#fffdf8";
  }

  function cloneState(source = state) {
    return {
      version: source.version,
      title: source.title,
      tiers: source.tiers.map((tier) => ({
        id: tier.id,
        label: tier.label,
        color: tier.color,
        itemIds: [...tier.itemIds],
      })),
      pool: [...source.pool],
      items: Object.fromEntries(
        Object.entries(source.items).map(([id, item]) => [id, { ...item }])
      ),
      updatedAt: source.updatedAt,
    };
  }

  function makeImageItem(src, name, remote = false) {
    return {
      id: uid("item"),
      kind: "image",
      src,
      name: name || "",
      remote: Boolean(remote),
    };
  }

  function makeEmojiItem(emoji, name = "") {
    return {
      id: uid("item"),
      kind: "emoji",
      emoji: emoji || "⭐",
      name: name || "",
    };
  }

  function makeTextItem(text, color) {
    return {
      id: uid("item"),
      kind: "text",
      name: text || "文字卡片",
      color: safeColor(color),
    };
  }

  function itemName(item) {
    if (!item) return "未命名";
    if (item.kind === "text") return item.name || "文字卡片";
    return item.name || (item.kind === "emoji" ? item.emoji : "未命名图片");
  }

  function createTiers() {
    return TIER_DEFS.map((definition) => ({
      id: uid("tier"),
      label: definition.label,
      color: definition.color,
      itemIds: [],
    }));
  }

  function setSaveStatus(mode, text) {
    els.saveStatus.classList.toggle("is-saving", mode === "saving");
    els.saveStatus.classList.toggle("is-error", mode === "error");
    els.saveText.textContent = text;
  }

  function friendlyTime() {
    return new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  function isTextField(element) {
    return Boolean(
      element &&
        (element.tagName === "INPUT" ||
          element.tagName === "TEXTAREA" ||
          element.isContentEditable)
    );
  }

  /* ---------------------------------------------------------
     Initial state / persistence
     --------------------------------------------------------- */

  function createInitialBoard() {
    const items = {};
    const ids = FRUITS.map((fruit) => {
      const item = makeEmojiItem(fruit.e, fruit.n);
      items[item.id] = item;
      return item.id;
    });
    const tiers = createTiers();
    const ranked = [[0, 1], [2, 3, 4], [5, 6], [7, 8], [9, 10], [11], [12]];
    ranked.forEach((indexes, tierIndex) => {
      indexes.forEach((index) => {
        if (tiers[tierIndex] && ids[index]) {
          tiers[tierIndex].itemIds.push(ids[index]);
        }
      });
    });

    return {
      version: 2,
      title: "水果摊大赏",
      tiers,
      pool: ids.slice(13),
      items,
      updatedAt: Date.now(),
    };
  }

  function createBlankBoard() {
    return {
      version: 2,
      title: "我的 Tier List",
      tiers: createTiers(),
      pool: [],
      items: {},
      updatedAt: Date.now(),
    };
  }

  function buildTemplateState(template) {
    const items = {};
    const ids = (template.items || []).map((definition) => {
      const item = makeEmojiItem(definition.e, definition.n);
      items[item.id] = item;
      return item.id;
    });

    return {
      version: 2,
      title: template.title || "我的 Tier List",
      tiers: createTiers(),
      pool: ids,
      items,
      updatedAt: Date.now(),
    };
  }

  function sanitizeState(candidate) {
    if (
      !candidate ||
      !Array.isArray(candidate.tiers) ||
      !Array.isArray(candidate.pool) ||
      !candidate.items ||
      typeof candidate.items !== "object"
    ) {
      return null;
    }

    const items = {};
    Object.entries(candidate.items).forEach(([id, item]) => {
      if (!item || typeof item !== "object") return;
      if (!["image", "emoji", "text"].includes(item.kind)) return;
      items[id] = { ...item, id };
    });

    const seen = new Set();
    const tiers = candidate.tiers
      .filter((tier) => tier && typeof tier === "object")
      .map((tier) => {
        const itemIds = Array.isArray(tier.itemIds)
          ? tier.itemIds.filter((id) => {
              if (!items[id] || seen.has(id)) return false;
              seen.add(id);
              return true;
            })
          : [];
        return {
          id: tier.id || uid("tier"),
          label: typeof tier.label === "string" ? tier.label : "",
          color: safeColor(tier.color),
          itemIds,
        };
      });

    if (!tiers.length) return null;

    const pool = candidate.pool.filter((id) => {
      if (!items[id] || seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    const referenced = new Set([
      ...tiers.flatMap((tier) => tier.itemIds),
      ...pool,
    ]);
    Object.keys(items).forEach((id) => {
      if (!referenced.has(id)) delete items[id];
    });

    return {
      version: 2,
      title:
        typeof candidate.title === "string" ? candidate.title : "我的 Tier List",
      tiers,
      pool,
      items,
      updatedAt: Number(candidate.updatedAt) || Date.now(),
    };
  }

  function loadBoard() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return sanitizeState(JSON.parse(raw));
    } catch (error) {
      return null;
    }
  }

  function scheduleSave() {
    setSaveStatus("saving", "保存中…");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => persistNow(), 260);
  }

  function persistNow({ silent = true } = {}) {
    clearTimeout(saveTimer);
    saveTimer = null;
    try {
      state.updatedAt = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setSaveStatus("saved", `已保存 ${friendlyTime()}`);
      if (!silent) toast("已保存到本机浏览器");
      return true;
    } catch (error) {
      setSaveStatus("error", "本地空间不足");
      if (!silent) {
        toast("保存失败：浏览器本地空间可能已满");
      }
      return false;
    }
  }

  let state = null;
  let saveTimer = null;
  let firstRun = false;

  const history = {
    past: [],
    future: [],
  };

  function pushPast(snapshot) {
    history.past.push(snapshot);
    if (history.past.length > MAX_HISTORY) history.past.shift();
    history.future = [];
    syncHistoryButtons();
  }

  function syncHistoryButtons() {
    els.undoBtn.disabled = history.past.length === 0;
    els.redoBtn.disabled = history.future.length === 0;
    els.undoBtn.title = history.past.length
      ? `撤销 (⌘Z) · ${history.past.length} 步`
      : "没有可撤销的操作";
    els.redoBtn.title = history.future.length
      ? `重做 (⇧⌘Z) · ${history.future.length} 步`
      : "没有可重做的操作";
  }

  function undo() {
    if (!history.past.length) return;
    if (document.querySelector("dialog[open]")) return;
    if (document.activeElement === els.boardTitle) els.boardTitle.blur();
    const previous = history.past.pop();
    history.future.push(cloneState(state));
    state = previous;
    selectedItemId = null;
    render();
    scheduleSave();
    syncHistoryButtons();
  }

  function redo() {
    if (!history.future.length) return;
    if (document.querySelector("dialog[open]")) return;
    if (document.activeElement === els.boardTitle) els.boardTitle.blur();
    const next = history.future.pop();
    history.past.push(cloneState(state));
    state = next;
    selectedItemId = null;
    render();
    scheduleSave();
    syncHistoryButtons();
  }

  function mutate(callback) {
    const before = cloneState();
    callback();
    pushPast(before);
    render();
    scheduleSave();
  }

  /* ---------------------------------------------------------
     Render
     --------------------------------------------------------- */

  let selectedItemId = null;

  function tierById(id) {
    return state.tiers.find((tier) => tier.id === id);
  }

  function totalItemCount() {
    return Object.keys(state.items).length;
  }

  function itemMarkup(item) {
    if (!item) return "";
    const name = itemName(item);
    let media = "";
    const mediaClasses = ["item-media"];

    if (item.kind === "image") {
      if (item.src) {
        media = `<img src="${esc(item.src)}" alt="" draggable="false" loading="lazy">`;
      } else {
        media = fallbackMarkup();
      }
    } else if (item.kind === "emoji") {
      media = `<span class="emoji-glyph">${esc(item.emoji)}</span>`;
    } else {
      mediaClasses.push("is-text");
      media = `<span class="text-glyph">${esc(item.name || "文字卡片")}</span>`;
    }

    const colorStyle =
      item.kind === "text"
        ? ` style="--item-color:${safeColor(item.color)}"`
        : "";
    const caption = item.kind === "text" ? "" : item.name;

    return `<div class="item-card${caption ? "" : " no-caption"}" data-item-id="${esc(
      item.id
    )}" tabindex="0" role="button" aria-pressed="false" aria-label="${esc(
      name
    )}，拖动排序，双击编辑" title="${esc(name)}">
      <div class="${mediaClasses.join(" ")}"${colorStyle}>
        ${media}
        <button type="button" class="item-remove" data-action="remove-item" data-item-id="${esc(
          item.id
        )}" aria-label="移除 ${esc(name)}" title="从榜单移除">
          <svg viewBox="0 0 12 12" aria-hidden="true"><path d="m2.5 2.5 7 7m0-7-7 7"/></svg>
        </button>
      </div>
      ${caption ? `<div class="item-caption">${esc(caption)}</div>` : ""}
      <span class="item-edit-hint">双击编辑</span>
    </div>`;
  }

  function fallbackMarkup() {
    return `<div class="media-fallback" aria-label="图片加载失败">
      <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2.5" y="3.5" width="15" height="13" rx="2"/><circle cx="7" cy="8" r="1.3"/><path d="m3.5 14 4.2-4 3 2.8 2.5-2.4 3.3 3.6"/></svg>
      <span>IMAGE ERROR</span>
    </div>`;
  }

  function tierMarkup(tier) {
    const count = tier.itemIds.length;
    const label = tier.label || "·";
    const long = [...label].length > 2;
    const contrast = contrastColor(tier.color);

    return `<section class="tier" data-drop="tier" data-tier-id="${esc(
      tier.id
    )}" aria-label="档位 ${esc(label)}，${count} 张卡片">
      <div class="tier-label" style="--tier-color:${safeColor(
        tier.color
      )};color:${contrast}">
        <span class="tier-letter${long ? " is-long" : ""}">${esc(label)}</span>
        <span class="tier-count">${count} 项</span>
        <button type="button" class="tier-edit" data-action="edit-tier" data-tier-id="${esc(
          tier.id
        )}" aria-label="编辑档位 ${esc(label)}" title="编辑档位">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 11 .4-2.7L10.6 1l2.4 2.4L5.7 10.6 3 11Z"/><path d="m9.4 2.2 2.4 2.4"/></svg>
        </button>
      </div>
      <div class="tier-items">
        ${tier.itemIds.map((id) => itemMarkup(state.items[id])).join("")}
        ${
          count === 0
            ? `<div class="tier-empty"><span aria-hidden="true">+</span> 拖到这里</div>`
            : ""
        }
      </div>
    </section>`;
  }

  function poolEmptyMarkup() {
    return `<div class="pool-empty">
      <div class="pool-empty-icon">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m0 0L7 9m5-5 5 5M5 18v2h14v-2"/></svg>
      </div>
      <div>
        <h3>素材池还是空的</h3>
        <p>上传几张图、贴一个图片链接，或者用表情和文字先做几张卡片。</p>
        <div class="pool-empty-actions">
          <button type="button" class="btn btn-primary btn-small" data-add-mode="upload">上传图片</button>
          <button type="button" class="btn btn-outline btn-small" data-add-mode="emoji">用表情开始</button>
          <button type="button" class="btn btn-outline btn-small" data-add-mode="text">做文字卡</button>
        </div>
      </div>
    </div>`;
  }

  function renderBoard() {
    els.board.innerHTML = state.tiers.map(tierMarkup).join("");
    els.board.setAttribute(
      "aria-label",
      `Tier 榜单，共 ${state.tiers.length} 个档位、${totalItemCount()} 张卡片`
    );
  }

  function renderPool() {
    if (!state.pool.length) {
      els.poolGrid.innerHTML = poolEmptyMarkup();
    } else {
      els.poolGrid.innerHTML =
        state.pool.map((id) => itemMarkup(state.items[id])).join("") +
        `<button type="button" class="pool-add-card" data-add-mode="upload" aria-label="添加更多素材">
          <span aria-hidden="true">+</span>
          添加更多
        </button>`;
    }

    const remoteCount = Object.values(state.items).filter(
      (item) => item.kind === "image" && item.remote
    ).length;

    els.poolFootnote.textContent = remoteCount
      ? `含 ${remoteCount} 张跨域图片：可以正常显示，但导出时可能只能看到占位图。`
      : "支持 JPG / PNG / WebP / GIF，图片只在本地处理。";
    els.poolFootnote.style.color = remoteCount ? "#9b5a4e" : "";
  }

  function updateSelectionUI() {
    $$(".item-card").forEach((card) => {
      const isSelected = card.dataset.itemId === selectedItemId;
      card.classList.toggle("is-selected", isSelected);
      card.setAttribute("aria-pressed", String(isSelected));
    });

    const item = selectedItemId ? state.items[selectedItemId] : null;
    if (!item) {
      els.selectionBar.hidden = true;
      els.body.classList.remove("has-selection");
      return;
    }

    els.selectionName.textContent = itemName(item);
    els.selectionBar.hidden = false;
    els.body.classList.add("has-selection");
  }

  function renderChrome() {
    const total = totalItemCount();
    els.poolCount.textContent = String(state.pool.length);
    els.itemCount.textContent = String(total);
    if (document.activeElement !== els.boardTitle) {
      els.boardTitle.value = state.title;
    }
    els.boardTitle.placeholder = "给你的榜单起个名字";
    syncHistoryButtons();
    updateSelectionUI();
  }

  function render() {
    renderBoard();
    renderPool();
    renderChrome();
  }

  function selectItem(id) {
    if (!state.items[id]) return;
    selectedItemId = selectedItemId === id ? null : id;
    updateSelectionUI();
  }

  function clearSelection() {
    selectedItemId = null;
    updateSelectionUI();
  }

  function findItemLocation(id) {
    const poolIndex = state.pool.indexOf(id);
    if (poolIndex >= 0) {
      return { type: "pool", index: poolIndex };
    }
    for (const tier of state.tiers) {
      const index = tier.itemIds.indexOf(id);
      if (index >= 0) return { type: "tier", tierId: tier.id, index };
    }
    return null;
  }

  function detachItem(id) {
    const location = findItemLocation(id);
    if (!location) return null;
    if (location.type === "pool") {
      state.pool.splice(location.index, 1);
    } else {
      const tier = tierById(location.tierId);
      if (tier) tier.itemIds.splice(location.index, 1);
    }
    return location;
  }

  function moveSelectedToTier(tierId) {
    if (!selectedItemId) return;
    const item = state.items[selectedItemId];
    const tier = tierById(tierId);
    if (!item || !tier) return;

    const before = cloneState();
    detachItem(selectedItemId);
    tier.itemIds.push(selectedItemId);
    pushPast(before);
    selectedItemId = null;
    render();
    scheduleSave();
  }

  function moveSelectedToPool() {
    if (!selectedItemId || !state.items[selectedItemId]) return;
    const before = cloneState();
    detachItem(selectedItemId);
    state.pool.push(selectedItemId);
    pushPast(before);
    selectedItemId = null;
    render();
    scheduleSave();
  }

  function removeItem(id, { silent = false } = {}) {
    const item = state.items[id];
    if (!item) return;
    const before = cloneState();
    detachItem(id);
    delete state.items[id];
    pushPast(before);
    if (selectedItemId === id) selectedItemId = null;
    render();
    scheduleSave();
    if (!silent) {
      toast(`已移除「${itemName(item)}」`, {
        actionLabel: "撤销",
        onAction: undo,
      });
    }
  }

  /* ---------------------------------------------------------
     Toasts, modals and small UI helpers
     --------------------------------------------------------- */

  function toast(message, { actionLabel = "", onAction = null, duration = 3600 } = {}) {
    const node = document.createElement("div");
    node.className = "toast";
    const text = document.createElement("span");
    text.textContent = message;
    node.appendChild(text);

    if (actionLabel && onAction) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "toast-action";
      button.textContent = actionLabel;
      button.addEventListener("click", () => {
        dismiss();
        onAction();
      });
      node.appendChild(button);
    }

    els.toasts.appendChild(node);
    while (els.toasts.children.length > 3) {
      els.toasts.firstElementChild.remove();
    }

    let dismissed = false;
    let removeTimer = null;
    function dismiss() {
      if (dismissed) return;
      dismissed = true;
      clearTimeout(removeTimer);
      node.classList.add("is-leaving");
      setTimeout(() => node.remove(), 200);
    }
    removeTimer = setTimeout(dismiss, duration);

    node.addEventListener("mouseenter", () => clearTimeout(removeTimer));
    node.addEventListener("mouseleave", () => {
      removeTimer = setTimeout(dismiss, 1500);
    });

    return node;
  }

  function showDialog(dialog) {
    if (dialog.open) return;
    dialog.showModal();
    // Native dialogs focus the first focusable element (the close button),
    // which makes the page open with a heavy focus ring. Move focus to the
    // heading for a quieter entry, while keeping the dialog keyboard-accessible.
    requestAnimationFrame(() => {
      const heading = $(".modal-head h2", dialog);
      if (!heading) return;
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    });
  }

  function closeDialog(dialog) {
    if (dialog.open) dialog.close();
  }

  function revealPool() {
    const rect = els.pool.getBoundingClientRect();
    if (rect.top > window.innerHeight - 80) {
      els.pool.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function nextTierLabel() {
    const used = new Set(state.tiers.map((tier) => tier.label.toUpperCase()));
    const free = TIER_LABEL_POOL.find((label) => !used.has(label));
    return free || `T${state.tiers.length + 1}`;
  }

  function addTier() {
    const before = cloneState();
    const usedColors = new Set(state.tiers.map((tier) => tier.color));
    const color =
      PALETTE.find((entry) => !usedColors.has(entry.hex))?.hex ||
      PALETTE[state.tiers.length % PALETTE.length].hex;
    const tier = {
      id: uid("tier"),
      label: nextTierLabel(),
      color,
      itemIds: [],
    };
    state.tiers.push(tier);
    pushPast(before);
    render();
    scheduleSave();
    openTierDialog(tier.id);
  }

  function applyTemplate(template) {
    if (!template) return;
    const before = cloneState();
    state = buildTemplateState(template);
    selectedItemId = null;
    pushPast(before);
    render();
    scheduleSave();
    closeDialog(els.templatesDialog);
    toast(`已套用「${template.name}」`, {
      actionLabel: "撤销",
      onAction: undo,
      duration: 5000,
    });
    setTimeout(() => {
      if (template.items.length) {
        els.pool.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 120);
  }

  /* ---------------------------------------------------------
     Rendering static pickers
     --------------------------------------------------------- */

  function renderEmojiLibrary() {
    els.emojiGrid.innerHTML = EMOJI_LIBRARY.map(
      (entry, index) => `<button type="button" class="emoji-btn" data-emoji="${esc(
        entry.e
      )}" data-name="${esc(entry.n)}" data-emoji-index="${index}" title="添加 ${esc(
        entry.n
      )}">
        <span class="e-glyph">${esc(entry.e)}</span>
        <span class="e-name">${esc(entry.n)}</span>
      </button>`
    ).join("");
  }

  function templateMiniMarkup(template) {
    const rows = TIER_DEFS.slice(0, 3)
      .map((definition, rowIndex) => {
        const rowItems = template.items.slice(rowIndex * 5, rowIndex * 5 + 5);
        const chips = Array.from({ length: 5 }, (_, chipIndex) => {
          const item = rowItems[chipIndex];
          return item
            ? `<span class="template-chip">${esc(item.e)}</span>`
            : `<span class="template-chip is-empty"></span>`;
        }).join("");
        return `<div class="template-row">
          <span class="template-label" style="--row-color:${definition.color}">${definition.label}</span>
          ${chips}
        </div>`;
      })
      .join("");

    return `<div class="template-visual" aria-hidden="true">${rows}</div>`;
  }

  function renderTemplateGrid() {
    els.templateGrid.innerHTML = TEMPLATES.map(
      (template) => `<div class="template-card" role="button" tabindex="0" data-template-id="${esc(
        template.id
      )}" aria-label="套用模板 ${esc(template.name)}">
        <span class="template-apply">套用 →</span>
        ${templateMiniMarkup(template)}
        <span class="template-info">
          <span>
            <span class="template-name">${esc(template.name)}</span>
            <span class="template-desc">${esc(template.desc)}</span>
          </span>
          <span class="template-count">${template.items.length} 张</span>
        </span>
      </div>`
    ).join("");
  }

  function renderColorGrids() {
    els.tierColorGrid.innerHTML = PALETTE.map(
      (color) => `<button type="button" class="color-option" data-color="${color.hex}" style="--swatch:${color.hex}" aria-label="${esc(
        color.name
      )}" title="${esc(color.name)}"></button>`
    ).join("");

    els.textColorGrid.innerHTML = TEXT_COLORS.map(
      (color) => `<button type="button" class="color-option" data-text-color="${color}" style="--swatch:${color}" aria-label="选择颜色 ${color}" title="${color}"></button>`
    ).join("");
  }

  /* ---------------------------------------------------------
     Tier dialog
     --------------------------------------------------------- */

  let tierEditSession = null;

  function tierSignature() {
    return JSON.stringify(
      state.tiers.map((tier) => [tier.id, tier.label, tier.color])
    );
  }

  function currentEditingTier() {
    if (!tierEditSession) return null;
    return tierById(tierEditSession.tierId);
  }

  function updateTierDialogPreview() {
    const tier = currentEditingTier();
    if (!tier) return;
    const label = tier.label || "·";
    const long = [...label].length > 2;
    els.tierPreview.style.setProperty("--tier-color", safeColor(tier.color));
    els.tierPreview.style.color = contrastColor(tier.color);
    els.tierPreviewLetter.textContent = label;
    els.tierPreviewLetter.classList.toggle("is-long", long);
  }

  function updateTierOrderButtons() {
    if (!tierEditSession) return;
    const index = state.tiers.findIndex(
      (tier) => tier.id === tierEditSession.tierId
    );
    els.moveTierUp.disabled = index <= 0;
    els.moveTierDown.disabled = index < 0 || index >= state.tiers.length - 1;
    els.deleteTierBtn.disabled = state.tiers.length <= 1;
    els.deleteTierBtn.style.opacity = state.tiers.length <= 1 ? "0.45" : "";
  }

  function syncTierColorSelection() {
    const tier = currentEditingTier();
    if (!tier) return;
    $$(".color-option", els.tierColorGrid).forEach((button) => {
      button.classList.toggle("is-active", button.dataset.color === tier.color);
    });
  }

  function openTierDialog(tierId) {
    const tier = tierById(tierId);
    if (!tier) return;
    clearSelection();
    tierEditSession = {
      tierId,
      baseline: cloneState(),
      signature: tierSignature(),
      suppress: false,
    };
    els.tierNameInput.value = tier.label;
    updateTierDialogPreview();
    syncTierColorSelection();
    updateTierOrderButtons();
    showDialog(els.tierDialog);
    setTimeout(() => {
      els.tierNameInput.focus();
      els.tierNameInput.select();
    }, 30);
  }

  function finalizeTierSession() {
    if (!tierEditSession) return;
    const session = tierEditSession;
    tierEditSession = null;

    if (session.suppress) {
      return;
    }

    const changed = tierSignature() !== session.signature;
    if (changed) {
      pushPast(session.baseline);
      scheduleSave();
    }
    render();
  }

  /* ---------------------------------------------------------
     Item dialog
     --------------------------------------------------------- */

  let editingItemId = null;

  function openItemDialog(itemId) {
    const item = state.items[itemId];
    if (!item) return;
    clearSelection();
    editingItemId = itemId;
    els.itemNameInput.value = item.name || "";
    els.itemEditPreview.innerHTML = itemMarkup(item);
    const previewCard = $(".item-card", els.itemEditPreview);
    if (previewCard) {
      previewCard.removeAttribute("tabindex");
      previewCard.removeAttribute("role");
      $$("button, .item-edit-hint", previewCard).forEach((node) => node.remove());
    }
    showDialog(els.itemDialog);
    setTimeout(() => {
      els.itemNameInput.focus();
      els.itemNameInput.select();
    }, 30);
  }

  /* ---------------------------------------------------------
     Add-item dialog
     --------------------------------------------------------- */

  let activeAddMode = "upload";
  let textColor = TEXT_COLORS[0];
  let addSessionCount = 0;
  let isProcessingFiles = false;

  function setAddMode(mode) {
    activeAddMode = mode;
    $$("[data-add-tab]", els.addDialog).forEach((tab) => {
      const active = tab.dataset.addTab === mode;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    $$("[data-add-panel]", els.addDialog).forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.addPanel === mode);
    });
    const titles = {
      upload: "添加图片",
      emoji: "用表情做卡片",
      text: "做一张文字卡",
      url: "从链接添加图片",
    };
    els.addTitle.textContent = titles[mode] || "添加素材";
    if (mode === "text") {
      updateTextPreview();
      setTimeout(() => els.textContent.focus(), 60);
    }
  }

  function openAddDialog(mode = "upload") {
    addSessionCount = 0;
    updateEmojiNote();
    $$(".emoji-btn.is-added", els.emojiGrid).forEach((button) =>
      button.classList.remove("is-added")
    );
    setAddMode(mode);
    showDialog(els.addDialog);
  }

  function updateEmojiNote() {
    els.emojiAddedNote.textContent = addSessionCount
      ? `已添加 ${addSessionCount} 张，关闭后可在素材池看到`
      : "点击表情即可添加";
  }

  function addItemsToPool(items) {
    if (!items.length) return;
    const before = cloneState();
    items.forEach((item) => {
      state.items[item.id] = item;
      state.pool.push(item.id);
    });
    pushPast(before);
    render();
    scheduleSave();
  }

  function addEmoji(emoji, name, button = null) {
    const clean = String(emoji || "").trim();
    if (!clean) return;
    addItemsToPool([makeEmojiItem(clean, String(name || "").trim())]);
    addSessionCount += 1;
    updateEmojiNote();
    if (button) {
      button.classList.add("is-added");
    }
  }

  function updateTextPreview() {
    const value = els.textContent.value.trim() || "你的文字";
    els.textPreview.textContent = value;
    els.textPreview.style.background = textColor;
    els.textPreview.style.color = contrastColor(textColor);
    $$(".color-option", els.textColorGrid).forEach((button) => {
      button.classList.toggle("is-active", button.dataset.textColor === textColor);
    });
  }

  /* ---------------------------------------------------------
     Image handling
     --------------------------------------------------------- */

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("图片读取失败"));
      reader.readAsDataURL(file);
    });
  }

  async function compressImageBlob(blob) {
    if (!blob || !blob.type.startsWith("image/")) {
      throw new Error("不是可识别的图片");
    }
    if (blob.size > 25 * 1024 * 1024) {
      throw new Error("图片超过 25MB");
    }

    if (blob.type === "image/gif" && blob.size <= 2.5 * 1024 * 1024) {
      return fileToDataURL(blob);
    }

    let decoded = null;
    let directDataUrl = "";
    try {
      decoded = await createImageBitmap(blob);
    } catch (error) {
      // Safari and some older engines are inconsistent about
      // createImageBitmap. Decode through an <img> instead.
      try {
        directDataUrl = await fileToDataURL(blob);
        decoded = await preloadImage(directDataUrl, 9000);
      } catch (loadError) {
        throw new Error("无法解析这张图片");
      }
    }

    try {
      const sourceWidth = decoded.width || decoded.naturalWidth;
      const sourceHeight = decoded.height || decoded.naturalHeight;
      if (!sourceWidth || !sourceHeight) {
        if (directDataUrl && blob.size <= 3 * 1024 * 1024) {
          return directDataUrl;
        }
        throw new Error("无法读取图片尺寸");
      }

      const maxSide = 900;
      const ratio = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
      const width = Math.max(1, Math.round(sourceWidth * ratio));
      const height = Math.max(1, Math.round(sourceHeight * ratio));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(decoded, 0, 0, width, height);
      const data = canvas.toDataURL("image/webp", 0.86);
      if (!data || data.length < 32) throw new Error("图片转换失败");
      return data;
    } catch (error) {
      if (directDataUrl && blob.size <= 3 * 1024 * 1024) {
        return directDataUrl;
      }
      throw error;
    } finally {
      if (decoded && typeof decoded.close === "function") decoded.close();
    }
  }

  function preloadImage(url, timeout = 9000) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        image.src = "";
        reject(new Error("图片加载超时"));
      }, timeout);

      image.onload = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(image);
      };
      image.onerror = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(new Error("图片加载失败"));
      };
      image.src = url;
    });
  }

  function cleanFileName(name) {
    return String(name || "图片")
      .replace(/\.[^.]+$/, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 30);
  }

  async function handleImageFiles(fileList, options = {}) {
    if (isProcessingFiles) {
      toast("上一批图片还在处理，请稍等一下");
      return;
    }

    const fromPaste = Boolean(options.fromPaste);
    const files = [...fileList].filter((file) =>
      String(file.type).startsWith("image/")
    );
    if (!files.length) {
      toast("没有找到可用的图片文件");
      return;
    }

    isProcessingFiles = true;
    const fakeButton = $(".upload-fake-btn", els.uploadZone);
    const originalButtonText = fakeButton ? fakeButton.textContent : "";
    els.uploadZone.classList.add("is-dragover");
    if (fakeButton) fakeButton.textContent = `正在处理 ${files.length} 张…`;

    const addedItems = [];
    let failures = 0;

    for (const [index, file] of files.entries()) {
      try {
        const data = await compressImageBlob(file);
        const fallbackName = fromPaste
          ? files.length > 1
            ? `剪贴板图片 ${index + 1}`
            : "剪贴板图片"
          : cleanFileName(file.name);
        addedItems.push(makeImageItem(data, fallbackName, false));
      } catch (error) {
        failures += 1;
      }
    }

    isProcessingFiles = false;
    els.uploadZone.classList.remove("is-dragover");
    if (fakeButton) fakeButton.textContent = originalButtonText;

    if (addedItems.length) {
      addItemsToPool(addedItems);
      closeDialog(els.addDialog);
      const prefix = fromPaste ? "已从剪贴板添加" : "已添加";
      const message =
        failures > 0
          ? `${prefix} ${addedItems.length} 张，${failures} 张未能处理`
          : `${prefix} ${addedItems.length} 张图片`;
      toast(message);
      revealPool();
    } else {
      toast("这些图片都没能处理成功，换几张试试");
    }
  }

  async function pasteImageFromClipboard() {
    // The macOS wrapper can read NSPasteboard directly and hand the image to
    // the page, which avoids browser clipboard permission prompts.
    if (window.webkit?.messageHandlers?.pasteImage) {
      window.webkit.messageHandlers.pasteImage.postMessage({ source: "button" });
      return;
    }

    if (!navigator.clipboard?.read) {
      toast("当前浏览器不支持直接读取剪贴板，请按 ⌘V 粘贴图片");
      return;
    }

    try {
      const clipboardItems = await navigator.clipboard.read();
      const files = [];
      for (const clipboardItem of clipboardItems) {
        const type = clipboardItem.types.find((entry) =>
          entry.startsWith("image/")
        );
        if (!type) continue;
        const blob = await clipboardItem.getType(type);
        const extension = (type.split("/")[1] || "png").replace("jpeg", "jpg");
        files.push(
          new File([blob], `clipboard.${extension}`, { type })
        );
      }

      if (!files.length) {
        toast("剪贴板里没有图片");
        return;
      }

      closeDialog(els.addDialog);
      await handleImageFiles(files, { fromPaste: true });
    } catch (error) {
      toast("无法读取剪贴板，请直接按 ⌘V 粘贴图片");
    }
  }

  async function addPastedImagePayload(payload) {
    if (!payload || typeof payload.dataURL !== "string" || !payload.dataURL) {
      toast("剪贴板里没有图片");
      return;
    }

    try {
      const response = await fetch(payload.dataURL);
      const blob = await response.blob();
      if (!String(blob.type).startsWith("image/")) {
        throw new Error("not an image");
      }
      const data = await compressImageBlob(blob);
      const name = String(payload.name || "剪贴板图片").trim().slice(0, 30);
      addItemsToPool([makeImageItem(data, name || "剪贴板图片", false)]);
      closeDialog(els.addDialog);
      toast("已从剪贴板添加图片");
      revealPool();
    } catch (error) {
      toast("无法读取剪贴板里的图片");
    }
  }

  async function addImageFromUrl() {
    const url = els.imageUrl.value.trim();
    if (!url) {
      toast("先粘贴一个图片链接");
      els.imageUrl.focus();
      return;
    }

    let parsed;
    try {
      parsed = new URL(url);
      if (!["http:", "https:", "data:"].includes(parsed.protocol)) {
        throw new Error("invalid protocol");
      }
    } catch (error) {
      toast("这个链接看起来不太对");
      els.imageUrl.focus();
      return;
    }

    const name =
      els.imageUrlName.value.trim().slice(0, 30) ||
      (parsed.protocol === "data:" ? "图片" : parsed.hostname.replace(/^www\./, ""));

    const original = els.addUrlBtn.textContent;
    els.addUrlBtn.disabled = true;
    els.addUrlBtn.textContent = "正在读取图片…";

    let item = null;
    let remote = false;

    try {
      const response = await fetch(url, {
        mode: "cors",
        credentials: "omit",
        referrerPolicy: "no-referrer",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const data = await compressImageBlob(blob);
      item = makeImageItem(data, name, false);
    } catch (error) {
      try {
        await preloadImage(url);
        item = makeImageItem(url, name, true);
        remote = true;
      } catch (loadError) {
        item = null;
      }
    } finally {
      els.addUrlBtn.disabled = false;
      els.addUrlBtn.textContent = original;
    }

    if (!item) {
      toast("无法加载这张图片，检查一下链接是否可公开访问");
      return;
    }

    addItemsToPool([item]);
    closeDialog(els.addDialog);
    els.imageUrl.value = "";
    els.imageUrlName.value = "";
    toast(
      remote
        ? "已添加。跨域图片在导出时会显示为占位图"
        : "已添加图片",
      { duration: remote ? 5000 : 3600 }
    );
    revealPool();
  }

  /* ---------------------------------------------------------
     Drag and drop
     --------------------------------------------------------- */

  let press = null;
  let dragCtx = null;

  function pointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    const card = event.target.closest(".item-card");
    if (!card) return;
    if (event.target.closest("button")) return;
    if (!card.closest("#board, #pool")) return;

    press = {
      card,
      itemId: card.dataset.itemId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false,
    };
  }

  function startDrag(event) {
    if (!press) return;
    const rect = press.card.getBoundingClientRect();
    const ghost = press.card.cloneNode(true);
    ghost.classList.add("drag-ghost");
    ghost.classList.remove("is-selected");
    ghost.removeAttribute("tabindex");
    $$("button, .item-edit-hint", ghost).forEach((node) => node.remove());
    ghost.style.width = `${rect.width}px`;
    ghost.style.left = "0px";
    ghost.style.top = "0px";
    document.body.appendChild(ghost);

    press.card.classList.add("dragging");
    document.body.classList.add("is-dragging");
    clearSelection();

    dragCtx = {
      itemId: press.itemId,
      pointerId: event.pointerId,
      ghost,
      width: rect.width,
      height: rect.height,
      lastX: event.clientX,
      lastY: event.clientY,
      zone: null,
      target: null,
      marker: null,
      scrollTimer: null,
    };

    press.dragging = true;
    moveGhost(event.clientX, event.clientY);
    updateDropTarget(event.clientX, event.clientY);
    setAutoScroll(event.clientY);
  }

  function moveGhost(x, y) {
    if (!dragCtx) return;
    dragCtx.ghost.style.left = `${x - dragCtx.width / 2}px`;
    dragCtx.ghost.style.top = `${y - dragCtx.height / 2}px`;
  }

  function clearDropVisuals() {
    $$(".tier.is-drop-target, .pool.is-drop-target").forEach((zone) =>
      zone.classList.remove("is-drop-target")
    );
    if (dragCtx?.marker) {
      dragCtx.marker.remove();
      dragCtx.marker = null;
    }
  }

  function cardCenterDistance(card, x, y) {
    const rect = card.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    return {
      distance: (x - centerX) ** 2 + (y - centerY) ** 2 * 1.35,
      centerX,
    };
  }

  function updateDropTarget(x, y) {
    if (!dragCtx) return;
    const element = document.elementFromPoint(x, y);
    const zone = element?.closest("[data-drop]");

    if (!zone) {
      clearDropVisuals();
      dragCtx.zone = null;
      dragCtx.target = null;
      return;
    }

    if (zone === dragCtx.zone) {
      // Still recompute the insertion point, because the pointer moves.
    } else {
      clearDropVisuals();
      dragCtx.zone = zone;
      zone.classList.add("is-drop-target");
    }

    let container;
    let target;
    if (zone.dataset.drop === "bank") {
      container = els.poolGrid;
      target = { type: "pool", index: 0 };
    } else {
      const tierId = zone.dataset.tierId;
      const tier = tierById(tierId);
      if (!tier) {
        clearDropVisuals();
        return;
      }
      container = $(".tier-items", zone);
      target = { type: "tier", tierId, index: 0 };
    }

    if (!container) return;

    const cards = $$(".item-card", container).filter(
      (card) => !card.classList.contains("dragging")
    );

    let dropIndex = cards.length;
    let bestDistance = Infinity;
    cards.forEach((card, index) => {
      const { distance, centerX } = cardCenterDistance(card, x, y);
      if (distance < bestDistance) {
        bestDistance = distance;
        dropIndex = x < centerX ? index : index + 1;
      }
    });

    if (dragCtx.marker) {
      dragCtx.marker.remove();
      dragCtx.marker = null;
    }

    if (cards.length) {
      const marker = document.createElement("div");
      marker.className = "drop-indicator";
      marker.setAttribute("aria-hidden", "true");
      if (dropIndex >= cards.length) {
        const addCard = container.querySelector(".pool-add-card");
        if (addCard) container.insertBefore(marker, addCard);
        else container.appendChild(marker);
      } else {
        container.insertBefore(marker, cards[dropIndex]);
      }
      dragCtx.marker = marker;
    }

    target.index = dropIndex;
    dragCtx.target = target;
  }

  function setAutoScroll(y) {
    if (!dragCtx) return;
    const edge = 94;
    const direction =
      y < edge ? -1 : y > window.innerHeight - edge ? 1 : 0;

    if (!direction) {
      if (dragCtx.scrollTimer) {
        clearInterval(dragCtx.scrollTimer);
        dragCtx.scrollTimer = null;
      }
      return;
    }

    if (dragCtx.scrollTimer) return;
    dragCtx.scrollTimer = setInterval(() => {
      window.scrollBy(0, direction * 13);
      updateDropTarget(dragCtx.lastX, dragCtx.lastY);
    }, 32);
  }

  function pointerMove(event) {
    if (!press || event.pointerId !== press.pointerId) return;

    if (!press.dragging) {
      const dx = event.clientX - press.startX;
      const dy = event.clientY - press.startY;
      if (Math.hypot(dx, dy) < 6) return;
      event.preventDefault();
      startDrag(event);
    }

    if (!dragCtx) return;
    event.preventDefault();
    dragCtx.lastX = event.clientX;
    dragCtx.lastY = event.clientY;
    moveGhost(event.clientX, event.clientY);
    updateDropTarget(event.clientX, event.clientY);
    setAutoScroll(event.clientY);
  }

  function performDrop(itemId, target) {
    if (!state.items[itemId] || !target) return;
    const before = cloneState();
    detachItem(itemId);

    let list;
    if (target.type === "pool") {
      list = state.pool;
    } else {
      const tier = tierById(target.tierId);
      if (!tier) return;
      list = tier.itemIds;
    }

    const index = Math.max(0, Math.min(Number(target.index) || 0, list.length));
    list.splice(index, 0, itemId);
    pushPast(before);
    render();
    scheduleSave();
  }

  function cleanupDrag() {
    if (dragCtx?.scrollTimer) {
      clearInterval(dragCtx.scrollTimer);
    }
    clearDropVisuals();
    if (dragCtx?.ghost) dragCtx.ghost.remove();
    if (press?.card) press.card.classList.remove("dragging");
    $$(".item-card.dragging").forEach((card) => card.classList.remove("dragging"));
    document.body.classList.remove("is-dragging");
    if (dragCtx) dragCtx.ghost = null;
    dragCtx = null;
  }

  function pointerUp(event) {
    if (!press || event.pointerId !== press.pointerId) return;

    if (press.dragging) {
      const target = dragCtx?.target || null;
      const itemId = press.itemId;
      cleanupDrag();
      press = null;
      if (target) performDrop(itemId, target);
      return;
    }

    const itemId = press.itemId;
    const card = press.card;
    const hadSelection = selectedItemId;
    press = null;

    // If something is already selected, tapping any card inside a tier means
    // "put the selected card here" — this is the most natural gesture on touch.
    if (hadSelection && hadSelection !== itemId) {
      const tier = card.closest(".tier");
      if (tier) {
        moveSelectedToTier(tier.dataset.tierId);
        return;
      }
    }

    selectItem(itemId);
  }

  function pointerCancel(event) {
    if (!press || event.pointerId !== press.pointerId) return;
    cleanupDrag();
    press = null;
  }

  /* ---------------------------------------------------------
     Export renderer
     --------------------------------------------------------- */

  function roundRectPath(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function truncateCanvasText(context, text, maxWidth) {
    let value = String(text || "");
    if (context.measureText(value).width <= maxWidth) return value;
    const ellipsis = "…";
    while (value.length > 0) {
      value = value.slice(0, -1);
      if (context.measureText(value + ellipsis).width <= maxWidth) {
        return value + ellipsis;
      }
    }
    return ellipsis;
  }

  function fitLabelFont(context, text, maxWidth, maxSize, minSize) {
    let size = maxSize;
    while (size > minSize) {
      context.font = `900 ${size}px ${FONT_SANS}`;
      if (context.measureText(text).width <= maxWidth) return size;
      size -= 2;
    }
    return minSize;
  }

  function wrapCanvasText(context, text, maxWidth, maxLines) {
    const chars = [...String(text || "")];
    const lines = [];
    let current = "";

    for (let index = 0; index < chars.length; index += 1) {
      const next = current + chars[index];
      if (context.measureText(next).width > maxWidth && current) {
        lines.push(current);
        current = chars[index];
        if (lines.length === maxLines - 1) {
          const rest = chars.slice(index).join("");
          lines.push(truncateCanvasText(context, rest, maxWidth));
          return lines;
        }
      } else {
        current = next;
      }
    }

    if (current) lines.push(current);
    return lines.slice(0, maxLines);
  }

  function drawImageCover(context, image, x, y, width, height, radius) {
    context.save();
    roundRectPath(context, x, y, width, height, radius);
    context.clip();
    const scale = Math.max(width / image.width, height / image.height);
    const dw = image.width * scale;
    const dh = image.height * scale;
    context.drawImage(
      image,
      x + (width - dw) / 2,
      y + (height - dh) / 2,
      dw,
      dh
    );
    context.restore();
  }

  function drawLogoMark(context, x, y, size) {
    context.save();
    roundRectPath(context, x, y, size, size, size * 0.19);
    context.fillStyle = "#171613";
    context.fill();

    const padding = size * 0.16;
    const barHeight = Math.max(1.6, size * 0.1);
    const widths = [0.64, 1, 0.8, 0.44];
    const colors = ["#ff8a80", "#ffd43b", "#b9e769", "#7cb9ff"];
    const available = size - padding * 2;
    const gap = (available - barHeight * 4) / 3;

    widths.forEach((widthRatio, index) => {
      context.fillStyle = colors[index];
      context.fillRect(
        x + padding,
        y + padding + index * (barHeight + gap),
        available * widthRatio,
        barHeight
      );
    });
    context.restore();
  }

  function drawPlaceholderCard(context, x, y, width, mediaHeight) {
    context.save();
    roundRectPath(context, x, y, width, mediaHeight, 7);
    context.clip();
    context.fillStyle = "#eee7d9";
    context.fillRect(x, y, width, mediaHeight);
    context.strokeStyle = "rgba(23,22,19,.08)";
    context.lineWidth = 1;
    for (let offset = -mediaHeight; offset < width + mediaHeight; offset += 9) {
      context.beginPath();
      context.moveTo(x + offset, y + mediaHeight);
      context.lineTo(x + offset + mediaHeight, y);
      context.stroke();
    }
    context.fillStyle = "#8e8474";
    context.font = `600 8px ${FONT_MONO}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("IMAGE", x + width / 2, y + mediaHeight / 2);
    context.restore();
  }

  function drawExportCard(context, item, imageMap, x, y, cardWidth, cardHeight) {
    const pad = 5;
    const border = 2;
    const mediaSize = cardWidth - pad * 2;

    context.save();
    // Offset shadow
    context.fillStyle = "rgba(23,22,19,.92)";
    roundRectPath(context, x + 2.5, y + 2.5, cardWidth, cardHeight, 10);
    context.fill();

    // Card face
    context.fillStyle = "#ffffff";
    roundRectPath(context, x, y, cardWidth, cardHeight, 10);
    context.fill();
    context.strokeStyle = "#171613";
    context.lineWidth = border;
    roundRectPath(
      context,
      x + border / 2,
      y + border / 2,
      cardWidth - border,
      cardHeight - border,
      9
    );
    context.stroke();

    const mediaX = x + pad;
    const mediaY = y + pad;

    if (item.kind === "image") {
      const image = imageMap[item.id];
      if (image) {
        drawImageCover(
          context,
          image,
          mediaX,
          mediaY,
          mediaSize,
          mediaSize,
          6
        );
      } else {
        drawPlaceholderCard(context, mediaX, mediaY, mediaSize, mediaSize);
      }
    } else if (item.kind === "emoji") {
      context.fillStyle = "#f2ede3";
      roundRectPath(context, mediaX, mediaY, mediaSize, mediaSize, 6);
      context.fill();
      context.font = `42px ${FONT_EMOJI}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = "#171613";
      context.fillText(
        item.emoji || "⭐",
        mediaX + mediaSize / 2,
        mediaY + mediaSize / 2 + 2
      );
    } else {
      context.fillStyle = safeColor(item.color);
      roundRectPath(context, mediaX, mediaY, mediaSize, mediaSize, 6);
      context.fill();
      context.fillStyle = contrastColor(item.color);
      context.font = `800 14px ${FONT_SANS}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      const lines = wrapCanvasText(
        context,
        item.name || "文字卡片",
        mediaSize - 14,
        3
      );
      const lineHeight = 18;
      const startY =
        mediaY + mediaSize / 2 - ((lines.length - 1) * lineHeight) / 2;
      lines.forEach((line, index) => {
        context.fillText(
          line,
          mediaX + mediaSize / 2,
          startY + index * lineHeight
        );
      });
    }

    if (item.kind !== "text" && item.name) {
      context.fillStyle = "#171613";
      context.font = `600 10px ${FONT_SANS}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      const caption = truncateCanvasText(
        context,
        item.name,
        cardWidth - 12
      );
      context.fillText(caption, x + cardWidth / 2, y + cardHeight - 13);
    }

    context.restore();
  }

  async function loadExportImages() {
    const imageMap = {};
    let failed = 0;
    const imageItems = Object.values(state.items).filter(
      (item) => item.kind === "image" && item.src
    );

    await Promise.all(
      imageItems.map(async (item) => {
        if (item.remote) {
          failed += 1;
          return;
        }
        try {
          const image = await preloadImage(item.src, 7000);
          imageMap[item.id] = image;
        } catch (error) {
          failed += 1;
        }
      })
    );

    return { imageMap, failed };
  }

  async function buildExportCanvas(scale = 1) {
    await document.fonts.ready.catch(() => {});
    const { imageMap, failed } = await loadExportImages();

    const WIDTH = 1440;
    const PADDING = 64;
    const HEADER = 208;
    const FOOTER = 90;
    const LABEL_WIDTH = 164;
    const CARD_WIDTH = 116;
    const CARD_HEIGHT = 138;
    const CARD_GAP = 12;
    const INNER_PADDING = 18;

    const boardWidth = WIDTH - PADDING * 2;
    const areaWidth = boardWidth - LABEL_WIDTH;
    const columns = Math.max(
      3,
      Math.floor(
        (areaWidth - INNER_PADDING * 2 + CARD_GAP) / (CARD_WIDTH + CARD_GAP)
      )
    );

    const rowHeights = state.tiers.map((tier) => {
      const rows = Math.max(1, Math.ceil(tier.itemIds.length / columns));
      return Math.max(
        176,
        rows * (CARD_HEIGHT + CARD_GAP) - CARD_GAP + INNER_PADDING * 2
      );
    });
    const boardHeight = rowHeights.reduce((sum, value) => sum + value, 0);
    const HEIGHT = HEADER + boardHeight + FOOTER;

    let finalScale = Math.max(1, Number(scale) || 1);
    const MAX_CANVAS = 16384;
    if (HEIGHT * finalScale > MAX_CANVAS) {
      finalScale = Math.max(0.5, MAX_CANVAS / HEIGHT);
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(WIDTH * finalScale);
    canvas.height = Math.round(HEIGHT * finalScale);
    const context = canvas.getContext("2d");
    context.scale(finalScale, finalScale);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    // Paper background.
    context.fillStyle = "#f2eee5";
    context.fillRect(0, 0, WIDTH, HEIGHT);
    context.fillStyle = "rgba(23,22,19,.065)";
    for (let y = 11; y < HEIGHT; y += 22) {
      for (let x = 11; x < WIDTH; x += 22) {
        context.fillRect(x, y, 1.2, 1.2);
      }
    }

    // Header.
    drawLogoMark(context, PADDING, 48, 34);
    context.fillStyle = "#171613";
    context.font = `900 24px ${FONT_SANS}`;
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillText("TIERLAB", PADDING + 45, 65);

    context.fillStyle = "#746d60";
    context.font = `600 9px ${FONT_MONO}`;
    context.textAlign = "right";
    context.fillText(
      `TIER LIST / ${String(totalItemCount()).padStart(2, "0")} CARDS`,
      WIDTH - PADDING,
      55
    );
    context.fillStyle = "#a49b8c";
    context.fillText(
      new Date()
        .toLocaleDateString("zh-CN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
        .replace(/\//g, "."),
      WIDTH - PADDING,
      72
    );

    const title = (state.title || "未命名 Tier List").trim() || "未命名 Tier List";
    const titleSize = fitLabelFont(context, title, WIDTH - PADDING * 2, 54, 28);
    context.fillStyle = "#171613";
    context.font = `900 ${titleSize}px ${FONT_SANS}`;
    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    const visibleTitle = truncateCanvasText(
      context,
      title,
      WIDTH - PADDING * 2
    );
    context.fillText(visibleTitle, PADDING, 139);

    context.fillStyle = "#746d60";
    context.font = `400 16px ${FONT_SANS}`;
    context.fillText("拖动卡片，给一切排个高低。", PADDING, 168);

    context.fillStyle = "#9f9584";
    context.font = `600 9px ${FONT_MONO}`;
    context.textAlign = "right";
    context.fillText("MADE WITH TIERLAB", WIDTH - PADDING, 168);

    const boardY = HEADER;
    const boardX = PADDING;

    // Board shadow + body.
    context.save();
    context.shadowColor = "rgba(53,45,29,.18)";
    context.shadowBlur = 32;
    context.shadowOffsetY = 14;
    context.fillStyle = "#fffdf8";
    roundRectPath(context, boardX, boardY, boardWidth, boardHeight, 22);
    context.fill();
    context.restore();

    // Clip to board for rows.
    context.save();
    roundRectPath(context, boardX, boardY, boardWidth, boardHeight, 22);
    context.clip();
    context.fillStyle = "#fffdf8";
    context.fillRect(boardX, boardY, boardWidth, boardHeight);

    let rowY = boardY;
    state.tiers.forEach((tier, tierIndex) => {
      const rowHeight = rowHeights[tierIndex];
      const count = tier.itemIds.length;
      const tierColor = safeColor(tier.color);
      const textColor = contrastColor(tierColor);

      context.fillStyle = tierColor;
      context.fillRect(boardX, rowY, LABEL_WIDTH, rowHeight);

      // Subtle diagonal texture inside the label cell.
      context.save();
      context.beginPath();
      context.rect(boardX, rowY, LABEL_WIDTH, rowHeight);
      context.clip();
      context.strokeStyle = "rgba(23,22,19,.055)";
      context.lineWidth = 1;
      for (
        let offset = -rowHeight;
        offset < LABEL_WIDTH + rowHeight;
        offset += 9
      ) {
        context.beginPath();
        context.moveTo(boardX + offset, rowY + rowHeight);
        context.lineTo(boardX + offset + rowHeight, rowY);
        context.stroke();
      }
      context.restore();

      const label = tier.label || "·";
      const fontSize = fitLabelFont(
        context,
        label,
        LABEL_WIDTH - 26,
        [...label].length > 2 ? 38 : 68,
        22
      );
      context.fillStyle = textColor;
      context.font = `900 ${fontSize}px ${FONT_SANS}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      const visibleLabel = truncateCanvasText(
        context,
        label,
        LABEL_WIDTH - 26
      );
      context.fillText(
        visibleLabel,
        boardX + LABEL_WIDTH / 2,
        rowY + rowHeight / 2 - 6
      );

      const pillText = `${count} ${count === 1 ? "ITEM" : "ITEMS"}`;
      context.font = `600 8.5px ${FONT_MONO}`;
      const pillWidth = Math.max(48, context.measureText(pillText).width + 16);
      const pillHeight = 19;
      const pillX = boardX + (LABEL_WIDTH - pillWidth) / 2;
      const pillY = rowY + rowHeight - 34;
      roundRectPath(
        context,
        pillX,
        pillY,
        pillWidth,
        pillHeight,
        pillHeight / 2
      );
      context.fillStyle = "rgba(255,255,255,.3)";
      context.fill();
      context.strokeStyle = "rgba(23,22,19,.2)";
      context.lineWidth = 1;
      context.stroke();
      context.fillStyle = textColor;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(pillText, boardX + LABEL_WIDTH / 2, pillY + 10);

      // Item grid.
      const areaX = boardX + LABEL_WIDTH + INNER_PADDING;
      const areaY = rowY + INNER_PADDING;

      if (count === 0) {
        context.save();
        context.setLineDash([5, 5]);
        context.strokeStyle = "rgba(23,22,19,.16)";
        context.lineWidth = 1.2;
        roundRectPath(
          context,
          areaX,
          rowY + 17,
          areaWidth - INNER_PADDING * 2,
          rowHeight - 34,
          10
        );
        context.stroke();
        context.setLineDash([]);
        context.fillStyle = "rgba(23,22,19,.26)";
        context.font = `500 11px ${FONT_MONO}`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(
          "EMPTY — DRAG SOMETHING HERE",
          areaX + (areaWidth - INNER_PADDING * 2) / 2,
          rowY + rowHeight / 2
        );
        context.restore();
      }

      tier.itemIds.forEach((itemId, itemIndex) => {
        const item = state.items[itemId];
        if (!item) return;
        const column = itemIndex % columns;
        const row = Math.floor(itemIndex / columns);
        const x = areaX + column * (CARD_WIDTH + CARD_GAP);
        const y = areaY + row * (CARD_HEIGHT + CARD_GAP);
        drawExportCard(
          context,
          item,
          imageMap,
          x,
          y,
          CARD_WIDTH,
          CARD_HEIGHT
        );
      });

      // Separators.
      if (tierIndex < state.tiers.length - 1) {
        context.beginPath();
        context.moveTo(boardX, rowY + rowHeight - 1);
        context.lineTo(boardX + boardWidth, rowY + rowHeight - 1);
        context.strokeStyle = "#171613";
        context.lineWidth = 2;
        context.stroke();
      }

      context.beginPath();
      context.moveTo(boardX + LABEL_WIDTH, rowY);
      context.lineTo(boardX + LABEL_WIDTH, rowY + rowHeight);
      context.strokeStyle = "#171613";
      context.lineWidth = 2;
      context.stroke();

      rowY += rowHeight;
    });

    context.restore();

    // Board border.
    roundRectPath(context, boardX, boardY, boardWidth, boardHeight, 22);
    context.strokeStyle = "#171613";
    context.lineWidth = 2.5;
    context.stroke();

    // Footer.
    const footerY = boardY + boardHeight + 39;
    drawLogoMark(context, PADDING, footerY - 11, 22);
    context.fillStyle = "#171613";
    context.font = `700 10px ${FONT_MONO}`;
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillText("TIERLAB", PADDING + 31, footerY);
    context.fillStyle = "#8c8374";
    context.font = `400 10px ${FONT_SANS}`;
    context.fillText("给一切排个高低。", PADDING + 86, footerY);

    context.fillStyle = "#9f9584";
    context.font = `500 8.5px ${FONT_MONO}`;
    context.textAlign = "right";
    context.fillText(
      "MADE WITH TIERLAB  /  LOCAL-FIRST",
      WIDTH - PADDING,
      footerY
    );

    return {
      canvas,
      width: WIDTH,
      height: HEIGHT,
      scale: finalScale,
      failed,
    };
  }

  /* ---------------------------------------------------------
     Export dialog actions
     --------------------------------------------------------- */

  let exportReady = false;

  function setExportBusy(busy, message = "") {
    els.downloadImageBtn.disabled = busy || !exportReady;
    els.copyImageBtn.disabled = busy || !exportReady;
    if (message) {
      els.downloadImageBtn.textContent = message;
    } else {
      els.downloadImageBtn.innerHTML = `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v10m0 0 4-4m-4 4L6 9M4 15v2h12v-2"/></svg> 下载 PNG`;
    }
  }

  async function openExportDialog() {
    exportReady = false;
    els.exportStage.innerHTML = `<div class="export-loading">
      <span class="spinner" aria-hidden="true"></span>
      <span>正在渲染榜单…</span>
    </div>`;
    els.exportSize.textContent = "计算中…";
    els.exportNotice.hidden = true;
    setExportBusy(true);
    showDialog(els.exportDialog);

    try {
      const result = await buildExportCanvas(1);
      const image = new Image();
      image.alt = "Tier List 导出预览";
      image.src = result.canvas.toDataURL("image/png");
      els.exportStage.replaceChildren(image);
      els.exportSize.textContent = `${result.width} × ${result.height} px · ${totalItemCount()} 张卡片`;
      if (result.failed > 0) {
        els.exportNotice.hidden = false;
        els.exportNotice.textContent = `有 ${result.failed} 张跨域或加载失败的图片会以占位图导出。你可以重新添加本地上传的版本。`;
      }
      exportReady = true;
      setExportBusy(false);
    } catch (error) {
      els.exportStage.innerHTML = `<div class="export-loading"><span>渲染失败，请再试一次</span></div>`;
      els.exportSize.textContent = "—";
      toast("导出预览生成失败");
      setExportBusy(false);
    }
  }

  async function exportBlob(scale = 2) {
    const result = await buildExportCanvas(scale);
    return new Promise((resolve, reject) => {
      result.canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("PNG 生成失败"));
      }, "image/png");
    });
  }

  function exportFileName() {
    const slug = (state.title || "tier-list")
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, "-")
      .slice(0, 40);
    return `${slug || "tier-list"}-tierlist.png`;
  }

  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("文件读取失败"));
      reader.readAsDataURL(blob);
    });
  }

  async function downloadImage() {
    if (!exportReady) return;
    setExportBusy(true, "正在生成高清图…");
    try {
      const blob = await exportBlob(2);

      // On iOS, WKWebView exposes this native bridge. A system share sheet is
      // more useful than a download: the user can save the PNG to Photos,
      // AirDrop it, or send it directly to a friend.
      if (window.webkit?.messageHandlers?.shareImage) {
        const dataURL = await blobToDataURL(blob);
        window.webkit.messageHandlers.shareImage.postMessage({
          dataURL,
          filename: exportFileName(),
        });
        toast("已打开系统分享，可保存到相册或直接发送");
        return;
      }

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = exportFileName();
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast("已下载高清 PNG");
    } catch (error) {
      toast("下载失败，请再试一次");
    } finally {
      setExportBusy(false);
    }
  }

  async function copyImage() {
    if (!exportReady) return;
    if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
      toast("当前浏览器不支持复制图片，请下载 PNG");
      return;
    }
    setExportBusy(true, "正在复制…");
    try {
      const blob = await exportBlob(2);
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      toast("图片已复制到剪贴板");
    } catch (error) {
      toast("复制失败，请改用下载 PNG");
    } finally {
      setExportBusy(false);
    }
  }

  /* ---------------------------------------------------------
     Events
     --------------------------------------------------------- */

  function registerEvents() {
    // Title editing. Live state update, history committed on blur.
    let titleBaseline = null;

    els.boardTitle.addEventListener("focus", () => {
      titleBaseline = cloneState();
    });

    els.boardTitle.addEventListener("input", () => {
      state.title = els.boardTitle.value;
      scheduleSave();
    });

    els.boardTitle.addEventListener("blur", () => {
      if (!titleBaseline) return;
      if (state.title !== titleBaseline.title) {
        pushPast(titleBaseline);
        scheduleSave();
      }
      titleBaseline = null;
    });

    els.boardTitle.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        els.boardTitle.blur();
      }
    });

    // Undo / redo.
    els.undoBtn.addEventListener("click", undo);
    els.redoBtn.addEventListener("click", redo);

    // Board clicks.
    els.board.addEventListener("click", (event) => {
      const remove = event.target.closest('[data-action="remove-item"]');
      if (remove) {
        event.preventDefault();
        removeItem(remove.dataset.itemId);
        return;
      }

      const edit = event.target.closest('[data-action="edit-tier"]');
      if (edit) {
        event.preventDefault();
        openTierDialog(edit.dataset.tierId);
        return;
      }

      if (event.target.closest(".item-card")) return;

      const tier = event.target.closest(".tier");
      if (!tier) return;

      if (selectedItemId) {
        moveSelectedToTier(tier.dataset.tierId);
        return;
      }

      if (event.target.closest(".tier-label")) {
        openTierDialog(tier.dataset.tierId);
      }
    });

    // Double click card to edit.
    els.board.addEventListener("dblclick", (event) => {
      const card = event.target.closest(".item-card");
      if (!card) return;
      event.preventDefault();
      openItemDialog(card.dataset.itemId);
    });

    // Pool clicks.
    els.pool.addEventListener("click", (event) => {
      if (event.target.closest("[data-add-mode]")) return;

      const remove = event.target.closest('[data-action="remove-item"]');
      if (remove) {
        event.preventDefault();
        removeItem(remove.dataset.itemId);
        return;
      }

      if (event.target.closest(".item-card")) return;

      if (selectedItemId) {
        moveSelectedToPool();
      }
    });

    els.pool.addEventListener("dblclick", (event) => {
      const card = event.target.closest(".item-card");
      if (!card) return;
      event.preventDefault();
      openItemDialog(card.dataset.itemId);
    });

    // Keyboard selection on cards.
    function cardKeydown(event) {
      const card = event.target.closest(".item-card");
      if (!card) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectItem(card.dataset.itemId);
      }
    }
    els.board.addEventListener("keydown", cardKeydown);
    els.pool.addEventListener("keydown", cardKeydown);

    // Add buttons everywhere.
    document.addEventListener("click", (event) => {
      const add = event.target.closest("[data-add-mode]");
      if (add) {
        event.preventDefault();
        openAddDialog(add.dataset.addMode || "upload");
        return;
      }

      const close = event.target.closest("[data-close]");
      if (close) {
        const dialog = document.getElementById(close.dataset.close);
        if (dialog) dialog.close();
        return;
      }

      const openTemplates = event.target.closest("[data-open-templates]");
      if (openTemplates) {
        event.preventDefault();
        showDialog(els.templatesDialog);
        return;
      }

      const openHelp = event.target.closest("[data-open-help]");
      if (openHelp) {
        event.preventDefault();
        showDialog(els.helpDialog);
      }
    });

    // Toolbar / header.
    els.addTierBtn.addEventListener("click", addTier);
    els.openTemplatesBtn.addEventListener("click", () =>
      showDialog(els.templatesDialog)
    );
    els.openExportBtn.addEventListener("click", openExportDialog);
    els.newBtn.addEventListener("click", () => {
      const before = cloneState();
      state = createBlankBoard();
      selectedItemId = null;
      pushPast(before);
      render();
      scheduleSave();
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast("已新建空白榜单", {
        actionLabel: "撤销",
        onAction: undo,
      });
    });

    // Selection bar.
    els.selectionCancel.addEventListener("click", clearSelection);
    els.selectionEdit.addEventListener("click", () => {
      if (selectedItemId) openItemDialog(selectedItemId);
    });

    // Add dialog tabs.
    $$("[data-add-tab]", els.addDialog).forEach((tab) => {
      tab.addEventListener("click", () => setAddMode(tab.dataset.addTab));
    });

    // Upload zone.
    els.fileInput.addEventListener("change", () => {
      if (els.fileInput.files?.length) {
        handleImageFiles(els.fileInput.files);
        els.fileInput.value = "";
      }
    });

    els.pasteImageBtn.addEventListener("click", pasteImageFromClipboard);

    document.addEventListener("paste", (event) => {
      const items = event.clipboardData?.items;
      if (!items) return;
      const files = [];
      for (const item of items) {
        if (item.kind !== "file" || !String(item.type).startsWith("image/")) {
          continue;
        }
        const file = item.getAsFile();
        if (file) files.push(file);
      }
      if (!files.length) return;
      event.preventDefault();
      handleImageFiles(files, { fromPaste: true });
    });

    ["dragenter", "dragover"].forEach((type) => {
      els.uploadZone.addEventListener(type, (event) => {
        if (![...(event.dataTransfer?.types || [])].includes("Files")) return;
        event.preventDefault();
        els.uploadZone.classList.add("is-dragover");
      });
    });
    ["dragleave", "drop"].forEach((type) => {
      els.uploadZone.addEventListener(type, () => {
        els.uploadZone.classList.remove("is-dragover");
      });
    });

    // Emoji adding.
    els.emojiGrid.addEventListener("click", (event) => {
      const button = event.target.closest(".emoji-btn");
      if (!button) return;
      addEmoji(button.dataset.emoji, button.dataset.name, button);
    });

    els.addCustomEmoji.addEventListener("click", () => {
      const emoji = els.customEmoji.value.trim();
      if (!emoji) {
        els.customEmoji.focus();
        return;
      }
      addEmoji(emoji, els.customEmojiName.value);
      els.customEmoji.value = "";
      els.customEmojiName.value = "";
    });

    els.customEmoji.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        els.addCustomEmoji.click();
      }
    });

    // Text cards.
    els.textContent.addEventListener("input", updateTextPreview);
    els.textColorGrid.addEventListener("click", (event) => {
      const button = event.target.closest("[data-text-color]");
      if (!button) return;
      textColor = button.dataset.textColor;
      updateTextPreview();
    });
    els.addTextBtn.addEventListener("click", () => {
      const text = els.textContent.value.trim();
      if (!text) {
        toast("先写点文字吧");
        els.textContent.focus();
        return;
      }
      addItemsToPool([makeTextItem(text, textColor)]);
      closeDialog(els.addDialog);
      els.textContent.value = "";
      updateTextPreview();
      toast("已添加文字卡片");
      revealPool();
    });

    // URL images.
    els.addUrlBtn.addEventListener("click", addImageFromUrl);
    els.imageUrl.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addImageFromUrl();
      }
    });

    // Tier dialog.
    els.tierNameInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        els.tierDialog.close();
      }
    });

    els.tierNameInput.addEventListener("input", () => {
      const tier = currentEditingTier();
      if (!tier) return;
      tier.label = els.tierNameInput.value;
      updateTierDialogPreview();
      renderBoard();
    });

    els.tierColorGrid.addEventListener("click", (event) => {
      const button = event.target.closest("[data-color]");
      if (!button) return;
      const tier = currentEditingTier();
      if (!tier) return;
      tier.color = button.dataset.color;
      updateTierDialogPreview();
      syncTierColorSelection();
      renderBoard();
    });

    function moveEditingTier(direction) {
      if (!tierEditSession) return;
      const tier = currentEditingTier();
      if (!tier) return;
      tier.label = els.tierNameInput.value;
      const index = state.tiers.findIndex((entry) => entry.id === tier.id);
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= state.tiers.length) return;
      state.tiers.splice(index, 1);
      state.tiers.splice(nextIndex, 0, tier);
      renderBoard();
      updateTierOrderButtons();
    }

    els.moveTierUp.addEventListener("click", () => moveEditingTier(-1));
    els.moveTierDown.addEventListener("click", () => moveEditingTier(1));

    els.deleteTierBtn.addEventListener("click", () => {
      if (!tierEditSession) return;
      if (state.tiers.length <= 1) {
        toast("至少要保留一个档位");
        return;
      }
      const tier = currentEditingTier();
      if (!tier) return;

      const before = cloneState();
      state.pool.push(...tier.itemIds);
      state.tiers = state.tiers.filter((entry) => entry.id !== tier.id);
      pushPast(before);
      selectedItemId = null;
      tierEditSession.suppress = true;
      els.tierDialog.close();
      render();
      scheduleSave();
      toast(`已删除档位「${tier.label || "·"}」，卡片回到素材池`, {
        actionLabel: "撤销",
        onAction: undo,
        duration: 5000,
      });
    });

    els.tierDialog.addEventListener("close", finalizeTierSession);

    // Templates.
    function chooseTemplate(card) {
      if (!card) return;
      const template = TEMPLATES.find(
        (entry) => entry.id === card.dataset.templateId
      );
      applyTemplate(template);
    }

    els.templateGrid.addEventListener("click", (event) => {
      chooseTemplate(event.target.closest("[data-template-id]"));
    });

    els.templateGrid.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const card = event.target.closest("[data-template-id]");
      if (!card) return;
      event.preventDefault();
      chooseTemplate(card);
    });

    // Item dialog.
    els.itemSaveBtn.addEventListener("click", () => {
      const item = state.items[editingItemId];
      if (!item) {
        els.itemDialog.close();
        return;
      }
      const name = els.itemNameInput.value.trim().slice(0, 30);
      if (item.kind === "text" && !name) {
        toast("文字卡片需要一点内容");
        els.itemNameInput.focus();
        return;
      }
      if (item.name !== name) {
        const before = cloneState();
        state.items[item.id].name = name;
        pushPast(before);
        render();
        scheduleSave();
      }
      els.itemDialog.close();
    });

    els.itemNameInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        els.itemSaveBtn.click();
      }
    });

    els.itemRemoveBtn.addEventListener("click", () => {
      if (!editingItemId) return;
      const id = editingItemId;
      editingItemId = null;
      els.itemDialog.close();
      removeItem(id);
    });

    els.itemDialog.addEventListener("close", () => {
      editingItemId = null;
    });

    // Export.
    els.downloadImageBtn.addEventListener("click", downloadImage);
    els.copyImageBtn.addEventListener("click", copyImage);
    els.exportDialog.addEventListener("close", () => {
      exportReady = false;
      els.exportStage.innerHTML = "";
    });

    // Dialog backdrop closing. Native dialogs report clicks on the backdrop as
    // a click on the dialog itself, so compare coordinates.
    $$("dialog").forEach((dialog) => {
      dialog.addEventListener("click", (event) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const outside =
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom;
        if (outside) dialog.close();
      });
    });

    // Global file drag overlay.
    let fileDragDepth = 0;

    function hasFiles(event) {
      return [...(event.dataTransfer?.types || [])].includes("Files");
    }

    window.addEventListener("dragenter", (event) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      fileDragDepth += 1;
      els.fileOverlay.hidden = false;
    });

    window.addEventListener("dragover", (event) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    });

    window.addEventListener("dragleave", (event) => {
      if (!hasFiles(event)) return;
      fileDragDepth = Math.max(0, fileDragDepth - 1);
      if (fileDragDepth === 0) els.fileOverlay.hidden = true;
    });

    window.addEventListener("drop", (event) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      fileDragDepth = 0;
      els.fileOverlay.hidden = true;
      const files = [...(event.dataTransfer?.files || [])];
      if (files.length) handleImageFiles(files);
    });

    // Pointer drag.
    els.board.addEventListener("pointerdown", pointerDown);
    els.pool.addEventListener("pointerdown", pointerDown);
    window.addEventListener("pointermove", pointerMove, { passive: false });
    window.addEventListener("pointerup", pointerUp);
    window.addEventListener("pointercancel", pointerCancel);
    window.addEventListener("blur", () => {
      if (!press) return;
      cleanupDrag();
      press = null;
    });

    // Keyboard shortcuts.
    document.addEventListener("keydown", (event) => {
      const dialogOpen = Boolean(document.querySelector("dialog[open]"));
      const inField = isTextField(event.target);

      if (
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        event.key.toLowerCase() === "z"
      ) {
        if (inField && !dialogOpen && event.target === els.boardTitle) {
          // App-level undo should also work while editing the title.
        } else if (inField) {
          return;
        }
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }

      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "y" &&
        !inField
      ) {
        event.preventDefault();
        redo();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        persistNow({ silent: false });
        return;
      }

      if (dialogOpen) return;

      if (event.key === "Escape") {
        clearSelection();
        return;
      }

      if (
        (event.key === "Backspace" || event.key === "Delete") &&
        !inField &&
        selectedItemId
      ) {
        event.preventDefault();
        removeItem(selectedItemId);
      }
    });

    // Persist when leaving.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") persistNow();
    });
    window.addEventListener("beforeunload", () => persistNow());

    // Bad image fallback.
    document.addEventListener(
      "error",
      (event) => {
        const image = event.target;
        if (!(image instanceof HTMLImageElement)) return;
        const media = image.closest(".item-media");
        if (!media) return;
        image.remove();
        if (!media.querySelector(".media-fallback")) {
          media.insertAdjacentHTML("beforeend", fallbackMarkup());
        }
      },
      true
    );
  }

  /* ---------------------------------------------------------
     Boot
     --------------------------------------------------------- */

  // Narrow bridges for the native macOS wrapper.
  window.tierlabPasteImage = (payload) => {
    addPastedImagePayload(payload);
  };
  window.tierlabNotify = (message) => {
    toast(String(message || ""));
  };

  function init() {
    const loaded = loadBoard();
    if (loaded) {
      state = loaded;
    } else {
      state = createInitialBoard();
      firstRun = true;
    }

    registerEvents();
    renderEmojiLibrary();
    renderTemplateGrid();
    renderColorGrids();
    updateTextPreview();
    render();
    setSaveStatus("saved", "已保存");

    if (firstRun) {
      setTimeout(() => {
        toast("这是一张示例榜，随便拖。点「新建」可以从空白开始。", {
          duration: 6500,
        });
      }, 900);
    }
  }

  init();
})();
