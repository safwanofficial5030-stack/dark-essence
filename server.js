// DARK ESSENCE — zero-dependency Node 22+ server (node:sqlite, no npm install needed)
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');
try { for (const l of fs.readFileSync('.env', 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); } } catch {}
const E = process.env, PORT = +E.PORT || 3000, PUB = path.join(__dirname, 'public'), UP = path.join(__dirname, 'data', 'uploads');
fs.mkdirSync(UP, { recursive: true });
const SECRET = E.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const db = new DatabaseSync(path.join(__dirname, 'data', 'store.db'));
db.exec(`CREATE TABLE IF NOT EXISTS products(slug TEXT PRIMARY KEY, data TEXT);
CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY, data TEXT, created INTEGER);
CREATE TABLE IF NOT EXISTS coupons(code TEXT PRIMARY KEY, data TEXT);
CREATE TABLE IF NOT EXISTS reviews(id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT, data TEXT);
CREATE TABLE IF NOT EXISTS settings(k TEXT PRIMARY KEY, v TEXT);`);
const J = (s) => JSON.parse(s), S = JSON.stringify;
const getSet = (k, d) => { const r = db.prepare('SELECT v FROM settings WHERE k=?').get(k); return r ? J(r.v) : d; };
const setSet = (k, v) => db.prepare('INSERT OR REPLACE INTO settings VALUES(?,?)').run(k, S(v));
const allP = () => db.prepare('SELECT data FROM products').all().map((r) => J(r.data));
const getP = (s) => { const r = db.prepare('SELECT data FROM products WHERE slug=?').get(s); return r && J(r.data); };
const putP = (p) => db.prepare('INSERT OR REPLACE INTO products VALUES(?,?)').run(p.slug, S(p));
const getO = (id) => { const r = db.prepare('SELECT data FROM orders WHERE id=?').get(id); return r && J(r.data); };
const putO = (o) => db.prepare('INSERT OR REPLACE INTO orders VALUES(?,?,?)').run(o.id, S(o), o.created);

// ---- Seed: only facts readable in the supplied advertisement images. Stock is a PLACEHOLDER: edit in admin.
if (!allP().length) {
  const base = { category: 'perfume', price: 999, mrp: 1999, stock: 20, available: true, featured: true, bestseller: false, isNew: false, limited: false, variants: [] };
  const P = [
    { slug: 'tiger-blue', name: 'Tiger Blue', img: '/img/tiger-blue.jpg', ad: '/img/tiger-blue-ad.jpg', type: 'Pour Homme · Eau de Toilette', size: '100 ml', tagline: 'Fresh. Dynamic. Fearless.', desc: 'A powerful blend for the man who leads with strength and confidence.', features: ['Fresh Aroma', 'Long Lasting', 'Made for Men'] },
    { slug: 'oud-arabia', name: 'Oud Arabia', img: '/img/oud-arabia.jpg', ad: '/img/oud-arabia-ad.jpg', type: 'Eau de Parfum', size: '100 ml', tagline: 'Rich. Warm. Timeless.', desc: 'A deep and opulent oud fragrance that embodies tradition and luxury.', features: ['Premium Ingredients', 'Long Lasting', 'Luxurious Scent'] },
    { slug: 'song', name: 'Song', img: '/img/song.jpg', ad: '/img/song-ad.jpg', type: 'Eau de Parfum', size: '50 ml', tagline: '', desc: 'A captivating fragrance that reflects beauty, confidence and elegance.', features: ['Premium Quality', 'Long Lasting', 'Elegant Fragrance'] },
    { slug: 'psz', name: 'PSZ', img: '/img/psz.jpg', ad: '/img/psz-ad.jpg', type: 'Eau de Parfum', size: '40 ml', tagline: 'Bold. Intense. Unstoppable.', desc: 'A striking fragrance for those who dare to stand out.', features: ['Bold Scent', 'Long Lasting', 'Perfect for Day & Night'] },
    { slug: 'marj', name: 'Marj', img: '/img/marj.jpg', ad: '/img/marj-ad.jpg', type: 'Eau de Parfum', size: '', tagline: 'Bold. Deep. Magnetic.', desc: 'A rich and captivating fragrance that leaves a trail of mystery and elegance.', features: ['Premium Ingredients', 'Long Lasting', 'Luxury Scent', 'Perfect for You'] },
    { slug: 'brut-ums-prestige', name: 'Brut UMS Prestige', img: '/img/brut-ums-prestige.jpg', ad: '/img/brut-ums-prestige-ad.jpg', type: 'Eau de Toilette', size: '', tagline: 'Classic. Powerful. Iconic.', desc: 'A legendary scent for the modern man with a timeless presence.', features: ['Iconic Fragrance', 'Long Lasting', 'Classic Appeal'] },
  ].map((p) => ({ ...base, ...p }));
  P.push({ ...base, slug: 'aero-fresh-air-freshener', name: 'Aero Fresh Air Freshener', category: 'air-freshener', price: 400, mrp: 1499, img: '/img/aero-all.jpg', ad: '/img/aero-all.jpg', type: 'Air Freshener Collection', size: '', tagline: '', desc: 'Choose from three signature room fragrances.', features: ['Premium Ingredients', 'Long Lasting', 'Luxury Scent', 'Perfect for You'],
    variants: [{ id: 'lavender', name: 'Dr Dann Lavender', img: '/img/aero-lavender.jpg', desc: 'Infused with pure lavender essence for a calming aroma.' }, { id: 'poppy-white-london', name: 'Poppy White London', img: '/img/aero-poppy.jpg', desc: 'A clean, invigorating scent of a London fresh rain.' }, { id: 'classic', name: 'Dr Dann Classic', img: '/img/aero-classic.jpg', desc: 'A timeless and elegant signature fresh scent.' }] });
  P.forEach(putP);
}
if (getSet('delivery', null) === null) setSet('delivery', { charge: 0, pincodes: [] }); // charge 0 = none configured

