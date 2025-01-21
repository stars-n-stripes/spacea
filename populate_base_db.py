import json
import mysql.connector
from opencage.geocoder import OpenCageGeocode

db_config = {
    "host" : "localhost",
    "user" : "dante",
    "password" : "J1982c1984j1992!",
    "database" : "bases",
    "autocommit" : True
}

geolocator = OpenCageGeocode("e444b54706824ee0b652d2c061cada79")
geocode = geolocator.geocode

def load_bases_from_file(filepath):
    """Loads bases from a JSON file, handling potential errors."""
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
    
def get_coordinates(name, country):
    """Fetches coordinates using OpenCage Geocoding API."""
    try:
        location = geocode(f"{name}, {country}", timeout=10)
        if location:
            # print(f"Location found {location}")
            return location[0]['geometry']['lat'], location[0]['geometry']['lng']
    except Exception as e:
        print(f"Geocoding error for {name}: {e}")
    return None, None

def get_state_territory(base_name, country):
    """Fetches the state or territory of the base."""
    try:
        location = geocode(f"{base_name}, {country}", timeout=10)
        if location:
            components = location[0]['components']
            state = components.get('state')
            territory = components.get('territory')
            return state or territory
    except Exception as e:
        print(f"Geocoding error for {base_name}: {e}")
    return None

def get_country(base_name, country):
    """Fetches the country of the base."""
    try:
        location = geocode(f"{base_name}, {country}", timeout=10)
        if location:
            return location[0]['components']['country']
    except Exception as e:
        print(f"Geocoding error for {base_name}: {e}")
    return None

def insert_bases_into_db(bases):
    """Inserts the list of bases into the database."""
    try:
        mydb = mysql.connector.connect(**db_config)
        cursor = mydb.cursor()

        sql = """
        INSERT INTO air_force_bases
        (base_name, country, state_territory, majcom, externalUrl, joint_base, air_national_guard, reserve, latitude, longitude)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
    
        for base in bases:
            print(f"Inserting {base['name']}, {base['state']}, {base['country']} into the database.")
            latitude, longitude = get_coordinates(base["name"], base["country"])
            state = get_state_territory(base["name"], base["country"])
            country = get_country(base["name"], base["country"])

            values = (
                base.get("name"),
                country,
                state,
                base.get("majcom"),
                base.get("externalUrl"),
                base.get("joint_base", False),          # default false if not present
                base.get("national_guard", False),      # default false if not present
                base.get("reserve", False),             # default false if not present
                latitude,
                longitude
            )
            if not latitude or not longitude or not country:
                print(f"Skipping {base['name']}, {base['state']}, {base['country']}.")
                continue
            else:
                cursor.execute(sql, values)

        mydb.commit()
        print(f"Inserted {len(bases)} bases into the database.")
    except mysql.connector.Error as err:
        print(f"Database error: {err}")
    finally:
        if mydb.is_connected():
            cursor.close()
            mydb.close()
            print("Database connection closed.")
# main
if __name__ == "__main__":
    bases = load_bases_from_file("all_bases.json")
    print(f"Type of bases: {type(bases)}")      # debug: check the type of bases
    print(f"Lenght of bases: {len(bases)}")     # debug: check the length of bases
    print(f"Bases: {bases}")                    # debug: check the content of bases
    if bases:
        insert_bases_into_db(bases)
    else:
        print("No bases to insert.")