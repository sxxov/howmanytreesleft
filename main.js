const cliPadding = '        ';
const log = {};
const args = process.argv.slice(2);
const teamTreesURL = 'https://teamtrees.org';
// const teamTreesURL = 'http://127.0.0.1:8888/';
const goal = 20000000; // 20 mil
const currentProgressBar = {};
const directories = {};
let currentMilestone;
let profile;
let teamTreesData;

directories.stuff = `${__dirname}//stuff`;
directories.fonts = `${directories.stuff}//fonts`;
directories.src = `${directories.stuff}//src`;

const fs = require('fs');
const util = require('util');

log.newLine = () => {
	process.stdout.write('\r\n');
};

log.init = (currentTask) => {
	// console.clear();
	// console.log(`${cliPadding}initializing: ${currentTask}`);
	log.status(`initializing: ${currentTask}`);
};

log._colourize = (str, colour) => {
	return `\x1b[${colour}m${str}\x1b[0m`;
};

log.status = (currentTask, {
	silent = false,
	logging = true,
	colour = 0,
	progressBar,
	maxProgress,
	currentProgress
} = {}) => {
	if (currentProgressBar.bar !== undefined) {
		currentProgressBar.bar.stop();
	}
	console.clear();
	process.stdout.clearLine();
	process.stdout.cursorTo(0);
	console.clear();
	for (let i = 0; i < 13; i++) {
		log.newLine();
	}
	if (!silent) {
		process.stdout.write(`${cliPadding}${log._colourize(currentTask, colour)}`);
	}
	if (logging && log.lastMsg !== currentTask) {
		log.toLog(`${currentTask}`);
	}
	log.lastMsg = currentTask;
	log.newLine();
	log.newLine();
	// console.table({
	// 	'logging': logging,
	// 	'progressBar': progressBar,
	// 	'progress': progress
	// });
	currentProgressBar.bar = progressBar;
	if (currentProgress !== undefined) {
		currentProgressBar.progress = currentProgress;
	} else if (currentProgress === undefined && currentProgressBar.currentProgress === undefined) {
		currentProgressBar.currentProgress = 0;
	}
	if (maxProgress !== undefined) {
		currentProgressBar.maxProgress = maxProgress;
	} else if (maxProgress === undefined && currentProgressBar.maxProgress === undefined) {
		currentProgressBar.maxProgress = goal;
	}
	if (currentProgressBar.bar !== undefined) {
		currentProgressBar.bar.stop();
		currentProgressBar.bar.start(maxProgress, currentProgressBar.progress);
	} else {
		log.newLine();
	}
};

log.toLog = (d) => {
	try {
		const date = new Date().toString();

		fs.appendFile(`${directories.stuff}//.nodelog`, `${date.substring(0, date.indexOf('GMT') - 1)}: ${util.format(d)}\n`, () => {});
	} catch (e) {
		log.status('logging: error encountered when writing log');
	}
};

log.warn = (e) => {
	log.toast(`Warning: ${e}`, {
		'colour': 33 // FgYellow, https://stackoverflow.com/questions/9781218/how-to-change-node-jss-console-font-color
	});
};

log.error = (e) => {
	log.toast(e, {
		'colour': 31 // FgRed, https://stackoverflow.com/questions/9781218/how-to-change-node-jss-console-font-color
	});
};

log.toast = (msg, {
	colour = 0,
	logging = true
} = {}) => {
	log.newLine();
	process.stdout.write(`${cliPadding}${log._colourize(msg, colour)}`);
	if (logging) {
		log.toLog(`Toast: ${msg}`);
	}
};

log.toLog('\r\n');

const cliProgress = _require('cli-progress');
const seedrandom = _require('seedrandom');
const XMLHttpRequest = _require('xhr2');
const {
	IgApiClient
} = _require('instagram-private-api');
const {
	registerFont,
	createCanvas,
	loadImage
} = _require('canvas');
const cheerio = _require('cheerio');
const inquirer = _require('inquirer');
const schedule = _require('node-schedule');
const isOnline = _require('is-online');
const http = _require('http');
const https = _require('https');

log.init('sorting out credentials');
const credentials = JSON.parse(fs.readFileSync(`${directories.stuff}//credentials.json`));
const username = credentials.username;
const password = credentials.password;

log.init('IgApiClient');
const ig = new IgApiClient();

