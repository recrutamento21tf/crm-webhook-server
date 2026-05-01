const express = require("express");
const axios   = require("axios");
const app     = express();
app.use(express.json());

// ============================================================
//  ⚙️  CONFIGURAÇÕES
// ============================================================
const EVOLUTION_API_URL  = "https://crm-evolution-api.onrender.com";
const EVOLUTION_INSTANCE = "recrutamento";
const EVOLUTION_API_KEY  = "CrmRh@2026";
const SPREADSHEET_ID     = "1Z1HHv264Tvda117uPK-4flFwrg-_Kig4BG2I1qcst4w";
const GOOGLE_API_KEY     = process.env.GOOGLE_API_KEY || "";
const FORM_LINK          = "https://docs.google.com/forms/d/e/1FAIpQLSdabmBBvwTTdYJxgmjdtX1xCAhENCnppwukk8rrQIw_0reBnA/viewform";

const LANG_MAP = { PT: "pt", JP: "ja", EN: "en", PH: "tl", ES: "es" };

async function traduzir(texto, idioma) {
  if (!texto || idioma === "PT") return texto;
  try {
    const lang = LANG_MAP[idioma] || "pt";
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=pt&tl=${lang}&dt=t&q=${encodeURIComponent(texto)}`;
    const r = await axios.get(url, { timeout: 8000, headers: { "User-Agent": "Mozilla/5.0" } });
    let resultado = "";
    if (r.data && r.data[0]) {
      r.data[0].forEach(part => { if (part && part[0]) resultado += part[0]; });
    }
    return resultado || texto;
  } catch (e) {
    console.error("Erro traducao:", e.message);
    return texto;
  }
}
const APPS_SCRIPT_URL    = "https://script.google.com/macros/s/AKfycbw7W_41GqdyE_pd0x47fBDzE-34jmMRYfIcWxcSnWb6jXH1x_ayMLcXg-linOoBKiojIg/exec";

// LINE Credentials
const LINE_CHANNEL_SECRET       = "3081e85245cf79b12671c4a6625cd140";
const LINE_CHANNEL_ACCESS_TOKEN = "bmiUOeJUYU6ytQiZ262Rq1OS7bU9W23DcuiDB4+/uU4RfRxmZI639S8P51qjsS4/y40t6grb8D/RLXiaH/A7qaSUfHd1eF+t0uS7d2HWyNEsgeRZL9f6ViCMHRdYlrHF5Aek2Ip/+Wj1euGTXGKPbQdB04t89/1O/w1cDnyilFU=";

// ============================================================
//  💾  ESTADO DA CONVERSA (em memória)
//  Guarda: idioma, etapa do fluxo, dados temporários
// ============================================================
const estadoConversa = {};

function getEstado(tel) {
  if (!estadoConversa[tel]) {
    estadoConversa[tel] = { idioma: null, etapa: "inicio", tipo: null, dados: {} };
  }
  return estadoConversa[tel];
}

function setEstado(tel, updates) {
  estadoConversa[tel] = { ...getEstado(tel), ...updates };
}

function resetEstado(tel) {
  estadoConversa[tel] = { idioma: null, etapa: "inicio", tipo: null, dados: {} };
}

// ============================================================
//  🌐  TEXTOS MULTILÍNGUES
// ============================================================
const T = {
  escolha_idioma: {
    PT: "Olá! 👋\n\nEscolha seu idioma:\n1️⃣ Português\n2️⃣ 日本語\n3️⃣ English\n4️⃣ Filipino\n5️⃣ Español",
    JP: "Olá! 👋\n\nEscolha seu idioma:\n1️⃣ Português\n2️⃣ 日本語\n3️⃣ English\n4️⃣ Filipino\n5️⃣ Español",
    EN: "Olá! 👋\n\nEscolha seu idioma:\n1️⃣ Português\n2️⃣ 日本語\n3️⃣ English\n4️⃣ Filipino\n5️⃣ Español",
    PH: "Olá! 👋\n\nEscolha seu idioma:\n1️⃣ Português\n2️⃣ 日本語\n3️⃣ English\n4️⃣ Filipino\n5️⃣ Español",
    ES: "Olá! 👋\n\nEscolha seu idioma:\n1️⃣ Português\n2️⃣ 日本語\n3️⃣ English\n4️⃣ Filipino\n5️⃣ Español",
  },
  menu_candidato: {
    PT: "📋 *Menu — Candidato*\n\n1️⃣ Ver vagas abertas\n2️⃣ Status da minha candidatura\n3️⃣ Recuperar link de indicação\n4️⃣ Falar com recrutador\n\n0️⃣ Mudar idioma",
    JP: "📋 *メニュー — 応募者*\n\n1️⃣ 求人を見る\n2️⃣ 応募状況を確認\n3️⃣ 紹介リンクを再取得\n4️⃣ 担当者に話す\n\n0️⃣ 言語を変更",
    EN: "📋 *Menu — Candidate*\n\n1️⃣ See open positions\n2️⃣ Check my application status\n3️⃣ Recover referral link\n4️⃣ Talk to a recruiter\n\n0️⃣ Change language",
    PH: "📋 *Menu — Kandidato*\n\n1️⃣ Tingnan ang mga bukas na posisyon\n2️⃣ Suriin ang aking aplikasyon\n3️⃣ Kunin muli ang referral link\n4️⃣ Makipag-usap sa recruiter\n\n0️⃣ Baguhin ang wika",
    ES: "📋 *Menú — Candidato*\n\n1️⃣ Ver puestos disponibles\n2️⃣ Estado de mi solicitud\n3️⃣ Recuperar enlace de referido\n4️⃣ Hablar con un reclutador\n\n0️⃣ Cambiar idioma",
  },
  menu_funcionario: {
    PT: "🏢 *Menu — Funcionário*\n\n1️⃣ Ver vagas abertas\n2️⃣ Meu link de indicação\n3️⃣ Acompanhar minhas indicações\n4️⃣ Falar com RH\n\n0️⃣ Mudar idioma",
    JP: "🏢 *メニュー — 従業員*\n\n1️⃣ 求人を見る\n2️⃣ 紹介リンクを取得\n3️⃣ 紹介状況を確認\n4️⃣ 人事部に話す\n\n0️⃣ 言語を変更",
    EN: "🏢 *Menu — Employee*\n\n1️⃣ See open positions\n2️⃣ My referral link\n3️⃣ Track my referrals\n4️⃣ Talk to HR\n\n0️⃣ Change language",
    PH: "🏢 *Menu — Empleyado*\n\n1️⃣ Tingnan ang mga bukas na posisyon\n2️⃣ Aking referral link\n3️⃣ Subaybayan ang aking mga referral\n4️⃣ Makipag-usap sa HR\n\n0️⃣ Baguhin ang wika",
    ES: "🏢 *Menú — Empleado*\n\n1️⃣ Ver puestos disponibles\n2️⃣ Mi enlace de referido\n3️⃣ Seguimiento de mis referidos\n4️⃣ Hablar con RRHH\n\n0️⃣ Cambiar idioma",
  },
  menu_novo: {
    PT: "👋 *Bem-vindo!*\n\n1️⃣ Ver vagas abertas\n2️⃣ Quero me candidatar\n3️⃣ Falar com recrutador\n\n0️⃣ Mudar idioma",
    JP: "👋 *ようこそ！*\n\n1️⃣ 求人を見る\n2️⃣ 応募したい\n3️⃣ 担当者に話す\n\n0️⃣ 言語を変更",
    EN: "👋 *Welcome!*\n\n1️⃣ See open positions\n2️⃣ I want to apply\n3️⃣ Talk to a recruiter\n\n0️⃣ Change language",
    PH: "👋 *Maligayang pagdating!*\n\n1️⃣ Tingnan ang mga bukas na posisyon\n2️⃣ Gusto kong mag-apply\n3️⃣ Makipag-usap sa recruiter\n\n0️⃣ Baguhin ang wika",
    ES: "👋 *¡Bienvenido!*\n\n1️⃣ Ver puestos disponibles\n2️⃣ Quiero postularme\n3️⃣ Hablar con un reclutador\n\n0️⃣ Cambiar idioma",
  },
  falar_rh: {
    PT: "👤 Um recrutador entrará em contato em breve.\nHorário: seg-sex, 9h às 18h. 😊",
    JP: "👤 担当者が近日中にご連絡いたします。\n対応時間: 月〜金 9:00〜18:00 😊",
    EN: "👤 A recruiter will contact you soon.\nHours: Mon-Fri, 9am to 6pm. 😊",
    PH: "👤 Makikipag-ugnayan sa iyo ang isang recruiter sa lalong madaling panahon.\nOras: Lun-Biy, 9am hanggang 6pm. 😊",
    ES: "👤 Un reclutador se pondrá en contacto pronto.\nHorario: lun-vie, 9h a 18h. 😊",
  },
  pergunta_foi_indicado: {
    PT: "Você foi indicado por algum funcionário?\n\nResponda com o *ID do indicador* (ex: F001)\nou digite *NÃO* para receber o link sem indicação.",
    JP: "従業員から紹介されましたか？\n\n*紹介者ID*（例: F001）を返信するか、\n紹介なしのリンクを受け取る場合は *NÃO* と入力してください。",
    EN: "Were you referred by an employee?\n\nReply with the *referrer ID* (e.g. F001)\nor type *NO* to receive the link without referral.",
    PH: "Ikaw ba ay na-refer ng isang empleyado?\n\nSumagot gamit ang *referrer ID* (hal. F001)\no i-type ang *HINDI* para makatanggap ng link nang walang referral.",
    ES: "¿Fuiste referido por algún empleado?\n\nResponde con el *ID del referidor* (ej: F001)\no escribe *NO* para recibir el enlace sin referido.",
  },
  link_sem_id: {
    PT: "📝 Aqui está o link para se candidatar:\n\n{link}\n\nPreencha seus dados e nossa equipe entrará em contato! 😊",
    JP: "📝 応募フォームはこちらです:\n\n{link}\n\nご記入ください。担当者よりご連絡いたします！😊",
    EN: "📝 Here is the application link:\n\n{link}\n\nFill in your details and our team will contact you! 😊",
    PH: "📝 Narito ang link para mag-apply:\n\n{link}\n\nPunan ang iyong mga detalye at makikipag-ugnayan sa iyo ang aming koponan! 😊",
    ES: "📝 Aquí está el enlace para postularte:\n\n{link}\n\n¡Completa tus datos y nuestro equipo se pondrá en contacto! 😊",
  },
  link_com_id: {
    PT: "✅ Perfeito! Aqui está seu link personalizado:\n\n{link}\n\nSua indicação será registrada automaticamente! 😊",
    JP: "✅ 完璧です！こちらがあなた専用リンクです:\n\n{link}\n\nご紹介が自動的に登録されます！😊",
    EN: "✅ Perfect! Here is your personalized link:\n\n{link}\n\nYour referral will be registered automatically! 😊",
    PH: "✅ Perpekto! Narito ang iyong personalized na link:\n\n{link}\n\nAng iyong referral ay awtomatikong irerehistro! 😊",
    ES: "✅ ¡Perfecto! Aquí está tu enlace personalizado:\n\n{link}\n\n¡Tu referido se registrará automáticamente! 😊",
  },
  id_invalido: {
    PT: "❌ ID não encontrado. Verifique o ID com o funcionário que te indicou e tente novamente.\n\nOu digite *NÃO* para receber o link sem indicação.",
    JP: "❌ IDが見つかりませんでした。紹介してくれた従業員にIDを確認して再試行してください。\n\n紹介なしのリンクを受け取る場合は *NÃO* と入力してください。",
    EN: "❌ ID not found. Check the ID with the employee who referred you and try again.\n\nOr type *NO* to receive the link without referral.",
    PH: "❌ Hindi nahanap ang ID. I-check ang ID sa empleyado na nag-refer sa iyo at subukan muli.\n\nO i-type ang *HINDI* para makatanggap ng link nang walang referral.",
    ES: "❌ ID no encontrado. Verifica el ID con el empleado que te refirió e intenta de nuevo.\n\nO escribe *NO* para recibir el enlace sin referido.",
  },
  recuperar_link_instrucao: {
    PT: "🔗 Para recuperar seu link de indicação, preciso saber quem te indicou.\n\nEnvie o *ID do funcionário* que te indicou (ex: F001):",
    JP: "🔗 紹介リンクを再取得するには、誰があなたを紹介したかを知る必要があります。\n\nあなたを紹介した*従業員ID*を送ってください（例: F001）:",
    EN: "🔗 To recover your referral link, I need to know who referred you.\n\nSend the *employee ID* who referred you (e.g. F001):",
    PH: "🔗 Para mabawi ang iyong referral link, kailangan ko malaman kung sino ang nag-refer sa iyo.\n\nIpadala ang *employee ID* ng nag-refer sa iyo (hal. F001):",
    ES: "🔗 Para recuperar tu enlace de referido, necesito saber quién te refirió.\n\nEnvía el *ID del empleado* que te refirió (ej: F001):",
  },
  nao_reconhecido: {
    PT: "Não entendi. Digite *menu* para ver as opções. 😊",
    JP: "理解できませんでした。*menu* と入力してオプションをご確認ください。😊",
    EN: "I didn't understand. Type *menu* to see the options. 😊",
    PH: "Hindi ko naintindihan. I-type ang *menu* para makita ang mga opsyon. 😊",
    ES: "No entendí. Escribe *menu* para ver las opciones. 😊",
  },
};

function t(chave, idioma) {
  var lang = idioma || "PT";
  return (T[chave] && T[chave][lang]) || (T[chave] && T[chave]["PT"]) || "";
}

// ============================================================
//  📨  ENVIAR WHATSAPP
// ============================================================
async function enviarWhatsApp(numero, mensagem) {
  try {
    // Remove tudo que nao e digito, remove 81 do inicio se ja tiver, remove zero inicial
    var num = String(numero).replace(/\D/g,"");
    if (num.startsWith("81")) num = num.substring(2);
    if (num.startsWith("0"))  num = num.substring(1);
    var numFinal = "81" + num;
    console.log("Enviando para:", numFinal);
    const r = await axios.post(
      `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
      { number: numFinal, text: mensagem },
      { headers: { apikey: EVOLUTION_API_KEY } }
    );
    console.log("WhatsApp enviado! Status:", r.status);
  } catch (e) {
    console.error("Erro WhatsApp:", e.message);
    if (e.response) console.error("Response:", JSON.stringify(e.response.data));
  }
}

