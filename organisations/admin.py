from django.contrib import admin

from organisations.models import Invite, Organisation


@admin.register(Organisation)
class OrganisationAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'created_at')
    search_fields = ('name', 'slug')


@admin.register(Invite)
class InviteAdmin(admin.ModelAdmin):
    list_display = ('organisation', 'code', 'email', 'created_at', 'accepted_at', 'revoked_at')
    list_filter = ('organisation', 'accepted_at', 'revoked_at')
    search_fields = ('code', 'email', 'organisation__name')
