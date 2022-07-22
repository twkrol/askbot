/**
 * @constructor
 * provides full text search functionality
 * which re-draws contents of the main page
 * in response to the search query
 */
var FullTextSearch = function () {
  WrappedElement.call(this);
  this._running = false;
  this._baseUrl = askbot.urls.questions;
  this._qListId = 'js-questions';//id of question listing div
  /** @todo: the questions/ needs translation... */
  this._searchUrl = '/scope:all/sort:activity-desc/page:1/';
  this._askButtonEnabled = true;
  this._fullTextSearchEnabled = true;
};
inherits(FullTextSearch, WrappedElement);

/**
 * @param {{boolean=}} optional, if given then function is setter
 * otherwise it is a getter
 * isRunning returns `true` when search is running
 */
FullTextSearch.prototype.isRunning = function (val) {
  if (val === undefined) {
    return this._running;
  }
  this._running = val;
};

FullTextSearch.prototype.setAskButtonEnabled = function (isEnabled) {
  this._askButtonEnabled = isEnabled;
};

/**
 * @param {{string}} url for the page displaying search results
 */
FullTextSearch.prototype.setSearchUrl = function (url) {
  this._searchUrl = url;
};

FullTextSearch.prototype.getSearchUrl = function () {
  return this._searchUrl;
};

FullTextSearch.prototype.renderTagWarning = function (tag_list) {
  if (!tag_list) {
    return;
  }
  var tagWarningBox = this._tag_warning_box;
  tagWarningBox.clear();
  $.each(tag_list, function (idx, tagName) {
    tagWarningBox.addTag(tagName);
  });
  tagWarningBox.showWarning();
};

FullTextSearch.prototype.runTagSearch = function () {
  var search_tags = $('#js-tag-search-input').val().split(/\s+/);
  if (search_tags.length === 0) {
    return;
  }
  var searchUrl = this.getSearchUrl();
  //add all tags to the url
  searchUrl = QSutils.add_search_tag(searchUrl, search_tags);
  var url = this._baseUrl + searchUrl;
  var me = this;
  $.ajax({
    url: url,
    dataType: 'json',
    success: function (data, text_status, xhr) {
      me.renderFullTextSearchResult(data, text_status, xhr);
      $('#js-tag-search-input').val('');
    }
  });
  this.updateHistory(url);
};

FullTextSearch.prototype.updateHistory = function (url) {
  var context = { state:1, rand:Math.random() };
  History.pushState(context, 'Questions', url);
  setTimeout(function () {
      /* HACK: For some weird reson, sometimes
       * overrides the above pushState so we re-aplly it
       * This might be caused by some other JS plugin.
       * The delay of 10msec allows the other plugin to override the URL.
       */
      History.replaceState(context, 'Questions', url);
    },
    10
  );
};

FullTextSearch.prototype.hydrateTagSearchInput = function () {
  //the autocomplete is set up in tag_selector.js
  var button = $('#js-tag-search-btn');
  if (button.length === 0) {//may be absent
    return;
  }
  var me = this;
  var ac = new AutoCompleter({
    url: askbot.urls.get_tag_list,
    minChars: 1,
    useCache: true,
    matchInside: true,
    maxCacheLength: 100,
    maxItemsToShow: 20,
    onItemSelect: function () { me.runTagSearch(); },
    delay: 10
  });
  ac.decorate($('#js-tag-search-input'));
  setupButtonEventHandlers(
    button,
    function () { me.runTagSearch(); }
  );
};

FullTextSearch.prototype.sendTitleSearchQuery = function (query_text) {
  this.isRunning(true);
  this._prevText = query_text;
  var data = {query_text: query_text};
  var me = this;
  $.ajax({
    url: askbot.urls.apiGetQuestions,
    data: data,
    dataType: 'json',
    success: function (data, text_status, xhr) {
      me.renderTitleSearchResult(data, text_status, xhr);
    },
    complete: function () {
      me.isRunning(false);
      me.evalTitleSearchQuery();
    },
    cache: false
  });
};


