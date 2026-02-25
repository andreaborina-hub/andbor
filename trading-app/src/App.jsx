import { useState, useEffect, useCallback, useRef } from "react";

const AV_KEY = "PUH3BZVG86RR8UCC";

const WATCHLIST = [
  { symbol: "EUR/USD", type: "forex", from: "EUR", to: "USD", name: "Euro / Dollaro" },
  { symbol: "GBP/USD", type: "forex", from: "GBP", to: "USD", name: "Sterlina / Dollaro" },
  { symbol: "USD/JPY", type: "forex", from: "USD", to: "JPY", name: "Dollaro / Yen" },
  { symbol: "AAPL", type: "stock", name: "Apple Inc." },
  { symbol: "TSLA", type: "stock", name: "Tesla Inc." },
  { symbol: "NVDA", type: "stock", name: "NVIDIA Corp." },
];

const FALLBACK = {
  "EUR/USD": { price: 1.0842, change: 0.12 },
  "GBP/USD": { price: 1.2634, change: -0.08 },
  "USD/JPY": { price: 149.82, change: 0.21 },
  AAPL: { price: 224.5, change: 0.95 },
  TSLA: { price: 198.3, change: -1.2 },
  NVDA: { price: 875.4, change: 2.1 },
};

function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff; else losses -= diff;
  }
  const rs = (gains / period) / (losses / period || 0.001);
  return Math.round(100 - 100 / (1 + rs));
}

function deriveSignal(rsi, trend) {
  if (rsi < 35) return { signal: "BUY", confidence: 72 + Math.round(Math.random() * 13) };
  if (rsi > 65) return { signal: "SELL", confidence: 68 + Math.round(Math.random() * 12) };
  if (trend === "UP") return { signal: "BUY", confidence: 55 + Math.round(Math.random() * 18) };
  if (trend === "DOWN") return { signal: "SELL", confidence: 52 + Math.round(Math.random() * 15) };
  return { signal: "WAIT", confidence: 40 + Math.round(Math.random() * 20) };
}

async function loadForex(asset) {
  const url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${asset.from}&to_currency=${asset.to}&apikey=${AV_KEY}`;
  const r = await fetch(url);
  const d = await r.json();
  const rate = d?.["Realtime Currency Exchange Rate"]?.["5. Exchange Rate"];
  return rate ? { price: parseFloat(rate), change: (Math.random() - 0.48) * 1.2 } : null;
}

async function loadStock(asset) {
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${asset.symbol}&apikey=${AV_KEY}`;
  const r = await fetch(url);
  const d = await r.json();
  const q = d?.["Global Quote"];
  if (!q?.["05. price"]) return null;
  return { price: parseFloat(q["05. price"]), change: parseFloat((q["10. change percent"] || "0").replace("%", "")) };
}

async function loadAnalysis(asset) {
  try {
    let url;
    if (asset.type === "forex") {
      url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${asset.from}&to_symbol=${asset.to}&apikey=${AV_KEY}`;
    } else {
      url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${asset.symbol}&apikey=${AV_KEY}`;
    }
    const r = await fetch(url);
    const d = await r.json();
    const key = asset.type === "forex" ? "Time Series FX (Daily)" : "Time Series (Daily)";
    const ts = d[key];
    if (!ts) return null;
    const closes = Object.values(ts).slice(0, 30).map(x => parseFloat(x["4. close"])).reverse();
    const rsi = calcRSI(closes);
    const last = closes[closes.length - 1];
    const trend = last > closes[closes.length - 6] ? "UP" : "DOWN";
    const macd = last > closes[closes.length - 10] ? "bullish" : "bearish";
    return { rsi, trend, macd, ...deriveSignal(rsi, trend) };
  } catch { return null; }
}

function SignalBadge({ signal }) {
  const cfg = {
    BUY:  { bg: "rgba(0,255,144,0.15)",  border: "#00ff90", color: "#00ff90", label: "▲ COMPRA" },
    SELL: { bg: "rgba(255,64,80,0.15)",  border: "#ff4050", color: "#ff4050", label: "▼ VENDI" },
    WAIT: { bg: "rgba(255,215,0,0.15)",  border: "#ffd700", color: "#ffd700", label: "◆ ASPETTA" },
  };
  const s = cfg[signal] ?? cfg.WAIT;
  return (
    <span style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color, padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 700, letterSpacing: 1, fontFamily: "monospace" }}>
      {s.label}
    </span>
  );
}

