(() => {
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const RM = matchMedia('(prefers-reduced-motion:reduce)').matches;
const inr = (n) => '₹' + Number(n).toLocaleString('en-IN');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ls = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
let P = [], CFG = {}, cart = ls.get('de_cart', []), wish = ls.get('de_wish', []), recent = ls.get('de_recent', []), orders = ls.get('de_orders', []), appliedCode = ls.get('de_code', '');
const api = async (u, o) => { const r = await fetch(u, o && { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(o) }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Request failed'); return j; };
const bySlug = (s) => P.find((p) => p.slug === s);
const toast = (m) => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2400); };
const saveCart = () => { ls.set('de_cart', cart); $('#cc').textContent = cart.reduce((a, c) => a + c.qty, 0) || ''; $('#wc').textContent = wish.length || ''; };
const price = (p) => `<div class="pr"><s>${inr(p.mrp)}</s><strong>${inr(p.price)}</strong></div>`;
const oos = (p) => !p.available || p.stock <= 0;

// ---- product card: photo, name, MRP struck, selling price ONLY
const card = (p) => `<a class="card ${oos(p) ? 'sold' : ''}" href="/product/${p.slug}" data-l data-p="${p.slug}">${oos(p) ? '<span class="tag">Sold out</span>' : p.limited ? '<span class="tag">Limited</span>' : ''}<button class="wl ${wish.includes(p.slug) ? 'on' : ''}" data-w="${p.slug}" aria-label="Wishlist">♡</button><div class="im"><img loading="lazy" src="${p.img}" alt="${esc(p.name)}"></div><div class="in"><h3 class="serif">${esc(p.name)}</h3>${price(p)}</div></a>`;
const grid = (l) => `<div class="grid">${l.map(card).join('')}</div>`;
const head = (t, s) => `<div class="sh rv"><p>${s || ''}</p><h2 class="gold">${t}</h2></div>`;

// ---- router
const go = (u, push = true) => { if (push) history.pushState({}, '', u); render(); };
document.addEventListener('click', (e) => {
  const w = e.target.closest('[data-w]'); if (w) { e.preventDefault(); const s = w.dataset.w; wish = wish.includes(s) ? wish.filter((x) => x !== s) : [...wish, s]; ls.set('de_wish', wish); saveCart(); w.classList.toggle('on'); return; }
  const a = e.target.closest('a[data-l]'); if (a && !e.metaKey && !e.ctrlKey) { e.preventDefault(); $('#nav').classList.remove('on'); const u = new URL(a.href); go(u.pathname + u.search + u.hash); }
});
addEventListener('popstate', () => render());
$('#mb').onclick = () => $('#nav').classList.toggle('on');
$('#sb').onclick = () => { const b = $('#sbox'); b.hidden = !b.hidden; if (!b.hidden) $('#q').focus(); };
$('#q').oninput = (e) => { const v = e.target.value.toLowerCase().trim(); $('#sr').innerHTML = v ? P.filter((p) => (p.name + ' ' + p.category + ' ' + p.type + ' ' + p.variants.map((x) => x.name).join(' ')).toLowerCase().includes(v)).map((p) => `<a href="/product/${p.slug}" data-l>${esc(p.name)} — ${inr(p.price)}</a>`).join('') || '<span class="err">No matches</span>' : ''; };
$('#sr').onclick = () => { $('#sbox').hidden = true; };

// ---- views
function home() {
  const perf = P.filter((p) => p.category === 'perfume'), aero = P.find((p) => p.variants.length);
  const sec = (id, t, s, l) => (l.length ? `<section id="${id}">${head(t, s)}${grid(l)}</section>` : '');
  const rv = recent.map(bySlug).filter(Boolean);
  const best = P.filter((p) => p.bestseller || 0).concat(P.filter((p) => !p.bestseller && p.sold > 0).sort((a, b) => b.sold - a.sold).slice(0, 3)).slice(0, 4);
  return `<div class="hero"><div class="hsmoke"></div><div><img class="hl" src="/img/logo.jpg" alt="DARK ESSENCE"><p>FRAGRANCE THAT DEFINES YOU</p><a class="btn" href="/#all" data-l>Explore Perfumes</a><a class="btn o" href="/#aero" data-l>Aero Fresh</a></div></div>
<section class="rv" style="text-align:center;max-width:800px"><h2 class="gold serif" style="font-size:2rem">Be Unseen. Be Remembered.</h2><p style="color:var(--mu);margin-top:14px">DARK ESSENCE is an Indian fragrance house of perfumes and air fresheners, made for those who leave a trail of presence.</p></section>
${sec('featured', 'Featured', 'Signature picks', perf.filter((p) => p.featured).slice(0, 4))}
${sec('all', 'The Perfume Collection', 'All perfumes', perf)}
${aero ? `<section id="aero">${head('Aero Fresh Collection', 'Air fresheners')}<div class="aero">${aero.variants.map((v) => `<div class="card"><div class="im"><img loading="lazy" src="${v.img}" alt="${esc(v.name)}"></div><div class="in"><h3 class="serif">${esc(v.name)}</h3>${price(aero)}<p>${esc(v.desc)}</p><button class="btn" data-av="${v.id}" ${oos(aero) ? 'disabled' : ''}>${oos(aero) ? 'Sold out' : 'Add to Cart'}</button></div></div>`).join('')}</div></section>` : ''}
${sec('best', 'Best Sellers', 'Most loved', best)}${sec('new', 'New Arrivals', 'Just landed', P.filter((p) => p.isNew))}${sec('limited', 'Limited Edition', 'While it lasts', P.filter((p) => p.limited))}${sec('recent', 'Recently Viewed', '', rv)}
<section id="story" class="story"><div class="rv"><h2 class="gold">The DARK ESSENCE Story</h2><p style="margin-top:14px">DARK ESSENCE is an Indian fragrance brand founded by Safwan Posharkar. Our promise is simple: fragrance that defines you.</p><p>Every bottle is presented the way it was meant to be seen — bold, mysterious and unforgettable.</p></div><img class="rv" loading="lazy" src="/img/marj-ad.jpg" alt="Marj by DARK ESSENCE"></section>
<section id="gallery">${head('Gallery', CFG.instagram ? 'Follow us on Instagram' : 'DARK ESSENCE')}<div class="ig">${P.slice(0, 6).map((p) => `<a ${CFG.instagram ? `href="${esc(CFG.instagram)}" target="_blank" rel="noopener"` : `href="/product/${p.slug}" data-l`}><img loading="lazy" src="${p.ad}" alt="${esc(p.name)}"></a>`).join('')}</div></section>
<section id="contact">${head('Contact', 'DARK ESSENCE · India')}<div class="contact"><div><b>Owner</b><br>Safwan Posharkar</div><div><b>Phone / WhatsApp</b><br><a href="tel:+919768285613">${CFG.phone}</a></div><div><b>Email</b><br><a href="mailto:${CFG.email}">${CFG.email}</a></div></div></section>`;
}

function product(slug) {
  const p = bySlug(slug); if (!p) return nf();
  recent = [slug, ...recent.filter((x) => x !== slug)].slice(0, 8); ls.set('de_recent', recent);
  const hasV = p.variants.length, soldout = oos(p);
  const rel = P.filter((x) => x.slug !== slug && x.category === p.category).slice(0, 4);
  return `<section class="pd"><div><div class="big" id="big"><img src="${p.ad && p.category === 'air-freshener' ? p.img : p.img}" alt="${esc(p.name)}"></div><div class="thumbs"><img src="${p.img}" alt=""><img src="${p.ad}" alt="${esc(p.name)} advertisement"></div></div>
<div><p class="gold" style="letter-spacing:.3em;font-size:.75rem">DARK ESSENCE</p><h1 class="serif gold">${esc(p.name)}</h1>${price(p)}
${p.tagline ? `<p class="serif" style="color:var(--g1);margin:12px 0">${esc(p.tagline)}</p>` : ''}<p style="color:var(--mu)">${esc(p.desc)}</p>
<div class="kv">${p.type ? `<div><span>Type</span><span>${esc(p.type)}</span></div>` : ''}${p.size ? `<div><span>Size</span><span>${esc(p.size)}</span></div>` : ''}<div><span>Availability</span><span>${soldout ? 'Sold out' : p.stock <= 5 ? `Only ${p.stock} left` : 'In stock'}</span></div></div>
${p.features.length ? `<div class="chips">${p.features.map((f) => `<span class="chip">${esc(f)}</span>`).join('')}</div>` : ''}
${hasV ? `<h3 class="serif" style="margin-top:14px">Choose your fragrance</h3><div class="vars" id="vars">${p.variants.map((v, i) => `<label><input type="radio" name="v" value="${v.id}" ${i ? '' : 'checked'}><span>${esc(v.name)}</span></label>`).join('')}</div><p id="vd" style="color:var(--mu);margin-top:8px">${esc(p.variants[0].desc)}</p>` : ''}
<div class="buy"><div class="qty"><button data-q="-1">−</button><span id="qv">1</span><button data-q="1">+</button></div><button class="btn" id="add" ${soldout ? 'disabled' : ''}>Add to Cart</button><button class="btn o" id="now" ${soldout ? 'disabled' : ''}>Buy Now</button></div>
<div style="margin-top:20px"><label style="font-size:.72rem;color:var(--g2);letter-spacing:.14em">CHECK DELIVERY</label><div style="display:flex;gap:8px;margin-top:6px"><input id="pin" inputmode="numeric" maxlength="6" placeholder="PIN code"><button class="btn o" id="pc">Check</button></div><p id="pm" style="margin-top:6px;color:var(--mu)"></p></div></div></section>
<section><h2 class="gold serif">Customer Reviews</h2><div id="revs" style="margin-top:12px"></div>
<details style="margin-top:18px"><summary style="cursor:pointer;color:var(--g1)">Write a verified review</summary><form class="f" id="rf" style="margin-top:12px"><div><label>Order ID</label><input name="orderId" required></div><div><label>Mobile used on order</label><input name="phone" required inputmode="numeric"></div><div><label>Rating</label><select name="rating"><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select></div><div class="w"><label>Review</label><textarea name="text" rows="3" required></textarea></div><div class="w"><button class="btn">Submit review</button><p class="err" id="re"></p></div></form><p style="color:var(--mu);font-size:.8rem;margin-top:6px">Only customers with a delivered order of this product can review.</p></details></section>
${rel.length ? `<section>${head('You may also like', '')}${grid(rel)}</section>` : ''}`;
}
function bindProduct(slug) {
  const p = bySlug(slug); if (!p) return; let q = 1;
  api('/api/product/' + slug).then((d) => { $('#revs').innerHTML = d.reviews.length ? d.reviews.map((r) => `<div class="rev"><span class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span> <b>${esc(r.name)}</b> <small style="color:var(--mu)">Verified buyer</small><p>${esc(r.text)}</p></div>`).join('') : '<p style="color:var(--mu)">No reviews yet.</p>'; }).catch(() => {});
  $$('[data-q]').forEach((b) => (b.onclick = () => { q = Math.max(1, Math.min(10, q + +b.dataset.q)); $('#qv').textContent = q; }));
  const vr = () => ($('#vars input:checked') || {}).value || null;
  if (p.variants.length) $$('#vars input').forEach((i) => (i.onchange = () => ($('#vd').textContent = p.variants.find((v) => v.id === vr()).desc)));
  $('#add').onclick = () => { addCart(slug, vr(), q); };
  $('#now').onclick = () => { addCart(slug, vr(), q, true); go('/checkout'); };
  $('#pc').onclick = async () => { try { const r = await api('/api/pincode?pin=' + $('#pin').value); $('#pm').textContent = r.msg; $('#pm').style.color = r.ok ? 'var(--g1)' : '#ff8a7a'; } catch (e) { $('#pm').textContent = e.message; } };
  $('#rf').onsubmit = async (e) => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); try { await api('/api/reviews', { ...f, slug }); toast('Thank you for your review'); go(location.pathname, false); } catch (x) { $('#re').textContent = x.message; } };
  const big = $('#big'); if (big && !RM && matchMedia('(hover:hover)').matches) { const im = $('img', big); big.onmousemove = (e) => { const r = big.getBoundingClientRect(); im.style.transform = `rotateY(${((e.clientX - r.left) / r.width - .5) * 10}deg) rotateX(${-((e.clientY - r.top) / r.height - .5) * 10}deg) scale(1.03)`; }; big.onmouseleave = () => (im.style.transform = ''); }
  $$('.thumbs img').forEach((t) => (t.onclick = () => ($('#big img').src = t.src)));
}
function addCart(slug, variant, qty = 1, silent) {
  const p = bySlug(slug); if (p.variants.length && !variant) return pickVariant(p, qty);
  const ex = cart.find((c) => c.slug === slug && c.variant === variant); if (ex) ex.qty = Math.min(10, ex.qty + qty); else cart.push({ slug, variant, qty }); saveCart(); if (!silent) toast(p.name + ' added to cart');
  if (!RM && window.gsap) gsap.fromTo('#cc', { scale: 1.8 }, { scale: 1, duration: .5, ease: 'back.out(3)' });
}
function pickVariant(p, qty) { // Aero: always ask which fragrance
  const m = $('#modal'); m.hidden = false; m.innerHTML = `<div><h3 class="serif gold">Which fragrance would you like?</h3><div class="vars" style="flex-direction:column;margin:16px 0">${p.variants.map((v, i) => `<label><input type="radio" name="mv" value="${v.id}" ${i ? '' : 'checked'}><span>${esc(v.name)}</span><small style="display:block;color:var(--mu)">${esc(v.desc)}</small></label>`).join('')}</div><button class="btn" id="mok">Add to Cart</button> <button class="btn o" id="mno">Cancel</button></div>`;
  $('#mno').onclick = () => (m.hidden = true); $('#mok').onclick = () => { addCart(p.slug, $('input[name=mv]:checked', m).value, qty); m.hidden = true; };
}
function cartView() {
  if (!cart.length) return `<section class="cart"><h1 class="gold serif">Your Cart</h1><p style="margin:20px 0;color:var(--mu)">Your cart is empty.</p><a class="btn" href="/#all" data-l>Shop perfumes</a></section>`;
  const t = cart.map((c) => { const p = bySlug(c.slug); return p && { c, p, v: p.variants.find((v) => v.id === c.variant) }; }).filter(Boolean);
  const sub = t.reduce((a, x) => a + x.p.price * x.c.qty, 0), dc = CFG.delivery || 0;
  return `<section class="cart"><h1 class="gold serif">Your Cart</h1>${t.map((x, i) => `<div class="line"><img src="${x.v ? x.v.img : x.p.img}" alt=""><div><b class="serif">${esc(x.p.name)}</b>${x.v ? `<br><small style="color:var(--g1)">${esc(x.v.name)}</small>` : ''}<br>${inr(x.p.price)} <s style="color:var(--mu)">${inr(x.p.mrp)}</s><br><button data-rm="${i}" style="background:none;border:0;color:var(--mu);text-decoration:underline">Remove</button></div><div class="qty"><button data-cq="${i}" data-d="-1">−</button><span>${x.c.qty}</span><button data-cq="${i}" data-d="1">+</button></div></div>`).join('')}
<div class="sum"><div><span>Subtotal</span><span>${inr(sub)}</span></div>${dc ? `<div><span>Delivery</span><span>${inr(dc)}</span></div>` : ''}<div class="t"><span>Total</span><span class="gold">${inr(sub + dc)}</span></div><p style="color:var(--mu);font-size:.8rem">Coupons are applied at checkout.</p></div><a class="btn" href="/checkout" data-l>Proceed to Checkout</a></section>`;
}
function bindCart() { $$('[data-rm]').forEach((b) => (b.onclick = () => { cart.splice(+b.dataset.rm, 1); saveCart(); render(); })); $$('[data-cq]').forEach((b) => (b.onclick = () => { const c = cart[+b.dataset.cq]; c.qty = Math.max(1, Math.min(10, c.qty + +b.dataset.d)); saveCart(); render(); })); }

