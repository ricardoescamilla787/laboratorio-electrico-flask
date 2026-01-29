console.log("nuevo_prestamo.js cargado");

// verificar que los event listeners se registren
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM cargado");
    
    const agregarBtn = document.getElementById('agregar-integrante');
    const form = document.getElementById('prestamoForm');
    
    if (agregarBtn) {
        console.log("Botón 'agregar-integrante' encontrado");
        agregarBtn.addEventListener('click', function() {
            console.log("Click en 'Agregar integrante'");
        });
    } else {
        console.log("Botón 'agregar-integrante' NO encontrado");
    }
    
    if (form) {
        console.log("Formulario encontrado");
    } else {
        console.log("Formulario NO encontrado");
    }
});

class NuevoPrestamo {
    constructor() {
        console.log("NuevoPrestamo inicializado");
        console.log("FirmaDigital disponible:", typeof FirmaDigital);
        console.log("window.firmas:", window.firmas);
        this.carreras = [];
        this.asignaturas = [];
        this.docentes = [];
        this.practicas = [];
        this.materialesPractica = [];
        this.init();
    }

    async init() {
        await this.cargarDatosIniciales();
        this.configurarEventListeners();
        this.establecerFechaHoraActual();
    }

    async cargarDatosIniciales() {
        try {
            // Cargar carreras
            const carrerasResponse = await fetch('/api/carreras');
            this.carreras = await carrerasResponse.json();
            this.actualizarSelectCarreras();
            
        } catch (error) {
            console.error('Error cargando datos:', error);
            showMessage('Error al cargar los datos iniciales', 'error');
        }
    }