log.init('getting error descriptions');
const {
	ErrorUploadIG,
	ErrorDoesImageExistIG,
	ErrorGetHashtags,
	ErrorGetRemainingTreeAmount,
	ErrorLoop,
	ErrorLoginIG
} = _require(`${directories.stuff}//errors.js`);

log.init('registering fonts for canvas');
registerFont(`${directories.fonts}//Coolvetica-El.ttf`, {
	'family': 'Coolvetica El'
});
registerFont(`${directories.fonts}//Uniform Bold.otf`, {
	'family': 'Uniform Bold'
});

log.init('getting hashtags');
let hashtags;

try {
	hashtags = fs.readFileSync(`${directories.stuff}//hashtags.txt`, 'utf8')
		.replace(/(?:\r\n|\r|\n|,)/g, '') // https://stackoverflow.com/questions/784539/how-do-i-replace-all-line-breaks-in-a-string-with-br-tags
		.split('#')
		.filter((hashtag) => hashtag !== '')
		.map((hashtag) => `#${hashtag}`);
} catch (e) {
	throw new ErrorGetHashtags.ReadError();
}

(async() => {
	if (args[0] === '-f') {
		console.clear();
		await loop(true);
		die(1);
	}

	await loop();
	// fs.writeFileSync(`${__dirname}//stuff//oof.jpg`, await createIMG(10000000));
	// console.log(await getTeamTreesData());
})();

async function init(_lastMilestone) {
	return new Promise(async(resolve) => {
		log.status('init: working!');

		await testInternet();
		await loginIG();

		let imgUrl = await uploadIG(await createIMG(_lastMilestone));

		await doesImageExistIG(imgUrl)
			.catch(async(e) => {
				if (e !== new ErrorDoesImageExistIG.EmptyURL()) {
					log.status(e);
					log.status('doesImageExistIG: trying again in 3 seconds');
					await sleep(3000);
					await doesImageExistIG(imgUrl)
						.catch((e2) => {
							log.error(e2);
						});
					return;
				}
				log.error(e);
			});
		
		resolve();
		return;
	});
}