// ============================================================
//  📊  CONSULTAR PLANILHA via Apps Script Web App
// ============================================================
async function buscarDadosPlanilha(aba, campo, valor) {
  try {
    const url = `${APPS_SCRIPT_URL}?aba=${aba}&campo=${campo}&valor=${encodeURIComponent(valor)}`;
    const r   = await axios.get(url, { timeout: 10000 });
    return r.data;
  } catch (e) { console.error("Erro planilha:", e.message); return null; }
}

// ============================================================
//  🔍  IDENTIFICAR TIPO DE USUÁRIO
// ============================================================
async function identificarUsuario(telefone) {
  const telLimpo = telefone.replace(/\D/g,"").replace(/^81/,"").replace(/^0/,"");
  const candidato  = await buscarDadosPlanilha("Candidatos",   "whatsapp", telLimpo);
  if (candidato && candidato.encontrado) return { tipo: "candidato",   dados: candidato };
  const funcionario = await buscarDadosPlanilha("Funcionarios", "whatsapp", telLimpo);
  if (funcionario && funcionario.encontrado) return { tipo: "funcionario", dados: funcionario };
  return { tipo: "novo", dados: {} };
}

// ============================================================
//  📋  LISTAR VAGAS
// ============================================================
async function listarVagas(idioma) {
  idioma = idioma || "PT";
  try {
    const r = await axios.get(`${APPS_SCRIPT_URL}?aba=Vagas&status=Aberta&idioma=${idioma}`, { timeout: 15000 });
    if (r.data && r.data.vagas && r.data.vagas.length > 0) {
      const labels = {
        PT: { titulo: "📢 *Vagas Abertas:*",       rodape: "\nCompartilhe o link de indicação!",  vazio: "Não há vagas abertas no momento." },
        JP: { titulo: "📢 *求人情報:*",             rodape: "\n紹介リンクをシェアしてください！",    vazio: "現在、募集中の求人はありません。" },
        EN: { titulo: "📢 *Open Positions:*",       rodape: "\nShare your referral link!",          vazio: "There are no open positions at the moment." },
        PH: { titulo: "📢 *Bukas na Posisyon:*",    rodape: "\nI-share ang iyong referral link!",   vazio: "Walang bukas na posisyon sa ngayon." },
        ES: { titulo: "📢 *Puestos Disponibles:*",  rodape: "\n¡Comparte tu enlace de referido!",   vazio: "No hay puestos disponibles en este momento." }
      };
      const lb = labels[idioma] || labels["PT"];
      let lista = lb.titulo + "\n\n";
      // Traduz cada vaga
      for (const v of r.data.vagas) {
        const titulo = await traduzir(v.titulo, idioma);
        const desc   = v.descricao ? await traduzir(v.descricao, idioma) : "";
        lista += `▪️ *${titulo}*`;
        if (v.provincia) lista += ` — ${v.provincia}`;
        if (v.cidade)    lista += `/${v.cidade}`;
        if (v.salario)   lista += ` | ¥${v.salario}`;
        if (desc)        lista += `\n${desc}`;
        lista += "\n\n";
      }
      return lista + lb.rodape;
    }
    const lb2 = { PT: "Não há vagas abertas.", JP: "求人はありません。", EN: "No open positions.", PH: "Walang bukas na posisyon.", ES: "No hay puestos disponibles." };
    return lb2[idioma] || lb2["PT"];
  } catch (e) {
    console.error("Erro listarVagas:", e.message);
    return "Não foi possível carregar as vagas agora. Tente novamente.";
  }
}

