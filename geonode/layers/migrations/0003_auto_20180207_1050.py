# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('layers', '0002_layer_download_count'),
    ]

    operations = [
        migrations.AddField(
            model_name='layer',
            name='file_size',
            field=models.FloatField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='layer',
            name='file_type',
            field=models.CharField(max_length=200, null=True, blank=True),
        ),
    ]
