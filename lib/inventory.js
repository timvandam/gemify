const ofClass = c => i => i.getTag('item_class').internal_name === c;
const hasBorder = b => i => i.getTag('cardborder').internal_name === b;
const isMarketable = b => i => i.marketable === b;

module.exports = {
  getInventory: (manager, tradable, marketable) => new Promise(back => {
    manager.getInventoryContents(753, 6, tradable, (error, inventory) => {
      if (error)
        return back(['ERROR']);

      if (marketable)
        inventory = inventory.filter(isMarketable(true));

      const sortedInventory = {
        Emoticons: inventory.filter(ofClass('item_class_4')),
        Backgrounds: inventory.filter(ofClass('item_class_3')),
        SaleItems: inventory.filter(ofClass('item_class_10')),
        Cards: inventory.filter(ofClass('item_class_2')).filter(hasBorder('cardborder_0')),
        FoilCards: inventory.filter(ofClass('item_class_2')).filter(hasBorder('cardborder_1'))
      };

      back(sortedInventory);
    });
  }),
  gemify: (community, item) => new Promise(back => {
    const appid = item.market_hash_name.split('-')[0];
    community.getGemValue(appid, item.assetid, (error, result) => {
      if (error)
        return back(['ERROR', error.message]);

      const gemAmount = result.gemValue;
      community.turnItemIntoGems(appid, item.assetid, gemAmount, (error, result) => {
        if (error)
          return back(['ERROR', error.message]);

        back({ received: result.gemsReceived, total: result.totalGems});
      });
    });
  })
};
