<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Richiedi Preventivo Stampa 3D e Progettazione CAD | PrimeFactory</title>
    <meta name="description" content="Compila il form in tre step per richiedere un preventivo personalizzato per stampa 3D, CAD e riciclo plastica.">
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        amethyst: '#3c1a47',
                        carbon: '#1e1e1e',
                        lipstick: '#ff0040',
                        chartreuse: '#b6ff00'
                    }
                }
            }
        }
    </script>
    <style>
        .step-layer { display: none; }
        .step-layer.active { display: block; }
        .card-3d { transform: perspective(1000px) rotateX(1deg) rotateY(-1deg); transition: transform 0.3s ease; }
        .card-3d:hover { transform: perspective(1000px) rotateX(0deg) rotateY(0deg); }
    </style>
</head>
<body class="min-h-screen bg-[linear-gradient(135deg,#fffdfd_0%,#f7f7ff_100%)] text-carbon">
    <?php include __DIR__ . '/includes/header.php'; ?>

    <main class="mx-auto flex w-full max-w-6xl flex-grow flex-col px-4 py-12 lg:px-6">
        <section class="mb-10 rounded-[2rem] border border-gray-100 bg-white/80 p-6 shadow-xl shadow-gray-100/70 card-3d">
            <div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div class="flex items-center gap-4">
                    <div class="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-chartreuse/20">
                        <img src="assets/images/20260626_paco_v5.png" alt="Paco mascot" class="h-16 w-16 object-contain drop-shadow-lg">
                    </div>
                    <div>
                        <h1 class="text-2xl font-black text-amethyst">Richiedi un Preventivo Personalizzato</h1>
                        <p class="mt-1 text-sm text-gray-600">Tre passaggi semplici, privacy garantita e risposta tecnica entro 24 ore.</p>
                    </div>
                </div>
                <div class="rounded-2xl bg-chartreuse/15 px-4 py-3 text-sm font-semibold text-amethyst">
                    ⏱️ Risposta garantita entro 24 ore
                </div>
            </div>
        </section>

        <div class="mb-8 max-w-xl">
            <div class="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
                <span id="badge-step-1" class="text-lipstick">1. Dati</span>
                <span id="badge-step-2">2. Tecnica</span>
                <span id="badge-step-3">3. File & Note</span>
            </div>
            <div class="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                <div id="progress-indicator" class="h-full w-1/3 bg-gradient-to-r from-amethyst to-lipstick transition-all duration-300"></div>
            </div>
        </div>

        <form id="quote-form" action="form_handler.php" method="post" enctype="multipart/form-data" class="mx-auto w-full max-w-3xl rounded-[2rem] border border-gray-100 bg-white p-8 shadow-2xl shadow-gray-100/80">
            <div id="step-1" class="step-layer active space-y-6">
                <h2 class="border-b border-gray-100 pb-2 text-lg font-black text-amethyst">Passo 1: Dati Anagrafici e Referral</h2>

                <div>
                    <label for="client_name" class="mb-2 block text-sm font-bold text-carbon">Nome / Ragione Sociale *</label>
                    <input type="text" id="client_name" name="client_name" required minlength="3" placeholder="Mario Rossi / Tech SRL" class="w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-amethyst focus:outline-none">
                </div>

                <div>
                    <label for="client_email" class="mb-2 block text-sm font-bold text-carbon">Indirizzo Email *</label>
                    <input type="email" id="client_email" name="client_email" required placeholder="nome@azienda.com" class="w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-amethyst focus:outline-none">
                    <p class="mt-1 text-xs text-gray-500">L’indirizzo verrà usato per il follow-up e per eventuali comunicazioni future.</p>
                </div>

                <div>
                    <label for="referral_code" class="mb-2 block text-sm font-bold text-carbon">Codice Amico (opzionale)</label>
                    <input type="text" id="referral_code" name="referral_code" placeholder="ES. AMICO-5671" class="w-full rounded-2xl border border-gray-200 px-4 py-3 uppercase focus:border-amethyst focus:outline-none">
                    <div id="referral-feedback" class="mt-2 text-sm font-semibold"></div>
                </div>

                <div class="flex justify-end pt-4">
                    <button type="button" onclick="goToStep(2)" class="rounded-2xl bg-amethyst px-6 py-3 font-bold text-white transition hover:bg-carbon">Continua alla Tecnica</button>
                </div>
            </div>

            <div id="step-2" class="step-layer space-y-6">
                <h2 class="border-b border-gray-100 pb-2 text-lg font-black text-amethyst">Passo 2: Specifiche Tecniche del Progetto</h2>

                <div>
                    <label class="mb-3 block text-sm font-bold text-carbon">Tipo di Servizio Richiesto *</label>
                    <div class="space-y-2">
                        <label class="flex cursor-pointer items-center gap-3 rounded-2xl border border-gray-100 p-3 transition hover:bg-gray-50"><input type="radio" name="service_type" value="ready" checked onclick="toggleTechnicalFields('ready')" class="text-amethyst"><span class="text-sm">Ho già il file 3D pronto per la stampa</span></label>
                        <label class="flex cursor-pointer items-center gap-3 rounded-2xl border border-gray-100 p-3 transition hover:bg-gray-50"><input type="radio" name="service_type" value="needs_cad" onclick="toggleTechnicalFields('needs_cad')" class="text-amethyst"><span class="text-sm">Ho bisogno del servizio di progettazione CAD / Reverse Engineering</span></label>
                        <label class="flex cursor-pointer items-center gap-3 rounded-2xl border border-gray-100 p-3 transition hover:bg-gray-50"><input type="radio" name="service_type" value="give_plastic" onclick="toggleTechnicalFields('give_plastic')" class="text-amethyst"><span class="text-sm">Ho della plastica da convertire in punti fedeltà</span></label>
                    </div>
                </div>

                <div id="conditional-printing-fields" class="grid gap-4 md:grid-cols-2">
                    <div>
                        <label for="preferred_technology" class="mb-2 block text-sm font-bold text-carbon">Tecnologia Desiderata</label>
                        <select id="preferred_technology" name="preferred_technology" class="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3">
                            <option value="fdm">FDM (Filamento - Parti funzionali)</option>
                            <option value="resina">Resina (Alta definizione estetica)</option>
                            <option value="non_saprei">Non saprei, chiedo consiglio</option>
                        </select>
                    </div>
                    <div>
                        <label for="preferred_material" class="mb-2 block text-sm font-bold text-carbon">Materiale Preferito</label>
                        <select id="preferred_material" name="preferred_material" class="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3">
                            <option value="pla_riciclato">PLA Riciclato</option>
                            <option value="pla">PLA</option>
                            <option value="petg">PETG</option>
                            <option value="abs">ABS</option>
                            <option value="resina_standard">Resina Standard</option>
                            <option value="resina_tech">Resina Tech</option>
                            <option value="non_saprei">Non saprei</option>
                        </select>
                    </div>
                </div>

                <div id="conditional-recycle-fields" class="hidden rounded-[1.5rem] border border-chartreuse/30 bg-chartreuse/10 p-4">
                    <p class="mb-4 text-sm text-amethyst">La plastica consegnata non deve essere sporca di alimenti o oli: una prima pulizia a casa aiuta molto.</p>
                    <div class="grid gap-4 md:grid-cols-2">
                        <div>
                            <label for="gived_material" class="mb-2 block text-sm font-bold text-carbon">Plastica Consegnata</label>
                            <select id="gived_material" name="gived_material" class="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3">
                                <option value="pla">PLA di vecchie stampe</option>
                                <option value="petg">PETG di vecchie stampe</option>
                                <option value="abs">ABS di vecchie stampe</option>
                                <option value="from_home">Bottiglie o flaconi domestici</option>
                                <option value="non_saprei">Non saprei</option>
                            </select>
                        </div>
                        <div>
                            <label for="quantity_plastic" class="mb-2 block text-sm font-bold text-carbon">Stima del Peso (1-20kg)</label>
                            <input type="number" id="quantity_plastic" name="quantity_plastic" value="1" min="1" max="20" class="w-full rounded-2xl border border-gray-200 px-4 py-3">
                        </div>
                    </div>
                </div>

                <div class="flex justify-between pt-4">
                    <button type="button" onclick="goToStep(1)" class="rounded-2xl border border-gray-200 px-6 py-3 font-bold text-carbon transition hover:bg-gray-50">Indietro</button>
                    <button type="button" onclick="goToStep(3)" class="rounded-2xl bg-amethyst px-6 py-3 font-bold text-white transition hover:bg-carbon">Continua ai File</button>
                </div>
            </div>

            <div id="step-3" class="step-layer space-y-6">
                <h2 class="border-b border-gray-100 pb-2 text-lg font-black text-amethyst">Passo 3: Caricamento Immagini e Note</h2>

                <div>
                    <label class="mb-2 block text-sm font-bold text-carbon">Riferimenti Visivi / Immagini (opzionale)</label>
                    <div id="drop-zone" class="cursor-pointer rounded-[1.5rem] border-2 border-dashed border-gray-300 bg-gray-50/70 p-6 text-center transition hover:border-lipstick">
                        <p class="text-sm font-semibold text-gray-700">Trascina qui i file o clicca per sfogliare</p>
                        <p class="mt-1 text-xs text-gray-500">Solo immagini .png, .jpg, .jpeg • max 35 MB per file</p>
                        <div class="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-left text-xs text-amber-800">
                            <strong>Nota tecnica:</strong> in questa prima fase vengono accettate solo immagini. I file CAD verranno richiesti solo dopo l’accettazione preliminare del preventivo.
                        </div>
                        <input type="file" id="project_files" name="project_files[]" multiple accept=".png,.jpg,.jpeg" class="hidden">
                    </div>
                    <div id="file-list" class="mt-3 space-y-2"></div>
                    <div id="upload-progress-container" class="mt-3 hidden h-2 overflow-hidden rounded-full bg-gray-100">
                        <div id="upload-progress-bar" class="h-full w-0 bg-lipstick transition-all duration-150"></div>
                    </div>
                </div>

                <div>
                    <label for="project_notes" class="mb-2 block text-sm font-bold text-carbon">Note sul Progetto / Tolleranze / Utilizzo Finale *</label>
                    <textarea id="project_notes" name="project_notes" rows="5" required placeholder="Es. Il pezzo deve resistere a 60°C in esterno e accoppiarsi con una vite M4..." class="w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-amethyst focus:outline-none"></textarea>
                </div>

                <div class="flex items-start gap-3 rounded-2xl bg-gray-50 p-4">
                    <input type="checkbox" id="privacy_consent" name="privacy_consent" value="1" required class="mt-1 text-amethyst">
                    <label for="privacy_consent" class="text-sm text-gray-600">Accetto la Privacy Policy e il trattamento dei dati personali ai sensi del GDPR. I file caricati verranno protetti mediante mascheramento UUID.</label>
                </div>

                <div id="form-message" class="hidden rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold"></div>

                <div class="flex justify-between pt-4">
                    <button type="button" onclick="goToStep(2)" class="rounded-2xl border border-gray-200 px-6 py-3 font-bold text-carbon transition hover:bg-gray-50">Indietro</button>
                    <button type="submit" class="rounded-2xl bg-gradient-to-r from-lipstick to-amethyst px-8 py-3 font-bold text-white shadow-lg shadow-lipstick/20 transition hover:opacity-90">Invia Richiesta Preventivo</button>
                </div>
            </div>
        </form>
    </main>

    <?php include __DIR__ . '/includes/footer.php'; ?>

    <script>
        function goToStep(stepNumber) {
            if (stepNumber === 2) {
                const name = document.getElementById('client_name').value.trim();
                const email = document.getElementById('client_email').value.trim();
                if (name.length < 3 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    alert('Compilare correttamente i campi obbligatori del Passo 1.');
                    return;
                }
            }

            document.querySelectorAll('.step-layer').forEach(layer => layer.classList.remove('active'));
            document.getElementById('step-' + stepNumber).classList.add('active');

            const indicator = document.getElementById('progress-indicator');
            const b1 = document.getElementById('badge-step-1');
            const b2 = document.getElementById('badge-step-2');
            const b3 = document.getElementById('badge-step-3');
            [b1, b2, b3].forEach(el => el.className = 'text-gray-400');

            if (stepNumber === 1) {
                indicator.style.width = '33.33%';
                b1.className = 'text-lipstick';
            } else if (stepNumber === 2) {
                indicator.style.width = '66.66%';
                b2.className = 'text-lipstick';
            } else {
                indicator.style.width = '100%';
                b3.className = 'text-lipstick';
            }
        }

        function toggleTechnicalFields(type) {
            const printFields = document.getElementById('conditional-printing-fields');
            const recycleFields = document.getElementById('conditional-recycle-fields');
            if (type === 'give_plastic') {
                printFields.classList.add('hidden');
                recycleFields.classList.remove('hidden');
            } else {
                printFields.classList.remove('hidden');
                recycleFields.classList.add('hidden');
            }
        }

        const referralInput = document.getElementById('referral_code');
        const feedback = document.getElementById('referral-feedback');
        referralInput.addEventListener('blur', function () {
            const value = this.value.trim();
            if (value.length < 4) {
                feedback.textContent = '';
                return;
            }
            fetch('verify_referral.php?code=' + encodeURIComponent(value))
                .then(res => res.json())
                .then(data => {
                    if (data.valid) {
                        feedback.textContent = data.message;
                        feedback.className = 'mt-2 text-sm font-semibold text-green-600';
                    } else {
                        feedback.textContent = data.message;
                        feedback.className = 'mt-2 text-sm font-semibold text-red-600';
                    }
                });
        });

        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('project_files');
        const fileList = document.getElementById('file-list');
        const progressBar = document.getElementById('upload-progress-bar');
        const progressContainer = document.getElementById('upload-progress-container');

        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', (event) => {
            event.preventDefault();
            dropZone.classList.add('border-lipstick');
        });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-lipstick'));
        dropZone.addEventListener('drop', (event) => {
            event.preventDefault();
            dropZone.classList.remove('border-lipstick');
            fileInput.files = event.dataTransfer.files;
            updateFileList();
        });
        fileInput.addEventListener('change', updateFileList);

        function updateFileList() {
            fileList.innerHTML = '';
            const allowed = ['png', 'jpg', 'jpeg'];
            const totalFiles = fileInput.files.length;
            progressContainer.classList.remove('hidden');
            progressBar.style.width = '0%';

            if (totalFiles === 0) {
                progressContainer.classList.add('hidden');
                return;
            }

            Array.from(fileInput.files).forEach((file, index) => {
                const ext = file.name.split('.').pop().toLowerCase();
                if (!allowed.includes(ext)) {
                    alert('Formato non supportato. Sono ammessi solo file immagine .png, .jpg e .jpeg.');
                    fileInput.value = '';
                    fileList.innerHTML = '';
                    progressContainer.classList.add('hidden');
                    return;
                }
                if (file.size > 35 * 1024 * 1024) {
                    alert('Il file "' + file.name + '" supera il limite massimo di 35 MB.');
                    fileInput.value = '';
                    fileList.innerHTML = '';
                    progressContainer.classList.add('hidden');
                    return;
                }
                const item = document.createElement('div');
                item.className = 'flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700';
                item.innerHTML = '<span>' + file.name + '</span><span>' + (file.size / (1024 * 1024)).toFixed(2) + ' MB</span>';
                fileList.appendChild(item);
                progressBar.style.width = ((index + 1) / totalFiles * 100) + '%';
            });
        }

        document.getElementById('quote-form').addEventListener('submit', function (event) {
            event.preventDefault();
            const formData = new FormData(this);
            const messageBox = document.getElementById('form-message');
            messageBox.className = 'rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700';
            messageBox.textContent = 'Invio in corso...';
            messageBox.classList.remove('hidden');

            fetch('form_handler.php', {
                method: 'POST',
                body: formData
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    messageBox.className = 'rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700';
                    messageBox.textContent = data.message;
                    this.reset();
                } else {
                    messageBox.className = 'rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700';
                    messageBox.textContent = data.message;
                }
            })
            .catch(() => {
                messageBox.className = 'rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700';
                messageBox.textContent = 'Errore di rete. Riprova tra qualche istante.';
            });
        });
    </script>
</body>
</html>
