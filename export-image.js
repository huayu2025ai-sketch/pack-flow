/* Draw the shareable list locally, without screenshots or remote services. */
(() => {
  const WIDTH = 720, SCALE = 1.5, MAX_HEIGHT = 2500, MARGIN = 44;
  const FONT = '"PingFang SC", "Microsoft YaHei", -apple-system, sans-serif';
  const palette = { bg: '#e7e5de', paper: '#f3f0e9', ink: '#35414a', muted: '#5d666b', line: '#d2d3ca', blue: '#496d83', light: '#dce4e6', green: '#52735f' };
  const tones = { blue: ['#dce4e6', '#496d83'], peach: ['#eae0d4', '#89683d'], purple: ['#e6e0ea', '#806399'], green: ['#dfe6db', '#52735f'] };

  function font(ctx, size, weight = 400) { ctx.font = `${weight} ${size}px ${FONT}`; }
  function wrap(ctx, value, width) {
    const lines = [];
    for (const paragraph of String(value || '').split(/\r\n?|\n/)) {
      let line = '';
      for (const character of Array.from(paragraph)) {
        if (line && ctx.measureText(line + character).width > width) { lines.push(line); line = ''; }
        line += character;
      }
      lines.push(line);
    }
    return lines;
  }
  function box(ctx, x, y, width, height, radius, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.roundRect(x, y, width, height, radius); ctx.fill();
  }
  function text(ctx, value, x, y, size, color = palette.ink, weight = 400) {
    font(ctx, size, weight); ctx.fillStyle = color; ctx.fillText(value, x, y);
  }
  function rule(ctx, y, x = MARGIN, width = WIDTH - MARGIN * 2) {
    ctx.strokeStyle = palette.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + width, y); ctx.stroke();
  }

  function makeLayout(ctx, data) {
    const groups = data.groups;
    const total = groups.reduce((sum, group) => sum + group.items.length, 0);
    const packed = groups.reduce((sum, group) => sum + group.items.filter(item => item[2] === 'packed').length, 0);
    font(ctx, 40, 700);
    const title = wrap(ctx, data.name, WIDTH - MARGIN * 2);
    const firstHeader = 252 + title.length * 52;
    const pages = [{ entries: [], y: firstHeader }];
    const nextPage = () => { const page = { entries: [], y: 178 }; pages.push(page); return page; };
    const limit = MAX_HEIGHT - 112;
    const addHeading = (page, group, index, continued) => {
      const [fill, ink] = tones[group.color] || tones.blue;
      font(ctx, 21, 600);
      const names = wrap(ctx, group.name, 434);
      font(ctx, 13);
      const description = group.description ? wrap(ctx, group.description, 580) : [];
      const height = 62 + names.length * 27 + description.length * 19;
      page.entries.push({ type: 'group', y: page.y, height, names, description, group, index, continued, fill, ink });
      page.y += height;
    };
    groups.forEach((group, index) => {
      let page = pages[pages.length - 1];
      font(ctx, 21, 600);
      const headingNameHeight = wrap(ctx, group.name, 434).length * 27;
      font(ctx, 13);
      const headingHeight = 62 + headingNameHeight + (group.description ? wrap(ctx, group.description, 580).length * 19 : 0);
      if (page.y + headingHeight + 80 > limit && page.entries.length) page = nextPage();
      addHeading(page, group, index, false);
      if (!group.items.length) {
        page.entries.push({ type: 'empty', y: page.y, height: 54 }); page.y += 54;
      }
      group.items.forEach(item => {
        font(ctx, 18, 500);
        const names = wrap(ctx, item[0], 430);
        font(ctx, 13);
        const notes = item[1] ? wrap(ctx, item[1], 484) : [];
        // Split exceptionally long text as well as long lists; never clip notes.
        const lines = [...names.map(value => ({ value, kind: 'name', height: 27 })), ...notes.map(value => ({ value, kind: 'note', height: 20 }))];
        let offset = 0;
        while (offset < lines.length) {
          page = pages[pages.length - 1];
          if (page.y + 72 > limit) { page = nextPage(); addHeading(page, group, index, true); }
          const capacity = limit - page.y - 28;
          let height = 0, end = offset;
          while (end < lines.length && height + lines[end].height <= capacity) height += lines[end++].height;
          if (end === offset) throw new Error('分组名称或描述过长，请缩短后重试');
          page.entries.push({ type: 'item', y: page.y, height: height + 28, lines: lines.slice(offset, end), item, continued: offset > 0 });
          page.y += height + 28;
          offset = end;
          if (offset < lines.length) { page = nextPage(); addHeading(page, group, index, true); }
        }
      });
      pages[pages.length - 1].y += 22;
    });
    return { pages, title, total, packed, percent: total ? Math.round(packed / total * 100) : 0 };
  }

  function drawHeader(ctx, data, layout, pageIndex) {
    text(ctx, 'packflow.', MARGIN, 49, 24, palette.blue, 700);
    ctx.textAlign = 'right'; text(ctx, data.date, WIDTH - MARGIN, 47, 12, palette.muted); ctx.textAlign = 'left';
    if (pageIndex > 0) {
      text(ctx, 'PACKING LIST / CONTINUED', MARGIN, 91, 11, palette.muted, 600);
      font(ctx, 20, 600);
      const name = wrap(ctx, data.name, 565)[0];
      text(ctx, name + (layout.title.length > 1 ? '…' : ''), MARGIN, 127, 20, palette.ink, 600);
      rule(ctx, 148);
      return;
    }
    text(ctx, 'PACK LIGHT. GO FAR.', MARGIN, 98, 11, palette.blue, 600);
    layout.title.forEach((line, index) => text(ctx, line, MARGIN, 151 + index * 52, 40, palette.ink, 700));
    const top = 178 + (layout.title.length - 1) * 52;
    text(ctx, `${data.scopeLabel}  ·  ${data.groups.length} 个分组`, MARGIN, top, 13, palette.muted);
    box(ctx, MARGIN, top + 22, WIDTH - MARGIN * 2, 91, 16, palette.light);
    const stats = [['物品总数', layout.total], ['已打包', layout.packed], ['待准备', layout.total - layout.packed]];
    stats.forEach(([label, value], index) => {
      const x = MARGIN + 22 + index * 147;
      text(ctx, String(value), x, top + 62, 26, palette.ink, 700);
      text(ctx, label, x, top + 89, 11, palette.muted);
    });
    text(ctx, `${layout.percent}%`, 566, top + 61, 24, palette.blue, 700);
    text(ctx, '准备就绪', 566, top + 88, 11, palette.muted);
    box(ctx, MARGIN + 22, top + 102, WIDTH - MARGIN * 2 - 44, 3, 1.5, '#c6d1d3');
    if (layout.percent) box(ctx, MARGIN + 22, top + 102, (WIDTH - MARGIN * 2 - 44) * layout.percent / 100, 3, 1.5, palette.blue);
  }

  function drawEntry(ctx, entry) {
    const { y, height } = entry;
    if (entry.type === 'group') {
      box(ctx, MARGIN, y, WIDTH - MARGIN * 2, height - 7, 14, palette.paper);
      box(ctx, MARGIN + 17, y + 19, 30, 30, 9, entry.fill);
      text(ctx, String(entry.index + 1).padStart(2, '0'), MARGIN + 22, y + 40, 13, entry.ink, 600);
      entry.names.forEach((line, index) => text(ctx, line, MARGIN + 60, y + 41 + index * 27, 21, palette.ink, 600));
      const status = entry.continued ? '接上页' : entry.group.id === 'unassigned' ? '待分配' : ({ todo: '待准备', shipping: '运输中', received: '已收到' })[entry.group.status] || '待准备';
      ctx.textAlign = 'right'; text(ctx, status, WIDTH - MARGIN - 18, y + 38, 12, entry.ink, 500); ctx.textAlign = 'left';
      entry.description.forEach((line, index) => text(ctx, line, MARGIN + 18, y + 59 + entry.names.length * 27 + index * 19, 13, palette.muted));
    } else if (entry.type === 'empty') {
      text(ctx, '这里还没有物品', MARGIN + 18, y + 28, 13, palette.muted);
    } else {
      box(ctx, MARGIN, y, WIDTH - MARGIN * 2, height - 3, 8, palette.paper);
      const packed = entry.item[2] === 'packed';
      box(ctx, MARGIN + 18, y + 17, 19, 19, 5, packed ? palette.blue : palette.light);
      if (packed) {
        ctx.strokeStyle = palette.paper; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(MARGIN + 23, y + 26); ctx.lineTo(MARGIN + 27, y + 30); ctx.lineTo(MARGIN + 32, y + 23); ctx.stroke();
      }
      let baseline = y + 32;
      entry.lines.forEach(line => {
        text(ctx, line.value, MARGIN + 52, baseline, line.kind === 'name' ? 18 : 13, line.kind === 'name' ? palette.ink : palette.muted, line.kind === 'name' ? 500 : 400);
        baseline += line.height;
      });
      const category = entry.continued ? '接上页' : entry.item[3] || '其他';
      font(ctx, 11, 500);
      const chipWidth = Math.min(104, ctx.measureText(category).width + 18);
      box(ctx, WIDTH - MARGIN - chipWidth - 16, y + 17, chipWidth, 23, 6, palette.light);
      text(ctx, category, WIDTH - MARGIN - chipWidth - 7, y + 33, 11, palette.blue, 500);
    }
  }

  async function render(data) {
    const measureCanvas = document.createElement('canvas');
    const measure = measureCanvas.getContext('2d');
    if (!measure) throw new Error('当前浏览器不支持图片导出');
    const layout = makeLayout(measure, data);
    const blobs = [];
    for (let index = 0; index < layout.pages.length; index++) {
      const page = layout.pages[index];
      const height = Math.max(520, Math.ceil(page.y + 90));
      if (height > MAX_HEIGHT) throw new Error('清单标题或分组描述过长，请缩短后重试');
      const canvas = document.createElement('canvas');
      canvas.width = WIDTH * SCALE; canvas.height = height * SCALE;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('当前浏览器不支持图片导出');
      ctx.scale(SCALE, SCALE);
      ctx.fillStyle = palette.bg; ctx.fillRect(0, 0, WIDTH, height);
      drawHeader(ctx, data, layout, index);
      if (!data.groups.length) text(ctx, '清单还是空的，下一次出发从这里开始。', MARGIN, page.y + 32, 16, palette.muted);
      page.entries.forEach(entry => drawEntry(ctx, entry));
      rule(ctx, height - 62);
      text(ctx, '收好每一件，轻松去出发。', MARGIN, height - 31, 11, palette.muted);
      ctx.textAlign = 'right'; text(ctx, `${index + 1} / ${layout.pages.length}  ·  MADE WITH PACKFLOW`, WIDTH - MARGIN, height - 31, 10, palette.muted); ctx.textAlign = 'left';
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      canvas.width = canvas.height = 0;
      if (!blob) throw new Error('图片生成失败，请重试');
      blobs.push(blob);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    return blobs;
  }
  window.PackFlowImage = { render };
})();
