// Every heading (h1-h6 alike) gets a plain sequential id ("1", "2", "3", ...)
// in document order, so any heading can be linked as "<page-url>#<n>". Each
// also gets a "#" permalink to that id, GitHub-style (hidden until hover).
function assignHeadingIds(root) {
  root.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((h, i) => {
    const id = String(i + 1);
    h.id = id;
    const anchor = document.createElement("a");
    anchor.href = `#${id}`;
    anchor.className = "heading-anchor";
    anchor.textContent = "#";
    anchor.setAttribute("aria-label", "Nuoroda į šią antraštę");
    h.prepend(anchor);
  });
}

// Images loading after we scroll grow the page and leave the scroll short, so
// wait for every image in the content to settle before scrolling to a heading.
function waitForImages(root) {
  const imgs = [...root.querySelectorAll("img")];
  return Promise.all(
    imgs.map(
      (img) =>
        img.complete ||
        new Promise((resolve) => {
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
        }),
    ),
  );
}

async function scrollToHash(contentEl) {
  await waitForImages(contentEl);
  if (!location.hash) {
    window.scrollTo(0, 0);
    return;
  }
  const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (target) target.scrollIntoView();
}

async function loadPage(slug) {
  const res = await fetch(`/pages/${slug}.md`);
  if (!res.ok) throw new Error(`Page not found: ${slug}`);
  const text = await res.text();

  const contentEl = document.getElementById("content");
  contentEl.innerHTML = marked.parse(text);
  assignHeadingIds(contentEl);

  renderMathInElement(contentEl, {
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "$", right: "$", display: false },
      { left: "\\(", right: "\\)", display: false },
      { left: "\\[", right: "\\]", display: true },
    ],
    throwOnError: false,
  });

  document.querySelectorAll("#nav a, #drawer-nav a").forEach((a) => {
    a.classList.toggle("active", a.dataset.slug === slug);
  });

  await scrollToHash(contentEl);
}

function currentSlug() {
  return window.location.pathname.replace(/^\//, "") || "index";
}

function navigate(slug) {
  const path = slug === "index" ? "/" : `/${slug}`;
  history.pushState(null, "", path);
  loadPage(slug);
}

function closeDrawer() {
  document.getElementById("drawer").classList.remove("open");
  document.getElementById("drawer-overlay").classList.remove("visible");
}

async function init() {
  const res = await fetch("/pages.json");
  const pages = await res.json();

  const links = pages
    .map(
      (p) =>
        `<a href="${p.slug === "index" ? "/" : "/" + p.slug}" data-slug="${p.slug}">${p.title}</a>`,
    )
    .join("");

  document.getElementById("nav").innerHTML = links;
  document.getElementById("drawer-nav").innerHTML = links;

  document.getElementById("nav").addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;
    e.preventDefault();
    navigate(a.dataset.slug);
  });

  document.getElementById("drawer-nav").addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;
    e.preventDefault();
    closeDrawer();
    navigate(a.dataset.slug);
  });

  document.getElementById("menu-toggle").addEventListener("click", () => {
    const drawer = document.getElementById("drawer");
    if (drawer.classList.contains("open")) {
      closeDrawer();
    } else {
      drawer.classList.add("open");
      document.getElementById("drawer-overlay").classList.add("visible");
    }
  });

  document
    .getElementById("drawer-overlay")
    .addEventListener("click", closeDrawer);

  loadPage(currentSlug());
}

window.addEventListener("popstate", () => loadPage(currentSlug()));

document.addEventListener("DOMContentLoaded", init);
