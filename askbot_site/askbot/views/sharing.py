from askbot import const
from askbot.deps.django_authopenid.util import OAuthConnection
from askbot.utils import decorators
from django.contrib.auth.decorators import login_required
from django.urls import reverse
from django.http import HttpResponseRedirect
from django.views.decorators import csrf
import json

@login_required
def start_sharing_twitter(request):
    #start oauth process to authorize tweeting
    #on behalf of user
    connection = OAuthConnection('twitter')
    connection.start(callback_url=reverse('save_twitter_access_token'))
    request.session['oauth_token'] = connection.get_token()
    oauth_url = connection.get_auth_url(login_only=False)
    return HttpResponseRedirect(oauth_url)

@login_required
def save_twitter_access_token(request):
    oauth_token = request.GET['oauth_token']
    session_oauth_token = request.session['oauth_token']
    assert(oauth_token == session_oauth_token['oauth_token'])
    oauth = OAuthConnection('twitter')
    oauth.obtain_access_token(
                        oauth_token = session_oauth_token,
                        oauth_verifier = request.GET['oauth_verifier']
                    )
    #save the access token
    request.user.twitter_access_token = json.dumps(oauth.access_token)
    request.user.twitter_handle = oauth.get_username()
    if request.user.social_sharing_mode == const.SHARE_NOTHING:
        request.user.social_sharing_mode = const.SHARE_MY_POSTS
    request.user.save()
    #todo: set up user associaton for the login via twitter
    #todo: save message that user can also login via twitter
    return HttpResponseRedirect(request.user.get_profile_url())

@csrf.csrf_protect
@decorators.ajax_only
@decorators.post_only
def change_social_sharing_mode(request):
    mode = request.POST['mode']
    if mode == 'share-nothing':
        request.user.social_sharing_mode = const.SHARE_NOTHING
    elif mode == 'share-my-posts':
        request.user.social_sharing_mode = const.SHARE_MY_POSTS
    else:
        assert(mode == 'share-everything')
        request.user.social_sharing_mode = const.SHARE_EVERYTHING
    request.user.save()