// ---- helpers
const body = (req, max = 8e6) => new Promise((ok, no) => { let b = '', n = 0; req.on('data', (c) => { n += c.length; if (n > max) { no(new Error('too large')); req.destroy(); } else b += c; }); req.on('end', () => { try { ok(b ? J(b) : {}); } catch { no(new Error('bad json')); } }); });
const send = (res, code, obj, h = {}) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...h }); res.end(S(obj)); };
const sign = (v) => crypto.createHmac('sha256', SECRET).update(v).digest('hex');
const safeEq = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const isAdmin = (req) => { const m = (req.headers.cookie || '').match(/adm=(\d+)\.([a-f0-9]+)/); return !!m && +m[1] > Date.now() && safeEq(sign(m[1]), m[2]); };
const tries = new Map();
const clean = (s, n = 200) => String(s ?? '').replace(/[<>]/g, '').trim().slice(0, n);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pubP = (p) => p; // all product fields are public by design
const SITE = () => E.SITE_URL || `http://localhost:${PORT}`;

function priceCart(items, code) {
  const lines = []; let sub = 0;
  for (const it of items || []) {
    const p = getP(it.slug); const q = Math.max(1, Math.min(10, +it.qty | 0));
    if (!p || !p.available) throw new Error(`${it.slug} is unavailable`);
    let v = null; if (p.variants.length) { v = p.variants.find((x) => x.id === it.variant); if (!v) throw new Error(`Please choose a fragrance for ${p.name}`); }
    if (p.stock < q) throw new Error(`${p.name} has only ${p.stock} in stock`);
    lines.push({ slug: p.slug, name: p.name, variant: v && v.id, variantName: v && v.name, qty: q, price: p.price, mrp: p.mrp }); sub += p.price * q;
  }
  if (!lines.length) throw new Error('Cart is empty');
  let discount = 0, coupon = null;
  if (code) { const r = db.prepare('SELECT data FROM coupons WHERE code=?').get(clean(code).toUpperCase()); const c = r && J(r.data);
    if (!c || !c.active) throw new Error('Invalid or inactive coupon'); if (sub < (c.min || 0)) throw new Error(`Coupon needs a minimum order of ₹${c.min}`);
    discount = Math.min(sub, c.type === 'percent' ? Math.round((sub * c.value) / 100) : c.value); coupon = c.code; }
  const delivery = getSet('delivery', { charge: 0 }).charge || 0;
  return { lines, subtotal: sub, discount, coupon, delivery, total: sub - discount + delivery };
}
const waText = (o) => `*DARK ESSENCE order request*\nOrder ID: ${o.id}\nName: ${o.customer.name}\n` + o.lines.map((l) => `• ${l.name}${l.variantName ? ' (' + l.variantName + ')' : ''} × ${l.qty}`).join('\n') + `\nTotal: ₹${o.total}\nPayment: ${o.payment.method.toUpperCase()}\nAddress: ${o.customer.address}, ${o.customer.city}, ${o.customer.state} ${o.customer.pin}`;
const rzp = async (p, method = 'GET', data) => { const r = await fetch('https://api.razorpay.com/v1' + p, { method, headers: { Authorization: 'Basic ' + Buffer.from(E.RAZORPAY_KEY_ID + ':' + E.RAZORPAY_KEY_SECRET).toString('base64'), 'Content-Type': 'application/json' }, body: data && S(data) }); const j = await r.json(); if (!r.ok) throw new Error(j.error?.description || 'Gateway error'); return j; };
const adjustStock = (o, dir) => o.lines.forEach((l) => { const p = getP(l.slug); if (p) { p.stock = Math.max(0, p.stock + dir * l.qty); putP(p); } });

