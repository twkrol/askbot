/* global askbot, addExtraCssClasses, inherits, removeButtonEventHandlers, showMessage, WrappedElement,
 WMD, SimpleEditor, TinyMCE,
 gettext, interpolate, makeKeyHandler, setupButtonEventHandlers,
 mediaUrl */

/** Form for editing and posting new comment
 * supports 3 editors: markdown, tinymce and plain textarea.
 * There is only one instance of this form in use on the question page.
 * It can be attached to any comment on the page, or to a new blank
 * comment.
 */
var EditCommentForm = function () {
    WrappedElement.call(this);
    this._comment = null;
    this._commentsWidget = null;
    this._element = null;
    this._editorReady = false;
    this._text = '';
};
inherits(EditCommentForm, WrappedElement);

EditCommentForm.prototype.hide = function () {
    this._element.hide();
};

EditCommentForm.prototype.show = function () {
    this._element.show();
};

EditCommentForm.prototype.getEditor = function () {
    return this._editor;
};

EditCommentForm.prototype.getEditorType = function () {
    if (askbot.settings.commentsEditorType === 'rich-text') {
        return askbot.settings.editorType;
    }
    return 'plain-text';
};

EditCommentForm.prototype.startTinyMCEEditor = function () {
    var editorId = this.makeId('comment-editor');
    var opts = {
        mode: 'exact',
        content_css: mediaUrl('media/css/tinymce/comments-content.css'),
        elements: editorId,
        theme: 'advanced',
        theme_advanced_toolbar_location: 'top',
        theme_advanced_toolbar_align: 'left',
        theme_advanced_buttons1: 'bold, italic, |, link, |, numlist, bullist',
        theme_advanced_buttons2: '',
        theme_advanced_path: false,
        plugins: '',
        width: '100%',
        height: '70'
    };
    var editor = new TinyMCE(opts);
    editor.setId(editorId);
    editor.setText(this._text);
    this._editorBox.prepend(editor.getElement());
    editor.start();
    this._editor = editor;
};

EditCommentForm.prototype.startWMDEditor = function () {
    var editor = new WMD({minLines: 3});
    editor.setEnabledButtons('bold italic link code ol ul');
    editor.setPreviewerEnabled(false);
    editor.setText(this._text);
    this._editorBox.prepend(editor.getElement());//attach DOM before start
    editor.start();//have to start after attaching DOM
    this._editor = editor;
};

EditCommentForm.prototype.startSimpleEditor = function () {
    this._editor = new SimpleEditor({minLines: 3});
    this._editorBox.prepend(this._editor.getElement());
};

EditCommentForm.prototype.startEditor = function () {
    var editorType = this.getEditorType();
    if (editorType === 'tinymce') {
        this.startTinyMCEEditor();
        //@todo: implement save on enter and character counter in tinyMCE
        return;
    } else if (editorType === 'markdown') {
        this.startWMDEditor();
    } else {
        this.startSimpleEditor();
    }

    //code below is common to SimpleEditor and WMD
    var editor = this._editor;
    var editorElement = this._editor.getElement();

    var limitLength = this.getCommentTruncator();
    editorElement.blur(limitLength);
    editorElement.focus(limitLength);
    editorElement.keyup(limitLength);
    editorElement.keyup(limitLength);

    var updateCounter = this.getCounterUpdater();
    var escapeHandler = makeKeyHandler(27, this.getCancelHandler());
    //todo: try this on the div
    //this should be set on the textarea!
    editorElement.blur(updateCounter);
    editorElement.focus(updateCounter);
    editorElement.keyup(updateCounter);
    editorElement.keyup(escapeHandler);

    if (askbot.settings.saveCommentOnEnter) {
        var save_handler = makeKeyHandler(13, this.getSaveHandler());
        editor.getElement().keydown(save_handler);
    }

    editorElement.trigger('askbot.afterStartEditor', [editor]);
};

EditCommentForm.prototype.getCommentsWidget = function () {
    return this._commentsWidget;
};

/**
 * attaches comment editor to a particular comment
 */
EditCommentForm.prototype.attachTo = function (comment, mode) {
    this._comment = comment;
    this._type = mode;//action: 'add' or 'edit'
    this._commentsWidget = comment.getContainerWidget();
    this._text = comment.getText();
    comment.getElement().after(this.getElement());
    comment.getElement().hide();
    this._commentsWidget.hideOpenEditorButton();//hide add comment button
    //fix up the comment submit button, depending on the mode
    if (this._type === 'add') {
        this._submit_btn.html(gettext('add comment'));
        if (this._minorEditBox) {
            this._minorEditBox.hide();
        }
    } else {
        this._submit_btn.html(gettext('save comment'));
        if (this._minorEditBox) {
            this._minorEditBox.show();
        }
    }
    //enable the editor
    this.getElement().show();
    this.enableForm();
    this.startEditor();
    this._editor.setText(this._text);
    var ed = this._editor;
    var onFocus = function () {
        ed.putCursorAtEnd();
    };
    this._editor.focus(onFocus);
    setupButtonEventHandlers(this._submit_btn, this.getSaveHandler());
    setupButtonEventHandlers(this._cancel_btn, this.getCancelHandler());

    this.getElement().trigger('askbot.afterEditCommentFormAttached', [this, mode]);
};

