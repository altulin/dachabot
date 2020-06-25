const TelegramBot = require('node-telegram-bot-api');
const config = require('config');
const editJsonFile = require("edit-json-file");
const file = editJsonFile("values.json");
const sensor = require('ds18b20-raspi');
const fs = require('fs');
const SunCalc = require('suncalc');
const Gpio = require('onoff').Gpio;

const rpisensor = '28-0416c27bdcff';
const streetsensor = '28-00044e0b9fff';
const housesensor = '28-0114504f0cff';
const token = config.get("token");

const user_id = Object.values(config.get("user_id"))

//const heatingrpi = new Gpio(17, 'out');//обогрев бокса
const lampexit = new Gpio(18, 'out');//лампа вход
const house = new Gpio(15, 'out');//обогрев дом
const bot = new TelegramBot(token, {polling: true});

const keyboard_main = {"keyboard": [["\u{1F3E1}"+ " Дом", "\u{1F332}"+" Улица", "\u{2699}"]], resize_keyboard: true}
const keyboard_lampexit_on= {"inline_keyboard": [[{"text": "включить", "callback_data": "lampexit_on"}]]}
const keyboard_lampexit_off= {"inline_keyboard": [[{"text": "выключить", "callback_data": "lampexit_off"}]]}

const keyboard_house_on= {"inline_keyboard": [[{"text": "включить", "callback_data": "house_on"}]]}
const keyboard_house_off= {"inline_keyboard": [[{"text": "выключить", "callback_data": "house_off"}]]}




//house.write(1);

function sun() {
	let sun = SunCalc.getTimes(new Date(), 52.2, 104.4, 400);
	console.log(sun);
}

// sun();

function turn() {
	(file.get("lampexit_state") === "0") ? lampexit.write(0):lampexit.write(1);
	(file.get("house_state") === "0") ? house.write(0):house.write(1);
}

function record(arg, data) {
	file.set(arg, data.toString());
	file.save();
}

function temp(dev) {
	let temp = sensor.readC(dev, 1);
	return temp;
}

function toggleGpio(arg, name, namestate) {
	let state
	if (arg.readSync() === 0) {
		arg.writeSync(1);
		state = name + " вкл. ";
		record(namestate, 1);
	}

	else {
		arg.writeSync(0);
		state = name + " выкл.";
		record(namestate, 0)
	}
	return state;
}

function checkGpio(arg, name) {
	let msg
	(arg.readSync() === 0)?msg = name + " выкл.":msg = name + " вкл. ";
	return msg;
}

turn();


bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Выбери нужный пункт: " + "\u{1F447}", {"reply_markup": keyboard_main});
});

bot.sendMessage(87307445, "Привет! Я включилась!", {"reply_markup": keyboard_main})

bot.on('message', (msg) => {
  let chatId = msg.chat.id;
  let text = msg.text;

  if (user_id.toString().includes(chatId)) {
  	if (text.includes("Улица")) {
  		bot.sendMessage(chatId, "На улице: "+temp(streetsensor)+" °C", {"reply_markup": keyboard_main})
		bot.sendMessage(chatId, checkGpio(lampexit, "Освещение на улице"), {"reply_markup": (lampexit.readSync() === 0)?keyboard_lampexit_on:keyboard_lampexit_off});
	}

	if (text.includes("Дом")) {
		bot.sendMessage(chatId, "В доме: "+temp(housesensor)+" °C", {"reply_markup": keyboard_main})
	  	bot.sendMessage(chatId, checkGpio(house, "Отопление в доме"), {"reply_markup": (house.readSync() === 0)?keyboard_house_on:keyboard_house_off});
	  }

	if (text.includes("\u{2699}")) {
		bot.sendMessage(chatId, "Внутри щита: "+temp(rpisensor)+" °C", {"reply_markup": keyboard_main})
	}
  }
});

bot.on("callback_query", (msg) => {
	let id  = msg.from.id;
	let answer = msg.data
	let answer_ls = answer.split("_");

	if (answer_ls.includes(("lampexit"))) {
		bot.sendMessage(id, toggleGpio(lampexit, "Освещение на улице", "lampexit_state"), {"reply_markup": (lampexit.readSync() === 0)?keyboard_lampexit_on:keyboard_lampexit_off});
	}

	if (answer_ls.includes(("house"))) {
		bot.sendMessage(id, toggleGpio(house, "Отопление в доме", "house_state"), {"reply_markup": (house.readSync() === 0)?keyboard_house_on:keyboard_house_off});
	}
	
})




