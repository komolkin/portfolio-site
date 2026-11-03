const fills = [
  { name: "hellored", side: "buy", outcome: "No", price: 28, market: "Will the Democrats win the Texas Senate race in 2026?", size: 11200, when: "3 min ago", color: "#7c3aed" },
  { name: "SAPolitcsSeer", side: "buy", outcome: "Yes", price: 95, market: "Will the Democratic Party control the House after the 2026 Midterm elections?", size: 10100, when: "3 min ago", color: "#0891b2" },
  { name: "RollAwayTheDew", side: "buy", outcome: "No", price: 27, market: "Will the Democrats win the Texas Senate race in 2026?", size: 10100, when: "3 min ago", color: "#b45309" },
  { name: "hellored", side: "buy", outcome: "No", price: 25, market: "Will the Democratic Party control the Senate after the 2026 Midterm elections?", size: 25000, when: "4 min ago", color: "#7c3aed" },
  { name: "mooseborzoi", side: "buy", outcome: "Yes", price: 48, market: "Will Galatasaray SK win on 2026-11-03?", size: 39700, when: "5 min ago", color: "#be123c" },
  { name: "ferrariChampions2026", side: "buy", outcome: "Under", price: 46, market: "Buffalo vs. Miami (OH): O/U 43.5", size: 23100, when: "8 min ago", color: "#047857" },
  { name: "Erasmus.", side: "buy", outcome: "No", price: 76, market: "Will the Republican Party control the Senate after the 2026 Midterm elections?", size: 13300, when: "8 min ago", color: "#1d4ed8" },
  { name: "Erasmus.", side: "buy", outcome: "Yes", price: 76, market: "Will the Democratic Party control the Senate after the 2026 Midterm elections?", size: 10900, when: "8 min ago", color: "#1d4ed8" }
];

const winners = [
  ["Substantial-Service", "0x2c33…0563", "+$519K", "7.55M shares", "#0ea5e9"],
  ["Thunderous-Authoritarian-Snarl", "0x549b…c0ae", "+$294K", "1.69M shares", "#7c3aed"],
  ["surfandturf", "0x9f2f…2ca8", "+$248K", "385K shares", "#0891b2"],
  ["EdZachary", "0xe5b7…5ee3", "+$243K", "328K shares", "#b45309"],
  ["RJW1", "0x85f0…3f67", "+$234K", "147K shares", "#be123c"],
  ["HomeRunHazard", "0x5268…135d", "+$232K", "791K shares", "#047857"],
  ["0x4924…3782", "0x4924…3782", "+$217K", "434K shares", "#334155"],
  ["ch27er", "0x61a3…e508", "+$213K", "1.59M shares", "#1d4ed8"],
  ["BreakTheBank", "0xf031…c80c", "+$212K", "2.83M shares", "#a16207"],
  ["monkeymashingkeyboard", "0x684b…8409", "+$205K", "104K shares", "#0f766e"]
];

const people = [
  { tone: "purple", badge: "Largest buy · 15 h", name: "f2hf84hg52h5", wallet: "0x4b29…716f", text: "The largest single buy of the last 15 hours: $304K of Yes at 95¢.", ref: "Will the Democratic Party control the House after the 2026 Midterm elections?", facts: [["Shares", "320K"], ["Price", "95¢"], ["Paid", "$304K"]] },
  { tone: "gold", badge: "Biggest win today", name: "Substantial-Service", wallet: "0x2c33…0563", text: "+$519K P&L today on 7.55M shares traded, #1 on today’s board.", ref: "", facts: [["P&L today", "+$519K"], ["Shares today", "7.55M"], ["Rank", "#1"]] },
  { tone: "green", badge: "Most big fills", name: "fantasy7788", wallet: "0x0259…769e", text: "15 fills of $10K or more in 15 hours: $1.1M across 9 markets.", ref: "", facts: [["Fills", "15"], ["Total", "$1.1M"], ["Markets", "9"]] }
];

