# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models
import datetime
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('groups', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='GroupInvitation',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('token', models.CharField(max_length=40)),
                ('email', models.EmailField(max_length=254)),
                ('role', models.CharField(max_length=10, choices=[(b'manager', 'Manager'), (b'member', 'Member')])),
                ('state', models.CharField(default=b'sent', max_length=10, choices=[(b'sent', 'Sent'), (b'accepted', 'Accepted'), (b'declined', 'Declined')])),
                ('created', models.DateTimeField(default=datetime.datetime.now)),
                ('from_user', models.ForeignKey(related_name='pg_invitations_sent', to=settings.AUTH_USER_MODEL)),
                ('group', models.ForeignKey(related_name='invitations', to='groups.GroupProfile')),
                ('user', models.ForeignKey(related_name='pg_invitations_received', to=settings.AUTH_USER_MODEL, null=True)),
            ],
        ),
        migrations.CreateModel(
            name='GroupMember',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('role', models.CharField(max_length=10, choices=[(b'manager', 'Manager'), (b'member', 'Member')])),
                ('joined', models.DateTimeField(default=datetime.datetime.now)),
                ('group', models.ForeignKey(to='groups.GroupProfile')),
                ('user', models.ForeignKey(to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='QuestionAnswer',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('question', models.TextField()),
                ('answer', models.TextField()),
                ('answered', models.BooleanField(default=False)),
                ('date_created', models.DateTimeField(auto_now_add=True)),
                ('date_updated', models.DateTimeField(auto_now=True)),
                ('group', models.ForeignKey(blank=True, to='groups.GroupProfile', null=True)),
                ('questioner', models.ForeignKey(related_name='questioner', blank=True, to=settings.AUTH_USER_MODEL, null=True)),
                ('respondent', models.ForeignKey(related_name='respondent', blank=True, to=settings.AUTH_USER_MODEL, null=True)),
            ],
        ),
        migrations.CreateModel(
            name='UserInvitationModel',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('state', models.CharField(default=b'free', max_length=10, choices=[(b'pending', 'Pending'), (b'free', 'Free'), (b'connected', 'Connected')])),
                ('date_created', models.DateTimeField(auto_now_add=True)),
                ('date_updated', models.DateTimeField(auto_now=True)),
                ('group', models.ForeignKey(to='groups.GroupProfile')),
                ('user', models.ForeignKey(to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AlterUniqueTogether(
            name='userinvitationmodel',
            unique_together=set([('group', 'user', 'state')]),
        ),
        migrations.AlterUniqueTogether(
            name='groupinvitation',
            unique_together=set([('group', 'email')]),
        ),
    ]
