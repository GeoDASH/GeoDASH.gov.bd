# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('layers', '0038_layer_user_data_epsg'),
    ]

    operations = [
        migrations.AddField(
            model_name='layer',
            name='is_base_layer',
            field=models.BigIntegerField(default=False),
        ),
    ]
