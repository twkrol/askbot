/* global askbot, AjaxToggle, inherits, showMessage */
var GroupJoinButton = function () {
  AjaxToggle.call(this);
};
inherits(GroupJoinButton, AjaxToggle);

GroupJoinButton.prototype.getPostData = function () {
  return { group_id: this._group_id };
};

GroupJoinButton.prototype.getHandler = function () {
  var me = this;
  return function () {
    $.ajax({
      type: 'POST',
      dataType: 'json',
      cache: false,
      data: me.getPostData(),
      url: askbot.urls.join_or_leave_group,
      success: function (data) {
        if (data.success) {
          var level = data.membership_level;
          var new_state = 'off-state';
          if (level === 'full' || level === 'pending') {
            new_state = 'on-state';
          }
          me.setState(new_state);
        } else {
          showMessage(me.getElement(), data.message);
        }
      }
    });
  };
};

GroupJoinButton.prototype.decorate = function (elem) {
  GroupJoinButton.superClass_.decorate.call(this, elem);
  this._group_id = this._element.data('groupId');
};