FullTextSearch.prototype.sendFullTextSearchQuery = function (query_text) {
  this.isRunning(true);
  var searchUrl = this.getSearchUrl();
  var prevText = this._prevText;
  if (!prevText && query_text && askbot.settings.showSortByRelevance) {
    /* If there was no query but there is some
     * query now - and we support relevance search
     * - then switch to it
     */
    searchUrl = QSutils.patch_query_string(searchUrl, 'sort:relevance-desc');
  }
  this._prevText = this.updateQueryString(query_text);

  /* if something has changed, then reset the page no. */
  searchUrl = QSutils.patch_query_string(searchUrl, 'page:1');
  var url = this._baseUrl + searchUrl;
  var me = this;
  $.ajax({
    url: url,
    dataType: 'json',
    success: function (data, text_status, xhr) {
      me.renderFullTextSearchResult(data, text_status, xhr);
    },
    complete: function () {
      me.isRunning(false);
    },
    cache: false
  });
  this.updateHistory(url);
};

FullTextSearch.prototype.refresh = function () {
  this.sendFullTextSearchQuery();/* used for tag search, maybe not necessary */
};

FullTextSearch.prototype.getSearchQuery = function () {
  return $.trim(this._query.val());
};

FullTextSearch.prototype.getWidgetHeight = function () {
  return this._element.outerHeight();
};

/**
 * renders title search result in the dropdown under the search input
 */
FullTextSearch.prototype.renderTitleSearchResult = function (data) {
  var menu = this._dropMenu;
  menu.hideWaitIcon();
  if (data.length > 0) {
    menu.hideHeader();
  }
  menu.setData(data);
  menu.render();
  $('.js-search-bar').addClass('js-with-drop-menu');
  menu.show();
};

FullTextSearch.prototype.renderQuestionListHeader = function (data) {
  var header = $('.js-questions-header');
  header.find('.js-questions-title').replaceWith(data.question_list_title);
  if (data.feed_url) {
    header.find('a.js-rss-link').attr('href', data.feed_url);
  }
  this.renderSearchTags(data.query_data.tags, data.query_string);
};

FullTextSearch.prototype.renderFullTextSearchResult = function (data) {
  if (data.questions.length === 0) {
    return;
  }

  this.renderQuestionListHeader(data);

  $('#pager').toggle(data.paginator !== '').html(data.paginator);

  if (data.faces.length > 0) {
    $('#js-contrib-avatars > a').remove();
    $('#js-contrib-avatars').append(data.faces.join(''));
  }

  this.renderRelatedTags(data.related_tags_html);
  this.renderRelevanceSortTab(data.query_string);
  this.renderTagWarning(data.non_existing_tags);

  this.setActiveSortTab(data.query_data.sort_order, data.query_string);

  // Patch scope selectors
  var baseUrl = this._baseUrl;
  $('a.js-scope-link').each(function (index) {
    var old_qs = $(this).attr('href').replace(baseUrl, '');
    var scope = QSutils.get_query_string_selector_value(old_qs, 'scope');
    qs = QSutils.patch_query_string(data.query_string, 'scope:' + scope);
    $(this).attr('href', baseUrl + qs);
  });

  // Patch "Ask your question"
  var askButton = $('a.js-ask-btn');
  var askHrefBase = askButton.attr('href').split('?')[0];
  askButton.attr(
    'href',
    askHrefBase + data.query_data.ask_query_string
  ); /* INFO: ask_query_string should already be URL-encoded! */

  this._query.focus();

  var old_list = $('#' + this._qListId);
  var new_list = $('<div></div>').hide().html(data.questions);
  new_list.find('.timeago').timeago();

  var qListId = this._qListId;
  old_list.stop(true).after(new_list).fadeOut(200, function () {
    //show new div with a fadeIn effect
    old_list.remove();
    new_list.attr('id', qListId);
    new_list.fadeIn(400);
  });
};

FullTextSearch.prototype.evalTitleSearchQuery = function () {
  var cur_query = this.getSearchQuery();
  var prevText = this._prevText;
  if (cur_query !== prevText && this.isRunning() === false) {
    if (cur_query.length >= askbot.settings.minSearchWordLength) {
      this.sendTitleSearchQuery(cur_query);
    } else if (cur_query.length === 0) {
      this.reset();
    }
  }
};

FullTextSearch.prototype.reset = function () {
  this._prevText = '';
  this._dropMenu.reset();
  this._element.val('');
  this._element.focus();
  this._xButton.hide();
  $('.js-search-bar').removeClass('js-with-drop-menu');
};

FullTextSearch.prototype.refreshXButton = function () {
  if (this.getSearchQuery().length > 0) {
    if (this._query.hasClass('js-search-input')) {
      $('.js-search-bar').addClass('js-cancelable');
      this._xButton.show();
    }
  } else {
    this._xButton.hide();
    $('.js-search-bar').removeClass('js-cancelable');
  }
};

