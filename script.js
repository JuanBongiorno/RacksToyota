const URL_API = "https://script.google.com/macros/s/AKfycbxf32E1LKbzpHF0WNmvVFN65Wiyg0pDpdQX-Byi58epEVfCCqbelCivA2Qn_wan_39A/exec"; // REEMPLAZAR ESTO

const USUARIOS = {
    "ale": { pass: "suragua3876", nombre: "Ale" },
    "brian": { pass: "suragua1234", nombre: "Brian" },
    "luis": { pass: "1234", nombre: "Luis" },
    "oficina": { pass: "Broncel3876", nombre: "Oficina" }
};

let userActual = "";
let colaEnvio = JSON.parse(localStorage.getItem('cola_suragua') || "[]");

// Iniciar procesador en segundo plano (cada 3 segundos intenta subir)
setInterval(procesarCola, 3000);

function login() {
    const u = document.getElementById('user').value.toLowerCase().trim();
    const p = document.getElementById('pass').value;
    if (USUARIOS[u] && USUARIOS[u].pass === p) {
        userActual = USUARIOS[u].nombre;
        document.getElementById('login-box').classList.add('d-none');
        if (u === "oficina") {
            document.getElementById('office-box').classList.remove('d-none');
        } else {
            document.getElementById('form-box').classList.remove('d-none');
            document.getElementById('repartidor').value = userActual;
            actualizarReloj();
            actualizarContadorUI();
        }
    } else { alert("Datos incorrectos"); }
}

function actualizarReloj() {
    document.getElementById('displayFecha').value = new Date().toLocaleString();
}

// COMPRESIÓN AGRESIVA: 640px de ancho y calidad 0.5. (La foto pesará apenas 60-80KB)
async function comprimirFoto(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_W = 640;
                let w = img.width, h = img.height;
                if (w > MAX_W) { h *= MAX_W / w; w = MAX_W; }
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.5));
            };
        };
    });
}

document.getElementById('rackForm').onsubmit = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btnEnviar');
    const fotoFile = document.getElementById('foto').files[0];

    btn.disabled = true;
    btn.innerHTML = "PROCESANDO...";

    const fotoComprimida = await comprimirFoto(fotoFile);

    const reporte = {
        diaSemana: new Intl.DateTimeFormat('es-ES', { weekday: 'long'}).format(new Date()),
        nroRack: document.getElementById('nroRack').value,
        llenos: document.getElementById('llenos').value,
        vacios: document.getElementById('vacios').value,
        sector: document.getElementById('sector').value,
        lugar: document.getElementById('lugar').value,
        repartidor: userActual,
        observaciones: document.getElementById('obs').value,
        foto: fotoComprimida
    };

    // GUARDAR EN COLA LOCAL
    colaEnvio.push(reporte);
    localStorage.setItem('cola_suragua', JSON.stringify(colaEnvio));

    // LIMPIAR FORMULARIO AL INSTANTE (Latencia Cero)
    document.getElementById('rackForm').reset();
    document.getElementById('repartidor').value = userActual;
    document.getElementById('foto-check').innerText = "";
    document.getElementById('txt-foto').innerText = "📸 SACAR FOTO";
    btn.disabled = false;
    btn.innerHTML = "ENVIAR AHORA";
    
    alert("✅ REPORTE GUARDADO. Se subirá en segundo plano mientras sigues trabajando.");
    actualizarContadorUI();
};

async function procesarCola() {
    if (colaEnvio.length === 0 || !navigator.onLine) return;

    const reporte = colaEnvio[0];
    try {
        const res = await fetch(URL_API, {
            method: "POST",
            mode: 'no-cors', // Evita esperas de seguridad, es mucho más rápido
            body: JSON.stringify(reporte)
        });
        
        colaEnvio.shift();
        localStorage.setItem('cola_suragua', JSON.stringify(colaEnvio));
        actualizarContadorUI();
    } catch (err) {
        console.log("Esperando conexión...");
    }
}

function actualizarContadorUI() {
    const banner = document.getElementById('sync-banner');
    const msg = document.getElementById('sync-msg');
    if (colaEnvio.length > 0) {
        banner.classList.remove('d-none');
        msg.innerText = `Subiendo ${colaEnvio.length} reporte(s) pendiente(s)...`;
    } else {
        banner.classList.add('d-none');
    }
}

document.getElementById('foto').onchange = (e) => {
    if(e.target.files[0]) {
        document.getElementById('foto-check').innerText = "✅ FOTO LISTA";
        document.getElementById('txt-foto').innerText = "🔄 CAMBIAR FOTO";
    }
};

async function buscarRack() {
    const rack = document.getElementById('searchRack').value;
    const resDiv = document.getElementById('historial-results');
    resDiv.innerHTML = "Buscando...";
    try {
        const r = await fetch(URL_API);
        const d = await r.json();
        const f = d.slice(1).filter(x => x[2] == rack);
        resDiv.innerHTML = f.reverse().map(x => `
            <div class="history-item">
                <b>${x[0].split('T')[0]}</b> | Llenos: ${x[3]} | Vacíos: ${x[4]}<br>
                <small>${x[7]}</small> | <a href="${x[9]}" target="_blank" style="color:#00d2ff">Ver Foto</a>
            </div>
        `).join('') || "Sin datos.";
    } catch(e) { resDiv.innerHTML = "Error de red."; }
}