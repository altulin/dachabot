const TelegramBot = require('node-telegram-bot-api');
const config = require('config');
const editJsonFile = require("edit-json-file");
const file = editJsonFile("values.json");
var CronJob = require('cron').CronJob;
var CronTime = require('cron').CronTime;
const sensor = require('ds18b20-raspi');
const fs = require('fs');
const SunCalc = require('suncalc');
const Gpio = require('onoff').Gpio;
//const fetch = require("node-fetch");
const reboot = require('reboot');

const rpisensor = config.get("sensors.rpi");
const streetsensor = config.get("sensors.street");
const housesensor = config.get("sensors.house");
const token = config.get("token");
const city = config.get("city");
const key = config.get("key");

const user_id = Object.values(config.get("user_id"));
const al_id = config.get("user_id.al_id");
// const al_id = 87307445;

const latitude = config.get("sun.latitude")
const longitude = config.get("sun.longitude")
const land = config.get("sun.height")
 

const heatingrpi = new Gpio(17, 'out');//обогрев бокса
const lampexit = new Gpio(18, 'out');//лампа вход
const house = new Gpio(15, 'out');//обогрев дом
const bot = new TelegramBot(token, {polling: true});

const keyboard_main = {"keyboard": [["\u{1F3E1}"+ " Дом", "\u{1F332}"+" Улица", "\u{2699}"]], resize_keyboard: true}
const keyboard_lampexit_on= {"inline_keyboard": [
		[{"text": "\u{1F4A1} " + "включить", "callback_data": "lampexit_on"}]
	]}
	
const keyboard_lampexit_off= {"inline_keyboard": [
		[{"text": "\u{1F4A1} " + "выключить", "callback_data": "lampexit_off"}]
	]}

const keyboard_house_on= {"inline_keyboard": [[{"text": "\u{2668} " + "включить", "callback_data": "house_on"}]]}
const keyboard_house_off= {"inline_keyboard": [[{"text": "\u{2668} " + "выключить", "callback_data": "house_off"}]]}

const keyboard_water_on = {"inline_keyboard": [
													[{"text": "\u{2668} " + "включить обогрев", "callback_data": "heating_on"}],
													[{"text": "\u{1f55b} " + "счетчики", "callback_data": "counter"}]
												]}

const keyboard_water_off = {"inline_keyboard": [
													[{"text": "\u{2668} " + "выключить обогрев", "callback_data": "heating_off"}],
													[{"text": "\u{1f55b} " + "счетчики", "callback_data": "counter"}]
												]}

function temppi() {
	var temperature = fs.readFileSync("/sys/class/thermal/thermal_zone0/temp");
	temperature = ((temperature/1000).toPrecision(3));
	return temperature
}

function salutation() {
	bot.sendMessage(al_id, "Привет! Я включилась!", {"reply_markup": keyboard_main})
}

setTimeout(salutation, 60000);

async function weather(id) {
	//http://api.openweathermap.org/data/2.5/forecast/hourly?q=Irkutsk&appid=be87acba5a29f3aa93bd105c748ae943
	let response = await fetch("http://api.openweathermap.org/data/2.5/forecast/hourly?q=" + city + "&appid=" + key, {metod: "post"});
	// console.log(response.ok)
	if (response.ok) {
		let json = await response.json();
		console.log(json);
		//bot.sendMessage(id, json);
	}
	else {
		console.log("oops");
	}
}

//weather();
let job_set;
let job_rise;
let times;
let sunrise_hours;
let sunrise_min;
let sunset_hours;
let sunset_min;

function sun() {
	times = SunCalc.getTimes(new Date(), latitude, longitude, land);
	sunrise_hours = times.dawn.getHours();
	sunrise_min = times.dawn.getMinutes();
	sunset_hours = times.dusk.getHours();
	sunset_min = times.dusk.getMinutes();
	
	job_rise = new CronJob('0 ' + sunrise_min + ' ' + sunrise_hours + ' * * *', function() {
		bot.sendMessage(al_id,'Освещение выкл', {"reply_markup": keyboard_main});
		lampexit.writeSync(0);
		record("lampexit_state", 0);
	}, null, true, 'Asia/'+city);

	job_set = new CronJob('0 ' + sunset_min + ' ' + sunset_hours + ' * * *', function() {
		bot.sendMessage(al_id,'Освещение вкл', {"reply_markup": keyboard_main})
		lampexit.writeSync(1);
		record("lampexit_state", 1);
	}, null, true, 'Asia/'+city);
}

function sun_correction() {
	let sun_day = new CronJob('0 0 * * * *', function() {
		times = SunCalc.getTimes(new Date(), latitude, longitude, land);
		sunrise_hours = times.dawn.getHours();
		sunrise_min = times.dawn.getMinutes();
		sunset_hours = times.dusk.getHours();
		sunset_min = times.dusk.getMinutes();

		let time_rise = new CronTime('0 ' + sunrise_min + ' ' + sunrise_hours + ' * * *');
		job_rise.setTime(time_rise);
		job_rise.start();

		let time_set = new CronTime('0 ' + sunset_min + ' ' + sunset_hours + ' * * *');
		job_set.setTime(time_set);
		job_set.start();
	}, null, true, 'Asia/'+city);
}


function turn() {
	(file.get("lampexit_state") === "0") ? lampexit.write(0):lampexit.write(1);
	(file.get("house_state") === "0") ? house.write(0):house.write(1);
	(file.get("heatingrpi_state") === "0") ? heatingrpi.write(0):heatingrpi.write(1);
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
	var msg
	(arg.readSync() === 0)?msg = name + " выкл.":msg = name + " вкл. ";
	return msg;
}