// ============================================================
//  🤖  PROCESSAR MENSAGEM
// ============================================================
async function processarMensagem(de, msg) {
  const estado = getEstado(de);
  const lang   = estado.idioma || "PT";
  const msgLower = msg.toLowerCase().trim();

  // Comandos globais
  if (["oi","olá","ola","menu","hello","hola","こんにちは","kumusta"].includes(msgLower) || msg === "0") {
    resetEstado(de);
    await enviarWhatsApp(de, t("escolha_idioma", "PT"));
    setEstado(de, { etapa: "escolha_idioma" });
    return;
  }

  // ============================================================
  //  ETAPA: Escolha de idioma
  // ============================================================
  if (estado.etapa === "escolha_idioma" || estado.etapa === "inicio") {
    const mapIdioma = { "1": "PT", "2": "JP", "3": "EN", "4": "PH", "5": "ES" };
    if (mapIdioma[msg]) {
      const idioma = mapIdioma[msg];
      setEstado(de, { idioma: idioma, etapa: "menu" });
      const usuario = await identificarUsuario(de);
      setEstado(de, { tipo: usuario.tipo, dados: usuario.dados });
      const menuKey = usuario.tipo === "candidato" ? "menu_candidato" :
                      usuario.tipo === "funcionario" ? "menu_funcionario" : "menu_novo";
      await enviarWhatsApp(de, t(menuKey, idioma));
      return;
    }
    await enviarWhatsApp(de, t("escolha_idioma", "PT"));
    return;
  }

  // ============================================================
  //  ETAPA: Menu principal
  // ============================================================
  if (estado.etapa === "menu") {

    // === MENU CANDIDATO ===
    if (estado.tipo === "candidato") {
      if (msg === "1") {
        await enviarWhatsApp(de, await listarVagas(lang));
      } else if (msg === "2") {
        const cand = estado.dados;
        const vagaTrad  = await traduzir(cand.vaga,  lang);
        const etapaTrad = await traduzir(cand.etapa, lang);
        const statusTrad= await traduzir(cand.status,lang);
        const statusLabels = {
          PT: `📋 Olá, *${cand.nome}*!\n\n▪️ Vaga: *${vagaTrad}*\n▪️ Etapa: *${etapaTrad}*\n▪️ Status: *${statusTrad}*\n\nDúvidas? Digite *4* para falar com um recrutador.`,
          JP: `📋 こんにちは、*${cand.nome}*さん！\n\n▪️ 求人: *${vagaTrad}*\n▪️ 選考段階: *${etapaTrad}*\n▪️ 状況: *${statusTrad}*\n\nご質問は *4* を入力してください。`,
          EN: `📋 Hello, *${cand.nome}*!\n\n▪️ Position: *${vagaTrad}*\n▪️ Stage: *${etapaTrad}*\n▪️ Status: *${statusTrad}*\n\nQuestions? Type *4* to talk to a recruiter.`,
          PH: `📋 Kumusta, *${cand.nome}*!\n\n▪️ Posisyon: *${vagaTrad}*\n▪️ Yugto: *${etapaTrad}*\n▪️ Status: *${statusTrad}*\n\nMga katanungan? I-type ang *4*.`,
          ES: `📋 Hola, *${cand.nome}*!\n\n▪️ Puesto: *${vagaTrad}*\n▪️ Etapa: *${etapaTrad}*\n▪️ Estado: *${statusTrad}*\n\n¿Preguntas? Escribe *4* para hablar con un reclutador.`
        };
        await enviarWhatsApp(de, statusLabels[lang] || statusLabels["PT"]);
      } else if (msg === "3") {
        setEstado(de, { etapa: "recuperar_link" });
        await enviarWhatsApp(de, t("recuperar_link_instrucao", lang));
      } else if (msg === "4") {
        await enviarWhatsApp(de, t("falar_rh", lang));
      } else {
        await enviarWhatsApp(de, t("menu_candidato", lang));
      }
      return;
    }

    // === MENU FUNCIONÁRIO ===
    if (estado.tipo === "funcionario") {
      if (msg === "1") {
        await enviarWhatsApp(de, await listarVagas(lang));
      } else if (msg === "2") {
        const reg  = estado.dados.registro || "";
        const link = `${FORM_LINK}?usp=pp_url&entry.1282499803=${reg}`;
        await enviarWhatsApp(de,
          `🔗 Olá, *${estado.dados.nome}*!\n\nAqui está seu link personalizado de indicação:\n\n${link}\n\nCompartilhe com quem deseja indicar! Quando preencher, a indicação será registrada no seu nome automaticamente. 😊`
        );
      } else if (msg === "3") {
        const webUrl = `${APPS_SCRIPT_URL}?id=${estado.dados.registro}`;
        await enviarWhatsApp(de,
          `📊 Acompanhe suas indicações:\n\n${webUrl}\n\nSalve este link para consultar a qualquer momento! 😊`
        );
      } else if (msg === "4") {
        await enviarWhatsApp(de, t("falar_rh", lang));
      } else {
        await enviarWhatsApp(de, t("menu_funcionario", lang));
      }
      return;
    }

    // === MENU NOVO CONTATO ===
    if (msg === "1") {
      await enviarWhatsApp(de, await listarVagas(lang));
    } else if (msg === "2") {
      setEstado(de, { etapa: "pergunta_indicacao" });
      await enviarWhatsApp(de, t("pergunta_foi_indicado", lang));
    } else if (msg === "3") {
      await enviarWhatsApp(de, t("falar_rh", lang));
    } else {
      await enviarWhatsApp(de, t("menu_novo", lang));
    }
    return;
  }

  // ============================================================
  //  ETAPA: Pergunta se foi indicado (novo contato)
  // ============================================================
  if (estado.etapa === "pergunta_indicacao") {
    if (msgLower === "não" || msgLower === "nao" || msgLower === "no" || msgLower === "hindi") {
      const link = FORM_LINK;
      await enviarWhatsApp(de, t("link_sem_id", lang).replace("{link}", link));
      setEstado(de, { etapa: "menu" });
    } else {
      // Verifica se o ID existe na planilha
      const funcionario = await buscarDadosPlanilha("Funcionarios", "registro", msg.trim().toUpperCase());
      if (funcionario && funcionario.encontrado) {
        const link = `${FORM_LINK}?usp=pp_url&entry.1282499803=${msg.trim().toUpperCase()}`;
        await enviarWhatsApp(de, t("link_com_id", lang).replace("{link}", link));
        setEstado(de, { etapa: "menu" });
      } else {
        await enviarWhatsApp(de, t("id_invalido", lang));
      }
    }
    return;
  }

  // ============================================================
  //  ETAPA: Recuperar link (candidato perdeu o link)
  // ============================================================
  if (estado.etapa === "recuperar_link") {
    if (msgLower === "não" || msgLower === "nao" || msgLower === "no" || msgLower === "hindi") {
      const link = FORM_LINK;
      await enviarWhatsApp(de, t("link_sem_id", lang).replace("{link}", link));
      setEstado(de, { etapa: "menu" });
    } else {
      const funcionario = await buscarDadosPlanilha("Funcionarios", "registro", msg.trim().toUpperCase());
      if (funcionario && funcionario.encontrado) {
        const link = `${FORM_LINK}?usp=pp_url&entry.1282499803=${msg.trim().toUpperCase()}`;
        await enviarWhatsApp(de, t("link_com_id", lang).replace("{link}", link));
        setEstado(de, { etapa: "menu" });
      } else {
        await enviarWhatsApp(de, t("id_invalido", lang));
      }
    }
    return;
  }

  // Fallback
  await enviarWhatsApp(de, t("nao_reconhecido", lang));
}

