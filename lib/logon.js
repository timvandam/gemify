const SteamCommunity = require('steamcommunity');
const SteamTrades = require('steam-tradeoffer-manager');
const community = new SteamCommunity;
const manager = new SteamTrades({ pollInterval: -1, community });

module.exports = {
  logon: credentials => new Promise(back => {
    community.login(credentials, (error, sessionID, cookies) => {
      if (error) {
        const { message } = error;
        if (message === 'SteamGuard' || message === 'SteamGuardMobile')
          return back(['AUTH', message]);

        if (message === 'CAPTCHA')
          return back(['CAPTCHA', error.captchaurl]);

        if (message === 'There have been too many login failures from your network in a short time period.  Please wait and try again later.')
          return back(['TIMEOUT']);

        if (message === 'The account name or password that you have entered is incorrect.')
          return back(['INCORRECT']);

        return back(['UNKNOWN']);
      }

      manager.setCookies(cookies);

      back({ manager, community });
    });
  })
};