function checkout() {
  if (!cart.length) return cartView();
  return `<section class="cart"><h1 class="gold serif">Checkout</h1><form class="f" id="cf"><div><label>Full name</label><input name="name" required autocomplete="name"></div><div><label>Mobile number</label><input name="phone" required inputmode="numeric" maxlength="10" autocomplete="tel-national"></div><div class="w"><label>Email (optional)</label><input name="email" type="email" autocomplete="email"></div><div class="w"><label>Complete delivery address</label><textarea name="address" rows="2" required autocomplete="street-address"></textarea></div><div><label>City</label><input name="city" required></div><div><label>State</label><input name="state" required></div><div><label>PIN code</label><input name="pin" required inputmode="numeric" maxlength="6"></div>
<div class="w"><label>Coupon</label><div style="display:flex;gap:8px"><input id="cp" value="${esc(appliedCode)}" placeholder="Code"><button type="button" class="btn o" id="ca">Apply</button></div></div>
<div class="w"><div id="qs" class="sum"></div></div>
<div class="w"><label>Payment</label><div class="pay"><label><input type="radio" name="method" value="online" ${CFG.online ? 'checked' : 'disabled'}><span>Pay online — UPI (Google Pay, PhonePe, Paytm, BHIM, QR / UPI ID), Debit &amp; Credit Cards, Net Banking<small>${CFG.online ? 'Secure payment via Razorpay' : 'Not available yet — payment gateway is being set up'}</small></span></label><label><input type="radio" name="method" value="cod" ${CFG.online ? '' : 'checked'}><span>Cash on Delivery</span></label></div></div>
<div class="w"><button class="btn" id="po">Place Order</button><p class="err" id="ce"></p></div></form></section>`;
}
async function bindCheckout() {
  const f = $('#cf'); if (!f) return;
  const quote = async () => { try { const r = await api('/api/coupon', { items: cart, code: $('#cp').value }); $('#qs').innerHTML = r.lines.map((l) => `<div><span>${esc(l.name)}${l.variantName ? ' — ' + esc(l.variantName) : ''} × ${l.qty}</span><span>${inr(l.price * l.qty)}</span></div>`).join('') + `<div><span>Subtotal</span><span>${inr(r.subtotal)}</span></div>${r.discount ? `<div><span>Discount (${esc(r.coupon)})</span><span>−${inr(r.discount)}</span></div>` : ''}${r.delivery ? `<div><span>Delivery</span><span>${inr(r.delivery)}</span></div>` : ''}<div class="t"><span>Total</span><span class="gold">${inr(r.total)}</span></div>`; $('#ce').textContent = ''; return true; } catch (e) { $('#ce').textContent = e.message; if ($('#cp').value) { $('#cp').value = ''; appliedCode = ''; ls.set('de_code', ''); return quote(); } return false; } };
  $('#ca').onclick = async () => { appliedCode = $('#cp').value.trim().toUpperCase(); ls.set('de_code', appliedCode); await quote(); };
  await quote();
  f.onsubmit = async (e) => { e.preventDefault(); const b = $('#po'); b.disabled = true; $('#ce').textContent = ''; const d = Object.fromEntries(new FormData(f));
    try { const r = await api('/api/order', { items: cart, coupon: $('#cp').value, method: d.method, customer: d }); orders = [{ id: r.id, phone: d.phone }, ...orders].slice(0, 20); ls.set('de_orders', orders);
      if (r.gateway) { await rzpPay(r, d); } else done(r, d, 'cod'); }
    catch (x) { $('#ce').textContent = x.message; b.disabled = false; } };
}
function rzpPay(r, d) {
  return new Promise((ok) => { const s = document.createElement('script'); s.src = 'https://checkout.razorpay.com/v1/checkout.js'; s.onload = () => { new Razorpay({ key: CFG.keyId, order_id: r.gateway.orderId, amount: r.gateway.amount, currency: 'INR', name: 'DARK ESSENCE', description: 'Order ' + r.id, prefill: { name: d.name, contact: d.phone, email: d.email }, theme: { color: '#c9972b' },
    handler: async (p) => { try { await api('/api/verify', { orderId: r.id, paymentId: p.razorpay_payment_id, signature: p.razorpay_signature }); done(r, d, 'paid'); } catch (e) { $('#ce').textContent = 'Payment could not be verified. Your order ' + r.id + ' stays pending — contact us on WhatsApp with this ID.'; } ok(); },
    modal: { ondismiss: () => { $('#ce').textContent = 'Payment was not completed. Order ' + r.id + ' is pending payment.'; $('#po').disabled = false; ok(); } } }).open(); }; s.onerror = () => { $('#ce').textContent = 'Could not load the payment window. Please try again.'; $('#po').disabled = false; ok(); }; document.head.appendChild(s); });
}
function done(r, d, st) {
  cart = []; saveCart(); const wa = `https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent(r.whatsapp)}`;
  $('#app').innerHTML = `<section class="cart" style="text-align:center"><h1 class="gold serif">${st === 'paid' ? 'Payment verified' : 'Order received'}</h1><p style="margin:14px 0">Your order ID is <b class="gold" style="font-size:1.4rem">${r.id}</b></p><p style="color:var(--mu)">${st === 'paid' ? 'Your payment was verified and your order is confirmed.' : 'Your Cash on Delivery order is placed and awaiting confirmation from DARK ESSENCE.'} Track it any time with this ID and your mobile number.</p><div style="margin:24px"><a class="btn" href="/track" data-l>Track order</a> <a class="btn o" target="_blank" rel="noopener" href="${wa}">Send summary on WhatsApp</a></div><p style="color:var(--mu);font-size:.8rem">Opening WhatsApp only shares your order summary; it does not confirm the order.</p></section>`;
}
function track() { return `<section class="cart"><h1 class="gold serif">Track Order</h1>${orders.length ? `<p style="color:var(--mu)">Your recent orders:</p>${orders.map((o) => `<button class="chip" data-o="${o.id}|${o.phone}" style="background:none;margin:4px">${o.id}</button>`).join('')}` : ''}<form class="f" id="tf" style="margin-top:14px"><div><label>Order ID</label><input name="id" required></div><div><label>Mobile number</label><input name="phone" required></div><div class="w"><button class="btn">Track</button></div></form><div id="tr"></div></section>`; }
function bindTrack() { const run = async (d) => { try { const o = await api('/api/track', d); $('#tr').innerHTML = `<div class="sum"><div><b>${o.id}</b><span class="gold">${o.status}</span></div><div><span>Payment</span><span>${o.method === 'cod' ? 'Cash on Delivery · ' : ''}${o.payment}</span></div>${o.lines.map((l) => `<div><span>${esc(l.name)}${l.variantName ? ' — ' + esc(l.variantName) : ''} × ${l.qty}</span></div>`).join('')}<div class="t"><span>Total</span><span>${inr(o.total)}</span></div>${o.history.map((h) => `<div style="color:var(--mu)"><span>${h.s}</span><span>${new Date(h.t).toLocaleString('en-IN')}</span></div>`).join('')}</div>`; } catch (e) { $('#tr').innerHTML = `<p class="err">${esc(e.message)}</p>`; } };
  $('#tf').onsubmit = (e) => { e.preventDefault(); run(Object.fromEntries(new FormData(e.target))); }; $$('[data-o]').forEach((b) => (b.onclick = () => { const [id, phone] = b.dataset.o.split('|'); run({ id, phone }); })); }
