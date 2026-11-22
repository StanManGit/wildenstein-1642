// Zeichnen der Szene
import { World, NX, NY, W, Y0, Y1 } from './world';
import { Game } from './game';
import { Gun, previewPath } from './sim';

export interface View { x0: number; yTop: number; s: number; sx: number; sy: number; w: number; h: number }

export function fitView(cw: number, ch: number, xa: number, xb: number, ya: number, yb: number, sx = 0, sy = 0, anchor = 0.5): View {
  const s = Math.min(cw / (xb - xa), ch / (yb - ya));
  const x0 = (xa + xb) / 2 - cw / s / 2;
  // anchor: Anteil der Höhe, an dem ya (Unterkante) liegen soll, wenn Platz übrig ist
  const spare = ch / s - (yb - ya);
  const yTop = yb + spare * (1 - anchor);
  return { x0, yTop, s, sx, sy, w: cw, h: ch };
}

const X = (v: View, x: number) => v.sx + (x - v.x0) * v.s;
const Y = (v: View, y: number) => v.sy + (v.yTop - y) * v.s;

export function toWorld(v: View, px: number, py: number) {
  return { x: (px - v.sx) / v.s + v.x0, y: v.yTop - (py - v.sy) / v.s };
}

function rect(ctx: CanvasRenderingContext2D, v: View, x0: number, x1: number, y0: number, y1: number) {
  ctx.fillRect(X(v, x0), Y(v, y1), (x1 - x0) * v.s, (y1 - y0) * v.s);
}

function poly(ctx: CanvasRenderingContext2D, v: View, pts: number[][]) {
  ctx.beginPath();
  pts.forEach((p, i) => i ? ctx.lineTo(X(v, p[0]), Y(v, p[1])) : ctx.moveTo(X(v, p[0]), Y(v, p[1])));
  ctx.closePath(); ctx.fill();
}

function backdrop(ctx: CanvasRenderingContext2D, v: View, g: Game) {
  const sky = ctx.createLinearGradient(0, v.sy, 0, v.sy + v.h);
  if (g.rain) { sky.addColorStop(0, '#7d858c'); sky.addColorStop(1, '#b9bcb8'); }
  else { sky.addColorStop(0, '#7fa6c4'); sky.addColorStop(0.7, '#d9dcd0'); sky.addColorStop(1, '#e9dfc6'); }
  ctx.fillStyle = sky; ctx.fillRect(v.sx, v.sy, v.w, v.h);
  // ferne Albhöhen
  ctx.fillStyle = g.rain ? '#8f978f' : '#9fb0b0';
  const pts: number[][] = [[-200, 700]];
  for (let x = -200; x <= W + 300; x += 20) pts.push([x, 812 + 9 * Math.sin(x / 70) + 5 * Math.sin(x / 23 + 2)]);
  pts.push([W + 300, 700]); poly(ctx, v, pts);
  // gegenüberliegender Talhang mit Wald
  ctx.fillStyle = g.rain ? '#5d6b58' : '#5f7a4f';
  const p2: number[][] = [[555, 600]];
  for (let x = 555; x <= W + 300; x += 6) p2.push([x, 640 + (x - 555) * 1.9 + 6 * Math.sin(x / 9) + 4 * Math.sin(x / 3.1)]);
  p2.push([W + 300, 600]); poly(ctx, v, p2);
  ctx.fillStyle = '#4f6a42';
  for (let x = 560; x < W + 300; x += 4) {
    const top = 640 + (x - 555) * 1.9 + 6 * Math.sin(x / 9);
    poly(ctx, v, [[x - 2, top - 8], [x, top + 3 + 3 * Math.sin(x)], [x + 2, top - 8]]);
  }
  // Wald auf der Hochfläche im Hintergrund
  ctx.fillStyle = g.rain ? '#6a7563' : '#6e8560';
  const p3: number[][] = [[-50, 799]];
  for (let x = -50; x <= 420; x += 5) p3.push([x, 803 + 3 * Math.sin(x / 13) + 2 * Math.sin(x / 4.3)]);
  p3.push([420, 799]); poly(ctx, v, p3);
}

