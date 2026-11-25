(()=>{
const C = window.ROW_CONFIG || {};

const sb = window.supabase && C.key && !C.key.includes("PASTE_")
  ? window.supabase.createClient(C.url, C.key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;
const app=document.querySelector("#app"),nav=document.querySelector("#auth-nav"),toastEl=document.querySelector("#toast");
let user=null,profile=null,channel=null,chatStarted=false,productRatings={},revealObserver=null,currentCatalogBase="/products";

const products = [
  { slug:"roblox-studio", name:"Roblox Studio", desc:"Create, build and publish Roblox experiences.", image:"images/roblox-studio.svg", url:"https://create.roblox.com/" },
  { slug:"blender", name:"Blender", desc:"Create 3D models, animations and visual effects.", image:"images/blender.svg", url:"https://www.blender.org/download/" },
  { slug:"obs-studio", name:"OBS Studio", desc:"Record video and livestream your projects.", image:"images/obs-studio.svg", url:"https://obsproject.com/download" },
  { slug:"visual-studio-code", name:"Visual Studio Code", desc:"A powerful code editor for your development workflow.", image:"images/vscode.svg", url:"https://code.visualstudio.com/download" },
  { slug:"github-desktop", name:"GitHub Desktop", desc:"Manage Git repositories with a visual interface.", image:"images/github-desktop.svg", url:"https://desktop.github.com/" },
  { slug:"krita", name:"Krita", desc:"Create digital paintings, illustrations and concept art.", image:"images/krita.svg", url:"https://krita.org/en/download/" },
  { slug:"gimp", name:"GIMP", desc:"Edit images and create graphics with a free image editor.", image:"images/gimp.svg", url:"https://www.gimp.org/downloads/" },
  { slug:"audacity", name:"Audacity", desc:"Record and edit audio for your projects.", image:"images/audacity.svg", url:"https://www.audacityteam.org/download/" }
];

const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const displayName=()=>profile?.username||"ROW.GG member";
const validName=n=>/^[A-Za-z0-9_]{3,20}$/.test(n);
function toast(s){toastEl.textContent=s;toastEl.classList.add("show");setTimeout(()=>toastEl.classList.remove("show"),2600)} 
  
function go(path) {
  history.pushState({}, "", path);
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function requireLogin(path) {
  const next = encodeURIComponent(path);
  location.replace(`/log-in?next=${next}`);
}

function getLoginDestination() {
  const next = new URLSearchParams(location.search).get("next");

  if (next && /^(?:\/products|\/Roblox\/products)(?:\/[a-z0-9-]+)?$/i.test(next)) {
    return next;
  }

  return "/products";
}
document.addEventListener("click",e=>{const a=e.target.closest("a");if(a&&a.origin===location.origin&&!a.target){e.preventDefault();go(a.pathname)}});
onpopstate=render;
async function loadProfile(){
 if(!sb||!user){profile=null;return}
 const {data,error}=await sb.from("profiles").select("id,username").eq("id",user.id).maybeSingle();
 if(!error)profile=data;
}
  function showLogoutModal() {
  if (document.querySelector("#logout-modal")) return;

  const modal = document.createElement("div");
  modal.id = "logout-modal";
  modal.innerHTML = `
    <div class="logout-dialog" role="dialog" aria-modal="true"
         aria-labelledby="logout-title">
      <h2 id="logout-title">Log Out</h2>
      <div class="logout-divider"></div>
      <p>Are you sure you want to log out?</p>
      <div class="logout-actions">
        <button type="button" class="logout-cancel">Cancel</button>
        <button type="button" class="logout-confirm">Log Out</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => modal.remove();

  modal.querySelector(".logout-cancel").onclick = close;

  modal.addEventListener("click", e => {
    if (e.target === modal) close();
  });

  modal.querySelector(".logout-confirm").onclick = async () => {
    const button = modal.querySelector(".logout-confirm");
    button.disabled = true;
    button.textContent = "Logging out…";

    if (sb) {
      const { error } = await sb.auth.signOut();

      if (error) {
        button.disabled = false;
        button.textContent = "Log Out";
        toast(error.message);
        return;
      }
    }

    user = null;
    profile = null;
    chatStarted = false;

    if (channel && sb) await sb.removeChannel(channel);

    channel = null;
    close();
    navRender();
    go("/");
  };

  modal.querySelector(".logout-cancel").focus();
}
function navRender(){
 if(!user){nav.innerHTML='<a class="nav-login" href="/log-in">Log in</a>';return}
 nav.innerHTML=`<div class="account-wrap"><button id="userbtn" class="account-btn"><span class="avatar">${esc(displayName().slice(0,1).toUpperCase())}</span>${esc(displayName())}</button><a class="vip-nav" href="/purchase/Vip">VIP</a><div id="usermenu" class="account-menu" hidden><div class="account-label">SIGNED IN AS</div><b>${esc(displayName())}</b><button id="logout">Log out ↗</button></div></div>`;
 document.querySelector("#userbtn").onclick=()=>{const m=document.querySelector("#usermenu");m.hidden=!m.hidden};
 document.querySelector("#logout").onclick = showLogoutModal;
}
async function refresh(){
 if(sb){const {data:{session}}=await sb.auth.getSession();user=session?.user||null;await loadProfile()}
 navRender();
}
async function getNames(ids){
 const unique=[...new Set((ids||[]).filter(Boolean))];
 if(!sb||!unique.length)return {};
 const {data}=await sb.from("profiles").select("id,username").in("id",unique);
 return Object.fromEntries((data||[]).map(x=>[x.id,x.username]));
}
function home(){
 return `<section class="hero">
 <div class="hero-copy reveal"><div class="eyebrow"><span class="pulse-dot"></span> A better way to discover</div>
 <h1>Find your next<br><span class="gradient">favorite tool.</span></h1>
 <p class="copy">Explore a curated collection of applications. Discover products, compare details and find what works for you.</p>
 <div class="hero-actions"><a class="btn" href="/products">Browse Products <span>↗</span></a><a class="btn ghost" href="/sign-up">Join ROW.GG</a></div>
 <div class="hero-stats"><div><b>08</b><span>PRODUCTS</span></div><div><b>01</b><span>COMMUNITY</span></div><div><b>∞</b><span>POSSIBILITIES</span></div></div></div>
 <div class="showcase-wrap reveal"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="showcase"><div class="showcase-top"><span class="muted">ROW.GG / PRODUCTS</span><span class="live-pill"><i></i> LIVE COLLECTION</span></div>
 ${[{name:"Madium",image:"images/app1.png"},{name:"Solara",image:"images/app2.png"},{name:"Codex",image:"images/app3.png"},{name:"Delta",image:"images/app4.png"}].map(x=>`<div class="row"><img class="appicon" src="${x.image}" alt="${x.name}"><span><b>${x.name}</b><small>ROW.GG application</small></span><em>Available</em></div>`).join("")}<div class="showcase-bottom"><span>8 products in collection</span><span class="mini-bars"><i></i><i></i><i></i><i></i><i></i></span></div></div><div class="float-chip chip-a">✦ Curated tools</div><div class="float-chip chip-b">★ Community rated</div></div></section>
 <section class="sectionhead reveal"><div><div class="eyebrow">Explore ROW.GG</div><h2>Built for <span class="gradient">discovery.</span></h2><p>Everything you need to find your next favorite application.</p></div><a class="text-link" href="/products">Explore collection ↗</a></section>
 <section class="feature-grid"><article class="feature-card reveal"><div class="feature-icon">⌕</div><h3>Find faster</h3><p>Search the collection and get straight to the tools you're looking for.</p></article><article class="feature-card reveal"><div class="feature-icon">★</div><h3>Community reviews</h3><p>See ratings and feedback shared by the ROW.GG community.</p></article><article class="feature-card reveal"><div class="feature-icon">◉</div><h3>Stay connected</h3><p>Join the general chat and connect with other members.</p></article></section>
 <footer class="site-footer"><span>© ROW.GG</span><span><a href="#" target="_blank" rel="noopener">YouTube — add link</a>　<a href="https://discord.gg/tEZUkXa97" target="_blank" rel="noopener">Discord ↗</a></span></footer>`;
}
function card(p,base=currentCatalogBase){
 const r=productRatings[p.slug],rating=r?.avg?Number(r.avg).toFixed(1):"—",count=r?.count||0;
 return `<article class="card reveal" data-name="${p.name.toLowerCase()}"><a href="${base}/${p.slug}"><div class="art">
  <img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">
  <span>${esc(p.name)}</span>
  <i>↗</i>
</div></a><div class="card-meta"><span class="card-app-identity"><span class="card-logo-slot"><span class="logo-monogram">${esc(p.name.slice(0,2).toUpperCase())}</span><img src="${esc(p.image)}" alt="${esc(p.name)} logo" loading="lazy" onerror="this.hidden=true"></span><span>APPLICATION</span></span><span class="available"><i></i> Available</span></div><h3>${p.name}</h3><p>${p.desc}</p><div class="cardfoot"><span>★ ${rating} <small>(${count})</small></span><a href="${base}/${p.slug}">Details ↗</a></div></article>`;
}
async function loadRatings(){
 productRatings={};
 if(!sb)return;
 const {data,error}=await sb.from("app_reviews").select("app_slug,rating");
 if(error)return;
 const grouped={};
 (data||[]).forEach(r=>{(grouped[r.app_slug]??=[]).push(Number(r.rating)||0)});
 Object.entries(grouped).forEach(([slug,vals])=>productRatings[slug]={avg:vals.reduce((a,b)=>a+b,0)/vals.length,count:vals.length});
}
async function catalog(base="/products",items=products,title="Explore products.",description="Search the ROW.GG application collection or sort by community rating."){
 currentCatalogBase=base;
 app.innerHTML=`<section class="catalog reveal"><div class="eyebrow">The collection</div><h1>${title}</h1><p>${description}</p><div class="tools"><label class="searchbox"><span>⌕</span><input id="search" placeholder="Search products…" autocomplete="off"></label><select id="sort"><option value="default">Default sorting</option><option value="high">Highest rated</option><option value="low">Lowest rated</option></select></div><div class="result-count" id="result-count">${items.length} applications</div></section><section class="grid" id="grid"><div class="loading-line">Loading collection…</div></section>`;
 await loadRatings();
 const search=document.querySelector("#search"),sort=document.querySelector("#sort"),grid=document.querySelector("#grid"),count=document.querySelector("#result-count");
 const update=()=>{
  const q=search.value.trim().toLowerCase();
  let list=items.filter(x=>(x.name+" "+x.desc).toLowerCase().includes(q));
  if(sort.value!=="default")list.sort((a,b)=>{
   const av=productRatings[a.slug]?.avg,bv=productRatings[b.slug]?.avg;
   if(av==null&&bv==null)return 0;if(av==null)return 1;if(bv==null)return -1;
   return sort.value==="high"?bv-av:av-bv;
  });
  count.textContent=`${list.length} application${list.length===1?"":"s"} found`;
  grid.innerHTML=list.length?list.map(x=>card(x,base)).join(""):'<div class="empty-state">No matching products. Try another search.</div>';
  revealElements();
 };
 search.oninput=update;sort.onchange=update;update();
}
async function detail(slug,base="/products"){
 const p=products.find(x=>x.slug===slug);
 if(!p){app.innerHTML='<p>Product not found. <a href="/products">Back to products</a></p>';return}
 app.innerHTML='<div class="loading-line">Loading product details…</div>';
 let reviews=[];
 if(sb){const r=await sb.from("app_reviews").select("*").eq("app_slug",slug).order("created_at",{ascending:false}).limit(50);reviews=r.data||[]}
 const names=await getNames(reviews.map(r=>r.user_id));
 const avg=reviews.length?(reviews.reduce((a,r)=>a+(Number(r.rating)||0),0)/reviews.length).toFixed(1):"—";
 app.innerHTML=`<section class="detail"><div class="detailart reveal">
  <div class="detail-logo-box"><span class="logo-monogram">${esc(p.name.slice(0,2).toUpperCase())}</span><img src="${esc(p.image)}" alt="${esc(p.name)} logo" onerror="this.hidden=true"></div>
  <div class="detail-glow"></div>
</div><div class="detail-info reveal"><div class="eyebrow">ROW.GG / ${slug.toUpperCase()}</div><h1>${p.name}</h1><div class="detail-rating">★ ${avg} <span>(${reviews.length} reviews)</span></div><p>${p.desc}</p><div class="product-facts"><span><i></i> Available</span><span>Version 1.0.0</span></div><h2>Official website</h2><p>Continue to the publisher's official website for product information and downloads.</p><a class="btn" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">Download</a></div>
 <section class="reviews reveal"><div class="reviews-heading"><div><div class="eyebrow">Community feedback</div><h2>Ratings & reviews</h2></div><span class="review-total">${reviews.length} reviews</span></div><form class="reviewform" id="reviewform"><select id="rating" aria-label="Rating"><option value="5">★★★★★ 5 stars</option><option value="4">★★★★☆ 4 stars</option><option value="3">★★★☆☆ 3 stars</option><option value="2">★★☆☆☆ 2 stars</option><option value="1">★☆☆☆☆ 1 star</option></select><textarea id="reviewtext" maxlength="2000" rows="2" placeholder="Share your experience…"></textarea><button class="btn">Post review ↗</button></form><div class="review-list">${reviews.map(r=>`<div class="review"><div class="review-top"><b>★ ${Number(r.rating)||0}/5</b><span>${esc(names[r.user_id]||"ROW.GG member")}</span></div><p>${esc(r.review_text||"No comment")}</p></div>`).join("")||'<p class="muted">No reviews yet. Be the first to share your experience.</p>'}</div></section></section>`;
 document.querySelector("#reviewform").onsubmit=async e=>{
  e.preventDefault();if(!user){toast("Log in to post a review.");go("/log-in");return}if(!sb){toast("Supabase is not configured.");return}
  const button=e.currentTarget.querySelector("button");button.disabled=true;button.textContent="Saving…";
  const {error}=await sb.from("app_reviews").upsert({user_id:user.id,app_slug:slug,rating:+document.querySelector("#rating").value,review_text:document.querySelector("#reviewtext").value.trim()},{onConflict:"user_id,app_slug"});
  if(error){toast(error.message);button.disabled=false;button.textContent="Post review ↗";return}
  toast("Review saved");detail(slug,base);
 };
 revealElements();
}
function auth(signup){
 const displayField=signup?`<div class="field"><label for="displayname">DISPLAY NAME</label><input id="displayname" minlength="3" maxlength="20" pattern="[A-Za-z0-9_]+" placeholder="Your display name" autocomplete="nickname" required><small>3–20 characters · letters, numbers and underscores</small></div>`:"";
 app.innerHTML=`<section class="authwrap"><div class="auth reveal"><div class="auth-mark">R</div><div class="eyebrow">ROW.GG ACCOUNT</div><h1>${signup?"Create your account.":"Welcome back."}</h1><p>${signup?"Join ROW.GG to review products and chat.":"Log in to continue to ROW.GG."}</p><form id="authform">${displayField}<div class="field"><label for="email">EMAIL</label><input id="email" type="email" autocomplete="email" required></div><div class="field"><label for="password">PASSWORD</label><input id="password" type="password" minlength="8" autocomplete="${signup?"new-password":"current-password"}" required></div><button class="btn auth-submit">${signup?"Create account":"Log in"}</button><div id="formmsg" aria-live="polite"></div></form><p class="auth-switch">${signup?'Already registered? <a href="/log-in">Log in</a>':'New here? <a href="/sign-up">Create an account</a>'}</p></div></section>`;
 document.querySelector("#authform").onsubmit=async e=>{
  e.preventDefault();const m=document.querySelector("#formmsg"),button=e.currentTarget.querySelector("button");
  if(!sb){m.className="error";m.textContent="Supabase configuration is missing.";return}
  const username=signup?document.querySelector("#displayname").value.trim():"",email=document.querySelector("#email").value.trim(),password=document.querySelector("#password").value;
  if(signup&&!validName(username)){m.className="error";m.textContent="Display name must be 3–20 characters and use only letters, numbers or underscores.";return}
  button.disabled=true;button.textContent=signup?"Creating account…":"Logging in…";
  if(signup){
   const {data,error}=await sb.auth.signUp({email,password,options:{data:{username}}});
   if(error){m.className="error";m.textContent=error.message;button.disabled=false;button.textContent="Create account";return}
   if(data.session){await refresh();toast("Welcome to ROW.GG, "+username+"!");go(getLoginDestination());return}
   m.className="message";m.textContent="Account created. If email confirmation is enabled in Supabase, turn it off under Authentication → Providers → Email to allow free instant sign-in.";
   button.disabled=false;button.textContent="Create account";
  }else{
   const {error}=await sb.auth.signInWithPassword({email,password});
   if(error){m.className="error";m.textContent=error.message;button.disabled=false;button.textContent="Log in";return}
   await refresh();toast("Welcome back, "+displayName()+"!");go(getLoginDestination());
  }
 };
 revealElements();
}
function revealElements(){
 const els=document.querySelectorAll(".reveal:not(.is-visible)");
 if(!("IntersectionObserver"in window)){els.forEach(x=>x.classList.add("is-visible"));return}
 if(!revealObserver){
  revealObserver=new IntersectionObserver(entries=>{
   entries.forEach(entry=>{
    if(entry.isIntersecting){
     entry.target.classList.add("is-visible");
     revealObserver.unobserve(entry.target);
    }
   });
  },{threshold:.08,rootMargin:"0px 0px 80px 0px"});
 }else{
  revealObserver.disconnect();
 }
 els.forEach(el=>revealObserver.observe(el));
}
function vipPurchasePage() {
  return `
    <section class="vip-page">
      <div class="vip-card">
        <div class="vip-label">ROW.GG EXCLUSIVE</div>
        <div class="vip-icon">♛</div>
        <h1>VIP <span>MEMBERSHIP</span></h1>
        <p class="vip-description">
          Upgrade your ROW.GG experience with exclusive VIP status.
        </p>
        <div class="vip-benefits">
          <div>✦ Exclusive VIP badge</div>
          <div>✦ Special recognition in chat</div>
          <div>✦ VIP member status</div>
          <div>✦ Support the ROW.GG community</div>
        </div>
        <div class="vip-price">
          <span>VIP ACCESS</span>
          <strong>Coming Soon</strong>
        </div>
        <button class="vip-buy-button" id="vip-buy">
          Buy Now <span>↗</span>
        </button>
        <div class="vip-footer">Secure payment will be available soon.</div>
      </div>
    </section>
  `;
}

function showPaymentNotice() {
  document.querySelector("#payment-notice")?.remove();

  const notice = document.createElement("div");
  notice.id = "payment-notice";
  notice.textContent = "Payment are currently not available";
  document.body.appendChild(notice);

  requestAnimationFrame(() => notice.classList.add("show"));

  setTimeout(() => {
    notice.classList.remove("show");
    setTimeout(() => notice.remove(), 300);
  }, 3000);
}
async function render() {
  const p = location.pathname.replace(/\/+$/, "") || "/";
  const lower = p.toLowerCase();
  const rootCatalog = lower === "/products" || lower.startsWith("/products/");
  const robloxCatalog = lower === "/roblox/products" || lower.startsWith("/roblox/products/");
  const detailPage = lower.startsWith("/products/") || lower.startsWith("/roblox/products/");

  if ((rootCatalog || robloxCatalog) && !user) {
    requireLogin(p);
    return;
  }
  if (user && (lower === "/log-in" || lower === "/sign-up")) {
    location.replace(getLoginDestination());
    return;
  }

  if (p === "/") {
    app.innerHTML = home();
  } else if (lower === "/products") {
    await catalog("/products", products, "Explore <span class='gradient'>all apps.</span>", "Browse every application available across ROW.GG games.");
  } else if (lower === "/roblox/products") {
    await catalog("/Roblox/products", products, "Roblox <span class='gradient'>applications.</span>", "Explore applications for the Roblox community.");
  } else if (lower === "/free-fire/products") {
    app.innerHTML = '<section class="catalog empty-catalog"><div class="eyebrow">Free Fire collection</div><h1>Free Fire <span class="gradient">applications.</span></h1><div class="game-empty-state">Sorry, there are no applications available.</div></section>';
  } else if (detailPage) {
    await detail(p.split("/").pop(), robloxCatalog ? "/Roblox/products" : "/products");
  } else if (lower === "/faq") {
    app.innerHTML = '<section class="catalog faq-page"><div class="eyebrow">Help center</div><h1>Frequently asked <span class="gradient">questions.</span></h1><article class="faq-item"><h2>What is ROW.GG?</h2><p>ROW.GG is a community website for discovering applications, reading reviews and chatting with other members.</p></article><article class="faq-item"><h2>How do I browse applications?</h2><p>Open Products to see the combined collection, or use Games to browse a specific game category.</p></article><article class="faq-item"><h2>Do I need an account?</h2><p>Sign in to access product pages, post reviews and use community features.</p></article><article class="faq-item"><h2>Why does Free Fire have no applications yet?</h2><p>The Free Fire collection is not available yet. Check back later for updates.</p></article></section>';
  } else if (lower === "/log-in") {
    auth(false);
  } else if (lower === "/sign-up") {
    auth(true);
  } else if (lower === "/purchase/vip") {
    app.innerHTML = vipPurchasePage();
    document.querySelector("#vip-buy").onclick = showPaymentNotice;
  } else {
    app.innerHTML = '<p>Page not found. <a href="/">Home</a></p>';
  }

  navRender();
  revealElements();
}
function chatMsg(m){
 const own=m.user_id===user?.id;
 let media=null, body=m.message||"";
 if(body.startsWith("[ROWMEDIA]")){try{media=JSON.parse(body.slice(10));body=media.caption||""}catch{}}
 const safeMediaUrl=typeof media?.url==="string"&&/^https:\/\//i.test(media.url)?media.url:"";
 const mediaHtml=safeMediaUrl?`<div class="chat-media">${media.type==="video"?`<video controls preload="metadata" src="${esc(safeMediaUrl)}"></video>`:`<a href="${esc(safeMediaUrl)}" target="_blank" rel="noopener"><img loading="lazy" src="${esc(safeMediaUrl)}" alt="Chat attachment"></a>`}</div>`:"";
 return `<div class="msg ${own?"own":""}"><b>${own?"You":esc(m.display_name||"ROW.GG member")}</b>${body?`<div class="msg-text">${esc(body)}</div>`:""}${mediaHtml}</div>`;
}
const emojiCategories = {
  smileys: "😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😍 🥰 😘 😎 🤩 🥳 😭 💀 🤔 😴 😡 🤯 🥺",
  people: "👋 👍 👎 👏 🙌 🤝 🙏 💪 🫶 👀 🧑‍💻 🕺 💃",
  animals: "🐶 🐱 🐼 🦊 🐸 🐵 🦁 🐯 🐻 🐨 🐰 🐧 🦋 🐉",
  food: "🍕 🍔 🍟 🌭 🍿 🍩 🍪 🎂 🍫 🍓 🍉 🍎 🍇 ☕ 🧋",
  symbols: "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🔥 ⭐ ✨ 💯 🚀 🎮 🏆"
};

function addEmoji(emoji) {
  const input = document.querySelector("#chat-input");
  const start = input.selectionStart;
  const end = input.selectionEnd;

  input.value =
    input.value.slice(0, start) +
    emoji +
    input.value.slice(end);

  input.focus();
  input.setSelectionRange(
    start + emoji.length,
    start + emoji.length
  );
}

function renderEmojis(category = "smileys") {
  const list = document.querySelector("#emoji-list");
  if (!list) return;

  list.innerHTML = "";

  (emojiCategories[category] || emojiCategories.smileys)
    .split(" ")
    .forEach(emoji => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "emoji-option";
      button.textContent = emoji;

      button.onclick = () => {
        addEmoji(emoji);
      };

      list.appendChild(button);
    });
}

async function searchGifs(query) {
  const results = document.querySelector("#gif-results");
  const apiKey = C.giphyKey;

  if (!results) return;

  if (!apiKey || apiKey.includes("YOUR_GIPHY")) {
    results.textContent = "Add your GIPHY API key in config.js first.";
    return;
  }

  if (!query.trim()) {
    results.textContent = "Search for a GIF.";
    return;
  }

  results.textContent = "Searching GIFs...";

  try {
    const url = new URL("https://api.giphy.com/v1/gifs/search");

    url.search = new URLSearchParams({
      api_key: apiKey,
      q: query,
      limit: "18",
      rating: "g",
      lang: "en"
    });

    const response = await fetch(url);
    if (!response.ok) throw new Error("GIF search failed");

    const data = await response.json();
    results.innerHTML = "";

    if (!data.data?.length) {
      results.textContent = "No GIFs found. Try another search.";
      return;
    }

    data.data.forEach(gif => {
      const preview = gif.images?.fixed_width_small?.url;
      const original = gif.images?.original?.url;

      if (!preview || !original) return;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "gif-result";

      const img = document.createElement("img");
      img.src = preview;
      img.alt = "GIF preview";
      img.loading = "lazy";

      button.appendChild(img);

      button.onclick = async () => {
        await sendChatMedia(original, "image", "GIF");
        document.querySelector("#gif-panel").hidden = true;
      };

      results.appendChild(button);
    });
  } catch (error) {
    results.textContent = "Could not load GIFs. Please try again.";
  }
}
async function sendChatMedia(url,type,caption){
 if(!sb||!user)return;
 const {error}=await sb.from("chat_messages").insert({user_id:user.id,message:"[ROWMEDIA]"+JSON.stringify({url,type,caption})});
 if(error)toast(error.message);
}
async function uploadChatFile(file){
 if(!sb||!user){toast("Log in to upload media.");return}
 const ext=(file.name.split(".").pop()||"bin").toLowerCase(),path=`${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
 const {error:uploadError}=await sb.storage.from("chat-media").upload(path,file,{upsert:false,contentType:file.type});
 if(uploadError){toast("Upload failed: "+uploadError.message);return}
 const {data}=sb.storage.from("chat-media").getPublicUrl(path);
 await sendChatMedia(data.publicUrl,file.type.startsWith("video/")?"video":"image","");
}
async function openChat(){
 document.querySelector("#chat").classList.add("open");document.querySelector("#shade").classList.add("open");
 const note=document.querySelector("#chat-note"),form=document.querySelector("#chat-form"),list=document.querySelector("#messages");
 if(!user){note.innerHTML='<div class="guest-chat-icon">✉</div><strong>Please sign in to start a conversation</strong><span>Log in to join the ROW.GG community chat.</span><a class="guest-chat-login" href="/log-in">Log in</a>';note.classList.add("guest-only");note.style.display="flex";list.style.display="none";form.classList.remove("active");return}
 note.style.display="none";note.classList.remove("guest-only");list.style.display="block";form.classList.add("active");
 if(!sb){toast("Supabase is not configured.");return}
 if(!chatStarted){
  const {data,error}=await sb.from("chat_messages").select("id,user_id,message,created_at").order("created_at").limit(100);
  if(error){toast(error.message);return}
  const rows=data||[],names=await getNames(rows.map(x=>x.user_id));
  list.innerHTML=rows.map(x=>chatMsg({...x,display_name:names[x.user_id]})).join("");list.scrollTop=list.scrollHeight;
  if(channel)await sb.removeChannel(channel);
  channel=sb.channel("rowgg-chat").on("postgres_changes",{event:"INSERT",schema:"public",table:"chat_messages"},async payload=>{
   const names=await getNames([payload.new.user_id]);list.insertAdjacentHTML("beforeend",chatMsg({...payload.new,display_name:names[payload.new.user_id]}));list.scrollTop=list.scrollHeight;
  }).subscribe();
  chatStarted=true;
 }
 form.onsubmit=async e=>{
  e.preventDefault();const input=document.querySelector("#chat-input"),message=input.value.trim();if(!message)return;
  const send=form.querySelector(".chat-send");send.disabled=true;
  const {error}=await sb.from("chat_messages").insert({user_id:user.id,message});
  if(error)toast(error.message);else input.value="";
  send.disabled=false;input.focus();
 };
const emojiPanel = document.querySelector("#emoji-panel");
const gifPanel = document.querySelector("#gif-panel");

renderEmojis();

document.querySelector("#emoji-toggle").onclick = () => {
  emojiPanel.hidden = !emojiPanel.hidden;
  gifPanel.hidden = true;
};

document.querySelectorAll("[data-category]").forEach(button => {
  button.onclick = () => renderEmojis(button.dataset.category);
});

document.querySelector("#gif-toggle").onclick = () => {
  gifPanel.hidden = !gifPanel.hidden;
  emojiPanel.hidden = true;
};

let gifSearchTimer;

document.querySelector("#gif-search").oninput = event => {
  clearTimeout(gifSearchTimer);

  const query = event.target.value.trim();

  gifSearchTimer = setTimeout(() => {
    searchGifs(query);
  }, 450);
};
 document.querySelector("#chat-file").onchange=async e=>{const file=e.target.files?.[0];e.target.value="";if(!file)return;if(!/^(image\/(png|jpeg|webp|gif)|video\/(mp4|webm|quicktime))$/.test(file.type)){toast("Choose a JPG, PNG, WEBP, GIF, MP4 or WEBM file.");return}if(file.size>25*1024*1024){toast("Files must be 25 MB or smaller.");return}await uploadChatFile(file)};

}
const gamesNavToggle = document.querySelector("#games-nav-toggle");
const gamesNavMenu = document.querySelector("#games-nav-menu");
const closeGamesMenu = () => {
  if (!gamesNavToggle || !gamesNavMenu) return;
  gamesNavMenu.hidden = true;
  gamesNavToggle.setAttribute("aria-expanded", "false");
};
gamesNavToggle.onclick = () => {
  const opening = gamesNavMenu.hidden;
  gamesNavMenu.hidden = !opening;
  gamesNavToggle.setAttribute("aria-expanded", String(opening));
};
document.addEventListener("click", event => {
  if (!event.target.closest(".games-nav-wrap")) closeGamesMenu();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeGamesMenu();
});
const siteMenuToggle = document.querySelector("#site-menu-toggle");
const siteMenu = document.querySelector("#site-menu");
const closeSiteMenu = () => {
  siteMenu.hidden = true;
  siteMenuToggle.setAttribute("aria-expanded", "false");
};
siteMenuToggle.onclick = () => {
  const opening = siteMenu.hidden;
  siteMenu.hidden = !opening;
  siteMenuToggle.setAttribute("aria-expanded", String(opening));
};
document.querySelector("#site-menu-logout").onclick = () => {
  closeSiteMenu();
  showLogoutModal();
};
document.addEventListener("click", event => {
  if (!event.target.closest(".site-menu-wrap")) closeSiteMenu();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeSiteMenu();
});
document.querySelector("#chat-open").onclick=openChat;
document.querySelector("#chat-close").onclick=()=>{document.querySelector("#chat").classList.remove("open");document.querySelector("#shade").classList.remove("open")};
document.querySelector("#shade").onclick=document.querySelector("#chat-close").onclick;
if(sb)sb.auth.onAuthStateChange(async(_e,s)=>{user=s?.user||null;profile=null;if(user)await loadProfile();navRender();chatStarted=false});
refresh().then(render);
})();


// ROW.GG cursor glow — lightweight, mouse-only and accessibility-aware.
if (window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const cursorGlow = document.createElement("div");
  cursorGlow.className = "cursor-glow";
  cursorGlow.setAttribute("aria-hidden", "true");
  document.body.appendChild(cursorGlow);

  let glowX = -300, glowY = -300, targetX = -300, targetY = -300;
  let glowFrame = 0;

  const moveGlow = () => {
    glowX += (targetX - glowX) * 0.18;
    glowY += (targetY - glowY) * 0.18;
    cursorGlow.style.transform = `translate3d(${glowX}px, ${glowY}px, 0) translate(-50%, -50%)`;
    if (Math.abs(targetX - glowX) > 0.2 || Math.abs(targetY - glowY) > 0.2) {
      glowFrame = requestAnimationFrame(moveGlow);
    } else {
      glowFrame = 0;
    }
  };

  window.addEventListener("pointermove", event => {
    if (event.pointerType === "touch") return;
    targetX = event.clientX;
    targetY = event.clientY;
    cursorGlow.classList.add("is-visible");
    if (!glowFrame) glowFrame = requestAnimationFrame(moveGlow);
  }, { passive: true });

  document.documentElement.addEventListener("pointerleave", () => {
    cursorGlow.classList.remove("is-visible");
  });
  document.documentElement.addEventListener("pointerenter", () => {
    cursorGlow.classList.add("is-visible");
  });
}
