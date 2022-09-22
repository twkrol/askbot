/* global inherits, WrappedElement, setupButtonEventHandlers */

var Paginator = function () {
  WrappedElement.call(this);
};
inherits(Paginator, WrappedElement);

/**
 * @param data is json dict returted by the server
 */
Paginator.prototype.renderPage = function (data) {
  var target = $(this._resultPlacementSelector);
  $(target).html(data.html);
};

/**
 * returns url that can be used to retrieve page data
 */
Paginator.prototype.getDataUrl = function (_pageNo) {
  return this._dataUrl;
};

Paginator.prototype.getRequestParams = function (pageNo) {
  var params = this._requestParams;
  params['page_number'] = pageNo;
  return params;
};

Paginator.prototype.setIsLoading = function (isLoading) {
  this._isLoading = isLoading;
};

Paginator.prototype.startLoadingPageData = function (pageNo) {
  if (this._isLoading) {
    return;
  }
  var me = this;
  var currentPageNo = this.getCurrentPageNo()
  var requestParams = {
    type: 'GET',
    dataType: 'json',
    url: this.getDataUrl(pageNo),
    cache: false,
    success: function (data) {
      try {
        me.renderPage(data);
        me.setIsLoading(false);
      } catch(error) {
        console.log('Error in Paginator.startLoadingPageData', {error: error});
      }
    },
    failure: function () {
      me.setIsLoading(false);
      me.updatePaginator(currentPageNo);
    }
  };
  var params = this.getRequestParams(pageNo);
  if (params) {
    requestParams.data = params;
  }
  $.ajax(requestParams);
  me.updatePaginator(pageNo);
  me.setIsLoading(true);
  return false;
};

Paginator.prototype.getCurrentPageNo = function () {
  var page = this._element.find('.js-current-page');
  return parseInt(page.data('page'));
};

Paginator.prototype.getIncrementalPageHandler = function (direction) {
  var me = this;
  return function () {
    var pageNo = me.getCurrentPageNo();
    if (direction === 'next') {
      pageNo = Math.min(me._numPages, pageNo + 1);
    } else {
      pageNo = Math.max(1, pageNo - 1);
    }
    me.startLoadingPageData(pageNo);
    return false;
  };
};

Paginator.prototype.getMainPagesRange = function() {
  var startBtn = $(this._element.find('.js-main-pages-block > :first-child'));
  var endBtn = $(this._element.find('.js-main-pages-block > :last-child'));
  return [startBtn.data('page'), endBtn.data('page')];
};

/*
 * Returns an array of integers
 * contiguous page numbers, to be used
 * in the main pages block.
 * Attempts to place the current page close
 * to the center of the list.
 */
Paginator.prototype.getNewPageNumbers = function(pageNo) {
  var length = this._mainPagesBlockLength;
  var defaultPagesToLeft = Math.floor((length - 1)/2);
  var defaultPagesToRight = length - 1 - defaultPagesToLeft;
  /*
   * determine how many pages are to the left and to
   * the right of the current page
   */
  var pagesToLeft, pagesToRight;
  if (pageNo <= defaultPagesToLeft) {
    pagesToLeft = pageNo - 1;
    pagesToRight = length - 1 - pagesToLeft;
  } else if (this._numPages - pageNo < defaultPagesToRight) {
    pagesToRight = this._numPages - pageNo;
    pagesToLeft = length - 1 - pagesToRight;
  } else {
    pagesToLeft = defaultPagesToLeft;
    pagesToRight = defaultPagesToRight;
  }
  var firstPage = pageNo - pagesToLeft;
  var lastPage = pageNo + pagesToRight;
  var pages = []
  for (var page = firstPage; page <= lastPage; page++) {
    pages.push(page)
  }
  return pages;
};

Paginator.prototype.updateMainPagesBlock = function(pageNo) {
  var pageNums = this.getNewPageNumbers(pageNo);
  for (var idx = 0; idx < pageNums.length; idx++) {
    var num = pageNums[idx];
    var childIdx = idx + 1
    var button = $(this._mainPagesBlock.find(':nth-child(' + childIdx + ')'));
    button.html(num);
    button.data('page', num);
  }
};

Paginator.prototype.getFirstPageNo = function() {
  return $(this._firstPageBlock.find('a')).data('page');
}

Paginator.prototype.getLastPageNo = function() {
  return $(this._lastPageBlock.find('a')).data('page');
}