function structures(ctx: CanvasRenderingContext2D, v: View) {
  // Flankenturm hinter der Schildmauer
  ctx.fillStyle = '#9d988c';
  rect(ctx, v, 437, 452, 800, 818);
  ctx.fillStyle = '#6b4a35';
  poly(ctx, v, [[436, 818], [444.5, 828], [453, 818]]);
  ctx.fillStyle = '#4b4842';
  rect(ctx, v, 439, 440.4, 809, 810.6); rect(ctx, v, 449, 450.4, 805, 806.6);
  // Innenräume (Rückwände)
  ctx.fillStyle = '#5a5248';
  rect(ctx, v, 459, 469, 800, 805);
  rect(ctx, v, 503.5, 521, 801, 806.5);
  rect(ctx, v, 501.7, 521, 808, 819.5);
  rect(ctx, v, 524.5, 531.5, 801, 836.5);
  rect(ctx, v, 534.5, 554.5, 800.5, 817);
  // Kapelle hinter dem Palas
  ctx.fillStyle = '#a39e92';
  rect(ctx, v, 547, 557, 800, 822);
  ctx.fillStyle = '#6b4a35';
  poly(ctx, v, [[546, 822], [552, 830], [558, 822]]);
  // Fenster im Palas (Rückwand)
  ctx.fillStyle = '#c9b88a';
  for (let x = 537; x < 553; x += 4) { rect(ctx, v, x, x + 1.2, 808, 810); rect(ctx, v, x, x + 1.2, 813.5, 815.5); }
}

function decorations(ctx: CanvasRenderingContext2D, v: View, g: Game) {
  const w = g.w;
  ctx.fillStyle = '#2d2a26';
  if (w.at(499, 817.5) === 3) rect(ctx, v, 498, 501.7, 816.8, 818.3);
  if (w.at(499, 803) === 3) rect(ctx, v, 498, 503.5, 802, 803.4);
  if (w.at(527, 826) === 3) rect(ctx, v, 523, 524.5, 825, 827);
  if (w.at(527, 815) === 3) rect(ctx, v, 523, 524.5, 814, 816);
  // Fahnen
  flag(ctx, v, 528, 845, 'def', g);
  flag(ctx, v, 205, 801, 'att', g);
}

function flag(ctx: CanvasRenderingContext2D, v: View, x: number, y: number, side: 'att' | 'def', g: Game) {
  if (side === 'def' && g.winner === 'att') side = 'att';
  ctx.strokeStyle = '#3b2b1d'; ctx.lineWidth = Math.max(1, 0.15 * v.s);
  ctx.beginPath(); ctx.moveTo(X(v, x), Y(v, y)); ctx.lineTo(X(v, x), Y(v, y + 8)); ctx.stroke();
  const wave = Math.sin(g.time * 3) * 0.3;
  const fw = 4.5 * Math.sign(g.wind || 1), fh = 3;
  const x0 = X(v, x), y0 = Y(v, y + 8);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(x0 + fw * v.s / 2, y0 + wave * v.s, x0 + fw * v.s, y0 + 0.3 * v.s);
  ctx.lineTo(x0 + fw * v.s, y0 + (fh + 0.3) * v.s);
  ctx.quadraticCurveTo(x0 + fw * v.s / 2, y0 + (fh + wave) * v.s, x0, y0 + fh * v.s);
  ctx.closePath();
  ctx.clip();
  if (side === 'att') {
    // weiß-blaue Rauten (Bayern)
    ctx.fillStyle = '#f4f4ef'; ctx.fillRect(Math.min(x0, x0 + fw * v.s), y0 - v.s, Math.abs(fw) * v.s, (fh + 2) * v.s);
    ctx.fillStyle = '#2f6db0';
    const d = 0.75 * v.s;
    for (let a = -6; a < 12; a++) for (let b = -2; b < 8; b++) {
      if ((a + b) % 2) continue;
      const cx = x0 + Math.sign(fw) * a * d, cy = y0 + b * d;
      ctx.beginPath(); ctx.moveTo(cx, cy - d); ctx.lineTo(cx + d, cy); ctx.lineTo(cx, cy + d); ctx.lineTo(cx - d, cy); ctx.closePath(); ctx.fill();
    }
  } else {
    // gelbes Tuch mit drei schwarzen Hirschstangen (Württemberg, vereinfacht)
    ctx.fillStyle = '#e2b437'; ctx.fillRect(Math.min(x0, x0 + fw * v.s), y0 - v.s, Math.abs(fw) * v.s, (fh + 2) * v.s);
    ctx.strokeStyle = '#1d1a16'; ctx.lineWidth = 0.35 * v.s;
    for (let k = 0; k < 3; k++) {
      const yy = y0 + (0.7 + k * 0.85) * v.s;
      ctx.beginPath(); ctx.moveTo(x0 + Math.sign(fw) * 0.6 * v.s, yy); ctx.lineTo(x0 + fw * 0.85 * v.s, yy); ctx.stroke();
    }
  }
  ctx.restore();
}

