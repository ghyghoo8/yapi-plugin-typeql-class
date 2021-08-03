const controller = require('./controller.js');
// const yapi =require('yapi.js');

module.exports = function () {
  this.bindHook('add_router', function (addRouter) {
    addRouter({
      controller: controller,
      method: 'get',
      path: 'typeql/exchange',
      action: 'getContent'
    });
  });

  // google docs。线上问题统计查看器
  this.bindHook('add_router', function (addRouter) {
    addRouter({
      controller: controller,
      method: 'get',
      path: 'issues/onlinesheet',
      action: 'getIssuesOnlineFromGoogleSheet'
    });
  });
  
};