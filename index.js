const express     = require("express");
const fetch       = require("node-fetch");
const { google }  = require("googleapis");
const path        = require("path");
const app         = express();

app.use(express.json());

// ============================================================
//  ⚙️  CONFIGURAÇÕES
// ============================================================
const EVOLUTION_API_URL  = "https://crm-evolution-api.onrender.com";
const EVOLUTION_INSTANCE = "recrutamento";
const EVOLUTION_API_KEY  = "CrmRh@2026";
const SPREADSHEET_ID     = "1Z1HHv264Tvda117uPK-4flFwrg-_Kig4BG2I1qcst4w";
const CREDENTIALS_PATH   = path.join(__dirname, "credentials.json");
const WEB_APP_URL        = "https://script.google.com/macros/s/AKfycbw7W_41GqdyE_pd0x47fBDzE-34jmMRYfIcWxcSnWb6jXH1x_ayMLcXg-linOoBKiojIg/exec";

// ============================================================
//  📊  GOOGLE SHEETS — Autenticação
// ============================================================
async function getSheets() {
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const client = await auth.getClient();
  return google.sheets({ version: "v4", auth: client });
}

async function lerAba(sheets, aba) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${aba}!A:Z`,
  });
  return res.data.values || [];
}

// ============================================================
//  📢  LISTAR VAGAS ABERTAS
// ============================================================
async function listarVagas() {
  try {
    const sheets = await getSheets();
    const dados  = await lerAba(sheets, "Vagas");
    let lista = "📢 *Vagas Abertas:*\n\n";
    let encontrou = false;
    for (let i = 1; i < dados.length; i++) {
      if (dados[i][4] === "Aberta") {
        lista += `▪️ *${dados[i][1]}* — ${dados[i][9] || "Modalidade a confirmar"}\n`;
        encontrou = true;
      }
    }
    return encontrou
      ? lista + "\nPara se candidatar, peça o link de indicação ao seu RH!"
      : "Não há vagas abertas no momento. Em breve teremos novidades! 😊";
  } catch (err) {
    console.error("Erro ao listar vagas:", err.message);
    return "Não foi possível carregar as vagas agora. Tente novamente em instantes.";
  }
}

// ============================================================
//  🔍  CONSULTAR STATUS DO CANDIDATO
// ============================================================
async function consultarCandidato(telefone) {
  try {
    const sheets   = await getSheets();
    const dados    = await lerAba(sheets, "Candidatos");
    const telLimpo = String(telefone).replace(/\D/g, "");

    for (let i = 1; i < dados.length; i++) {
      const telPlanilha = String(dados[i][2] || "").replace(/\D/g, "");
      if (telPlanilha && telLimpo.includes(telPlanilha.slice(-8))) {
        return `📋 Olá, *${dados[i][1]}*!\n\n` +
               `▪️ Vaga: *${dados[i][4]}*\n` +
               `▪️ Etapa atual: *${dados[i][8]}*\n` +
               `▪️ Status: *${dados[i][9]}*\n\n` +
               `Qualquer dúvida, responda *3* para falar com um recrutador.`;
      }
    }
    return "Não encontramos sua candidatura. Verifique se o número cadastrado é este ou fale com o RH (opção 3).";
  } catch (err) {
    console.error("Erro ao consultar candidato:", err.message);
    return "Não foi possível consultar sua candidatura agora. Tente novamente em instantes.";
  }
}

// ============================================================
//  👥  BUSCAR FUNCIONÁRIO PELO TELEFONE
// ============================================================
async function buscarFuncionario(telefone) {
  try {
    const sheets   = await getSheets();
    const dados    = await lerAba(sheets, "Funcionários");
    const telLimpo = String(telefone).replace(/\D/g, "");

    for (let i = 1; i < dados.length; i++) {
      const telPlanilha = String(dados[i][4] || "").replace(/\D/g, "");
      if (telPlanilha && telLimpo.includes(telPlanilha.slice(-8))) {
        return {
          encontrou:  true,
          nome:       dados[i][1],
          registro:   dados[i][0],
          status:     dados[i][7]
        };
      }
    }
    return { encontrou: false };
  } catch (err) {
    console.error("Erro ao buscar funcionário:", err.message);
    return { encontrou: false };
  }
}

// ============================================================
//  📨  ENVIAR WHATSAPP
// ============================================================
async function enviarWhatsApp(telefone, mensagem) {
  try {
    const numero = String(telefone).replace(/\D/g, "");
    const url    = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`;

    console.log("==> Enviando WhatsApp para:", numero);

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        number: numero,
        text:   mensagem
      })
    });

    const json = await resp.json();
    console.log("==> Resposta Evolution API:", resp.status);

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

    if (dados?.event !== "messages.upsert") {
      return res.status(200).json({ ok: true });
    }

    if (dados?.data?.key?.fromMe === true) {
      return res.status(200).json({ ok: true });
    }

    const msg = dados?.data?.message?.conversation?.toLowerCase().trim();
    const de  = dados?.data?.key?.remoteJid?.replace("@s.whatsapp.net", "");

    console.log("==> Mensagem:", msg, "| De:", de);

    if (!msg || !de) return res.status(200).json({ ok: true });

    // ============================================================
    //  🤖  RESPOSTAS DO BOT
    // ============================================================
    if (["oi", "olá", "ola", "menu", "hello", "oii", "inicio", "início"].includes(msg)) {
      await enviarWhatsApp(de,
        "Olá! 👋 Sou o assistente de RH.\n\nEscolha uma opção:\n\n" +
        "1️⃣ Ver vagas abertas\n" +
        "2️⃣ Status da minha candidatura\n" +
        "3️⃣ Falar com um recrutador\n" +
        "4️⃣ Enviar currículo\n" +
        "5️⃣ Acompanhar minhas indicações"
      );

    } else if (msg === "1") {
      const vagas = await listarVagas();
      await enviarWhatsApp(de, vagas);

    } else if (msg === "2") {
      const status = await consultarCandidato(de);
      await enviarWhatsApp(de, status);

    } else if (msg === "3") {
      await enviarWhatsApp(de,
        "👤 Um recrutador entrará em contato em breve.\n\n" +
        "⏰ Horário de atendimento: seg-sex, 9h às 18h.\n\n" +
        "Digite *menu* para voltar ao início."
      );

    } else if (msg === "4") {
      await enviarWhatsApp(de,
        "📄 Para enviar seu currículo acesse o formulário abaixo:\n\n" +
        "🔗 https://docs.google.com/forms/d/e/1FAIpQLScxeXcoSiFIQWvyFmt4FJhuQDyKev_9Gca7NZnbM5fKyLw3hA/viewform\n\n" +
        "Em breve nossa equipe entrará em contato! 😊"
      );

    } else if (msg === "5") {
      // Busca funcionário pelo telefone
      const func = await buscarFuncionario(de);
      if (func.encontrou && func.status === "Ativo") {
        const link = `${WEB_APP_URL}?id=${func.registro}`;
        await enviarWhatsApp(de,
          `🔗 Olá, *${func.nome}*! Acesse suas indicações pelo link:\n\n${link}\n\n` +
          `Você pode salvar este link para acompanhar a qualquer momento! 😊`
        );
      } else {
        await enviarWhatsApp(de,
          "Não encontramos seu cadastro como funcionário ativo.\n\n" +
          "Se você é funcionário, entre em contato com o RH para cadastrar seu número. 😊"
        );
      }

    } else {
      await enviarWhatsApp(de,
        "Não entendi sua mensagem. 😊\n\nDigite *menu* para ver as opções disponíveis."
      );
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