EditCommentForm.prototype.getCounterUpdater = function () {
  //returns event handler
  var counter = this._text_counter;
  var editor = this._editor;
  var handler = function () {
    var commentLength = editor.getText().length;
    var minLength = askbot.settings.minCommentBodyLength;

    if (commentLength === 0) {
      counter.html(interpolate(gettext('enter at least %s characters'), [minLength]));
      counter.attr('class', 'js-comment-length-counter js-comment-length-counter-too-short');
    } else if (commentLength < minLength) {
      counter.html(interpolate(gettext('enter at least %s more characters'), [minLength - commentLength]));
      counter.attr('class', 'js-comment-length-counter js-comment-length-counter-too-short');
    } else {
      var maxLength = askbot.data.maxCommentLength;
      if (commentLength > Math.round(0.9 * maxLength)) {
        counter.attr('class', 'js-comment-length-counter js-comment-length-counter-too-long');
      } else if (commentLength > Math.round(0.7 * maxLength)) {
        counter.attr('class', 'js-comment-length-counter js-comment-length-counter-almost-too-long');
      } else {
        counter.attr('class', 'js-comment-length-counter');
      }

      var charsLeft = maxLength - commentLength;

      if (charsLeft > 0) {
        counter.html(interpolate(gettext('%s characters left'), [charsLeft]));
      } else {
        counter.html(gettext('maximum comment length reached'));
      }
    }
    return true;
  };
  return handler;
};

EditCommentForm.prototype.getCommentTruncator = function () {
    var me = this;
    return function () {
        var editor = me.getEditor();
        var text = editor.getText();
        var maxLength = askbot.data.maxCommentLength;
        if (text.length > maxLength) {
            text = text.substr(0, maxLength);
            editor.setText(text);
        }
    };
};

/**
 * @todo: clean up this method so it does just one thing
 */
EditCommentForm.prototype.canCancel = function () {
    if (this._element === null) {
        return true;
    }
    if (this._editor === undefined) {
        return true;
    }
    var ctext = this._editor.getText();
    if ($.trim(ctext) === $.trim(this._text)) {
        return true;
    } else if (this.confirmAbandon()) {
        return true;
    }
    this._editor.focus();
    return false;
};

EditCommentForm.prototype.getCancelHandler = function () {
  var me = this;
  return function (evt) {
    if (me.canCancel()) {
      var widget = me.getCommentsWidget();
      widget.handleDeletedComment();
      me.detach();
      evt.preventDefault();
      $(document).trigger('askbot.afterEditCommentFormCancel', [me]);
    }
    return false;
  };
};

EditCommentForm.prototype.detach = function () {
    if (this._comment === null) {
        return;
    }
    var postCommentsWidget = this._comment.getContainerWidget();
    if (postCommentsWidget.canAddComment()) {
        postCommentsWidget.showOpenEditorButton();
    }
    if (this._comment.isBlank()) {
        this._comment.dispose();
    } else {
        this._comment.getElement().show();
    }
    this.reset();
    this._element = this._element.detach();

    this._editor.dispose();
    this._editor = undefined;

    removeButtonEventHandlers(this._submit_btn);
    removeButtonEventHandlers(this._cancel_btn);
};

EditCommentForm.prototype.createDom = function () {
    this._element = $('<form></form>');
    this._element.attr('class', 'js-post-comment-form');
    this._arrow = getTemplate('.bent-arrow');
    this._element.append(this._arrow);

    var div = $('<div></div>');
    this._element.append(div);

    /** a stub container for the editor */
    this._editorBox = div;
    /**
     * editor itself will live at this._editor
     * and will be initialized by the attachTo()
     */

    this._controlsBox = this.makeElement('div');
    this._controlsBox.addClass('js-edit-comment-controls');
    div.append(this._controlsBox);

    this._submit_btn = $('<button class="btn"></button>');
    addExtraCssClasses(this._submit_btn, 'primaryButtonClasses');
    this._controlsBox.append(this._submit_btn);
    this._cancel_btn = $('<button class="btn btn-muted"></button>');
    addExtraCssClasses(this._cancel_btn, 'cancelButtonClasses');
    this._cancel_btn.html(gettext('cancel'));
    this._controlsBox.append(this._cancel_btn);

    this._text_counter = $('<span></span>').attr('class', 'js-comment-length-counter');
    this._controlsBox.append(this._text_counter);


    //if email alerts are enabled, add a checkbox "suppress_email"
    if (askbot.settings.enableEmailAlerts === true) {
        this._minorEditBox = this.makeElement('div');
        this._minorEditBox.addClass('js-minor-edit');
        this._controlsBox.append(this._minorEditBox);
        var checkBox = this.makeElement('input');
        checkBox.attr('type', 'checkbox');
        checkBox.attr('name', 'suppress_email');
        checkBox.attr('id', 'suppress_email');
        this._minorEditBox.append(checkBox);
        var label = this.makeElement('label');
        label.attr('for', 'suppress_email');
        label.html(gettext('minor edit (don\'t send alerts)'));
        this._minorEditBox.append(label);
    }

};