FullTextSearch.prototype.updateQueryString = function (query_text) {
  if (query_text === undefined) { // handle missing parameter
    query_text = this.getSearchQuery();
  }
  var newUrl = QSutils.patch_query_string(
    this._searchUrl,
    'query:' + encodeURIComponent(query_text),
    query_text === ''   // remove if empty
  );
  this.setSearchUrl(newUrl);
  return query_text;
};

FullTextSearch.prototype.renderRelatedTags = function (tags_html) {
  $('.js-related-tags').html(tags_html);
};

FullTextSearch.prototype.renderSearchTags = function (tags, queryString) {
  var searchTags = $('.js-search-tags ul');
  var me = this;
  if (tags.length === 0) {
    $('.js-search-tags').fadeOut(function () {
      searchTags.find(':not(.js-search-tags-label)').remove();
    });
  } else {
    $('.js-search-tags').fadeIn();
    searchTags.find(':not(.js-search-tags-label)').remove();
    $.each(tags, function (idx, tagName) {
      var el;
      var tag = new Tag();
      tag.setName(tagName);
      tag.setLinkable(false);
      tag.setDeletable(true);
      tag.setDeleteHandler(
        function () {
          me.removeSearchTag(tagName, queryString);
        }
      );
      el = tag.getElement();
      // test if the Tag gets appended to a list
      if (searchTags.prop('tagName') === 'UL') {
        // wrap returns original element
        el = el.wrap('<li></li>').parent();
      }
      searchTags.append(el);
    });
  }
};

FullTextSearch.prototype.removeSearchTag = function (tag) {
  var searchUrl = this.getSearchUrl();
  searchUrl = QSutils.remove_search_tag(searchUrl, tag);
  this.setSearchUrl(searchUrl);
  this.sendFullTextSearchQuery();
};

FullTextSearch.prototype.setActiveSortTab = function (sortMethod, queryString) {
  var tabs = $('.js-questions-sort-nav > a');
  tabs.removeClass('js-selected js-with-sort-descending-icon js-with-sort-ascending-icon');
  var baseUrl = this._baseUrl;
  var tooltip;
  tabs.each(function (index, element) {
    var tab = $(element);
    var sortBy = tab.data('sortBy');
    if (sortBy in askbot.data.sortButtonData) {
      href = baseUrl + QSutils.patch_query_string(
                              queryString,
                              'sort:' + sortBy + '-desc'
                          );
      tab.attr('href', href);
      tooltip = askbot.data.sortButtonData[sortBy].desc_tooltip
      tab.attr('title', tooltip);
      tab.html(askbot.data.sortButtonData[sortBy].label);
    }
  });
  var bits = sortMethod.split('-', 2);
  var sortBy = bits[0];
  var sense = bits[1];//sense of sort
  var activeTab = $('js-sort-by-' + sortBy);
  if (sense === 'asc') {
    activeTab.addClass('js-selected js-with-sort-ascending-icon');
  }
  if (sense === 'desc') {
    activeTab.addClass('js-selected js-with-sort-descending-icon');
  }
  var antisense = (sense === 'asc' ? 'desc' : 'asc');
  var antisenseTooltip = askbot.data.sortButtonData[sortBy][antisense + '_tooltip']
  activeTab.attr('title', antisenseTooltip);
};

FullTextSearch.prototype.renderRelevanceSortTab = function (query_string) {
  if (!askbot.settings.showSortByRelevance) {
    return;
  }
  var tab = $('.js-sort-by-relevance');
  var prevText = this._prevText;
  if (prevText && prevText.length > 0) {
    if (tab.length === 0) {
      tab.fadeIn();
    }
  } else if (tab.length > 0) {
    tab.fadeOut();
  }
};

FullTextSearch.prototype.makeAskHandler = function () {
  var me = this;
  return function () {
    var query = me.getSearchQuery();
    window.location.href = askbot.urls.ask + '?title=' + query;
    return false;
  };
};

FullTextSearch.prototype.setFullTextSearchEnabled = function (enabled) {
  this._fullTextSearchEnabled = enabled;
};

FullTextSearch.prototype.getFullTextSearchEnabled = function () {
  return this._fullTextSearchEnabled;
};

/**
 * keydown handler operates on the tooltip and the X button
 * also opens and closes drop menu according to the min search word threshold
 * keyup is not good enough, because in that case
 * tooltip will be displayed with the input box simultaneously
 */
