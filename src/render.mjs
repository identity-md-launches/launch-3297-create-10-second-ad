// Procedural frame renderer for the "Super Donkey Kart of Time" 10 s ad.
// Writes raw RGB24 frames (1280x720, 30 fps, 300 frames) to stdout.
// All artwork is original and drawn from code: no game assets are used.
import fs from 'node:fs';

const W = 1280, H = 720, FPS = 30, N = 300;
const buf = Buffer.alloc(W * H * 3);
const PI = Math.PI;

// ---------- primitives ----------
const c255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);
function setp(x, y, r, g, b) {
  const i = (y * W + x) * 3;
  buf[i] = r; buf[i + 1] = g; buf[i + 2] = b;
}
function blendp(x, y, c, a) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = c255(buf[i] + (c[0] - buf[i]) * a);
  buf[i + 1] = c255(buf[i + 1] + (c[1] - buf[i + 1]) * a);
  buf[i + 2] = c255(buf[i + 2] + (c[2] - buf[i + 2]) * a);
}
function rect(x0, y0, w, h, c, a = 1) {
  const xa = Math.max(0, Math.floor(x0)), xb = Math.min(W, Math.ceil(x0 + w));
  const ya = Math.max(0, Math.floor(y0)), yb = Math.min(H, Math.ceil(y0 + h));
  for (let y = ya; y < yb; y++) for (let x = xa; x < xb; x++) blendp(x, y, c, a);
}
function ellipse(cx, cy, rx, ry, c, a = 1) {
  if (rx <= 0 || ry <= 0) return;
  const xa = Math.max(0, Math.floor(cx - rx)), xb = Math.min(W - 1, Math.ceil(cx + rx));
  const ya = Math.max(0, Math.floor(cy - ry)), yb = Math.min(H - 1, Math.ceil(cy + ry));
  for (let y = ya; y <= yb; y++) {
    const dy = (y + 0.5 - cy) / ry;
    for (let x = xa; x <= xb; x++) {
      const dx = (x + 0.5 - cx) / rx;
      const d = dx * dx + dy * dy;
      if (d <= 1) {
        // 1px soft edge
        const edge = Math.min(1, (1 - Math.sqrt(d)) * Math.min(rx, ry));
        blendp(x, y, c, a * edge);
      }
    }
  }
}
const circle = (cx, cy, r, c, a = 1) => ellipse(cx, cy, r, r, c, a);
function tri(ax, ay, bx, by, cx, cy, c, a = 1) {
  const xa = Math.max(0, Math.floor(Math.min(ax, bx, cx))), xb = Math.min(W - 1, Math.ceil(Math.max(ax, bx, cx)));
  const ya = Math.max(0, Math.floor(Math.min(ay, by, cy))), yb = Math.min(H - 1, Math.ceil(Math.max(ay, by, cy)));
  const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  if (area === 0) return;
  const s = area > 0 ? 1 : -1;
  for (let y = ya; y <= yb; y++) {
    const py = y + 0.5;
    for (let x = xa; x <= xb; x++) {
      const px = x + 0.5;
      const w0 = ((bx - ax) * (py - ay) - (by - ay) * (px - ax)) * s;
      const w1 = ((cx - bx) * (py - by) - (cy - by) * (px - bx)) * s;
      const w2 = ((ax - cx) * (py - cy) - (ay - cy) * (px - cx)) * s;
      if (w0 >= 0 && w1 >= 0 && w2 >= 0) blendp(x, y, c, a);
    }
  }
}
function poly(pts, c, a = 1) {
  for (let i = 1; i < pts.length - 1; i++) tri(pts[0][0], pts[0][1], pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], c, a);
}
function line(x1, y1, x2, y2, w, c, a = 1) {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
  const nx = (-dy / L) * w / 2, ny = (dx / L) * w / 2;
  poly([[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]], c, a);
}
function star(cx, cy, R, r, rot, c, a = 1) {
  const pts = [];
  for (let k = 0; k < 10; k++) {
    const ang = rot - PI / 2 + (k * PI) / 5, rr = k % 2 ? r : R;
    pts.push([cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr]);
  }
  for (let k = 0; k < 10; k++) tri(cx, cy, pts[k][0], pts[k][1], pts[(k + 1) % 10][0], pts[(k + 1) % 10][1], c, a);
}
function rowGradient(y0, y1, cTop, cBot) {
  for (let y = Math.max(0, y0); y < Math.min(H, y1); y++) {
    const k = (y - y0) / Math.max(1, y1 - y0);
    const r = c255(cTop[0] + (cBot[0] - cTop[0]) * k), g = c255(cTop[1] + (cBot[1] - cTop[1]) * k), b = c255(cTop[2] + (cBot[2] - cTop[2]) * k);
    for (let x = 0; x < W; x++) setp(x, y, r, g, b);
  }
}
function prng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
function coin(x, y, rad, spin) {
  const sx = Math.max(0.15, Math.abs(Math.cos(spin)));
  ellipse(x, y, rad * sx, rad, [170, 110, 10]);
  ellipse(x, y, rad * sx * 0.86, rad * 0.86, [255, 200, 40]);
  ellipse(x - rad * sx * 0.2, y - rad * 0.25, rad * sx * 0.3, rad * 0.35, [255, 245, 170], 0.8);
}
function sparkle(x, y, s, a) {
  line(x - s, y, x + s, y, Math.max(2, s / 6), [255, 255, 255], a);
  line(x, y - s, x, y + s, Math.max(2, s / 6), [255, 255, 255], a);
  circle(x, y, s / 4, [255, 250, 200], a);
}

