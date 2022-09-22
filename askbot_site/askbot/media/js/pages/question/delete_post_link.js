/* global askbot, inherits, showMessage, SimpleControl, gettext */
(function() {
  var DeletePostLink = function () {
    SimpleControl.call(this);
    this._post_id = null;
  };
  inherits(DeletePostLink, SimpleControl);

  DeletePostLink.prototype.setPostId = function (id) {
    this._post_id = id;
  };

  DeletePostLink.prototype.getPostId = function () {
    return this._post_id;
  };

  DeletePostLink.prototype.getPostElement = function () {
    return $('#js-post-' + this.getPostId());
  };

  DeletePostLink.prototype.isPostDeleted = function () {
    return this._post_deleted;
  };

  DeletePostLink.prototype.setPostDeleted = function (is_deleted) {
    var post = this.getPostElement();
    if (is_deleted === true) {
      post.addClass('js-post-deleted');
      this._post_deleted = true;
      this.getElement().html(gettext('undelete'));
    } else if (is_deleted === false) {
      post.removeClass('js-post-deleted');
      this._post_deleted = false;
      this.getElement().html(gettext('delete'));
    }
  };

  DeletePostLink.prototype.getDeleteHandler = function () {
    var me = this;
    return function () {
      var data = {
        'post_id': me.getPostId(),
        //todo rename cancel_vote -> undo
        'cancel_vote': me.isPostDeleted() ? true : false
      };
      $.ajax({
        type: 'POST',
        data: data,
        dataType: 'json',
        url: askbot.urls.delete_post,
        cache: false,
        success: function (data) {
          if (data.success) {
            me.setPostDeleted(data.is_deleted);
          } else {
            showMessage(me.getElement(), data.message);
          }
        }
      });
    };
  };

  DeletePostLink.prototype.decorate = function (element) {
    this._element = element;
    this._post_deleted = this.getPostElement().hasClass('js-post-deleted');
    this._post_id = $(element).data('postId');
    this.setHandler(this.getDeleteHandler());
  };

  $('.js-post-delete-btn').each(function (idx, element) {
    var deleter = new DeletePostLink();
    deleter.decorate($(element));
  });
})();
