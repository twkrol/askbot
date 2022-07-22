"""file utilities for askbot"""
import random
import time
import urllib.parse
from django.core.files.storage import get_storage_class

def make_file_name(ext, prefix=''):
    name = str(time.time())
    name = name.replace('.', str(random.randint(0,100000)))
    return prefix + name + ext


def store_file(file_name, file_object):
    """Creates an instance of django's file storage
    object based on the file-like object,
    Returns access url of the stored file.
    """
    storage = get_storage_class()()
    storage.save(file_name, file_object)
    file_url = storage.url(file_name)
    parsed_url = urllib.parse.urlparse(file_url)
    file_url = urllib.parse.urlunparse(
        urllib.parse.ParseResult(
            parsed_url.scheme,
            parsed_url.netloc,
            parsed_url.path,
            '', '', ''
        )
    )
    return file_url
