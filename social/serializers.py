from django.db.models import Count
from rest_framework import serializers

from social.models import Comment, Notification, Post, Reaction


class PostSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()
    reactions = serializers.SerializerMethodField()
    comments_count = serializers.IntegerField(read_only=True)
    current_user_reactions = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            'id',
            'category',
            'content',
            'created_at',
            'author',
            'reactions',
            'comments_count',
            'current_user_reactions',
        ]

    def get_author(self, obj):
        full_name = obj.author.get_full_name() or obj.author.email
        initials = ''.join(part[0] for part in full_name.split()[:2]).upper()
        return {
            'id': obj.author_id,
            'full_name': full_name,
            'job_title': obj.author.job_title,
            'initials': initials,
        }

    def get_reactions(self, obj):
        counts = obj.reactions.values('reaction_type').annotate(total=Count('id'))
        mapped = {entry['reaction_type']: entry['total'] for entry in counts}
        return {
            'cheer': mapped.get('cheer', 0),
            'heart': mapped.get('heart', 0),
            'fire': mapped.get('fire', 0),
        }

    def get_current_user_reactions(self, obj):
        request = self.context.get('request')
        if not request or request.user.is_anonymous:
            return []
        return list(obj.reactions.filter(user=request.user).values_list('reaction_type', flat=True))


class CreatePostSerializer(serializers.ModelSerializer):
    class Meta:
        model = Post
        fields = ['category', 'content']

    def create(self, validated_data):
        request = self.context['request']
        return Post.objects.create(
            author=request.user,
            organisation=request.user.organisation,
            **validated_data,
        )


class NotificationSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()
    post_id = serializers.UUIDField(source='post.id', read_only=True)

    class Meta:
        model = Notification
        fields = ['id', 'type', 'actor_name', 'post_id', 'read', 'created_at']

    def get_actor_name(self, obj):
        if not obj.actor:
            return ''
        return obj.actor.get_full_name() or obj.actor.email


class CommentSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ['id', 'content', 'created_at', 'author']

    def get_author(self, obj):
        full_name = obj.author.get_full_name() or obj.author.email
        initials = ''.join(part[0] for part in full_name.split()[:2]).upper()
        return {
            'id': obj.author_id,
            'full_name': full_name,
            'job_title': obj.author.job_title,
            'initials': initials,
        }


class CreateCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ['content']

    def create(self, validated_data):
        post = self.context['post']
        request = self.context['request']
        return Comment.objects.create(
            post=post,
            author=request.user,
            content=validated_data['content'],
        )


class ReactionToggleSerializer(serializers.Serializer):
    reaction_type = serializers.ChoiceField(choices=Reaction.ReactionType.choices)
