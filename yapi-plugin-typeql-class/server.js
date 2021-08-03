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
  
};
