/* global WrappedElement, inherits, gettext */
/**
 * @constructor
 */
var DraftPost = function () {
  WrappedElement.call(this);
};
inherits(DraftPost, WrappedElement);

/**
 * @return {string}
 */
DraftPost.prototype.getUrl = function () {
  throw 'Not Implemented';
};

/**
 * @return {boolean}
 */
DraftPost.prototype.shouldSave = function () {
  throw 'Not Implemented';
};

/**
 * @return {object} data dict
 */
DraftPost.prototype.getData = function () {
  throw 'Not Implemented';
};

DraftPost.prototype.backupData = function () {
  this._old_data = this.getData();
};

DraftPost.prototype.showNotification = function () {
  var note = $('.editor-status span');
  note.hide();
  note.html(gettext('draft saved...'));
  note.fadeIn().delay(3000).fadeOut();
};

DraftPost.prototype.getSaveHandler = function () {
  var me = this;
  return function (save_synchronously) {
    if (me.shouldSave()) {
      $.ajax({
        type: 'POST',
        cache: false,
        dataType: 'json',
        async: save_synchronously ? false : true,
        url: me.getUrl(),
        data: me.getData(),
        success: function (data) {
          if (data.success && !save_synchronously) {
            me.showNotification();
          }
          me.backupData();
        }
      });
    }
  };
};

DraftPost.prototype.decorate = function (element) {
  this._element = element;
  this.assignContentElements();
  this.backupData();
  setInterval(this.getSaveHandler(), 30000);//auto-save twice a minute
  var me = this;
  window.onbeforeunload = function () {
    var saveHandler = me.getSaveHandler();
    saveHandler(true);
    //var msg = gettext("%s, we've saved your draft, but...");
    //return interpolate(msg, [askbot.data.userName]);
  };
};
