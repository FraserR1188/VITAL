from rest_framework import mixins, permissions, viewsets
from rest_framework.generics import RetrieveAPIView

from organisations.models import Invite, Organisation
from organisations.serializers import InviteSerializer, OrganisationSerializer


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
        return Invite.objects.select_related('organisation').filter(revoked_at__isnull=True)