async function loop(force) {
	log.init('loop: starting');

	let lastMilestone;
	let nextMilestone;
	const scheduleFrequency = '*/10 * * * * *';

	let treeProgress = new cliProgress.SingleBar({
		'format': `${cliPadding}{bar}${cliPadding}{percentage}%${cliPadding}|${cliPadding}{value}/{total} trees...`
	}, cliProgress.Presets.shades_classic);

	teamTreesData = await getTeamTreesData();
	let remainingTreeAmount = teamTreesData.remainingTreeAmount;

	verifyMilestone(remainingTreeAmount);

	log.status(`next milestone: ${getNumberWithCommas(getMilestone(remainingTreeAmount))}`, {
		'progressBar': treeProgress,
		'maxProgress': goal,
		'currentProgress': goal - remainingTreeAmount
	});

	if (force) {
		teamTreesData = await getTeamTreesData();
		remainingTreeAmountTmp = teamTreesData.remainingTreeAmount;
		remainingTreeAmount = remainingTreeAmountTmp ? remainingTreeAmountTmp : remainingTreeAmount;
		nextMilestone = getMilestone(remainingTreeAmount);
		currentMilestone = getMilestone(remainingTreeAmount, 'last');
		lastMilestone = nextMilestone;
		verifyMilestone(remainingTreeAmount);
		await init(remainingTreeAmount);
		return;
	}

	let job = schedule.scheduleJob(scheduleFrequency, onJob);

	async function onJob() {
		teamTreesData = await getTeamTreesData();
		remainingTreeAmountTmp = teamTreesData.remainingTreeAmount;

		// if remainingTreeAmountTmp is 'false', it means the site is down, so reuse the old value
		remainingTreeAmount = remainingTreeAmountTmp ? remainingTreeAmountTmp : remainingTreeAmount;

		nextMilestone = getMilestone(remainingTreeAmount);

		// console.table({
		// 	'lastMilestone': lastMilestone,
		// 	'nextMilestone': nextMilestone,
		// 	'remainingTreeAmount': remainingTreeAmount
		// });

		verifyMilestone(remainingTreeAmount);

		if (lastMilestone > nextMilestone) {
			// next milestone reached!
			log.status('next milestone reached!', {
				'progressBar': treeProgress,
				'maxProgress': goal,
				'currentProgress': goal - remainingTreeAmount
			});
			_init(remainingTreeAmount);
			return;
		} else if (nextMilestone > lastMilestone) {
			// apparently people refunded??
			// log.error('what the fuck');
			wrongMilestone(`${nextMilestone} > ${lastMilestone}`);
			// _init(remainingTreeAmount);
		} else if (getTeamTreesData === 0) {
			log.error('we did it? :")');
			await init(0);
		} else {
			lastMilestone = nextMilestone;
		}

		log.status(`next milestone: ${getNumberWithCommas(nextMilestone)}`, {
			'progressBar': treeProgress,
			'maxProgress': goal,
			'currentProgress': goal - remainingTreeAmount
		});
	}

	async function _init(_remainingTreeAmount) {
		job.cancel();
		currentMilestone = getMilestone(_remainingTreeAmount, 'last');
		writeToStuff('.lastAchievedMilestone', {
			'lastAchievedMilestone': getMilestone(_remainingTreeAmount, 'last')
		});
		lastMilestone = nextMilestone;
		await init(_remainingTreeAmount);
		treeProgress = new cliProgress.SingleBar({
			'format': `${cliPadding}{bar}${cliPadding}{percentage}%${cliPadding}|${cliPadding}{value}/{total} trees...`
		}, cliProgress.Presets.shades_classic);
		job.reschedule(scheduleFrequency);
	}

	async function verifyMilestone(_remainingTreeAmount) {
		let lastAchievedMilestone = (getFromStuff('.lastAchievedMilestone'));

		lastAchievedMilestone = lastAchievedMilestone === undefined ? goal : lastAchievedMilestone.lastAchievedMilestone;
		if (_remainingTreeAmount > lastAchievedMilestone) {
			wrongMilestone(`${_remainingTreeAmount} > ${lastAchievedMilestone}`);
		}
	}

	function wrongMilestone(e) {
		log.error(new ErrorLoop.IncorrectLastAchievedMilestone(e));
	}

	// function getMilestone(currentNumber, mode) {
	// 	const frontNumbersStr = currentNumber.toString().substring(0, 2);
	// 	const otherNumbers = currentNumber.toString().substring(2);
	// 	const otherNumbersZeroOrNo = otherNumbers.substring(0, 1) === '0' ? '0' : '';
	// 	const base = Math.pow(10, Math.floor(Math.log(parseInt(otherNumbers)) / Math.log(10)));

	// 	switch (mode) {
	// 		case 'last':
	// 			if (currentNumber.toString().length > 4) {
	// 				return parseInt(`${frontNumbersStr}${otherNumbersZeroOrNo}${Math.ceil(otherNumbers / base) * base}`); // https://stackoverflow.com/questions/42653729/need-the-next-milestone-number-for-the-number-provided
	// 			}
	// 			return 10000;
	// 		default:
	// 			if (currentNumber.toString().length > 4) {
	// 				return parseInt(`${frontNumbersStr}${otherNumbersZeroOrNo}${Math.floor(otherNumbers / base) * base}`); // https://stackoverflow.com/questions/42653729/need-the-next-milestone-number-for-the-number-provided
	// 			}
	// 			return 0;
	// 	}
	// }
}

function getMilestone(__remainingTreeAmount, last) {
	const denominator = 100000;
	const currentNumberFloat = __remainingTreeAmount / denominator;
	
	// console.table({
	// 	'currentNumberFloat': currentNumberFloat,
	// 	'denominator': denominator
	// });
	
	if (last) {
		return Math.ceil(currentNumberFloat) * denominator;
	}
	return Math.floor(currentNumberFloat) * denominator;
	
}

async function testInternet() {
	return new Promise(async(resolve) => {
		for (;;) {
			if (await isOnline({
				'timeout': 10000
			})) {
				resolve();
				return;
			}
			log.status('testInternet: *insert dinosaur*');

		}
	});
}

