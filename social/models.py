import uuid

from django.conf import settings
from django.db import models


class Post(models.Model):
    class Category(models.TextChoices):
        ACHIEVEMENT = 'achievement', 'Achievement'
        KINDNESS = 'kindness', 'Kindness'
        PERSONAL = 'personal', 'Personal'
        FITNESS = 'fitness', 'Fitness'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='posts')
    organisation = models.ForeignKey('organisations.Organisation', on_delete=models.CASCADE, related_name='posts')
    category = models.CharField(max_length=20, choices=Category.choices)
    content = models.TextField()
    image = models.ImageField(upload_to='posts/', blank=True, null=True)
    mentions = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='mentioned_in_posts', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.author} - {self.category}'


class Reaction(models.Model):
    class ReactionType(models.TextChoices):
        CHEER = 'cheer', 'Cheer'
        HEART = 'heart', 'Heart'
        FIRE = 'fire', 'Fire'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='reactions')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reactions')
    reaction_type = models.CharField(max_length=20, choices=ReactionType.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('post', 'user', 'reaction_type')


class Comment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='comments')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']


class Notification(models.Model):
    class NotificationType(models.TextChoices):
        MENTION = 'mention', 'Mention'
        REACTION = 'reaction', 'Reaction'
        COMMENT = 'comment', 'Comment'
        BEAM = 'beam', 'Beam'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='triggered_notifications',
        null=True,
        blank=True,
    )
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='notifications', null=True, blank=True)
    comment = models.ForeignKey(Comment, on_delete=models.CASCADE, related_name='notifications', null=True, blank=True)
    type = models.CharField(max_length=20, choices=NotificationType.choices)
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
