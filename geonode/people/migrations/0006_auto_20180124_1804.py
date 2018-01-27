# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('people', '0005_profile_working_group_admin'),
    ]

    operations = [
        migrations.RenameField(
            model_name='profile',
            old_name='working_group_admin',
            new_name='is_working_group_admin',
        ),
    ]