// The hero: an original ape adventurer in a green pointed cap and red scarf.
function heroBack(kx, ky, t) {
  ellipse(kx, ky - 70, 62, 46, [110, 60, 30]); // shoulders
  circle(kx, ky - 135, 50, [120, 66, 34]); // head (back view)
  circle(kx - 52, ky - 135, 16, [205, 150, 100]);
  circle(kx + 52, ky - 135, 16, [205, 150, 100]);
  const flap = Math.sin(t * 22) * 10;
  tri(kx - 54, ky - 150, kx + 54, ky - 150, kx - 40 + flap, ky - 250, [40, 165, 60]); // cap
  rect(kx - 55, ky - 160, 110, 16, [25, 120, 45]);
  const w = Math.sin(t * 26) * 14;
  tri(kx - 20, ky - 105, kx - 140, ky - 135 + w, kx - 120, ky - 90 - w, [220, 40, 40]); // scarf
}
function heroSide(cx, jy, t, air) {
  const legSwing = air ? 0.6 : Math.sin(t * 20) * 0.6;
  line(cx - 12, jy - 30, cx - 12 - Math.sin(legSwing) * 20, jy - 2, 16, [95, 50, 25]);
  line(cx + 12, jy - 30, cx + 12 + Math.sin(legSwing) * 20, jy - 2, 16, [95, 50, 25]);
  ellipse(cx, jy - 62, 42, 48, [115, 62, 32]);
  ellipse(cx + 14, jy - 58, 24, 32, [215, 165, 115]);
  const armA = air ? -1.2 : 0.9 + Math.sin(t * 20) * 0.5;
  line(cx + 20, jy - 90, cx + 20 + Math.cos(armA) * 52, jy - 90 + Math.sin(armA) * 52, 16, [110, 60, 30]);
  circle(cx + 18, jy - 128, 36, [120, 66, 34]);
  ellipse(cx + 42, jy - 118, 22, 16, [215, 165, 115]);
  circle(cx + 30, jy - 136, 8, [255, 255, 255]);
  circle(cx + 33, jy - 136, 4, [20, 20, 20]);
  const flap = Math.sin(t * 16) * 8;
  tri(cx - 14, jy - 150, cx + 50, jy - 156, cx - 70, jy - 178 + flap, [40, 165, 60]);
  rect(cx - 14, jy - 160, 62, 12, [25, 120, 45]);
  tri(cx - 6, jy - 100, cx - 70, jy - 112 + flap, cx - 60, jy - 88 - flap, [220, 40, 40]);
}

