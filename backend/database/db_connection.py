import mysql.connector
from config import Config
import sqlite3

def get_db_connection():
    """Obtener conexión a la base de datos"""
    try:
        conn = sqlite3.connect("database.db")
        conn.row_factory = sqlite3.Row
        return conn
    except mysql.connector.Error as err:
        print(f"Error de conexión: {err}")
        return None

def get_db_connection_without_db():
    """Obtener conexión sin especificar base de datos"""
    try:
        connection = mysql.connector.connect(
            host=Config.MYSQL_HOST,
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            port=Config.MYSQL_PORT
        )
        return connection
    except mysql.connector.Error as err:
        print(f"Error de conexión: {err}")
        return None