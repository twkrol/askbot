/* global gettext, inherits, showMessage, SimpleControl, ModalDialog */
(function () {
  /**
   * @constructor
   */
  var ThreadUsersDialog = function () {
    SimpleControl.call(this);
    this._heading_text = 'Add heading with the setHeadingText()';
  };
  inherits(ThreadUsersDialog, SimpleControl);

  ThreadUsersDialog.prototype.setHeadingText = function (text) {
    this._heading_text = text;
  };

  ThreadUsersDialog.prototype.showUsers = function (html) {
    this._dialog.setContent(html);
    this._dialog.show();
  };

  ThreadUsersDialog.prototype.startShowingUsers = function () {
    var me = this;
    var threadId = this._threadId;
    var url = this._url;
    $.ajax({
      type: 'GET',
      data: {'thread_id': threadId},
      dataType: 'json',
      url: url,
      cache: false,
      success: function (data) {
        if (data.success) {
          me.showUsers(data.html);
        } else {
          showMessage(me.getElement(), data.message, 'after');
        }
      }
    });
  };

  ThreadUsersDialog.prototype.decorate = function (element) {
    this._element = element;
    ThreadUsersDialog.superClass_.decorate.call(this, element);
    this._threadId = element.data('threadId');
    this._url = element.data('url');
    var dialog = new ModalDialog();
    dialog.setRejectButtonText('');
    dialog.setAcceptButtonText(gettext('Back to the question'));
    dialog.setHeadingText(this._heading_text);
    dialog.setAcceptHandler(function () { dialog.hide(); });
    var dialog_element = dialog.getElement();
    $(dialog_element).find('.modal-footer').css('text-align', 'center');
    $('body').append(dialog_element);
    this._dialog = dialog;
    var me = this;
    this.setHandler(function () {
      me.startShowingUsers();
    });
  };

  var showSharedUsers = $('.js-see-related-users');
  if (showSharedUsers.length) {
    var usersPopup = new ThreadUsersDialog();
    usersPopup.setHeadingText(gettext('Shared with the following users:'));
    usersPopup.decorate(showSharedUsers);
  }

  var showSharedGroups = $('.js-see-related-groups');
  if (showSharedGroups.length) {
    var groupsPopup = new ThreadUsersDialog();
    groupsPopup.setHeadingText(gettext('Shared with the following groups:'));
    groupsPopup.decorate(showSharedGroups);
  }
})();
