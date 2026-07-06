async function loadPage(slug) {
  const res = await fetch(`/pages/${slug}.md`);
  if (!res.ok) throw new Error(`Page not found: ${slug}`);
  const text = await res.text();

  const contentEl = document.getElementById("content");
  contentEl.innerHTML = marked.parse(text);

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
