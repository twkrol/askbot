/* global AutoCompleter, askbot */
var ProxyAuthorInputs = function () {
  WrappedElement.call(this);
};
inherits(ProxyAuthorInputs, WrappedElement);

ProxyAuthorInputs.prototype.decorate = function(element) {
  this._element = element;
  var proxyUserNameInput = element.find('#js-post-author-username');
  var proxyUserEmailInput = element.find('#js-post-author-email');
  if (proxyUserNameInput.length === 1) {
    var userSelectHandler = function (data) {
      proxyUserEmailInput.val(data.data[0]);
    };
    var fakeUserAc = new AutoCompleter({
      url: askbot.urls.get_users_info,
      minChars: 1,
      useCache: true,
      matchInside: true,
      maxCacheLength: 100,
      delay: 10,
      onItemSelect: userSelectHandler
    });
    fakeUserAc.decorate(proxyUserNameInput);
  }
};
