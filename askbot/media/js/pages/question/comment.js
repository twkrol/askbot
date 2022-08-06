/* global askbot, gettext, inherits, WrappedElement, showMessage,
 decodeHtml, runMathJax, 
 EditCommentForm, CommentConvertLink, CommentVoteButton, DeleteIcon,
 EditLink */
var Comment = function (widget, data) { //eslint-disable-line
    WrappedElement.call(this);
    this._container_widget = widget;
    this._data = data || {};
    this._element = null;
    this._is_convertible = askbot.data.userIsAdminOrMod;
    this.convert_link = null;
    this._delete_prompt = gettext('delete this comment');
    this._editorForm = undefined;
    if (data && data.is_deletable) {
        this._deletable = data.is_deletable;
    } else {
        this._deletable = false;
    }
    if (data && data.is_editable) {
        this._editable = data.is_deletable;
    } else {
        this._editable = false;
    }
};
inherits(Comment, WrappedElement);

Comment.prototype.getData = function () {
    return this._data;
};

Comment.prototype.startEditing = function () {
    var form = this._editorForm || new EditCommentForm();
    this._editorForm = form;
    // if new comment:
    if (this.isBlank()) {
        form.attachTo(this, 'add');
    } else {
        form.attachTo(this, 'edit');
    }
    form.show();
};

Comment.prototype.decorate = function (element) {
    this._element = $(element);
    var comment_id = this._element.data('postId') || undefined;
    this._data = {'id': comment_id};

    this._contentBox = this._element.find('.js-comment-content');

    var timestamp = this._element.find('.js-timeago');
    this._dateElement = timestamp;
    this._data.comment_added_at = timestamp.attr('title');
    var userLink = this._element.find('.js-comment-author');
    this._data.user_display_name = userLink.html();
    // @todo: read other data

    var commentBody = this._element.find('.js-comment-body');
    if (commentBody.length > 0) {
        this._comment_body = commentBody;
    }

    var delete_img = this._element.find('.js-comment-delete-btn');
    if (delete_img.length > 0) {
        this._deletable = true;
        this._delete_icon = new DeleteIcon(this.deletePrompt);
        this._delete_icon.setHandler(this.getDeleteHandler());
        this._delete_icon.decorate(delete_img);
    }
    var edit_link = this._element.find('.js-comment-edit-btn');
    if (edit_link.length > 0) {
        this._editable = true;
        this._edit_link = new EditLink('action-link js-comment-edit-btn');
        this._edit_link.setHandler(this.getEditHandler());
        this._edit_link.decorate(edit_link);
    }

    var convert_link = this._element.find('.js-comment-convert-btn');
    if (this._is_convertible) {
        this._convert_link = new CommentConvertLink(comment_id);
        this._convert_link.decorate(convert_link);
    } else {
        convert_link.remove();
    }

    var deleter = this._element.find('.js-comment-delete-btn');
    if (deleter.length > 0) {
        this._comment_delete = deleter;
    }

    var vote = new CommentVoteButton(this);
    vote.decorate(this._element.find('.js-post-upvote-btn'));
    this._voteButton = vote;

    this._userLink = this._element.find('.js-comment-author');

    this._element.trigger('askbot.afterCommentDecorate', [this]);

    var menuElement = this._element.find('.js-dropdown-menu');
    if (!menuElement.hasClass('js-mounted')) {
      var menu = new DropdownMenu();
      menu.decorate(menuElement);
    }
};

Comment.prototype.setDraftStatus = function () {
    return;
    //@todo: implement nice feedback about posting in progress
    //maybe it should be an element that lasts at least a second
    //to avoid the possible brief flash
    // if (isDraft === true) {
    //     this._normalBackground = this._element.css('background');
    //     this._element.css('background', 'rgb(255, 243, 195)');
    // } else {
    //     this._element.css('background', this._normalBackground);
    // }
};


Comment.prototype.isBlank = function () {
    return this.getId() === undefined;
};

Comment.prototype.getId = function () {
    return this._data ? this._data.id : undefined;
};

Comment.prototype.hasContent = function () {
    return ('id' in this._data);
    //shortcut for 'user_profile_url' 'html' 'user_display_name' 'comment_age'
};

Comment.prototype.hasText = function () {
    return ('text' in this._data);
};

Comment.prototype.getContainerWidget = function () {
    return this._container_widget;
};

Comment.prototype.getParentType = function () {
    return this._container_widget.getPostType();
};

Comment.prototype.getParentId = function () {
    return this._container_widget.getPostId();
};

/**
 * this function is basically an "updateDom"
 */
