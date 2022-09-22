"""Initializes the askbot_badgedata table in the database"""
from django.core.management.base import BaseCommand
from askbot.models.badges import init_badges

class Command(BaseCommand): # pylint: disable=missing-class-docstring
    def handle(self, *args, **kwargs): # pylint: disable=missing-docstring, unused-argument
        init_badges()
