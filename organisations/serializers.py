import secrets

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


class CreateInviteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invite
        fields = ['id', 'code', 'email', 'created_at', 'accepted_at', 'revoked_at']
        read_only_fields = ['id', 'code', 'created_at', 'accepted_at', 'revoked_at']

    def create(self, validated_data):
        request = self.context['request']
        return Invite.objects.create(
            organisation=request.user.organisation,
            created_by=request.user,
            code=secrets.token_hex(4).upper(),
            **validated_data,
        )