    configurarEventListeners() {
        // Formulario principal
        document.getElementById('prestamoForm').addEventListener('submit', (e) => this.enviarFormulario(e));
        
        // Selects
        document.getElementById('carrera').addEventListener('change', () => this.actualizarAsignaturasYDocentes());
        document.getElementById('asignatura').addEventListener('change', () => this.actualizarPracticas());
        document.getElementById('practica').addEventListener('change', () => this.actualizarMateriales());
        
        // Integrantes
        document.getElementById('agregar-integrante').addEventListener('click', () => this.agregarIntegrante());
        
        // Quitar integrante
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('quitar-integrante')) {
                this.quitarIntegrante(e.target);
            }
        });
    }

    establecerFechaHoraActual() {
        const now = new Date();
        const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
        document.getElementById('fecha_hora').value = localDateTime;
    }

    actualizarSelectCarreras() {
        const selectCarrera = document.getElementById('carrera');
        selectCarrera.innerHTML = '<option value="">Seleccionar carrera...</option>';
        
        this.carreras.forEach(carrera => {
            const option = document.createElement('option');
            option.value = carrera.id;
            option.textContent = carrera.nombre;
            selectCarrera.appendChild(option);
        });
    }

    async actualizarAsignaturasYDocentes() {
        const carreraId = document.getElementById('carrera').value;
        const selectAsignatura = document.getElementById('asignatura');
        const selectDocente = document.getElementById('docente');
        const selectPractica = document.getElementById('practica');
        
        selectAsignatura.innerHTML = '<option value="">Cargando asignaturas...</option>';
        selectAsignatura.disabled = true;
        selectDocente.innerHTML = '<option value="">Cargando docentes...</option>';
        selectDocente.disabled = true;
        selectPractica.innerHTML = '<option value="">Primero selecciona una asignatura</option>';
        selectPractica.disabled = true;
        
        if (!carreraId) {
            selectAsignatura.innerHTML = '<option value="">Primero selecciona una carrera</option>';
            selectDocente.innerHTML = '<option value="">Primero selecciona una carrera</option>';
            return;
        }

        try {
            // Cargar asignaturas y docentes
            const [asignaturasResponse, docentesResponse] = await Promise.all([
                fetch(`/api/asignaturas?carrera_id=${carreraId}`),
                fetch(`/api/docentes?carrera_id=${carreraId}`)
            ]);

            this.asignaturas = await asignaturasResponse.json();
            this.docentes = await docentesResponse.json();

            selectAsignatura.innerHTML = '<option value="">Seleccionar asignatura...</option>';
            this.asignaturas.forEach(asignatura => {
                const option = document.createElement('option');
                option.value = asignatura.id;
                option.textContent = asignatura.nombre;
                selectAsignatura.appendChild(option);
            });
            selectAsignatura.disabled = false;

            selectDocente.innerHTML = '<option value="">Seleccionar docente...</option>';
            this.docentes.forEach(docente => {
                const option = document.createElement('option');
                option.value = docente.id;
                option.textContent = docente.nombre;
                selectDocente.appendChild(option);
            });
            selectDocente.disabled = false;

        } catch (error) {
            console.error('Error cargando datos:', error);
            showMessage('Error al cargar las asignaturas y docentes', 'error');
        }
    }

    async actualizarPracticas() {
        const asignaturaId = document.getElementById('asignatura').value;
        const selectPractica = document.getElementById('practica');
        
        selectPractica.innerHTML = '<option value="">Cargando prácticas...</option>';
        selectPractica.disabled = true;
        
        if (!asignaturaId) {
            selectPractica.innerHTML = '<option value="">Primero selecciona una asignatura</option>';
            return;
        }

        try {
            const response = await fetch(`/api/practicas?asignatura_id=${asignaturaId}`);
            this.practicas = await response.json();

            selectPractica.innerHTML = '<option value="">Seleccionar práctica...</option>';
            this.practicas.forEach(practica => {
                const option = document.createElement('option');
                option.value = practica.id;
                option.textContent = `#${practica.numero} - ${practica.nombre}`;
                selectPractica.appendChild(option);
            });
            selectPractica.disabled = false;

        } catch (error) {
            console.error('Error cargando prácticas:', error);
            showMessage('Error al cargar las prácticas', 'error');
        }
    }

    async actualizarMateriales() {
        const practicaId = document.getElementById('practica').value;
        const container = document.getElementById('materiales-container');
        
        container.innerHTML = '<div class="text-center py-3"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Cargando materiales...</p></div>';
        this.materialesPractica = [];
        
        if (!practicaId) {
            container.innerHTML = '<div class="alert alert-info">Selecciona una práctica para ver los materiales requeridos</div>';
            return;
        }

        try {
            const response = await fetch(`/api/practica/${practicaId}/materiales`);
            this.materialesPractica = await response.json();

            if (this.materialesPractica.length === 0) {
                container.innerHTML = '<div class="alert alert-warning">No hay materiales definidos para esta práctica</div>';
                return;
            }

            let html = '';
            this.materialesPractica.forEach(material => {
                html += `
                    <div class="material-row row mb-2">
                        <div class="col-md-6">
                            <input type="text" class="form-control" value="${material.nombre}" readonly>
                            <input type="hidden" name="material_id" value="${material.id}">
                        </div>
                        <div class="col-md-4">
                            <input type="number" class="form-control cantidad-input" 
                                   name="cantidad" value="${material.cantidad_requerida}" 
                                   min="1" max="${material.cantidad_disponible}" 
                                   data-stock="${material.cantidad_disponible}" required>
                            <div class="form-text">
                                Disponible: ${material.cantidad_disponible} | Requerido: ${material.cantidad_requerida}
                            </div>
                        </div>
                        <div class="col-md-2">
                            <button type="button" class="btn btn-outline-secondary btn-sm w-100" disabled>
                                <i class="fas fa-lock"></i>
                            </button>
                        </div>
                    </div>
                `;
            });

            container.innerHTML = html;

            // Validacion para cantidades
            container.addEventListener('input', (e) => {
                if (e.target.classList.contains('cantidad-input')) {
                    this.validarCantidad(e.target);
                }
            });

        } catch (error) {
            console.error('Error cargando materiales:', error);
            container.innerHTML = '<div class="alert alert-danger">Error al cargar los materiales de la práctica</div>';
        }
    }

    validarCantidad(input) {
        const stock = parseInt(input.dataset.stock);
        const cantidad = parseInt(input.value);
        
        if (cantidad > stock) {
            input.classList.add('is-invalid');
            input.setCustomValidity(`Solo hay ${stock} unidades disponibles`);
        } else {
            input.classList.remove('is-invalid');
            input.setCustomValidity('');
        }
    }

    agregarIntegrante() {
    console.log("Agregando nuevo integrante...");
    
    const container = document.getElementById('integrantes-container');
    const newRow = document.createElement('div');
    newRow.className = 'integrante-row row mb-4';
    newRow.innerHTML = `
        <div class="col-md-6">
            <div class="mb-3">
                <label class="form-label">Nombre completo *</label>
                <input type="text" class="form-control integrante-nombre" placeholder="Nombre completo" required>
            </div>
            <div class="mb-3">
                <label class="form-label">Número de control</label>
                <input type="text" class="form-control integrante-control" placeholder="Número de control">
            </div>
        </div>
        <div class="col-md-6">
            <div class="mb-3">
                <label class="form-label">Firma digital *</label>
                <div class="firma-container border rounded p-3 bg-light">
                    <canvas class="firma-canvas" width="400" height="150" style="border: 1px solid #ccc; background: white; cursor: crosshair;"></canvas>
                    <div class="mt-2">
                        <button type="button" class="btn btn-sm btn-outline-secondary btn-limpiar-firma">
                            <i class="fas fa-eraser"></i> Limpiar
                        </button>
                        <small class="text-muted ms-2">Firme en el área arriba</small>
                    </div>
                    <input type="hidden" class="firma-data">
                </div>
            </div>
        </div>
        <div class="col-12">
            <button type="button" class="btn btn-danger btn-sm quitar-integrante">
                <i class="fas fa-times"></i> Quitar Integrante
            </button>
        </div>
    `;
    
    container.appendChild(newRow);
    
    // Inicializar nueva firma
    setTimeout(() => {
        const canvas = newRow.querySelector('.firma-canvas');
        if (canvas && window.FirmaDigital) {
            console.log("Inicializando nueva firma...");
            const firma = new FirmaDigital(canvas);
            
            if (!window.firmas) {
                window.firmas = new Map();
            }
            window.firmas.set(canvas, firma);
            
            const btnLimpiar = newRow.querySelector('.btn-limpiar-firma');
            if (btnLimpiar) {
                btnLimpiar.addEventListener('click', () => firma.limpiarCanvas());
            }
        } else {
            console.error("No se pudo inicializar la firma:", { canvas, FirmaDigital: window.FirmaDigital });
        }
    }, 100);
    
    this.actualizarBotonesQuitar();
    console.log("Integrante agregado correctamente");
}

    quitarIntegrante(button) {
        const row = button.closest('.integrante-row');
        const rows = document.querySelectorAll('.integrante-row');
        
        if (rows.length > 1) {
            row.remove();
            this.actualizarBotonesQuitar();
        } else {
            showMessage('Debe haber al menos un integrante en el equipo', 'error');
        }
    }

    actualizarBotonesQuitar() {
        const buttons = document.querySelectorAll('.quitar-integrante');
        const rows = document.querySelectorAll('.integrante-row');
        
        buttons.forEach(btn => {
            btn.disabled = rows.length <= 1;
        });
    }

    async enviarFormulario(e) {
        e.preventDefault();
        
        const form = e.target;
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = showLoading(submitButton);

        try {
            // Validar formulario
            if (!form.checkValidity()) {
                form.classList.add('was-validated');
                hideLoading(submitButton, originalText);
                return;
            }

            const formData = this.prepararDatosFormulario();
            
            if (!this.validarDatosFormulario(formData)) {
                hideLoading(submitButton, originalText);
                return;
            }

            // Enviar datos
            const response = await fetch('/nuevo-prestamo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();
            
            if (result.success) {
                showMessage(result.message, 'success');
                this.resetFormulario();
            } else {
                showMessage(result.message, 'error');
            }
            
        } catch (error) {
            console.error('Error:', error);
            showMessage('Error al procesar la solicitud', 'error');
        } finally {
            hideLoading(submitButton, originalText);
        }
    }

        prepararDatosFormulario() {
            const formData = {
                fecha_hora: document.getElementById('fecha_hora').value,
                carrera_id: parseInt(document.getElementById('carrera').value),
                asignatura_id: parseInt(document.getElementById('asignatura').value),
                docente_id: parseInt(document.getElementById('docente').value),
                practica_id: parseInt(document.getElementById('practica').value),
                lugar_uso: document.getElementById('lugar_uso').value,
                observaciones: document.getElementById('observaciones').value,
                importancia_observacion: document.getElementById('importancia_observacion').value,
                materiales: [],
                integrantes: []
            };

        // Recolectar materiales
        document.querySelectorAll('.material-row').forEach(row => {
            const materialId = row.querySelector('input[name="material_id"]').value;
            const cantidad = row.querySelector('.cantidad-input').value;
            
            formData.materiales.push({
                material_id: parseInt(materialId),
                cantidad: parseInt(cantidad)
            });
        });

        // Recolectar integrantes con firmas
        document.querySelectorAll('.integrante-row').forEach((row, index) => {
            const nombre = row.querySelector('.integrante-nombre').value;
            const control = row.querySelector('.integrante-control').value;
            const firmaData = row.querySelector('.firma-data').value;
            
            formData.integrantes.push({
                nombre: nombre,
                no_control: control || '',
                firma_data: firmaData || ''
            });
        });

        return formData;
    }

    //validar no haya formularios vacios
    validarDatosFormulario(formData) {
        if (formData.materiales.length === 0) {
            showMessage('Debe haber al menos un material en la solicitud', 'error');
            return false;
        }

        if (formData.integrantes.length === 0) {
            showMessage('Debe haber al menos un integrante en el equipo', 'error');
            return false;
        }

        const validacionFirmas = validarFirmas();
        if (!validacionFirmas.todasValidas) {
            showMessage('Todos los integrantes deben firmar digitalmente', 'error');
            return false;
        }

        // Validar cantidades vs stock
        for (const material of formData.materiales) {
            const materialInfo = this.materialesPractica.find(m => m.id === material.material_id);
            if (materialInfo && material.cantidad > materialInfo.cantidad_disponible) {
                showMessage(`La cantidad solicitada para ${materialInfo.nombre} excede el stock disponible`, 'error');
                return false;
            }
        }

        return true;
    }


    resetFormulario() {
        document.getElementById('prestamoForm').reset();
        this.establecerFechaHoraActual();
        
        document.getElementById('asignatura').innerHTML = '<option value="">Primero selecciona una carrera</option>';
        document.getElementById('asignatura').disabled = true;
        document.getElementById('docente').innerHTML = '<option value="">Primero selecciona una carrera</option>';
        document.getElementById('docente').disabled = true;
        document.getElementById('practica').innerHTML = '<option value="">Primero selecciona una asignatura</option>';
        document.getElementById('practica').disabled = true;
        
        // Limpiar 
        document.getElementById('materiales-container').innerHTML = '<div class="alert alert-info">Selecciona una práctica para ver los materiales requeridos</div>';
        document.getElementById('integrantes-container').innerHTML = `
            <div class="integrante-row row mb-2">
                <div class="col-md-6">
                    <input type="text" class="form-control" name="integrante_nombre" placeholder="Nombre completo *" required>
                </div>
                <div class="col-md-4">
                    <input type="text" class="form-control" name="integrante_control" placeholder="Número de control">
                </div>
                <div class="col-md-2">
                    <button type="button" class="btn btn-danger btn-sm w-100 quitar-integrante" disabled>
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
        
        this.actualizarBotonesQuitar();
    }
}

// Funciones globales para previsualizar
function previsualizar() {
    if (!window.gestion) {
        showMessage('Error: El formulario no está inicializado', 'error');
        return;
    }
    
    const formData = window.gestion.prepararDatosFormulario();
    
    if (!window.gestion.validarDatosFormulario(formData)) {
        return;
    }
    
    const previewContent = generarContenidoPrevisualizacion(formData);
    document.getElementById('preview-content').innerHTML = previewContent;
    
    const previewModal = new bootstrap.Modal(document.getElementById('previewModal'));
    previewModal.show();
}

function generarContenidoPrevisualizacion(formData) {
    const carreraNombre = document.getElementById('carrera').options[document.getElementById('carrera').selectedIndex].text;
    const asignaturaNombre = document.getElementById('asignatura').options[document.getElementById('asignatura').selectedIndex].text;
    const docenteNombre = document.getElementById('docente').options[document.getElementById('docente').selectedIndex].text;
    const practicaTexto = document.getElementById('practica').options[document.getElementById('practica').selectedIndex].text;

    let content = `INSTITUTO TECNOLÓGICO DE PACHUCA\n`;
    content += `DEPARTAMENTO DE INGENIERÍA ELÉCTRICA Y ELECTRÓNICA\n`;
    content += `LABORATORIO DE ELÉCTRICA\n\n`;
    content += `SOLICITUD PARA PRÉSTAMO DE MATERIAL, EQUIPO O HERRAMIENTA\n\n`;
    content += `Fecha/Hora: ${formatDate(formData.fecha_hora)}\n`;
    content += `Carrera: ${carreraNombre}\n`;
    content += `Asignatura: ${asignaturaNombre}\n`;
    content += `Docente: ${docenteNombre}\n`;
    content += `Práctica: ${practicaTexto}\n\n`;
    
    content += `MATERIALES SOLICITADOS:\n`;
    content += `Cantidad    Descripción\n`;
    content += `────────    ────────────\n`;
    
    formData.materiales.forEach(material => {
        const materialInfo = window.gestion?.materialesPractica.find(m => m.id === material.material_id);
        content += `${material.cantidad.toString().padEnd(12)} ${materialInfo?.nombre || 'Material'}\n`;
    });
    
    content += `\nLUGAR DE USO: ${formData.lugar_uso}\n`;
    content += `OBSERVACIONES: ${formData.observaciones || 'Ninguna'}\n\n`;
    
    content += `INTEGRANTES DEL EQUIPO:\n`;
    content += `Nombre y firma                    No. Control\n`;
    content += `───────────────────────────────── ───────────\n`;
    
    formData.integrantes.forEach(integrante => {
        content += `${integrante.nombre.padEnd(35)} ${integrante.no_control || ''}\n`;
    });
    
    content += `\n\nRECIBÍ: ___________________________\n`;
    content += `ENTREGÓ: __________________________\n`;
    
    return `<pre>${content}</pre>`;
}

function imprimirPreview() {
    const previewContent = document.getElementById('preview-content').querySelector('pre').innerText;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Comprobante de Préstamo</title>
                <style>
                    body { font-family: 'Courier New', monospace; margin: 20px; }
                    pre { white-space: pre-wrap; font-size: 12px; }
                    @media print { 
                        body { margin: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <pre>${previewContent}</pre>
                <div class="no-print" style="margin-top: 20px; text-align: center;">
                    <button onclick="window.print()">Imprimir</button>
                    <button onclick="window.close()">Cerrar</button>
                </div>
            </body>
        </html>
    `);
    printWindow.document.close();
}

// Inicializar
document.addEventListener('DOMContentLoaded', function() {
    window.gestion = new NuevoPrestamo();
});