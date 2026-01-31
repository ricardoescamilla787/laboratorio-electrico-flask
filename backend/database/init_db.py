import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import Config
from database.db_connection import get_db_connection, get_db_connection_without_db

def init_database():
    """Inicializar la base de datos y tablas"""
    try:
        conn = get_db_connection_without_db()
        if conn is None:
            print(" No se pudo conectar al servidor MySQL")
            return False
            
        cursor = conn.cursor()
        
        # Crear base de datos si no existe
        print(" Creando base de datos...")
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {Config.MYSQL_DB}")
        cursor.execute(f"USE {Config.MYSQL_DB}")
        
        # Crear tablas
        print(" Creando tablas...")
        create_tables(cursor)
        
        print(" Insertando datos de ejemplo...")
        insert_sample_data(cursor)
        
        conn.commit()
        print(" Base de datos inicializada correctamente")
        return True
        
    except Exception as e:
        print(f" Error al inicializar la base de datos: {e}")
        return False
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

def create_tables(cursor):
    """Crear todas las tablas necesarias"""
    
    tables_sql = [
        # Usuarios
        """
        CREATE TABLE IF NOT EXISTS usuarios (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            tipo ENUM('administrador', 'estudiante') NOT NULL,
            no_control VARCHAR(20),
            password_hash VARCHAR(255) NOT NULL,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """,
        # Carreras
        """
        CREATE TABLE IF NOT EXISTS carreras (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL UNIQUE,
            abreviatura VARCHAR(10),
            activa BOOLEAN DEFAULT TRUE,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """,
        # Asignaturas
        """
        CREATE TABLE IF NOT EXISTS asignaturas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL UNIQUE,
            clave VARCHAR(20),
            carrera_id INT NOT NULL UNIQUE,
            activa BOOLEAN DEFAULT TRUE,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (carrera_id) REFERENCES carreras(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """,
        # Docentes
        """
        CREATE TABLE IF NOT EXISTS docentes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE,
            carrera_id INT NOT NULL,
            activo BOOLEAN DEFAULT TRUE,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (carrera_id) REFERENCES carreras(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """,
        # Prácticas
        """
        CREATE TABLE IF NOT EXISTS practicas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            numero INT NOT NULL,
            nombre VARCHAR(200) NOT NULL,
            descripcion TEXT,
            asignatura_id INT NOT NULL,
            activa BOOLEAN DEFAULT TRUE,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (asignatura_id) REFERENCES asignaturas(id) ON DELETE CASCADE,
            UNIQUE KEY unique_practica_asignatura (numero, asignatura_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """,
        # Materiales
        """
        CREATE TABLE IF NOT EXISTS materiales (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL UNIQUE,
            descripcion TEXT,
            cantidad_disponible INT NOT NULL DEFAULT 0,
            categoria VARCHAR(50),
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """,
        # Práctica-Materiales
        """
        CREATE TABLE IF NOT EXISTS practica_materiales (
            id INT AUTO_INCREMENT PRIMARY KEY,
            practica_id INT NOT NULL,
            material_id INT NOT NULL,
            cantidad_requerida INT NOT NULL DEFAULT 1,
            FOREIGN KEY (practica_id) REFERENCES practicas(id) ON DELETE CASCADE,
            FOREIGN KEY (material_id) REFERENCES materiales(id) ON DELETE CASCADE,
            UNIQUE KEY unique_practica_material (practica_id, material_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """,
        # prestamos:
        """
        CREATE TABLE IF NOT EXISTS prestamos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            fecha_hora DATETIME NOT NULL,
            carrera_id INT NOT NULL,
            asignatura_id INT NOT NULL,
            docente_id INT NOT NULL,
            practica_id INT NOT NULL,
            lugar_uso VARCHAR(200) NOT NULL,
            observaciones TEXT,
            importancia_observacion ENUM('normal', 'urgente') DEFAULT 'normal',
            estado ENUM('activo', 'devuelto') DEFAULT 'activo',
            usuario_id INT NOT NULL,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            activo BOOLEAN DEFAULT TRUE,
            FOREIGN KEY (carrera_id) REFERENCES carreras(id),
            FOREIGN KEY (asignatura_id) REFERENCES asignaturas(id),
            FOREIGN KEY (docente_id) REFERENCES docentes(id),
            FOREIGN KEY (practica_id) REFERENCES practicas(id),
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """,
        # Detalles préstamo
        """
        CREATE TABLE IF NOT EXISTS detalles_prestamo (
            id INT AUTO_INCREMENT PRIMARY KEY,
            prestamo_id INT NOT NULL,
            material_id INT NOT NULL,
            cantidad INT NOT NULL CHECK (cantidad > 0),
            FOREIGN KEY (prestamo_id) REFERENCES prestamos(id) ON DELETE CASCADE,
            FOREIGN KEY (material_id) REFERENCES materiales(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """,
        # Integrantes
        """
        CREATE TABLE IF NOT EXISTS integrantes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            prestamo_id INT NOT NULL,
            nombre VARCHAR(100) NOT NULL,
            no_control VARCHAR(20),
            firma_data LONGTEXT,  -- Cambiar firma_path por firma_data para almacenar SVG
            FOREIGN KEY (prestamo_id) REFERENCES prestamos(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
    ]
    
    for i, sql in enumerate(tables_sql, 1):
        try:
            cursor.execute(sql)
            print(f"   Tabla {i} creada/existe")
        except Exception as e:
            print(f"   Error creando tabla {i}: {e}")

# Inserts para pruebas
def insert_sample_data(cursor):
    """Insertar datos de ejemplo"""
    
    # Usuarios
    usuarios_sql = """
    INSERT IGNORE INTO usuarios (nombre, email, tipo, password_hash) VALUES
    (%s, %s, %s, %s)
    """
    
    usuarios = [
        ('Administrador', 'admin@itpachuca.edu.mx', 'administrador', 'admin123'),
        ('María García', 'maria.garcia@itpachuca.edu.mx', 'estudiante', 'estudiante123')
    ]

    cursor.executemany(usuarios_sql, usuarios) 

    # Carreras 
    carreras_sql = """
    INSERT IGNORE INTO carreras (nombre, abreviatura) VALUES
    (%s, %s)
    """
    
    carreras = [
        ('Ingeniería Eléctrica', 'IE'),
        ('Ingeniería en Sistemas Computacionales', 'ISC'),
        ('Ingeniería Industrial', 'II'),
        ('Ingeniería Mecánica', 'IM')
    ]

    cursor.executemany(carreras_sql, carreras) 
 
    # Materiales
    materiales_sql = """
    INSERT IGNORE INTO materiales (nombre, descripcion, cantidad_disponible, categoria) VALUES
    (%s, %s, %s, %s)
    """
    
    materiales = [
        ('Multímetro Digital', 'Medición de voltaje, corriente y resistencia', 10, 'Instrumentos'),
        ('Osciloscopio', 'Visualización de señales eléctricas', 5, 'Instrumentos'),
        ('Fuente de Alimentación', 'Fuente DC variable 0-30V', 8, 'Equipos'),
        ('Generador de Funciones', 'Generador de señales de prueba', 6, 'Equipos'),
        ('Protoboard', 'Placa de pruebas para circuitos', 50, 'Componentes'),
        ('Resistores 1KΩ', 'Paquete de 100 resistores de 1KΩ', 1000, 'Componentes'),
        ('Capacitores 10µF', 'Paquete de 50 capacitores electrolíticos', 500, 'Componentes'),
        ('LEDs Rojo', 'Paquete de 100 LEDs rojos', 800, 'Componentes'),
        ('Cables de Conexión', 'Juego de cables jumper', 30, 'Accesorios'),
        ('Pinzas', 'Pinzas para electrónica', 15, 'Herramientas')
    ]

    cursor.executemany(materiales_sql, materiales) 

    # Docentes
    docentes_sql = """
    INSERT IGNORE INTO docentes (nombre, email, carrera_id) VALUES
    (%s, %s, %s)
    """
    
    cursor.execute("SELECT id FROM carreras WHERE nombre LIKE '%Eléctrica%'")
    carrera_electrica = cursor.fetchone()
    cursor.execute("SELECT id FROM carreras WHERE nombre LIKE '%Sistemas%'")
    carrera_sistemas = cursor.fetchone()
    cursor.execute("SELECT id FROM carreras WHERE nombre LIKE '%Industrial%'")
    carrera_industrial = cursor.fetchone()
    cursor.execute("SELECT id FROM carreras WHERE nombre LIKE '%Mecánica%'")
    carrera_mecanica = cursor.fetchone()

    if (carrera_electrica and carrera_industrial and carrera_mecanica):
        docentes = [
            ('Juan Pérez González', 'juan.perez@...', carrera_electrica[0]),
            ('Roberto Martínez Mendoza', 'roberto.martinez@...', carrera_electrica[0]),
            ('Ana López Mendieta', 'ana.lopez@...', carrera_industrial[0]),
            ('Carlos Sánchez Pérez', 'carlos.sanchez@...', carrera_mecanica[0])
        ]
    
    cursor.executemany(docentes_sql, docentes)

    # Asignaturas
    asignaturas_sql = """
    INSERT IGNORE INTO asignaturas (nombre, clave, carrera_id) VALUES
    (%s, %s, %s)
    """
    
    if (carrera_electrica and carrera_industrial and carrera_mecanica):
        asignaturas = [
            ('Circuitos Eléctricos I', 'CE1', carrera_electrica[0]),
            ('Programación de Microcontroladores', 'PM', carrera_sistemas[0]),
            ('Circuitos Eléctricos I', 'CE1', carrera_industrial[0]),
            ('Mecanica de suelos', 'MS', carrera_mecanica[0])
        ]

    cursor.executemany(asignaturas_sql, asignaturas) 
    
if __name__ == '__main__':
    init_database()