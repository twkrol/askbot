/* global askbot, gettext, AutoCompleter, ThreadUsersDialog */
$(document).ready(function () {
  var groupsInput = $('#share_group_name');
  if (groupsInput.length === 1) {
    var groupsAc = new AutoCompleter({
      url: askbot.urls.getGroupsList,
      promptText: gettext('Group name:'),
      minChars: 1,
      useCache: false,
      matchInside: true,
      maxCacheLength: 100,
      delay: 10
    });
    groupsAc.decorate(groupsInput);
  }
  var usersInput = $('#share_user_name');
  if (usersInput.length === 1) {
    var usersAc = new AutoCompleter({
      url: '/get-users-info/',
      promptText: askbot.messages.userNamePrompt,
      minChars: 1,
      useCache: false,
      matchInside: true,
      maxCacheLength: 100,
      delay: 10
    });
    usersAc.decorate(usersInput);
  }

  var showSharedUsers = $('.see-related-users');
  if (showSharedUsers.length) {
    var usersPopup = new ThreadUsersDialog();
    usersPopup.setHeadingText(gettext('Shared with the following users:'));
    usersPopup.decorate(showSharedUsers);
  }
  var showSharedGroups = $('.see-related-groups');
  if (showSharedGroups.length) {
    var groupsPopup = new ThreadUsersDialog();
    groupsPopup.setHeadingText(gettext('Shared with the following groups:'));
    groupsPopup.decorate(showSharedGroups);
  }
});