// ---------- scene 1: kart race on a sunset track ----------
function scene1(t) {
  const hy = 290;
  rowGradient(0, hy, [42, 20, 95], [255, 140, 60]);
  circle(640, hy - 10, 150, [255, 190, 110], 0.25);
  circle(640, hy - 10, 105, [255, 215, 130]);
  const curve = Math.sin(t * 1.3 + 0.5) * 0.8;
  // mountains
  for (let x = 0; x < W; x++) {
    const xx = x + curve * 90;
    const mh = 55 + 30 * Math.sin(xx * 0.01 + 1) + 22 * Math.sin(xx * 0.023 + 2);
    for (let y = Math.floor(hy - mh); y < hy; y++) blendp(x, y, [105, 45, 115], 1);
  }
  // floating castle with clock tower
  const x0 = 640 - curve * 140, by = hy - 40 + Math.sin(t * 2) * 4;
  const dark = [70, 32, 92];
  rect(x0 - 140, by - 80, 280, 80, dark);
  rect(x0 - 175, by - 125, 50, 125, dark); tri(x0 - 185, by - 125, x0 - 115, by - 125, x0 - 150, by - 175, [150, 40, 60]);
  rect(x0 + 125, by - 125, 50, 125, dark); tri(x0 + 115, by - 125, x0 + 185, by - 125, x0 + 150, by - 175, [150, 40, 60]);
  rect(x0 - 32, by - 200, 64, 120, dark); tri(x0 - 44, by - 200, x0 + 44, by - 200, x0, by - 265, [150, 40, 60]);
  circle(x0, by - 160, 24, [250, 235, 200]);
  const ha = -t * 5, ma = -t * 14;
  line(x0, by - 160, x0 + Math.cos(ha) * 13, by - 160 + Math.sin(ha) * 13, 4, [40, 20, 20]);
  line(x0, by - 160, x0 + Math.cos(ma) * 20, by - 160 + Math.sin(ma) * 20, 3, [40, 20, 20]);
  tri(x0 - 150, by, x0 + 150, by, x0, by + 45, [90, 45, 85]); // floating rock
  // road + ground
  const speed = 70;
  for (let y = hy; y < H; y++) {
    const dy = y - hy + 1, z = 3000 / dy, p = (H - y) / (H - hy);
    const center = 640 + curve * 330 * p * p, hw = 30 + (dy / (H - hy)) * 760;
    const seg = Math.floor((z + speed * t) / 6) & 1;
    const fog = Math.max(0, 1 - dy / 70);
    for (let x = 0; x < W; x++) {
      const d = Math.abs(x - center) / hw;
      let r, g, b;
      if (d < 1) {
        if (d < 0.025 && seg) { r = 255; g = 245; b = 220; }
        else {
          r = seg ? 78 : 88; g = seg ? 66 : 76; b = seg ? 100 : 112;
          const glow = Math.max(0, (d - 0.85) / 0.15);
          r += (60) * glow; g += (200) * glow; b += (200) * glow;
        }
      } else if (d < 1.12) {
        if (seg) { r = 230; g = 40; b = 50; } else { r = 250; g = 250; b = 250; }
      } else {
        if (seg) { r = 62; g = 172; b = 62; } else { r = 46; g = 148; b = 52; }
      }
      r += (230 - r) * fog; g += (130 - g) * fog; b += (80 - b) * fog;
      setp(x, y, c255(r), c255(g), c255(b));
    }
  }
  // coins & time crystals approaching
  const objs = [];
  for (let i = 0; i < 24; i++) {
    const z = ((((i * 12 - speed * t) % 288) + 288) % 288) + 6;
    objs.push({ i, z, u: Math.sin(i * 1.7) * 0.6, gem: i % 6 === 3 });
  }
  objs.sort((a, b) => b.z - a.z);
  for (const o of objs) {
    const dy = 3000 / o.z;
    if (dy >= H - hy) continue;
    const y = hy + dy, p = (H - y) / (H - hy);
    const center = 640 + curve * 330 * p * p, hw = 30 + (dy / (H - hy)) * 760;
    const x = center + o.u * hw, rad = hw * 0.07;
    if (rad < 1.5) continue;
    if (o.gem) {
      const s = rad * 1.4, sp = Math.abs(Math.cos(t * 4 + o.i)) * 0.7 + 0.3;
      poly([[x, y - 3 * s], [x + s * sp, y - 1.8 * s], [x, y - 0.6 * s], [x - s * sp, y - 1.8 * s]], [60, 230, 255]);
      tri(x, y - 3 * s, x + s * sp, y - 1.8 * s, x, y - 1.8 * s, [200, 250, 255], 0.8);
    } else coin(x, y - rad * 1.6, rad, t * 6 + o.i);
  }
  // kart
  const kx = 640 + Math.sin(t * 3) * 30 - curve * 50, ky = 625;
  ellipse(kx, ky + 58, 190, 22, [0, 0, 0], 0.35);
  for (const wx of [kx - 175, kx + 115]) {
    rect(wx, ky - 10, 60, 72, [25, 25, 28]);
    for (let k = 0; k < 4; k++) rect(wx, ky - 10 + ((k * 18 + t * 400) % 72), 60, 5, [60, 60, 66]);
  }
  poly([[kx - 125, ky + 30], [kx + 125, ky + 30], [kx + 95, ky - 40], [kx - 95, ky - 40]], [220, 40, 40]);
  rect(kx - 110, ky + 5, 220, 10, [255, 210, 40]);
  rect(kx - 125, ky + 30, 250, 18, [60, 20, 30]);
  for (const ex of [kx - 60, kx + 60]) {
    circle(ex, ky + 38, 13, [150, 150, 160]);
    circle(ex, ky + 38, 7, [40, 40, 40]);
    const fl = 0.7 + 0.3 * Math.sin(t * 60 + ex);
    ellipse(ex, ky + 60, 12 * fl, 20 * fl, [255, 150, 30], 0.85);
    ellipse(ex, ky + 56, 6 * fl, 11 * fl, [255, 240, 150], 0.9);
  }
  heroBack(kx, ky - 15, t);
  // speed streaks
  const rnd = prng(Math.floor(t * 30) + 7);
  for (let k = 0; k < 10; k++) {
    const side = k % 2 ? 1 : -1, yy = 330 + rnd() * 380, x1 = 640 + side * (420 + rnd() * 200);
    line(x1, yy, x1 + side * 140, yy + 30, 3, [255, 255, 255], 0.5);
  }
}

