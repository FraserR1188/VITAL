from rest_framework import mixins, permissions, viewsets
from rest_framework.generics import RetrieveAPIView

from organisations.models import Invite, Organisation
from organisations.serializers import CreateInviteSerializer, InviteSerializer, OrganisationSerializer


class OrganisationViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = OrganisationSerializer

    def get_queryset(self):
        if self.request.user.is_anonymous or not self.request.user.organisation_id:
            return Organisation.objects.none()
        return Organisation.objects.filter(id=self.request.user.organisation_id)


class InviteCodePreviewView(RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = InviteSerializer
    lookup_field = 'code'

    def get_queryset(self):
        return Invite.objects.select_related('organisation').filter(
            revoked_at__isnull=True,
            accepted_at__isnull=True,
        )


class IsOrganisationAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == 'admin'
            and request.user.organisation_id
        )


class InviteViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    def get_queryset(self):
        return Invite.objects.filter(
            organisation=self.request.user.organisation,
            revoked_at__isnull=True,
        ).order_by('-created_at')

    def get_permissions(self):
        if self.action in {'create', 'list'}:
            return [IsOrganisationAdmin()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateInviteSerializer
        return InviteSerializer
