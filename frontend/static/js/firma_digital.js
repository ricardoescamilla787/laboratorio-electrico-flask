class FirmaDigital {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.dibujando = false;
        this.ultimoX = 0;
        this.ultimoY = 0;
        this.firmaData = '';
        
        this.inicializarEventos();
        this.limpiarCanvas();
    }

    inicializarEventos() {
        this.canvas.addEventListener('mousedown', (e) => this.iniciarDibujo(e));
        this.canvas.addEventListener('mousemove', (e) => this.dibujar(e));
        this.canvas.addEventListener('mouseup', () => this.terminarDibujo());
        this.canvas.addEventListener('mouseout', () => this.terminarDibujo());

        this.canvas.addEventListener('touchstart', (e) => this.iniciarDibujoTouch(e));
        this.canvas.addEventListener('touchmove', (e) => this.dibujarTouch(e));
        this.canvas.addEventListener('touchend', () => this.terminarDibujo());

        this.canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    }

    getCoordenadas(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    getCoordenadasTouch(e) {
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        return {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top
        };
    }

    iniciarDibujo(e) {
        this.dibujando = true;
        const coords = this.getCoordenadas(e);
        this.ultimoX = coords.x;
        this.ultimoY = coords.y;
    }

    iniciarDibujoTouch(e) {
        e.preventDefault();
        this.dibujando = true;
        const coords = this.getCoordenadasTouch(e);
        this.ultimoX = coords.x;
        this.ultimoY = coords.y;
    }

    dibujar(e) {
        if (!this.dibujando) return;
        
        const coords = this.getCoordenadas(e);
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.ultimoX, this.ultimoY);
        this.ctx.lineTo(coords.x, coords.y);
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.stroke();
        
        this.ultimoX = coords.x;
        this.ultimoY = coords.y;

        this.guardarFirma();
    }

    dibujarTouch(e) {
        if (!this.dibujando) return;
        e.preventDefault();
        
        const coords = this.getCoordenadasTouch(e);
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.ultimoX, this.ultimoY);
        this.ctx.lineTo(coords.x, coords.y);
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 3; 
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.stroke();
        
        this.ultimoX = coords.x;
        this.ultimoY = coords.y;

        this.guardarFirma();
    }

    terminarDibujo() {
        this.dibujando = false;
        this.guardarFirma();
    }

    limpiarCanvas() {
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.firmaData = '';
        this.actualizarInputFirma();
    }

    guardarFirma() {
        this.firmaData = this.canvas.toDataURL('image/png');
        this.actualizarInputFirma();
    }

    actualizarInputFirma() {
        const inputFirma = this.canvas.closest('.firma-container').querySelector('.firma-data');
        if (inputFirma) {
            inputFirma.value = this.firmaData;
        }
    }

    tieneFirma() {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            if (data[i] !== 255 || data[i + 1] !== 255 || data[i + 2] !== 255) {
                return true;
            }
        }
        return false;
    }
}

// Inicializar sistema de firmas
document.addEventListener('DOMContentLoaded', function() {
    window.firmas = new Map(); 
    
    // Inicializar firmas existentes
    document.querySelectorAll('.firma-canvas').forEach((canvas, index) => {
        const firma = new FirmaDigital(canvas);
        window.firmas.set(canvas, firma);
        
        const btnLimpiar = canvas.closest('.firma-container').querySelector('.btn-limpiar-firma');
        if (btnLimpiar) {
            btnLimpiar.addEventListener('click', () => firma.limpiarCanvas());
        }
    });
});

// Valida firmas antes de enviar
function validarFirmas() {
    const firmasValidas = [];
    let todasValidas = true;
    
    document.querySelectorAll('.firma-canvas').forEach((canvas, index) => {
        const firma = window.firmas.get(canvas);
        const nombreInput = canvas.closest('.integrante-row').querySelector('.integrante-nombre');
        const nombre = nombreInput ? nombreInput.value.trim() : '';
        
        if (firma && firma.tieneFirma() && nombre) {
            firmasValidas.push({
                canvas: canvas,
                firma: firma,
                nombre: nombre
            });
        } else if (nombre) {
            todasValidas = false;
            const firmaContainer = canvas.closest('.firma-container');
            firmaContainer.style.border = '2px solid #dc3545';
            
            let errorMsg = firmaContainer.querySelector('.error-firma');
            if (!errorMsg) {
                errorMsg = document.createElement('div');
                errorMsg.className = 'error-firma text-danger small mt-1';
                firmaContainer.appendChild(errorMsg);
            }
            errorMsg.textContent = 'Firma requerida para ' + nombre;
        }
    });
    
    return {
        todasValidas: todasValidas,
        firmasValidas: firmasValidas
    };
}

// Limpiar errores 
function limpiarErroresFirma() {
    document.querySelectorAll('.firma-container').forEach(container => {
        container.style.border = '';
        const errorMsg = container.querySelector('.error-firma');
        if (errorMsg) {
            errorMsg.remove();
        }
    });
}

window.FirmaDigital = FirmaDigital;

// Inicializar sistema de firmas global
function inicializarSistemaFirmas() {
    window.firmas = new Map();
    
    // Inicializar firmas existentes
    document.querySelectorAll('.firma-canvas').forEach((canvas) => {
        if (!window.firmas.has(canvas)) {
            const firma = new FirmaDigital(canvas);
            window.firmas.set(canvas, firma);
            
            const btnLimpiar = canvas.closest('.firma-container')?.querySelector('.btn-limpiar-firma');
            if (btnLimpiar) {
                btnLimpiar.addEventListener('click', () => firma.limpiarCanvas());
            }
        }
    });
}

// Inicializar 
document.addEventListener('DOMContentLoaded', function() {
    inicializarSistemaFirmas();
});