/* global askbot, notify, SimpleControl, inherits, gettext */
(function() {
  var AskButton = function () {
    SimpleControl.call(this);
    this._handler = function (evt) {
      if (askbot.data.userIsReadOnly === true) {
        notify.show(gettext('Sorry, you have only read access'));
        evt.preventDefault();
      }
    };
  };
  inherits(AskButton, SimpleControl);

  var askButton = new AskButton();
  askButton.decorate($('.js-ask-btn'));
})();
