from typing import Any, Iterable
from django.db import models
from django.utils import timezone

class VehicleLocation(models.Model):
    id = models.AutoField(primary_key=True)
    vehicle_registration = models.CharField(max_length=20, null=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=6)       #  333.666666
    longitude = models.DecimalField(max_digits=10, decimal_places=6)       #  333.666666
    timestamp = models.DateTimeField()
    is_active = models.BooleanField(default=True)

    def __str__(self) -> str:
        return self.vehicle_registration
    def save(self, *args, **kwargs) -> None:
        self.timestamp = timezone.now()
        return super().save(*args, **kwargs)

class User(models.Model):
    id = models.AutoField(primary_key=True)
    is_deleted = models.BooleanField()
    phone_num = models.CharField(max_length=10)
    user_name = models.CharField(max_length=30, null=True)
    timestamp = models.DateTimeField()

    def __str__(self) -> str:
        if self.user_name:
            return self.user_name
        return self.phone_num
    def save(self, *args, **kwargs) -> None:
        self.is_deleted = False
        self.timestamp = timezone.now()
        return super().save(*args, **kwargs)
    def delete(self) -> None:
        self.is_deleted = True
        self.save()
        

class AlertTypes(models.IntegerChoices):
    HOUSE = 0, 'House'
    DUMP = 1, 'Dump Site'
    ELECTRONIC = 2, 'Electronic'
    MEDICAL = 3, 'Medical'
    OTHER = 4, 'Other'


class Alerts(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete= models.SET_NULL, null= True)
    alert_type = models.IntegerField(default=AlertTypes.HOUSE, choices=AlertTypes.choices)
    latitude = models.DecimalField(max_digits=10, decimal_places=6)       #  333.666666
    longitude = models.DecimalField(max_digits=10, decimal_places=6)       #  333.666666
    image = models.FileField(upload_to="assets")
    timestamp = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    is_completed = models.BooleanField(default=False)

    def __str__(self) -> str:
        return str(self.id) +'. '+ self.user.__str__() +' '+ self.get_alert_type_display()
    def save(self, *args, **kwargs) -> None:
        self.timestamp = timezone.now()
        return super().save(*args, **kwargs)

class RecordedData(models.Model):
    id = models.AutoField(primary_key=True)
    item_id = models.IntegerField()
    item_type = models.CharField()
    vehicle_registration = models.CharField(max_length=20, null=True)
    user_id = models.IntegerField(null=True)
    alert_type = models.CharField(max_length=20, null=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=6)       #  333.666666
    longitude = models.DecimalField(max_digits=10, decimal_places=6)       #  333.666666
    timestamp = models.DateTimeField()

    def __str__(self) -> str:
        return self.vehicle_registration
    def __init__(self, item, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        if isinstance(item, VehicleLocation):
            self.item_id = item.id
            self.item_type = "Vehicle"
            self.vehicle_registration = item.vehicle_registration
            self.latitude = item.latitude
            self.longitude = item.longitude
            self.timestamp = item.timestamp
        elif isinstance(item, Alerts):
            self.item_type = "Alert"
            self.item_id = item.id
            self.user_id = item.user.id
            self.alert_type = item.get_alert_type_display()
            self.latitude = item.latitude
            self.longitude = item.longitude
            self.timestamp = item.timestamp
            pass
        else:
            raise TypeError()


class VehicleAssignment(models.Model):
    vehicle = models.ForeignKey(VehicleLocation, on_delete=models.CASCADE)
    alert = models.ForeignKey(Alerts, on_delete=models.CASCADE)
    assigned_at = models.DateTimeField(auto_now_add=True)
    sequence_number = models.IntegerField()  # Order in the route
    is_completed = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['vehicle', 'sequence_number']

class RouteOptimization(models.Model):
    last_optimized = models.DateTimeField(auto_now=True)
    is_optimizing = models.BooleanField(default=False)
    
    class Meta:
        # Only one record should exist
        managed = True
        
    @classmethod
    def get_instance(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
