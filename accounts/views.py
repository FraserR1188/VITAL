from rest_framework import generics, permissions, viewsets, mixins
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.serializers import (
    AdminUserSerializer,
    AdminUserUpdateSerializer,
    RegisterSerializer,
    UserSerializer,
)


class IsOrganisationAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == 'admin'
            and request.user.organisation_id
        )


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)


class UserAdminViewSet(mixins.ListModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsOrganisationAdmin]

    def get_queryset(self):
        return User.objects.filter(organisation=self.request.user.organisation).order_by('first_name', 'last_name')

    def get_serializer_class(self):
        if self.action in {'update', 'partial_update'}:
            return AdminUserUpdateSerializer
        return AdminUserSerializer