const wishView = () => `<section><h1 class="gold serif" style="margin-bottom:20px">Wishlist</h1>${wish.length ? grid(wish.map(bySlug).filter(Boolean)) : '<p style="color:var(--mu)">Nothing saved yet.</p>'}</section>`;
const nf = () => `<div class="nf"><h1 class="gold serif">404</h1><p style="color:var(--mu);margin:10px 0 24px">This essence has vanished into the smoke.</p><a class="btn" href="/" data-l>Return home</a></div>`;
const footer = () => `<footer><img src="/img/logo.jpg" alt="DARK ESSENCE"><div class="serif gold">FRAGRANCE THAT DEFINES YOU</div><nav><a href="/#all" data-l>Perfumes</a><a href="/#aero" data-l>Aero Fresh</a><a href="/track" data-l>Track Order</a><a href="/wishlist" data-l>Wishlist</a><a href="/#contact" data-l>Contact</a></nav><p>© ${new Date().getFullYear()} DARK ESSENCE · India</p></footer>`;

// ---- render
function render() {
  const path = location.pathname; let h, after = () => {};
  const pm = path.match(/^\/product\/([a-z0-9-]+)$/);
  if (path === '/') h = home(); else if (pm) { h = product(pm[1]); after = () => bindProduct(pm[1]); document.title = (bySlug(pm[1])?.name || 'Not found') + ' | DARK ESSENCE'; }
  else if (path === '/cart') { h = cartView(); after = bindCart; } else if (path === '/checkout') { h = checkout(); after = bindCheckout; }
  else if (path === '/track') { h = track(); after = bindTrack; } else if (path === '/wishlist') h = wishView(); else h = nf();
  $('#app').innerHTML = h + footer(); saveCart(); after(); hidePv();
  $$('[data-av]').forEach((b) => (b.onclick = () => { const p = P.find((x) => x.variants.length); addCart(p.slug, b.dataset.av, 1); }));
  if (location.hash) { const t = $(location.hash); t ? t.scrollIntoView() : scrollTo(0, 0); } else scrollTo(0, 0);
  reveal(); previewBind();
  $('#app').animate && !RM && $('#app').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450 });
}
function reveal() { const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 }); $$('.rv').forEach((e) => io.observe(e)); if (!RM && window.gsap) { const hl = $('.hero .hl'); if (hl) gsap.from(hl, { opacity: 0, scale: .92, duration: 1.4, ease: 'power3.out' }); if (window.ScrollTrigger) { gsap.registerPlugin(ScrollTrigger); $$('.story img').forEach((i) => gsap.to(i, { yPercent: -6, scrollTrigger: { trigger: i, scrub: true } })); } } }

