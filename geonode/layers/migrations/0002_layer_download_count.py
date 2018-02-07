# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('layers', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='layer',
            name='download_count',
            field=models.IntegerField(null=True, blank=True),
        ),
    ]
