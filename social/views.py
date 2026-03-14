from django.db.models import Count
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from social.models import Comment, Notification, Post, Reaction
from social.serializers import (
    CommentSerializer,
    CreateCommentSerializer,
    CreatePostSerializer,
    NotificationSerializer,
    PostSerializer,
    ReactionToggleSerializer,
)


class FeedView(generics.ListAPIView):
    serializer_class = PostSerializer

    def get_queryset(self):
        queryset = (
            Post.objects.filter(organisation=self.request.user.organisation)
            .select_related('author')
            .prefetch_related('reactions', 'comments')
            .annotate(comments_count=Count('comments'))
        )
        category = self.request.query_params.get('category')
        if category and category != 'all':
            queryset = queryset.filter(category=category)
        return queryset


class PostViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Post.objects.filter(organisation=self.request.user.organisation)
            .select_related('author')
            .prefetch_related('reactions', 'comments')
            .annotate(comments_count=Count('comments'))
        )

    def get_serializer_class(self):
        if self.action in {'create', 'update', 'partial_update'}:
            return CreatePostSerializer
        return PostSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        post = serializer.save()
        response_serializer = PostSerializer(
            Post.objects.select_related('author').prefetch_related('reactions', 'comments').annotate(
                comments_count=Count('comments')
            ).get(id=post.id),
            context={'request': request},
        )
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        post = self.get_object()
        if request.user.role != 'admin' and post.author_id != request.user.id:
            return Response({'detail': 'You do not have permission to delete this post.'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['get', 'post'], url_path='comments')
    def comments(self, request, pk=None):
        post = self.get_object()

        if request.method == 'GET':
            serializer = CommentSerializer(post.comments.select_related('author').all(), many=True)
            return Response(serializer.data)

        serializer = CreateCommentSerializer(
            data=request.data,
            context={'request': request, 'post': post},
        )
        serializer.is_valid(raise_exception=True)
        comment = serializer.save()

        if post.author_id != request.user.id:
            Notification.objects.create(
                user=post.author,
                actor=request.user,
                post=post,
                comment=comment,
                type=Notification.NotificationType.COMMENT,
            )

        response_serializer = CommentSerializer(comment)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='reactions')
    def reactions(self, request, pk=None):
        post = self.get_object()
        serializer = ReactionToggleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reaction_type = serializer.validated_data['reaction_type']

        reaction, created = Reaction.objects.get_or_create(
            post=post,
            user=request.user,
            reaction_type=reaction_type,
        )

        if created:
            if post.author_id != request.user.id:
                Notification.objects.create(
                    user=post.author,
                    actor=request.user,
                    post=post,
                    type=Notification.NotificationType.REACTION,
                )
        else:
            reaction.delete()

        refreshed_post = (
            Post.objects.filter(id=post.id)
            .select_related('author')
            .prefetch_related('reactions', 'comments')
            .annotate(comments_count=Count('comments'))
            .get()
        )
        response_serializer = PostSerializer(refreshed_post, context={'request': request})
        return Response(response_serializer.data)

    @action(detail=True, methods=['delete'], url_path=r'comments/(?P<comment_id>[^/.]+)')
    def delete_comment(self, request, pk=None, comment_id=None):
        post = self.get_object()
        try:
            comment = post.comments.get(id=comment_id)
        except Comment.DoesNotExist:
            return Response({'detail': 'Comment not found.'}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role != 'admin' and comment.author_id != request.user.id:
            return Response({'detail': 'You do not have permission to delete this comment.'}, status=status.HTTP_403_FORBIDDEN)

        comment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).select_related('actor', 'post')


class TeamView(APIView):
    def get(self, request):
        members = request.user.organisation.users.order_by('first_name', 'last_name')
        data = [
            {
                'id': member.id,
                'full_name': member.get_full_name() or member.email,
                'job_title': member.job_title,
                'beams_given': member.beams_given,
                'beams_received': member.beams_received,
            }
            for member in members
        ]
        return Response(data)