function person(ctx: CanvasRenderingContext2D, v: View, x: number, y: number, coat: string, sash: string, t: number, dir: number) {
  const s = v.s;
  ctx.fillStyle = coat;
  ctx.fillRect(X(v, x - 0.22), Y(v, y + 1.4), 0.44 * s, 0.75 * s);
  ctx.fillStyle = '#3a3128';
  ctx.fillRect(X(v, x - 0.2), Y(v, y + 0.65), 0.16 * s, 0.65 * s);
  ctx.fillRect(X(v, x + 0.04), Y(v, y + 0.65), 0.16 * s, 0.65 * s);
  ctx.fillStyle = sash; ctx.fillRect(X(v, x - 0.22), Y(v, y + 1.05), 0.44 * s, 0.1 * s);
  ctx.fillStyle = '#d6b393';
  ctx.beginPath(); ctx.arc(X(v, x), Y(v, y + 1.57), 0.17 * s, 0, 7); ctx.fill();
  ctx.fillStyle = '#2b2520';
  ctx.fillRect(X(v, x - 0.3), Y(v, y + 1.72), 0.6 * s, 0.06 * s);
  ctx.fillRect(X(v, x - 0.17), Y(v, y + 1.9), 0.34 * s, 0.2 * s);
  void t; void dir;
}

