from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from accounts.views import MeView, RegisterView
from organisations.views import InviteCodePreviewView, OrganisationViewSet
from social.views import FeedView, NotificationViewSet, PostViewSet, TeamView

router = DefaultRouter()
router.register('organisations', OrganisationViewSet, basename='organisation')
router.register('posts', PostViewSet, basename='post')
router.register('notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/register/', RegisterView.as_view(), name='register'),
    path('api/auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/me/', MeView.as_view(), name='me'),
    path('api/feed/', FeedView.as_view(), name='feed'),
    path('api/team/', TeamView.as_view(), name='team'),
    path('api/invites/<str:code>/', InviteCodePreviewView.as_view(), name='invite-preview'),
    path('api/', include(router.urls)),
]