async function uploadIG(buffer) {
	// const uploadingBarPrefix = 'uploadIG: ';
	// const uploadingBar = new cliProgress.SingleBar({
	// 	'format': `${cliPadding}${uploadingBarPrefix}{bar}${cliPadding}{percentage}%`,
	// 	'stopOnComplete': true,
	// 	'clearOnComplete': true,
	// 	'barsize': 40 - uploadingBarPrefix.length
	// }, cliProgress.Presets.shades_classic);

	// log.status('uploadIG: uploading', {
	// 	'progressBar': uploadingBar,
	// 	'maxProgress': 100,
	// 	'currentProgress': 0
	// });
	log.status('uploadIG: uploading');
	try {
		let caption = `we broke ${getNumberWithCommas(goal - currentMilestone)}!
.

last donator: ${teamTreesData.lastDonator}

teamtrees.org

20000 trees, equals to 1 leaf (on the post),
200000 leaves, equals to 1 tree,
2000000 dollars, equals to 1 forest,
20000000 trees, equals to 1 random bot
.

#teamtrees #teamtree #mrbeast ${randomHashtags()}`;
		const result = await ig.publish.photo({
			'file': buffer,
			'caption': caption
		});

		let url = `https://www.instagram.com/p/${result.media.code}/`;

		// log.status('uploadIG: uploading', {
		// 	'progressBar': uploadingBar,
		// 	'currentProgress': 100
		// });
		log.status(`uploadIG: upload function complete: ${url}`);
		if (result.status !== 'ok') {
			throw new ErrorUploadIG.NotOK();
		}
		return url;
	} catch (e) {
		if (e.message.indexOf('login_required') !== -1) {
			loginIG(true);
			uploadIG(buffer);
		} else {
			throw new ErrorUploadIG.Unknown(e);
		}
	}
}

async function loginIG(bypassTest) {
	log.status('loginIG: logging in');

	let userFeed;
	let firstPageItems;

	profile = getFromStuff('.profile');

	if (bypassTest) {
		await tryToLogin();
		return;
	}

	if (profile !== undefined) {
		try {
			log.status('loginIG: test: getting user feed');
			userFeed = ig.feed.user(profile.pk);
			log.status('loginIG: test: getting items');
			firstPageItems = await userFeed.items();
			// eslint-disable-next-line eqeqeq
			if (userFeed == undefined || firstPageItems == undefined) {
				throw new ErrorLoginIG.NullResponse();
			}
			log.status(`loginIG: test: already logged in as: ${profile.username}!`);
		} catch (e) {
			log.status('loginIG: test: not already logged in! proceeding...');
			await tryToLogin();
		}
	} else {
		log.status('loginIG: test: not already logged in! proceeding...');
		await tryToLogin();
	}
	async function tryToLogin() {
		try {

			ig.state.generateDevice(username);
			await ig.simulate.preLoginFlow();
			profile = await ig.account.login(username, password);
			await ig.simulate.postLoginFlow();
	
			writeToStuff('.profile', profile);
			log.status(`loginIG: logged in as: ${profile.username}`);
			return;
		} catch (e2) {
			log.status(ig.state.checkpoint); // Checkpoint info here
			await ig.challenge.auto(true); // Requesting sms-code or click "It was me" button
			log.status(ig.state.checkpoint); // Challenge info here
			const {
				code
			} = await inquirer.prompt([
				{
					'type': 'input',
					'name': 'code',
					'message': 'Enter code'
				}
			]);
	
			log.status(await ig.challenge.sendSecurityCode(code));
			return;
		}
	}
}

async function doesImageExistIG(url) {
	return new Promise((resolve) => {
		log.status('doesImageExistIG: verifying if the image uploaded correctly');
		if (url === null || url === undefined || url === 'https://www.instagram.com/p//') {
			throw new ErrorDoesImageExistIG.EmptyURL();
		}
		let xhttp = new XMLHttpRequest();

		xhttp.open('GET', url, true);
		xhttp.timeout = 10000;
		xhttp.onload = () => {
			if (xhttp.status === 200) {
				log.status(`doesImageExistIG: image exists! ${url}`);
				resolve();
				return;
			}
			throw new (new ErrorDoesImageExistIG()).NotFound();
			// die();

		};
		xhttp.ontimeout = () => {
			throw new (new ErrorDoesImageExistIG()).Timeout();
		};
		xhttp.send(null);
	});
}

function randomHashtags() {
	let maxHashtags = 20;
	let rnd = Math.floor(Math.random() * maxHashtags) + 3;
	let hashtagArray = shuffleArray(hashtags);

	hashtagArray = hashtagArray.slice(0, rnd);
	return hashtagArray.join(' ');

	function shuffleArray(array) {
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
	
			[array[i], array[j]] = [array[j], array[i]];
		}
		return array;
	}
}

function writeToStuff(file, lastAchievedMilestone) {
	fs.writeFileSync(`${directories.stuff}//${file}`, JSON.stringify(lastAchievedMilestone));
}

function getFromStuff(file) {
	try {
		return JSON.parse(fs.readFileSync(`${directories.stuff}//${file}`));
	} catch (e) {
		log.warn(`getFromFile: ${directories.stuff}//${file} doesn\'t exist!`);
	}
}

