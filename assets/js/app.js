
const $ = id => document.getElementById(id);

export function toast(message) {
  let el = $("nemesisToast");
  if (!el) {
    el = document.createElement("div");
    el.id = "nemesisToast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = message;
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.remove(), 3200);
}

export function escapeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}