// ---- desktop hover preview (right-side panel; never on touch devices)
let pvT; const hidePv = () => { clearTimeout(pvT); $('#pv').classList.remove('on'); };
function previewBind() {
  if (!matchMedia('(hover:hover) and (min-width:900px)').matches) return;
  $$('.card[data-p]').forEach((c) => { c.onmouseenter = () => { clearTimeout(pvT); pvT = setTimeout(() => { const p = bySlug(c.dataset.p); const pv = $('#pv'); pv.innerHTML = `<img src="${p.img}" alt=""><h3 class="serif gold">${esc(p.name)}</h3>${price(p)}<p>${esc(p.desc)}</p><div class="row"><a class="btn o" href="/product/${p.slug}" data-l>View Details</a><button class="btn" data-pa="${p.slug}" ${oos(p) ? 'disabled' : ''}>Add to Cart</button></div>`; pv.classList.add('on'); $('[data-pa]', pv).onclick = () => addCart(p.slug, null, 1); }, 220); };
    c.onmouseleave = () => { clearTimeout(pvT); pvT = setTimeout(() => { if (!$('#pv:hover')) hidePv(); }, 350); }; });
  $('#pv').onmouseleave = hidePv;
}

// ---- cinematic intro (once per visitor, skippable, light on mobile)
function intro() {
  const el = $('#intro'); if (ls.get('de_intro', 0) || RM) return;
  el.hidden = false; ls.set('de_intro', 1); let done = false; const end = () => { if (done) return; done = true; el.style.transition = 'opacity .9s'; el.style.opacity = 0; setTimeout(() => (el.hidden = true), 900); };
  $('#skip').onclick = end;
  const cv = $('#cv'), x = cv.getContext('2d'), n = innerWidth < 700 ? 40 : 90; cv.width = innerWidth; cv.height = innerHeight;
  const ps = Array.from({ length: n }, () => ({ x: Math.random() * cv.width, y: Math.random() * cv.height, r: Math.random() * 1.8 + .4, v: Math.random() * .4 + .1, a: Math.random() })); let raf;
  (function loop() { x.clearRect(0, 0, cv.width, cv.height); ps.forEach((p) => { p.y -= p.v; p.x += Math.sin(p.y / 40) * .3; if (p.y < 0) p.y = cv.height; x.fillStyle = `rgba(245,215,122,${p.a * .8})`; x.beginPath(); x.arc(p.x, p.y, p.r, 0, 7); x.fill(); }); if (!done) raf = requestAnimationFrame(loop); })();
  const il = $('#il'), it = $('#it');
  if (window.gsap) gsap.timeline({ onComplete: () => setTimeout(end, 900) }).fromTo(il, { opacity: 0, scale: .8, rotationX: 40, filter: 'brightness(.2) blur(10px)' }, { opacity: 1, scale: 1, rotationX: 0, filter: 'brightness(1) blur(0px)', duration: 2.2, ease: 'power3.out', delay: .8 }).to(it, { opacity: 1, letterSpacing: '.6em', duration: 1.4 }, '-=.6');
  else { il.style.opacity = 1; it.style.opacity = 1; setTimeout(end, 3000); }
}

// ---- boot
if (matchMedia('(hover:hover) and (pointer:fine)').matches && !RM) { const c = $('#cur'); addEventListener('mousemove', (e) => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; c.classList.toggle('h', !!e.target.closest('a,button,label')); }); }
$('#wa').href = 'https://wa.me/919768285613?text=' + encodeURIComponent('Hello DARK ESSENCE, I would like to know more about your fragrances.');
Promise.all([api('/api/config'), api('/api/products')]).then(([c, p]) => { CFG = c; P = p; $('#wa').href = `https://wa.me/${c.whatsapp}?text=` + encodeURIComponent('Hello DARK ESSENCE, I would like to know more about your fragrances.'); saveCart(); render(); window.addEventListener('load', intro); if (document.readyState === 'complete') intro(); })
  .catch(() => ($('#app').innerHTML = '<div class="nf"><h1 class="gold serif">Please try again</h1><p style="color:var(--mu)">We could not load the store.</p></div>'));
})();