EditCommentForm.prototype.isEnabled = function () {
    return (this._submit_btn.attr('disabled') !== 'disabled');//confusing! setters use boolean
};

EditCommentForm.prototype.enableForm = function () {
    this._submit_btn.attr('disabled', false);
    this._cancel_btn.attr('disabled', false);
};

EditCommentForm.prototype.disableForm = function () {
    this._submit_btn.attr('disabled', true);
    this._cancel_btn.attr('disabled', true);
};

EditCommentForm.prototype.reset = function () {
    this._comment = null;
    this._text = '';
    this._editor.setText('');
    this.enableForm();
};

EditCommentForm.prototype.confirmAbandon = function () {
    this._editor.focus();
    this._editor.getElement().scrollTop();
    this._editor.setHighlight(true);
    var answer = confirm(
        gettext('Are you sure you don\'t want to post this comment?')
    );
    this._editor.setHighlight(false);
    return answer;
};

EditCommentForm.prototype.getSuppressEmail = function () {
    return this._element.find('input[name="suppress_email"]').is(':checked');
};

EditCommentForm.prototype.setSuppressEmail = function (bool) {
    this._element.find('input[name="suppress_email"]').prop('checked', bool).trigger('change');
};

EditCommentForm.prototype.updateUserPostsData = function(json) {
    //add any posts by the user to the list
    var data = askbot.data.user_posts;
    $.each(json, function(idx, item) {
        if (item.user_id === askbot.data.userId && !data[item.id]) {
            data[item.id] = 1;
        }
    });
};

EditCommentForm.prototype.getSaveHandler = function () {
    var me = this;
    var editor = this._editor;
    return function () {
        var commentData, timestamp, userName;
        if (me.isEnabled() === false) {//prevent double submits
            return false;
        }
        me.disableForm();

        var text = editor.getText();
        if (text.length < askbot.settings.minCommentBodyLength) {
            editor.focus();
            me.enableForm();
            return false;
        }

        //display the comment and show that it is not yet saved
        me.hide();
        me._comment.getElement().show();
        commentData = me._comment.getData();
        timestamp = commentData.comment_added_at || gettext('just now');
        if (me._comment.isBlank()) {
            userName = askbot.data.userName;
        } else {
            userName = commentData.user_display_name;
        }

        me._comment.setContent({
            'html': editor.getHtml(),
            'text': text,
            'user_display_name': userName,
            'comment_added_at': timestamp,
            'user_profile_url': askbot.data.userProfileUrl,
            'user_avatar_url': askbot.data.userCommentAvatarUrl,
            'is_approved': !askbot.data.userIsWatched
        });
        me._comment.setDraftStatus(true);
        var postCommentsWidget = me._comment.getContainerWidget();
        if (postCommentsWidget.canAddComment()) {
            postCommentsWidget.showOpenEditorButton();
        }
        var commentsElement = postCommentsWidget.getElement();
        commentsElement.trigger('askbot.beforeCommentSubmit');

        var post_data = {
            comment: text,
            avatar_size: askbot.settings.commentAvatarSize
        };

        var post_url;
        if (me._type === 'edit') {
            post_data.comment_id = me._comment.getId();
            post_url = askbot.urls.editComment;
            post_data.suppress_email = me.getSuppressEmail();
            me.setSuppressEmail(false);
        } else {
            post_data.post_type = me._comment.getParentType();
            post_data.post_id = me._comment.getParentId();
            post_url = askbot.urls.postComments;
        }

        $.ajax({
            type: 'POST',
            url: post_url,
            dataType: 'json',
            data: post_data,
            success: function (json) {
                //type is 'edit' or 'add'
                me._comment.setDraftStatus(false);
                if (me._type === 'add') {
                    me._comment.dispose();
                    me.updateUserPostsData(json);
                    me._comment.getContainerWidget().reRenderComments(json);
                } else {
                    me._comment.setContent(json);
                }
                me.detach();
                commentsElement.trigger('askbot.afterCommentSubmitSuccess');
            },
            error: function (xhr) {
                me._comment.getElement().show();
                showMessage(me._comment.getElement(), xhr.responseText, 'after');
                me._comment.setDraftStatus(false);
                me.detach();
                me.enableForm();
                commentsElement.trigger('askbot.afterCommentSubmitError');
            }
        });
        return false;
    };
};
