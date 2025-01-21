import mysql.connector
import json
from opencage.geocoder import OpenCageGeocode

# database connection

def load_bases_from_file(filepath):
    """Loads a list of bases from a JSON string.
    Args:
        filepath: The path to the JSON file.
    
    Returns:
        A list of bases.
    """
    try:
        with open(filepath, 'r') as file:
            bases = json.load(file)
            return bases
    except FileNotFoundError:
        print(f"File not found: {filepath}")
        return None
    except json.JSONDecodeError:
        print(f"File is not a valid JSON file: {filepath}")
        return None



mydb = mysql.connector.connect(
    host="localhost",
    user="dante",
    password="J1982c1984j1992!",
    database="bases"
)

cursor = mydb.cursor()

# geolocator = OpenCageGeocode(api_key="e444b54706824ee0b652d2c061cada79")
geocoder = OpenCageGeocode("e444b54706824ee0b652d2c061cada79")


# bases = [
#     ('Maxwell AFB', 'Alabama', 'United States', False, False),
# ]

bases = load_bases_from_file('bases.json')

sql = "INSERT INTO air_force_bases (base_name, state_territory, country, latitude, longitude, joint_base, air_national_guard) VALUES (%s, %s, %s, %s, %s, %s, %s)"

for base in bases:
    location = geocoder.geocode(f"{base[0]}, {base[1]}, {base[2]}")
    if location:
        latitude = location[0]['geometry']['lat']
        longitude = location[0]['geometry']['lng']
    else:
        latitude = None
        longitude = None
    
    cursor.execute(sql, (base[0], base[1], base[2], latitude, longitude, 0, 0))

# for base in bases:
#     location = geocoder.geocode(f"{base[0]}, {base[1]}, {base[2]}")
#     if location:
#         latitude = location[0]['geometry']['lat']
#         longitude = location[0]['geometry']['lng']
#     else:
#         latitude = None
#         longitude = None
    
#     cursor.execute(sql, (base[0], base[1], base[2], latitude, longitude, 0, 0))

mydb.commit()
cursor.close()
mydb.close()