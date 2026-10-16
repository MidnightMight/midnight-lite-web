// Midnight Lite site v2 prototype: shared header/footer, menu, filters, review mode (?review).
(() => {
  const review = new URLSearchParams(location.search).has("review");
  if (review) document.documentElement.classList.add("review");
  const page = document.body.dataset.page || "";
  const YT = "https://www.youtube.com/@midnightlite";
  const keep = href => review ? href + (href.includes("?") ? "&" : "?") + "review" : href;

  const links = [["index.html", "Home", "home"], ["projects.html", "Projects", "projects"], ["videos.html", "Videos", "videos"],
                 ["blog.html", "Build log", "blog"], ["tools.html", "Tools", "tools"], ["about.html", "About", "about"],
                 ["contact.html", "Contact", "contact"]];
  const header = document.querySelector("header[data-include]");
  if (header) {
    header.className = "site-header"; header.dataset.sec = header.dataset.sec || "NAV";
    header.innerHTML = `<div class="wrap">
      <a class="brand" href="${keep("index.html")}"><img src="assets/img/logo.svg" alt="">Midnight Lite</a>
      <button class="menu-btn" aria-label="Menu">Menu</button>
      <nav class="nav">${links.map(([h, t, k]) => `<a href="${keep(h)}" class="${k === page ? "active" : ""}">${t}</a>`).join("")}</nav>
      <a class="btn yt small nav-cta" href="${YT}">▶ YouTube</a>
    </div>`;
    header.querySelector(".menu-btn").onclick = () => header.querySelector(".nav").classList.toggle("open");
  }
  const footer = document.querySelector("footer[data-include]");
  if (footer) {
    footer.className = "site-footer"; footer.dataset.sec = footer.dataset.sec || "FOOT";
    footer.innerHTML = `<div class="wrap">
      <div><a class="brand" href="${keep("index.html")}"><img src="assets/img/logo.svg" alt="">Midnight Lite</a>
        <p>3D printing, robots, photography and electric stuff. Built in the open, documented as I go.</p></div>
      <div><h4>Explore</h4><a href="${keep("projects.html")}">Projects</a><a href="${keep("videos.html")}">Videos</a><a href="${keep("blog.html")}">Build log</a><a href="${keep("tools.html")}">Tools</a></div>
      <div><h4>Follow</h4><a href="${YT}">YouTube</a><a href="#">Instagram</a><a href="https://github.com/MidnightMight">GitHub</a></div>
      <div><h4>Contact</h4><a href="mailto:enquiry@midnight-lite.com">enquiry@midnight-lite.com</a><a href="${keep("contact.html")}">Contact form</a><a href="${keep("about.html")}">About</a></div>
      <div class="legal">© ${new Date().getFullYear()} Midnight Lite. Made by hand, mostly after midnight.</div>
    </div>`;
  }
  if (review) document.querySelectorAll("a[href$='.html']").forEach(a => { if (!a.closest("header,footer")) a.href = keep(a.getAttribute("href")); });

  // "Now making" strip: edit assets/now.json (one line) and the home page updates itself.
  const now = document.querySelector("[data-now]");
  if (now) fetch("assets/now.json").then(r => r.json()).then(n => {
    now.querySelector("[data-now-text]").innerHTML = `<a href="${keep(n.link)}">${n.project}</a> · ${n.stage}`;
    now.querySelector(".bar span").style.width = n.percent + "%";
    now.querySelector("[data-now-pct]").textContent = n.percent + "%";
  }).catch(() => {});
  document.querySelectorAll("a[data-yt]").forEach(a => a.href = YT);

  // project filters (projects.html)
  document.querySelectorAll("[data-filter]").forEach(chip => chip.addEventListener("click", () => {
    document.querySelectorAll("[data-filter]").forEach(c => c.classList.toggle("on", c === chip));
    const f = chip.dataset.filter;
    document.querySelectorAll("[data-cat]").forEach(card => { card.style.display = f === "all" || card.dataset.cat.includes(f) ? "" : "none"; });
  }));
})();
