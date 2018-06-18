'use strict';

const chalk = require('chalk');
const clear = require('clear');
const figlet = require('figlet');
const opn = require('opn');
const Spinner = require('cli-spinner').Spinner;

const { askSteamCredentials, askSteamAuthCode, askSteamCaptcha, askRestrictions, askWhichItems } = require('./lib/inquirer');
const { logon } = require('./lib/logon');
const { getInventory, gemify } = require('./lib/inventory');


const error = msg => console.log(chalk.red(msg));
const good = msg => console.log(chalk.green(msg));
const info = msg => console.log(chalk.cyan(msg));
const sleep = ms => new Promise(done => setTimeout(done, ms));
const title = () => {
  clear();
  good(figlet.textSync('Gemify'));
};

const includes = l => b => t => l.includes(t) === b;

const run = async(credentials, auth, captcha) => {
  if (!credentials) credentials = await askSteamCredentials();

  // Log onto steamcommunity.com
  const login = await logon({ ...credentials, ...auth, ...captcha });

  // Handle login errors
  if (Array.isArray(login)) {
    const [res, det] = login;
    if (res === 'AUTH')
      run(credentials, { [det === 'SteamGuard' ? 'steamguard' : 'twoFactorCode']: (await askSteamAuthCode()).code }, captcha);

    if (res === 'CAPTCHA') {
      opn(det);
      run(credentials, auth, await askSteamCaptcha());
    }

    if (res === 'TIMEOUT')
      process.exit(error('Steam has temporarily blocked you from attempting to log in. Try again later.'));

    if (res === 'INCORRECT')
      process.exit(error('Your credentials are incorrect.'));

    if (res === 'UNKNOWN')
      process.exit(error('Something went wrong while attempting to log in.'));

    return;
  }

  title();

  const { manager, community } = login;
  const { tradableOnly, marketableOnly } = await askRestrictions();

  // Bring up spinner and load inventory
  const spinner = new Spinner('Loading your inventory');
  spinner.setSpinnerDelay(75).start();
  const inventory = await getInventory(manager, tradableOnly, marketableOnly);
  spinner.stop();

  title();

  // Couldn't fetch inventory
  if (Array.isArray(inventory))
    return process.exit(error('Something went wrong while loading your inventory.'));

  // Ask which items to gemify
  const choices = Object.keys(inventory).filter(type => inventory[type].length).map(type => `${type} (${inventory[type].length})`);
  if (!choices.length)
    process.exit(error('You do not have any items that can be gemified!'));

  const types = (await askWhichItems(choices)).items.map(type => type.split(' ')[0]);

  // Remove items that aren't going to be gemified
  Object.keys(inventory).filter(includes(types)(true)).forEach(type => delete inventory.type);

  let totalGems = 0;
  let gemsGained = 0;
  let failedItems = 0;

  // Gemify per item type
  for (let i = 0; i < types.length; i++) {
    const type = types[i];
    title();
    const spinner = new Spinner(`Gemifying ${type}`);
    spinner.setSpinnerDelay(75).start();
    while (inventory[type].length) {
      const item = inventory[type].splice(0, 1)[0];
      const gem = await gemify(community, item);

      // Handle gemify errors
      if (Array.isArray(gem)) {
        const [res, message] = gem;
        if (res === 'ERROR')
          failedItems++;

        continue;
      }

      const { received, total } = gem;
      gemsGained += received;
      totalGems = total;
    }
    spinner.stop();
  }

  title();
  if (gemsGained) {
    info('Your items have been Gemified!');
    info(`You now have ${totalGems} Gems (+${gemsGained})`);
  }
  if (failedItems)
    error(`${failedItems} items could not be Gemified.`);

  process.exit();
};

title();
run();