// ============================================================
//  🟢  LINE — Enviar mensagem
// ============================================================
async function enviarLINE(userId, mensagem) {
  try {
    await axios.post(
      "https://api.line.me/v2/bot/message/push",
      { to: userId, messages: [{ type: "text", text: mensagem }] },
      { headers: { "Authorization": "Bearer " + LINE_CHANNEL_ACCESS_TOKEN, "Content-Type": "application/json" } }
    );
    console.log("LINE enviado para:", userId);
  } catch (e) {
    console.error("Erro LINE:", e.message);
    if (e.response) console.error("Response:", JSON.stringify(e.response.data));
  }
}

// ============================================================
//  🟢  WEBHOOK LINE
// ============================================================
app.post("/webhook-line", async (req, res) => {
  res.status(200).send("ok"); // responde 200 imediatamente
  try {
    const events = req.body.events || [];
    for (const event of events) {
      if (event.type !== "message" || event.message.type !== "text") continue;
      const userId = event.source.userId;
      const msg    = event.message.text.trim();
      await processarMensagemLINE(userId, msg);
    }
  } catch (e) { console.error("Erro webhook LINE:", e.message); }
});

async function processarMensagemLINE(userId, msg) {
  const estado  = getEstado("line_" + userId);
  const lang    = estado.idioma || "PT";
  const msgLower = msg.toLowerCase().trim();

  // Comandos globais
  if (["oi","olá","ola","menu","hello","hola","こんにちは","kumusta"].includes(msgLower) || msg === "0") {
    resetEstado("line_" + userId);
    await enviarLINE(userId, T.escolha_idioma["PT"]);
    setEstado("line_" + userId, { etapa: "escolha_idioma" });
    return;
  }

  // Escolha de idioma
  if (estado.etapa === "escolha_idioma" || estado.etapa === "inicio") {
    const mapIdioma = { "1": "PT", "2": "JP", "3": "EN", "4": "PH", "5": "ES" };
    if (mapIdioma[msg]) {
      const idioma  = mapIdioma[msg];
      // Verifica se ja esta identificado
      const usuario = await identificarUsuarioLINE(userId);
      if (usuario.tipo !== "novo") {
        setEstado("line_" + userId, { idioma: idioma, etapa: "menu", tipo: usuario.tipo, dados: usuario.dados });
        const menuKey = usuario.tipo === "candidato" ? "menu_candidato" : "menu_funcionario";
        await enviarLINE(userId, t(menuKey, idioma));
      } else {
        setEstado("line_" + userId, { idioma: idioma, etapa: "identificacao" });
        const n = "\n";
        const msgId = {
          PT: "Para identificar voce, escolha:" + n + n + "1 - Meu numero de telefone" + n + "2 - Meu e-mail cadastrado" + n + n + "Sou novo - envie: novo",
          JP: "\u78ba\u8a8dのため選択してください:" + n + n + "1 - 電話番号" + n + "2 - メールアドレス" + n + n + "新規の方は novo と入力",
          EN: "To identify you, choose:" + n + n + "1 - My phone number" + n + "2 - My registered email" + n + n + "New? Type: novo",
          PH: "Para makilala ka, pumili:" + n + n + "1 - Aking numero ng telepono" + n + "2 - Aking email" + n + n + "Bago? I-type ang: novo",
          ES: "Para identificarte, elige:" + n + n + "1 - Mi numero de telefono" + n + "2 - Mi correo electronico" + n + n + "Nuevo? Escribe: novo"
        };
        await enviarLINE(userId, msgId[idioma] || msgId["PT"]);
      }
      return;
    }
    await enviarLINE(userId, T.escolha_idioma["PT"]);
    return;
  }

  // Identificacao LINE
  if (estado.etapa === "identificacao") {
    const lang = estado.idioma || "PT";
    if (msg === "1") {
      setEstado("line_" + userId, { etapa: "aguardando_telefone" });
      const msgTel = { PT: "Digite seu número de telefone:", JP: "電話番号を入力してください:", EN: "Enter your phone number:", PH: "Ilagay ang iyong numero ng telepono:", ES: "Ingresa tu número de teléfono:" };
      await enviarLINE(userId, msgTel[lang] || msgTel["PT"]);
    } else if (msg === "2") {
      setEstado("line_" + userId, { etapa: "aguardando_email" });
      const msgEmail = { PT: "Digite seu e-mail cadastrado:", JP: "登録したメールアドレスを入力:", EN: "Enter your registered email:", PH: "Ilagay ang iyong registered na email:", ES: "Ingresa tu correo electrónico registrado:" };
      await enviarLINE(userId, msgEmail[lang] || msgEmail["PT"]);
    } else if (msgLower === "novo") {
      setEstado("line_" + userId, { etapa: "menu", tipo: "novo", dados: {} });
      await enviarLINE(userId, t("menu_novo", lang));
    } else {
      await enviarLINE(userId, t("nao_reconhecido", lang));
    }
    return;
  }

  // Aguardando telefone
  if (estado.etapa === "aguardando_telefone") {
    const lang = estado.idioma || "PT";
    const cand = await buscarDadosPlanilha("Candidatos", "whatsapp", msg);
    const func = await buscarDadosPlanilha("Funcionarios", "whatsapp", msg);
    if (cand && cand.encontrado) {
      await salvarLineUserId(userId, "candidato", cand.id);
      setEstado("line_" + userId, { etapa: "menu", tipo: "candidato", dados: cand });
      await enviarLINE(userId, "✅ " + cand.nome + "!\n\n" + t("menu_candidato", lang));
    } else if (func && func.encontrado) {
      await salvarLineUserId(userId, "funcionario", func.registro);
      setEstado("line_" + userId, { etapa: "menu", tipo: "funcionario", dados: func });
      await enviarLINE(userId, "✅ " + func.nome + "!\n\n" + t("menu_funcionario", lang));
    } else {
      const msgNot = { PT: "❌ Número não encontrado. Tente novamente ou envie *novo*:", JP: "❌ 番号が見つかりません。再試行するか *novo* と入力:", EN: "❌ Number not found. Try again or type *novo*:", PH: "❌ Hindi nahanap ang numero. Subukan muli o i-type ang *novo*:", ES: "❌ Número no encontrado. Intenta de nuevo o escribe *novo*:" };
      await enviarLINE(userId, msgNot[lang] || msgNot["PT"]);
    }
    return;
  }

  // Aguardando email
  if (estado.etapa === "aguardando_email") {
    const lang = estado.idioma || "PT";
    const cand = await buscarDadosPlanilha("Candidatos", "email", msg.trim().toLowerCase());
    const func = await buscarDadosPlanilha("Funcionarios", "email", msg.trim().toLowerCase());
    if (cand && cand.encontrado) {
      await salvarLineUserId(userId, "candidato", cand.id);
      setEstado("line_" + userId, { etapa: "menu", tipo: "candidato", dados: cand });
      await enviarLINE(userId, "✅ " + cand.nome + "!\n\n" + t("menu_candidato", lang));
    } else if (func && func.encontrado) {
      await salvarLineUserId(userId, "funcionario", func.registro);
      setEstado("line_" + userId, { etapa: "menu", tipo: "funcionario", dados: func });
      await enviarLINE(userId, "✅ " + func.nome + "!\n\n" + t("menu_funcionario", lang));
    } else {
      const msgNot = { PT: "❌ E-mail não encontrado. Tente novamente ou envie *novo*:", JP: "❌ メールが見つかりません。再試行するか *novo* と入力:", EN: "❌ Email not found. Try again or type *novo*:", PH: "❌ Hindi nahanap ang email. Subukan muli o i-type ang *novo*:", ES: "❌ Email no encontrado. Intenta de nuevo o escribe *novo*:" };
      await enviarLINE(userId, msgNot[lang] || msgNot["PT"]);
    }
    return;
  }

  // Menu principal
  if (estado.etapa === "menu") {
    if (estado.tipo === "candidato") {
      if (msg === "1") { await enviarLINE(userId, await listarVagas(lang)); }
      else if (msg === "2") {
        const cand = estado.dados;
        const vagaTrad  = await traduzir(cand.vaga,  lang);
        const etapaTrad = await traduzir(cand.etapa, lang);
        const statusTrad= await traduzir(cand.status,lang);
        await enviarLINE(userId, `📋 ${cand.nome}

▪️ ${vagaTrad}
▪️ ${etapaTrad}
▪️ ${statusTrad}`);
      }
      else if (msg === "3") { setEstado("line_" + userId, { etapa: "recuperar_link" }); await enviarLINE(userId, t("recuperar_link_instrucao", lang)); }
      else if (msg === "4") { await enviarLINE(userId, t("falar_rh", lang)); }
      else { await enviarLINE(userId, t("menu_candidato", lang)); }
      return;
    }
    if (estado.tipo === "funcionario") {
      if (msg === "1") { await enviarLINE(userId, await listarVagas(lang)); }
      else if (msg === "2") {
        const reg  = estado.dados.registro || "";
        const link = `${FORM_LINK}?usp=pp_url&entry.1282499803=${reg}`;
        await enviarLINE(userId, `🔗 ${estado.dados.nome}

${link}`);
      }
      else if (msg === "3") {
        const webUrl = `${APPS_SCRIPT_URL}?id=${estado.dados.registro}`;
        await enviarLINE(userId, `📊 ${webUrl}`);
      }
      else if (msg === "4") { await enviarLINE(userId, t("falar_rh", lang)); }
      else { await enviarLINE(userId, t("menu_funcionario", lang)); }
      return;
    }
    if (msg === "1") { await enviarLINE(userId, await listarVagas(lang)); }
    else if (msg === "2") { setEstado("line_" + userId, { etapa: "pergunta_indicacao" }); await enviarLINE(userId, t("pergunta_foi_indicado", lang)); }
    else if (msg === "3") { await enviarLINE(userId, t("falar_rh", lang)); }
    else { await enviarLINE(userId, t("menu_novo", lang)); }
    return;
  }

  if (estado.etapa === "pergunta_indicacao" || estado.etapa === "recuperar_link") {
    if (["não","nao","no","hindi"].includes(msgLower)) {
      await enviarLINE(userId, t("link_sem_id", lang).replace("{link}", FORM_LINK));
      setEstado("line_" + userId, { etapa: "menu" });
    } else {
      const func = await buscarDadosPlanilha("Funcionarios", "registro", msg.trim().toUpperCase());
      if (func && func.encontrado) {
        const link = `${FORM_LINK}?usp=pp_url&entry.1282499803=${msg.trim().toUpperCase()}`;
        await enviarLINE(userId, t("link_com_id", lang).replace("{link}", link));
        setEstado("line_" + userId, { etapa: "menu" });
      } else {
        await enviarLINE(userId, t("id_invalido", lang));
      }
    }
    return;
  }

  await enviarLINE(userId, t("nao_reconhecido", lang));
}

