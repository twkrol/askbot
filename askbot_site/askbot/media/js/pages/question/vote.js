/* global askbot, gettext, interpolate, showMessage */
/**
 * legacy Vote class
 * handles all sorts of vote-like operations
 */
var Vote = (function () {
    // All actions are related to a question
    var questionId;
    //question slug to build redirect urls
    var questionSlug;
    // The object we operate on actually. It can be a question or an answer.
    var postId;
    var currentUserId;
    var answerContainerIdPrefix = 'post-id-';
    var voteContainerId = 'js-vote-buttons';
    var imgIdPrefixAccept = 'answer-img-accept-';
    var imgIdPrefixAnswerVoteup = 'answer-img-upvote-';
    var imgIdPrefixAnswerVotedown = 'answer-img-downvote-';
    var voteNumberClass = 'vote-number';
    var removeAnswerLinkIdPrefix = 'answer-delete-link-';
    var questionSubscribeUpdates = 'question-subscribe-updates';
    var questionSubscribeSidebar = 'question-subscribe-sidebar';

    var acceptAnonymousMessage = gettext('insufficient privilege');

    var pleaseLogin = ' <a href="' + askbot.urls.user_signin + '">' + gettext('please login') + '</a>';

    //todo: this below is probably not used
    var subscribeAnonymousMessage = gettext('anonymous users cannot subscribe to questions') + pleaseLogin;
    var voteAnonymousMessage = gettext('anonymous users cannot vote') + pleaseLogin;
    //there were a couple of more messages...
    var removeConfirmation = gettext('confirm delete');
    var removeAnonymousMessage = gettext('anonymous users cannot delete/undelete') + pleaseLogin;
    var recoveredMessage = gettext('post recovered');
    var deletedMessage = gettext('post deleted');

    var VoteType = {
        questionUpVote: 1,
        questionDownVote: 2,
        answerUpVote: 5,
        answerDownVote:6,

        acceptAnswer: 0,
        removeQuestion: 9,//deprecate
        removeAnswer: 10,//deprecate
        questionSubscribeUpdates: 11,
        questionUnsubscribeUpdates: 12
    };

    var getQuestionVoteUpButton = function () {
        return $('#js-post-upvote-btn-' + questionId);
    };
    var getQuestionVoteDownButton = function () {
        return $('#js-post-downvote-btn-' + questionId);
    };
    var getAnswerVoteUpButtons = function () {
        var answerVoteUpButton = 'div.' + voteContainerId + ' div[id^="js-post-upvote-btn-"]';
        return $(answerVoteUpButton);
    };
    var getAnswerVoteDownButtons = function () {
        var answerVoteDownButton = 'div.' + voteContainerId + ' div[id^="' + imgIdPrefixAnswerVotedown + '"]';
        return $(answerVoteDownButton);
    };
    var getAnswerVoteUpButton = function (id) {
        return $('#js-post-upvote-btn-' + id);
    };
    var getAnswerVoteDownButton = function (id) {
        var answerVoteDownButton = 'div.' + voteContainerId + ' div[id="' + imgIdPrefixAnswerVotedown + id + '"]';
        return $(answerVoteDownButton);
    };

    var setVoteImage = function (voteType, undo, object) {
      var flag = undo ? false : true;
      if (object.hasClass('js-active')) {
        object.removeClass('js-active');
      } else {
        object.addClass('js-active');
      }

      if (undo) {
        if (voteType === VoteType.questionUpVote || voteType === VoteType.questionDownVote) {
          $(getQuestionVoteUpButton()).removeClass('js-active');
          $(getQuestionVoteDownButton()).removeClass('js-active');
        } else {
          $(getAnswerVoteUpButton(postId)).removeClass('js-active');
          $(getAnswerVoteDownButton(postId)).removeClass('js-active');
        }
      }
    };

    var setVoteNumber = function (object, number) {
        var voteNumber = object.parent('div.' + voteContainerId).find('div.' + voteNumberClass);
        $(voteNumber).text(number);
    };

    var callback_vote = function (object, voteType, data) {
        /*jshint eqeqeq:false */
        if (data.success == '0') {
            showMessage(object, data.message);
            return;
        } else {
            if (data.status == '1') {
                setVoteImage(voteType, true, object);
                object.trigger('askbot.voteDown', [object, data]);
            } else {
                setVoteImage(voteType, false, object);
                object.trigger('askbot.voteUp', [object, data]);
            }
            setVoteNumber(object, data.count);
            if (data.message && data.message.length > 0) {
                showMessage(object, data.message);
            }
            return;
        }
        /*jshint eqeqeq:true */
    };


    var getquestionSubscribeUpdatesCheckbox = function () {
        return $('#' + questionSubscribeUpdates);
    };

    var getquestionSubscribeSidebarCheckbox = function () {
        return $('#' + questionSubscribeSidebar);
    };

    var getremoveAnswersLinks = function () {
        var removeAnswerLinks = 'a[id^="' + removeAnswerLinkIdPrefix + '"]';
        return $(removeAnswerLinks);
    };

    var bindEvents = function () {
        // accept answers
        var acceptedButtons = 'div.' + voteContainerId + ' div[id^="' + imgIdPrefixAccept + '"]';
        $(acceptedButtons).unbind('click').click(function (event) {
            Vote.accept($(event.target));
        });

        // question vote up
        var questionVoteUpButton = getQuestionVoteUpButton();
        questionVoteUpButton.unbind('click').click(function (event) {
            Vote.vote($(event.target), VoteType.questionUpVote);
        });

        var questionVoteDownButton = getQuestionVoteDownButton();
        questionVoteDownButton.unbind('click').click(function (event) {
            Vote.vote($(event.target), VoteType.questionDownVote);
        });

        var answerVoteUpButton = getAnswerVoteUpButtons();
        answerVoteUpButton.unbind('click').click(function (event) {
            Vote.vote($(event.target), VoteType.answerUpVote);
        });

        var answerVoteDownButton = getAnswerVoteDownButtons();
        answerVoteDownButton.unbind('click').click(function (event) {
            Vote.vote($(event.target), VoteType.answerDownVote);
        });

        getquestionSubscribeUpdatesCheckbox().unbind('click').click(function (event) {
            //despeluchar esto
            if (this.checked) {
                getquestionSubscribeSidebarCheckbox().attr({'checked': true});
                Vote.vote($(event.target), VoteType.questionSubscribeUpdates);
            } else {
                getquestionSubscribeSidebarCheckbox().attr({'checked': false});
                Vote.vote($(event.target), VoteType.questionUnsubscribeUpdates);
            }
        });

        getquestionSubscribeSidebarCheckbox().unbind('click').click(function (event) {
            if (this.checked) {
                getquestionSubscribeUpdatesCheckbox().attr({'checked': true});
                Vote.vote($(event.target), VoteType.questionSubscribeUpdates);
            } else {
                getquestionSubscribeUpdatesCheckbox().attr({'checked': false});
                Vote.vote($(event.target), VoteType.questionUnsubscribeUpdates);
            }
        });

        getremoveAnswersLinks().unbind('click').click(function () {
            Vote.remove(this, VoteType.removeAnswer);
        });
    };

    var submit = function (object, voteType, callback) {
        //this function submits votes
        $.ajax({
            type: 'POST',
            cache: false,
            dataType: 'json',
            url: askbot.urls.vote_url,
            data: { type: voteType, postId: postId },
            error: handleFail,
            success: function (data) {
                callback(object, voteType, data);
            }
        });
    };

    var handleFail = function (xhr, msg) {
        alert('Callback invoke error: ' + msg);
    };

    // callback function for Accept Answer action
    var callback_accept = function (object, voteType, data) {
        /*jshint eqeqeq:false */
        if (data.allowed == '0' && data.success == '0') {
            showMessage(object, acceptAnonymousMessage);
        } else if (data.allowed == '-1') {
            var message = interpolate(
                gettext('sorry, you cannot %(accept_own_answer)s'),
                {'accept_own_answer': askbot.messages.acceptOwnAnswer},
                true
            );
            showMessage(object, message);
        } else if (data.status == '1') {
            $('#' + answerContainerIdPrefix + postId).removeClass('js-accepted-answer');
            object.trigger('askbot.unacceptAnswer', [object, data]);
        } else if (data.success == '1') {
            var answers = ('div[id^="' + answerContainerIdPrefix + '"]');
            $(answers).removeClass('js-accepted-answer');
            $('#' + answerContainerIdPrefix + postId).addClass('js-accepted-answer');
            object.trigger('askbot.acceptAnswer', [object, data]);
        } else {
            showMessage(object, data.message);
        }
        /*jshint eqeqeq:true */
    };

    var callback_remove = function (object, voteType, data) {
        /*jshint eqeqeq:false */
        if (data.success == '1') {
            if (removeActionType == 'delete') {
                postNode.addClass('js-deleted-post');
                postRemoveLink.innerHTML = gettext('undelete');
                showMessage(object, deletedMessage);
            } else if (removeActionType == 'undelete') {
                postNode.removeClass('js-deleted-post');
                postRemoveLink.innerHTML = gettext('delete');
                showMessage(object, recoveredMessage);
            }
        } else {
            showMessage(object, data.message);
        }
        /*jshint eqeqeq:true */
    };

    return {
        init: function (qId, qSlug, questionAuthor, userId) {
            questionId = qId;
            questionSlug = qSlug;
            questionAuthorId = questionAuthor;
            currentUserId = '' + userId;//convert to string
            bindEvents();
        },

        //accept answer
        accept: function (object) {
            object = object.closest('.answer-img-accept');
            postId = object.attr('id').substring(imgIdPrefixAccept.length);
            submit(object, VoteType.acceptAnswer, callback_accept);
        },

        vote: function (object, voteType) {
            object = object.closest('.js-post-vote');
            if (!currentUserId || currentUserId.toUpperCase() === 'NONE') {
                if (voteType === VoteType.questionSubscribeUpdates || voteType === VoteType.questionUnsubscribeUpdates) {
                    getquestionSubscribeSidebarCheckbox().removeAttr('checked');
                    getquestionSubscribeUpdatesCheckbox().removeAttr('checked');
                    showMessage(object, subscribeAnonymousMessage);
                } else {
                    showMessage(
                        $(object),
                        voteAnonymousMessage.replace(
                                '{{QuestionID}}',
                                questionId
                            ).replace(
                                '{{questionSlug}}',
                                questionSlug
                            )
                    );
                }
                return false;
            }
            // up and downvote processor
            if (voteType === VoteType.answerUpVote) {
                postId = object.attr('id').substring(imgIdPrefixAnswerVoteup.length);
            } else if (voteType === VoteType.answerDownVote) {
                postId = object.attr('id').substring(imgIdPrefixAnswerVotedown.length);
            } else {
                postId = questionId;
            }

            submit(object, voteType, callback_vote);
        },
        //delete question or answer (comments are deleted separately)
        remove: function (object, voteType) {
            if (!currentUserId || currentUserId.toUpperCase() === 'NONE') {
                showMessage(
                    $(object),
                    removeAnonymousMessage.replace(
                            '{{QuestionID}}',
                            questionId
                        ).replace(
                            '{{questionSlug}}',
                            questionSlug
                        )
                    );
                return false;
            }
            bits = object.id.split('-');
            postId = bits.pop();/* this seems to be used within submit! */
            postType = bits.shift();

            var do_proceed = false;
            postNode = $('#post-id-' + postId);
            postRemoveLink = object;
            if (postNode.hasClass('js-deleted-post')) {
                removeActionType = 'undelete';
                do_proceed = true;
            } else {
                removeActionType = 'delete';
                do_proceed = confirm(removeConfirmation);
            }
            if (do_proceed) {
                submit($(object), voteType, callback_remove);
            }
        }
    };
})();