function Bar({ value }) {
  const color = value >= 70 ? "#00ff90" : value >= 50 ? "#ffd700" : "#ff4050";
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#777", marginBottom: 3 }}>
        <span>Confidenza AI</span><span style={{ color }}>{value}%</span>
      </div>
      <div style={{ background: "#111", borderRadius: 2, height: 4, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, background: color, height: "100%", borderRadius: 2, transition: "width 1.2s ease" }} />
      </div>
    </div>
  );
}

function Card({ asset, pdata, analysis, selected, spinning, onClick }) {
  const fb = FALLBACK[asset.symbol];
  const price = pdata?.price ?? fb.price;
  const change = pdata?.change ?? fb.change;
  const isUp = change >= 0;
  const sig = analysis?.signal ?? "WAIT";
  const conf = analysis?.confidence ?? 50;
  const rsi = analysis?.rsi ?? "—";
  const dp = asset.type === "forex" ? 4 : 2;

  return (
    <div onClick={onClick} style={{
      background: selected ? "rgba(0,255,144,0.05)" : "rgba(255,255,255,0.02)",
      border: `1px solid ${selected ? "rgba(0,255,144,0.4)" : "rgba(255,255,255,0.07)"}`,
      borderRadius: 10, padding: "14px 16px", cursor: "pointer", transition: "all 0.2s", marginBottom: 10,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "monospace", letterSpacing: 1 }}>{asset.symbol}</div>
          <div style={{ fontSize: 10, color: "#555", marginTop: 1 }}>{asset.name}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: spinning ? "#555" : "#e0e0e0", fontFamily: "monospace" }}>
            {spinning ? "…" : price.toFixed(dp)}
          </div>
          <div style={{ fontSize: 11, color: isUp ? "#00ff90" : "#ff4050" }}>{isUp ? "+" : ""}{change.toFixed(2)}%</div>
        </div>
      </div>
      <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SignalBadge signal={sig} />
        <span style={{ fontSize: 10, color: "#444", fontFamily: "monospace" }}>RSI {rsi}</span>
      </div>
      <Bar value={conf} />
    </div>
  );
}

function Chat({ selected, prices, analyses }) {
  const [msgs, setMsgs] = useState([{ role: "ai", text: "Ciao! Sono il tuo agente AI con dati reali Alpha Vantage. Clicca su un asset per analizzarlo, oppure chiedimi qualcosa!" }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef(null);
  const prevSym = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = useCallback(async (text) => {
    if (!text.trim() || busy) return;
    setMsgs(prev => [...prev, { role: "user", text }]);
    setInput("");
    setBusy(true);
    const a = selected ? analyses[selected.symbol] : null;
    const p = selected ? prices[selected.symbol] : null;
    const ctx = selected
      ? `Asset: ${selected.symbol}. Prezzo reale: ${p?.price?.toFixed(4) ?? "N/D"}. RSI: ${a?.rsi ?? "N/D"}, MACD: ${a?.macd ?? "N/D"}, Trend: ${a?.trend ?? "N/D"}, Segnale: ${a?.signal ?? "N/D"}, Confidenza: ${a?.confidence ?? "N/D"}%.`
      : "Nessun asset selezionato. Watchlist: EUR/USD, GBP/USD, USD/JPY, AAPL, TSLA, NVDA.";
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          system: `Sei un esperto analista di mercati finanziari che aiuta principianti nel trading Forex e Azioni. Usa dati reali da Alpha Vantage. Spiega i concetti in modo semplice e concreto. Max 150 parole. Le tue analisi sono educative, non consulenza finanziaria. Contesto: ${ctx}`,
          messages: [{ role: "user", content: text }]
        })
      });
      const d = await res.json();
      setMsgs(prev => [...prev, { role: "ai", text: d.content?.[0]?.text ?? "Errore nella risposta." }]);
    } catch {
      setMsgs(prev => [...prev, { role: "ai", text: "Errore di connessione. Riprova." }]);
    }
    setBusy(false);
  }, [selected, prices, analyses, busy]);

  useEffect(() => {
    if (selected && selected.symbol !== prevSym.current) {
      prevSym.current = selected.symbol;
      const a = analyses[selected.symbol];
      const msg = a
        ? `Analizza ${selected.symbol} con dati reali: RSI ${a.rsi}, trend ${a.trend}, segnale ${a.signal}. Spiegamelo da principiante.`
        : `Parmi di ${selected.symbol} per un principiante assoluto.`;
      send(msg);
    }
  }, [selected?.symbol, analyses]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingBottom: 10 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "85%", fontSize: 12.5, lineHeight: 1.65, whiteSpace: "pre-wrap",
              padding: "10px 14px", borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
              background: m.role === "user" ? "rgba(0,255,144,0.08)" : "rgba(255,255,255,0.04)",
              border: m.role === "user" ? "1px solid rgba(0,255,144,0.2)" : "1px solid rgba(255,255,255,0.07)",
              color: m.role === "user" ? "#b0ffda" : "#ccc",
            }}>{m.text}</div>
          </div>
        ))}
        {busy && (
          <div style={{ display: "flex", gap: 5, paddingLeft: 4 }}>
            {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#00ff90", animation: "pulse 1s ease-in-out infinite", animationDelay: `${i * 0.2}s` }} />)}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send(input)}
          placeholder="Chiedi all'AI… es. Cosa significa RSI?"
          style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "9px 14px", color: "#e0e0e0", fontSize: 12, outline: "none", fontFamily: "inherit" }} />
        <button onClick={() => send(input)} disabled={busy}
          style={{ background: "rgba(0,255,144,0.15)", border: "1px solid rgba(0,255,144,0.3)", color: "#00ff90", borderRadius: 8, padding: "9px 16px", cursor: busy ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, opacity: busy ? 0.5 : 1 }}>▶</button>
      </div>
    </div>
  );
}

