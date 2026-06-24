<!DOCTYPE html>
<html lang="it" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preventivo On-Line | PrimeFactory</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: { extend: { colors: { brand: { cyan: '#06b6d4', purple: '#a855f7', darkbg: '#0f172a' } } } }
        }
    </script>
    <style>
        .glass-panel {
            background: rgba(30, 41, 59, 0.7);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.08);
        }
    </style>
</head>
<body class="bg-brand-darkbg text-slate-100 min-h-screen flex flex-col justify-between font-sans">

    <header class="w-full max-w-5xl mx-auto p-6 flex justify-between items-center border-b border-slate-800">
        <div class="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-brand-cyan to-brand-purple">PRIMEFACTORY</div>
        <div class="text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-700">Risposta garantita <span class="text-brand-cyan font-bold">&lt; 24h</span></div>
    </header>

    <main class="flex-grow flex items-center justify-center p-4 my-6">
        <div class="w-full max-w-2xl glass-panel rounded-2xl p-8 shadow-2xl">
            
            <div class="mb-8">
                <div class="flex justify-between text-xs font-semibold mb-2 text-slate-400">
                    <span id="lbl1" class="text-brand-cyan">1. ANAGRAFICA</span>
                    <span id="lbl2">2. CONFIGURAZIONE</span>
                    <span id="lbl3">3. FILE & NOTE</span>
                </div>
                <div class="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div id="stepLine" class="h-full bg-gradient-to-r from-brand-cyan to-brand-purple w-1/3 transition-all duration-300"></div>
                </div>
            </div>

            <form id="multiStepForm" novalidate>
                <input type="hidden" id="referral_code_id" name="referral_code_id" value="">

                <div id="part1" class="step-layer space-y-4">
                    <h2 class="text-lg font-bold text-white">Dati di contatto</h2>
                    <div>
                        <label class="block text-sm mb-1 text-slate-300">Nome o Azienda *</label>
                        <input type="text" id="client_name" name="client_name" required minlength="3" class="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-cyan">
                    </div>
                    <div>
                        <label class="block text-sm mb-1 text-slate-300">Indirizzo Email *</label>
                        <input type="email" id="client_email" name="client_email" required class="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-cyan">
                    </div>
                    <div>
                        <label class="block text-sm mb-1 text-slate-300">Codice Convenzione (Opzionale)</label>
                        <div class="flex gap-2">
                            <input type="text" id="ref_code" class="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-2 uppercase text-white focus:outline-none">
                            <button type="button" id="verifyBtn" class="bg-slate-800 hover:bg-slate-700 text-xs px-4 rounded-lg border border-slate-600 transition">Valida</button>
                        </div>
                        <p id="refStatus" class="text-xs mt-1 hidden"></p>
                    </div>
                    <div class="pt-4 flex justify-end">
                        <button type="button" onclick="changeStep(2)" class="bg-gradient-to-r from-brand-cyan to-brand-purple text-slate-900 font-bold px-6 py-2 rounded-lg">Avanti</button>
                    </div>
                </div>

                <div id="part2" class="step-layer hidden space-y-4">
                    <h2 class="text-lg font-bold text-white">Opzioni di Stampa</h2>
                    <div class="space-y-2">
                        <label class="flex items-center p-3 bg-slate-900/40 border border-slate-700 rounded-lg cursor-pointer">
                            <input type="radio" name="service_type" value="service_ready" checked class="mr-3">
                            <div><span class="block text-sm font-bold text-white">File 3D Pronto (.STL, .STEP)</span></div>
                        </label>
                        <label class="flex items-center p-3 bg-slate-900/40 border border-slate-700 rounded-lg cursor-pointer">
                            <input type="radio" name="service_type" value="service_needs_cad" class="mr-3">
                            <div><span class="block text-sm font-bold text-white">Richiesta di Modellazione o Modifica CAD</span></div>
                        </label>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs mb-1 text-slate-400">Tecnologia indicativa</label>
                            <select name="technology" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm">
                                <option value="FDM">FDM (Filamento)</option>
                                <option value="SLA">SLA (Resina)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs mb-1 text-slate-400">Materiale</label>
                            <select name="material" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm">
                                <option value="PLA">PLA Eco</option>
                                <option value="PETG">PETG Tecnico</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm mb-1 text-slate-300">Volume/Peso stimato del lotto (1-20kg) *</label>
                        <input type="number" id="quantity_kg" name="quantity_kg" min="1" max="20" value="1" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white">
                    </div>
                    <div class="pt-4 flex justify-between">
                        <button type="button" onclick="changeStep(1)" class="text-slate-400 text-sm">Indietro</button>
                        <button type="button" onclick="changeStep(3)" class="bg-gradient-to-r from-brand-cyan to-brand-purple text-slate-900 font-bold px-6 py-2 rounded-lg">Avanti</button>
                    </div>
                </div>

                <div id="part3" class="step-layer hidden space-y-4">
                    <h2 class="text-lg font-bold text-white">Caricamento File</h2>
                    <div id="dropBox" class="border-2 border-dashed border-slate-600 rounded-xl p-6 text-center bg-slate-900/30 cursor-pointer hover:border-brand-purple transition">
                        <input type="file" id="project_files" name="project_files[]" multiple class="hidden">
                        <p class="text-xs text-slate-300">Trascina qui i tuoi modelli o clicca per sfogliare</p>
                        <p class="text-[10px] text-slate-500 mt-1">Estensioni stl, step, stp, obj, png, jpg (Max 35MB ciascuno)</p>
                        <div id="fileMonitor" class="mt-2 text-xs text-brand-cyan space-y-1"></div>
                    </div>

                    <div id="progressZone" class="hidden">
                        <div class="flex justify-between text-[11px] text-slate-400 mb-1">
                            <span>Sincronizzazione file con lo storage...</span>
                            <span id="progressPercent">0%</span>
                        </div>
                        <div class="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div id="progressFill" class="h-full bg-brand-cyan w-0"></div>
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm mb-1 text-slate-300">Specifiche e Note del Progetto *</label>
                        <textarea id="project_notes" name="project_notes" rows="3" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-brand-purple"></textarea>
                    </div>

                    <div class="flex items-start">
                        <input type="checkbox" id="privacy_consent" name="privacy_consent" value="1" required class="mt-1 mr-2 text-brand-purple">
                        <label for="privacy_consent" class="text-[11px] text-slate-400">Acconsento al trattamento dei dati in conformità con il GDPR per le finalità di calcolo strutturale dei pezzi richiesti. *</label>
                    </div>

                    <div id="outputLog" class="text-xs text-red-400 hidden"></div>

                    <div class="pt-4 flex justify-between">
                        <button type="button" onclick="changeStep(2)" class="text-slate-400 text-sm">Indietro</button>
                        <button type="submit" class="bg-gradient-to-r from-brand-cyan to-brand-purple text-slate-900 font-black px-6 py-2 rounded-lg">Invia Progetto</button>
                    </div>
                </div>
            </form>
        </div>
    </main>

    <footer class="text-center py-4 text-[11px] text-slate-600 border-t border-slate-900">
        &copy; 2026 PrimeFactory Hub. Cloud storage protetto da isolamento hash UUID.
    </footer>

    <script>
        let currentStep = 1;

        function changeStep(target) {
            if (target > currentStep) {
                if (currentStep === 1) {
                    const name = document.getElementById('client_name').value.trim();
                    const email = document.getElementById('client_email').value.trim();
                    if (name.length < 3 || !email.includes('@')) { alert('Dati anagrafici non validi.'); return; }
                }
                if (currentStep === 2) {
                    const qty = parseFloat(document.getElementById('quantity_kg').value);
                    if (isNaN(qty) || qty < 1 || qty > 20) { alert('Peso fuori dai limiti consentiti (1-20kg).'); return; }
                }
            }
            currentStep = target;
            document.querySelectorAll('.step-layer').forEach((layer, idx) => {
                if (idx + 1 === currentStep) layer.classList.remove('hidden');
                else layer.classList.add('hidden');
            });
            document.getElementById('stepLine').style.width = `${(currentStep / 3) * 100}%`;
            for(let i=1; i<=3; i++) {
                document.getElementById(`lbl${i}`).className = i <= currentStep ? "text-brand-cyan" : "text-slate-500";
            }
        }

        // AJAX Validazione Sconto dello Step 1
        document.getElementById('verifyBtn').addEventListener('click', async () => {
            const code = document.getElementById('ref_code').value;
            const status = document.getElementById('refStatus');
            if (!code) return;
            const fd = new FormData();
            fd.append('code', code);
            const r = await fetch('verify_referral.php', { method: 'POST', body: fd });
            const data = await r.json();
            status.classList.remove('hidden');
            status.innerText = data.message;
            status.className = data.valid ? "text-xs mt-1 text-green-400 font-bold" : "text-xs mt-1 text-red-400";
            if (data.valid) document.getElementById('referral_code_id').value = data.id;
        });

        // Drag and Drop
        const box = document.getElementById('dropBox');
        const inp = document.getElementById('project_files');
        const mon = document.getElementById('fileMonitor');

        box.addEventListener('click', () => inp.click());
        box.addEventListener('dragover', (e) => { e.preventDefault(); box.classList.add('border-brand-cyan'); });
        box.addEventListener('dragleave', () => box.classList.remove('border-brand-cyan'));
        box.addEventListener('drop', (e) => { e.preventDefault(); box.classList.remove('border-brand-cyan'); inp.files = e.dataTransfer.files; checkFiles(); });
        inp.addEventListener('change', checkFiles);

        function checkFiles() {
            mon.innerHTML = "";
            const extOk = ['png', 'jpg', 'jpeg', 'stl', 'step', 'stp', 'igs', 'obj'];
            for (let f of inp.files) {
                const ext = f.name.split('.').pop().toLowerCase();
                if (!extOk.includes(ext) || f.size > 35*1024*1024) {
                    alert(`Il file ${f.name} non è valido o supera i 35MB.`);
                    inp.value = ""; mon.innerHTML = ""; return;
                }
                mon.innerHTML += `<div>✓ ${f.name} (${(f.size/(1024*1024)).toFixed(1)} MB)</div>`;
            }
        }

        // Invio Finale asincrono XHR (Gestione barra avanzamento progressiva)
        document.getElementById('multiStepForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const log = document.getElementById('outputLog');
            if (!document.getElementById('project_notes').value.trim() || !document.getElementById('privacy_consent').checked) {
                log.classList.remove('hidden'); log.innerText = "Note e consenso privacy obbligatori."; return;
            }
            log.classList.add('hidden');
            document.getElementById('progressZone').classList.remove('hidden');

            const xhr = new XMLHttpRequest();
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const p = Math.round((e.loaded / e.total) * 100);
                    document.getElementById('progressFill').style.width = p + '%';
                    document.getElementById('progressPercent').innerText = p + '%';
                }
            });

            xhr.open('POST', 'form_handler.php', true);
            xhr.onload = function() {
                if (xhr.status === 200) {
                    const res = JSON.parse(xhr.responseText);
                    if (res.success) { alert(res.message); window.location.reload(); } 
                    else { log.classList.remove('hidden'); log.innerText = res.error; }
                }
            };
            xhr.send(new FormData(this));
        });
    </script>
</body>
</html>