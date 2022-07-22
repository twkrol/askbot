/* global askbot, gettext, inherits, interpolate, showMessage, setupButtonEventHandlers, WrappedElement */
(function () {
  var AcceptAnswerButton = function () {
    WrappedElement.call(this);
  };
  inherits(AcceptAnswerButton, WrappedElement);

  AcceptAnswerButton.prototype.handleSuccess = function(data) {
    if (data.allowed == '0' && data.success == '0') {
      showMessage(this._element, gettext('Please sign in to vote'));
    } else if (data.allowed == '-1') {
      var message = interpolate(
        gettext('sorry, you cannot %(accept_own_answer)s'),
        {'accept_own_answer': askbot.messages.acceptOwnAnswer},
        true
      );
      showMessage(this._element, message);
    } else if (data.status == '1') {
      this.unmarkAcceptedAnswer(this.getCurrentAnswerElement());
      this._element.trigger('askbot.unacceptAnswer', [this._element, data]);
    } else if (data.success == '1') {
      this.unmarkAllAcceptedAnswers();
      this.markAcceptedAnswer(this.getCurrentAnswerElement());
      this._element.trigger('askbot.acceptAnswer', [this._element, data]);
    } else {
      showMessage(this._element, data.message);
    }
  };

  AcceptAnswerButton.prototype.getCurrentAnswerElement = function () {
    return $(this._element).closest('.js-answer');
  };

  AcceptAnswerButton.prototype.unmarkAcceptedAnswer = function (answerElement) {
    var elt = $(answerElement);
    elt.removeClass('js-accepted-answer');
    elt.find('.js-accept-answer-btn').removeClass('js-active');
  };

  AcceptAnswerButton.prototype.markAcceptedAnswer = function (answerElement) {
    var elt = $(answerElement);
    elt.addClass('js-accepted-answer');
    elt.find('.js-accept-answer-btn').addClass('js-active');
  };

  AcceptAnswerButton.prototype.unmarkAllAcceptedAnswers = function () {
    var me = this;
    $('.js-answer').each(function (_, answerElement) {
      me.unmarkAcceptedAnswer($(answerElement));
    });
  };

  AcceptAnswerButton.prototype.acceptAnswer = function () {
    var me = this;
    $.ajax({
      type: 'POST',
      cache: false,
      dataType: 'json',
      url: askbot.urls.vote_url,
      data: {
        type: 0,
        postId: this._element.data('postId')
      },
      error: function(error) {
        console.log('error in AcceptAnswerButton', error)
      },
      success: function (data) {
        me.handleSuccess(data);
      }
    });
  };

  AcceptAnswerButton.prototype.getClickHandler = function () {
    var me = this;
    return function(evt) {
      evt.stopPropagation();
      me.acceptAnswer()
    }

  };

  AcceptAnswerButton.prototype.decorate = function(element) {
    this._element = $(element);
    setupButtonEventHandlers(this._element, this.getClickHandler());
  }

  $('.js-accept-answer-btn').each(function (_, element) {
    var btn = new AcceptAnswerButton();
    btn.decorate($(element));
  });
})();
