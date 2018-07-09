const inquirer = require('inquirer');

const validate = e => !!e && e.length > 3;

module.exports = a = {
  askSteamCredentials: () =>
    inquirer.prompt([{
        name: 'accountName',
        type: 'input',
        message: 'Please enter your Steam username',
        validate
      },
      {
        name: 'password',
        type: 'password',
        message: 'Please enter your Steam password',
        validate
      }
    ]),
  askSteamCaptcha: () =>
    inquirer.prompt([{
      name: 'captcha',
      type: 'input',
      message: 'Please solve and enter your captcha',
      validate
    }]),
  askSteamAuthCode: () =>
    inquirer.prompt([{
      name: 'code',
      type: 'input',
      message: 'Please enter your authentication code',
      validate
    }]),
  askFamilyView: () =>
    inquirer.prompt([{
      name: 'pin',
      type: 'password',
      message: 'Please provide your family view pin',
      validate: e => e && !isNaN(e) && e.length === 4
    }]),
  askRestrictions: () =>
    inquirer.prompt([{
      name: 'tradableOnly',
      type: 'confirm',
      message: 'Only Gemify tradable items?'
    }, {
      name: 'marketableOnly',
      type: 'confirm',
      message: 'Only Gemify marketable items?'
    }]),
  askWhichItems: choices =>
    inquirer.prompt([{
      name: 'items',
      type: 'checkbox',
      message: 'Select items to Gemify',
      validate: i => !!i.length,
      choices
    }])
};