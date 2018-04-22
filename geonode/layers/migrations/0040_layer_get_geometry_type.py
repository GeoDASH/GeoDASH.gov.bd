# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('layers', '0039_layer_is_base_layer'),
    ]

    operations = [
        migrations.AddField(
            model_name='layer',
            name='get_geometry_type',
            field=models.CharField(max_length=200, null=True, blank=True),
        ),
    ]