function drawGun(ctx: CanvasRenderingContext2D, v: View, gun: Gun, g: Game, selected: boolean) {
  const s = v.s;
  const coat = gun.side === 'att' ? '#4a5a6e' : '#6b5a45';
  const sash = gun.side === 'att' ? '#3d7cc9' : '#d4a72c';
  if (gun.alive) {
    const n = Math.min(gun.crew, 5);
    for (let k = 0; k < n; k++) {
      const px = gun.x - gun.dir * (1.6 + k * 0.6) + (k % 2 ? 0.1 : 0);
      person(ctx, v, px, gun.y, coat, sash, g.time, gun.dir);
    }
  }
  const a = gun.angle * Math.PI / 180;
  const piv = { x: gun.x, y: gun.y + (gun.type.shell ? 0.8 : gun.type.key === 'haken' ? 1.3 : 1.25) };
  ctx.save();
  ctx.translate(X(v, piv.x), Y(v, piv.y));
  if (!gun.alive) ctx.globalAlpha = 0.55;
  if (gun.type.key === 'haken') {
    // Wallbüchse auf Bock
    ctx.strokeStyle = '#4b3a28'; ctx.lineWidth = 0.12 * s;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 1.3 * s); ctx.stroke();
    ctx.scale(gun.dir, 1);
    ctx.rotate(-a);
    ctx.fillStyle = '#2f2c29'; ctx.fillRect(-0.6 * s, -0.06 * s, gun.type.barrel * s, 0.12 * s);
    ctx.fillStyle = '#5b4330'; ctx.fillRect(-0.9 * s, -0.09 * s, 0.5 * s, 0.18 * s);
  } else if (gun.type.shell) {
    ctx.fillStyle = '#5b4330'; ctx.fillRect(-1.0 * s, -0.1 * s, 2.0 * s, 0.9 * s);
    ctx.scale(gun.dir, 1);
    ctx.rotate(-a);
    ctx.fillStyle = '#7a6a48';
    ctx.fillRect(-0.3 * s, -0.42 * s, 1.1 * s, 0.84 * s);
    ctx.fillStyle = '#5e5236'; ctx.fillRect(0.7 * s, -0.48 * s, 0.15 * s, 0.96 * s);
  } else {
    // Lafette
    ctx.scale(gun.dir, 1);
    ctx.fillStyle = '#5b4330';
    ctx.beginPath(); ctx.moveTo(0.4 * s, -0.1 * s); ctx.lineTo(-2.2 * s, 1.15 * s); ctx.lineTo(-2.2 * s, 0.95 * s); ctx.lineTo(0.2 * s, -0.3 * s); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.rotate(-a);
    const L = gun.type.barrel, r = gun.type.diam * 1.6;
    const grd = ctx.createLinearGradient(0, -r * s, 0, r * s);
    grd.addColorStop(0, '#b08a4a'); grd.addColorStop(0.5, '#8c6a33'); grd.addColorStop(1, '#5c4520');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.moveTo(-L * 0.4 * s, -r * 1.25 * s); ctx.lineTo(L * 0.6 * s, -r * 0.85 * s); ctx.lineTo(L * 0.6 * s, r * 0.85 * s); ctx.lineTo(-L * 0.4 * s, r * 1.25 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6f5328'; ctx.fillRect(L * 0.55 * s, -r * 1.05 * s, 0.12 * s, r * 2.1 * s);
    ctx.restore();
    // Rad
    ctx.strokeStyle = '#3e2d1e'; ctx.lineWidth = Math.max(1, 0.13 * s);
    const wr = gun.type.ballKg > 5 ? 0.75 : 0.5;
    ctx.beginPath(); ctx.arc(0, (1.25 - wr) * s * 0 + 0.5 * s, wr * s, 0, 7); ctx.stroke();
    for (let k = 0; k < 6; k++) { const aa = k * Math.PI / 3; ctx.beginPath(); ctx.moveTo(0, 0.5 * s); ctx.lineTo(Math.cos(aa) * wr * s, 0.5 * s + Math.sin(aa) * wr * s); ctx.stroke(); }
  }
  ctx.restore();
  if (selected) {
    ctx.strokeStyle = 'rgba(255,230,140,0.9)'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
    ctx.strokeRect(X(v, gun.x - 3), Y(v, gun.y + 3), 6 * s, 3.2 * s); ctx.setLineDash([]);
  }
  if (!gun.alive) {
    ctx.fillStyle = 'rgba(40,30,20,0.6)';
    ctx.font = `${Math.max(10, 1.2 * s)}px serif`; ctx.textAlign = 'center';
    ctx.fillText('✕', X(v, gun.x), Y(v, gun.y + 3));
  }
}

function garrison(ctx: CanvasRenderingContext2D, v: View, g: Game) {
  const n = g.def.men;
  const spots: [number, number][] = [];
  if (g.stage === 0) { spots.push([449, 812], [450.2, 812], [462, 800], [474, 800]); }
  spots.push([506, 822], [510, 822], [514, 822], [518, 822], [508, 808], [514, 808], [540, 800.5], [546, 806.5], [527, 801]);
  const show = Math.min(spots.length, Math.ceil(n / 4));
  for (let k = 0; k < show; k++) {
    const [x, y] = spots[k];
    if (g.w.solid(World.ci(x), World.cj(y - 0.1)) && !g.w.solid(World.ci(x), World.cj(y + 1))) person(ctx, v, x, y, '#6b5a45', '#d4a72c', g.time, -1);
  }
  if (g.stage === 1) {
    for (let k = 0; k < 6; k++) person(ctx, v, 452 + k * 4, 800, '#4a5a6e', '#3d7cc9', g.time, 1);
  }
}