Paginator.prototype.setCurrentPage = function(pageNo) {
  this._mainPagesBlock.find('a').removeClass('js-current-page');
  this._mainPagesBlock.find('a').each(function(_, item) {
    if ($(item).data('page') === pageNo) {
      $(item).addClass('js-current-page');
    }
  });
};

Paginator.prototype.updateIncrementalNavButtons = function(pageNo) {
  this._prevPageButton.data('page', Math.max(pageNo - 1, 1));
  this._nextPageButton.data('page', Math.min(this._numPages, pageNo + 1));
  if (pageNo >= this._numPages) {
    this._nextPageButton.addClass('js-disabled');
  } else {
    this._nextPageButton.removeClass('js-disabled');
  }

  if (pageNo <= 1) {
    this._prevPageButton.addClass('js-disabled');
  } else {
    this._prevPageButton.removeClass('js-disabled');
  }
}

Paginator.prototype.updateEdgePageBlocks = function() {
  var range = this.getMainPagesRange();
  var rangeStart = range[0];
  var rangeEnd = range[range.length - 1];

  if (rangeStart === this.getFirstPageNo()) {
    this._firstPageBlock.hide();
  } else {
    this._firstPageBlock.show();
  }

  if (rangeEnd === this.getLastPageNo()) {
    this._lastPageBlock.hide();
  } else {
    this._lastPageBlock.show();
  }

  if (rangeStart == 2) {
    this._firstPageEllipsis.hide();
  } else {
    this._firstPageEllipsis.show();
  }

  if (this._numPages - rangeEnd == 1) {
    this._lastPageEllipsis.hide();
  } else {
    this._lastPageEllipsis.show();
  }

};

Paginator.prototype.updatePaginator = function (pageNo) {
  this.updateMainPagesBlock(pageNo);
  this.setCurrentPage(pageNo);
  this.updateIncrementalNavButtons(pageNo);
  this.updateEdgePageBlocks();
};

Paginator.prototype.getPageButtonHandler = function () {
  var me = this;
  return function (evt) {
    var pageNo = $(evt.target).data('page');
    if (me.getCurrentPageNo() !== pageNo) {
      me.startLoadingPageData(pageNo);
    }
    return false;
  };
};

Paginator.prototype.decorate = function (element) {
  /*
   * <a class="js-prev-page with-caret-left-icon" />
   * <span class="js-first-page-block" />
   * [<a class="js-page" />]
   * <span class="js-main-pages-block" />
   * <span class="js-last-page-block" />
   * <a class="js-next-page />
   */
  this._element = element;

  var pages = element.find('.js-page');
  this._firstPageBlock = element.find('.js-first-page-block');
  this._firstPageEllipsis = this._firstPageBlock.find('.js-paginator-ellipsis');
  this._lastPageBlock = element.find('.js-last-page-block');
  this._lastPageEllipsis = this._lastPageBlock.find('.js-paginator-ellipsis');
  this._mainPagesBlock = element.find('.js-main-pages-block');
  this._mainPagesBlockLength = this._mainPagesBlock.find('a').length;
  this._numPages = element.data('numPages');
  this._dataUrl = element.data('dataUrl');
  this._resultPlacementSelector = element.data('resultPlacementSelector');
  this._requestParams = {};
  try {
    var params = element.data('requestParams')
    this._requestParams = params;
  } catch(error) {
    console.log('Paginator: could not parse request params', {error: error});
  }

  for (var i = 0; i < pages.length; i++) {
    var page = $(pages[i]);
    var pageHandler = this.getPageButtonHandler();
    setupButtonEventHandlers(page, pageHandler);
  }

  var currPageNo = this.getCurrentPageNo();

  //next page button
  this._nextPageButton = element.find('.js-next-page');
  if (currPageNo === this._numPages) {
    this._nextPageButton.addClass('js-disabled');
  }

  setupButtonEventHandlers(
    this._nextPageButton,
    this.getPageButtonHandler()
  );

  this._prevPageButton = element.find('.js-prev-page');
  if (currPageNo === 1) {
    this._prevPageButton.addClass('js-disabled');
  }

  setupButtonEventHandlers(
    this._prevPageButton,
    this.getPageButtonHandler()
  );
};

(function() {
  $(document).ready(function() {
    var paginators = $('.js-paginator');
    for (var idx = 0; idx < paginators.length; idx++) {
      var paginator = new Paginator();
      paginator.decorate($(paginators[idx]));
    }
  });
})();