// ---------- scene 2: jungle platforming ----------
function scene2(t) {
  const cam = t * 380;
  rowGradient(0, H, [100, 185, 255], [205, 238, 255]);
  for (let i = 0; i < 7; i++) {
    const cx = ((((i * 260 - cam * 0.15) % 1820) + 1820) % 1820) - 200, cy = 70 + (i % 3) * 45;
    ellipse(cx, cy, 70, 26, [255, 255, 255]); ellipse(cx + 40, cy - 14, 44, 24, [255, 255, 255]); ellipse(cx - 38, cy - 8, 36, 20, [255, 255, 255]);
  }
  for (let x = 0; x < W; x++) {
    const xx = x + cam * 0.3;
    const h = 150 + 45 * Math.sin(xx * 0.008) + 25 * Math.sin(xx * 0.021 + 1);
    for (let y = Math.floor(600 - h); y < 600; y++) setp(x, y, 88, 168, 110);
  }
  for (let i = 0; i < 8; i++) {
    const tx = ((((i * 210 + 60 - cam * 0.6) % 1680) + 1680) % 1680) - 200, ty = 330 + (i % 3) * 25;
    rect(tx - 12, ty, 24, 600 - ty, [100, 70, 40]);
    for (let k = 0; k < 6; k++) {
      const a = -PI + (k * PI) / 5 + Math.sin(t * 2 + i) * 0.05;
      tri(tx, ty - 6, tx + Math.cos(a) * 110, ty + Math.sin(a) * 60 + 30, tx + Math.cos(a + 0.35) * 90, ty + Math.sin(a + 0.35) * 50 + 30, [28, 118, 52]);
    }
  }
  for (let y = 600; y < H; y++) for (let x = 0; x < W; x++) {
    const gx = x + cam;
    if (y < 600 + 18 + 5 * Math.sin(gx * 0.05)) setp(x, y, 72, 192, 72);
    else (((Math.floor(gx / 40) + Math.floor(y / 40)) & 1) ? setp(x, y, 152, 96, 50) : setp(x, y, 132, 80, 40));
  }
  const plats = [[520, 430], [960, 370], [1400, 440], [1850, 380]];
  for (const [wx, wy] of plats) {
    const sx = wx - cam;
    rect(sx - 90, wy, 180, 34, [180, 100, 45]);
    rect(sx - 90, wy, 180, 8, [240, 175, 85]);
    for (let k = 1; k < 4; k++) rect(sx - 90 + k * 45, wy + 8, 3, 26, [120, 65, 30]);
  }
  star(960 - cam, 315, 34, 15, t * 3, [255, 255, 255]);
  star(960 - cam, 315, 28, 12, t * 3, [255, 210, 30]);
  // bananas collected as the hero passes them
  const hx = 420;
  for (let i = 0; i < 8; i++) {
    const wx = 600 + i * 160, by = 330 - 50 * Math.sin(i * 1.3), sx = wx - cam;
    if (sx < hx + 30) {
      const age = (hx + 30 - sx) / 380;
      if (age < 0.35) sparkle(sx, by, 20 + age * 60, 1 - age / 0.35);
      continue;
    }
    for (let k = 0; k <= 12; k++) {
      const a = -1 + (k / 12) * 2;
      circle(sx + 26 * Math.sin(a), by + 26 * Math.cos(a) - 26, 8 * (1 - Math.abs(a) * 0.55), [250, 222, 50]);
    }
    circle(sx + 26 * Math.sin(-1), by + 26 * Math.cos(-1) - 26, 3, [90, 60, 20]);
  }
  const period = 0.625, ph = (t % period) / period;
  const jy = 600 - 240 * 4 * ph * (1 - ph);
  ellipse(hx + 10, 606, 46 * (1 - 0.5 * 4 * ph * (1 - ph)), 8, [0, 0, 0], 0.3);
  heroSide(hx, jy, t, ph > 0.08 && ph < 0.92);
}

