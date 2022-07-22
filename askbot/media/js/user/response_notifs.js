var ResponseNotifs = function () {
  WrappedElement.call(this);
};
inherits(ResponseNotifs, WrappedElement);

ResponseNotifs.prototype.showMessage = function (text) {
  this._actionStatus.html(text);
  this._actionStatus.fadeIn('fast');
};

ResponseNotifs.prototype.hideMessage = function () {
  this._actionStatus.fadeOut('fast');
};

ResponseNotifs.prototype.uncheckNotifs = function (memoIds) {
  var snippets = this.getSnippets(memoIds);
  snippets.closest('.js-message-group').find('input[type="checkbox"]').prop('checked', false);
};

ResponseNotifs.prototype.clearNewNotifs = function (memoIds) {
  var snippets = this.getSnippets(memoIds);
  snippets.removeClass('js-new');
  snippets.addClass('js-seen');
};

ResponseNotifs.prototype.makeMarkAsSeenHandler = function () {
  var me = this;
  return function () {
    var memoIds = me.getCheckedMemoIds();
    if (memoIds.length === 0) {
      me.showMessage(gettext('Please select at least one item'));
      return;
    }
    $.ajax({
      type: 'POST',
      cache: false,
      dataType: 'json',
      data: JSON.stringify({'memo_ids': memoIds}),
      url: askbot.urls.clearNewNotifications,
      success: function (response_data) {
        if (response_data.success) {
          me.hideMessage();
          me.clearNewNotifs(memoIds);
          me.uncheckNotifs(memoIds);
        }
      }
    });
  };
};

ResponseNotifs.prototype.makeSelectAllHandler = function () {
  return function () {
    $('.js-messages input[type="checkbox"]').prop('checked', true);
  };
};

ResponseNotifs.prototype.makeSelectNoneHandler = function () {
  return function () {
    $('.js-messages input[type="checkbox"]').prop('checked', false);
  };
};

ResponseNotifs.prototype.getSnippets = function (memoIds) {
  var snippets = $();
  for (var i = 0; i < memoIds.length; i++) {
    var memoId = memoIds[i];
    snippets = snippets.add('.js-message[data-message-id="' + memoId + '"]');
  }
  return snippets;
};

ResponseNotifs.prototype.deleteEmptySnippetGroups = function () {
  var groups = $('.js-message-group');
  $.each(groups, function (idx, item) {
    var group = $(item);
    var messages = group.find('.js-message');
    if (messages.length === 0) {
      group.remove();
    }
  });
};

ResponseNotifs.prototype.deleteSnippets = function (memoIds) {
  var snippets = this.getSnippets(memoIds);
  var me = this;
  snippets.fadeOut(function () {
    $(this).remove();
    me.deleteEmptySnippetGroups();
  });
};

ResponseNotifs.prototype.getCheckedMemoIds = function () {
  var memoIds = [];
  var checkedCb = $('.js-messages :checked');
  for (var i = 0; i < checkedCb.length; i++) {
    var cb = $(checkedCb[i]);
    var memoId = cb.closest('.js-message-details').data('messageId');
    memoIds.push(memoId);
  }
  return memoIds;
};

ResponseNotifs.prototype.makeDeleteHandler = function () {
  var me = this;
  return function () {
    var memoIds = me.getCheckedMemoIds();
    if (memoIds.length === 0) {
      me.showMessage(gettext('Please select at least one item'));
      return;
    }
    $.ajax({
      type: 'POST',
      cache: false,
      dataType: 'json',
      data: JSON.stringify({'memo_ids': memoIds}),
      url: askbot.urls.deleteNotifications,
      success: function (response_data) {
        if (response_data.success) {
          me.hideMessage();
          me.deleteSnippets(memoIds);
          if ($('.js-message-group').length === 0) {
            $('.js-no-notifications').removeClass('js-hidden');
          }
        }
      }
    });
    return false;
  };
};

ResponseNotifs.prototype.makeSelectGroupHandler = function(btn, group) {
  return function() {
    var checkBoxes = group.find('.js-message-details').find('input[type="checkbox"]');
    checkBoxes.prop('checked', btn.prop('checked'));
  }
};

ResponseNotifs.prototype.decorate = function (element) {
  this._element = element;

  this._actionStatus = $('.js-action-status');

  var btn = element.find('.js-mark-as-seen');
  setupButtonEventHandlers(btn, this.makeMarkAsSeenHandler());

  btn = element.find('.js-select-all');
  setupButtonEventHandlers(btn, this.makeSelectAllHandler());

  btn = element.find('.js-select-none');
  setupButtonEventHandlers(btn, this.makeSelectNoneHandler());

  btn = element.find('.js-delete');
  setupButtonEventHandlers(btn, this.makeDeleteHandler());

  var msgGroupButtons = $('.js-message-group-cb');
  var me = this;
  msgGroupButtons.each(function(idx, item) {
    var btn = $(item);
    var group = btn.closest('.js-message-group');
    setupButtonEventHandlers(btn, me.makeSelectGroupHandler(btn, group));
  });

};
