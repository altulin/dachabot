const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot('137365403:AAFylIfxTRc1lqw2cEKaob_zjTN0GH1YWoM', {polling: true});
const keyboard_main = {"keyboard": [["\u{1F3E1}"+ " Дом", "\u{1F332}"+" Улица", "\u{2699}"]], resize_keyboard: true}



bot.sendMessage(87307445, "Привет! На даче появилось электричество!", {"reply_markup": keyboard_main});

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Выбери нужный пункт: " + "\u{1F447}", {"reply_markup": keyboard_main});
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  // console.log(msg.text)

  if (text.includes("Улица")) {
  	bot.sendMessage(87307445, "house");
  }


  bot.sendMessage(87307445, "1");
  console.log(msg)
});


