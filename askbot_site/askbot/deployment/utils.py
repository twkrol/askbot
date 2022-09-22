"""Utility functions for the deployment scripts"""
import ipaddress
import os
import re
import pytz
from django.core.exceptions import ValidationError
from django.conf.global_settings import LANGUAGES
from askbot.utils.loading import load_module

def dir_clashes_with_python_module(path):
    """Returns a boolean"""
    try:
        mod = load_module(os.path.basename(path))
    except ModuleNotFoundError:
        return False
    else:
        if path not in mod.__path__:
            return True
    return False

DOMAIN_NAME_REGEX = r'^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$'

class DomainNameValidator: # pylint: disable=too-few-public-methods
    """Django-style domain name validator"""
    @classmethod
    def __call__(cls, value):
        """Validates the domain name"""
        if not re.match(DOMAIN_NAME_REGEX, value):
            raise ValidationError('Invalid domain name')

class HostNameValidator: # pylint: disable=too-few-public-methods
    """Accepts domain names, localhost and IPv4 ip addresses"""
    @classmethod
    def __call__(cls, value):
        if value == 'localhost':
            return
        if re.match(DOMAIN_NAME_REGEX, value):
            return
        try:
            ipaddress.ip_address(value)
        except Exception as error: # pylint: disable=broad-except
            raise ValidationError('Invalid host name') from error

class PortNumberValidator: # pylint: disable=too-few-public-methods
    """Django-style port number validator"""

    @classmethod
    def __call__(cls, value):
        """Validates the domain name"""
        if not re.match(r'^[1-9][0-9]*$', value):
            raise ValidationError('Invalid domain name')

class TimezoneValidator: # pylint: disable=too-few-public-methods
    """Django-style TIME_ZONE validator"""
    @classmethod
    def __call__(cls, value):
        """Validates the timezone"""
        try:
            pytz.timezone(value)
        except Exception as error: # pylint: disable=broad-except
            raise ValidationError('Invalid timezone') from error

class LanguageCodeValidator: # pylint: disable=too-few-public-methods
    """Django-style LANGUAGE_CODE validator"""
    @classmethod
    def __call__(cls, value):
        """Validates the LANGUAGE_CODE"""
        if value not in dict(LANGUAGES):
            raise ValidationError('Invalid language code')

class LogFilePathValidator: # pylint: disable=too-few-public-methods
    """Validator for the log file path"""
    @classmethod
    def __call__(cls, value):
        """Validates the log file path"""
        if not os.path.isabs(value):
            if '..' in value:
                raise ValidationError('Relative path should not have .. parts.')
