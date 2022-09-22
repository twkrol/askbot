/* global askbot, SimpleControl, inherits, showMessage */
/**
 * @constructor
 * @extends {SimpleControl}
 * @param {Comment} comment to upvote
 */
var CommentVoteButton = function (comment) {
    SimpleControl.call(this);
    /**
     * @param {Comment}
     */
    this._comment = comment;
    /**
     * @type {boolean}
     */
    this._voted = false;
    /**
     * @type {number}
     */
    this._score = 0;
};
inherits(CommentVoteButton, SimpleControl);
/**
 * @param {number} score
 */
CommentVoteButton.prototype.setScore = function (score) {
    this._score = score;
    if (this._element) this._element.html(score || '');
    this._element.trigger('askbot.afterSetScore', [this, score]);
};
/**
 * @param {boolean} voted
 */
CommentVoteButton.prototype.setVoted = function (voted) {
    this._voted = voted;
    if (!this._element) return;
    if (voted) this._element.addClass('js-active');
    if (!voted) this._element.removeClass('js-active');
};

CommentVoteButton.prototype.getVoteHandler = function () {
    var me = this;
    var comment = this._comment;
    return function () {
        var cancelVote =  !!me._voted;
        var post_id = me._comment.getId();
        var data = {
            cancel_vote: cancelVote,
            post_id: post_id
        };
        $.ajax({
            type: 'POST',
            data: data,
            dataType: 'json',
            url: askbot.urls.upvote_comment,
            cache: false,
            success: function (data) {
                if (data.success) {
                    me.setScore(data.score);
                    me.setVoted(!cancelVote);
                } else {
                    showMessage(comment.getElement(), data.message, 'after');
                }
            }
        });
    };
};

CommentVoteButton.prototype.getUserVote = function () {
  var userVotes = askbot.data.user_votes;
  if (!userVotes) return 0;
  return userVotes[this._comment.getId()];
};

CommentVoteButton.prototype.decorate = function (element) {
    this._element = element;
    this.setHandler(this.getVoteHandler());
    this._voted = !!this.getUserVote();
};

CommentVoteButton.prototype.createDom = function () {
    this._element = this.makeElement('div');
    if (this._score > 0) {
        this._element.html(this._score);
    }
    if (this._voted) {
        this._element.addClass('js-active');
    }
    this.decorate(this._element);
};

