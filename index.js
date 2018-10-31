'use strict';

const chalk = require('chalk');
const clear = require('clear');
const figlet = require('figlet');
const opn = require('opn');
const Spinner = require('cli-spinner').Spinner;

const { askSteamCredentials, askSteamAuthCode, askSteamCaptcha, askFamilyView, askRestrictions, askWhichItems } = require('./lib/inquirer');
const { logon, checkFamilyView, parentalUnlock } = require('./lib/logon');
const { getInventory, gemify } = require('./lib/inventory');

const includes = l => b => t => l.includes(t) === b;
const error = msg => console.log(chalk.red(msg));
const good = msg => console.log(chalk.green(msg));
const info = msg => console.log(chalk.cyan(msg));
const sleep = ms => new Promise(done => setTimeout(done, ms));
const title = () => {
  clear();
  good(figlet.textSync('Gemify'));
};

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
      await opn(det);
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

  const familyView = await checkFamilyView(community);
  if (Array.isArray(familyView)) {
    const [familyError] = familyView;
    if (familyError === 'ERROR')
      process.exit(error('Something went wrong while checking family view status.'));

    if (familyError === 'NOTLOGGEDIN')
      process.exit(error('Log in failed, please try again.'));
  }

  let pin;
  if (familyView)
    pin = (await askFamilyView()).pin;

  const unlocked = await parentalUnlock(community, pin);

  if (Array.isArray(unlocked)) {
    const [parentalError] = unlocked;
    if (parentalError === 'ERROR')
      process.exit(error('Could not unlock family view; please make sure to provide the right PIN'));
  }

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

  let totalGems = 0;
  let gemsGained = 0;
  let failedItems = 0;

  // Gemify per item type
  for (let i = 0; i < types.length; i++) {
    const type = types[i];
    title();
    const spinner = new Spinner(`Gemifying ${type}`);
    spinner.setSpinnerDelay(75).start();
    spinner.gemsGained = 0;
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
      spinner.text = `Gemifying ${type} (+${spinner.gemsGained += received})`;
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
