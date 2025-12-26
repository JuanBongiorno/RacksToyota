const URL_API = "https://script.google.com/macros/s/AKfycbzyUnApdsiK2G0pDioq3Y8NWeb-qRAtwlrelrjdRxOcQQpm32_BzQOmQTHvSJO1NIMT/exec"; 

const USUARIOS = {
    "ale": { pass: "suragua3876", nombre: "Ale" },
    "brian": { pass: "suragua1234", nombre: "Brian" },
    "luis": { pass: "1234", nombre: "Luis" },
    "oficina": { pass: "Broncel3876", nombre: "Oficina" }
};

let userActual = "";

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
            setInterval(actualizarReloj, 60000); // Actualiza cada minuto
        }
    } else { 
        alert("Usuario o clave incorrecta"); 
    }
}

function actualizarReloj() {
    const ahora = new Date();
    const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    const fechaStr = ahora.toLocaleDateString('es-ES', opciones);
    document.getElementById('displayFecha').value = fechaStr.charAt(0).toUpperCase() + fechaStr.slice(1);
}

document.getElementById('foto').onchange = (e) => {
    if(e.target.files[0]) {
        document.getElementById('foto-check').innerText = "✅ FOTO CARGADA CORRECTAMENTE";
        document.getElementById('txt-foto').innerText = "📸 CAMBIAR FOTO";
    }
};

document.getElementById('rackForm').onsubmit = function(e) {
    e.preventDefault();
    const btn = document.getElementById('btnEnviar');
    const fotoFile = document.getElementById('foto').files[0];

    if (!fotoFile) { alert("Por favor, capture la foto obligatoria."); return; }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> ENVIANDO...';

    const reader = new FileReader();
    reader.readAsDataURL(fotoFile);
    reader.onload = function() {
        const payload = {
            diaSemana: new Intl.DateTimeFormat('es-ES', { weekday: 'long'}).format(new Date()),
            nroRack: document.getElementById('nroRack').value,
            llenos: document.getElementById('llenos').value,
            vacios: document.getElementById('vacios').value,
            sector: document.getElementById('sector').value,
            lugar: document.getElementById('lugar').value,
            repartidor: userActual,
            observaciones: document.getElementById('obs').value,
            foto: reader.result
        };

        fetch(URL_API, {
            method: "POST",
            body: JSON.stringify(payload)
        })
        .then(() => {
            alert("✅ REPORTE GUARDADO CON ÉXITO");
            document.getElementById('rackForm').reset();
            document.getElementById('repartidor').value = userActual;
            document.getElementById('foto-check').innerText = "";
            document.getElementById('txt-foto').innerText = "📸 SACAR FOTO OBLIGATORIA";
            btn.disabled = false;
            btn.innerHTML = "ENVIAR REPOSICIÓN";
            actualizarReloj();
        })
        .catch(err => {
            alert("Error al enviar. Intente nuevamente.");
            btn.disabled = false;
            btn.innerHTML = "ENVIAR REPOSICIÓN";
        });
    };
};

async function buscarRack() {
    const rack = document.getElementById('searchRack').value;
    const resDiv = document.getElementById('historial-results');
    if(!rack) return;

    resDiv.innerHTML = '<div class="text-center"><div class="spinner-border text-info"></div><p>Buscando historial...</p></div>';
    
    try {
        const response = await fetch(URL_API);
        const data = await response.json();
        const filtrado = data.slice(1).filter(r => r[2] && r[2].toString() === rack);
        
        if(filtrado.length === 0) {
            resDiv.innerHTML = '<p class="text-center">No se encontraron movimientos para este rack.</p>';
        } else {
            resDiv.innerHTML = filtrado.reverse().map(r => `
                <div class="history-item">
                    <div class="d-flex justify-content-between mb-2">
                        <small class="text-info">${r[0].split('T')[0]}</small>
                        <small class="text-white-50">${r[7]}</small>
                    </div>
                    <div class="row">
                        <div class="col-6"><b>Llenos:</b> ${r[3]}</div>
                        <div class="col-6"><b>Vacíos:</b> ${r[4]}</div>
                    </div>
                    <div class="mt-2 small text-white-50"><i>${r[8] || 'Sin observaciones'}</i></div>
                    <a href="${r[9]}" target="_blank" class="btn btn-sm btn-outline-info mt-2 w-100">Ver Evidencia</a>
                </div>
            `).join('');
        }
    } catch(e) { 
        resDiv.innerHTML = '<p class="text-danger">Error de conexión con la base de datos.</p>'; 
    }
}