// ---------- scene 3: time vortex ----------
function scene3(t) {
  for (let y = 0; y < H; y++) {
    const dy = y - 360;
    for (let x = 0; x < W; x++) {
      const dx = x - 640, r = Math.sqrt(dx * dx + dy * dy), a = Math.atan2(dy, dx);
      const v = 0.5 + 0.5 * Math.sin(a * 5 + 1400 / (r + 80) - t * 7);
      const v2 = 0.5 + 0.5 * Math.sin(a * 3 - 900 / (r + 60) + t * 4);
      const vig = Math.max(0.25, 1 - r / 900);
      setp(x, y, c255((22 + 90 * v2 + 30 * v) * vig), c255((10 + 190 * v * 0.8) * vig), c255((70 + 150 * v) * vig));
    }
  }
  const rnd = prng(42);
  for (let k = 0; k < 90; k++) {
    const x = rnd() * W, y = rnd() * H, tw = 0.5 + 0.5 * Math.sin(t * 9 + k);
    circle(x, y, 1.5 + tw * 2, [255, 255, 255], tw);
  }
  const s = Math.min(1, 0.55 + t * 1.2);
  const cx = 640, cy = 360;
  circle(cx, cy, 205 * s, [255, 220, 120], 0.25);
  circle(cx, cy, 190 * s, [225, 180, 70]);
  circle(cx, cy, 172 * s, [250, 241, 216]);
  circle(cx, cy, 120 * s, [236, 224, 190]);
  for (let h = 0; h < 12; h++) {
    const a = (h * PI) / 6;
    line(cx + Math.cos(a) * 148 * s, cy + Math.sin(a) * 148 * s, cx + Math.cos(a) * 166 * s, cy + Math.sin(a) * 166 * s, h % 3 ? 5 : 10, [60, 40, 30]);
  }
  const ha = -t * 4 - PI / 2, ma = -t * 22 - PI / 2;
  line(cx, cy, cx + Math.cos(ha) * 95 * s, cy + Math.sin(ha) * 95 * s, 13, [50, 30, 25]);
  line(cx, cy, cx + Math.cos(ma) * 145 * s, cy + Math.sin(ma) * 145 * s, 7, [50, 30, 25]);
  circle(cx, cy, 12, [200, 40, 40]);
  // orbiting music notes
  for (let i = 0; i < 7; i++) {
    const a = (i * 2 * PI) / 7 + t * 1.4, rr = 290 + 25 * Math.sin(t * 3 + i);
    const nx = cx + Math.cos(a) * rr * 1.45, ny = cy + Math.sin(a) * rr * 0.95;
    const col = i % 2 ? [255, 215, 60] : [120, 255, 230];
    circle(nx, ny, 26, col, 0.25);
    ellipse(nx, ny, 15, 11, col);
    rect(nx + 11, ny - 46, 5, 46, col);
    tri(nx + 16, ny - 46, nx + 34, ny - 30, nx + 16, ny - 32, col);
  }
}