export function drawScene(ctx: CanvasRenderingContext2D, v: View, g: Game, sel: Gun | null, aim: boolean) {
  ctx.save();
  ctx.beginPath(); ctx.rect(v.sx, v.sy, v.w, v.h); ctx.clip();
  backdrop(ctx, v, g);
  structures(ctx, v);
  g.w.render();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(g.w.canvas as any, 0, 0, NX, NY, X(v, 0), Y(v, Y1), W * v.s, (Y1 - Y0) * v.s);
  decorations(ctx, v, g);
  garrison(ctx, v, g);
  for (const gun of g.guns) drawGun(ctx, v, gun, g, gun === sel);
  // Einschläge des gewählten Geschützes
  if (sel) {
    for (const im of g.impacts) {
      if (im.gun !== sel.id) continue;
      const age = g.day - im.day;
      ctx.strokeStyle = age === 0 ? 'rgba(255,80,40,0.95)' : 'rgba(255,140,60,0.45)';
      ctx.lineWidth = 1.5;
      const px = X(v, im.x), py = Y(v, im.y), r = Math.max(3, 0.5 * v.s);
      ctx.beginPath(); ctx.moveTo(px - r, py - r); ctx.lineTo(px + r, py + r); ctx.moveTo(px + r, py - r); ctx.lineTo(px - r, py + r); ctx.stroke();
    }
  }
  // Zielhilfe: nur der Anfang der Bahn, wie mit dem Richtquadranten geschätzt
  if (sel && aim && sel.alive) {
    const pts = previewPath(sel, 0, sel.type.shell ? 40 : 45);
    ctx.strokeStyle = 'rgba(255,240,200,0.8)'; ctx.setLineDash([3, 4]); ctx.lineWidth = 1.5;
    ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(X(v, p.x), Y(v, p.y)) : ctx.moveTo(X(v, p.x), Y(v, p.y)));
    ctx.stroke(); ctx.setLineDash([]);
  }
  // Geschosse
  for (const p of g.projs) {
    ctx.strokeStyle = 'rgba(60,50,40,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath();
    p.trail.forEach((q, i) => i ? ctx.lineTo(X(v, q.x), Y(v, q.y)) : ctx.moveTo(X(v, q.x), Y(v, q.y)));
    ctx.stroke();
    ctx.fillStyle = '#1b1815';
    ctx.beginPath(); ctx.arc(X(v, p.x), Y(v, p.y), Math.max(1.6, p.d * v.s * 1.2), 0, 7); ctx.fill();
    if (p.shell) { ctx.fillStyle = '#ffae3c'; ctx.beginPath(); ctx.arc(X(v, p.x) + 1, Y(v, p.y) - 1, 1.2, 0, 7); ctx.fill(); }
  }
  for (const q of g.parts) {
    const f = 1 - q.life / q.max;
    if (q.kind === 'smoke' || q.kind === 'dust') {
      ctx.fillStyle = q.c; ctx.globalAlpha = 0.45 * f;
      ctx.beginPath(); ctx.arc(X(v, q.x), Y(v, q.y), q.r * v.s, 0, 7); ctx.fill();
    } else if (q.kind === 'flash') {
      ctx.fillStyle = q.c; ctx.globalAlpha = f;
      ctx.beginPath(); ctx.arc(X(v, q.x), Y(v, q.y), q.r * v.s, 0, 7); ctx.fill();
    } else {
      ctx.fillStyle = q.c; ctx.globalAlpha = 1;
      const r = Math.max(1, q.r * v.s);
      ctx.fillRect(X(v, q.x) - r / 2, Y(v, q.y) - r / 2, r, r);
    }
  }
  ctx.globalAlpha = 1;
  if (g.rain) {
    ctx.strokeStyle = 'rgba(200,210,220,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 0; k < 120; k++) {
      const x = ((k * 97.3 + g.time * 300) % v.w) + v.sx, y = ((k * 53.1 + g.time * 600) % v.h) + v.sy;
      ctx.moveTo(x, y); ctx.lineTo(x - 3 + g.wind * 0.3, y + 10);
    }
    ctx.stroke();
  }
  ctx.restore();
}