FullTextSearch.prototype.makeKeyDownHandler = function () {
  var me = this;
  var xButton = this._xButton;
  var dropMenu = this._dropMenu;
  var formSubmitHandler = this.makeFormSubmitHandler();
  return function (e) {//don't like the keyup delay to
    var keyCode = getKeyCode(e);

    if (keyCode === 27) {//escape key
      me.reset();
      return false;
    } else if (keyCode === 13) {
      if (me.getFullTextSearchEnabled()) {
        formSubmitHandler(e);
        return false;
      }
      return true;
    }

    var query = me.getSearchQuery();
    if (query.length) {
      me.refreshXButton();
      var minQueryLength = askbot.settings.minSearchWordLength;
      if (query.length === minQueryLength) {
        if (keyCode !== 8 && keyCode !== 48) {//del and backspace
          /* we get here if we were expanding the query
             past the minimum length to trigger search */
          $('.js-search-bar').addClass('js-with-drop-menu');
          dropMenu.show();
          dropMenu.showWaitIcon();
          dropMenu.showHeader();
        } else {
          //close drop menu if we were deleting the query
          dropMenu.reset();
          $('.js-search-bar').removeClass('js-with-drop-menu');
        }
      }
    }
  };
};

FullTextSearch.prototype.makeKeyUpHandler = function () {
  this.titleSearchQueryTimeout = undefined;
  var me = this;
  this._query.keyup(function (e) {
    me.refreshXButton();
    if (me.isRunning() === false) {
      clearTimeout(me.titleSearchQueryTimeout);
      me.titleSearchQueryTimeout = setTimeout(
        function () { me.evalTitleSearchQuery(); },
        400
      );
    }
  });
};

FullTextSearch.prototype.makeFormSubmitHandler = function () {
  var me = this;
  var baseUrl = me._baseUrl;
  return function (evt) {
    // if user clicks the button the s(h)e probably wants page reload,
    // so provide that experience but first update the query string
    me.updateQueryString();
    var searchUrl = me.getSearchUrl();
    evt.preventDefault();
    $(document).trigger('askbot.liveSearchSubmit', [me._element]);
    window.location.href = baseUrl + searchUrl;
  };
};

FullTextSearch.prototype.hydrateSearchTags = function () {
  var searchTags = $('.js-search-tags .js-tag');
  var searchUrl = this.getSearchUrl();
  var me = this;
  $.each(searchTags, function (idx, element) {
    var tag = new Tag();
    tag.decorate($(element));
    //todo: setDeleteHandler and setHandler
    //must work after decorate & must have getName
    tag.setDeleteHandler(
      function () {
        me.removeSearchTag(tag.getName(), searchUrl);
      }
    );
  });
};

FullTextSearch.prototype.hydrateTextSearchInput = function () {
  var input = this._query;
  input.keydown(this.makeKeyDownHandler());
  input.keyup(this.makeKeyUpHandler());
};

FullTextSearch.prototype.hydrateXButton = function () {
  var me = this;
  this._xButton.click(function () {
    /* wrapped in closure because it's not yet defined at this point */
    me.reset();
  });
  this.refreshXButton();
};

FullTextSearch.prototype.renderSearchDropMenu = function () {
  var dropMenu = new SearchDropMenu();
  dropMenu.setSearchWidget(this);
  dropMenu.setAskHandler(this.makeAskHandler());
  dropMenu.setAskButtonEnabled(this._askButtonEnabled);
  this._dropMenu = dropMenu;
  $('.js-search-bar').append(this._dropMenu.getElement());
  $(this._element).click(function (e) { return false; });
  $(document).click(function () { dropMenu.reset(); });
};

FullTextSearch.prototype.decorate = function (element) {
  this._element = element;/* this is a bit artificial we don't use _element */
  this._query = element;
  this._xButton = $('.js-cancel-search-btn');
  this._prevText = this.getSearchQuery();
  this._tag_warning_box = new TagWarningBox();

  this.renderSearchDropMenu();

  //the tag search input is optional in askbot
  $('#js-tag-search-input').parent().before(
    this._tag_warning_box.getElement()
  );

  this.hydrateSearchTags();
  this.hydrateXButton();
  this.hydrateTextSearchInput();
  this.hydrateTagSearchInput();

  $('.js-search-btn').on('click', this.makeFormSubmitHandler());
};
