(()=>{
const C=window.ROW_CONFIG||{}, sb=window.supabase&&C.key&&!C.key.includes("PASTE_")?window.supabase.createClient(C.url,C.key):null;
const app=document.querySelector("#app"),nav=document.querySelector("#auth-nav"),toastEl=document.querySelector("#toast");
let user=null,profile=null,channel=null,chatStarted=false,productRatings={};
const products=Array.from({length:13},(_,i)=>({slug:"app"+(i+1),name:"APP"+(i+1),desc:"ROW.GG application. Product information, plans and availability will be updated soon."}));
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const displayName=()=>profile?.username||"ROW.GG member";
const validName=n=>/^[A-Za-z0-9_]{3,20}$/.test(n);
function toast(s){toastEl.textContent=s;toastEl.classList.add("show");setTimeout(()=>toastEl.classList.remove("show"),2600)}
function go(p){history.pushState({},"",p);render();scrollTo({top:0,behavior:"smooth"})}
document.addEventListener("click",e=>{const a=e.target.closest("a");if(a&&a.origin===location.origin&&!a.target){e.preventDefault();go(a.pathname)}});
onpopstate=render;
async function loadProfile(){
 if(!sb||!user){profile=null;return}
 const {data,error}=await sb.from("profiles").select("id,username").eq("id",user.id).maybeSingle();
 if(!error)profile=data;
}
function navRender(){
 if(!user){nav.innerHTML='<a class="nav-login" href="/log-in">Log in <span>↗</span></a>';return}
 nav.innerHTML=`<div class="account-wrap"><button id="userbtn" class="account-btn"><span class="avatar">${esc(displayName().slice(0,1).toUpperCase())}</span>${esc(displayName())}<span>⌄</span></button><div id="usermenu" class="account-menu" hidden><div class="account-label">SIGNED IN AS</div><b>${esc(displayName())}</b><button id="logout">Log out ↗</button></div></div>`;
 document.querySelector("#userbtn").onclick=()=>{const m=document.querySelector("#usermenu");m.hidden=!m.hidden};
 document.querySelector("#logout").onclick=async()=>{if(sb)await sb.auth.signOut();user=null;profile=null;chatStarted=false;if(channel&&sb)await sb.removeChannel(channel);channel=null;navRender();go("/")};
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
 <div class="hero-actions"><a class="btn" href="/log-in">Browse Products <span>↗</span></a><a class="btn ghost" href="/sign-up">Join ROW.GG</a></div>
 <div class="hero-stats"><div><b>13</b><span>PRODUCTS</span></div><div><b>01</b><span>COMMUNITY</span></div><div><b>∞</b><span>POSSIBILITIES</span></div></div></div>
 <div class="showcase-wrap reveal"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="showcase"><div class="showcase-top"><span class="muted">ROW.GG / PRODUCTS</span><span class="live-pill"><i></i> LIVE COLLECTION</span></div>
 ${[
 {name:"Madium", image:"images/app1.png"},
 {name:"Solara", image:"images/app2.png"},
 {name:"Codex", image:"images/app3.png"},
 {name:"Delta", image:"images/app4.png"}
].map((app,n)=>`
 <div class="row">
  <img class="appicon" src="${app.image}" alt="${app.name}">
  <span><b>${app.name}</b><small>ROW.GG application</small></span>
  <em>Available</em>
 </div>
`).join("")}
 <section class="sectionhead reveal"><div><div class="eyebrow">Explore ROW.GG</div><h2>Built for <span class="gradient">discovery.</span></h2><p>Everything you need to find your next favorite application.</p></div><a class="text-link" href="/products">Explore collection ↗</a></section>
 <section class="feature-grid"><article class="feature-card reveal"><div class="feature-icon">⌕</div><h3>Find faster</h3><p>Search the collection and get straight to the tools you're looking for.</p></article><article class="feature-card reveal"><div class="feature-icon">★</div><h3>Community reviews</h3><p>See ratings and feedback shared by the ROW.GG community.</p></article><article class="feature-card reveal"><div class="feature-icon">◉</div><h3>Stay connected</h3><p>Join the general chat and connect with other members.</p></article></section>
 <footer class="site-footer"><span>© ROW.GG</span><span><a href="#" target="_blank" rel="noopener">YouTube — add link</a>　<a href="https://discord.gg/tEZUkXa97" target="_blank" rel="noopener">Discord ↗</a></span></footer>`;
}

function card(p){
 const r=productRatings[p.slug],rating=r?.avg?Number(r.avg).toFixed(1):"—",count=r?.count||0;
 return `<article class="card reveal" data-name="${p.name.toLowerCase()}"><a href="/products/${p.slug}"><div class="art"><span>${p.name}</span><i>↗</i></div></a><div class="card-meta"><span>APPLICATION</span><span class="available"><i></i> Available</span></div><h3>${p.name}</h3><p>${p.desc}</p><div class="cardfoot"><span>★ ${rating} <small>(${count})</small></span><a href="/products/${p.slug}">Details ↗</a></div></article>`;
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
async function catalog(){
 app.innerHTML=`<section class="catalog reveal"><div class="eyebrow">The collection</div><h1>Explore <span class="gradient">products.</span></h1><p>Search the ROW.GG application collection or sort by community rating.</p><div class="tools"><label class="searchbox"><span>⌕</span><input id="search" placeholder="Search products…" autocomplete="off"></label><select id="sort"><option value="default">Default sorting</option><option value="high">Highest rated</option><option value="low">Lowest rated</option></select></div><div class="result-count" id="result-count">13 applications</div></section><section class="grid" id="grid"><div class="loading-line">Loading collection…</div></section>`;
 await loadRatings();
 const search=document.querySelector("#search"),sort=document.querySelector("#sort"),grid=document.querySelector("#grid"),count=document.querySelector("#result-count");
 const update=()=>{
  const q=search.value.trim().toLowerCase();
  let list=products.filter(x=>(x.name+" "+x.desc).toLowerCase().includes(q));
  if(sort.value!=="default")list.sort((a,b)=>{
   const av=productRatings[a.slug]?.avg,bv=productRatings[b.slug]?.avg;
   if(av==null&&bv==null)return 0;if(av==null)return 1;if(bv==null)return -1;
   return sort.value==="high"?bv-av:av-bv;
  });
  count.textContent=`${list.length} application${list.length===1?"":"s"} found`;
  grid.innerHTML=list.length?list.map(card).join(""):'<div class="empty-state">No matching products. Try another search.</div>';
  revealElements();
 };
 search.oninput=update;sort.onchange=update;update();
}
async function detail(slug){
 const p=products.find(x=>x.slug===slug);
 if(!p){app.innerHTML='<p>Product not found. <a href="/products">Back to products</a></p>';return}
 app.innerHTML='<div class="loading-line">Loading product details…</div>';
 let reviews=[];
 if(sb){const r=await sb.from("app_reviews").select("*").eq("app_slug",slug).order("created_at",{ascending:false}).limit(50);reviews=r.data||[]}
 const names=await getNames(reviews.map(r=>r.user_id));
 const avg=reviews.length?(reviews.reduce((a,r)=>a+(Number(r.rating)||0),0)/reviews.length).toFixed(1):"—";
 app.innerHTML=`<section class="detail"><div class="detailart reveal"><span>${p.name}</span><div class="detail-glow"></div></div><div class="detail-info reveal"><div class="eyebrow">ROW.GG / ${slug.toUpperCase()}</div><h1>${p.name}</h1><div class="detail-rating">★ ${avg} <span>(${reviews.length} reviews)</span></div><p>${p.desc}</p><div class="product-facts"><span><i></i> Available</span><span>Version 1.0.0</span></div><h2>Coming soon</h2><p>Plans, purchase and download links will be published when this product is ready.</p><button class="btn" id="buy">Purchase — coming soon</button><button class="btn ghost" id="download">Download — coming soon</button></div>
 <section class="reviews reveal"><div class="reviews-heading"><div><div class="eyebrow">Community feedback</div><h2>Ratings & reviews</h2></div><span class="review-total">${reviews.length} reviews</span></div><form class="reviewform" id="reviewform"><select id="rating" aria-label="Rating"><option value="5">★★★★★ 5 stars</option><option value="4">★★★★☆ 4 stars</option><option value="3">★★★☆☆ 3 stars</option><option value="2">★★☆☆☆ 2 stars</option><option value="1">★☆☆☆☆ 1 star</option></select><textarea id="reviewtext" maxlength="2000" rows="2" placeholder="Share your experience…"></textarea><button class="btn">Post review ↗</button></form><div class="review-list">${reviews.map(r=>`<div class="review"><div class="review-top"><b>★ ${Number(r.rating)||0}/5</b><span>${esc(names[r.user_id]||"ROW.GG member")}</span></div><p>${esc(r.review_text||"No comment")}</p></div>`).join("")||'<p class="muted">No reviews yet. Be the first to share your experience.</p>'}</div></section></section>`;
 document.querySelector("#buy").onclick=()=>toast("Purchase options are not configured yet.");
 document.querySelector("#download").onclick=()=>toast("Download link not configured yet.");
 document.querySelector("#reviewform").onsubmit=async e=>{
  e.preventDefault();if(!user){toast("Log in to post a review.");go("/log-in");return}if(!sb){toast("Supabase is not configured.");return}
  const button=e.currentTarget.querySelector("button");button.disabled=true;button.textContent="Saving…";
  const {error}=await sb.from("app_reviews").upsert({user_id:user.id,app_slug:slug,rating:+document.querySelector("#rating").value,review_text:document.querySelector("#reviewtext").value.trim()},{onConflict:"user_id,app_slug"});
  if(error){toast(error.message);button.disabled=false;button.textContent="Post review ↗";return}
  toast("Review saved");detail(slug);
 };
 revealElements();
}
function auth(signup){
 app.innerHTML=`<section class="authwrap"><div class="auth reveal"><div class="auth-mark">R</div><div class="eyebrow">ROW.GG ACCOUNT</div><h1>${signup?"Create your account.":"Welcome back."}</h1><p>${signup?"Join ROW.GG to review products and chat.":"Log in and set the display name people will see across ROW.GG."}</p><form id="authform"><div class="field"><label for="displayname">DISPLAY NAME</label><input id="displayname" minlength="3" maxlength="20" pattern="[A-Za-z0-9_]+" placeholder="Your display name" autocomplete="nickname" required><small>3–20 characters · letters, numbers and underscores</small></div><div class="field"><label for="email">EMAIL</label><input id="email" type="email" autocomplete="email" required></div><div class="field"><label for="password">PASSWORD</label><input id="password" type="password" minlength="8" autocomplete="${signup?"new-password":"current-password"}" required></div><button class="btn auth-submit">${signup?"Create account ↗":"Log in ↗"}</button><div id="formmsg" aria-live="polite"></div></form><p class="auth-switch">${signup?'Already registered? <a href="/log-in">Log in</a>':'New here? <a href="/sign-up">Create an account</a>'}</p></div></section>`;
 document.querySelector("#authform").onsubmit=async e=>{
  e.preventDefault();const m=document.querySelector("#formmsg"),button=e.currentTarget.querySelector("button");
  if(!sb){m.className="error";m.textContent="Supabase configuration is missing.";return}
  const username=document.querySelector("#displayname").value.trim(),email=document.querySelector("#email").value.trim(),password=document.querySelector("#password").value;
  if(!validName(username)){m.className="error";m.textContent="Display name must be 3–20 characters and use only letters, numbers or underscores.";return}
  button.disabled=true;button.textContent=signup?"Creating account…":"Logging in…";
  if(signup){
   const {error}=await sb.auth.signUp({email,password,options:{data:{username}}});
   m.className=error?"error":"message";m.textContent=error?.message||"Account created. Check your email for verification, then log in using this same display name.";
   button.disabled=false;button.textContent="Create account ↗";
  }else{
   const {error}=await sb.auth.signInWithPassword({email,password});
   if(error){m.className="error";m.textContent=error.message;button.disabled=false;button.textContent="Log in ↗";return}
   const {data:{user:loggedIn}}=await sb.auth.getUser();
   const {error:profileError}=await sb.from("profiles").update({username}).eq("id",loggedIn.id);
   if(profileError){m.className="error";m.textContent="You are logged in, but the display name could not be saved: "+profileError.message;await refresh();button.disabled=false;button.textContent="Log in ↗";return}
   await refresh();toast("Welcome, "+username+"!");go("/products");
  }
 };
 revealElements();
}
function revealElements(){
 const els=document.querySelectorAll(".reveal:not(.is-visible)");
 if(!("IntersectionObserver"in window)){els.forEach(x=>x.classList.add("is-visible"));return}
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("is-visible");observer.unobserve(entry.target)}}),{threshold:.08});
 els.forEach(el=>observer.observe(el));
}
async function render(){
 const p=location.pathname.replace(/\/+$/,"")||"/";
 if(p==="/")app.innerHTML=home();
 else if(p==="/products")await catalog();
 else if(/^\/products\/app\d+$/.test(p))await detail(p.split("/").pop());
 else if(p==="/log-in")auth(false);
 else if(p==="/sign-up")auth(true);
 else app.innerHTML='<p>Page not found. <a href="/">Home</a></p>';
 navRender();revealElements();
}
function chatMsg(m){
 const own=m.user_id===user?.id;
 return `<div class="msg ${own?"own":""}"><b>${own?"You":esc(m.display_name||"ROW.GG member")}</b><div>${esc(m.message)}</div></div>`;
}
async function openChat(){
 document.querySelector("#chat").classList.add("open");document.querySelector("#shade").classList.add("open");
 const note=document.querySelector("#chat-note"),form=document.querySelector("#chat-form"),list=document.querySelector("#messages");
 if(!user){note.style.display="block";form.classList.remove("active");return}
 note.style.display="none";form.classList.add("active");
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
  const send=form.querySelector("button");send.disabled=true;
  const {error}=await sb.from("chat_messages").insert({user_id:user.id,message});
  if(error)toast(error.message);else input.value="";
  send.disabled=false;input.focus();
 };
}
document.querySelector("#chat-open").onclick=openChat;
document.querySelector("#chat-close").onclick=()=>{document.querySelector("#chat").classList.remove("open");document.querySelector("#shade").classList.remove("open")};
document.querySelector("#shade").onclick=document.querySelector("#chat-close").onclick;
if(sb)sb.auth.onAuthStateChange(async(_e,s)=>{user=s?.user||null;profile=null;if(user)await loadProfile();navRender();chatStarted=false});
refresh().then(render);
})();
