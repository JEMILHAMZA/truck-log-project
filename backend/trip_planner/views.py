# trip_planner/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .services import TripSimulator

class PlanTripView(APIView):
    def post(self, request, *args, **kwargs):
        data = request.data
        start_location = data.get('start_location')
        pickup_location = data.get('pickup_location')
        dropoff_location = data.get('dropoff_location')
        cycle_used = data.get('cycle_used')

        if not all([start_location, pickup_location, dropoff_location, cycle_used is not None]):
            return Response({"error": "Missing required fields"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            cycle_used_hours = float(cycle_used)
        except ValueError:
            return Response({"error": "Invalid cycle used value"}, status=status.HTTP_400_BAD_REQUEST)

        simulator = TripSimulator(
            start_location=start_location,
            pickup_location=pickup_location,
            dropoff_location=dropoff_location,
            cycle_used_hours=cycle_used_hours
        )
        
        result = simulator.run_simulation()

        if "error" in result:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

        return Response(result, status=status.HTTP_200_OK)
