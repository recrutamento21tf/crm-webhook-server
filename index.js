const express = require("express");
const fetch   = require("node-fetch");
const app     = express();

app.use(express.json());

// ============================================================
//  ⚙️  CONFIGURAÇÕES
// ============================================================
const EVOLUTION_API_URL  = "https://crm-evolution-api.onrender.com";
const EVOLUTION_INSTANCE = "recrutamento";
const EVOLUTION_API_KEY  = "CrmRh@2026";
const CODIGO_PAIS        = "";

// ============================================================
//  📨  ENVIAR WHATSAPP
// ============================================================
async function enviarWhatsApp(telefone, mensagem) {
  try {
    const numero = String(telefone).replace(/\D/g, "");
    const url    = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`;

    console.log("==> Enviando WhatsApp para:", CODIGO_PAIS + numero);

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        number: `${CODIGO_PAIS}${numero}`,
        text:   mensagem
      })
    });

    const json = await resp.json();
    console.log("==> Resposta Evolution API:", resp.status, JSON.stringify(json));

  } catch (err) {
    console.error("==> Erro ao enviar WhatsApp:", err.message);
  }
}

// ============================================================
//  🤖  WEBHOOK — Recebe mensagens do WhatsApp
// ============================================================
app.post("/webhook", async (req, res) => {
  try {
    const dados = req.body;

    console.log("==> Evento recebido:", dados?.event);

    // Ignora eventos que não são mensagens
    if (dados?.event !== "messages.upsert") {
      return res.status(200).json({ ok: true });
    }

    // Ignora mensagens enviadas pelo próprio bot
    if (dados?.data?.key?.fromMe === true) {
      console.log("==> Mensagem própria ignorada");
      return res.status(200).json({ ok: true });
    }

    const msg = dados?.data?.message?.conversation?.toLowerCase().trim();
    const de  = dados?.data?.key?.remoteJid?.replace("@s.whatsapp.net", "");

    console.log("==> Mensagem:", msg, "| De:", de);

    if (!msg || !de) {
      console.log("==> Mensagem ou remetente vazio — ignorado");
      return res.status(200).json({ ok: true });
    }

    // ============================================================
    //  🤖  RESPOSTAS DO BOT
    // ============================================================
    if (["oi", "olá", "ola", "menu", "hello", "oii", "ola!"].includes(msg)) {
      await enviarWhatsApp(de,
        "Olá! 👋 Sou o assistente de RH.\n\nEscolha uma opção:\n\n" +
        "1️⃣ Ver vagas abertas\n" +
        "2️⃣ Status da minha candidatura\n" +
        "3️⃣ Falar com um recrutador\n" +
        "4️⃣ Enviar currículo"
      );

    } else if (msg === "1") {
      await enviarWhatsApp(de, "📢 Vagas abertas em breve disponíveis aqui! Aguarde.");

    } else if (msg === "2") {
      await enviarWhatsApp(de, "🔍 Para consultar sua candidatura, informe seu e-mail cadastrado.");

    } else if (msg === "3") {
      await enviarWhatsApp(de, "👤 Um recrutador entrará em contato em breve.\n\n⏰ Horário de atendimento: seg-sex, 9h às 18h.");

    } else if (msg === "4") {
      await enviarWhatsApp(de, "📄 Para enviar seu currículo, acesse o formulário de candidatura e preencha seus dados. Em breve enviaremos o link!");

    } else {
      await enviarWhatsApp(de, "Não entendi sua mensagem. 😊\n\nDigite *menu* para ver as opções disponíveis.");
    }

  } catch (err) {
    console.error("==> Erro no webhook:", err.message);
  }

  res.status(200).json({ ok: true });
});

// ============================================================
//  🌐  ROTA DE TESTE
// ============================================================
app.get("/", (req, res) => {
  res.json({ status: "✅ Servidor CRM Recrutamento funcionando!" });
});

// ============================================================
//  🚀  INICIAR SERVIDOR
// ============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});
