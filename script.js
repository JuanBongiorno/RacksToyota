// CONFIGURACIÓN - REEMPLAZA CON TU URL
const URL_API = "https://script.google.com/macros/s/AKfycbx-RTlSpfcNb0ASawBHC6exk85T9TAlldWoBbP_NFzNEtE7XezLwYGVNGsUXbKOxXkZ/exec"; 

const USUARIOS = {
    "ale": { pass: "suragua3876", nombre: "Ale" },
    "brian": { pass: "suragua1234", nombre: "Brian" },
    "luis": { pass: "1234", nombre: "Luis" },
    "oficina": { pass: "Broncel3876", nombre: "Oficina" }
};

let userActual = "";

// 1. REGISTRO DE SERVICE WORKER PARA CARGA OFFLINE
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log(err));
    });
}

// 2. LÓGICA DE INICIO
function login() {
    const u = document.getElementById('user').value.toLowerCase().trim();
    const p = document.getElementById('pass').value.trim();
    
    if (USUARIOS[u] && USUARIOS[u].pass === p) {
        userActual = USUARIOS[u].nombre;
        document.getElementById('login-box').style.display = 'none';
        
        if (u === "oficina") {
            document.getElementById('office-box').classList.remove('d-none');
        } else {
            document.getElementById('form-box').classList.remove('d-none');
            document.getElementById('repartidor').value = userActual;
            actualizarReloj();
            checkPendingSync(); 
        }
    } else { alert("Usuario o clave incorrecta"); }
}

function actualizarReloj() {
    const ahora = new Date();
    const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    document.getElementById('displayFecha').value = ahora.toLocaleDateString('es-ES', opciones);
}

// 3. COMPRESIÓN DE IMAGEN (Esto hace que sea RAPIDO)
async function procesarImagen(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800; // Resolución optimizada
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                } else {
                    if (height > MAX_WIDTH) { width *= MAX_WIDTH / height; height = MAX_WIDTH; }
                }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7)); // Calidad 70%
            };
        };
    });
}

// 4. ENVÍO DE FORMULARIO
document.getElementById('rackForm').onsubmit = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btnEnviar');
    const fotoFile = document.getElementById('foto').files[0];

    btn.disabled = true;
    btn.innerHTML = "PROCESANDO...";

    const fotoComprimida = await procesarImagen(fotoFile);

    const data = {
        diaSemana: new Intl.DateTimeFormat('es-ES', { weekday: 'long'}).format(new Date()),
        nroRack: document.getElementById('nroRack').value,
        llenos: document.getElementById('llenos').value,
        vacios: document.getElementById('vacios').value,
        sector: document.getElementById('sector').value,
        lugar: document.getElementById('lugar').value,
        repartidor: userActual,
        observaciones: document.getElementById('obs').value,
        foto: fotoComprimida,
        timestamp: new Date().getTime()
    };

    if (navigator.onLine) {
        enviarServidor(data);
    } else {
        guardarLocal(data);
    }
};

function enviarServidor(data) {
    fetch(URL_API, {
        method: "POST",
        mode: 'no-cors',
        body: JSON.stringify(data)
    }).then(() => {
        alert("✅ ENVIADO A LA NUBE");
        limpiarForm();
    }).catch(() => guardarLocal(data));
}

function guardarLocal(data) {
    let cola = JSON.parse(localStorage.getItem('cola_racks') || "[]");
    cola.push(data);
    localStorage.setItem('cola_racks', JSON.stringify(cola));
    alert("⚠️ GUARDADO EN MEMORIA (Sin internet). Se subirá solo cuando vuelvas a tener señal.");
    limpiarForm();
}

function limpiarForm() {
    document.getElementById('rackForm').reset();
    document.getElementById('repartidor').value = userActual;
    document.getElementById('foto-check').innerText = "";
    document.getElementById('btnEnviar').disabled = false;
    document.getElementById('btnEnviar').innerHTML = "ENVIAR REPORTE";
}

// 5. SINCRONIZACIÓN AUTOMÁTICA
async function checkPendingSync() {
    if (!navigator.onLine) return;
    let cola = JSON.parse(localStorage.getItem('cola_racks') || "[]");
    if (cola.length === 0) return;

    document.getElementById('sync-tag').classList.remove('d-none');
    for (let item of cola) {
        await fetch(URL_API, { method: "POST", mode: 'no-cors', body: JSON.stringify(item) });
    }
    localStorage.removeItem('cola_racks');
    document.getElementById('sync-tag').classList.add('d-none');
    alert("✅ DATOS SINCRONIZADOS: " + cola.length + " reportes subidos.");
}

// Detectar conexión
window.addEventListener('online', () => {
    document.getElementById('offline-tag').classList.add('d-none');
    checkPendingSync();
});
window.addEventListener('offline', () => {
    document.getElementById('offline-tag').classList.remove('d-none');
});

// Foto check
document.getElementById('foto').onchange = (e) => {
    if(e.target.files[0]) {
        document.getElementById('foto-check').innerText = "✅ FOTO LISTA";
    }
};

// Buscar Rack (Solo con internet)
async function buscarRack() {
    const rack = document.getElementById('searchRack').value;
    const resDiv = document.getElementById('historial-results');
    resDiv.innerHTML = "Buscando...";
    
    try {
        const response = await fetch(URL_API);
        const data = await response.json();
        const filtrado = data.slice(1).filter(r => r[2] && r[2].toString() === rack);
        
        resDiv.innerHTML = filtrado.reverse().map(r => `
            <div class="history-item">
                <small>${r[0].split('T')[0]} - ${r[7]}</small><br>
                <b>Llenos: ${r[3]} | Vacíos: ${r[4]}</b><br>
                <a href="${r[9]}" target="_blank" class="btn btn-sm btn-outline-info mt-2">Ver Foto</a>
            </div>
        `).join('');
    } catch(e) { resDiv.innerHTML = "Error de conexión."; }
}