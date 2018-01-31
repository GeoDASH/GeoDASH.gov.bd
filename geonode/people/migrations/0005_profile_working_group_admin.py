# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('people', '0004_remove_profile_occupation'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='working_group_admin',
            field=models.BooleanField(default=False),
        ),
    ]
