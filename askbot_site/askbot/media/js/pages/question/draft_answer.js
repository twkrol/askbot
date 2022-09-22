/* global askbot, DraftPost, inherits */
var DraftAnswer = function () {
    DraftPost.call(this);
};
inherits(DraftAnswer, DraftPost);

DraftAnswer.prototype.setThreadId = function (id) {
    this._threadId = id;
};

DraftAnswer.prototype.getUrl = function () {
    return askbot.urls.saveDraftAnswer;
};

DraftAnswer.prototype.shouldSave = function () {
    return this.getData().text !== this._old_data.text;
};

DraftAnswer.prototype.getData = function () {
    return {
        'text': this._textElement.val(),
        'thread_id': this._threadId
    };
};

DraftAnswer.prototype.assignContentElements = function () {
    this._textElement = $('#editor');
};
