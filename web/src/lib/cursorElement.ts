import cursorSvg from "../assets/cursors/Cursor.svg?raw";

export function createRemoteCursorEl(
  initials: string,
  color: string
): HTMLDivElement {
  const container = document.createElement("div");
  container.style.display = "inline-flex";
  container.style.alignItems = "center";
  container.style.gap = "6px";
  container.style.pointerEvents = "none";
  container.style.color = color; // tints SVG and pill border via currentColor
  container.style.filter = "drop-shadow(0 1px 2px rgba(0,0,0,0.25))";

  const iconWrap = document.createElement("div");
  iconWrap.style.width = "24px";
  iconWrap.style.height = "25px";
  iconWrap.style.display = "inline-block";
  iconWrap.innerHTML = cursorSvg;

  const label = document.createElement("div");
  label.style.background = "currentColor";
  label.style.border = "2px solid currentColor";
  label.style.borderRadius = "12px";
  label.style.padding = "2px 6px";
  label.style.fontSize = "12px";
  label.style.lineHeight = "16px";
  label.style.whiteSpace = "nowrap";

  const span = document.createElement("span");
  span.textContent = initials || "??";
  span.style.color = "#fff";
  label.appendChild(span);

  container.appendChild(iconWrap);
  container.appendChild(label);
  return container;
}
