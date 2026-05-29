from django.test import TestCase
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
from .models import Vehicle, Driver, TransportationRoute, RouteStop, Trip, VehicleTrackingPoint, MaintenancePlan, MaintenanceOrder, FuelLog


class VehicleModelTest(TestCase):
    def setUp(self):
        self.vehicle_data = {
            'name': 'Test Vehicle',
            'license_plate': 'ABC-1234',
            'vehicle_type': Vehicle.VehicleType.TRUCK,
            'status': Vehicle.Status.ACTIVE,
            'brand': 'TestBrand',
            'model': 'TestModel',
            'year': 2020,
            'color': 'Blue',
            'vin': '1HGCM82633A004352',
            'fuel_type': Vehicle.FuelType.DIESEL,
            'capacity_value': Decimal('10000.000'),
            'capacity_unit': Vehicle.CapacityUnit.KG,
            'current_odometer_km': Decimal('5000.000'),
        }

    def test_vehicle_creation(self):
        vehicle = Vehicle.objects.create(**self.vehicle_data)
        self.assertEqual(vehicle.name, 'Test Vehicle')
        self.assertEqual(vehicle.license_plate, 'ABC-1234')
        self.assertEqual(str(vehicle), 'ABC-1234 - Test Vehicle')

    def test_vehicle_latitude_validation(self):
        vehicle_data = self.vehicle_data.copy()
        vehicle_data['last_latitude'] = Decimal('91.000000')  # Invalid
        vehicle = Vehicle(**vehicle_data)
        with self.assertRaises(ValidationError) as context:
            vehicle.clean()
        self.assertIn('last_latitude', context.exception.message_dict)

    def test_vehicle_longitude_validation(self):
        vehicle_data = self.vehicle_data.copy()
        vehicle_data['last_longitude'] = Decimal('-181.000000')  # Invalid
        vehicle = Vehicle(**vehicle_data)
        with self.assertRaises(ValidationError) as context:
            vehicle.clean()
        self.assertIn('last_longitude', context.exception.message_dict)

    def test_odometer_update_from_tracking_point(self):
        vehicle = Vehicle.objects.create(**self.vehicle_data)
        tracking_point = VehicleTrackingPoint.objects.create(
            vehicle=vehicle,
            latitude=Decimal('-25.969248'),
            longitude=Decimal('32.573166'),
            odometer_km=Decimal('6000.000'),
            source=VehicleTrackingPoint.Source.GPS
        )
        vehicle.refresh_from_db()
        self.assertEqual(vehicle.current_odometer_km, Decimal('6000.000'))


class DriverModelTest(TestCase):
    def setUp(self):
        self.driver_data = {
            'name': 'Test Driver',
            'license_number': '123456789',
            'license_category': 'C',
            'license_expiry': timezone.localdate() + timezone.timedelta(days=365),
            'status': Driver.Status.ACTIVE,
            'availability': Driver.Availability.AVAILABLE,
            'phone': '+258 82 000 0000',
            'email': 'driver@test.com',
        }

    def test_driver_creation(self):
        driver = Driver.objects.create(**self.driver_data)
        self.assertEqual(driver.name, 'Test Driver')
        self.assertEqual(driver.license_number, '123456789')
        self.assertEqual(str(driver), 'Test Driver')

    def test_driver_license_expiry_validation(self):
        driver_data = self.driver_data.copy()
        driver_data['license_expiry'] = timezone.localdate() - timezone.timedelta(days=1)  # Expired
        driver_data['status'] = Driver.Status.ACTIVE
        driver = Driver(**driver_data)
        with self.assertRaises(ValidationError) as context:
            driver.clean()
        self.assertIn('license_expiry', context.exception.message_dict)


class TripModelTest(TestCase):
    def setUp(self):
        self.vehicle = Vehicle.objects.create(
            name='Test Vehicle',
            license_plate='ABC-1234',
            vehicle_type=Vehicle.VehicleType.TRUCK,
            status=Vehicle.Status.ACTIVE,
            current_odometer_km=Decimal('10000.000'),
        )
        self.driver = Driver.objects.create(
            name='Test Driver',
            license_number='123456789',
            license_category='C',
            license_expiry=timezone.localdate() + timezone.timedelta(days=365),
            status=Driver.Status.ACTIVE,
            availability=Driver.Availability.AVAILABLE,
        )
        self.trip_data = {
            'vehicle': self.vehicle,
            'driver': self.driver,
            'start_location': 'Maputo',
            'end_location': 'Matola',
            'scheduled_start': timezone.now(),
            'scheduled_end': timezone.now() + timezone.timedelta(hours=2),
            'purpose': Trip.Purpose.DELIVERY,
            'odometer_start_km': Decimal('10000.000'),
            'odometer_end_km': Decimal('10050.000'),
        }

    def test_trip_creation(self):
        trip = Trip.objects.create(**self.trip_data)
        self.assertEqual(trip.vehicle, self.vehicle)
        self.assertEqual(trip.driver, self.driver)
        self.assertEqual(trip.purpose, Trip.Purpose.DELIVERY)
        self.assertEqual(trip.distance_km, Decimal('50.000'))

    def test_trip_odometer_validation(self):
        trip_data = self.trip_data.copy()
        trip_data['odometer_end_km'] = Decimal('9950.000')  # Less than start
        trip = Trip(**trip_data)
        with self.assertRaises(ValidationError) as context:
            trip.clean()
        self.assertIn('odometer_end_km', context.exception.message_dict)

    def test_trip_scheduled_time_validation(self):
        trip_data = self.trip_data.copy()
        trip_data['scheduled_end'] = timezone.now() - timezone.timedelta(hours=1)  # Before start
        trip = Trip(**trip_data)
        with self.assertRaises(ValidationError) as context:
            trip.clean()
        self.assertIn('scheduled_end', context.exception.message_dict)


class FuelLogModelTest(TestCase):
    def setUp(self):
        self.vehicle = Vehicle.objects.create(
            name='Test Vehicle',
            license_plate='ABC-1234',
            vehicle_type=Vehicle.VehicleType.TRUCK,
            status=Vehicle.Status.ACTIVE,
            current_odometer_km=Decimal('10000.000'),
        )
        self.driver = Driver.objects.create(
            name='Test Driver',
            license_number='123456789',
            license_category='C',
            license_expiry=timezone.localdate() + timezone.timedelta(days=365),
            status=Driver.Status.ACTIVE,
            availability=Driver.Availability.AVAILABLE,
        )
        self.fuellog_data = {
            'vehicle': self.vehicle,
            'driver': self.driver,
            'fuel_type': Vehicle.FuelType.DIESEL,
            'odometer_km': Decimal('10500.000'),
            'liters': Decimal('50.000'),
            'unit_price': Decimal('65.00'),
            'station': 'Test Station',
        }

    def test_fuel_log_creation(self):
        fuellog = FuelLog.objects.create(**self.fuellog_data)
        self.assertEqual(fuellog.vehicle, self.vehicle)
        self.assertEqual(fuellog.driver, self.driver)
        self.assertEqual(fuellog.total_cost, Decimal('3250.00'))  # 50 * 65
        self.assertEqual(str(fuellog), f'Abastecimento {fuellog.pk}')

    def test_total_cost_calculation(self):
        fuellog = FuelLog(**self.fuellog_data)
        fuellog.save()  # This should calculate total_cost
        self.assertEqual(fuellog.total_cost, Decimal('3250.00'))
        # Verify odometer was updated on vehicle
        self.vehicle.refresh_from_db()
        self.assertEqual(self.vehicle.current_odometer_km, Decimal('10500.000'))