Comment.prototype.setContent = function (data) {
    this._data = $.extend(this._data, data);
    data = this._data;
    this._element.data('postId', data.id);
    this._element.attr('data-post-id', data.id);
    this._element.prop('id', 'js-post-' + data.id);

    // 1) create the votes element if it is not there
    var vote = this._voteButton;
    vote.setVoted(data.upvoted_by_user);
    vote.setScore(data.score);

    // 3) set the comment html
    if (EditCommentForm.prototype.getEditorType() === 'tinymce') {
        var theComment = $('<div/>');
        theComment.html(data.html);
        //sanitize, just in case
        this._comment_body.empty();
        this._comment_body.append(theComment);
        this._data.text = data.html;
    } else {
        this._comment_body.empty();
        this._comment_body.html(data.html);
    }

    // 4) update user info
    this._userLink.attr('href', data.user_profile_url);
    this._userLink.html(data.user_display_name);

    // 5) update avatar
    var avatar = this._element.find('.js-avatar-box');
    if (avatar.length) {
        avatar.attr('href', data.user_profile_url);
        var img = avatar.find('.js-avatar');
        img.attr('src', decodeHtml(data.user_avatar_url));//with decoded &amp;
    }

    // 6) update the timestamp
    this._dateElement.html(data.comment_added_at);
    this._dateElement.attr('title', data.comment_added_at);
    this._dateElement.timeago();

    // 7) set comment score
    if (data.score) {
        var votes = this._element.find('.js-comment-score');
        votes.text(data.score);
    }

    // 8) possibly add edit link
    if (this._editable) {
        var oldEditLink = this._edit_link;
        this._edit_link = new EditLink('action-link js-comment-edit-btn');
        this._edit_link.setHandler(this.getEditHandler());
        oldEditLink.getElement().replaceWith(this._edit_link.getElement());
        oldEditLink.dispose();
    }

    // 9) if comment is moderated - add moderation warning
    var hasModWarning = this._element.find('.js-post-moderation-message').length > 0;
    if (!data.is_approved && !hasModWarning) {
      var content = this._element.find('.js-comment-content');
      var warning = getTemplate('.js-post-moderation-message');
      content.prepend(warning);
    }

    if (this._is_convertible) {
        var oldConvertLink = this._convert_link;
        this._convert_link = new CommentConvertLink(this._data.id);
        oldConvertLink.getElement().replaceWith(this._convert_link.getElement());
        //this has to be here, because if we trigger events inside of the
        //CommentConvertLink functions since the element is not yet in the dom we
        //will never catch the event
        this._convert_link.getElement().trigger('askbot.afterCommentConvertLinkInserted', [this._convert_link]);
        oldConvertLink.dispose();
    }
    //maybe hide edit/delete buttons
    if (data.id) {
        askbot['functions']['renderPostControls'](data.id.toString());
        askbot['functions']['renderPostVoteButtons']('comment', data.id.toString());
    }
    if (askbot.settings.mathjaxEnabled === true) {
        runMathJax();
    }
    this._element.trigger('askbot.afterCommentSetData', [this, data]);
};

Comment.prototype.dispose = function () {
    if (this._comment_body) {
        this._comment_body.remove();
    }
    if (this._comment_delete) {
        this._comment_delete.remove();
    }
    if (this._user_link) {
        this._user_link.remove();
    }
    if (this._comment_added_at) {
        this._comment_added_at.remove();
    }
    if (this._delete_icon) {
        this._delete_icon.dispose();
    }
    if (this._edit_link) {
        this._edit_link.dispose();
    }
    if (this._convert_link) {
        this._convert_link.dispose();
    }
    this._data = null;
    Comment.superClass_.dispose.call(this);
};

Comment.prototype.getElement = function () {
    Comment.superClass_.getElement.call(this);
    if (this.isBlank() && this.hasContent()) {
        this.setContent({is_approved: !askbot.data.userIsWatched});
    }
    return this._element;
};

Comment.prototype.loadText = function (onLoadHandler) {
    var me = this;
    $.ajax({
        type: 'GET',
        url: askbot.urls.getComment,
        data: {id: this._data.id},
        success: function (json) {
            if (json.success) {
                me._data.text = json.text;
                onLoadHandler();
            } else {
                showMessage(me.getElement(), json.message, 'after');
            }
        },
        error: function (xhr) {
            showMessage(me.getElement(), xhr.responseText, 'after');
        }
    });
};

Comment.prototype.getText = function () {
    if (!this.isBlank()) {
        if ('text' in this._data) {
            return this._data.text;
        }
    }
    return '';
};

Comment.prototype.getEditHandler = function () {
    var me = this;
    return function () {
        if (me.hasText()) {
            me.startEditing();
        } else {
            me.loadText(function () { me.startEditing(); });
        }
    };
};

Comment.prototype.getDeleteHandler = function () {
    var comment = this;
    var del_icon = this._delete_icon;
    return function () {
        if (confirm(gettext('confirm delete comment'))) {
            //comment.getElement().hide();
            $.ajax({
                type: 'POST',
                url: askbot.urls.deleteComment,
                data: {
                    comment_id: comment.getId(),
                    avatar_size: askbot.settings.commentAvatarSize
                },
                success: function () {
                    var widget = comment.getContainerWidget();
                    comment.dispose();
                    widget.handleDeletedComment();
                },
                error: function (xhr) {
                    comment.getElement().show();
                    showMessage(del_icon.getElement(), xhr.responseText);
                },
                dataType: 'json'
            });
        }
    };
};
