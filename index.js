const express = require("express");
const fetch   = require("node-fetch");
const app     = express();

app.use(express.json());

const EVOLUTION_API_URL  = "https://crm-evolution-api.onrender.com";
const EVOLUTION_INSTANCE = "recrutamento";
const EVOLUTION_API_KEY  = "CrmRh@2026";
const CODIGO_PAIS        = "81";

async function enviarWhatsApp(telefone, mensagem) {
  const numero = String(telefone).replace(/\D/g, "");
  const url = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY },
    body: JSON.stringify({ number: `${CODIGO_PAIS}${numero}`, text: mensagem })
  });
}

app.post("/webhook", async (req, res) => {
  try {
    const dados = req.body;
    if (dados?.event !== "messages.upsert") return res.json({ ok: true });
    if (dados?.data?.key?.fromMe === true) return res.json({ ok: true });

    const msg = dados?.data?.message?.conversation?.toLowerCase().trim();
    const de  = dados?.data?.key?.remoteJid?.replace("@s.whatsapp.net", "");

    console.log("Mensagem recebida:", msg, "| De:", de);

    if (!msg || !de) return res.json({ ok: true });

    if (["oi", "olá", "ola", "menu", "hello"].includes(msg)) {
      await enviarWhatsApp(de, "Olá! 👋 Sou o assistente de RH. Escolha uma opção:\n\n1️⃣ Ver vagas abertas\n2️⃣ Status da minha candidatura\n3️⃣ Falar com um recrutador\n4️⃣ Enviar currículo");
    } else if (msg === "1") {
      await enviarWhatsApp(de, "📢 Em breve listaremos as vagas abertas aqui!");
    } else if (msg === "2") {
      await enviarWhatsApp(de, "🔍 Para consultar sua candidatura, informe seu CPF ou e-mail cadastrado.");
    } else if (msg === "3") {
      await enviarWhatsApp(de, "👤 Um recrutador entrará em contato em breve. Horário: seg-sex, 9h às 18h.");
    } else {
      await enviarWhatsApp(de, "Não entendi. Digite *menu* para ver as opções. 😊");
    }

  } catch (err) {
    console.error("Erro:", err.message);
  }
  res.json({ ok: true });
});

app.get("/", (req, res) => {
  res.json({ status: "Servidor CRM funcionando! ✅" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
