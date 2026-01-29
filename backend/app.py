from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
import mysql.connector
from mysql.connector import Error
from datetime import datetime
import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

try:
    from config import Config
    from database.init_db import init_database
    from database.db_connection import get_db_connection
except ImportError as e:
    print(f" Error de importación: {e}")
    sys.exit(1)

app = Flask(__name__,
            template_folder=os.path.join(parent_dir, 'frontend', 'templates'),
            static_folder=os.path.join(parent_dir, 'frontend', 'static'))

app.config['SECRET_KEY'] = Config.SECRET_KEY

# FUNCIONES AUXILIARES 
def require_login(f):
    """Requiere sesion activa"""
    def wrapper(*args, **kwargs):
        if 'loggedin' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper

def require_admin(f):
    """Requiere permisos de administrador"""
    def wrapper(*args, **kwargs):
        if 'loggedin' not in session or session['tipo'] != 'administrador':
            flash('No tienes permisos para acceder a esta sección', 'error')
            return redirect(url_for('dashboard'))
        return f(*args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper

def build_filter_query(base_query, filters):
    """Construye consulta SQL"""
    conditions = []
    params = []
    
    fecha_inicio = filters.get('fecha_inicio')
    fecha_fin = filters.get('fecha_fin')
    carrera_id = filters.get('carrera_id')
    estado = filters.get('estado')
    
    if fecha_inicio:
        conditions.append('DATE(p.fecha_hora) >= %s')
        params.append(fecha_inicio)
    if fecha_fin:
        conditions.append('DATE(p.fecha_hora) <= %s')
        params.append(fecha_fin)
    if carrera_id:
        conditions.append('p.carrera_id = %s')
        params.append(carrera_id)
    if estado:
        conditions.append('p.estado = %s')
        params.append(estado)
    
    if conditions:
        base_query += ' AND ' + ' AND '.join(conditions)
    
    return base_query, params

def get_carreras_activas(cursor):
    """Obtiene todas las carreras activas"""
    cursor.execute('SELECT id, nombre FROM carreras WHERE activa = TRUE ORDER BY nombre')
    return cursor.fetchall()

def handle_db_error(e, template=None, default_data=None):
    """Maneja errores de base de datos"""
    flash(f'Error de base de datos: {e}', 'error')
    if template:
        return render_template(template, **(default_data or {}))
    return jsonify({'success': False, 'message': f'Error: {str(e)}'})

# RUTAS PÚBLICAS 
@app.route('/')
def index():
    if 'loggedin' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        tipo_usuario = request.form['tipo_usuario']
        
        conn = get_db_connection()
        if conn is None:
            flash('Error de conexión a la base de datos', 'error')
            return render_template('login.html')
        
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute('SELECT * FROM usuarios WHERE email = %s AND tipo = %s', 
                          (email, tipo_usuario))
            account = cursor.fetchone()
            
            if account and account['password_hash'] == password:
                session.update({
                    'loggedin': True,
                    'id': account['id'],
                    'nombre': account['nombre'],
                    'tipo': account['tipo'],
                    'email': account['email']
                })
                flash('Inicio de sesión exitoso', 'success')
                return redirect(url_for('dashboard'))
            else:
                flash('Credenciales incorrectas o tipo de usuario no coincide', 'error')
                
        except Error as e:
            flash(f'Error de base de datos: {e}', 'error')
        finally:
            if conn.is_connected():
                cursor.close()
                conn.close()
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    flash('Sesión cerrada correctamente', 'info')
    return redirect(url_for('login'))

# RUTAS PROTEGIDAS 
@app.route('/dashboard')
@require_login
def dashboard():
    conn = get_db_connection()
    if conn is None:
        flash('Error de conexión a la base de datos', 'error')
        return render_template('dashboard.html')
    
    try:
        cursor = conn.cursor(dictionary=True)
        
        # Estadísticas
        cursor.execute('SELECT COUNT(*) as total FROM prestamos')
        total_prestamos = cursor.fetchone()['total']
        
        cursor.execute('SELECT COUNT(*) as total FROM materiales WHERE cantidad_disponible > 0')
        materiales_disponibles = cursor.fetchone()['total']
        
        cursor.execute('SELECT COUNT(*) as total FROM prestamos WHERE estado = "activo" AND DATE(fecha_hora) = CURDATE()')
        prestamos_hoy = cursor.fetchone()['total']
        
        # Últimos préstamos
        cursor.execute('''
            SELECT p.*, u.nombre as solicitante, c.nombre as carrera_nombre,
                   a.nombre as asignatura_nombre, d.nombre as docente_nombre
            FROM prestamos p 
            LEFT JOIN usuarios u ON p.usuario_id = u.id 
            LEFT JOIN carreras c ON p.carrera_id = c.id
            LEFT JOIN asignaturas a ON p.asignatura_id = a.id
            LEFT JOIN docentes d ON p.docente_id = d.id
            ORDER BY p.fecha_hora DESC LIMIT 5
        ''')
        ultimos_prestamos = cursor.fetchall()
        
        return render_template('dashboard.html', 
                             total_prestamos=total_prestamos,
                             materiales_disponibles=materiales_disponibles,
                             prestamos_hoy=prestamos_hoy,
                             ultimos_prestamos=ultimos_prestamos)
                             
    except Error as e:
        return handle_db_error(e, 'dashboard.html')
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

# GESTIÓN ACADÉMICA 
@app.route('/gestion-academica')
@require_admin
def gestion_academica():
    return render_template('gestion_academica.html')

# API 
@app.route('/api/materiales')
def obtener_materiales():
    conn = get_db_connection()
    if conn is None:
        return jsonify([])
    
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT * FROM materiales ORDER BY nombre')
        return jsonify(cursor.fetchall())
    except Error as e:
        return jsonify([])
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

@app.route('/api/carreras')
def api_carreras():
    conn = get_db_connection()
    if conn is None:
        return jsonify([])
    
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT * FROM carreras WHERE activa = TRUE ORDER BY nombre')
        return jsonify(cursor.fetchall())
    except Error:
        return jsonify([])
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

@app.route('/api/asignaturas')
def api_asignaturas():
    carrera_id = request.args.get('carrera_id')
    
    conn = get_db_connection()
    if conn is None:
        return jsonify([])
    
    try:
        cursor = conn.cursor(dictionary=True)
        if carrera_id:
            cursor.execute('''
                SELECT a.*, c.nombre as carrera_nombre 
                FROM asignaturas a 
                JOIN carreras c ON a.carrera_id = c.id 
                WHERE a.activa = TRUE AND a.carrera_id = %s 
                ORDER BY a.nombre
            ''', (carrera_id,))
        else:
            cursor.execute('''
                SELECT a.*, c.nombre as carrera_nombre 
                FROM asignaturas a 
                JOIN carreras c ON a.carrera_id = c.id 
                WHERE a.activa = TRUE 
                ORDER BY c.nombre, a.nombre
            ''')
        return jsonify(cursor.fetchall())
    except Error:
        return jsonify([])
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

@app.route('/api/docentes')
def api_docentes():
    carrera_id = request.args.get('carrera_id')
    
    conn = get_db_connection()
    if conn is None:
        return jsonify([])
    
    try:
        cursor = conn.cursor(dictionary=True)
        if carrera_id:
            cursor.execute('''
                SELECT d.*, c.nombre as carrera_nombre 
                FROM docentes d 
                JOIN carreras c ON d.carrera_id = c.id 
                WHERE d.activo = TRUE AND d.carrera_id = %s 
                ORDER BY d.nombre
            ''', (carrera_id,))
        else:
            cursor.execute('''
                SELECT d.*, c.nombre as carrera_nombre 
                FROM docentes d 
                JOIN carreras c ON d.carrera_id = c.id 
                WHERE d.activo = TRUE 
                ORDER BY c.nombre, d.nombre
            ''')
        return jsonify(cursor.fetchall())
    except Error:
        return jsonify([])
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

@app.route('/api/practicas')
def api_practicas():
    asignatura_id = request.args.get('asignatura_id')
    
    conn = get_db_connection()
    if conn is None:
        return jsonify([])
    
    try:
        cursor = conn.cursor(dictionary=True)
        if asignatura_id:
            cursor.execute('''
                SELECT p.*, a.nombre as asignatura_nombre, c.nombre as carrera_nombre
                FROM practicas p 
                JOIN asignaturas a ON p.asignatura_id = a.id 
                JOIN carreras c ON a.carrera_id = c.id
                WHERE p.activa = TRUE AND p.asignatura_id = %s 
                ORDER BY p.numero
            ''', (asignatura_id,))
        else:
            cursor.execute('''
                SELECT p.*, a.nombre as asignatura_nombre, c.nombre as carrera_nombre
                FROM practicas p 
                JOIN asignaturas a ON p.asignatura_id = a.id 
                JOIN carreras c ON a.carrera_id = c.id
                WHERE p.activa = TRUE 
                ORDER BY c.nombre, a.nombre, p.numero
            ''')
        return jsonify(cursor.fetchall())
    except Error:
        return jsonify([])
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

@app.route('/api/practica/<int:practica_id>/materiales')
def api_practica_materiales(practica_id):
    conn = get_db_connection()
    if conn is None:
        return jsonify([])
    
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('''
            SELECT m.*, pm.cantidad_requerida
            FROM practica_materiales pm
            JOIN materiales m ON pm.material_id = m.id
            WHERE pm.practica_id = %s AND m.cantidad_disponible > 0
            ORDER BY m.nombre
        ''', (practica_id,))
        return jsonify(cursor.fetchall())
    except Error:
        return jsonify([])
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

# FORMULARIO DE NUEVO PRÉSTAMO
@app.route('/nuevo-prestamo', methods=['GET', 'POST'])
@require_login
def nuevo_prestamo():
    if request.method == 'POST':
        try:
            data = request.get_json()
            
            conn = get_db_connection()
            if conn is None:
                return jsonify({'success': False, 'message': 'Error de conexión a la base de datos'})
            
            cursor = conn.cursor()
            
            # Insertar préstamo principal
            cursor.execute('''
                INSERT INTO prestamos (fecha_hora, carrera_id, asignatura_id, docente_id, 
                                     practica_id, lugar_uso, observaciones, importancia_observacion, usuario_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (data['fecha_hora'], data['carrera_id'], data['asignatura_id'], 
                  data['docente_id'], data['practica_id'], data['lugar_uso'], 
                  data['observaciones'], data['importancia_observacion'], session['id']))
            
            prestamo_id = cursor.lastrowid
            
            # Procesar materiales
            for material in data['materiales']:
                cursor.execute('''
                    INSERT INTO detalles_prestamo (prestamo_id, material_id, cantidad)
                    VALUES (%s, %s, %s)
                ''', (prestamo_id, material['material_id'], material['cantidad']))
                
                # Actualizar stock
                cursor.execute('''
                    UPDATE materiales 
                    SET cantidad_disponible = cantidad_disponible - %s 
                    WHERE id = %s
                ''', (material['cantidad'], material['material_id']))
            
            # Procesar integrantes con firmas
            for integrante in data['integrantes']:
                cursor.execute('''
                    INSERT INTO integrantes (prestamo_id, nombre, no_control, firma_data)
                    VALUES (%s, %s, %s, %s)
                ''', (prestamo_id, integrante['nombre'], integrante['no_control'], 
                      integrante.get('firma_data', '')))
            
            conn.commit()
            
            return jsonify({'success': True, 'prestamo_id': prestamo_id, 
                           'message': 'Préstamo registrado exitosamente'})
            
        except Exception as e:
            if 'conn' in locals() and conn.is_connected():
                conn.rollback()
            return jsonify({'success': False, 'message': f'Error al registrar préstamo: {str(e)}'})
        finally:
            if 'conn' in locals() and conn.is_connected():
                cursor.close()
                conn.close()
    
    # GET: Cargar datos para el formulario
    conn = get_db_connection()
    if conn is None:
        flash('Error de conexión a la base de datos', 'error')
        return render_template('nuevo_prestamo.html')
    
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT id, nombre FROM carreras WHERE activa = TRUE ORDER BY nombre')
        carreras = cursor.fetchall()
        
        cursor.execute('SELECT * FROM materiales WHERE cantidad_disponible > 0 ORDER BY nombre')
        materiales = cursor.fetchall()
        
        return render_template('nuevo_prestamo.html', 
                             carreras=carreras,
                             materiales=materiales)
                             
    except Error as e:
        flash(f'Error cargando datos del formulario: {e}', 'error')
        return render_template('nuevo_prestamo.html')
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

# CRUD OPERACIONES
def handle_crud_operation(tipo, id=None, data=None, action='create'):
    """Maneja operaciones CRUD genericas"""
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'success': False, 'message': 'Error de conexión'})
        
        cursor = conn.cursor()
        
        if action == 'create':
            if tipo == 'carrera':
                cursor.execute('INSERT INTO carreras (nombre, abreviatura) VALUES (%s, %s)', 
                              (data.get('nombre'), data.get('abreviatura')))
            elif tipo == 'asignatura':
                cursor.execute('INSERT INTO asignaturas (nombre, clave, carrera_id) VALUES (%s, %s, %s)', 
                              (data.get('nombre'), data.get('clave'), data.get('carrera_id')))
            elif tipo == 'docente':
                cursor.execute('INSERT INTO docentes (nombre, email, carrera_id) VALUES (%s, %s, %s)', 
                              (data.get('nombre'), data.get('email'), data.get('carrera_id')))
            elif tipo == 'practica':
                cursor.execute('''
                    INSERT INTO practicas (numero, nombre, descripcion, asignatura_id) 
                    VALUES (%s, %s, %s, %s)
                ''', (data.get('numero'), data.get('nombre'), data.get('descripcion'), 
                      data.get('asignatura_id')))
                
                practica_id = cursor.lastrowid
                for material in data.get('materiales', []):
                    cursor.execute('''
                        INSERT INTO practica_materiales (practica_id, material_id, cantidad_requerida)
                        VALUES (%s, %s, %s)
                    ''', (practica_id, material['material_id'], material['cantidad_requerida']))
            elif tipo == 'material':
                cursor.execute('''
                    INSERT INTO materiales (nombre, descripcion, cantidad_disponible, categoria) 
                    VALUES (%s, %s, %s, %s)
                ''', (data.get('nombre'), data.get('descripcion'), 
                      data.get('cantidad', 0), data.get('categoria')))
        
        elif action == 'update':
            if tipo == 'carrera':
                cursor.execute('UPDATE carreras SET nombre = %s, abreviatura = %s WHERE id = %s',
                              (data.get('nombre'), data.get('abreviatura'), id))
            elif tipo == 'asignatura':
                cursor.execute('''
                    UPDATE asignaturas 
                    SET nombre = %s, clave = %s, carrera_id = %s 
                    WHERE id = %s
                ''', (data.get('nombre'), data.get('clave'), data.get('carrera_id'), id))
            elif tipo == 'docente':
                cursor.execute('''
                    UPDATE docentes 
                    SET nombre = %s, email = %s, carrera_id = %s 
                    WHERE id = %s
                ''', (data.get('nombre'), data.get('email'), data.get('carrera_id'), id))
            elif tipo == 'practica':
                cursor.execute('''
                    UPDATE practicas 
                    SET numero = %s, nombre = %s, descripcion = %s, asignatura_id = %s 
                    WHERE id = %s
                ''', (data.get('numero'), data.get('nombre'), data.get('descripcion'), 
                      data.get('asignatura_id'), id))
                
                if 'materiales' in data:
                    cursor.execute('DELETE FROM practica_materiales WHERE practica_id = %s', (id,))
                    for material in data['materiales']:
                        cursor.execute('''
                            INSERT INTO practica_materiales (practica_id, material_id, cantidad_requerida)
                            VALUES (%s, %s, %s)
                        ''', (id, material['material_id'], material['cantidad_requerida']))
            elif tipo == 'material':
                cursor.execute('''
                    UPDATE materiales 
                    SET nombre = %s, descripcion = %s, categoria = %s, cantidad_disponible = %s
                    WHERE id = %s
                ''', (data.get('nombre'), data.get('descripcion'), data.get('categoria'),
                      data.get('cantidad_disponible'), id))
        
        elif action == 'deactivate':
            if tipo == 'carrera':
                cursor.execute('UPDATE carreras SET activa = FALSE WHERE id = %s', (id,))
            elif tipo == 'asignatura':
                cursor.execute('UPDATE asignaturas SET activa = FALSE WHERE id = %s', (id,))
            elif tipo == 'docente':
                cursor.execute('UPDATE docentes SET activo = FALSE WHERE id = %s', (id,))
            elif tipo == 'practica':
                cursor.execute('UPDATE practicas SET activa = FALSE WHERE id = %s', (id,))
            elif tipo == 'material':
                cursor.execute('UPDATE materiales SET cantidad_disponible = 0 WHERE id = %s', (id,))
        
        elif action == 'activate':
            if tipo == 'carrera':
                cursor.execute('UPDATE carreras SET activa = TRUE WHERE id = %s', (id,))
            elif tipo == 'asignatura':
                cursor.execute('UPDATE asignaturas SET activa = TRUE WHERE id = %s', (id,))
            elif tipo == 'docente':
                cursor.execute('UPDATE docentes SET activo = TRUE WHERE id = %s', (id,))
            elif tipo == 'practica':
                cursor.execute('UPDATE practicas SET activa = TRUE WHERE id = %s', (id,))
            elif tipo == 'material':
                cursor.execute('UPDATE materiales SET cantidad_disponible = 1 WHERE id = %s', (id,))
        
        conn.commit()
        return jsonify({'success': True, 'message': f'Operación realizada correctamente'})
        
    except Exception as e:
        if 'conn' in locals() and conn.is_connected():
            conn.rollback()
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

# Rutas CRUD
@app.route('/admin/agregar-<tipo>', methods=['POST'])
@require_admin
def admin_agregar(tipo):
    data = request.get_json()
    return handle_crud_operation(tipo, data=data, action='create')

@app.route('/admin/actualizar/<tipo>/<int:id>', methods=['PUT'])
@require_admin
def admin_actualizar(tipo, id):
    data = request.get_json()
    return handle_crud_operation(tipo, id=id, data=data, action='update')

@app.route('/admin/desactivar/<tipo>/<int:id>', methods=['PUT'])
@require_admin
def admin_desactivar(tipo, id):
    return handle_crud_operation(tipo, id=id, action='deactivate')

@app.route('/admin/activar/<tipo>/<int:id>', methods=['PUT'])
@require_admin
def admin_activar(tipo, id):
    return handle_crud_operation(tipo, id=id, action='activate')

@app.route('/admin/obtener/<tipo>/<int:id>', methods=['GET'])
@require_admin
def admin_obtener(tipo, id):
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'success': False, 'message': 'Error de conexión'})
        
        cursor = conn.cursor(dictionary=True)
        
        table_map = {
            'carrera': 'carreras',
            'asignatura': 'asignaturas',
            'docente': 'docentes',
            'practica': 'practicas',
            'material': 'materiales'
        }
        
        if tipo not in table_map:
            return jsonify({'success': False, 'message': 'Tipo no válido'})
        
        cursor.execute(f'SELECT * FROM {table_map[tipo]} WHERE id = %s', (id,))
        elemento = cursor.fetchone()
        
        if tipo == 'practica' and elemento:
            cursor.execute('''
                SELECT material_id, cantidad_requerida 
                FROM practica_materiales 
                WHERE practica_id = %s
            ''', (id,))
            elemento['materiales'] = cursor.fetchall()
        
        return jsonify({'success': True, 'data': elemento})
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

# REPORTES 
@app.route('/reportes')
@require_login
def reportes():
    conn = get_db_connection()
    if conn is None:
        flash('Error de conexión a la base de datos', 'error')
        return render_template('reportes.html', prestamos=[], carreras=[])
    
    try:
        cursor = conn.cursor(dictionary=True)
        
        filters = {
            'fecha_inicio': request.args.get('fecha_inicio', ''),
            'fecha_fin': request.args.get('fecha_fin', ''),
            'carrera_id': request.args.get('carrera_id', ''),
            'estado': request.args.get('estado', '')
        }
        
        query = '''
            SELECT p.*, u.nombre as solicitante, c.nombre as carrera_nombre,
                   a.nombre as asignatura_nombre, d.nombre as docente_nombre,
                   pr.numero as practica_numero, pr.nombre as practica_nombre,
                   COUNT(det.id) as num_materiales
            FROM prestamos p
            LEFT JOIN usuarios u ON p.usuario_id = u.id
            LEFT JOIN carreras c ON p.carrera_id = c.id
            LEFT JOIN asignaturas a ON p.asignatura_id = a.id
            LEFT JOIN docentes d ON p.docente_id = d.id
            LEFT JOIN practicas pr ON p.practica_id = pr.id
            LEFT JOIN detalles_prestamo det ON p.id = det.prestamo_id
            WHERE 1=1
        '''
        
        query, params = build_filter_query(query, filters)
        query += ' GROUP BY p.id ORDER BY p.fecha_hora DESC'
        
        cursor.execute(query, params)
        prestamos = cursor.fetchall()
        
        carreras = get_carreras_activas(cursor)
        
        return render_template('reportes.html', prestamos=prestamos, carreras=carreras, **filters)
        
    except Error as e:
        return handle_db_error(e, 'reportes.html', {'prestamos': [], 'carreras': []})
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

@app.route('/reportes-avanzados')
@require_login
def reportes_avanzados():
    conn = get_db_connection()
    if conn is None:
        flash('Error de conexión a la base de datos', 'error')
        return render_template('reportes_avanzados.html')
    
    try:
        cursor = conn.cursor(dictionary=True)
        
        filters = {
            'fecha_inicio': request.args.get('fecha_inicio', ''),
            'fecha_fin': request.args.get('fecha_fin', ''),
            'carrera_id': request.args.get('carrera_id', '')
        }
        
        # Reporte 1: Estudiantes por asignatura
        query_estudiantes = '''
            SELECT a.nombre as asignatura, COUNT(DISTINCT i.id) as num_estudiantes
            FROM prestamos p
            JOIN asignaturas a ON p.asignatura_id = a.id
            JOIN integrantes i ON p.id = i.prestamo_id
            WHERE p.activo = TRUE
        '''
        query_estudiantes, params = build_filter_query(query_estudiantes, filters)
        query_estudiantes += ' GROUP BY a.id, a.nombre ORDER BY num_estudiantes DESC'
        cursor.execute(query_estudiantes, params)
        estudiantes_por_asignatura = cursor.fetchall()
        
        # Reporte 2: Asignaturas atendidas
        query_asignaturas = 'SELECT COUNT(DISTINCT p.asignatura_id) as total_asignaturas FROM prestamos p WHERE p.activo = TRUE'
        query_asignaturas, params_asignaturas = build_filter_query(query_asignaturas, filters)
        cursor.execute(query_asignaturas, params_asignaturas)
        total_asignaturas = cursor.fetchone()['total_asignaturas']
        
        # Reporte 3: Uso de materiales
        query_materiales = '''
            SELECT m.nombre, COUNT(d.id) as veces_utilizado, 
                   SUM(d.cantidad) as total_unidades
            FROM detalles_prestamo d
            JOIN materiales m ON d.material_id = m.id
            JOIN prestamos p ON d.prestamo_id = p.id
            WHERE p.activo = TRUE
        '''
        query_materiales, params_materiales = build_filter_query(query_materiales, filters)
        query_materiales += ' GROUP BY m.id, m.nombre ORDER BY veces_utilizado DESC'
        cursor.execute(query_materiales, params_materiales)
        uso_materiales = cursor.fetchall()
        
        # Reporte 4: Observaciones
        query_observaciones = '''
            SELECT p.id, p.fecha_hora, c.nombre as carrera, a.nombre as asignatura,
                   pr.nombre as practica, p.observaciones, p.importancia_observacion,
                   COUNT(d.id) as num_materiales
            FROM prestamos p
            JOIN carreras c ON p.carrera_id = c.id
            JOIN asignaturas a ON p.asignatura_id = a.id
            JOIN practicas pr ON p.practica_id = pr.id
            LEFT JOIN detalles_prestamo d ON p.id = d.prestamo_id
            WHERE p.observaciones IS NOT NULL AND p.observaciones != '' AND p.activo = TRUE
        '''
        query_observaciones, params_observaciones = build_filter_query(query_observaciones, filters)
        query_observaciones += ' GROUP BY p.id ORDER BY p.importancia_observacion DESC, p.fecha_hora DESC'
        cursor.execute(query_observaciones, params_observaciones)
        prestamos_con_observaciones = cursor.fetchall()
        
        carreras = get_carreras_activas(cursor)
        
        return render_template('reportes_avanzados.html',
                             estudiantes_por_asignatura=estudiantes_por_asignatura,
                             total_asignaturas=total_asignaturas,
                             uso_materiales=uso_materiales,
                             prestamos_con_observaciones=prestamos_con_observaciones,
                             carreras=carreras, **filters)
        
    except Error as e:
        return handle_db_error(e, 'reportes_avanzados.html')
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

@app.route('/detalle-observaciones/<importancia>')
@require_login
def detalle_observaciones(importancia):
    conn = get_db_connection()
    if conn is None:
        flash('Error de conexión a la base de datos', 'error')
        return render_template('detalle_observaciones.html', prestamos=[])
    
    try:
        cursor = conn.cursor(dictionary=True)
        
        filters = {
            'fecha_inicio': request.args.get('fecha_inicio', ''),
            'fecha_fin': request.args.get('fecha_fin', '')
        }
        
        query = '''
            SELECT p.*, c.nombre as carrera_nombre, a.nombre as asignatura_nombre,
                   d.nombre as docente_nombre, pr.numero as practica_numero, 
                   pr.nombre as practica_nombre, u.nombre as solicitante
            FROM prestamos p
            JOIN carreras c ON p.carrera_id = c.id
            JOIN asignaturas a ON p.asignatura_id = a.id
            JOIN docentes d ON p.docente_id = d.id
            JOIN practicas pr ON p.practica_id = pr.id
            JOIN usuarios u ON p.usuario_id = u.id
            WHERE p.observaciones IS NOT NULL AND p.observaciones != '' 
            AND p.importancia_observacion = %s AND p.activo = TRUE
        '''
        
        params = [importancia]
        if filters['fecha_inicio']:
            query += ' AND DATE(p.fecha_hora) >= %s'
            params.append(filters['fecha_inicio'])
        if filters['fecha_fin']:
            query += ' AND DATE(p.fecha_hora) <= %s'
            params.append(filters['fecha_fin'])
            
        query += ' ORDER BY p.fecha_hora DESC'
        
        cursor.execute(query, params)
        prestamos = cursor.fetchall()
        
        for prestamo in prestamos:
            cursor.execute('''
                SELECT m.nombre, det.cantidad
                FROM detalles_prestamo det
                JOIN materiales m ON det.material_id = m.id
                WHERE det.prestamo_id = %s
            ''', (prestamo['id'],))
            prestamo['materiales'] = cursor.fetchall()
            
            cursor.execute('''
                SELECT nombre, no_control
                FROM integrantes
                WHERE prestamo_id = %s
            ''', (prestamo['id'],))
            prestamo['integrantes'] = cursor.fetchall()
        
        return render_template('detalle_observaciones.html', 
                             prestamos=prestamos, 
                             importancia=importancia, **filters)
        
    except Error as e:
        return handle_db_error(e, 'detalle_observaciones.html', {'prestamos': []})
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

@app.route('/ver-ticket/<int:prestamo_id>')
@require_login
def ver_ticket(prestamo_id):
    conn = get_db_connection()
    if conn is None:
        flash('Error de conexión a la base de datos', 'error')
        return render_template('ver_ticket.html', prestamo=None)
    
    try:
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute('''
            SELECT p.*, c.nombre as carrera_nombre, a.nombre as asignatura_nombre,
                   d.nombre as docente_nombre, pr.numero as practica_numero, 
                   pr.nombre as practica_nombre, u.nombre as solicitante
            FROM prestamos p
            JOIN carreras c ON p.carrera_id = c.id
            JOIN asignaturas a ON p.asignatura_id = a.id
            JOIN docentes d ON p.docente_id = d.id
            JOIN practicas pr ON p.practica_id = pr.id
            JOIN usuarios u ON p.usuario_id = u.id
            WHERE p.id = %s
        ''', (prestamo_id,))
        prestamo = cursor.fetchone()
        
        if not prestamo:
            flash('Préstamo no encontrado', 'error')
            return redirect(url_for('reportes_avanzados'))
        
        cursor.execute('''
            SELECT m.nombre, det.cantidad
            FROM detalles_prestamo det
            JOIN materiales m ON det.material_id = m.id
            WHERE det.prestamo_id = %s
        ''', (prestamo_id,))
        prestamo['materiales'] = cursor.fetchall()
        
        cursor.execute('''
            SELECT nombre, no_control, firma_data
            FROM integrantes
            WHERE prestamo_id = %s
        ''', (prestamo_id,))
        prestamo['integrantes'] = cursor.fetchall()
        
        return render_template('ver_ticket.html', prestamo=prestamo)
        
    except Error as e:
        return handle_db_error(e, 'ver_ticket.html', {'prestamo': None})
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

# PRESTAMOS 
@app.route('/admin/eliminar-prestamos', methods=['DELETE'])
@require_admin
def admin_eliminar_prestamos():
    try:
        data = request.get_json()
        fecha_inicio = data.get('fecha_inicio')
        fecha_fin = data.get('fecha_fin')
        
        if not fecha_inicio or not fecha_fin:
            return jsonify({'success': False, 'message': 'Fechas requeridas'})
        
        conn = get_db_connection()
        if conn is None:
            return jsonify({'success': False, 'message': 'Error de conexión'})
        
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE prestamos 
            SET activo = FALSE 
            WHERE DATE(fecha_hora) BETWEEN %s AND %s
        ''', (fecha_inicio, fecha_fin))
        
        filas_afectadas = cursor.rowcount
        conn.commit()
        
        return jsonify({
            'success': True, 
            'message': f'{filas_afectadas} préstamos eliminados correctamente'
        })
        
    except Exception as e:
        if 'conn' in locals() and conn.is_connected():
            conn.rollback()
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

@app.route('/devolver-prestamo/<int:prestamo_id>', methods=['POST'])
@require_login
def devolver_prestamo(prestamo_id):
    conn = get_db_connection()
    if conn is None:
        return jsonify({'success': False, 'message': 'Error de conexión a la base de datos'})
    
    try:
        cursor = conn.cursor()
        
        cursor.execute('SELECT material_id, cantidad FROM detalles_prestamo WHERE prestamo_id = %s', (prestamo_id,))
        materiales = cursor.fetchall()
        
        for material_id, cantidad in materiales:
            cursor.execute('''
                UPDATE materiales 
                SET cantidad_disponible = cantidad_disponible + %s 
                WHERE id = %s
            ''', (cantidad, material_id))
        
        cursor.execute('UPDATE prestamos SET estado = "devuelto" WHERE id = %s', (prestamo_id,))
        conn.commit()
        
        return jsonify({'success': True, 'message': 'Préstamo devuelto correctamente'})
        
    except Exception as e:
        if conn.is_connected():
            conn.rollback()
        return jsonify({'success': False, 'message': f'Error al devolver préstamo: {str(e)}'})
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

# MANEJO DE ERRORES
@app.errorhandler(404)
def not_found(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    return render_template('500.html'), 500

# INICIALIZACIÓN 
if __name__ == '__main__':
    print(" Inicializando sistema...")
    print(" Verificando e inicializando base de datos...")
    
    if init_database():
        print(" Base de datos lista")
        print(" Iniciando servidor Flask...")
        print(" La aplicación estará disponible en: http://localhost:5000")
        app.run(debug=True, host='0.0.0.0', port=5000)
    else:
        print(" No se pudo inicializar la base de datos.")