from rest_framework import serializers

from organisations.models import Invite, Organisation


class OrganisationSerializer(serializers.ModelSerializer):
    members_count = serializers.SerializerMethodField()
    pending_invites = serializers.SerializerMethodField()

    class Meta:
        model = Organisation
        fields = ['id', 'name', 'slug', 'created_at', 'members_count', 'pending_invites']

    def get_members_count(self, obj):
        return obj.users.count()

    def get_pending_invites(self, obj):
        return obj.invites.filter(accepted_at__isnull=True, revoked_at__isnull=True).count()


class InviteSerializer(serializers.ModelSerializer):
    organisation = OrganisationSerializer(read_only=True)

    class Meta:
        model = Invite
        fields = ['id', 'code', 'email', 'created_at', 'accepted_at', 'revoked_at', 'organisation']