const shelves = {
  movers: {
    rule: "Biggest 24-hour moves, in points · rows with $5K+ traded today · as of 5:49 PM",
    link: "All markets, moving now",
    cards: [
      { tag: "Economy", title: "US announces end of Iranian blockade by…?", rows: [["November 15", "-6.0 pts", "11%"], ["December 31", "-4.2 pts", "41%"]], foot: ["ends in 13 d", "47.1M shares · 1.07M today"] },
      { tag: "Politics", title: "Which party will win the Senate in 2026?", rows: [["Republican Party", "-4.0 pts", "24%"], ["Democratic Party", "+3.0 pts", "77%"]], foot: ["ends in 12 h", "19.5M shares · 3.23M today"] },
      { tag: "Politics", title: "Florida Governor Election Winner", rows: [["David Jolly (D)", "-4.0 pts", "35%"], ["Byron Donalds (R)", "+3.0 pts", "66%"]], foot: ["ends in 12 h", "2.28M shares · 852K today"] }
    ]
  },
  closing: { rule: "Next to be decided, soonest first · $10K+ traded, recurring series aside", link: "All markets, closing soon", cards: [] },
  today: { rule: "Most money traded in the last 24 hours", link: "All markets, biggest today", cards: [] },
  live: { rule: "Games in play, then the next 6 hours of kick-offs", link: "All markets, live & soon", cards: [] },
  whales: { rule: "Markets by the money in their $10K+ fills over 15 h · near-settled fills aside", link: "Open the whale radar", cards: [] }
};

const tape = [
  ["$229K", "BUY", "No @ 73¢", "Will the Republicans win the Texas Senate race in 2026?", "6m ago"],
  ["$52K", "SELL", "No @ 66¢", "Will Benjamin Netanyahu be the next Prime Minister of Israel?", "21m ago"],
  ["$100K", "BUY", "Yes @ 77¢", "Will FC Barcelona win on 2026-11-03?", "48m ago"],
  ["$67K", "BUY", "Yes @ 95¢", "Will the Democratic Party control the House after the 2026 Midterm elections?", "1h ago"],
  ["$97K", "BUY", "Club Atlético de Madrid @ 97¢", "Spread: FC Bayern München (-3.5)", "1h ago"],
  ["$51K", "BUY", "No @ 98¢", "Will China invade Taiwan by end of 2026?", "1h ago"],
  ["$137K", "BUY", "Invictus Gaming @ 55¢", "LoL: Top Esports vs Invictus Gaming (BO5) - Worlds Playoffs", "2h ago"],
  ["$125K", "BUY", "Invictus Gaming @ 56¢", "LoL: Top Esports vs Invictus Gaming (BO5) - Worlds Playoffs", "2h ago"],
  ["$120K", "BUY", "Club Atlético de Madrid @ 97¢", "Spread: FC Bayern München (-3.5)", "2h ago"],
  ["$190K", "BUY", "Genaro Alberto Olivieri @ 95¢", "Villa María: Valentino Grippo vs Genaro Alberto Olivieri", "3h ago"],
  ["$98K", "BUY", "No @ 95¢", "2026 Balance of Power: R Senate, R House", "4h ago"],
  ["$125K", "BUY", "No @ 96¢", "Will the Iranian regime fall before 2027?", "5h ago"],
  ["$50K", "BUY", "Natus Vincere @ 71¢", "Counter-Strike: FURIA vs Natus Vincere (BO3) - IEM Beijing Group A", "6h ago"],
  ["$52K", "BUY", "FURIA @ 56¢", "Counter-Strike: FURIA vs Natus Vincere (BO3) - IEM Beijing Group A", "7h ago"],
  ["$76K", "BUY", "FURIA @ 54¢", "Counter-Strike: FURIA vs Natus Vincere (BO3) - IEM Beijing Group A", "7h ago"],
  ["$87K", "BUY", "Natus Vincere @ 47¢", "Counter-Strike: FURIA vs Natus Vincere (BO3) - IEM Beijing Group A", "7h ago"],
  ["$53K", "BUY", "TheMongolz @ 50¢", "Counter-Strike: TheMongolz vs Heroic - Map 2 Winner", "8h ago"],
  ["$60K", "BUY", "Team Falcons @ 67¢", "Counter-Strike: FaZe vs Team Falcons (BO3) - IEM Beijing Group A", "8h ago"],
  ["$77K", "BUY", "No @ 100¢", "US x Iran ceasefire continues through November 3?", "8h ago"],
  ["$163K", "BUY", "Yes @ 77¢", "2026 Balance of Power: D Senate, D House", "8h ago"],
  ["$70K", "BUY", "Yes @ 81¢", "Will the Democrats win the Michigan Senate race in 2026?", "10h ago"],
  ["$198K", "BUY", "Yes @ 95¢", "Will the Democratic Party control the House after the 2026 Midterm elections?", "11h ago"]
];

