from django.db.models import Count
from rest_framework import generics, permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from social.models import Notification, Post
from social.serializers import CreatePostSerializer, NotificationSerializer, PostSerializer


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