async function getTeamTreesData() {
	const webData = await getWebData(teamTreesURL);

	// .catch((e) => {
	// 	log.error(e);
	// 	return false;
	// });
	if (webData === false) {
		return false;
	}
	const $0 = cheerio.load(webData);
	const dataCount = parseInt($0('#totalTrees').attr('data-count'));
	const remainingTreeAmount = goal - dataCount;
	const lastMilestone = getMilestone(remainingTreeAmount, 'last');
	const diff = lastMilestone - remainingTreeAmount;
	let donatorAmounts = $0('.media.pt-3 .feed-tree-count');
	let totalRecentDonations = 0;
	let lastDonatorIndex = 24;

	console.log(diff);

	// recent donators, max people = 24
	for (let i = 0; i < 24; i++) {
		const span = donatorAmounts[i];
		const amountStr = span.children[0].data;
		const amount = parseInt(amountStr.substring(0, amountStr.indexOf(' ')));

		totalRecentDonations += amount;

		if (diff < totalRecentDonations) {
			lastDonatorIndex = i;
			break;
		}
	}
	let lastDonator;

	if (lastDonatorIndex < 24) {
		lastDonator = $0('.media.pt-3 p.media-body strong')[lastDonatorIndex].children[0].data;
	} else {
		lastDonator = 'idk';
	}

	return {
		'remainingTreeAmount': remainingTreeAmount,
		'lastDonator': lastDonator
	};

	function getWebData(_url) {
		return new Promise((resolve) => { // https://stackoverflow.com/questions/6287297/reading-content-from-url-with-node-js
			const client = _url.toString().indexOf('https') === 0 ? https : http;
		
			client.get(_url, (res) => {

				if ((`${res.statusCode}`).match(/^2\d\d$/)) {
					let data = '';
		
					// A chunk of data has been recieved.
					res.on('data', (chunk) => {
						data += chunk;
					});
		
					// The whole response has been received. Print out the result.
					res.on('end', () => {
						resolve(data);
						return data;
					});

				} else {
					// throw new ErrorGetRemainingTreeAmount.HTTP(res.statusCode);
					return false;
				}
		
			}).on('error', (e) => {
				// throw new ErrorGetRemainingTreeAmount.HTTP(e);
				return false;
			});
		});
	}
}

