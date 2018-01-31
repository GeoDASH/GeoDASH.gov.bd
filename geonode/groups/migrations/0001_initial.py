# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models
import taggit.managers


class Migration(migrations.Migration):

    dependencies = [
        ('taggit', '0002_auto_20150616_2121'),
        ('auth', '0006_require_contenttypes_0002'),
        ('nsdi', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='GroupProfile',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('title', models.CharField(max_length=200, verbose_name='Title')),
                ('slug', models.SlugField(unique=True)),
                ('logo', models.ImageField(upload_to=b'people_group', verbose_name='Logo', blank=True)),
                ('description', models.TextField(verbose_name='Description')),
                ('favorite', models.BooleanField(default=False, help_text='Should this organization be in favorite list ?', verbose_name='Favorite')),
                ('docked', models.BooleanField(default=False, help_text='Should this organization be docked in home page?', verbose_name='Docked')),
                ('email', models.EmailField(help_text='Email used to contact one or all group members, such as a mailing list, shared email, or exchange group.', max_length=254, null=True, verbose_name='Email', blank=True)),
                ('access', models.CharField(default=b"public'", help_text='Public: Any registered user can view and join a public group.<br>Public (invite-only):Any registered user can view the group.  Only invited users can join.<br>Private: Registered users cannot see any details about the group, including membership.  Only invited users can join.', max_length=15, verbose_name='Access', choices=[(b'public', 'Public'), (b'public-invite', 'Public (invite-only)'), (b'private', 'Private')])),
                ('last_modified', models.DateTimeField(auto_now=True)),
                ('date', models.DateTimeField(auto_now=True)),
                ('department', models.ForeignKey(related_name='department', to='nsdi.DepartmentModel', null=True)),
                ('group', models.OneToOneField(to='auth.Group')),
                ('keywords', taggit.managers.TaggableManager(to='taggit.Tag', through='taggit.TaggedItem', blank=True, help_text='A space or comma-separated list of keywords', verbose_name='Keywords')),
            ],
        ),
        migrations.CreateModel(
            name='SectionModel',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('title', models.CharField(default=b'', max_length=50)),
                ('slug', models.SlugField(max_length=100, null=True, blank=True)),
                ('is_active', models.BooleanField(default=True)),
                ('date_created', models.DateTimeField(auto_now_add=True)),
                ('date_updated', models.DateTimeField(auto_now=True)),
                ('organization', models.ForeignKey(related_name='groupprofile', blank=True, to='groups.GroupProfile', null=True)),
            ],
        ),
    ]