async function identificarUsuarioLINE(userId) {
  // Busca LINE User ID na planilha
  const cand = await buscarDadosPlanilha("Candidatos", "line_user_id", userId);
  if (cand && cand.encontrado) return { tipo: "candidato", dados: cand };
  const func = await buscarDadosPlanilha("Funcionarios", "line_user_id", userId);
  if (func && func.encontrado) return { tipo: "funcionario", dados: func };
  return { tipo: "novo", dados: {} };
}

async function salvarLineUserId(userId, tipo, id) {
  try {
    await axios.get(`${APPS_SCRIPT_URL}?acao=salvarLineUserId&tipo=${tipo}&id=${encodeURIComponent(id)}&lineUserId=${encodeURIComponent(userId)}`, { timeout: 10000 });
    console.log("LINE User ID salvo:", userId, tipo, id);
  } catch (e) { console.error("Erro salvarLineUserId:", e.message); }
}

// ============================================================
//  🌐  WEBHOOK WHATSAPP
// ============================================================
app.post("/webhook", async (req, res) => {
  try {
    const dados = req.body;
    if (dados.event !== "messages.upsert") return res.send("ok");
    if (dados.data?.key?.fromMe) return res.send("ok");
    const msg = dados.data?.message?.conversation || dados.data?.message?.extendedTextMessage?.text || "";
    const de  = (dados.data?.key?.remoteJid || "").replace("@s.whatsapp.net","");
    if (!msg || !de) return res.send("ok");
    await processarMensagem(de, msg.trim());
  } catch (e) { console.error("Erro webhook:", e.message); }
  res.send("ok");
});

app.get("/",  (req, res) => res.send("CRM Bot Online! 🚀"));
app.get("/health", (req, res) => res.json({ status: "ok", timestamp: new Date() }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
