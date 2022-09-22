/* global askbot, inherits, DraftPost */
/**
 * @contstructor
 */
var DraftQuestion = function () {
    DraftPost.call(this);
};
inherits(DraftQuestion, DraftPost);

DraftQuestion.prototype.getUrl = function () {
    return askbot.urls.saveDraftQuestion;
};

DraftQuestion.prototype.shouldSave = function () {
    var newd = this.getData();
    var oldd = this._old_data;
    return (
        newd.title !== oldd.title ||
        newd.text !== oldd.text ||
        newd.tagnames !== oldd.tagnames
    );
};

DraftQuestion.prototype.getData = function () {
    return {
        'title': this._title_element.val(),
        'text': this._text_element.val(),
        'tagnames': this._tagnames_element.val()
    };
};

DraftQuestion.prototype.assignContentElements = function () {
    this._title_element = $('#id_title');
    this._text_element = $('#editor');
    this._tagnames_element = $('#id_tags');
};
