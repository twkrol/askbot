/* global fixedEncodeURIComponent, askbot, copyAltToTitle, setupButtonEventHandlers */
( 
  function SocialSharing () {
    var SERVICE_DATA = {
      //url - template for the sharing service url, params are for the popup
      twitter: {
        url: 'https://twitter.com/share?url={URL}&ref=twitbtn&text={TEXT}',
        params: 'width=820,height=526,toolbar=1,status=1,resizable=1,scrollbars=1'
      },
      facebook: {
        url: 'https://www.facebook.com/sharer.php?u={URL}&ref=fbshare&t={TEXT}',
        params: 'width=630,height=436,toolbar=1,status=1,resizable=1,scrollbars=1'
      },
      linkedin: {
        url: 'https://www.linkedin.com/sharing/share-offsite?url={URL}',
        params: 'width=630,height=436,toolbar=1,status=1,resizable=1,scrollbars=1'
      }
    };
    var URL = '';
    var TEXT = '';

    function sharePage(service_name) {
      if (SERVICE_DATA[service_name]) {
        var url = SERVICE_DATA[service_name].url;
        url = url.replace('{TEXT}', TEXT);
        url = url.replace('{URL}', URL);
        var params = SERVICE_DATA[service_name].params;
        if (!window.open(url, 'sharing', params)) {
          window.location.href = url;
        }
        return false;
      }
    }

    function init () {
      URL = window.location.href;
      var urlBits = URL.split('/');
      URL = fixedEncodeURIComponent(urlBits.slice(0, -2).join('/') + '/');
      TEXT = fixedEncodeURIComponent($('h1 > a').text());
      var hashtag = fixedEncodeURIComponent(askbot.settings.sharingSuffixText);
      TEXT = TEXT.substr(0, 134 - URL.length - hashtag.length);
      TEXT = TEXT + '... ' + hashtag;
      var fb = $('.js-facebook-share');
      var tw = $('.js-twitter-share');
      var ln = $('.js-linkedin-share');
      copyAltToTitle(fb);
      copyAltToTitle(tw);
      copyAltToTitle(ln);
      setupButtonEventHandlers(fb, function () { sharePage('facebook'); });
      setupButtonEventHandlers(tw, function () { sharePage('twitter'); });
      setupButtonEventHandlers(ln, function () { sharePage('linkedin'); });
    }
    init();
  }
)();