// ---------- scene 4: title card background ----------
function scene4(t) {
  const cx = 640, cy = 300;
  for (let y = 0; y < H; y++) {
    const dy = y - cy;
    for (let x = 0; x < W; x++) {
      const dx = x - cx, r = Math.sqrt(dx * dx + dy * dy);
      const a = Math.atan2(dy, dx) + PI + t * 0.6;
      const band = Math.floor(a / (PI / 12)) & 1;
      const f = Math.max(0.35, 1 - r / 1000);
      if (band) setp(x, y, c255(255 * f), c255(172 * f), c255(30 * f));
      else setp(x, y, c255(230 * f), c255(95 * f), c255(25 * f));
    }
  }
  rect(0, 95, W, 450, [20, 10, 40], 0.45);
  for (let i = 0; i < 8; i++) {
    const a = (i * PI) / 4 + t * 0.8, x = cx + Math.cos(a) * 560, y = 330 + Math.sin(a) * 250;
    if (i % 2) coin(x, y, 26, t * 6 + i); else { star(x, y, 30, 13, t * 2 + i, [255, 255, 255]); star(x, y, 25, 11, t * 2 + i, [255, 220, 40]); }
  }
  for (let y = 660; y < H; y++) for (let x = 0; x < W; x++) {
    const on = (Math.floor((x + t * 300) / 40) + Math.floor((y - 660) / 30)) & 1;
    setp(x, y, on ? 20 : 245, on ? 20 : 245, on ? 20 : 245);
  }
}

// ---------- main loop ----------
function writeAll(b) {
  let off = 0;
  while (off < b.length) {
    try { off += fs.writeSync(1, b, off, b.length - off); }
    catch (e) { if (e.code !== 'EAGAIN') throw e; }
  }
}
const cuts = [75, 150, 225];
for (let f = 0; f < N; f++) {
  const t = f / FPS;
  if (f < 75) scene1(t);
  else if (f < 150) scene2(t - 2.5);
  else if (f < 225) scene3(t - 5);
  else scene4(t - 7.5);
  for (const c of cuts) {
    const d = f - c;
    if (d >= 0 && d < 8) {
      const a = (1 - d / 8) * 0.9;
      for (let i = 0; i < buf.length; i++) buf[i] = c255(buf[i] + (255 - buf[i]) * a);
    }
  }
  if (f < 6) { const a = f / 6; for (let i = 0; i < buf.length; i++) buf[i] = (buf[i] * a) | 0; }
  writeAll(buf);
}
