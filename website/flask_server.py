from flask import Flask, request, jsonify
from flask_cors import CORS # Import CORS
import mysql.connector

app = Flask(__name__)
CORS(app) # Remove this in debug

# db configuration
db_config = {
    "host": "localhost",
    "user": "dante",
    "password": "J1982c1984j1992!",
    "database": "bases",
}

# connect to the database
@app.route('/search')
def search():
    """ searches for bases in db. """
    query = request.args.get('q', '')  # get search query from URL params

    try:
        mydb = mysql.connector.connect(**db_config)
        cursor = mydb.cursor(dictionary=True)   # dict=true gets the results

        # parameterized query to prevent SQL injection
        sql = "SELECT base_name FROM air_force_bases WHERE base_name LIKE %s LIMIT 10"
        cursor.execute(sql, (f"%{query}%",))  # wildcards for partial matches
        results = cursor.fetchall()

        return jsonify(results)  # return results as JSON

    except mysql.connector.Error as err:
        print(f"Database error: {err}")
        return jsonify([])  # return empty list if error
    
    finally:
        if mydb.is_connected():
            cursor.close()
            mydb.close()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')   # run the app in debug mode
