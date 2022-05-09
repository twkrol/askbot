"""Management command that builds Post.text and PostRevison.text in
Markdown format, from the html markup.
"""
import sys
from django.core.management.base import BaseCommand
from django.db import transaction
from markdownify import markdownify as md
from askbot.conf import settings as askbot_settings
from askbot.models import Post, PostRevision
from askbot.utils.console import get_yes_or_no, ProgressBar

ARE_YOU_SURE_MESSAGE = """Will convert the forum content from html to markdown.
Are you sure you want to proceed?"""

class Command(BaseCommand): #pylint: disable=missing-docstring
    def handle(self, *args, **kwargs): # pylint: disable=unused-argument

        if askbot_settings.EDITOR_TYPE != 'markdown':
            print("Update livesetting EDITOR_TYPE='markdown' and rerun this command")
            sys.exit(1)

        if askbot_settings.COMMENTS_EDITOR_TYPE != 'markdown':
            print("Update livesetting COMMENTS_EDITOR_TYPE='markdown' and rerun this command")
            sys.exit(1)

        if kwargs['verbosity'] > 0:
            response = get_yes_or_no(ARE_YOU_SURE_MESSAGE)
            if response == 'no':
                return

        message = 'Converting post revisions'
        revs = PostRevision.objects.all()
        for rev in ProgressBar(revs.iterator(), revs.count(), message=message):
            rev.text = md(rev.text)
            try:
                rev.save()
            except Exception as error: #pylint: disable=broad-except
                print(f'error converting post revision id={rev.id} {error}')

            transaction.commit()

        message = 'Converting posts'
        posts = Post.objects.all()
        for post in ProgressBar(posts.iterator(), posts.count(), message=message):
            post.text = md(post.html)
            post.html = post.parse_post_text()['html']
            post.summary = post.get_snippet()
            try:
                post.save()
            except Exception as error: #pylint: disable=broad-except
                print(f'error converting post revision id={post.id} {error}')

            transaction.commit()
            if post.thread:
                post.thread.clear_cached_data()
        transaction.commit()
