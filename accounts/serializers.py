from django.utils import timezone
from rest_framework import serializers

from accounts.models import User
from organisations.models import Invite


class UserSerializer(serializers.ModelSerializer):
    organisation_name = serializers.CharField(source='organisation.name', read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'first_name',
            'last_name',
            'job_title',
            'department',
            'role',
            'bio',
            'beams_given',
            'beams_received',
            'organisation',
            'organisation_name',
        ]
        read_only_fields = ['id', 'beams_given', 'beams_received', 'role', 'organisation']


class RegisterSerializer(serializers.ModelSerializer):
    invite_code = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = [
            'email',
            'password',
            'first_name',
            'last_name',
            'job_title',
            'department',
            'invite_code',
        ]

    def validate_invite_code(self, value):
        try:
            invite = Invite.objects.select_related('organisation').get(
                code=value,
                accepted_at__isnull=True,
                revoked_at__isnull=True,
            )
        except Invite.DoesNotExist as exc:
            raise serializers.ValidationError('Invite code is invalid or has already been used.') from exc

        self.context['invite'] = invite
        return value

    def create(self, validated_data):
        invite = self.context['invite']
        validated_data.pop('invite_code')
        password = validated_data.pop('password')
        user = User.objects.create_user(
            password=password,
            organisation=invite.organisation,
            **validated_data,
        )
        invite.email = user.email
        invite.accepted_at = timezone.now()
        invite.save(update_fields=['email', 'accepted_at'])
        return user
