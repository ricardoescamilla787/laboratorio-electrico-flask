# Sistema de Gestión de Préstamos - Laboratorio Eléctrico

Aplicación Full Stack para la gestión académica y control de préstamos de laboratorio, desarrollada con Flask (Python), MySQL y JavaScript, orientada a entornos educativos y administrativos con uso de red local.

## Características

- Gestión completa de préstamos de materiales por práctica
- Interfaz responsive para móviles y computadoras
- Sistema de autenticación de usuarios
- Generación de reportes avanzados y estadísticas para control y auditorias
- Previsualización e impresión de comprobantes
- API REST interna
- Arquitectura cliente-servidor
- Firma digital de integrantes
- Gestión académica completa (CRUD)

## Requisitos

- Python 3.8+
- MySQL Server 5.7+
- Navegador web moderno
- Virtualenv

> El proyecto requiere que MySQL Server esté instalado y en ejecución.
> Herramientas como MySQL Workbench se utilizan únicamente para administración.

## Instalación

1. Clonar o descargar el proyecto
2. Crear entorno virtual: `python -m venv venv`
3. Activar entorno virtual:
   - Windows: `venv\Scripts\activate`
   - Mac/Linux: `source venv/bin/activate`
4. Instalar dependencias: `pip install -r backend/requirements.txt`
5. Configurar base de datos en el archivo `.env`
   SECRET_KEY=tu_secret_key
   MYSQL_HOST=localhost
   MYSQL_USER=usuario_mysql
   MYSQL_PASSWORD=password_mysql
   MYSQL_DB=laboratorio_electrica
   MYSQL_PORT=3306
6. Ejecutar la aplicación: `python backend/app.py`

> MySQL Server debe estar activo y accesible con las credenciales definidas en el archivo `.env`.

## Uso

1. Acceder a http://localhost:5000
2. Iniciar sesión con las credenciales:
   - Admin: admin@itpachuca.edu.mx / admin123 (tiene acceso completo a la configuración del sistema)
   - Estudiante: maria.garcia@itpachuca.edu.mx / estudiante123 
- Las credenciales incluidas son únicamente de prueba para entorno local.

> Este proyecto está configurado para ejecutarse inicialmente en entorno local.

## Arquitectura del proyecto

- Arquitectura cliente-servidor con separación clara de responsabilidades:

Cliente (Navegador)
   ↓ Fetch / JSON
Servidor Flask (API + Vistas)
   ↓
Base de Datos MySQL

```text
LABORATORIO-ELECTRICO/
│
├── backend/
│   ├── app.py
│   ├── config.py
│   ├── requirements.txt
│   │
│   └── database/
│       ├── __init__.py
│       ├── db_connection.py
│       └── init_db.py
│
├── database/
│   └── laboratorio_electrica.sql
│
├── frontend/
│   ├── static/
│   │   ├── css/
│   │   │   └── style.css
│   │   └── js/
│   │       ├── firma_digital.js
│   │       ├── gestion_academica.js
│   │       ├── main.js
│   │       └── nuevo_prestamo.js
│   │
│   └── templates/
│       ├── 404.html
│       ├── 500.html
│       ├── base.html
│       ├── dashboard.html
│       ├── detalle_observaciones.html
│       ├── gestion_academica.html
│       ├── login.html
│       ├── nuevo_prestamo.html
│       ├── reportes_avanzados.html
│       ├── reportes.html
│       └── ver_ticket.html
│
└── README.md
```

## Tecnologías utilizadas

- Backend:

Python 3
Flask
MySQL
mysql-connector-python
Jinja2
Flask Sessions

- Frontend

HTML5
CSS3
Bootstrap
JavaScript (ES6+)
Fetch API

- Base de datos

MySQL / MariaDB
Modelo relacional normalizado
Integridad referencial con claves foráneas

La base de datos se inicializa automáticamente desde el backend:

- El archivo `backend/database/init_db.py` se encarga de:
  - Crear las tablas necesarias
  - Insertar datos iniciales (si aplica)
  - Validar la estructura de la base de datos
- El archivo `database/laboratorio_electrica.sql` es únicamente documentación

## Entidades principales

- usuarios
- carreras
- asignaturas
- docentes
- practicas
- materiales
- practica_materiales
- prestamos
- detalles_prestamo
- integrantes

## Características del modelo

- Integridad referencial
- Eliminaciones en cascada
- Índices para optimización de consultas
- Eliminación lógica
- Control de inventario en tiempo real

## Autenticación y roles

### Tipos de usuario

- Administrador
Gestión académica
Desactivación de registros
Reportes avanzados
Eliminación de préstamos
Devolución de prestamos 

- Estudiante
Registro de préstamos
Consulta de historial
Visualización de tickets

## Seguridad

- Sesiones con Flask session
- Rutas protegidas con decoradores
- Separación de permisos por rol

## FRONTEND

- Archivo principal:
frontend/static/js/gestion_academica.js

- Funcionalidades:
Administración de:
- Carreras
- Asignaturas
- Docentes
- Prácticas
- Materiales
Formularios dinámicos
Edición mediante modales
Activación y desactivación lógica
Validaciones en cliente
Renderizado dinámico sin recargar la página

- Patrón utilizado
Patrón similar a MVC en el cliente:
- Modelo: Datos recibidos desde la API
- Vista: HTML + Bootstrap
- Controlador: Clase GestionAcademica

## API interna (REST)

- Endpoints públicos
GET /api/carreras
GET /api/asignaturas
GET /api/docentes
GET /api/practicas
GET /api/materiales

- Endpoints administrativos
POST /admin/agregar-<tipo>
PUT /admin/actualizar/<tipo>/<id>
PUT /admin/desactivar/<tipo>/<id>
PUT /admin/activar/<tipo>/<id>
GET /admin/obtener/<tipo>/<id>

Todos los endpoints utilizan JSON y son consumidos mediante Fetch API.

## Autor

Ricardo Escamilla Mendoza
Full Stack Developer Jr
Ingeniería en Sistemas Computacionales