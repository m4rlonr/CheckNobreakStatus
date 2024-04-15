const axios = require("axios");
const cheerio = require("cheerio");
require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");
const bot = new TelegramBot(process.env.BOTTOKEN, { polling: true });

// URL que você deseja fazer a requisição
const statusUrl = process.env.BaseUrl1;
const bateryUrl = process.env.BaseUrl2;

// Valores a serem exibidos e usados em tomadas de decisões
var nobreakStatus = null;
var nobreakBatery = null;

// Guarda o ultimo estado para validar mudanças de estado
var lastState = null;
var contador = 0;

// Busca informacoes o nobreak e guarda em Statis e Batery
async function fetchStatus() {
  try {
    // Faz a requisição HTTP
    const response = await axios.get(statusUrl);
    const response2 = await axios.get(bateryUrl);

    var htmlString = response.data;
    var htmlString2 = response2.data;

    // Carregar o HTML usando Cheerio
    const $ = cheerio.load(htmlString);

    // Selecionar todas as linhas da tabela
    const rows = $("tr");

    // Array para armazenar as linhas que contêm números
    const rowsWithNumbers = [];

    // Verificar cada linha se contém números
    rows.each((index, row) => {
      const cells = $(row).find("td");
      let containsNumber = false;
      cells.each((index, cell) => {
        if (!isNaN($(cell).text().trim())) {
          containsNumber = true;
        }
      });
      if (containsNumber) {
        rowsWithNumbers.push($(row).html());
      }
    });

    nobreakStatus = parseFloat(
      rowsWithNumbers[0].split("<td>")[2].split("<")[0]
    );

    nobreakBatery = parseInt(
      htmlString2.split("<b>")[6].split("</td><td>")[1].split(" %")[0]
    );
  } catch (error) {
    console.error("[ERRO] - Rquisição falhou.\n", error);
  }
}

async function SendBotMessage() {
  var data = new Date();
  switch (nobreakStatus) {
    case 10:
      message = `\n[STATUS: ${nobreakStatus}] - Falha na entrada\n[INFO] - Bateria a ${nobreakBatery}%\nHora local: ${data.getHours()}h ${data.getMinutes()}m ${data.getSeconds()}s`;
      break;
    case 11:
      message = `\n[STATUS: ${nobreakStatus}] - Entrada normalizada\n[INFO] - Bateria a ${nobreakBatery}%\nHora local: ${data.getHours()}h ${data.getMinutes()}m ${data.getSeconds()}s`;
      break;
    case 32:
      message = `\n[STATUS: ${nobreakStatus}] - Aguardando energia\n[INFO] - Bateria a ${nobreakBatery}%\nHora local: ${data.getHours()}h ${data.getMinutes()}m ${data.getSeconds()}s`;
      break;
    case 33:
      message = `\n[STATUS: ${nobreakStatus}] - Energia reestabelecida\n[INFO] - Bateria a ${nobreakBatery}%\nHora local: ${data.getHours()}h ${data.getMinutes()}m ${data.getSeconds()}s`;
      break;
    case 2:
      message = `\n[STATUS: ${nobreakStatus}] - Bateria baixa\n[INFO] - Bateria a ${nobreakBatery}%\nHora local: ${data.getHours()}h ${data.getMinutes()}m ${data.getSeconds()}s`;
      break;
    case 3:
      message = `\n[STATUS: ${nobreakStatus}] - Bateria normalizada\n[INFO] - Bateria a ${nobreakBatery}%\nHora local: ${data.getHours()}h ${data.getMinutes()}m ${data.getSeconds()}s`;
      break;
    default:
      message = `\n[STATUS: ${nobreakStatus}] - STATUS DESCONHECIDO\n[INFO] - Bateria a ${nobreakBatery}%\nHora local: ${data.getHours()}h ${data.getMinutes()}m ${data.getSeconds()}s`;
      break;
  }
  try {
    await bot.sendMessage(process.env.CHATID, message);
  } catch (error) {
    console.error("[ERRO] - PROBLEMAS AO ENVIAR MENSAGEM COM BOT");
  }
}

async function SendInfoEsp() {
  try {
    await axios.post(
      `http://${process.env.ESPIP}/setpoint?status=${nobreakStatus}`
    );
    await axios.post(
      `http://${process.env.ESPIP}/setpoint?btery=${nobreakBatery}`
    );
  } catch (error) {
    console.error("[ERRO] - PROBLEMAS AO ENVIAR DADOS PARA ESP32");
  }
}

setInterval(async () => {
  fetchStatus();
  if (nobreakStatus !== lastState) {
    console.log("Mensagem mudanca estado");
    lastState = nobreakStatus;
    try {
      await SendBotMessage();
    } catch (error) {
      console.log("Problemas para enviar mensage pelo Bot");
    }
  }
  if (nobreakStatus == 10 || nobreakStatus == 32 || nobreakStatus == 2) {
    if (contador <= 2) {
      contador = contador + 1;
    } else {
      console.log("Mensagem estado de erro");
      try {
        await SendBotMessage();
      } catch (error) {
        console.log("Problemas para enviar mensage pelo Bot");
      }
      contador = 0;
    }
  }
}, 30000);
