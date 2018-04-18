# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('layers', '0040_layer_get_geometry_type'),
    ]

    operations = [
        migrations.RenameField(
            model_name='layer',
            old_name='get_geometry_type',
            new_name='geometry_type',
        ),
    ]
