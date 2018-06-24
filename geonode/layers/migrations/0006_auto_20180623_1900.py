# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models
import django.core.files.storage
from django.conf import settings
import uuid


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('layers', '0005_auto_20161115_1917'),
    ]

    operations = [
        migrations.CreateModel(
            name='StyleExtension',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('uuid', models.UUIDField(default=uuid.uuid4, help_text='Designats uuid', editable=False, verbose_name='UUID')),
                ('title', models.CharField(help_text='Designats title of the SLD', max_length=50, verbose_name='Title')),
                ('json_field', models.TextField(help_text='Designates json field.', verbose_name='Json Field', blank=True)),
                ('sld_body', models.TextField(help_text='Designates SLD Text.', verbose_name='SLD Text', blank=True)),
                ('created_date', models.DateTimeField(help_text='Designates when this record created.', verbose_name='Created Date', auto_now_add=True)),
                ('last_modified', models.DateTimeField(help_text='Designates when this record last modified.', verbose_name='Last Modified', auto_now=True)),
                ('created_by', models.ForeignKey(related_name='layer_style_created_by', verbose_name='Created by', to=settings.AUTH_USER_MODEL, help_text='Designates user who creates the record.')),
                ('modified_by', models.ForeignKey(related_name='layer_style_modified_by', verbose_name='Modified by', to=settings.AUTH_USER_MODEL, help_text='Designates user who updates the record.')),
                ('style', models.OneToOneField(verbose_name='Style', to='layers.Style', help_text='Designats related Style')),
            ],
        ),
        migrations.RemoveField(
            model_name='layerstyles',
            name='layer',
        ),
        migrations.RemoveField(
            model_name='layerstyles',
            name='style',
        ),
        migrations.RemoveField(
            model_name='layer',
            name='service',
        ),
        migrations.AddField(
            model_name='layer',
            name='geometry_type',
            field=models.CharField(max_length=200, null=True, blank=True),
        ),
        migrations.AddField(
            model_name='layer',
            name='is_base_layer',
            field=models.BigIntegerField(default=False),
        ),
        migrations.AddField(
            model_name='layer',
            name='user_data_epsg',
            field=models.CharField(max_length=128, null=True, blank=True),
        ),
        migrations.AlterField(
            model_name='layer',
            name='styles',
            field=models.ManyToManyField(related_name='layer_styles', to='layers.Style'),
        ),
        migrations.AlterField(
            model_name='layerfile',
            name='file',
            field=models.FileField(storage=django.core.files.storage.FileSystemStorage(base_url=b'/uploaded/'), max_length=255, upload_to=b'layers'),
        ),
        migrations.DeleteModel(
            name='LayerStyles',
        ),
    ]
