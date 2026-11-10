(() => {
  const C = window.ROW_CONFIG || {};
  const sb = window.supabase && C.key && !C.key.includes("PASTE_")
    ? window.supabase.createClient(C.url, C.key)
    : null;

  const app = document.querySelector("#app");
  const nav = document.querySelector("#auth-nav");
  const toastEl = document.querySelector("#toast");

  let user = null;
  let profile = null;
  let channel = null;
  let chatStarted = false;
  let productRatings = {};
  let activeEmojiCategory = "Smileys";

  const products = Array.from({ length: 13 }, (_, i) => ({
    slug: "app" + (i + 1),
    name: "APP" + (i + 1),
    desc: "ROW.GG application. Product information, plans and availability will be updated soon."
  }));

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));

  const displayName = () => profile?.username || user?.user_metadata?.username || "ROW.GG member";
  const validName = n => /^[A-Za-z0-9_]{3,20}$/.test(n);

  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add("show");
    setTimeout(() => toastEl.classList.remove("show"), 2600);
  }

  function go(path) {
    history.pushState({}, "", path);
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.addEventListener("click", e => {
    const a = e.target.closest("a");
    if (a && a.origin === location.origin && !a.target) {
      e.preventDefault();
      go(a.pathname);
    }
  });

  onpopstate = render;

  async function loadProfile() {
    if (!sb || !user) {
      profile = null;
      return;
    }

    const { data, error } = await sb
      .from("profiles")
      .select("id,username")
      .eq("id", user.id)
      .maybeSingle();

    if (!error) profile = data;
  }

  function navRender() {
    if (!user) {
      nav.innerHTML = '<a class="nav-login" href="/log-in">Log in</a>';
      return;
    }

    nav.innerHTML = `
      <div class="account-wrap">
        <button id="userbtn" class="account-btn">
          <span class="avatar">${esc(displayName().slice(0, 1).toUpperCase())}</span>
          ${esc(displayName())}
          <span>⌄</span>
        </button>
        <div id="usermenu" class="account-menu" hidden>
          <div class="account-label">SIGNED IN AS</div>
          <b>${esc(displayName())}</b>
          <button id="logout">Log out ↗</button>
        </div>
      </div>`;

    document.querySelector("#userbtn").onclick = () => {
      const menu = document.querySelector("#usermenu");
      menu.hidden = !menu.hidden;
    };

    document.querySelector("#logout").onclick = async () => {
      if (sb) await sb.auth.signOut();

      user = null;
      profile = null;
      chatStarted = false;

      if (channel && sb) await sb.removeChannel(channel);
      channel = null;

      navRender();
      go("/");
    };
  }

  async function refresh() {
    if (sb) {
      const { data: { session } } = await sb.auth.getSession();
      user = session?.user || null;
      await loadProfile();
    }

    navRender();
  }

  async function getNames(ids) {
    const unique = [...new Set((ids || []).filter(Boolean))];

    if (!sb || !unique.length) return {};

    const { data } = await sb
      .from("profiles")
      .select("id,username")
      .in("id", unique);

    return Object.fromEntries(
      (data || []).map(x => [x.id, x.username])
    );
  }

  function home() {
    return `
      <section class="hero">
        <div class="hero-copy reveal">
          <div class="eyebrow"><span class="pulse-dot"></span> A better way to discover</div>
          <h1>Find your next<br><span class="gradient">favorite tool.</span></h1>
          <p class="copy">
            Explore a curated collection of applications. Discover products,
            compare details and find what works for you.
          </p>
          <div class="hero-actions">
            <a class="btn" href="/log-in">Browse Products <span>↗</span></a>
            <a class="btn ghost" href="/sign-up">Join ROW.GG</a>
          </div>
          <div class="hero-stats">
            <div><b>13</b><span>PRODUCTS</span></div>
            <div><b>01</b><span>COMMUNITY</span></div>
            <div><b>∞</b><span>POSSIBILITIES</span></div>
          </div>
        </div>

        <div class="showcase-wrap reveal">
          <div class="orbit orbit-one"></div>
          <div class="orbit orbit-two"></div>
          <div class="showcase">
            <div class="showcase-top">
              <span class="muted">ROW.GG / PRODUCTS</span>
              <span class="live-pill"><i></i> LIVE COLLECTION</span>
            </div>
            ${[
              { name: "Medium", image: "images/app1.png" },
              { name: "Solara", image: "images/app2.png" },
              { name: "Codex", image: "images/app3.png" },
              { name: "Delta", image: "images/app4.png" }
            ].map(x => `
              <div class="row">
                <img class="appicon" src="${esc(x.image)}" alt="${esc(x.name)}">
                <span><b>${esc(x.name)}</b><small>ROW.GG application</small></span>
                <em>Available</em>
              </div>
            `).join("")}
            <div class="showcase-bottom">
              <span>13 products in collection</span>
              <span class="mini-bars"><i></i><i></i><i></i><i></i><i></i></span>
            </div>
          </div>
          <div class="float-chip chip-a">✦ Curated tools</div>
          <div class="float-chip chip-b">★ Community rated</div>
        </div>
      </section>

      <section class="sectionhead reveal">
        <div>
          <div class="eyebrow">Explore ROW.GG</div>
          <h2>Built for <span class="gradient">discovery.</span></h2>
          <p>Everything you need to find your next favorite application.</p>
        </div>
        <a class="text-link" href="/products">Explore collection ↗</a>
      </section>

      <section class="feature-grid">
        <article class="feature-card reveal">
          <div class="feature-icon">⌕</div>
          <h3>Find faster</h3>
          <p>Search the collection and get straight to the tools you're looking for.</p>
        </article>
        <article class="feature-card reveal">
          <div class="feature-icon">★</div>
          <h3>Community reviews</h3>
          <p>See ratings and feedback shared by the ROW.GG community.</p>
        </article>
        <article class="feature-card reveal">
          <div class="feature-icon">◉</div>
          <h3>Stay connected</h3>
          <p>Join the general chat and connect with other members.</p>
        </article>
      </section>

      <footer class="site-footer">
        <span>© ROW.GG</span>
        <span>
          <a href="#" target="_blank" rel="noopener">YouTube — add link</a>
          <a href="https://discord.gg/tEZUkXa97" target="_blank" rel="noopener">Discord ↗</a>
        </span>
      </footer>`;
  }

  function card(p) {
    const r = productRatings[p.slug];
    const rating = r?.avg ? Number(r.avg).toFixed(1) : "—";
    const count = r?.count || 0;

    return `
      <article class="card reveal" data-name="${esc(p.name.toLowerCase())}">
        <a href="/products/${p.slug}">
          <div class="art"><span>${esc(p.name)}</span><i>↗</i></div>
        </a>
        <div class="card-meta">
          <span>APPLICATION</span>
          <span class="available"><i></i> Available</span>
        </div>
        <h3>${esc(p.name)}</h3>
        <p>${esc(p.desc)}</p>
        <div class="cardfoot">
          <span>★ ${rating} <small>(${count})</small></span>
          <a href="/products/${p.slug}">Details ↗</a>
        </div>
      </article>`;
  }

  async function loadRatings() {
    productRatings = {};
    if (!sb) return;

    const { data, error } = await sb
      .from("app_reviews")
      .select("app_slug,rating");

    if (error) return;

    const grouped = {};

    (data || []).forEach(r => {
      (grouped[r.app_slug] ??= []).push(Number(r.rating) || 0);
    });

    Object.entries(grouped).forEach(([slug, vals]) => {
      productRatings[slug] = {
        avg: vals.reduce((a, b) => a + b, 0) / vals.length,
        count: vals.length
      };
    });
  }

  async function catalog() {
    app.innerHTML = `
      <section class="catalog reveal">
        <div class="eyebrow">The collection</div>
        <h1>Explore <span class="gradient">products.</span></h1>
        <p>Search the ROW.GG application collection or sort by community rating.</p>
        <div class="tools">
          <label class="searchbox">
            <span>⌕</span>
            <input id="search" placeholder="Search products…" autocomplete="off">
          </label>
          <select id="sort">
            <option value="default">Default sorting</option>
            <option value="high">Highest rated</option>
            <option value="low">Lowest rated</option>
          </select>
        </div>
        <div class="result-count" id="result-count">13 applications</div>
      </section>
      <section class="grid" id="grid">
        <div class="loading-line">Loading collection…</div>
      </section>`;

    await loadRatings();

    const search = document.querySelector("#search");
    const sort = document.querySelector("#sort");
    const grid = document.querySelector("#grid");
    const count = document.querySelector("#result-count");

    const update = () => {
      const q = search.value.trim().toLowerCase();

      let list = products.filter(x =>
        (x.name + " " + x.desc).toLowerCase().includes(q)
      );

      if (sort.value !== "default") {
        list.sort((a, b) => {
          const av = productRatings[a.slug]?.avg;
          const bv = productRatings[b.slug]?.avg;

          if (av == null && bv == null) return 0;
          if (av == null) return 1;
          if (bv == null) return -1;

          return sort.value === "high" ? bv - av : av - bv;
        });
      }

      count.textContent =
        `${list.length} application${list.length === 1 ? "" : "s"} found`;

      grid.innerHTML = list.length
        ? list.map(card).join("")
        : '<div class="empty-state">No matching products. Try another search.</div>';

      revealElements();
    };

    search.oninput = update;
    sort.onchange = update;
    update();
  }

  async function detail(slug) {
    const p = products.find(x => x.slug === slug);

    if (!p) {
      app.innerHTML = '<p>Product not found. <a href="/products">Back to products</a></p>';
      return;
    }

    app.innerHTML = '<div class="loading-line">Loading product details…</div>';

    let reviews = [];

    if (sb) {
      const r = await sb
        .from("app_reviews")
        .select("*")
        .eq("app_slug", slug)
        .order("created_at", { ascending: false })
        .limit(50);

      reviews = r.data || [];
    }

    const names = await getNames(reviews.map(r => r.user_id));

    const avg = reviews.length
      ? (reviews.reduce((a, r) => a + (Number(r.rating) || 0), 0) / reviews.length).toFixed(1)
      : "—";

    app.innerHTML = `
      <section class="detail">
        <div class="detailart reveal">
          <span>${esc(p.name)}</span>
          <div class="detail-glow"></div>
        </div>

        <div class="detail-info reveal">
          <div class="eyebrow">ROW.GG / ${esc(slug.toUpperCase())}</div>
          <h1>${esc(p.name)}</h1>
          <div class="detail-rating">★ ${avg} <span>(${reviews.length} reviews)</span></div>
          <p>${esc(p.desc)}</p>
          <div class="product-facts">
            <span><i></i> Available</span>
            <span>Version 1.0.0</span>
          </div>
          <h2>Coming soon</h2>
          <p>Plans, purchase and download links will be published when this product is ready.</p>
          <button class="btn" id="buy">Purchase — coming soon</button>
          <button class="btn ghost" id="download">Download — coming soon</button>
        </div>

        <section class="reviews reveal">
          <div class="reviews-heading">
            <div>
              <div class="eyebrow">Community feedback</div>
              <h2>Ratings & reviews</h2>
            </div>
            <span class="review-total">${reviews.length} reviews</span>
          </div>

          <form class="reviewform" id="reviewform">
            <select id="rating" aria-label="Rating">
              <option value="5">★★★★★ 5 stars</option>
              <option value="4">★★★★☆ 4 stars</option>
              <option value="3">★★★☆☆ 3 stars</option>
              <option value="2">★★☆☆☆ 2 stars</option>
              <option value="1">★☆☆☆☆ 1 star</option>
            </select>
            <textarea id="reviewtext" maxlength="2000" rows="2"
              placeholder="Share your experience…"></textarea>
            <button class="btn">Post review ↗</button>
          </form>

          <div class="review-list">
            ${reviews.map(r => `
              <div class="review">
                <div class="review-top">
                  <b>★ ${Number(r.rating) || 0}/5</b>
                  <span>${esc(names[r.user_id] || "ROW.GG member")}</span>
                </div>
                <p>${esc(r.review_text || "No comment")}</p>
              </div>
            `).join("") || '<p class="muted">No reviews yet. Be the first to share your experience.</p>'}
          </div>
        </section>
      </section>`;

    document.querySelector("#buy").onclick = () =>
      toast("Purchase options are not configured yet.");

    document.querySelector("#download").onclick = () =>
      toast("Download link not configured yet.");

    document.querySelector("#reviewform").onsubmit = async e => {
      e.preventDefault();

      if (!user) {
        toast("Log in to post a review.");
        go("/log-in");
        return;
      }

      if (!sb) {
        toast("Supabase is not configured.");
        return;
      }

      const button = e.currentTarget.querySelector("button");
      button.disabled = true;
      button.textContent = "Saving…";

      const { error } = await sb.from("app_reviews").upsert({
        user_id: user.id,
        app_slug: slug,
        rating: +document.querySelector("#rating").value,
        review_text: document.querySelector("#reviewtext").value.trim()
      }, {
        onConflict: "user_id,app_slug"
      });

      if (error) {
        toast(error.message);
        button.disabled = false;
        button.textContent = "Post review ↗";
        return;
      }

      toast("Review saved");
      detail(slug);
    };

    revealElements();
  }

  function auth(signup) {
    const displayField = signup ? `
      <div class="field">
        <label for="displayname">DISPLAY NAME</label>
        <input id="displayname" minlength="3" maxlength="20"
          pattern="[A-Za-z0-9_]+" placeholder="Your display name"
          autocomplete="nickname" required>
        <small>3–20 characters · letters, numbers and underscores</small>
      </div>` : "";

    app.innerHTML = `
      <section class="authwrap">
        <div class="auth reveal">
          <div class="auth-mark">R</div>
          <div class="eyebrow">ROW.GG ACCOUNT</div>
          <h1>${signup ? "Create your account." : "Welcome back."}</h1>
          <p>${signup
            ? "Join ROW.GG to review products and chat."
            : "Log in to continue to ROW.GG."}</p>

          <form id="authform">
            ${displayField}
            <div class="field">
              <label for="email">EMAIL</label>
              <input id="email" type="email" autocomplete="email" required>
            </div>
            <div class="field">
              <label for="password">PASSWORD</label>
              <input id="password" type="password" minlength="8"
                autocomplete="${signup ? "new-password" : "current-password"}" required>
            </div>
            <button class="btn auth-submit">${signup ? "Create account" : "Log in"}</button>
            <div id="formmsg" aria-live="polite"></div>
          </form>

          <p class="auth-switch">
            ${signup
              ? 'Already registered? <a href="/log-in">Log in</a>'
              : 'New here? <a href="/sign-up">Create an account</a>'}
          </p>
        </div>
      </section>`;

    document.querySelector("#authform").onsubmit = async e => {
      e.preventDefault();

      const m = document.querySelector("#formmsg");
      const button = e.currentTarget.querySelector("button");

      if (!sb) {
        m.className = "error";
        m.textContent = "Supabase configuration is missing.";
        return;
      }

      const username = signup
        ? document.querySelector("#displayname").value.trim()
        : "";

      const email = document.querySelector("#email").value.trim();
      const password = document.querySelector("#password").value;

      if (signup && !validName(username)) {
        m.className = "error";
        m.textContent = "Display name must be 3–20 characters and use only letters, numbers or underscores.";
        return;
      }

      button.disabled = true;
      button.textContent = signup ? "Creating account…" : "Logging in…";

      if (signup) {
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: {
            data: { username }
          }
        });

        if (error) {
          m.className = "error";
          m.textContent = error.message;
          button.disabled = false;
          button.textContent = "Create account";
          return;
        }

        if (data.session) {
          await refresh();
          toast("Welcome to ROW.GG, " + username + "!");
          go("/products");
          return;
        }

        m.className = "message";
        m.textContent =
          "Account created. Check your email if confirmation is enabled in Supabase.";

        button.disabled = false;
        button.textContent = "Create account";
      } else {
        const { error } = await sb.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          m.className = "error";
          m.textContent = error.message;
          button.disabled = false;
          button.textContent = "Log in";
          return;
        }

        await refresh();
        toast("Welcome back, " + displayName() + "!");
        go("/products");
      }
    };

    revealElements();
  }

  function revealElements() {
    const els = document.querySelectorAll(".reveal:not(.is-visible)");

    if (!("IntersectionObserver" in window)) {
      els.forEach(x => x.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .08 });

    els.forEach(el => observer.observe(el));
  }

  async function render() {
    const p = location.pathname.replace(/\/+$/, "") || "/";

    if (p === "/") app.innerHTML = home();
    else if (p === "/products") await catalog();
    else if (/^\/products\/app\d+$/.test(p)) await detail(p.split("/").pop());
    else if (p === "/log-in") auth(false);
    else if (p === "/sign-up") auth(true);
    else app.innerHTML = '<p>Page not found. <a href="/">Home</a></p>';

    navRender();
    revealElements();
  }

  /* ----------------------------------
     EMOJI LIBRARY
  ---------------------------------- */

  const emojiCategories = {
    "Smileys": [
      "😀","😃","😄","😁","😆","😅","😂","🤣","🥲","😊","😇","🙂","🙃","😉",
      "😍","🥰","😘","😋","😎","🤓","🧐","🤩","🥳","😏","😴","🥱","😭","😢",
      "😤","😡","🤬","😱","😨","😰","🤔","🤫","🤭","🫡","🤗","🫠","🤯","🥶",
      "🥵","🤮","🤧","😷","🤒","🤕","💀","👻","🤖","👽","🎃","😈","👿","💩",
      "😺","😸","😹","😻","😼","😽","🙀","😿","😾"
    ],
    "Hands": [
      "👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🫰","🤟","🤘",
      "🤙","👈","👉","👆","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏",
      "🙌","👐","🤲","🙏","💪","🫶","🖕","✍️","💅","🤝"
    ],
    "Hearts": [
      "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞",
      "💓","💗","💖","💘","💝","💟","♥️","💌","❤️‍🔥","❤️‍🩹"
    ],
    "Gaming": [
      "🎮","🕹️","👾","🎯","🏆","🥇","🥈","🥉","⚔️","🛡️","🗡️","🏹","💎",
      "🔮","🧪","🧙","🧝","🧛","🧟","🐉","👑","🚀","💥","✨","⚡","🔥",
      "🌟","💫","☠️","🪄","🎲","🃏","♟️","🎰","🏅","🎖️"
    ],
    "Animals": [
      "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷",
      "🐸","🐵","🙈","🙉","🙊","🐔","🐧","🐦","🦆","🦅","🦉","🦇","🐺",
      "🐗","🐴","🦄","🐝","🦋","🐌","🐞","🐢","🐍","🦖","🐙","🦈","🐬",
      "🐳","🦀","🐠","🐟","🦜","🦚","🦩","🦔","🦥","🦦","🦨","🦡"
    ],
    "Food": [
      "🍎","🍊","🍋","🍉","🍇","🍓","🫐","🍒","🍑","🥭","🍍","🥥","🥝",
      "🍅","🥑","🍆","🥕","🌽","🌶️","🥒","🥬","🥦","🍄","🥜","🍞","🥐",
      "🥨","🧀","🍔","🍟","🍕","🌭","🥪","🌮","🌯","🍿","🍩","🍪","🎂",
      "🍰","🧁","🍫","🍭","🧋","☕","🥤","🍦","🍧","🍨","🍪","🍜","🍣"
    ],
    "Activities": [
      "⚽","🏀","🏈","⚾","🎾","🏐","🏉","🎱","🏓","🏸","🥊","🥋","⛳",
      "🎣","🤿","🎿","🏂","🏄","🚴","🏋️","🧘","🎤","🎧","🎼","🎹","🥁",
      "🎸","🎻","🎬","🎨","🎭","🎪","🎫","🎟️","🏹","🛹","🛼"
    ],
    "Travel": [
      "🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🚚","🚜","🏍️",
      "🛵","🚲","✈️","🚀","🛸","🚁","⛵","🚢","⚓","🚉","🚂","🚆","🚇",
      "🏠","🏰","🗼","🗽","🌋","🏝️","🏖️","🏕️","🌍","🌎","🌏"
    ],
    "Objects": [
      "⌚","📱","💻","⌨️","🖥️","🖱️","💾","💿","📷","📸","🎥","📺","📻",
      "🔋","🔌","💡","🔦","📚","📖","✏️","🖊️","📝","📌","📎","✂️","🔒",
      "🔑","🔨","⚙️","🧲","🧰","🎁","🎉","🎊","📦","💰","💵","💳","🛒",
      "🔍","🔭","🧭","🕯️","🧸","🪑","🛏️","🪞","🪟"
    ],
    "Symbols": [
      "✅","❌","❓","❗","💯","♻️","⚠️","🚫","🔞","⭐","🌈","☀️","🌙",
      "☁️","⛈️","❄️","☂️","♨️","🔔","🔕","🎵","🎶","➕","➖","✖️","➗",
      "♾️","©️","™️","🔴","🟠","🟡","🟢","🔵","🟣","⚫","⚪","🟤",
      "⬆️","⬇️","⬅️","➡️","↗️","↘️","↙️","↖️","🔃","🔄","🔁","🔂"
    ],
    "Flags": [
      "🏁","🚩","🎌","🏳️","🏴","🏳️‍🌈","🏳️‍⚧️","🇧🇩","🇺🇸","🇬🇧",
      "🇨🇦","🇦🇺","🇯🇵","🇰🇷","🇮🇳","🇵🇰","🇧🇷","🇩🇪","🇫🇷","🇮🇹",
      "🇪🇸","🇷🇺","🇹🇷","🇸🇦","🇦🇪","🇳🇵","🇱🇰","🇨🇳","🇸🇬","🇲🇾"
    ]
  };

  const emojiAliases = {
    "smile": ["😀","😃","😄","😁","😊","🙂","😺","😸"],
    "happy": ["😀","😃","😄","😁","😊","🥳","😆","🤩"],
    "laugh": ["😂","🤣","😆","😹"],
    "cry": ["😭","😢","🥲","😿"],
    "love": ["❤️","😍","🥰","😘","💕","💖","💗"],
    "heart": ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔"],
    "fire": ["🔥","❤️‍🔥"],
    "cool": ["😎","🆒","🤙"],
    "gaming": ["🎮","🕹️","👾","🏆","⚔️","🛡️"],
    "game": ["🎮","🕹️","👾","🏆","⚔️","🛡️"],
    "angry": ["😡","🤬","😤","👿"],
    "sad": ["😭","😢","🥲","😿"],
    "dead": ["💀","☠️"],
    "ghost": ["👻"],
    "rocket": ["🚀"],
    "star": ["⭐","🌟","💫"],
    "thumb": ["👍","👎"],
    "yes": ["👍","✅","🙌"],
    "no": ["👎","❌"],
    "party": ["🥳","🎉","🎊","🎂"],
    "food": ["🍔","🍕","🍟","🍎","🍉","🍩"],
    "cat": ["🐱","😺","😸","😹","😻"],
    "dog": ["🐶","🐕","🐩"],
    "money": ["💰","💵","💳","🤑"],
    "music": ["🎵","🎶","🎧","🎤"]
  };

  function addEmoji(emoji) {
    const input = document.querySelector("#chat-input");
    if (!input) return;

    input.value += emoji;
    input.focus();
  }

  function renderEmojiPicker() {
    const categories = document.querySelector("#emoji-categories");
    const grid = document.querySelector("#emoji-grid");
    const search = document.querySelector("#emoji-search");

    if (!categories || !grid || !search) return;

    categories.innerHTML = Object.keys(emojiCategories).map(name => `
      <button type="button"
        class="${name === activeEmojiCategory ? "selected" : ""}"
        data-category="${esc(name)}">${esc(name)}</button>
    `).join("");

    const draw = () => {
      const q = search.value.trim().toLowerCase();
      let emojis;

      if (q) {
        const matchingAliases = Object.entries(emojiAliases)
          .filter(([word]) => word.includes(q))
          .flatMap(([, values]) => values);

        const all = Object.values(emojiCategories).flat();

        emojis = [
          ...matchingAliases,
          ...all.filter(emoji => emoji.includes(q))
        ];
      } else {
        emojis = emojiCategories[activeEmojiCategory] || [];
      }

      emojis = [...new Set(emojis)];

      grid.innerHTML = emojis.length
        ? emojis.map(e => `
            <button type="button" class="emoji-choice"
              data-emoji="${esc(e)}" aria-label="Add ${esc(e)}">${e}</button>
          `).join("")
        : '<span class="emoji-empty">No matching emojis. Try another search.</span>';
    };

    categories.onclick = e => {
      const btn = e.target.closest("[data-category]");
      if (!btn) return;

      activeEmojiCategory = btn.dataset.category;
      search.value = "";

      categories.querySelectorAll("button").forEach(b => {
        b.classList.toggle("selected", b === btn);
      });

      draw();
    };

    search.oninput = draw;

    grid.onclick = e => {
      const btn = e.target.closest("[data-emoji]");
      if (btn) addEmoji(btn.dataset.emoji);
    };

    draw();
  }

  /* ----------------------------------
     CHAT MESSAGE AND MEDIA FUNCTIONS
  ---------------------------------- */

  function chatMsg(m) {
    const own = m.user_id === user?.id;
    let media = null;
    let body = m.message || "";

    if (body.startsWith("[ROWMEDIA]")) {
      try {
        media = JSON.parse(body.slice(10));
        body = media.caption || "";
      } catch {
        media = null;
      }
    }

    const safeMediaUrl =
      typeof media?.url === "string" && /^https:\/\//i.test(media.url)
        ? media.url
        : "";

    const mediaHtml = safeMediaUrl
      ? `<div class="chat-media">
          ${media.type === "video"
            ? `<video controls preload="metadata" src="${esc(safeMediaUrl)}"></video>`
            : `<a href="${esc(safeMediaUrl)}" target="_blank" rel="noopener">
                 <img loading="lazy" src="${esc(safeMediaUrl)}" alt="Chat attachment">
               </a>`}
        </div>`
      : "";

    return `
      <div class="msg ${own ? "own" : ""}">
        <b>${own ? "You" : esc(m.display_name || "ROW.GG member")}</b>
        ${body ? `<div class="msg-text">${esc(body)}</div>` : ""}
        ${mediaHtml}
      </div>`;
  }

  async function sendChatMedia(url, type, caption) {
    if (!sb || !user) {
      toast("Log in to send media.");
      return;
    }

    const { error } = await sb.from("chat_messages").insert({
      user_id: user.id,
      message: "[ROWMEDIA]" + JSON.stringify({
        url,
        type,
        caption
      })
    });

    if (error) toast(error.message);
  }

  async function uploadChatFile(file) {
    if (!sb || !user) {
      toast("Log in to upload media.");
      return;
    }

    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await sb.storage
      .from("chat-media")
      .upload(path, file, {
        upsert: false,
        contentType: file.type
      });

    if (uploadError) {
      toast("Upload failed: " + uploadError.message);
      return;
    }

    const { data } = sb.storage.from("chat-media").getPublicUrl(path);

    await sendChatMedia(
      data.publicUrl,
      file.type.startsWith("video/") ? "video" : "image",
      ""
    );
  }

  /* ----------------------------------
     TENOR GIF SEARCH
  ---------------------------------- */

  async function searchGifs() {
    const input = document.querySelector("#gif-search");
    const results = document.querySelector("#gif-results");
    const status = document.querySelector("#gif-status");
    const key = window.ROW_CONFIG?.tenorKey;

    if (!input || !results || !status) return;

    const query = input.value.trim();

    if (!query) {
      status.textContent = "Type something to search for GIFs.";
      results.innerHTML = "";
      return;
    }

    if (!key || key.includes("PASTE_")) {
      status.textContent = "Tenor API key is not configured. Add it to config.js.";
      results.innerHTML = "";
      return;
    }

    status.textContent = "Searching GIFs…";
    results.innerHTML = "";

    try {
      const params = new URLSearchParams({
        key,
        client_key: "rowgg_chat",
        q: query,
        limit: "30",
        contentfilter: "high",
        media_filter: "tinygif,gif"
      });

      const response = await fetch(
        `https://tenor.googleapis.com/v2/search?${params}`
      );

      if (!response.ok) {
        throw new Error("GIF search is unavailable. Please try again.");
      }

      const data = await response.json();

      const gifs = (data.results || []).filter(gif => {
        const preview = gif.media_formats?.tinygif?.url;
        const full = gif.media_formats?.gif?.url;

        return preview && full &&
          /^https:\/\//i.test(preview) &&
          /^https:\/\//i.test(full);
      });

      if (!gifs.length) {
        status.textContent = "No GIFs found. Try another search.";
        return;
      }

      status.textContent = `${gifs.length} GIFs found. Select one to send.`;

      results.innerHTML = gifs.map(gif => {
        const preview = gif.media_formats.tinygif.url;
        const full = gif.media_formats.gif.url;

        return `
          <button type="button" class="gif-result"
            data-gif="${esc(full)}" title="Send GIF">
            <img loading="lazy" src="${esc(preview)}" alt="GIF preview">
          </button>`;
      }).join("");

    } catch (error) {
      status.textContent = error.message || "Could not load GIFs.";
    }
  }

  function setupEmojiAndGif() {
    const emojiPanel = document.querySelector("#emoji-panel");
    const gifPanel = document.querySelector("#gif-panel");
    const emojiToggle = document.querySelector("#emoji-toggle");
    const gifToggle = document.querySelector("#gif-toggle");
    const gifSearch = document.querySelector("#gif-search");
    const gifSearchBtn = document.querySelector("#gif-search-btn");
    const gifResults = document.querySelector("#gif-results");

    if (emojiToggle && emojiPanel) {
      emojiToggle.onclick = () => {
        const opening = emojiPanel.hidden;
        emojiPanel.hidden = !opening;

        if (gifPanel) gifPanel.hidden = true;
        if (opening) renderEmojiPicker();
      };
    }

    if (gifToggle && gifPanel) {
      gifToggle.onclick = () => {
        const opening = gifPanel.hidden;
        gifPanel.hidden = !opening;

        if (emojiPanel) emojiPanel.hidden = true;
        if (opening) gifSearch?.focus();
      };
    }

    if (gifSearchBtn) {
      gifSearchBtn.onclick = searchGifs;
    }

    if (gifSearch) {
      gifSearch.onkeydown = e => {
        if (e.key === "Enter") {
          e.preventDefault();
          searchGifs();
        }
      };
    }

    if (gifResults) {
      gifResults.onclick = async e => {
        const button = e.target.closest("[data-gif]");
        if (!button) return;

        const url = button.dataset.gif;

        if (!/^https:\/\/media\.tenor\.com\//i.test(url)) {
          toast("That GIF link is not valid.");
          return;
        }

        button.disabled = true;
        await sendChatMedia(url, "image", "");

        if (gifPanel) gifPanel.hidden = true;
        toast("GIF sent!");
      };
    }
  }

  /* ----------------------------------
     OPEN GLOBAL CHAT
  ---------------------------------- */

  async function openChat() {
    const chat = document.querySelector("#chat");
    const shade = document.querySelector("#shade");

    chat.classList.add("open");
    shade.classList.add("open");

    const note = document.querySelector("#chat-note");
    const form = document.querySelector("#chat-form");
    const list = document.querySelector("#messages");

    if (!user) {
      note.innerHTML = `
        <div class="guest-chat-icon">✉</div>
        <strong>Please sign in to start a conversation</strong>
        <span>Log in to join the ROW.GG community chat.</span>
        <a class="guest-chat-login" href="/log-in">Log in</a>`;

      note.classList.add("guest-only");
      note.style.display = "flex";
      list.style.display = "none";
      form.classList.remove("active");
      return;
    }

    note.style.display = "none";
    note.classList.remove("guest-only");
    list.style.display = "block";
    form.classList.add("active");

    if (!sb) {
      toast("Supabase is not configured.");
      return;
    }

    if (!chatStarted) {
      const { data, error } = await sb
        .from("chat_messages")
        .select("id,user_id,message,created_at")
        .order("created_at")
        .limit(100);

      if (error) {
        toast(error.message);
        return;
      }

      const rows = data || [];
      const names = await getNames(rows.map(x => x.user_id));

      list.innerHTML = rows.map(x =>
        chatMsg({
          ...x,
          display_name: names[x.user_id]
        })
      ).join("");

      list.scrollTop = list.scrollHeight;

      if (channel) await sb.removeChannel(channel);

      channel = sb.channel("rowgg-chat")
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "chat_messages"
        }, async payload => {
          const newNames = await getNames([payload.new.user_id]);

          list.insertAdjacentHTML(
            "beforeend",
            chatMsg({
              ...payload.new,
              display_name: newNames[payload.new.user_id]
            })
          );

          list.scrollTop = list.scrollHeight;
        })
        .subscribe();

      chatStarted = true;
    }

    form.onsubmit = async e => {
      e.preventDefault();

      const input = document.querySelector("#chat-input");
      const message = input.value.trim();

      if (!message) return;

      const send = form.querySelector(".chat-send");
      send.disabled = true;

      const { error } = await sb.from("chat_messages").insert({
        user_id: user.id,
        message
      });

      if (error) {
        toast(error.message);
      } else {
        input.value = "";
      }

      send.disabled = false;
      input.focus();
    };

    setupEmojiAndGif();

    document.querySelector("#chat-file").onchange = async e => {
      const file = e.target.files?.[0];
      e.target.value = "";

      if (!file) return;

      if (!/^(image\/(png|jpeg|webp|gif)|video\/(mp4|webm|quicktime))$/.test(file.type)) {
        toast("Choose a JPG, PNG, WEBP, GIF, MP4 or WEBM file.");
        return;
      }

      if (file.size > 25 * 1024 * 1024) {
        toast("Files must be 25 MB or smaller.");
        return;
      }

      await uploadChatFile(file);
    };
  }

  /* ----------------------------------
     CHAT BUTTONS AND AUTH EVENTS
  ---------------------------------- */

  document.querySelector("#chat-open").onclick = openChat;

  document.querySelector("#chat-close").onclick = () => {
    document.querySelector("#chat").classList.remove("open");
    document.querySelector("#shade").classList.remove("open");
  };

  document.querySelector("#shade").onclick =
    document.querySelector("#chat-close").onclick;

  if (sb) {
    sb.auth.onAuthStateChange(async (_event, session) => {
      user = session?.user || null;
      profile = null;

      if (user) await loadProfile();

      navRender();
      chatStarted = false;
    });
  }

  refresh().then(render);
})();