const money = (n) => n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n}`;
const state = { order: "latest", side: "all", period: "day", shelf: "movers", q: "" };

const fillsEl = document.querySelector("#fills");
const fillsEmpty = document.querySelector("#fills-empty");
const winnersEl = document.querySelector("#winners-list");
const peopleEl = document.querySelector("#people");
const cardsEl = document.querySelector("#market-cards");
const shelfLink = document.querySelector("#shelf-link");

function avatar(name, color) {
  const letter = name.replace(/[^a-z0-9]/gi, "").slice(0, 1).toUpperCase() || "?";
  return `<span class="av" style="background:${color}">${letter}</span>`;
}

function renderFills() {
  let rows = fills.filter((row) => state.side === "all" || row.side === state.side);
  if (state.q) {
    const q = state.q.toLowerCase();
    rows = rows.filter((row) => `${row.name} ${row.market}`.toLowerCase().includes(q));
  }
  rows = rows.slice().sort((a, b) => state.order === "largest" ? b.size - a.size : 0);
  fillsEl.innerHTML = rows.map((row) => `
    <li class="fill">
      <div class="who">${avatar(row.name, row.color)}<div><strong>${row.name}</strong><span class="side ${row.side}">bought ${row.outcome} at ${row.price}¢</span></div></div>
      <div class="mkt">${row.market}</div>
      <div class="amt"><b>${money(row.size)}</b><small>${row.when}</small></div>
    </li>
  `).join("");
  fillsEmpty.hidden = rows.length > 0;
}

function renderWinners() {
  const q = (document.querySelector("#trader-q").value || "").trim().toLowerCase();
  const rows = winners.filter(([name, wallet]) => !q || `${name} ${wallet}`.toLowerCase().includes(q));
  winnersEl.innerHTML = rows.map(([name, wallet, pnl, shares, color], i) => `
    <li class="winner">
      <span class="rank">#${i + 1}</span>
      ${avatar(name, color)}
      <div><strong>${name}</strong><span class="sub">${wallet}</span></div>
      <div class="pnl">${pnl}<small>${shares}</small></div>
    </li>
  `).join("");
  document.querySelector("#winners-rule").textContent = state.period === "day"
    ? "Top P&L today."
    : "This copy has today’s board. The other periods are on the live site.";
}

function renderPeople() {
  peopleEl.innerHTML = people.map((p) => `
    <article class="poi ${p.tone}">
      <div class="poi-body">
        <div class="poi-head">
          <div class="who">${avatar(p.name, p.tone === "purple" ? "#7c3aed" : p.tone === "gold" ? "#d97706" : "#047857")}<div><strong>${p.name}</strong><span class="sub">${p.wallet}</span></div></div>
          <div class="badge">${p.badge}</div>
        </div>
        <p>${p.text}</p>
        ${p.ref ? `<p class="ref">${p.ref}</p>` : ""}
        <div class="facts">${p.facts.map(([k, v]) => `<div><span>${k}</span><b class="${String(v).startsWith("+") ? "up" : ""}">${v}</b></div>`).join("")}</div>
      </div>
    </article>
  `).join("");
}

function renderMarkets() {
  const shelf = shelves[state.shelf];
  shelfLink.textContent = shelf.link + " →";
  if (!shelf.cards.length) {
    cardsEl.innerHTML = `<p class="empty">Nothing on this shelf in the captured snapshot. Moving now has the three markets from the live page.</p>`;
    return;
  }
  const q = state.q.toLowerCase();
  const cards = shelf.cards.filter((card) => !q || card.title.toLowerCase().includes(q));
  cardsEl.innerHTML = cards.map((card) => `
    <article class="market">
      <div class="tag">${card.tag}</div>
      <h3>${card.title}</h3>
      ${card.rows.map(([label, move, pct]) => {
        const width = Math.max(0, Math.min(100, parseFloat(pct) || 0));
        return `
        <div class="outcome">
          <div class="outcome-row">
            <span>${label}</span>
            <span class="move ${move.startsWith("+") ? "up" : "down"}">${move.startsWith("+") ? "▲" : "▼"} ${move.replace(/^[+-]/, "")}</span>
            <span class="pct">${pct}</span>
          </div>
          <div class="bar" aria-hidden="true"><span style="width:${width}%"></span></div>
        </div>`;
      }).join("")}
      <div class="market-foot"><span>${card.foot[0]}</span><span>${card.foot[1]}</span></div>
    </article>
  `).join("") || `<p class="empty">Nothing on this page matches that search.</p>`;
}

function renderTape() {
  const html = tape.map(([size, side, detail, market, when]) => `
    <span class="tape-item"><b>${size}</b> <span class="${side.toLowerCase()}">${side}</span> ${detail} · ${market} <time>${when}</time></span>
  `).join("");
  document.querySelector("#tape-run").innerHTML = html + html;
}

function render() {
  renderTape();
  renderFills();
  renderWinners();
  renderPeople();
  renderMarkets();
}

document.querySelectorAll("[data-order]").forEach((button) => {
  button.addEventListener("click", () => {
    state.order = button.dataset.order;
    button.parentElement.querySelectorAll("[data-order]").forEach((b) => b.classList.toggle("on", b === button));
    renderFills();
  });
});

document.querySelectorAll("[data-side]").forEach((button) => {
  button.addEventListener("click", () => {
    state.side = button.dataset.side;
    button.parentElement.querySelectorAll("[data-side]").forEach((b) => b.classList.toggle("on", b === button));
    renderFills();
  });
});

document.querySelectorAll("[data-period]").forEach((button) => {
  button.addEventListener("click", () => {
    state.period = button.dataset.period;
    button.parentElement.querySelectorAll("[data-period]").forEach((b) => b.classList.toggle("on", b === button));
    renderWinners();
  });
});

document.querySelectorAll("[data-shelf]").forEach((button) => {
  button.addEventListener("click", () => {
    state.shelf = button.dataset.shelf;
    document.querySelectorAll("#shelves [data-shelf]").forEach((b) => b.classList.toggle("on", b.dataset.shelf === state.shelf));
    renderMarkets();
    if (button.closest(".panel-head")) document.querySelector("#markets").scrollIntoView({ behavior: "smooth" });
  });
});

document.querySelectorAll("[data-try]").forEach((button) => {
  button.addEventListener("click", () => {
    const input = document.querySelector("#trader-q");
    input.value = button.dataset.try.replace("…", "");
    renderWinners();
  });
});

const dock = document.querySelector("#dock");
const dockPanel = document.querySelector("#dock-panel");
const dockLog = document.querySelector("#dock-log");

function setDockOpen(open) {
  dock.classList.toggle("is-open", open);
  dockPanel.hidden = !open;
}

document.querySelector("#dock-close").addEventListener("click", () => setDockOpen(false));

function addMessage(role, html) {
  const hello = dockLog.querySelector(".dock-hello");
  if (hello) hello.remove();
  const item = document.createElement("p");
  item.className = `msg ${role}`;
  item.innerHTML = html;
  dockLog.appendChild(item);
  dockLog.scrollTop = dockLog.scrollHeight;
}

function replyFor(text) {
  const q = text.toLowerCase();
  if (q.includes("trader")) return `Today’s P&amp;L ranking is in the trader list. <a href="#traders">Show traders</a>`;
  if (q.includes("market")) return `The biggest 24-hour moves are in markets. <a href="#markets">Show markets</a>`;
  if (q.includes("money") || q.includes("whale")) return `Fills of $10K or more are in Whales now. <a href="#whales">Show whales</a>`;
  return `Ask about traders, markets, or whale trades.`;
}

function ask(text) {
  const value = text.trim();
  if (!value) {
    setDockOpen(true);
    return;
  }
  addMessage("user", value.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])));
  addMessage("bot", replyFor(value));
  setDockOpen(true);
}

const askField = document.querySelector("#trader-q");
const askHint = document.querySelector(".ask-hint");
const askHints = [
  "Top traders by total PnL",
  "What's swisstony's edge?",
  "Who lost the most today?",
  "Browse all top traders",
  "Who are the most profitable traders?"
];
let askHintIndex = 0;
askHint.textContent = askHints[0];

function cycleAskHint() {
  if (askField.value || document.activeElement === askField) return;
  askHint.classList.add("is-leaving");
  window.setTimeout(() => {
    askHintIndex = (askHintIndex + 1) % askHints.length;
    askHint.textContent = askHints[askHintIndex];
    askHint.classList.remove("is-leaving");
    askHint.classList.add("is-enter");
    requestAnimationFrame(() => requestAnimationFrame(() => askHint.classList.remove("is-enter")));
  }, 350);
}

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  window.setInterval(cycleAskHint, 3200);
}

askField.addEventListener("input", () => {
  askField.form.classList.toggle("has-value", askField.value.length > 0);
});

document.querySelector("#trader-search").addEventListener("submit", (event) => {
  event.preventDefault();
  ask(askField.value);
  askField.value = "";
  askField.form.classList.remove("has-value");
});

document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => ask(button.dataset.prompt));
});

const langBtn = document.querySelector("#lang-btn");
const langMenu = document.querySelector("#lang-menu");
const langCurrent = document.querySelector("#lang-current");

function setLangOpen(open) {
  langMenu.hidden = !open;
  langBtn.setAttribute("aria-expanded", open ? "true" : "false");
}

langBtn.addEventListener("click", () => setLangOpen(langMenu.hidden));
langMenu.addEventListener("click", (event) => {
  const option = event.target.closest("[role='option']");
  if (!option) return;
  langMenu.querySelectorAll("[role='option']").forEach((item) => item.setAttribute("aria-selected", item === option ? "true" : "false"));
  langCurrent.textContent = option.dataset.short;
  setLangOpen(false);
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".lang")) setLangOpen(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setLangOpen(false);
});

render();

const dotField = document.querySelector(".dots");
const dotScreen = document.querySelector(".screen");
if (dotField && dotScreen) {
  const dotCtx = dotField.getContext("2d");
  const dotGap = 26;
  const reduceDots = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let dotPoints = [];
  let dotW = 0;
  let dotH = 0;
  let dotX = -9999;
  let dotY = -9999;
  let dotTargetX = -9999;
  let dotTargetY = -9999;
  let dotNear = false;

  function layoutDots() {
    const rect = dotField.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    dotW = rect.width;
    dotH = rect.height;
    if (dotW < 2 || dotH < 2) return;
    dotField.width = Math.round(dotW * dpr);
    dotField.height = Math.round(dotH * dpr);
    dotCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dotPoints = [];
    const cols = Math.ceil(dotW / dotGap) + 1;
    const rows = Math.ceil(dotH / dotGap) + 1;
    const ox = (dotW - (cols - 1) * dotGap) / 2;
    const oy = (dotH - (rows - 1) * dotGap) / 2;
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) dotPoints.push({ x: ox + x * dotGap, y: oy + y * dotGap });
    }
    if (reduceDots) drawDots();
  }

  function drawDots() {
    dotCtx.clearRect(0, 0, dotW, dotH);
    if (!reduceDots) {
      dotX += (dotTargetX - dotX) * 0.18;
      dotY += (dotTargetY - dotY) * 0.18;
    }
    for (const point of dotPoints) {
      const dist = Math.hypot(point.x - dotX, point.y - dotY);
      const influence = dotNear ? Math.max(0, 1 - dist / 170) : 0;
      const glow = influence * influence;
      dotCtx.beginPath();
      dotCtx.fillStyle = `rgba(214, 224, 234, ${0.18 + glow * 0.72})`;
      dotCtx.arc(point.x, point.y, 1.15 + glow * 0.45, 0, Math.PI * 2);
      dotCtx.fill();
    }
    if (!reduceDots) requestAnimationFrame(drawDots);
  }

  window.addEventListener("pointermove", (event) => {
    const rect = dotField.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    dotNear = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
    if (dotNear) {
      dotTargetX = x;
      dotTargetY = y;
    }
  });
  window.addEventListener("resize", layoutDots);
  layoutDots();
  if (!reduceDots) drawDots();
}
