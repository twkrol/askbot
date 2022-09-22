"""methods that make parsing of post inputs possible,
handling of markdown and additional syntax rules -
such as optional link patterns, video embedding and
Twitter-style @mentions"""

import base64
import hashlib
import io
import logging
import re

from django.utils.html import urlize
from django.utils.module_loading import import_string

from askbot import const
from askbot.conf import settings as askbot_settings
from askbot.utils.file_utils import store_file
from askbot.utils.functions import split_phrases
from askbot.utils.html import sanitize_html
from askbot.utils.html import strip_tags
from askbot.utils.html import urlize_html

# URL taken from http://regexlib.com/REDetails.aspx?regexp_id=501
URL_RE = re.compile("((?<!(href|.src|data)=['\"])((http|https|ftp)\://([a-zA-Z0-9\.\-]+(\:[a-zA-Z0-9\.&amp;%\$\-]+)*@)*((25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9])\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9]|0)\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9]|0)\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[0-9])|localhost|([a-zA-Z0-9\-]+\.)*[a-zA-Z0-9\-]+\.(com|edu|gov|int|mil|net|org|biz|arpa|info|name|pro|aero|coop|museum|[a-zA-Z]{2}))(\:[0-9]+)*(/($|[a-zA-Z0-9\.\,\?\'\\\+&amp;%\$#\=~_\-]+))*))") # pylint: disable=line-too-long


def get_parser(markdown_class_addr=None):
    """
    Returns an instance of configured :class:`markdown2.Markdown parser.

    :param markdown_class_addr: Path to :class:`markdown2.Markdown` custom
                                class. (default: `'markdown2.Markdown'`)
    :type markdown_class_addr: ``str``
    """
    if markdown_class_addr is None:
        from django.conf import settings as django_settings
        markdown_class_addr = getattr(django_settings, 'ASKBOT_MARKDOWN_CLASS',
                                      'markdown2.Markdown')
    markdown_cls = import_string(markdown_class_addr)
    extras = ['link-patterns', 'video']

    if askbot_settings.ENABLE_MATHJAX or askbot_settings.MARKUP_CODE_FRIENDLY:
        extras.append('code-friendly')

    # link_patterns = [
    #     (URL_RE, r'\1'),
    # ]
    link_patterns = []
    if askbot_settings.ENABLE_AUTO_LINKING:
        pattern_list = askbot_settings.AUTO_LINK_PATTERNS.split('\n')
        url_list = askbot_settings.AUTO_LINK_URLS.split('\n')
        pairs = list(zip(pattern_list, url_list))  # always takes equal number of items
        for item in pairs:
            if not item[0].strip() or not item[1].strip():
                continue
            link_patterns.append(
                (re.compile(item[0].strip()), item[1].strip())
            )

        # Check whether  we have matching links for all key terms,
        # Other wise we ignore the key terms
        # May be we should do this test in update_callback?
        # looks like this might be a defect of livesettings
        # as there seems to be no way
        # to validate entries that depend on each other
        if len(pattern_list) != len(url_list):
            settings_url = askbot_settings.APP_URL+'/settings/AUTOLINK/'
            msg = "Number of autolink patterns didn't match the number "\
                  "of url templates, fix this by visiting %s"
            logging.critical(msg, settings_url)

    return markdown_cls(
        html4tags=True,
        extras=extras,
        link_patterns=link_patterns
    )


def format_mention_in_html(mentioned_user):
    """formats mention as url to the user profile"""
    url = mentioned_user.get_profile_url()
    username = mentioned_user.username
    return '<a href="%s">@%s</a>' % (url, username)


def extract_first_matching_mentioned_author(text, anticipated_authors):
    """matches beginning of ``text`` string with the names
    of ``anticipated_authors`` - list of user objects.
    Returns upon first match the first matched user object
    and the remainder of the ``text`` that is left unmatched"""

    if not text:
        return None, ''

    for author in anticipated_authors:
        if text.lower().startswith(author.username.lower()):
            ulen = len(author.username)
            if len(text) == ulen:
                text = ''
            elif text[ulen] in const.TWITTER_STYLE_MENTION_TERMINATION_CHARS:
                text = text[ulen:]
            else:
                # near miss, here we could insert a warning that perhaps
                # a termination character is needed
                continue
            return author, text
    return None, text


def extract_mentioned_name_seeds(text):
    """Returns list of strings that
    follow the '@' symbols in the text.
    The strings will be 10 characters long,
    or shorter, if the subsequent character
    is one of the list accepted to be termination
    characters.
    """
    extra_name_seeds = set()
    while '@' in text:
        pos = text.index('@')
        text = text[pos+1:]  # chop off prefix
        name_seed = ''
        for char in text:
            if char in const.TWITTER_STYLE_MENTION_TERMINATION_CHARS:
                extra_name_seeds.add(name_seed)
                name_seed = ''
                break
            if len(name_seed) > 10:
                extra_name_seeds.add(name_seed)
                name_seed = ''
                break
            if char == '@':
                if len(name_seed) > 0:
                    extra_name_seeds.add(name_seed)
                    name_seed = ''
                break
            name_seed += char
        if len(name_seed) > 0:
            # in case we run off the end of text
            extra_name_seeds.add(name_seed)

    return extra_name_seeds


