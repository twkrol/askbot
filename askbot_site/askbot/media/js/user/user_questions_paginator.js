/* global Paginator, inherits, askbot, QSutils */
var UserQuestionsPaginator = function () {
  Paginator.call(this);
};
inherits(UserQuestionsPaginator, Paginator);

UserQuestionsPaginator.prototype.renderPage = function (data) {
  var target = $(this._resultPlacementSelector);
  $(target).html(data.questions);
  $('.js-timeago').timeago();
};

UserQuestionsPaginator.prototype.getDataUrl = function (pageNo) {
  var userId = askbot.data.viewUserId;
  var pageSize = askbot.data.userPostsPageSize;
  var url = QSutils.patch_query_string('', 'author:' + userId);
  url = QSutils.patch_query_string(url, 'sort:votes-desc');
  url = QSutils.patch_query_string(url, 'page:' + pageNo);
  url = QSutils.patch_query_string(url, 'page-size:' + pageSize);
  return askbot.urls.questions + url;
};

UserQuestionsPaginator.prototype.getRequestParams = function () {
  return undefined;
};

(function() {
  $(document).ready(function() {
    var paginators = $('.js-questions-paginator');
    paginators.each(function(_idx, item) {
      var paginator = new UserQuestionsPaginator();
      paginator.decorate($(item));
    });
  });
})();
