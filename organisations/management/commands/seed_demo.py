from django.core.management.base import BaseCommand

from accounts.models import User
from organisations.models import Invite, Organisation
from social.models import Notification, Post, Reaction


class Command(BaseCommand):
    help = 'Seed the Beam API with MMC demo data.'

    def handle(self, *args, **options):
        organisation, _ = Organisation.objects.get_or_create(
            slug='mmc-seaton-delaval',
            defaults={'name': 'MMC Seaton Delaval'},
        )

        admin_user, _ = User.objects.get_or_create(
            email='rob@mmc.co.uk',
            defaults={
                'first_name': 'Rob',
                'last_name': 'Fraser',
                'job_title': 'Founder / Product Lead',
                'role': User.Role.ADMIN,
                'organisation': organisation,
                'is_staff': True,
            },
        )
        admin_user.set_password('password1234')
        admin_user.save()

        teammates = [
            ('lauren@mmc.co.uk', 'Lauren', 'Bell', 'Process Scientist', 14, 19),
            ('aisha@mmc.co.uk', 'Aisha', 'Khan', 'Quality Specialist', 22, 17),
            ('tom@mmc.co.uk', 'Tom', 'Reed', 'Manufacturing Technician', 9, 24),
            ('mina@mmc.co.uk', 'Mina', 'Patel', 'Operations Analyst', 16, 13),
        ]

        users = {}
        for email, first_name, last_name, job_title, given, received in teammates:
            user, _ = User.objects.get_or_create(
                email=email,
                defaults={
                    'first_name': first_name,
                    'last_name': last_name,
                    'job_title': job_title,
                    'organisation': organisation,
                    'beams_given': given,
                    'beams_received': received,
                },
            )
            user.set_password('password1234')
            user.save()
            users[email] = user

        posts = [
            (
                users['lauren@mmc.co.uk'],
                Post.Category.ACHIEVEMENT,
                'Passed the final validation checkpoint for the clean-room handover today. Huge thanks to Aisha and Tom for keeping every detail tight.',
            ),
            (
                users['aisha@mmc.co.uk'],
                Post.Category.KINDNESS,
                'Shoutout to the late team for staying behind and helping a new starter feel confident before tomorrow’s batch run.',
            ),
            (
                users['tom@mmc.co.uk'],
                Post.Category.PERSONAL,
                'Sleepless but smiling. Our little girl arrived this morning and the Beam family has already made us feel unbelievably supported.',
            ),
        ]

        created_posts = []
        for author, category, content in posts:
            post, _ = Post.objects.get_or_create(
                author=author,
                organisation=organisation,
                category=category,
                content=content,
            )
            created_posts.append(post)

        reaction_pairs = [
            (created_posts[0], admin_user, Reaction.ReactionType.CHEER),
            (created_posts[0], users['aisha@mmc.co.uk'], Reaction.ReactionType.HEART),
            (created_posts[1], users['mina@mmc.co.uk'], Reaction.ReactionType.CHEER),
            (created_posts[2], admin_user, Reaction.ReactionType.HEART),
        ]

        for post, user, reaction_type in reaction_pairs:
            Reaction.objects.get_or_create(post=post, user=user, reaction_type=reaction_type)

        Notification.objects.get_or_create(
            user=admin_user,
            actor=users['lauren@mmc.co.uk'],
            post=created_posts[0],
            type=Notification.NotificationType.REACTION,
        )

        Invite.objects.get_or_create(
            organisation=organisation,
            code='MMC-BEAM-042',
            defaults={'created_by': admin_user},
        )

        self.stdout.write(self.style.SUCCESS('Beam demo data created.'))
