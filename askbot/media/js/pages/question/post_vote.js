/* global askbot, showMessage, gettext */

var PostVote = (function () {

  var VoteTypes = {
    questionUpVote: 1,
    questionDownVote: 2,
    answerUpVote: 5,
    answerDownVote:6,
  };

  function updateBtnIcon(button, undo) {
    if (undo) {
      var btnGroup = $(button).closest('.js-post-vote-btn-group');
      btnGroup.find('.js-post-vote-btn').removeClass('js-active');
    } else {
      var wasActive = $(button).hasClass('js-active');
      if (wasActive) {
        $(button).removeClass('js-active');
      } else {
        $(button).addClass('js-active');
      }
    }
  }

  function setVoteNumber(button, number) {
    var btnGroup = button.closest('.js-post-vote-btn-group')
    btnGroup.find('.js-post-vote-number').text(number);
  }

  function handleVoted(button, voteType, data) {
    if (data.success === 0) {
      showMessage(button, data.message);
      return;
    } else {
      var undo = data.status === 1
      updateBtnIcon(button, undo);
      setVoteNumber(button, data.count);
      if ([VoteTypes.questionUpVote, VoteTypes.answerUpVote].includes(voteType)) {
        button.trigger('askbot.voteUp', [button, data]);
      }
      if ([VoteTypes.questionDownVote, VoteTypes.answerDownVote].includes(voteType)) {
        button.trigger('askbot.voteDown', [button, data]);
      }
      if (data.message && data.message.length > 0) {
        showMessage(button, data.message);
      }
      return;
    }
    /*jshint eqeqeq:true */
  }

  function handleFail(_, msg) {
    console.log('Callback invoke error: ' + msg);
  }

  function submit(button) {
    //this function submits votes
    var voteType = getVoteType(button);
    var postId = button.data('postId');
    if (!(voteType && postId)) {
      return
    }
    $.ajax({
      type: 'POST',
      cache: false,
      dataType: 'json',
      url: askbot.urls.vote_url, // eslint-disable-line
      data: { type: voteType, postId: postId },
      error: handleFail,
      success: function (data) {
        handleVoted(button, voteType, data);
      }
    });
  }

  function getVoteType(button) {
    var cls = button.attr('class');
    var postType = button.data('postType');
    if (postType.includes('question')) {
      if (cls.includes('upvote')) return VoteTypes.questionUpVote;
      if (cls.includes('downvote')) return VoteTypes.questionDownVote;
    } 
    if (postType.includes('answer')) {
      if (cls.includes('upvote')) return VoteTypes.answerUpVote;
      if (cls.includes('downvote')) return VoteTypes.answerDownVote;
    }
    return undefined
  }

  function vote(button) {
    if (!askbot.data.userId) {
      var pleaseLogin = '<p><a href="' + askbot.urls.user_signin + '">' + gettext('please login') + '</a></p>';
      var voteAnonymousMessage = '<p>' + gettext('anonymous users cannot vote') + '</p>' + pleaseLogin;
      showMessage(
        button,
        voteAnonymousMessage.replace('{{QuestionID}}', askbot.data.questionId)
        .replace('{{questionSlug}}', askbot.data.threadSlug)
      );
      return false;
    }
    submit(button);
  }

  return {
    init: function () {
      $('.js-post-vote-btn')
        .unbind('click')
        .click(function (evt) { vote($(evt.target)) });
    }
  };
})();
