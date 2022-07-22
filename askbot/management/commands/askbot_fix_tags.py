import re
from django.core.management import BaseCommand
from django.db import transaction
from django.utils import translation
from askbot import const
from askbot.models import Tag, Thread
from askbot.utils.console import ProgressBar
from askbot import signals
from askbot.conf import settings as askbot_settings
from askbot.management.commands.rename_tags import get_admin

def get_valid_tag_name(tag):
    """Returns valid version of the tag name.
    If necessary, lowercases the tag.
    Strips the forbidden first characters in the tag.
    """
    name = tag.name
    if askbot_settings.FORCE_LOWERCASE_TAGS:
        #name = slugify_camelcase(name)
        name = name.lower()
    #if tag name starts with forbidden character, chop off that character
    #until no more forbidden chars are at the beginning
    first_char_regex = re.compile('^%s+' % const.TAG_FORBIDDEN_FIRST_CHARS)
    return first_char_regex.sub('', name)

class Command(BaseCommand):
    def handle(self, *args, **options):
        #pylint: disable=attribute-defined-outside-init
        signal_data = signals.pop_all_db_signal_receivers()
        self.admin = get_admin() #pylint: disable=attribute-defined-outside-init
        languages = self.get_languages()
        self.num_invalid_tags = 0
        self.num_denorm_errors = 0
        self.num_duplicate_tag_errors = 0

        self.num_wrong_lang_errors = self.fix_wrong_lang_errors()

        for lang in languages:
            print(f'\nProcessing language {lang}:')
            translation.activate(lang)
            self.num_duplicate_tag_errors += self.fix_duplicate_tags(lang)
            self.num_invalid_tags += self.fix_invalid_tagnames(lang)
            self.num_denorm_errors += self.sync_denormalized_tagnames(lang)

        self.num_used_count_errors = self.fix_tag_used_counts()
        self.print_summary()

        signals.set_all_db_signal_receivers(signal_data)


    @classmethod
    def get_languages(cls):
        """Returns all used language codes"""
        return set(Tag.objects.values_list('language_code', flat=True))


    def has_errors(self): #pylint: disable=missing-docstring
        if self.num_invalid_tags:
            return True

        if self.num_denorm_errors:
            return True

        if self.num_used_count_errors:
            return True

        if self.num_duplicate_tag_errors:
            return True

        if self.num_wrong_lang_errors:
            return True

        return False


    def print_summary(self):
        """Prints the job results summary"""

        if not self.has_errors():
            print('Did not find any problems')

        if self.num_invalid_tags:
            print(f'{self.num_invalid_tags} invalid tags found')

        if self.num_denorm_errors:
            print(f'{self.num_denorm_errors} tag denormalization errors found')

        if self.num_used_count_errors:
            print(f'{self.num_used_count_errors} tag used counts errors found')

        if self.num_duplicate_tag_errors:
            print(f'{self.num_duplicate_tag_errors} duplicate tags found')

        if self.num_wrong_lang_errors:
            print(f'{self.num_wrong_lang_errors} tags with incorrect language found')



    def fix_duplicate_tags(self, lang):
        """
        Fixes situations where there is > 1 tag with the same name and language code.
        Returns number of such tags.
        """
        tag_names = self.get_tag_names(lang)
        num_errors = 0
        message = 'Searching for duplicate tags'
        for tag_name in ProgressBar(tag_names.iterator(), tag_names.count(), message):
            tags = Tag.objects.filter(language_code=lang, name=tag_name)
            count = tags.count()
            if count > 1:
                num_errors += count - 1
                # retain the oldest tag
                oldest_tag = tags.order_by('pk')[0]
                for tag in tags:
                    if tag == oldest_tag:
                        continue
                    for thread in tag.threads:
                        self.replace_thread_tag(thread, tag, oldest_tag)

        return num_errors


    def fix_wrong_lang_errors(self):
        """
        Fixes cases where thread language is not
        the same as the tags language.
        """
        threads = Thread.objects.all()
        message = 'Searching for threads with tags in incorrect language'
        num_errors = 0
        for thread in ProgressBar(threads.iterator(), threads.count(), message):
            for tag in thread.tags.all():
                if tag.language_code != thread.language_code:
                    # if tag language is incorrect - get or create tag with the same name
                    # but in correct language and reassign to thread
                    num_errors += 1
                    correct_tag = self.get_tag_for_lang(tag.name, thread.language_code)
                    self.replace_thread_tag(thread, tag, correct_tag)

        return num_errors


    @classmethod
    def replace_thread_tag(cls, thread, from_tag, to_tag): #pylint: disable=missing-docstring
        thread.tags.remove(from_tag)
        thread.tags.add(to_tag)


    def get_tag_for_lang(self, tag_name, lang): #pylint: disable=missing-docstring
        try:
            return Tag.objects.get(name=tag_name, language_code=lang)
        except Tag.DoesNotExist: #pylint: disable=no-member
            return Tag.objects.create(name=tag_name,
                                      language_code=lang,
                                      created_by=self.admin)


    @classmethod
    def fix_tag_used_counts(cls):
        """Updates the denormalized value in Tag.used_count"""
        tags = Tag.objects.all()
        message = 'Calculating tag usage counts'
        num_errors = 0
        for tag in ProgressBar(tags.iterator(), tags.count(), message):
            used_count = tag.threads.filter(deleted=False, approved=True).count()
            if used_count != tag.used_count:
                num_errors += 1
                tag.used_count = used_count
                tag.save()
        return num_errors


    def retag_threads(self, from_tags, to_tag):
        """finds threads matching the `from_tags`
        removes the `from_tags` from them and applies the
        to_tags"""
        threads = Thread.objects.filter(tags__in=from_tags)
        from_tag_names = [tag.name for tag in from_tags]
        for thread in threads:
            tagnames = set(thread.get_tag_names())
            tagnames.difference_update(from_tag_names)
            tagnames.add(to_tag.name)
            self.admin.retag_question(
                question=thread._question_post(), #pylint: disable=protected-access
                tags=' '.join(tagnames)
            )


    def replace_case_variant_duplicates(self, tag, language_code):
        """
        if there are case variant dupes, we assign questions
        from the case variants to the current tag and
        delete the case variant tags.

        Returns `num_errors`.
        """
        num_errors = 0
        dupes = Tag.objects.filter(
            name__iexact=tag.name,
            language_code=language_code
        ).exclude(pk=tag.id)

        dupes_count = dupes.count()
        if dupes_count:
            self.retag_threads(dupes, tag)
            dupes.delete()
            num_errors += dupes_count

        return num_errors


    def sync_denormalized_thread_tagnames(self, thread, lang):
        """
        Make the denormalized tag set the same as normalized
        by adding both the tag sets together and store in both places.
        """
        denorm_tag_set = set(thread.get_tag_names())
        norm_tag_set = set(thread.tags.values_list('name', flat=True))
        num_errors = 0

        if norm_tag_set != denorm_tag_set:
            num_errors += 1
            final_tagnames = Tag.objects.filter(
                                    name__in=norm_tag_set,
                                    language_code=lang
                                ).values_list('name', flat=True)

            self.admin.retag_question(
                question=thread._question_post(), #pylint: disable=protected-access
                tags=' '.join(set(final_tagnames))
            )

        return num_errors

    @classmethod
    def get_tag_names(cls, lang):
        """Returns unique tag names using a given language"""
        tags = Tag.objects.filter(language_code=lang)
        return tags.values_list('name', flat=True).distinct()

    def fix_invalid_tagnames(self, lang):
        """
        Iterates tag names,
        fixes invalid tag names.
        Returns number of fixed tags.
        """
        tagnames = self.get_tag_names(lang)

        #1) first we go through all tags and
        #either fix or delete illegal tags
        num_errors = 0
        message = 'Fixing tag names'
        valid_tagnames = set()
        for name in ProgressBar(tagnames.iterator(), tagnames.count(), message):
            matching_tags = Tag.objects.filter(name=name, language_code=lang)
            if len(matching_tags) == 0:
                continue

            if name in valid_tagnames:
                continue

            tag = matching_tags[0]
            fixed_name = get_valid_tag_name(tag)

            #if fixed name is empty after cleaning, delete the tag
            if fixed_name == '':
                print('Deleting invalid tags named: %s' % name)
                num_errors += len(matching_tags)
                matching_tags.delete()
                continue

            valid_tagnames.add(fixed_name)

            try:
                matching_tag = Tag.objects.get(name=fixed_name, language_code=lang)
            except Tag.DoesNotExist: #pylint: disable=no-member
                # replace all tag case duplicates before renaming the tag
                num_errors += self.replace_case_variant_duplicates(tag, lang)

                if tag.name != fixed_name:
                    tag.name = fixed_name
                    tag.save()
                    # replace the case duplicates with the new name
                    num_errors += self.replace_case_variant_duplicates(tag, lang)
            else:
                if matching_tag != tag:
                    for thread in tag.threads.all().iterator():
                        self.replace_thread_tag(thread, tag, matching_tag)
                    tag.delete()
                num_errors += self.replace_case_variant_duplicates(matching_tag, lang)

        transaction.commit()
        return num_errors

    def sync_denormalized_tagnames(self, lang):
        """
        Go through questions and fix tag records on each
        and recalculate all the denormalised tag names on threads.
        """
        threads = Thread.objects.filter(language_code=lang)
        message = 'Searching for threads with tag name differing from the attached tag names'
        num_errors = 0
        for thread in ProgressBar(threads.iterator(), threads.count(), message):
            num_errors += self.sync_denormalized_thread_tagnames(thread, lang)
            transaction.commit()

        return num_errors