def mentionize_text(text, anticipated_authors):
    """Returns a tuple of two items:
    * modified text where @mentions are
      replaced with urls to the corresponding user profiles
    * list of users whose names matched the @mentions
    """
    output = ''
    mentioned_authors = []
    while '@' in text:
        # the purpose of this loop is to convert any occurance of
        # '@mention ' syntax
        # to user account links leading space is required unless @ is the first
        # character in whole text, also, either a punctuation or
        # a ' ' char is required after the name
        pos = text.index('@')

        # save stuff before @mention to the output
        output += text[:pos]  # this works for pos == 0 too

        if len(text) == pos + 1:
            # finish up if the found @ is the last symbol
            output += '@'
            text = ''
            break

        if pos > 0:

            if text[pos-1] in const.TWITTER_STYLE_MENTION_TERMINATION_CHARS:
                # if there is a termination character before @mention
                # indeed try to find a matching person
                text = text[pos+1:]
                mentioned_author, text = \
                    extract_first_matching_mentioned_author(
                        text, anticipated_authors)
                if mentioned_author:
                    mentioned_authors.append(mentioned_author)
                    output += format_mention_in_html(mentioned_author)
                else:
                    output += '@'

            else:
                # if there isn't, i.e. text goes like something@mention,
                # do not look up people
                output += '@'
                text = text[pos+1:]
        else:
            # do this if @ is the first character
            text = text[1:]
            mentioned_author, text = \
                extract_first_matching_mentioned_author(
                    text, anticipated_authors)
            if mentioned_author:
                mentioned_authors.append(mentioned_author)
                output += format_mention_in_html(mentioned_author)
            else:
                output += '@'

    # append the rest of text that did not have @ symbols
    output += text
    return mentioned_authors, output


def plain_text_input_converter(text):
    """plain text to html converter"""
    return sanitize_html(urlize('<p>' + text + '</p>'))


def markdown_input_converter(text):
    """markdown to html converter"""
    text = get_parser().convert(text)
    text = sanitize_html(text)
    text = urlize_html(text)
    return sanitize_html(text)


def tinymce_input_converter(text):
    """tinymce input to production html converter"""
    text = urlize_html(text)
    return strip_tags(text, ['script', 'style', 'link'])


def convert_text(text):
    parser_type = askbot_settings.EDITOR_TYPE
    if parser_type == 'plain-text':
        return plain_text_input_converter(text)
    if parser_type == 'markdown':
        return markdown_input_converter(text)
    if parser_type == 'tinymce':
        return tinymce_input_converter(text)
    raise NotImplementedError


def find_forbidden_phrase(text):
    """returns string or None"""
    def norm_text(text_string):
        return ' '.join(text_string.split()).lower()

    forbidden_phrases = askbot_settings.FORBIDDEN_PHRASES.strip()
    text = norm_text(text)
    if forbidden_phrases:
        phrases = split_phrases(forbidden_phrases)
        for phrase in phrases:
            phrase = norm_text(phrase)
            if phrase in text:
                return phrase
    return None

def markdown_is_line_empty(line): #pylint: disable=missing-docstring
    assert('\n' not in line)
    return len(line.strip()) == 0

def markdown_force_linebreaks(text):
    """Appends a linebreak to all newlines inside the paragraphs"""
    lines = text.split('\n')
    num_lines = len(lines)
    result = []
    for idx in range(num_lines):
        cline = lines[idx]
        if idx + 1 == num_lines:
            result.append(cline)
            break

        if markdown_is_line_empty(cline):
            result.append(cline)
            continue

        nline = lines[idx + 1]
        if markdown_is_line_empty(nline):
            result.append(cline)
            continue

        cline = cline.rstrip() + '  ' # appends two empty spaces to force newline
        result.append(cline)

    return '\n'.join(result)


MARKDOWN_INLINE_IMAGE_RE = '\!\[([^]]*)\]\(data:image/([^)]*)\)'

def markdown_extract_inline_images(text):
    """
    * extracts inline images from markdown text
    * places image as file in the media storage
    * replaces the inline image markup with the linked image markup
    * returns modified markdown text
    """
    def repl_func(match):
        """For the given match, extracts the
        image content and stores in the file storage
        Returns markdown for the linked uploaded file."""
        file_display_name = match.group(1) or 'uploaded file'
        b64_encoded_img = match.group(2).split(',')[1]
        file_ext = match.group(2).split(',')[0].split(';')[0]
        img_bytes = base64.b64decode(b64_encoded_img)
        img_file = io.BytesIO(img_bytes)
        file_name = hashlib.md5(img_bytes).hexdigest() + '.' + file_ext
        file_url = store_file(file_name, img_file)
        return f'![{file_display_name}]({file_url})'

    return re.sub(MARKDOWN_INLINE_IMAGE_RE, repl_func, text, flags=re.MULTILINE)


def markdown_split_paragraphs(text):
    """
    Returns list of paragraphs.
    """
    pars = []
    cpar_lines = []
    for line in text.split('\n'):
        if re.match(r' *$', line):
            if cpar_lines:
                cpar = '\n'.join(cpar_lines)
                pars.append(cpar)
            cpar_lines = []
            continue

        cpar_lines.append(line)

    if cpar_lines:
        cpar = '\n'.join(cpar_lines)
        pars.append(cpar)

    return pars