async function api(req, res, u) {
  const m = req.method, r = u.pathname, q = u.searchParams;
  if (r === '/api/config') return send(res, 200, { online: !!(E.RAZORPAY_KEY_ID && E.RAZORPAY_KEY_SECRET), keyId: E.RAZORPAY_KEY_ID || null, whatsapp: E.WHATSAPP_NUMBER || '919768285613', phone: '+91 9768285613', email: 'safwanofficial5030@gmail.com', instagram: E.INSTAGRAM_URL || '', delivery: getSet('delivery', {}).charge || 0 });
  if (r === '/api/products') { const sold = {}; db.prepare('SELECT data FROM orders').all().forEach((x) => { const o = J(x.data); if (o.status !== 'Cancelled') o.lines.forEach((l) => (sold[l.slug] = (sold[l.slug] || 0) + l.qty)); }); return send(res, 200, allP().map((p) => ({ ...pubP(p), sold: sold[p.slug] || 0 }))); }
  if (r.startsWith('/api/product/')) { const p = getP(r.slice(13)); return p ? send(res, 200, { ...p, reviews: db.prepare('SELECT data FROM reviews WHERE slug=?').all(p.slug).map((x) => J(x.data)) }) : send(res, 404, { error: 'Not found' }); }
  if (r === '/api/pincode') { const d = getSet('delivery', { pincodes: [] }), pin = clean(q.get('pin'), 6); if (!/^[1-9]\d{5}$/.test(pin)) return send(res, 400, { ok: false, msg: 'Enter a valid 6-digit PIN code' });
    return send(res, 200, d.pincodes.length ? (d.pincodes.includes(pin) ? { ok: true, msg: 'Delivery is available to this PIN code' } : { ok: false, msg: 'We do not currently deliver to this PIN code' }) : { ok: true, msg: 'PIN code accepted. Delivery availability is confirmed when your order is processed' }); }
  if (r === '/api/coupon' && m === 'POST') { const b = await body(req); try { return send(res, 200, priceCart(b.items, b.code)); } catch (e) { return send(res, 400, { error: e.message }); } }
  if (r === '/api/order' && m === 'POST') {
    const b = await body(req), c = b.customer || {};
    const cu = { name: clean(c.name, 80), phone: clean(c.phone, 15).replace(/\D/g, '').slice(-10), email: clean(c.email, 100), address: clean(c.address, 300), city: clean(c.city, 60), state: clean(c.state, 60), pin: clean(c.pin, 6) };
    if (!cu.name || !/^[6-9]\d{9}$/.test(cu.phone) || !cu.address || !cu.city || !cu.state || !/^[1-9]\d{5}$/.test(cu.pin)) return send(res, 400, { error: 'Please complete name, valid 10-digit mobile, address, city, state and 6-digit PIN code' });
    let t; try { t = priceCart(b.items, b.coupon); } catch (e) { return send(res, 400, { error: e.message }); }
    const dl = getSet('delivery', { pincodes: [] }); if (dl.pincodes.length && !dl.pincodes.includes(cu.pin)) return send(res, 400, { error: 'We do not currently deliver to this PIN code' });
    const method = b.method === 'online' ? 'online' : 'cod';
    if (method === 'online' && !(E.RAZORPAY_KEY_ID && E.RAZORPAY_KEY_SECRET)) return send(res, 400, { error: 'Online payment is not configured yet. Please choose Cash on Delivery.' });
    const o = { id: 'DE' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString('hex').toUpperCase(), created: Date.now(), customer: cu, ...t, status: 'Pending', payment: { method, status: 'unpaid' }, history: [{ s: 'Pending', t: Date.now() }] };
    let gw = null;
    if (method === 'online') { try { const g = await rzp('/orders', 'POST', { amount: t.total * 100, currency: 'INR', receipt: o.id }); o.payment.gatewayOrderId = g.id; gw = { orderId: g.id, amount: g.amount }; } catch (e) { return send(res, 502, { error: e.message }); } }
    adjustStock(o, -1); putO(o);
    return send(res, 200, { id: o.id, total: o.total, gateway: gw, whatsapp: waText(o) });
  }
  if (r === '/api/verify' && m === 'POST') { // server-side signature verification — the ONLY way an online order becomes Paid
    const b = await body(req), o = getO(clean(b.orderId, 40));
    if (!o || o.payment.method !== 'online' || !E.RAZORPAY_KEY_SECRET) return send(res, 400, { error: 'Invalid order' });
    const sig = crypto.createHmac('sha256', E.RAZORPAY_KEY_SECRET).update(o.payment.gatewayOrderId + '|' + clean(b.paymentId, 60)).digest('hex');
    if (!safeEq(sig, clean(b.signature, 100))) return send(res, 400, { error: 'Payment verification failed' });
    o.payment = { ...o.payment, status: 'paid', paymentId: clean(b.paymentId, 60) }; o.status = 'Confirmed'; o.history.push({ s: 'Confirmed', t: Date.now() }); putO(o); return send(res, 200, { ok: true });
  }
  if (r === '/api/track' && m === 'POST') { const b = await body(req), o = getO(clean(b.id, 40).toUpperCase()); if (!o || o.customer.phone !== clean(b.phone, 15).replace(/\D/g, '').slice(-10)) return send(res, 404, { error: 'No order found for these details' }); return send(res, 200, { id: o.id, status: o.status, payment: o.payment.status, method: o.payment.method, total: o.total, lines: o.lines, history: o.history, created: o.created }); }
  if (r === '/api/reviews' && m === 'POST') { const b = await body(req), o = getO(clean(b.orderId, 40).toUpperCase()); // verified = delivered order containing the product, matched by phone
    if (!o || o.customer.phone !== clean(b.phone, 15).replace(/\D/g, '').slice(-10) || o.status !== 'Delivered' || !o.lines.some((l) => l.slug === b.slug)) return send(res, 400, { error: 'Reviews are open to customers with a delivered order of this product. Check your order ID and mobile number.' });
    if (db.prepare('SELECT 1 FROM reviews WHERE slug=? AND data LIKE ?').get(b.slug, `%"orderId":"${o.id}"%`)) return send(res, 400, { error: 'You already reviewed this product' });
    db.prepare('INSERT INTO reviews(slug,data) VALUES(?,?)').run(b.slug, S({ orderId: o.id, name: o.customer.name.split(' ')[0], rating: Math.max(1, Math.min(5, +b.rating | 0)), text: clean(b.text, 600), t: Date.now() })); return send(res, 200, { ok: true }); }

  // ---- admin
  if (r === '/api/admin/login' && m === 'POST') {
    const ip = req.socket.remoteAddress, t = tries.get(ip) || { n: 0, at: Date.now() }; if (t.n >= 5 && Date.now() - t.at < 9e5) return send(res, 429, { error: 'Too many attempts. Try later.' });
    const b = await body(req); if (!E.ADMIN_PASSWORD) return send(res, 503, { error: 'Set ADMIN_PASSWORD in .env to enable the admin dashboard' });
    if (!safeEq(sign(String(b.password || '')), sign(E.ADMIN_PASSWORD))) { tries.set(ip, { n: t.n + 1, at: Date.now() }); return send(res, 401, { error: 'Wrong password' }); }
    tries.delete(ip); const exp = String(Date.now() + 8 * 3600e3); return send(res, 200, { ok: true }, { 'Set-Cookie': `adm=${exp}.${sign(exp)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${E.NODE_ENV === 'production' ? '; Secure' : ''}` });
  }
  if (r.startsWith('/api/admin/')) {
    if (!isAdmin(req)) return send(res, 401, { error: 'Unauthorised' });
    if (r === '/api/admin/me') return send(res, 200, { ok: true });
    if (r === '/api/admin/logout') return send(res, 200, { ok: true }, { 'Set-Cookie': 'adm=; Max-Age=0; Path=/' });
    if (r === '/api/admin/stats') { const os = db.prepare('SELECT data FROM orders').all().map((x) => J(x.data)), ok = os.filter((o) => o.status !== 'Cancelled'), top = {}; ok.forEach((o) => o.lines.forEach((l) => (top[l.name] = (top[l.name] || 0) + l.qty)));
      return send(res, 200, { orders: os.length, sales: ok.reduce((a, o) => a + o.total, 0), paid: ok.filter((o) => o.payment.status === 'paid').reduce((a, o) => a + o.total, 0), top: Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 5), low: allP().filter((p) => p.stock <= 5).map((p) => ({ name: p.name, stock: p.stock })) }); }
    if (r === '/api/admin/orders') return send(res, 200, db.prepare('SELECT data FROM orders ORDER BY created DESC').all().map((x) => J(x.data)));
    if (r === '/api/admin/order' && m === 'POST') { const b = await body(req), o = getO(b.id); if (!o || !['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].includes(b.status)) return send(res, 400, { error: 'Bad request' });
      if (b.status === 'Cancelled' && o.status !== 'Cancelled') adjustStock(o, 1); if (o.status === 'Cancelled' && b.status !== 'Cancelled') adjustStock(o, -1);
      o.status = b.status; o.history.push({ s: b.status, t: Date.now() }); if (b.codPaid && o.payment.method === 'cod') o.payment.status = 'paid'; putO(o); return send(res, 200, o); }
    if (r === '/api/admin/product' && m === 'POST') { const b = await body(req), old = getP(b.slug) || {};
      const slug = clean(b.slug || b.name, 60).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); if (!slug || !clean(b.name)) return send(res, 400, { error: 'Name required' });
      const p = { ...old, slug, name: clean(b.name, 80), category: clean(b.category, 30) || 'perfume', price: Math.max(0, +b.price | 0), mrp: Math.max(0, +b.mrp | 0), stock: Math.max(0, +b.stock | 0), available: !!b.available, featured: !!b.featured, bestseller: !!b.bestseller, isNew: !!b.isNew, limited: !!b.limited, img: clean(b.img, 200) || old.img || '', ad: old.ad || clean(b.img, 200), type: clean(b.type, 80), size: clean(b.size, 30), tagline: clean(b.tagline, 80), desc: clean(b.desc, 800), features: (b.features || []).map((f) => clean(f, 60)).filter(Boolean), variants: old.variants || [] }; putP(p); return send(res, 200, p); }
    if (r === '/api/admin/product/delete' && m === 'POST') { db.prepare('DELETE FROM products WHERE slug=?').run(clean((await body(req)).slug, 60)); return send(res, 200, { ok: true }); }
    if (r === '/api/admin/upload' && m === 'POST') { const b = await body(req, 12e6), mt = String(b.data).match(/^data:image\/(png|jpeg|webp);base64,(.+)$/); if (!mt) return send(res, 400, { error: 'PNG, JPG or WEBP only' }); const f = crypto.randomBytes(8).toString('hex') + '.' + (mt[1] === 'jpeg' ? 'jpg' : mt[1]); fs.writeFileSync(path.join(UP, f), Buffer.from(mt[2], 'base64')); return send(res, 200, { url: '/uploads/' + f }); }
    if (r === '/api/admin/coupons') return send(res, 200, db.prepare('SELECT data FROM coupons').all().map((x) => J(x.data)));
    if (r === '/api/admin/coupon' && m === 'POST') { const b = await body(req), code = clean(b.code, 20).toUpperCase().replace(/[^A-Z0-9]/g, ''); if (!code) return send(res, 400, { error: 'Code required' }); const c = { code, type: b.type === 'flat' ? 'flat' : 'percent', value: Math.max(1, +b.value | 0), min: Math.max(0, +b.min | 0), active: !!b.active }; db.prepare('INSERT OR REPLACE INTO coupons VALUES(?,?)').run(code, S(c)); return send(res, 200, c); }
    if (r === '/api/admin/delivery' && m === 'POST') { const b = await body(req); const d = { charge: Math.max(0, +b.charge | 0), pincodes: String(b.pincodes || '').split(/[\s,]+/).filter((x) => /^\d{6}$/.test(x)) }; setSet('delivery', d); return send(res, 200, d); }
    if (r === '/api/admin/delivery-get') return send(res, 200, getSet('delivery', {}));
  }
  return send(res, 404, { error: 'Not found' });
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain' };
function file(res, fp, code = 200, extra = {}) { fs.readFile(fp, (e, d) => { if (e) { res.writeHead(404); return res.end('Not found'); } res.writeHead(code, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream', 'Cache-Control': /\.(jpg|png|webp)$/.test(fp) ? 'public, max-age=604800' : 'no-cache', ...extra }); res.end(d); }); }
function page(res, title, desc, img, ld, code = 200) { let h = fs.readFileSync(path.join(PUB, 'index.html'), 'utf8'); h = h.replace('<!--SEO-->', `<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${SITE()}${img}">${ld ? `<script type="application/ld+json">${S(ld).replace(/</g, '\\u003c')}</script>` : ''}`); res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' }); res.end(h); }

http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('X-Frame-Options', 'SAMEORIGIN'); res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  try {
    const u = new URL(req.url, 'http://x'), r = decodeURIComponent(u.pathname);
    if (r.startsWith('/api/')) return await api(req, res, u);
    if (r === '/robots.txt') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end(`User-agent: *\nDisallow: /admin\nDisallow: /api/\nSitemap: ${SITE()}/sitemap.xml\n`); }
    if (r === '/sitemap.xml') { res.writeHead(200, { 'Content-Type': 'application/xml' }); return res.end(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE()}/</loc></url>${allP().filter((p) => p.available).map((p) => `<url><loc>${SITE()}/product/${p.slug}</loc></url>`).join('')}</urlset>`); }
    if (r === '/admin') return file(res, path.join(PUB, 'admin.html'), 200, { 'X-Robots-Tag': 'noindex' });
    if (r.startsWith('/uploads/')) return file(res, path.join(UP, path.basename(r)));
    const fp = path.join(PUB, r); if (r !== '/' && fp.startsWith(PUB) && fs.existsSync(fp) && fs.statSync(fp).isFile() && r !== '/index.html' && r !== '/admin.html') return file(res, fp);
    const pm = r.match(/^\/product\/([a-z0-9-]+)$/);
    if (pm) { const p = getP(pm[1]); if (!p) return page(res, 'Page not found | DARK ESSENCE', 'Page not found', '/img/logo.jpg', null, 404);
      return page(res, `${p.name} | DARK ESSENCE`, `${p.name} — ${p.tagline ? p.tagline + ' ' : ''}${p.desc}`.slice(0, 200), p.img, { '@context': 'https://schema.org', '@type': 'Product', name: p.name, image: SITE() + p.img, description: p.desc, brand: { '@type': 'Brand', name: 'DARK ESSENCE' }, offers: { '@type': 'Offer', priceCurrency: 'INR', price: p.price, availability: p.available && p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: `${SITE()}/product/${p.slug}` } }); }
    if (['/', '/cart', '/checkout', '/track', '/wishlist', '/collection'].includes(r)) return page(res, 'DARK ESSENCE | Fragrance That Defines You', 'DARK ESSENCE — luxury perfumes and air fresheners from India. Fragrance that defines you.', '/img/logo.jpg', null);
    return page(res, 'Page not found | DARK ESSENCE', 'Page not found', '/img/logo.jpg', null, 404);
  } catch (e) { console.error(e); if (!res.headersSent) send(res, 500, { error: 'Something went wrong' }); }
}).listen(PORT, () => console.log(`DARK ESSENCE running on http://localhost:${PORT}  (admin: /admin ${E.ADMIN_PASSWORD ? '' : '— set ADMIN_PASSWORD in .env first'})`));
