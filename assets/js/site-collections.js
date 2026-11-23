/* Eric Hart CMS: portfolio and blog frontend; Pages CMS remains the sole editing backend. */
(function () {
  "use strict";
  var page = document.body.getAttribute("data-cms-page");
  if (!page) return;

  function el(tag, cls, value) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (typeof value === "string") n.textContent = value;
    return n;
  }
  function url(value) {
    if (!value || typeof value !== "string") return "";
    try {
      var parsed = new URL(value, window.location.href);
      return ["http:", "https:"].indexOf(parsed.protocol) >= 0 ? parsed.href : "";
    } catch (e) { return ""; }
  }
  function fetchItems(file) {
    return fetch("data/" + file + ".json", { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error("加载失败：" + r.status);
      return r.json();
    }).then(function (v) { return Array.isArray(v) ? v : []; });
  }
  function published(items) {
    return items.filter(function (x) {
      return x && x.published === true && typeof x.slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x.slug);
    });
  }
  function empty(container, message) {
    var note = el("p", "cms-empty", message);
    container.replaceChildren(note);
  }
  function dateText(date) {
    return /^\d{4}-\d{2}-\d{2}/.test(String(date || "")) ? String(date).slice(0, 10) : "";
  }
  function image(src, alt, css) {
    var link = url(src);
    if (!link) return null;
    var n = el("img", css || "");
    n.src = link;
    n.alt = alt || "";
    n.loading = "lazy";
    return n;
  }
  function coverMedia(item, css) {
    var still = image(item.cover, item.title, css || "cover");
    var videoUrl = item.coverType === "video" ? url(item.coverVideo) : "";
    if (!videoUrl || !/\\.(mp4|webm)(?:[?#]|$)/i.test(videoUrl)) return still;
    var wrap = el("span", "cms-video-container");
    if (still) {
      still.classList.add("cms-video-poster");
      wrap.appendChild(still);
    }
    var v = el("video", (css || "cover") + " cms-video-cover");
    v.muted = true;
    v.defaultMuted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = "metadata";
    v.autoplay = false;
    v.setAttribute("muted", "");
    v.setAttribute("playsinline", "");
    v.setAttribute("aria-label", (item.title || "封面") + "短视频");
    if (still) v.poster = still.src;
    v.src = videoUrl;
    var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var stop = function () { v.pause(); };
    v.addEventListener("error", function () { wrap.classList.add("cms-video-failed"); stop(); });
    v.addEventListener("loadedmetadata", function () {
      if (Number.isFinite(v.duration) && (v.duration < 5 || v.duration > 10)) {
        console.info("建议把封面视频剪辑至5–10秒：", item.title || item.slug);
      }
    });
    v.addEventListener("playing", function () { wrap.classList.add("cms-video-playing"); });
    v.addEventListener("pause", function () { wrap.classList.remove("cms-video-playing"); });
    if (!reduced) {
      v.setAttribute("autoplay", "");
      var play = function () { v.play().catch(function () { /* fallback to poster */ }); };
      if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) { if (entry.isIntersecting) play(); else stop(); });
        }, { threshold: 0.3 });
        io.observe(v);
      } else {
        play();
      }
    }
    wrap.appendChild(v);
    return wrap;
  }
  function setMeta(kind, key, value) {
    var selector = "meta[" + kind + "=\"" + key + "\"]";
    var n = document.querySelector(selector);
    if (n) n.content = value;
  }
  function safeArticleHtml(raw) {
    /* Rich text is saved as HTML by Pages CMS; strict allowlist prevents script/event injection. */
    var doc = new DOMParser().parseFromString(String(raw || ""), "text/html");
    var allowed = {
      p: 1, h2: 1, h3: 1, h4: 1, h5: 1, h6: 1, strong: 1, b: 1, em: 1, i: 1,
      u: 1, s: 1, br: 1, ul: 1, ol: 1, li: 1, blockquote: 1, pre: 1, code: 1,
      a: 1, img: 1, hr: 1, table: 1, thead: 1, tbody: 1, tr: 1, th: 1, td: 1,
      figure: 1, figcaption: 1, span: 1, div: 1, sup: 1, sub: 1
    };
    function copy(node) {
      if (node.nodeType === 3) return document.createTextNode(node.nodeValue || "");
      if (node.nodeType !== 1) return document.createDocumentFragment();
      var tag = node.tagName.toLowerCase();
      if (["script", "style", "iframe", "form", "svg", "object", "template", "video", "audio"].indexOf(tag) >= 0) return document.createDocumentFragment();
      var next = allowed[tag] ? document.createElement(tag) : document.createDocumentFragment();
      if (tag === "a" && next.nodeType === 1) {
        var href = url(node.getAttribute("href"));
        if (href) {
          next.href = href;
          next.rel = "noopener noreferrer";
          next.target = "_blank";
        }
      }
      if (tag === "img" && next.nodeType === 1) {
        var src = url(node.getAttribute("src"));
        if (!src) return document.createDocumentFragment();
        next.src = src;
        next.alt = node.getAttribute("alt") || "";
        next.loading = "lazy";
      }
      if (next.nodeType === 1) {
        if (tag === "td" || tag === "th") {
          var colspan = +node.getAttribute("colspan");
          if (colspan >= 1 && colspan <= 8) next.colSpan = colspan;
        }
        var align = node.getAttribute("data-text-align") || node.getAttribute("align") || "";
        if (!align && node.style) align = node.style.textAlign || "";
        if (["left", "center", "right", "justify"].indexOf(align) !== -1) next.style.textAlign = align;
        if (node.style) {
          var color = node.style.color, size = node.style.fontSize;
          if (/^(#[0-9a-f]{3,8}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\))$/i.test(color)) next.style.color = color;
          if (/^(1[2-9]|2[0-8])px$/.test(size)) next.style.fontSize = size;
          var family = node.style.fontFamily.replace(/["\x27]/g, "").trim();
          if (/^(Arial|Georgia|SimSun|Microsoft YaHei|Times New Roman)$/i.test(family)) next.style.fontFamily = family;
        }
      }
      Array.prototype.forEach.call(node.childNodes, function (child) { next.appendChild(copy(child)); });
      return next;
    }
    var frag = document.createDocumentFragment();
    Array.prototype.forEach.call(doc.body.childNodes, function (node) { frag.appendChild(copy(node)); });
    return frag;
  }
  function failure(container) { empty(container, "内容暂时无法加载，请刷新后重试。"); }

  function renderBlog() {
    var root = document.querySelector("[data-cms-posts]");
    if (!root) return;
    fetchItems("posts").then(function (items) {
      items = published(items).sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); });
      root.replaceChildren();
      if (!items.length) return empty(root, "技术博客正在整理中，欢迎稍后再来。");
      items.forEach(function (post) {
        var card = el("article", "news-item box");
        var wrapper = el("div", "news-item__image-wrap overlay overlay--45");
        var anchor = el("a", "news-item__link");
        anchor.href = "single-post.html?id=" + encodeURIComponent(post.slug);
        anchor.setAttribute("aria-label", post.title || "阅读文章");
        wrapper.appendChild(anchor);
        var cover = coverMedia(post, "cover");
        if (cover) wrapper.appendChild(cover);
        else wrapper.classList.add("cms-image-fallback");
        card.appendChild(wrapper);
        var cap = el("div", "news-item__caption");
        var title = el("h2", "title title--h4");
        var titleLink = el("a", "", post.title || "未命名文章");
        titleLink.href = anchor.href;
        title.appendChild(titleLink);
        cap.appendChild(title);
        if (post.date || post.category) cap.appendChild(el("p", "cms-meta", [dateText(post.date), post.category].filter(Boolean).join(" · ")));
        if (post.excerpt) cap.appendChild(el("p", "", post.excerpt));
        card.appendChild(cap); root.appendChild(card);
      });
    }).catch(function () { failure(root); });
  }
  function renderWorks() {
    var root = document.querySelector("[data-cms-projects]");
    var controls = document.querySelector("[data-cms-project-filters]");
    if (!root || !controls) return;
    fetchItems("projects").then(function (items) {
      items = published(items);
      root.replaceChildren(); controls.replaceChildren();
      if (!items.length) return empty(root, "项目作品正在整理中，欢迎稍后查看。");
      var names = ["全部"].concat(Array.from(new Set(items.map(function (v) { return v.category || "其他"; }))));
      function draw(category) {
        root.replaceChildren();
        items.filter(function (v) { return category === "全部" || (v.category || "其他") === category; }).forEach(function (project) {
          var card = el("article", "cms-project-card");
          var cover = coverMedia(project, "cms-project-image");
          if (cover) card.appendChild(cover);
          var title = el("h3", "title title--h4", project.title || "未命名作品");
          card.appendChild(title);
          card.appendChild(el("p", "cms-meta", project.category || "其他"));
          if (project.description) card.appendChild(el("p", "", project.description));
          if (project.body) {
            var body = el("div", "cms-rich cms-project-body");
            body.appendChild(safeArticleHtml(project.body)); card.appendChild(body);
          }
          if (url(project.link)) {
            var link = el("a", "cms-more", "查看相关链接");
            link.href = url(project.link); link.target = "_blank"; link.rel = "noopener noreferrer";
            card.appendChild(link);
          }
          root.appendChild(card);
        });
        Array.prototype.forEach.call(controls.querySelectorAll("button"), function (button) {
          var active = button.getAttribute("data-category") === category;
          button.classList.toggle("active", active);
          button.setAttribute("aria-pressed", active ? "true" : "false");
        });
      }
      names.forEach(function (name) {
        var button = el("button", "cms-filter-button", name);
        button.type = "button"; button.setAttribute("data-category", name);
        button.addEventListener("click", function () { draw(name); });
        controls.appendChild(button);
      });
      draw("全部");
    }).catch(function () { failure(root); });
  }
  function renderPost() {
    var root = document.querySelector("[data-cms-post]");
    if (!root) return;
    var id = new URLSearchParams(window.location.search).get("id");
    if (!id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
      empty(root, "请选择技术博客列表中的文章。");
      return;
    }
    fetchItems("posts").then(function (items) {
      var post = published(items).find(function (p) { return p.slug === id; });
      if (!post) { empty(root, "文章不存在或尚未发布。"); return; }
      root.replaceChildren();
      document.title = (post.seoTitle || post.title || "技术文章") + " | Eric Hart 侯尧";
      setMeta("name", "description", post.seoDescription || post.excerpt || "");
      setMeta("property", "og:title", post.seoTitle || post.title || "");
      setMeta("property", "og:description", post.seoDescription || post.excerpt || "");
      setMeta("property", "og:url", window.location.href);
      root.appendChild(el("h1", "title title--h1", post.title || "未命名文章"));
      root.appendChild(el("p", "cms-meta", [dateText(post.date), post.category].filter(Boolean).join(" · ")));
      if (post.excerpt) root.appendChild(el("p", "cms-intro", post.excerpt));
      var cover = coverMedia(post, "cms-post-cover");
      if (cover) root.appendChild(cover);
      var body = el("div", "cms-rich");
      var size = ["14", "16", "18", "20"].indexOf(String(post.fontSize)) >= 0 ? post.fontSize : "16";
      body.style.fontSize = size + "px";
      var font = { system: "inherit", serif: "Georgia, 'Songti SC', 'SimSun', serif", sans: "Arial, 'Microsoft YaHei', sans-serif" };
      body.style.fontFamily = font[post.font] || "inherit";
      body.style.textAlign = ["left", "right", "center", "justify"].indexOf(post.align) >= 0 ? post.align : "left";
      body.appendChild(safeArticleHtml(post.body));
      root.appendChild(body);
      var back = el("p", "cms-back");var link = el("a", "", "返回技术博客");
      link.href = "blog.html"; back.appendChild(link); root.appendChild(back);
    }).catch(function () { failure(root); });
  }
  if (page === "blog") renderBlog();
  if (page === "projects") renderWorks();
  if (page === "post") renderPost();
})();
