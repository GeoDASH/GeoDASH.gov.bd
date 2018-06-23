# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models
from django.conf import settings
import django.contrib.gis.db.models.fields


class Migration(migrations.Migration):

    dependencies = [
        ('maps', '0006_auto_20161115_1917'),
        ('contenttypes', '0002_remove_content_type_name'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('layers', '0006_auto_20180623_1900'),
    ]

    operations = [
        migrations.CreateModel(
            name='LayerLoad',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('latitude', models.FloatField(help_text='Latitude', null=True, verbose_name='Latitude', blank=True)),
                ('longitude', models.FloatField(help_text='Longitude', null=True, verbose_name='Longitude', blank=True)),
                ('agent', models.CharField(help_text='User Agent', max_length=250, null=True, verbose_name='User Agent', blank=True)),
                ('ip', models.CharField(help_text='IP Address', max_length=100, null=True, verbose_name='IP Address', blank=True)),
                ('created_date', models.DateTimeField(help_text='Created Date', verbose_name='Created Date', auto_now_add=True)),
                ('last_modified', models.DateTimeField(help_text='Last Modified', verbose_name='Last Modified', auto_now=True)),
                ('layer', models.ForeignKey(to='layers.Layer')),
                ('user', models.ForeignKey(blank=True, to=settings.AUTH_USER_MODEL, null=True)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='LoadActivity',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('latitude', models.FloatField(help_text='Latitude', null=True, verbose_name='Latitude', blank=True)),
                ('longitude', models.FloatField(help_text='Longitude', null=True, verbose_name='Longitude', blank=True)),
                ('agent', models.CharField(help_text='User Agent', max_length=250, null=True, verbose_name='User Agent', blank=True)),
                ('ip', models.CharField(help_text='IP Address', max_length=100, null=True, verbose_name='IP Address', blank=True)),
                ('created_date', models.DateTimeField(help_text='Created Date', verbose_name='Created Date', auto_now_add=True)),
                ('last_modified', models.DateTimeField(help_text='Last Modified', verbose_name='Last Modified', auto_now=True)),
                ('activity_type', models.CharField(help_text='Activity Type', max_length=10, verbose_name='Activity Type', choices=[(b'share', 'share'), (b'load', 'load'), (b'download', 'download')])),
                ('object_id', models.PositiveIntegerField()),
                ('content_type', models.ForeignKey(to='contenttypes.ContentType')),
                ('user', models.ForeignKey(blank=True, to=settings.AUTH_USER_MODEL, null=True)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='MapLoad',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('latitude', models.FloatField(help_text='Latitude', null=True, verbose_name='Latitude', blank=True)),
                ('longitude', models.FloatField(help_text='Longitude', null=True, verbose_name='Longitude', blank=True)),
                ('agent', models.CharField(help_text='User Agent', max_length=250, null=True, verbose_name='User Agent', blank=True)),
                ('ip', models.CharField(help_text='IP Address', max_length=100, null=True, verbose_name='IP Address', blank=True)),
                ('created_date', models.DateTimeField(help_text='Created Date', verbose_name='Created Date', auto_now_add=True)),
                ('last_modified', models.DateTimeField(help_text='Last Modified', verbose_name='Last Modified', auto_now=True)),
                ('map', models.ForeignKey(related_name='map_load', to='maps.Map')),
                ('user', models.ForeignKey(blank=True, to=settings.AUTH_USER_MODEL, null=True)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='PinpointUserActivity',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('latitude', models.FloatField(help_text='Latitude', null=True, verbose_name='Latitude', blank=True)),
                ('longitude', models.FloatField(help_text='Longitude', null=True, verbose_name='Longitude', blank=True)),
                ('agent', models.CharField(help_text='User Agent', max_length=250, null=True, verbose_name='User Agent', blank=True)),
                ('ip', models.CharField(help_text='IP Address', max_length=100, null=True, verbose_name='IP Address', blank=True)),
                ('created_date', models.DateTimeField(help_text='Created Date', verbose_name='Created Date', auto_now_add=True)),
                ('last_modified', models.DateTimeField(help_text='Last Modified', verbose_name='Last Modified', auto_now=True)),
                ('activity_type', models.CharField(help_text='Activity Type', max_length=10, verbose_name='Activity Type', choices=[('pan', 'Pan'), ('zoom', 'Zoom'), ('click', 'Click')])),
                ('the_geom', django.contrib.gis.db.models.fields.GeometryField(help_text='Geometry', srid=4326, null=True, verbose_name='Geometry', blank=True)),
                ('layer', models.ForeignKey(blank=True, to='layers.Layer', null=True)),
                ('map', models.ForeignKey(blank=True, to='maps.Map', null=True)),
                ('user', models.ForeignKey(blank=True, to=settings.AUTH_USER_MODEL, null=True)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='Visitor',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('latitude', models.FloatField(help_text='Latitude', null=True, verbose_name='Latitude', blank=True)),
                ('longitude', models.FloatField(help_text='Longitude', null=True, verbose_name='Longitude', blank=True)),
                ('agent', models.CharField(help_text='User Agent', max_length=250, null=True, verbose_name='User Agent', blank=True)),
                ('ip', models.CharField(help_text='IP Address', max_length=100, null=True, verbose_name='IP Address', blank=True)),
                ('created_date', models.DateTimeField(help_text='Created Date', verbose_name='Created Date', auto_now_add=True)),
                ('last_modified', models.DateTimeField(help_text='Last Modified', verbose_name='Last Modified', auto_now=True)),
                ('page_name', models.CharField(help_text='Page Name', max_length=250, null=True, verbose_name='Page Name', blank=True)),
                ('user', models.ForeignKey(blank=True, to=settings.AUTH_USER_MODEL, null=True)),
            ],
            options={
                'abstract': False,
            },
        ),
    ]
