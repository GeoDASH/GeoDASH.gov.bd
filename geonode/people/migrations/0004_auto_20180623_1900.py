# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models
import geonode.people.models


class Migration(migrations.Migration):

    dependencies = [
        ('people', '0003_auto_20161115_1924'),
    ]

    operations = [
        migrations.AlterModelManagers(
            name='profile',
            managers=[
                ('objects', geonode.people.models.ProfileUserManager()),
            ],
        ),
    ]
