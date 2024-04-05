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

// Função para fazer a requisição e pegar o componente com id 'ddata'
async function fetchStatus() {
  var data = new Date();
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

  // Functions
  if (nobreakBatery < 80 && (lastState == 10 || lastState == 32)) {
    try {
      await axios.post(
        `http://${process.env.ESPIP}/setpoint?batery=${nobreakBatery}`
      );
    } catch (error) {
      console.log(Error);
    }
    SendMessagemBot(data);
  }

  if (lastState == 10 || lastState == 32) {
    console.log(
      `\n[STATUS: ${nobreakStatus}] - Falha na entrada\n[INFO] - Bateria a ${nobreakBatery}%\nHora local: ${data.getHours()}h ${data.getMinutes()}m ${data.getSeconds()}s`
    );
    try {
      await axios.post(
        `http://${process.env.ESPIP}/setpoint?status=${nobreakStatus}`
      );
      await axios.post(
        `http://${process.env.ESPIP}/setpoint?batery=${nobreakBatery}`
      );
    } catch (error) {
      console.log(error);
    }
  }

  // Funcao de mudanca de estado
  if (lastState !== nobreakStatus) {
    try {
      await axios.post(
        `http://${process.env.ESPIP}/setpoint?status=${nobreakStatus}`
      );
      await axios.post(
        `http://${process.env.ESPIP}/setpoint?btery=${nobreakBatery}`
      );
    } catch (error) {
      console.log(error);
    }

    lastState = nobreakStatus;
    if (nobreakStatus == 10 || nobreakStatus == 32) {
      if (nobreakBatery >= 80) {
        console.log("\n[AVISO] - Sem energia com baterias acima de 80%");
      } else if (nobreakBatery >= 60 && nobreakBatery < 80) {
        console.log("\n[AVISO] - Sem energia com baterias acima de 60%");
      } else if (nobreakBatery >= 30 && nobreakBatery < 60) {
        console.log("\n[AVISO] - Iniciar desligamento, Bateria a 30%");
      }
    }
    // Impressão de console
    switch (nobreakStatus) {
      case 10:
        console.log(
          `\n[STATUS: ${nobreakStatus}] - Falha na entrada\n[INFO] - Bateria a ${nobreakBatery}%\nHora local: ${data.getHours()}h ${data.getMinutes()}m ${data.getSeconds()}s`
        );
        break;
      case 11:
        console.log(
          `\n[STATUS: ${nobreakStatus}] - Entrada normalizada\n[INFO] - Bateria a ${nobreakBatery}%\nHora local: ${data.getHours()}h ${data.getMinutes()}m ${data.getSeconds()}s`
        );
        break;
      case 32:
        console.log(
          `\n[STATUS: ${nobreakStatus}] - Aguardando energia\n[INFO] - Bateria a ${nobreakBatery}%\nHora local: ${data.getHours()}h ${data.getMinutes()}m ${data.getSeconds()}s`
        );
        break;
      case 33:
        console.log(
          `\n[STATUS: ${nobreakStatus}] - Energia reestabelecida\n[INFO] - Bateria a ${nobreakBatery}%\nHora local: ${data.getHours()}h ${data.getMinutes()}m ${data.getSeconds()}s`
        );
        break;
    }
    SendMessagemBot(data);
  }
}

// Funcao que manda mensagem com o bot
async function SendMessagemBot(data) {
  try {
    var message = "";
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
    }

    bot.sendMessage(process.env.CHATID, message);
  } catch (error) {
    console.error("Erro ao enviar a mensagem:", error);
  }
}

setInterval(() => {
  fetchStatus();
}, 6000);
