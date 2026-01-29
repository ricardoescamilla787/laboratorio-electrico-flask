class GestionAcademica {
    constructor() {
        this.carreras = [];
        this.asignaturas = [];
        this.docentes = [];
        this.practicas = [];
        this.materiales = [];
        this.init();
    }

    async init() {
        await this.cargarDatosIniciales();
        this.configurarEventListeners();
        this.mostrarDatosIniciales();
    }
    // carga datos iniciales (carreras, asignaturas, etc)
    async cargarDatosIniciales() {
        try {

            const carrerasResponse = await fetch('/api/carreras');
            this.carreras = await carrerasResponse.json();
            
            const asignaturasResponse = await fetch('/api/asignaturas');
            this.asignaturas = await asignaturasResponse.json();
            
            const docentesResponse = await fetch('/api/docentes');
            this.docentes = await docentesResponse.json();
            
            const practicasResponse = await fetch('/api/practicas');
            this.practicas = await practicasResponse.json();
            
            const materialesResponse = await fetch('/api/materiales');
            this.materiales = await materialesResponse.json();
            
        } catch (error) {
            console.error('Error cargando datos:', error);
            showMessage('Error al cargar los datos iniciales', 'error');
        }
    }

    // Formularios
    configurarEventListeners() {
        // Carreras
        document.getElementById('formCarrera').addEventListener('submit', (e) => this.agregarCarrera(e));
        
        // Asignaturas
        document.getElementById('formAsignatura').addEventListener('submit', (e) => this.agregarAsignatura(e));
        document.getElementById('asignaturaCarrera').addEventListener('change', () => this.actualizarListaAsignaturas());
        
        // Docentes
        document.getElementById('formDocente').addEventListener('submit', (e) => this.agregarDocente(e));
        
        // Prácticas
        document.getElementById('formPractica').addEventListener('submit', (e) => this.agregarPractica(e));
        document.getElementById('practicaCarrera').addEventListener('change', () => this.actualizarAsignaturasPractica());
        document.getElementById('practicaAsignatura').addEventListener('change', () => this.actualizarMaterialesPractica());
        document.getElementById('agregarMaterialPractica').addEventListener('click', () => this.agregarFilaMaterialPractica());
        
        // Materiales
        document.getElementById('formMaterial').addEventListener('submit', (e) => this.agregarMaterial(e));
    }

    mostrarDatosIniciales() {
        this.actualizarSelectCarreras();
        this.actualizarListaCarreras();
        this.actualizarListaAsignaturas();
        this.actualizarListaDocentes();
        this.actualizarListaPracticas();
        this.actualizarListaMateriales();
        this.actualizarSelectMaterialesPractica();
    }

    // CARRERAS 
    actualizarSelectCarreras() {
        const selects = [
            'asignaturaCarrera',
            'docenteCarrera', 
            'practicaCarrera'
        ];
        
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            select.innerHTML = '<option value="">Seleccionar carrera...</option>';
            
            this.carreras.forEach(carrera => {
                const option = document.createElement('option');
                option.value = carrera.id;
                option.textContent = carrera.nombre;
                select.appendChild(option);
            });
        });
    }

    async agregarCarrera(e) {
        e.preventDefault();
        
        const nombre = document.getElementById('carreraNombre').value;
        const abreviatura = document.getElementById('carreraAbreviatura').value;
        
        if (!nombre) {
            showMessage('El nombre de la carrera es obligatorio', 'error');
            return;
        }

        const button = e.target.querySelector('button[type="submit"]');
        const originalText = showLoading(button);

        try {
            const response = await fetch('/admin/agregar-carrera', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ nombre, abreviatura })
            });

            const result = await response.json();
            
            if (result.success) {
                showMessage(result.message, 'success');
                document.getElementById('formCarrera').reset();
                await this.cargarDatosIniciales();
                this.actualizarSelectCarreras();
                this.actualizarListaCarreras();
            } else {
                showMessage(result.message, 'error');
            }
        } catch (error) {
            showMessage('Error al agregar la carrera', 'error');
        } finally {
            hideLoading(button, originalText);
        }
    }

    actualizarListaCarreras() {
        const container = document.getElementById('listaCarreras');
        
        if (this.carreras.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay carreras registradas</p>';
            return;
        }

        let html = '<div class="row">';
        this.carreras.forEach(carrera => {
            html += `
                <div class="col-md-6 mb-2">
                    <div class="card">
                        <div class="card-body py-2">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="mb-0">${carrera.nombre}</h6>
                                    ${carrera.abreviatura ? `<small class="text-muted">${carrera.abreviatura}</small>` : ''}
                                </div>
                                <div>
                                    <span class="badge bg-${carrera.activa ? 'success' : 'secondary'} me-2">
                                        ${carrera.activa ? 'Activa' : 'Inactiva'}
                                    </span>
                                        <button class="btn btn-sm btn-outline-warning me-2" onclick="gestion.editar('carrera', ${carrera.id})" title="Editar">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                    ${carrera.activa ? 
                                        `<button class="btn btn-sm btn-outline-danger" onclick="gestion.desactivar('carrera', ${carrera.id})">
                                            <i class="fas fa-ban"></i>
                                        </button>` :
                                        `<button class="btn btn-sm btn-outline-success" onclick="gestion.activar('carrera', ${carrera.id})">
                                            <i class="fas fa-check"></i>
                                        </button>`
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        container.innerHTML = html;
    }

    // ASIGNATURAS 
    async agregarAsignatura(e) {
        e.preventDefault();
        
        const nombre = document.getElementById('asignaturaNombre').value;
        const clave = document.getElementById('asignaturaClave').value;
        const carreraId = document.getElementById('asignaturaCarrera').value;
        
        if (!nombre || !carreraId) {
            showMessage('El nombre y la carrera son obligatorios', 'error');
            return;
        }

        const button = e.target.querySelector('button[type="submit"]');
        const originalText = showLoading(button);

        try {
            const response = await fetch('/admin/agregar-asignatura', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ nombre, clave, carrera_id: carreraId })
            });

            const result = await response.json();
            
            if (result.success) {
                showMessage(result.message, 'success');
                document.getElementById('formAsignatura').reset();
                await this.cargarDatosIniciales();
                this.actualizarListaAsignaturas();
            } else {
                showMessage(result.message, 'error');
            }
        } catch (error) {
            showMessage('Error al agregar la asignatura', 'error');
        } finally {
            hideLoading(button, originalText);
        }
    }

    actualizarListaAsignaturas() {
        const container = document.getElementById('listaAsignaturas');
        const carreraFiltro = document.getElementById('asignaturaCarrera').value;
        
        let asignaturasFiltradas = this.asignaturas;
        if (carreraFiltro) {
            asignaturasFiltradas = this.asignaturas.filter(a => a.carrera_id == carreraFiltro);
        }

        if (asignaturasFiltradas.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay asignaturas registradas</p>';
            return;
        }

        let html = '<div class="table-responsive"><table class="table table-striped table-sm"><thead><tr><th>Nombre</th><th>Clave</th><th>Carrera</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>';
        
        asignaturasFiltradas.forEach(asignatura => {
            html += `
                <tr>
                    <td>${asignatura.nombre}</td>
                    <td>${asignatura.clave || '-'}</td>
                    <td>${asignatura.carrera_nombre}</td>
                    <td><span class="badge bg-${asignatura.activa ? 'success' : 'secondary'}">${asignatura.activa ? 'Activa' : 'Inactiva'}</span></td>
                    <td>
                            <button class="btn btn-sm btn-outline-warning me-2" onclick="gestion.editar('asignatura', ${asignatura.id})" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                        ${asignatura.activa ? 
                            `<button class="btn btn-sm btn-outline-danger" onclick="gestion.desactivar('asignatura', ${asignatura.id})">
                                <i class="fas fa-ban"></i>
                            </button>` :
                            `<button class="btn btn-sm btn-outline-success" onclick="gestion.activar('asignatura', ${asignatura.id})">
                                <i class="fas fa-check"></i>
                            </button>`
                        }
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
    }

    // DOCENTES 
    async agregarDocente(e) {
        e.preventDefault();
        
        const nombre = document.getElementById('docenteNombre').value;
        const email = document.getElementById('docenteEmail').value;
        const carreraId = document.getElementById('docenteCarrera').value;
        
        if (!nombre || !carreraId) {
            showMessage('El nombre y la carrera son obligatorios', 'error');
            return;
        }

        const button = e.target.querySelector('button[type="submit"]');
        const originalText = showLoading(button);

        try {
            const response = await fetch('/admin/agregar-docente', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ nombre, email, carrera_id: carreraId })
            });

            const result = await response.json();
            
            if (result.success) {
                showMessage(result.message, 'success');
                document.getElementById('formDocente').reset();
                await this.cargarDatosIniciales();
                this.actualizarListaDocentes();
            } else {
                showMessage(result.message, 'error');
            }
        } catch (error) {
            showMessage('Error al agregar el docente', 'error');
        } finally {
            hideLoading(button, originalText);
        }
    }

    actualizarListaDocentes() {
        const container = document.getElementById('listaDocentes');
        const carreraFiltro = document.getElementById('docenteCarrera').value;
        
        let docentesFiltrados = this.docentes;
        if (carreraFiltro) {
            docentesFiltrados = this.docentes.filter(d => d.carrera_id == carreraFiltro);
        }

        if (docentesFiltrados.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay docentes registrados</p>';
            return;
        }

        let html = '<div class="row">';
        docentesFiltrados.forEach(docente => {
            html += `
                <div class="col-md-6 mb-2">
                    <div class="card">
                        <div class="card-body py-2">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="mb-0">${docente.nombre}</h6>
                                    ${docente.email ? `<small class="text-muted">${docente.email}</small>` : ''}
                                    <br><small class="text-muted">${docente.carrera_nombre}</small>
                                </div>
                                <div>
                                    <span class="badge bg-${docente.activo ? 'success' : 'secondary'} me-2">
                                        ${docente.activo ? 'Activo' : 'Inactivo'}
                                    </span>
                                        <button class="btn btn-sm btn-outline-warning me-2" onclick="gestion.editar('docente', ${docente.id})" title="Editar">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                    ${docente.activo ? 
                                        `<button class="btn btn-sm btn-outline-danger" onclick="gestion.desactivar('docente', ${docente.id})">
                                            <i class="fas fa-ban"></i>
                                        </button>` :
                                        `<button class="btn btn-sm btn-outline-success" onclick="gestion.activar('docente', ${docente.id})">
                                            <i class="fas fa-check"></i>
                                        </button>`
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        container.innerHTML = html;
    }

    // PRACTICAS 
    actualizarAsignaturasPractica() {
        const carreraId = document.getElementById('practicaCarrera').value;
        const selectAsignatura = document.getElementById('practicaAsignatura');
        
        selectAsignatura.innerHTML = '<option value="">Seleccionar asignatura...</option>';
        selectAsignatura.disabled = !carreraId;
        
        if (carreraId) {
            const asignaturasFiltradas = this.asignaturas.filter(a => a.carrera_id == carreraId && a.activa);
            asignaturasFiltradas.forEach(asignatura => {
                const option = document.createElement('option');
                option.value = asignatura.id;
                option.textContent = asignatura.nombre;
                selectAsignatura.appendChild(option);
            });
        }
    }

    actualizarMaterialesPractica() {
        this.actualizarSelectMaterialesPractica();
    }

    actualizarSelectMaterialesPractica() {
        const selects = document.querySelectorAll('.material-practica-select');
        selects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '<option value="">Seleccionar material...</option>';
            
            this.materiales.forEach(material => {
                if (material.cantidad_disponible > 0) {
                    const option = document.createElement('option');
                    option.value = material.id;
                    option.textContent = `${material.nombre} (Disponible: ${material.cantidad_disponible})`;
                    select.appendChild(option);
                }
            });
            
            if (currentValue) {
                select.value = currentValue;
            }
        });
    }

    agregarFilaMaterialPractica() {
        const container = document.getElementById('materialesPracticaContainer');
        const newRow = document.createElement('div');
        newRow.className = 'material-practica-row row mb-2';
        newRow.innerHTML = `
            <div class="col-md-6">
                <select class="form-select material-practica-select" required>
                    <option value="">Seleccionar material...</option>
                </select>
            </div>
            <div class="col-md-4">
                <input type="number" class="form-control cantidad-requerida" placeholder="Cantidad" min="1" required>
            </div>
            <div class="col-md-2">
                <button type="button" class="btn btn-danger btn-sm w-100 quitar-material-practica">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        container.appendChild(newRow);
        this.actualizarSelectMaterialesPractica();
        
        // Event listener del boton quitar
        newRow.querySelector('.quitar-material-practica').addEventListener('click', function() {
            if (document.querySelectorAll('.material-practica-row').length > 1) {
                newRow.remove();
            } else {
                showMessage('Debe haber al menos un material en la práctica', 'error');
            }
        });
    }

    async agregarPractica(e) {
        e.preventDefault();
        
        const numero = document.getElementById('practicaNumero').value;
        const nombre = document.getElementById('practicaNombre').value;
        const descripcion = document.getElementById('practicaDescripcion').value;
        const asignaturaId = document.getElementById('practicaAsignatura').value;
        
        if (!numero || !nombre || !asignaturaId) {
            showMessage('El número, nombre y asignatura son obligatorios', 'error');
            return;
        }

        // Recolectar materiales
        const materiales = [];
        document.querySelectorAll('.material-practica-row').forEach(row => {
            const select = row.querySelector('.material-practica-select');
            const cantidad = row.querySelector('.cantidad-requerida');
            
            if (select.value && cantidad.value) {
                materiales.push({
                    material_id: parseInt(select.value),
                    cantidad_requerida: parseInt(cantidad.value)
                });
            }
        });

        if (materiales.length === 0) {
            showMessage('Debe agregar al menos un material a la práctica', 'error');
            return;
        }

        const button = e.target.querySelector('button[type="submit"]');
        const originalText = showLoading(button);

        try {
            const response = await fetch('/admin/agregar-practica', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    numero: parseInt(numero), 
                    nombre, 
                    descripcion, 
                    asignatura_id: parseInt(asignaturaId),
                    materiales 
                })
            });

            const result = await response.json();
            
            if (result.success) {
                showMessage(result.message, 'success');
                document.getElementById('formPractica').reset();
                // Limpiar materiales
                const container = document.getElementById('materialesPracticaContainer');
                container.innerHTML = container.querySelector('.material-practica-row').outerHTML;
                await this.cargarDatosIniciales();
                this.actualizarListaPracticas();
            } else {
                showMessage(result.message, 'error');
            }
        } catch (error) {
            showMessage('Error al agregar la práctica', 'error');
        } finally {
            hideLoading(button, originalText);
        }
    }

    actualizarListaPracticas() {
        const container = document.getElementById('listaPracticas');
        
        if (this.practicas.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay prácticas registradas</p>';
            return;
        }

        let html = '<div class="table-responsive"><table class="table table-striped table-sm"><thead><tr><th>#</th><th>Nombre</th><th>Asignatura</th><th>Carrera</th><th>Materiales</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>';
        
        this.practicas.forEach(practica => {
            html += `
                <tr>
                    <td>${practica.numero}</td>
                    <td>${practica.nombre}</td>
                    <td>${practica.asignatura_nombre}</td>
                    <td>${practica.carrera_nombre}</td>
                    <td><span class="badge bg-info">${practica.materiales_count || 0} materiales</span></td>
                    <td><span class="badge bg-${practica.activa ? 'success' : 'secondary'}">${practica.activa ? 'Activa' : 'Inactiva'}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-warning me-2" onclick="gestion.editar('practica', ${practica.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${practica.activa ? 
                            `<button class="btn btn-sm btn-outline-danger" onclick="gestion.desactivar('practica', ${practica.id})">
                                <i class="fas fa-ban"></i>
                            </button>` :
                            `<button class="btn btn-sm btn-outline-success" onclick="gestion.activar('practica', ${practica.id})">
                                <i class="fas fa-check"></i>
                            </button>`
                        }
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
    }

    // MATERIALES 
    async agregarMaterial(e) {
        e.preventDefault();
        
        const nombre = document.getElementById('materialNombre').value;
        const descripcion = document.getElementById('materialDescripcion').value;
        const cantidad = document.getElementById('materialCantidad').value;
        const categoria = document.getElementById('materialCategoria').value;
        
        if (!nombre || !cantidad) {
            showMessage('El nombre y la cantidad son obligatorios', 'error');
            return;
        }

        const button = e.target.querySelector('button[type="submit"]');
        const originalText = showLoading(button);

        try {
            const response = await fetch('/admin/agregar-material', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    nombre, 
                    descripcion, 
                    cantidad: parseInt(cantidad), 
                    categoria 
                })
            });

            const result = await response.json();
            
            if (result.success) {
                showMessage(result.message, 'success');
                document.getElementById('formMaterial').reset();
                await this.cargarDatosIniciales();
                this.actualizarListaMateriales();
            } else {
                showMessage(result.message, 'error');
            }
        } catch (error) {
            showMessage('Error al agregar el material', 'error');
        } finally {
            hideLoading(button, originalText);
        }
    }

    actualizarListaMateriales() {
        const container = document.getElementById('listaMateriales');
        
        if (this.materiales.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay materiales registrados</p>';
            return;
        }

        let html = '<div class="table-responsive"><table class="table table-striped table-sm"><thead><tr><th>Nombre</th><th>Categoría</th><th>Disponible</th><th>Descripción</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>';
        
        this.materiales.forEach(material => {
            const estaActivo = material.cantidad_disponible > 0;
            html += `
                <tr>
                    <td>${material.nombre}</td>
                    <td>${material.categoria || '-'}</td>
                    <td>
                        <span class="badge bg-${estaActivo ? 'success' : 'danger'}">
                            ${material.cantidad_disponible} pz
                        </span>
                    </td>
                    <td>${material.descripcion || '-'}</td>
                    <td><span class="badge bg-${estaActivo ? 'success' : 'secondary'}">${estaActivo ? 'Activo' : 'Inactivo'}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-warning me-2" onclick="gestion.editar('material', ${material.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${estaActivo ? 
                            `<button class="btn btn-sm btn-outline-danger" onclick="gestion.desactivar('material', ${material.id})">
                                <i class="fas fa-ban"></i>
                            </button>` :
                            `<button class="btn btn-sm btn-outline-success" onclick="gestion.activar('material', ${material.id})">
                                <i class="fas fa-check"></i>
                            </button>`
                        }
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
    }

    // FUNCIONES DE ACTIVACION Y DESACTIVACION 
    async desactivar(tipo, id) {
        if (!confirm(`¿Está seguro de que desea desactivar este ${tipo}?`)) {
            return;
        }

        try {
            const response = await fetch(`/admin/desactivar/${tipo}/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const result = await response.json();
            
            if (result.success) {
                showMessage(result.message, 'success');
                await this.cargarDatosIniciales();
                this.mostrarDatosIniciales();
            } else {
                showMessage(result.message, 'error');
            }
        } catch (error) {
            showMessage('Error al desactivar', 'error');
        }
    }

    async activar(tipo, id) {
        if (!confirm(`¿Está seguro de que desea activar este ${tipo}?`)) {
            return;
        }

        try {
            const response = await fetch(`/admin/activar/${tipo}/${id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const result = await response.json();
            
            if (result.success) {
                showMessage(result.message, 'success');
                await this.cargarDatosIniciales();
                this.mostrarDatosIniciales();
            } else {
                showMessage(result.message, 'error');
            }
        } catch (error) {
            showMessage('Error al activar', 'error');
        }
    }
    // FUNCIONES DE EDICION 
    async editar(tipo, id) {
        try {
            // Obtener datos 
            const response = await fetch(`/admin/obtener/${tipo}/${id}`);
            const result = await response.json();
            
            if (!result.success) {
                showMessage(result.message, 'error');
                return;
            }
            
            const elemento = result.data;
            
            // Mostrar modal edicion
            this.mostrarModalEdicion(tipo, elemento);
            
        } catch (error) {
            showMessage('Error al cargar los datos para edición', 'error');
        }
    }

    mostrarModalEdicion(tipo, elemento) {
        // Crear y mostrar modal segun el tipo
        let titulo = '';
        let contenido = '';
        
        switch(tipo) {
            case 'carrera':
                titulo = 'Editar Carrera';
                contenido = this.formularioEdicionCarrera(elemento);
                break;
            case 'asignatura':
                titulo = 'Editar Asignatura';
                contenido = this.formularioEdicionAsignatura(elemento);
                break;
            case 'docente':
                titulo = 'Editar Docente';
                contenido = this.formularioEdicionDocente(elemento);
                break;
            case 'practica':
                titulo = 'Editar Práctica';
                contenido = this.formularioEdicionPractica(elemento);
                break;
            case 'material':
                titulo = 'Editar Material';
                contenido = this.formularioEdicionMaterial(elemento);
                break;
        }
        
        // Crear modal
        const modalHTML = `
            <div class="modal fade" id="modalEdicion" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${titulo}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            ${contenido}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-primary" onclick="gestion.guardarEdicion('${tipo}', ${elemento.id})">
                                <i class="fas fa-save"></i> Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remover modal anterior si existe
        const modalAnterior = document.getElementById('modalEdicion');
        if (modalAnterior) {
            modalAnterior.remove();
        }
        
        // Agregar nuevo modal
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('modalEdicion'));
        modal.show();
        // Cargar datos
        setTimeout(() => {
            if (tipo === 'asignatura' || tipo === 'docente' || tipo === 'practica') {
                this.inicializarSelectsEdicion(tipo, elemento);
            }
            
            if (tipo === 'practica') {
                this.cargarMaterialesPracticaEdicion(elemento);
            }
        }, 500);
    }

    // FORMULARIOS DE EDICION
    formularioEdicionCarrera(carrera) {
        return `
            <form id="formEdicionCarrera">
                <div class="mb-3">
                    <label for="editarCarreraNombre" class="form-label">Nombre de la Carrera *</label>
                    <input type="text" class="form-control" id="editarCarreraNombre" value="${carrera.nombre || ''}" required>
                </div>
                <div class="mb-3">
                    <label for="editarCarreraAbreviatura" class="form-label">Abreviatura</label>
                    <input type="text" class="form-control" id="editarCarreraAbreviatura" value="${carrera.abreviatura || ''}" maxlength="10">
                </div>
            </form>
        `;
    }

    formularioEdicionAsignatura(asignatura) {
        let opcionesCarreras = '<option value="">Seleccionar carrera...</option>';
        this.carreras.forEach(carrera => {
            const selected = carrera.id == asignatura.carrera_id ? 'selected' : '';
            opcionesCarreras += `<option value="${carrera.id}" ${selected}>${carrera.nombre}</option>`;
        });

        return `
            <form id="formEdicionAsignatura">
                <div class="row">
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label for="editarAsignaturaCarrera" class="form-label">Carrera *</label>
                            <select class="form-select" id="editarAsignaturaCarrera" required>
                                ${opcionesCarreras}
                            </select>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label for="editarAsignaturaNombre" class="form-label">Nombre de la Asignatura *</label>
                            <input type="text" class="form-control" id="editarAsignaturaNombre" value="${asignatura.nombre || ''}" required>
                        </div>
                    </div>
                </div>
                <div class="mb-3">
                    <label for="editarAsignaturaClave" class="form-label">Clave</label>
                    <input type="text" class="form-control" id="editarAsignaturaClave" value="${asignatura.clave || ''}" maxlength="20">
                </div>
            </form>
        `;
    }

    formularioEdicionDocente(docente) {
        let opcionesCarreras = '<option value="">Seleccionar carrera...</option>';
        this.carreras.forEach(carrera => {
            const selected = carrera.id == docente.carrera_id ? 'selected' : '';
            opcionesCarreras += `<option value="${carrera.id}" ${selected}>${carrera.nombre}</option>`;
        });

        return `
            <form id="formEdicionDocente">
                <div class="row">
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label for="editarDocenteCarrera" class="form-label">Carrera *</label>
                            <select class="form-select" id="editarDocenteCarrera" required>
                                ${opcionesCarreras}
                            </select>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label for="editarDocenteNombre" class="form-label">Nombre del Docente *</label>
                            <input type="text" class="form-control" id="editarDocenteNombre" value="${docente.nombre || ''}" required>
                        </div>
                    </div>
                </div>
                <div class="mb-3">
                    <label for="editarDocenteEmail" class="form-label">Email</label>
                    <input type="email" class="form-control" id="editarDocenteEmail" value="${docente.email || ''}">
                </div>
            </form>
        `;
    }

    formularioEdicionMaterial(material) {
        return `
            <form id="formEdicionMaterial">
                <div class="row">
                    <div class="col-md-4">
                        <div class="mb-3">
                            <label for="editarMaterialNombre" class="form-label">Nombre del Material *</label>
                            <input type="text" class="form-control" id="editarMaterialNombre" 
                                value="${material.nombre || ''}" required>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="mb-3">
                            <label for="editarMaterialCategoria" class="form-label">Categoría</label>
                            <input type="text" class="form-control" id="editarMaterialCategoria" 
                                value="${material.categoria || ''}">
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="mb-3">
                            <label for="editarMaterialCantidad" class="form-label">Cantidad Disponible *</label>
                            <input type="number" class="form-control" id="editarMaterialCantidad" 
                                value="${material.cantidad_disponible || 0}" min="0" required>
                        </div>
                    </div>
                    <div class="col-md-2">
                        <div class="mb-3">
                            <label for="editarMaterialUnidad" class="form-label">Unidad</label>
                            <input type="text" class="form-control" id="editarMaterialUnidad" 
                                value="pz" readonly>
                        </div>
                    </div>
                </div>
                <div class="mb-3">
                    <label for="editarMaterialDescripcion" class="form-label">Descripción</label>
                    <textarea class="form-control" id="editarMaterialDescripcion" rows="2">${material.descripcion || ''}</textarea>
                </div>
            </form>
        `;
    }
    formularioEdicionPractica(practica) {
        console.log('Datos de práctica para editar:', practica);
        
        // Generar opciones de carreras
        let opcionesCarreras = '<option value="">Seleccionar carrera...</option>';
        this.carreras.forEach(carrera => {
            const selected = (practica.carrera_id && carrera.id == practica.carrera_id) ? 'selected' : '';
            opcionesCarreras += `<option value="${carrera.id}" ${selected}>${carrera.nombre}</option>`;
        });
        
        // Generar opciones de asignaturas
        let opcionesAsignaturas = '<option value="">Seleccionar asignatura...</option>';
        
        if (practica.carrera_id) {
            const asignaturasDeLaCarrera = this.asignaturas.filter(
                a => a.carrera_id == practica.carrera_id && a.activa
            );
            
            asignaturasDeLaCarrera.forEach(asignatura => {
                const selected = (asignatura.id == practica.asignatura_id) ? 'selected' : '';
                opcionesAsignaturas += `<option value="${asignatura.id}" ${selected}>${asignatura.nombre}</option>`;
            });
        }
        
        // Generar materiales HTML
        let materialesHTML = '';
        if (practica.materiales && practica.materiales.length > 0) {
            practica.materiales.forEach((material, index) => {
                materialesHTML += `
                    <div class="editar-material-practica-row row mb-2">
                        <div class="col-md-6">
                            <select class="form-select editar-material-practica-select" required>
                                <option value="">Seleccionar material...</option>
                                ${this.generarOpcionesMateriales(material.material_id)}
                            </select>
                        </div>
                        <div class="col-md-4">
                            <input type="number" class="form-control editar-cantidad-requerida" 
                                placeholder="Cantidad" min="1" value="${material.cantidad_requerida || 1}" required>
                        </div>
                        <div class="col-md-2">
                            <button type="button" class="btn btn-danger btn-sm w-100 quitar-material-practica-edicion" 
                                    onclick="gestion.quitarFilaMaterialPracticaEdicion(this)">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
        } else {
            materialesHTML = `
                <div class="editar-material-practica-row row mb-2">
                    <div class="col-md-6">
                        <select class="form-select editar-material-practica-select" required>
                            <option value="">Seleccionar material...</option>
                            ${this.generarOpcionesMateriales()}
                        </select>
                    </div>
                    <div class="col-md-4">
                        <input type="number" class="form-control editar-cantidad-requerida" placeholder="Cantidad" min="1" required>
                    </div>
                    <div class="col-md-2">
                        <button type="button" class="btn btn-danger btn-sm w-100 quitar-material-practica-edicion" 
                                onclick="gestion.quitarFilaMaterialPracticaEdicion(this)" disabled>
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
        }

        return `
            <form id="formEdicionPractica">
                <div class="row">
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label for="editarPracticaCarrera" class="form-label">Carrera *</label>
                            <select class="form-select" id="editarPracticaCarrera" required 
                                    onchange="gestion.actualizarAsignaturasEnEdicion()">
                                ${opcionesCarreras}
                            </select>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label for="editarPracticaAsignatura" class="form-label">Asignatura *</label>
                            <select class="form-select" id="editarPracticaAsignatura" required>
                                ${opcionesAsignaturas}
                            </select>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-4">
                        <div class="mb-3">
                            <label for="editarPracticaNumero" class="form-label">Número *</label>
                            <input type="number" class="form-control" id="editarPracticaNumero" 
                                value="${practica.numero || ''}" min="1" required>
                        </div>
                    </div>
                    <div class="col-md-8">
                        <div class="mb-3">
                            <label for="editarPracticaNombre" class="form-label">Nombre de la Práctica *</label>
                            <input type="text" class="form-control" id="editarPracticaNombre" 
                                value="${practica.nombre || ''}" required>
                        </div>
                    </div>
                </div>
                <div class="mb-3">
                    <label for="editarPracticaDescripcion" class="form-label">Descripción</label>
                    <textarea class="form-control" id="editarPracticaDescripcion" rows="2">${practica.descripcion || ''}</textarea>
                </div>
                
                <!-- Materiales requeridos para la práctica -->
                <div class="mb-3">
                    <label class="form-label">Materiales Requeridos</label>
                    <div id="editarMaterialesPracticaContainer">
                        ${materialesHTML}
                    </div>
                    <button type="button" class="btn btn-secondary btn-sm mt-2" 
                            onclick="gestion.agregarFilaMaterialPracticaEdicion()">
                        <i class="fas fa-plus"></i> Agregar Material
                    </button>
                </div>
            </form>
        `;
    }

actualizarAsignaturasEnEdicion() {
    const selectCarrera = document.getElementById('editarPracticaCarrera');
    const selectAsignatura = document.getElementById('editarPracticaAsignatura');
    
    if (!selectCarrera || !selectAsignatura) return;
    
    const carreraId = selectCarrera.value;
    
    selectAsignatura.innerHTML = '<option value="">Seleccionar asignatura...</option>';
    
    if (!carreraId) {
        selectAsignatura.disabled = true;
        return;
    }
    
    selectAsignatura.disabled = false;
    
    // Filtrar asignaturas por carrera
    const asignaturasFiltradas = this.asignaturas.filter(
        a => a.carrera_id == carreraId && a.activa
    );
    
    // Agregar nuevas opciones
    asignaturasFiltradas.forEach(asignatura => {
        const option = document.createElement('option');
        option.value = asignatura.id;
        option.textContent = asignatura.nombre;
        selectAsignatura.appendChild(option);
    });
}

// Funcion para actualizar asignaturas en edicion
actualizarAsignaturasEdicion(carreraId) {
    const selectAsignatura = document.getElementById('editarPracticaAsignatura');
    selectAsignatura.innerHTML = '<option value="">Seleccionar asignatura...</option>';
    
    if (carreraId) {
        // Filtrar asignaturas por carrera
        const asignaturasFiltradas = this.asignaturas.filter(a => 
            a.carrera_id == carreraId && a.activa
        );
        
        // Agregar opciones
        asignaturasFiltradas.forEach(asignatura => {
            const option = document.createElement('option');
            option.value = asignatura.id;
            option.textContent = asignatura.nombre;
            selectAsignatura.appendChild(option);
        });
    }
}

// Funcion para cargar materiales en selectores
cargarMaterialesEnSelectores() {
    const selects = document.querySelectorAll('.editar-material-practica-select');
    
    selects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Seleccionar material...</option>';
        
        this.materiales.forEach(material => {
            const option = document.createElement('option');
            option.value = material.id;
            option.textContent = `${material.nombre} (Disponible: ${material.cantidad_disponible})`;
            select.appendChild(option);
        });
        
        // Restaurar valor
        if (currentValue) {
            select.value = currentValue;
        }
    });
}

inicializarSelectsEdicion(tipo, elemento) {
    if (tipo === 'asignatura') {
    }
    else if (tipo === 'docente') {
    }
    else if (tipo === 'practica') {
        // Cargar asignaturas cuando cambie la carrera
        const selectCarrera = document.getElementById('editarPracticaCarrera');
        const selectAsignatura = document.getElementById('editarPracticaAsignatura');
        
        if (selectCarrera && selectAsignatura) {
            // Cargar asignaturas para la carrera seleccionada
            selectCarrera.addEventListener('change', (e) => {
                const carreraId = e.target.value;
                this.cargarAsignaturasPorCarrera(carreraId, selectAsignatura);
            });
            
            // Carga las asignaturas de la carrera seleccionada
            if (elemento.carrera_id) {
                this.cargarAsignaturasPorCarrera(elemento.carrera_id, selectAsignatura, elemento.asignatura_id);
            }
        }
    }
}

cargarAsignaturasPorCarrera(carreraId, selectElement, asignaturaIdSeleccionada = null) {
    selectElement.innerHTML = '<option value="">Seleccionar asignatura...</option>';
    
    if (!carreraId) {
        selectElement.disabled = true;
        return;
    }
    
    selectElement.disabled = false;
    
    // Filtrar asignaturas por carrera
    const asignaturasFiltradas = this.asignaturas.filter(
        a => a.carrera_id == carreraId && a.activa
    );
    
    // Agregar opciones
    asignaturasFiltradas.forEach(asignatura => {
        const option = document.createElement('option');
        option.value = asignatura.id;
        option.textContent = asignatura.nombre;
        
        // Valida
        if (asignaturaIdSeleccionada && asignatura.id == asignaturaIdSeleccionada) {
            option.selected = true;
        }
        
        selectElement.appendChild(option);
    });
}

cargarMaterialesPracticaEdicion(elemento) {
    // Cargar materiales en los selects
    const selects = document.querySelectorAll('.editar-material-practica-select');
    
    selects.forEach((select, index) => {
        select.innerHTML = '<option value="">Seleccionar material...</option>';
        
        this.materiales.forEach(material => {
            if (material.cantidad_disponible > 0) {
                const option = document.createElement('option');
                option.value = material.id;
                option.textContent = `${material.nombre} (Disponible: ${material.cantidad_disponible})`;
                select.appendChild(option);
            }
        });
        
        // Si hay materiales en el elemento, seleccionarlos
        if (elemento.materiales && elemento.materiales[index]) {
            const materialId = elemento.materiales[index].material_id;
            setTimeout(() => {
                select.value = materialId;
            }, 100);
        }
    });
}

// Funcion para agregar fila de material en edicion
agregarFilaMaterialPracticaEdicion() {
    const container = document.getElementById('editarMaterialesPracticaContainer');
    
    const newRow = document.createElement('div');
    newRow.className = 'editar-material-practica-row row mb-2';
    newRow.innerHTML = `
        <div class="col-md-6">
            <select class="form-select editar-material-practica-select" required>
                <option value="">Seleccionar material...</option>
            </select>
        </div>
        <div class="col-md-4">
            <input type="number" class="form-control editar-cantidad-requerida" placeholder="Cantidad" min="1" required>
        </div>
        <div class="col-md-2">
            <button type="button" class="btn btn-danger btn-sm w-100 quitar-material-practica-edicion" 
                    onclick="gestion.quitarFilaMaterialPracticaEdicion(this)">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    container.appendChild(newRow);
    
    // Cargar materiales en el nuevo select
    this.cargarMaterialesEnSelect(newRow.querySelector('.editar-material-practica-select'));
}

cargarMaterialesEnSelect(selectElement) {
    selectElement.innerHTML = '<option value="">Seleccionar material...</option>';
    
    // Agregar opciones de materiales
    this.materiales.forEach(material => {
        if (material.cantidad_disponible > 0) {
            const option = document.createElement('option');
            option.value = material.id;
            option.textContent = `${material.nombre} (Disponible: ${material.cantidad_disponible})`;
            selectElement.appendChild(option);
        }
    });
}
// Funcion para generar opciones de materiales 
generarOpcionesMateriales(materialIdSeleccionado = null) {
    let opciones = '';
    this.materiales.forEach(material => {
        if (material.cantidad_disponible > 0) {
            const selected = (materialIdSeleccionado && material.id == materialIdSeleccionado) ? 'selected' : '';
            opciones += `<option value="${material.id}" ${selected}>${material.nombre} (Disponible: ${material.cantidad_disponible})</option>`;
        }
    });
    return opciones;
}
// Funcion para quitar fila
quitarFilaMaterialPracticaEdicion(button) {
    const row = button.closest('.editar-material-practica-row');
    const rows = document.querySelectorAll('.editar-material-practica-row');
    
    if (rows.length > 1) {
        row.remove();
    } else {
        showMessage('Debe haber al menos un material en la práctica', 'error');
    }
}

    async guardarEdicion(tipo, id) {
    let data = {};
    
    try {
        switch(tipo) {
            case 'carrera':
                data = {
                    nombre: document.getElementById('editarCarreraNombre').value,
                    abreviatura: document.getElementById('editarCarreraAbreviatura').value
                };
                break;
                
            case 'asignatura':
                data = {
                    nombre: document.getElementById('editarAsignaturaNombre').value,
                    clave: document.getElementById('editarAsignaturaClave').value,
                    carrera_id: parseInt(document.getElementById('editarAsignaturaCarrera').value)
                };
                break;
                
            case 'docente':
                data = {
                    nombre: document.getElementById('editarDocenteNombre').value,
                    email: document.getElementById('editarDocenteEmail').value,
                    carrera_id: parseInt(document.getElementById('editarDocenteCarrera').value)
                };
                break;
                
            case 'practica':
                // Obtener datos
                const asignaturaId = document.getElementById('editarPracticaAsignatura');
                
                if (!asignaturaId || !asignaturaId.value) {
                    showMessage('La asignatura es obligatoria', 'error');
                    return;
                }
                
                // Recolectar materiales
                const materiales = [];
                const materialRows = document.querySelectorAll('.editar-material-practica-row');
                
                materialRows.forEach(row => {
                    const select = row.querySelector('.editar-material-practica-select');
                    const cantidad = row.querySelector('.editar-cantidad-requerida');
                    
                    if (select && select.value && cantidad && cantidad.value) {
                        materiales.push({
                            material_id: parseInt(select.value),
                            cantidad_requerida: parseInt(cantidad.value)
                        });
                    }
                });
                
                if (materiales.length === 0) {
                    showMessage('Debe agregar al menos un material a la práctica', 'error');
                    return;
                }
                
                data = {
                    numero: parseInt(document.getElementById('editarPracticaNumero').value),
                    nombre: document.getElementById('editarPracticaNombre').value,
                    descripcion: document.getElementById('editarPracticaDescripcion').value,
                    asignatura_id: parseInt(asignaturaId.value),
                    materiales: materiales
                };
                break;
                
            case 'material':
                data = {
                    nombre: document.getElementById('editarMaterialNombre').value,
                    descripcion: document.getElementById('editarMaterialDescripcion').value,
                    categoria: document.getElementById('editarMaterialCategoria').value,
                    cantidad_disponible: parseInt(document.getElementById('editarMaterialCantidad').value)
                };
                break;
        }
        
        // Validar datos
        if (tipo === 'carrera' && !data.nombre) {
            showMessage('El nombre de la carrera es obligatorio', 'error');
            return;
        }
        
        // Enviar actualizacion
        const response = await fetch(`/admin/actualizar/${tipo}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage(result.message, 'success');
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalEdicion'));
            modal.hide();
            
            // Recargar datos
            await this.cargarDatosIniciales();
            this.mostrarDatosIniciales();
        } else {
            showMessage(result.message, 'error');
        }
        
    } catch (error) {
        showMessage('Error al guardar los cambios', 'error');
        console.error('Error:', error);
    }
}
}

// Inicializar 
document.addEventListener('DOMContentLoaded', function() {
    window.gestion = new GestionAcademica();
});