async function createIMG(__lastMilestone) {
	log.status('createIMG: creating image');
	const leafCanvas = createCanvas(1080, 1080);
	const leafCtx = leafCanvas.getContext('2d');
	const padding = 50;
	const fontColour = 'black';
	const remainingTreeAmountWithCommas = getNumberWithCommas(__lastMilestone);
	const remainingTreeAmount = __lastMilestone;
	const prefix = 'trees left:';
	const numberFont = '150px Uniform Bold';
	const treesLeftFont = '50px Coolvetica El';
	const leaf = await loadImage(`${directories.src}//leaf.png`);

	leafCtx.quality = 'best';
	leafCtx.patternQuality = 'best';
	leafCtx.save();

	const resolution = 1 / 20000;
	const leafWidth = remainingTreeAmount === 0 ? 1 : (remainingTreeAmount / goal) * 1000;
	const leafHeight = leafWidth * 0.835985312117503;
	const leafAmount = Math.round((goal - remainingTreeAmount) * resolution);
	const loadingBarPrefix = 'createIMG: ';
	const loadingBar = new cliProgress.SingleBar({
		'format': `${cliPadding}${loadingBarPrefix}{bar}${cliPadding}{percentage}%${cliPadding}|${cliPadding}{value}/{total} leaves`,
		'stopOnComplete': true,
		'clearOnComplete': true,
		'barsize': 40 - loadingBarPrefix.length
	}, cliProgress.Presets.shades_classic);

	for (let i = 0; i < leafAmount; i++) {
		const rand = [
			seedrandom(i).int32(),
			seedrandom(-i).int32(),
			seedrandom(i * 2).int32()
		];
		const x = rand[0] < 0 ? (-rand[0] / 2147483647) * 1080 : (rand[0] / 2147483647) * 1080;
		const y = rand[1] < 0 ? (-rand[1] / 2147483647) * 1080 : (rand[1] / 2147483647) * 1080;
		const s = rand[2] < 0 ? (-rand[2] / 2147483647) : (rand[2] / 2147483647);

		leafCtx.rotate(x / 3);
		leafCtx.drawImage(leaf, x, y, leafWidth * s + 0.5, leafHeight * s + 0.5);

		log.status('createIMG: drawing leaves', {
			'progressBar': loadingBar,
			'maxProgress': leafAmount,
			'currentProgress': i
		});
		// console.table({
		// 	'x': x,
		// 	'y': y,
		// 	'w': leafWidth,
		// 	'h': leafHeight
		// });
	}

	log.status('createIMG: finishing image');
	// debugCanvas();

	leafCtx.restore();

	const textCanvas = createCanvas(1080, 1080);
	const textCtx = textCanvas.getContext('2d');

	textCtx.quality = 'best';
	textCtx.patternQuality = 'best';
	textCtx.save();

	textCtx.fillStyle = fontColour;
	textCtx.textBaseline = 'middle';

	const distanceToEdge = (textCanvas.width - getTextWidth(remainingTreeAmountWithCommas, numberFont)) / 2;

	if (distanceToEdge > padding) {
		// fits the canvas
		textCtx.textAlign = 'left';

		textCtx.font = treesLeftFont;
		textCtx.fillText(prefix.split(' ')[0], distanceToEdge, (textCanvas.height / 2) - 130);
		textCtx.fillText(prefix.split(' ')[1], distanceToEdge, (textCanvas.height / 2) - 90);

		textCtx.font = numberFont;
		textCtx.fillText(remainingTreeAmountWithCommas, (textCanvas.width / 2) - getTextWidth(remainingTreeAmountWithCommas) / 2, textCanvas.height / 2);
	} else {
		// doesn't fit canvas, needs extra 1 line
		textCtx.textAlign = 'center';

		textCtx.font = treesLeftFont;
		textCtx.fillText(prefix, textCanvas.width / 2, textCanvas.height / 2 - fontSize / 2 + 5);

		textCtx.font = numberFont;
		textCtx.fillText(remainingTreeAmountWithCommas, (textCanvas.width / 2) - getTextWidth(remainingTreeAmountWithCommas) / 2, textCanvas.height / 2 + fontSize / 2 - 5);
	}

	const textXORCanvas = createCanvas(1080, 1080);
	const textXORCtx = textXORCanvas.getContext('2d');

	textXORCtx.quality = 'best';
	textXORCtx.patternQuality = 'best';
	textXORCtx.save();

	textXORCtx.drawImage(leafCanvas, 0, 0);
	textXORCtx.globalCompositeOperation = 'xor';
	textXORCtx.drawImage(textCanvas, 0, 0);

	const textSourceOutCanvas = createCanvas(1080, 1080);
	const textSourceOutCtx = textSourceOutCanvas.getContext('2d');

	textSourceOutCtx.quality = 'best';
	textSourceOutCtx.patternQuality = 'best';
	textSourceOutCtx.save();

	textSourceOutCtx.drawImage(leafCanvas, 0, 0);
	textSourceOutCtx.globalCompositeOperation = 'source-out';
	textSourceOutCtx.drawImage(textCanvas, 0, 0);

	const everythingCanvas = createCanvas(1080, 1080);
	const everythingCtx = everythingCanvas.getContext('2d');

	everythingCtx.quality = 'best';
	everythingCtx.patternQuality = 'best';
	everythingCtx.beginPath();
	everythingCtx.rect(0, 0, leafCanvas.width, leafCanvas.height);
	everythingCtx.fillStyle = 'white';
	everythingCtx.fill();
	everythingCtx.save();

	everythingCtx.drawImage(textXORCanvas, 0, 0);
	everythingCtx.drawImage(textSourceOutCanvas, 0, 0);

	log.status('createIMG: image created');
	return everythingCanvas.toBuffer('image/jpeg', {
		'quality': 1
	});

	function getTextWidth(txt, font) {
		const testCanvas = leafCanvas;
		const testCtx = testCanvas.getContext('2d');

		testCtx.font = font;
		return testCtx.measureText(txt).width;
	}

}

function getNumberWithCommas(number) {
	return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function _require(module) {
	log.init(module);
	return require(module);
}

function pause() {
	console.log('pause: press any key to continue');
	process.stdin.setRawMode(true);
	return new Promise((resolve) => process.stdin.once('data', () => {
		process.stdin.setRawMode(false);
		resolve();
	}));
}

function die(code) {
	if (code) {
		process.exit(code);
	} else {
		process.exit();
	}
}
