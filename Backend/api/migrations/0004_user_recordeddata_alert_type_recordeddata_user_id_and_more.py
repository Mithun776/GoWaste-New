# Generated by Django 5.1.2 on 2024-11-09 17:13

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_recordeddata'),
    ]

    operations = [
        migrations.CreateModel(
            name='User',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('is_deleted', models.BooleanField()),
                ('phone_num', models.CharField(max_length=10)),
                ('user_name', models.CharField(max_length=30, null=True)),
                ('latitude', models.DecimalField(decimal_places=6, max_digits=10)),
                ('longitude', models.DecimalField(decimal_places=6, max_digits=10)),
                ('timestamp', models.DateTimeField()),
            ],
        ),
        migrations.AddField(
            model_name='recordeddata',
            name='alert_type',
            field=models.CharField(max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='recordeddata',
            name='user_id',
            field=models.IntegerField(null=True),
        ),
        migrations.CreateModel(
            name='Alerts',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('alert_type', models.IntegerField(choices=[(0, 'House'), (1, 'Dump Site'), (2, 'Electronic'), (3, 'Medical'), (4, 'Other')], default=0)),
                ('latitude', models.DecimalField(decimal_places=6, max_digits=10)),
                ('longitude', models.DecimalField(decimal_places=6, max_digits=10)),
                ('image', models.FileField(upload_to='assets')),
                ('timestamp', models.DateTimeField()),
                ('user', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='api.user')),
            ],
        ),
    ]