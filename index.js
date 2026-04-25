// ============================================================
//  SERVIDOR INTERMEDIÁRIO — Webhook Evolution API → Apps Script
//  Node.js + Express
// ============================================================

const express = require("express");
const fetch   = require("node-fetch");
const app     = express();

app.use(express.json());

// URL do seu Google Apps Script Web App
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw7W_41GqdyE_pd0x47fBDzE-34jmMRYfIcWxcSnWb6jXH1x_ayMLcXg-linOoBKiojIg/exec";

// Rota principal do webhook
app.post("/webhook", async (req, res) => {
  try {
    console.log("Webhook recebido:", JSON.stringify(req.body));

    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
      redirect: "follow"
    });

    console.log("Apps Script respondeu:", response.status);
    res.status(200).json({ ok: true });

  } catch (err) {
    console.error("Erro no webhook:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Rota de teste
app.get("/", (req, res) => {
  res.json({ status: "Servidor intermediário funcionando! ✅" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
