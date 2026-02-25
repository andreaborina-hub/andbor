# 📈 Market Agent — AI Trading Dashboard

Dashboard di trading con dati reali Alpha Vantage e analisi AI.

## 🚀 Deploy su Vercel (consigliato, gratuito)

### Metodo facile — Drag & Drop:
1. Vai su **vercel.com** e registrati (gratis, puoi usare Google)
2. Clicca **"Add New Project"**
3. Trascina l'intera cartella `trading-app` nella pagina
4. Clicca **"Deploy"**
5. In 2 minuti hai il tuo link tipo `market-agent.vercel.app` ✅

### Metodo con GitHub:
1. Carica la cartella su GitHub (github.com → New repository)
2. Su Vercel → "Import Git Repository"
3. Seleziona il repository → Deploy

---

## 📱 Installare come App sul telefono

Dopo il deploy, apri il link dal browser del telefono:

**iPhone (Safari):**
1. Apri il link in Safari
2. Tocca l'icona **Condividi** (quadrato con freccia)
3. Scorri → **"Aggiungi a schermata Home"**
4. Dai un nome → **Aggiungi**

**Android (Chrome):**
1. Apri il link in Chrome
2. Tocca i **3 puntini** in alto a destra
3. **"Aggiungi a schermata Home"**
4. Conferma

Ora hai l'icona sul telefono come una vera app! 🎉

---

## ⚙️ Configurazione

Apri `src/App.jsx` e modifica:
```js
const AV_KEY = "LA_TUA_API_KEY"; // Alpha Vantage key
```

## ⚠️ Note
- Piano gratuito Alpha Vantage: 25 richieste/giorno
- Forex: prezzi real-time
- Azioni: ~15 minuti di ritardo
- Solo a scopo educativo, non consulenza finanziaria