turn();
sun();
sun_correction();

// bot.on("polling_error", (err) => console.log(err));
// bot.on("polling_error", (err) => bot.sendMessage(al_id, err));

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Выбери нужный пункт: " + "\u{1F447}", {"reply_markup": keyboard_main});
});

bot.on('message', (msg) => {
  let chatId = msg.from.id;
  let username = msg.from.username;
  let text = msg.text;

  if (user_id.toString().includes(chatId)) {
  	if (text.includes("Улица")) {
			bot.sendMessage(
				chatId, 
				"\u{1F332} " + "Улица" +"\n" +
				"=================" + "\n" +
				"\u{1F321} " + temp(streetsensor) + " °C" +  "\n" + 
				checkGpio(lampexit, "\u{1F4A1} " + "освещение"), 
				{"reply_markup": (lampexit.readSync() === 0)?keyboard_lampexit_on:keyboard_lampexit_off}
			);
		}

		if (text.includes("Дом")) {
			bot.sendMessage(
				chatId, 
				"\u{1F3E1} " + "Дом" + "\n" +
				"=================" + "\n" +
				"\u{1F321} " + temp(housesensor) + " °C" +  "\n" + 
				checkGpio(house, "\u{2668} " + "отопление"),
				{"reply_markup": (house.readSync() === 0)?keyboard_house_on:keyboard_house_off}
			);
		}

		if (text.includes("\u{2699}")) {
			bot.sendMessage(
				chatId, 
				"\u{2699} " + "RPi" + "\n" +
				"=================" + "\n" +
				"\u{1F321} " + temp(rpisensor)+" °C" + "\n" + 
				"\u{1F4BB} " + temppi() +" °C" + "\n" +
				checkGpio(heatingrpi, "\u{2668} " + "обогрев щита"),
				{"reply_markup": (heatingrpi.readSync() === 0)?keyboard_water_on:keyboard_water_off}
			);
		}

		if (text ==='r') {
			bot.sendMessage(chatId, 'Ок! Перезагружаюсь!', {"reply_markup": keyboard_main});
			setTimeout(reboot.rebootImmediately, 60000);
		}

		if (text ==='test') {
			//bot.sendMessage(al_id, bot.getMe())
		}

		if (msg.reply_to_message) {
			if (msg.reply_to_message.text.includes("Передай показания ХВС ГВС через пробел")) {
				if (text.split(' ').length === 2) {
					bot.sendMessage(chatId, 
						'Показания счетчиков' + "\n" +
						config.get("addr") + "\n" +
						config.get("name") + "\n" +
						'ХВС: ' +  text.split(' ')[0] + "\n" +
						'ГВС: ' + text.split(' ')[1],
						{"reply_markup": keyboard_main})
				}
				
				else {
					bot.sendMessage(chatId, '\u{1f61b} ' + 'Попробуй ещё раз',
						{"reply_markup": (heatingrpi.readSync() === 0)?keyboard_water_on:keyboard_water_off});
				}
			}
			
		}
  }

  else {
  	if (text.includes("Улица")) {
  		bot.sendMessage(chatId, 
	  		"\u{1F332} " + "Улица" +"\n" +
				"=================" + "\n" +
				"\u{1F321} " + temp(streetsensor) + " °C" +  "\n" + 
				checkGpio(lampexit, "\u{1F4A1} " + "освещение"), 
  			{"reply_markup": keyboard_main}
  		);
		}

		if (text.includes("Дом")) {
			bot.sendMessage(chatId,
				"\u{26d4} " + "\u{26d4} " + "\u{26d4} " + "\u{26d4} " + "\u{26d4} " + "\n" +
				"=================" + "\n" +
				'Здесь находится меню для управления отоплением дома',
				{"reply_markup": keyboard_main})
		}

		if (text.includes("\u{2699}")) {
			bot.sendMessage(chatId,
				"\u{26d4} " + "\u{26d4} " + "\u{26d4} " + "\u{26d4} " + "\u{26d4} " + "\n" +
				"=================" + "\n" +
				'Здесь находится меню для мониторинга работы оборудования',
				{"reply_markup": keyboard_main})
		}

  	bot.sendMessage(al_id, 
  		"У нас гости!" + "\n" +
  		"сообщение: " + text + "\n" +
  		"id: " + chatId + "\n" +
  		"user: " + ((username)?"@" + username:"no name " + "\u{1F636}"),
  		{"reply_markup": keyboard_main}
  	);
  }
});

bot.on("callback_query", (msg) => {
	let id  = msg.from.id;
	let answer = msg.data
	let answer_ls = answer.split("_");

	if (answer_ls.includes(("lampexit"))) {
		bot.sendMessage(id, 
			toggleGpio(lampexit, "Освещение на улице", "lampexit_state"), 
			{"reply_markup": (lampexit.readSync() === 0)?keyboard_lampexit_on:keyboard_lampexit_off});
	}

	if (answer_ls.includes(("house"))) {
		bot.sendMessage(id, 
			toggleGpio(house, "Отопление в доме", "house_state"), 
			{"reply_markup": (house.readSync() === 0)?keyboard_house_on:keyboard_house_off}
		);
	}

	if (answer_ls.includes(("heating"))) {
		bot.sendMessage(id, 
			toggleGpio(heatingrpi, "Обогрев щита", "heatingrpi_state"),
			{"reply_markup": (heatingrpi.readSync() === 0)?keyboard_water_on:keyboard_water_off}
		);
	}

	if (answer.includes('counter')) {
		bot.sendMessage(id, 'Передай показания ХВС ГВС через пробел', {"reply_markup": {force_reply: true}})
	}
})