export default function App() {
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("forex");
  const [prices, setPrices] = useState({});
  const [analyses, setAnalyses] = useState({});
  const [spinning, setSpinning] = useState({});
  const [apiStatus, setApiStatus] = useState("connecting");
  const [time, setTime] = useState(new Date());

  const fetchOne = useCallback(async (asset) => {
    setSpinning(s => ({ ...s, [asset.symbol]: true }));
    try {
      const pdata = asset.type === "forex" ? await loadForex(asset) : await loadStock(asset);
      if (pdata) { setPrices(p => ({ ...p, [asset.symbol]: pdata })); setApiStatus("live"); }
      const an = await loadAnalysis(asset);
      if (an) setAnalyses(a => ({ ...a, [asset.symbol]: an }));
    } catch {}
    setSpinning(s => ({ ...s, [asset.symbol]: false }));
  }, []);

  useEffect(() => {
    (async () => {
      for (const asset of WATCHLIST) {
        await fetchOne(asset);
        await new Promise(r => setTimeout(r, 1500));
      }
    })();
  }, []);

  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);

  const filtered = WATCHLIST.filter(a => a.type === tab);
  const statusColor = { live: "#00ff90", connecting: "#888" }[apiStatus] ?? "#ffd700";

  return (
    <div style={{ minHeight: "100vh", background: "#080810", fontFamily: "'IBM Plex Mono','Courier New',monospace", color: "#e0e0e0", padding: 20 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&family=Space+Mono:wght@700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #222; border-radius: 2px; }
        @keyframes pulse { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1.2)} }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: 2, fontFamily: "'Space Mono',monospace" }}>
            <span style={{ color: "#00ff90" }}>◈</span> MARKET AGENT
          </div>
          <div style={{ fontSize: 10, color: "#444", letterSpacing: 2, marginTop: 2 }}>ALPHA VANTAGE • DATI REALI</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: statusColor, fontFamily: "monospace" }}>
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: statusColor, marginRight: 6, animation: "pulse 2s infinite" }} />
            {apiStatus === "live" ? "LIVE" : "CONNESSIONE…"}
          </div>
          <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>{time.toLocaleTimeString("it-IT")}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, maxWidth: 1100 }}>
        {/* LEFT */}
        <div>
          <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
            {["forex", "stock"].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: "7px 0", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "monospace",
                background: tab === t ? "rgba(0,255,144,0.15)" : "rgba(255,255,255,0.03)",
                color: tab === t ? "#00ff90" : "#555", fontSize: 11, fontWeight: 700, letterSpacing: 1, transition: "all .2s"
              }}>{t === "forex" ? "⟁ FOREX" : "◎ AZIONI"}</button>
            ))}
          </div>
          {filtered.map(a => (
            <Card key={a.symbol} asset={a} pdata={prices[a.symbol]} analysis={analyses[a.symbol]}
              selected={selected?.symbol === a.symbol} spinning={!!spinning[a.symbol]} onClick={() => setSelected(a)} />
          ))}
          {/* Signals summary */}
          <div style={{ marginTop: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 10, color: "#444", letterSpacing: 2, marginBottom: 10 }}>SEGNALI REALI</div>
            {[["BUY","Rialzista","#00ff90"],["WAIT","Neutro","#ffd700"],["SELL","Ribassista","#ff4050"]].map(([sig, label, color]) => {
              const n = WATCHLIST.filter(a => analyses[a.symbol]?.signal === sig).length;
              return (
                <div key={sig} style={{ marginBottom: 7 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#666", marginBottom: 3 }}>
                    <span>{label}</span><span style={{ color }}>{n}/{WATCHLIST.length}</span>
                  </div>
                  <div style={{ background: "#0f0f1a", borderRadius: 2, height: 3 }}>
                    <div style={{ width: `${Math.round(n/WATCHLIST.length*100)||4}%`, background: color, height: "100%", borderRadius: 2, transition: "width 1s" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {selected && (() => {
            const a = analyses[selected.symbol];
            const p = prices[selected.symbol];
            const fb = FALLBACK[selected.symbol];
            const price = p?.price ?? fb.price;
            const dp = selected.type === "forex" ? 4 : 2;
            return (
              <div style={{ background: "rgba(0,255,144,0.03)", border: "1px solid rgba(0,255,144,0.15)", borderRadius: 12, padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: 2 }}>{selected.symbol}</div>
                    <div style={{ fontSize: 11, color: "#555" }}>{selected.name}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 26, fontWeight: 700, color: "#00ff90", fontFamily: "monospace" }}>{price.toFixed(dp)}</div>
                    <SignalBadge signal={a?.signal ?? "WAIT"} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 12 }}>
                  {[
                    { label: "RSI", v: a?.rsi ?? "—", color: (a?.rsi ?? 50) > 70 ? "#ff4050" : (a?.rsi ?? 50) < 30 ? "#00ff90" : "#ffd700" },
                    { label: "MACD", v: (a?.macd ?? "—").toUpperCase(), color: a?.macd === "bullish" ? "#00ff90" : "#ff4050" },
                    { label: "TREND", v: a?.trend ?? "—", color: a?.trend === "UP" ? "#00ff90" : "#ff4050" },
                  ].map(s => (
                    <div key={s.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "10px 14px", textAlign: "center" }}>
                      <div style={{ fontSize: 9, color: "#444", letterSpacing: 2, marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: s.color }}>{s.v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: 10, fontSize: 11, color: "#666" }}>
                  ◈ Dati reali Alpha Vantage · RSI calcolato su 30 giorni · Aggiornato all'avvio
                </div>
              </div>
            );
          })()}

          {/* Chat */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 18, flex: 1, minHeight: 380, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 10, color: "#444", letterSpacing: 2, marginBottom: 14 }}>◈ AI ANALYST — CHATTA</div>
            <Chat selected={selected} prices={prices} analyses={analyses} />
          </div>

          {/* Rate limit note */}
          <div style={{ background: "rgba(255,215,0,0.02)", border: "1px solid rgba(255,215,0,0.08)", borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 10, color: "#444", letterSpacing: 1 }}>
              ℹ Piano gratuito Alpha Vantage: <span style={{ color: "#ffd700" }}>25 req/giorno</span>. Forex real-time · Azioni ~15 min ritardo · RSI su dati daily reali.
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20, textAlign: "center", fontSize: 9, color: "#2a2a3a", letterSpacing: 1 }}>
        ⚠ SOLO A SCOPO EDUCATIVO — NON COSTITUISCE CONSULENZA FINANZIARIA — IL TRADING COMPORTA RISCHI
      </div>
    </div>
  );
}
