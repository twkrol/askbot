/* global askbot, gettext, inherits, WrappedElement, setupButtonEventHandlers, showMessage */
(function () {

  var LOGIN_MESSAGE = ' <a href="' + askbot.urls.user_signin + '">' + gettext('please login') + '</a>';
  var CANNOT_FLAG_MESSAGE = gettext('anonymous users cannot flag offensive posts') + LOGIN_MESSAGE;
  var CANNOT_UNFLAG_MESSAGE = gettext('anonymous users cannot remove post flags') + LOGIN_MESSAGE;

  var PostFlagger = function () {
    WrappedElement.call(this);
    this._flagBtn = undefined;
    this._unflagBtn = undefined;
    this._postId = undefined;
    this._postType = undefined;
    this._flagCounter = undefined;
  };
  inherits(PostFlagger, WrappedElement);

  PostFlagger.prototype.onError = function (_, msg) {
    console.log('Error in PostFlagger' + msg);
  };

  /** table of the legacy api call types
    var VoteType = {
        offensiveQuestion: 7,
        removeOffensiveQuestion: 7.5,
        removeAllOffensiveQuestion: 7.6,
        offensiveAnswer: 8,
        removeOffensiveAnswer: 8.5,
        removeAllOffensiveAnswer: 8.6,
    };
  */
  PostFlagger.prototype.getApiCallType = function(flagActionType) {
    if (flagActionType === 'flag') {
      if (this._postType === 'question') return '7'
      if (this._postType === 'answer') return '8'
    }
    if (flagActionType === 'unflag') {
      if (this._postType === 'question') return '7.5'
      if (this._postType === 'answer') return '8.5'
    }
    return undefined;
  };

  /** legacy code, call the giant "vote" api endpoint */
  PostFlagger.prototype.callApi = function(flagActionType, onSuccess) {
    //this function submits votes
    $.ajax({
      type: 'POST',
      cache: false,
      dataType: 'json',
      url: askbot.urls.vote_url,
      data: {
        type: this.getApiCallType(flagActionType),
        postId: this._postId
      },
      error: this.onError,
      success: onSuccess
    });
  }

  /** handler of the legacy api return value - `data` */
  PostFlagger.prototype.finishFlagHandler = function(data) {
    if (data.success === 1) {
      if (data.count > 0) {
        this._flagCounter.html(data.count);
        this._flagCounter.removeClass('js-hidden');
      } else {
        this._flagCounter.html('');
        this._flagCounter.addClass('js-hidden');
      }
      this.updateUnflagButtonVisibility(data.count);
    } else {
      showMessage($(this._flagBtn), data.message);
    }
  };

  PostFlagger.prototype.updateUnflagButtonVisibility = function (flagCount) {
    if (askbot.data.userIsAdminOrMod) {
      if (flagCount > 0) {
        this._unflagBtn.removeClass('js-hidden');
      } else {
        this._unflagBtn.addClass('js-hidden');
      }
    } else { // for regular user show if this post was flagged by the user
      var flagCountsByPostId = askbot.data.user_flag_counts_by_post_id;
      var postId = this._postId;
      if (flagCountsByPostId[postId.toString()]) {
        this._unflagBtn.removeClass('js-hidden');
      } else {
        this._unflagBtn.addClass('js-hidden');
      }
    }
  };

  PostFlagger.prototype.makeStartFlagHandler = function() {
    var me = this;
    var postId = this._postId;
    return function () {
      if (!askbot.data.userId) {
        showMessage(me._flagButton, CANNOT_FLAG_MESSAGE);
        return false;
      }
      me.callApi('flag', function(data) {
        askbot.data.user_flag_counts_by_post_id[postId.toString()] = 1;
        me.finishFlagHandler(data);
      });
    }
  };

  PostFlagger.prototype.makeStartUnflagHandler = function() {
    var me = this;
    var postId = this._postId;
    return function () {
      if (!askbot.data.userId) {
        showMessage(me._unflagButton, CANNOT_UNFLAG_MESSAGE);
        return false;
      }
      me.callApi('unflag', function(data) {
        askbot.data.user_flag_counts_by_post_id[postId.toString()] = 0;
        me.finishFlagHandler(data)
      });
    }
  };

  PostFlagger.prototype.getPostType = function () {
    if (this._element.hasClass('js-question-controls')) return 'question';
    if (this._element.hasClass('js-answer-controls')) return 'answer';
    return undefined;
  };

  PostFlagger.prototype.decorate = function(element) {
    this._element = $(element);
    this._postId = $(element).data('postId');
    this._flagBtn = $(element).find('.js-post-flag-btn');
    this._unflagBtn = $(element).find('.js-post-unflag-btn');
    this._flagCounter = $(element).find('.js-post-flag-count');
    this._postType = this.getPostType();
    setupButtonEventHandlers(this._flagBtn, this.makeStartFlagHandler());
    setupButtonEventHandlers(this._unflagBtn, this.makeStartUnflagHandler());
  }

  $('.js-post-controls').each(function(_, item) {
    var flagger = new PostFlagger();
    flagger.decorate($(item));
  });
})();
