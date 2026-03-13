from django.contrib import admin

from social.models import Comment, Notification, Post, Reaction


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('author', 'organisation', 'category', 'created_at')
    list_filter = ('organisation', 'category')
    search_fields = ('content', 'author__email', 'author__first_name', 'author__last_name')


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('author', 'post', 'created_at')
    search_fields = ('content', 'author__email')


@admin.register(Reaction)
class ReactionAdmin(admin.ModelAdmin):
    list_display = ('post', 'user', 'reaction_type', 'created_at')
    list_filter = ('reaction_type',)


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'type', 'actor', 'read', 'created_at')
    list_filter = ('type', 'read')
