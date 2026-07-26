<!DOCTYPE html>
<html lang="it">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PrimeFactory | Servizi & Tariffe</title>
    <meta name="description"
        content="PrimeFactory offre servizi di stampa 3D FDM, resina SLA e progettazione CAD con un approccio trasparente e sostenibile.">
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
    <link rel="stylesheet" href="assets/css/style.css">
</head>

<body class="min-h-screen w-full bg-white text-carbon">
    <?php include __DIR__ . '/includes/header.php'; ?>

    <main class="flex-grow">
        <section class="relative overflow-hidden bg-slate-50 text-carbon">
            <div
                class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(182,255,0,0.12)_1px,transparent_1px)] bg-[length:28px_28px] opacity-20">
            </div>
            <div class="relative max-w-7xl mx-auto px-4 py-20 text-center">
                <p class="text-xs font-semibold uppercase tracking-[0.35em] text-carbon/40 mb-4">SERVIZI & TARIFE</p>
                <h1 class="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-amethyst">Servizi Professionali
                    di Stampa 3D e Modellazione CAD</h1>
                <p class="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-carbon/70">Ogni tecnologia ha il suo punto
                    di forza. Scopri quale fa per te o chiedici consiglio tecnico.</p>
            </div>
            <div class="relative border-t border-slate-200/60">
                <div class="max-w-7xl mx-auto px-4 py-6">
                    <div class="inline-flex rounded-full border border-slate-200 bg-white/90 p-1 shadow-sm">
                        <button type="button" data-tab="fdm"
                            class="tab-button rounded-full bg-white/0 px-5 py-2 text-sm font-semibold text-chartreuse transition hover:text-amethyst hover:bg-slate-100">FDM</button>
                        <button type="button" data-tab="resina"
                            class="tab-button rounded-full bg-white/0 px-5 py-2 text-sm font-semibold text-chartreuse transition hover:text-amethyst hover:bg-slate-100">RESINA</button>
                        <button type="button" data-tab="cad"
                            class="tab-button rounded-full bg-white/0 px-5 py-2 text-sm font-semibold text-chartreuse transition hover:text-amethyst hover:bg-slate-100">CAD</button>
                    </div>
                </div>
            </div>
        </section>

        <section class="max-w-7xl mx-auto px-4 py-16">
            <div class="space-y-16">
                <div id="fdm" class="service-panel">
                    <div class="grid gap-10 xl:grid-cols-[1.45fr_0.95fr] items-start xl:items-center">
                        <div class="space-y-6">
                            <h2 class="text-3xl font-black text-amethyst">Stampa 3D FDM</h2>
                            <p class="text-gray-700">Fused Deposition Modeling � filamento fuso strato su strato. Ideale
                                per prototipi funzionali, parti meccaniche robuste e oggetti di grandi dimensioni.</p>
                            <p class="text-gray-700">Offriamo un ottimo rapporto qualit�-prezzo, con materiali tecnici e
                                riciclati adatti a ogni esigenza.</p>

                            <div class="rounded-[1.5rem] border border-gray-100 bg-white p-7 shadow-sm">
                                <p class="text-xs font-semibold uppercase tracking-[0.25em] text-amethyst">MATERIALI &
                                    OPZIONI</p>
                                <div class="mt-6 space-y-4">
                                    <div class="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                                        <div class="flex items-center gap-3">
                                            <span
                                                class="inline-flex items-center justify-center rounded-full bg-chartreuse/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-amethyst">ECO</span>
                                            <span class="font-semibold text-amethyst">PLA Riciclato</span>
                                        </div>
                                        <p class="mt-3 text-sm text-gray-600">Sostenibile ed economico. Ideale per
                                            prototipi e oggetti decorativi indoor.</p>
                                    </div>
                                    <div class="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                                        <div class="flex items-center gap-3">
                                            <span
                                                class="inline-flex items-center justify-center rounded-full bg-chartreuse/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-amethyst">BASE</span>
                                            <span class="font-semibold text-amethyst">PLA</span>
                                        </div>
                                        <p class="mt-3 text-sm text-gray-600">Materiale standard sostenibile. Facile da
                                            stampare, con buona rigidit� strutturale.</p>
                                    </div>
                                    <div class="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                                        <div class="flex items-center gap-3">
                                            <span
                                                class="inline-flex items-center justify-center rounded-full bg-chartreuse/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-amethyst">TOUGH</span>
                                            <span class="font-semibold text-amethyst">PETG</span>
                                        </div>
                                        <p class="mt-3 text-sm text-gray-600">Resistente agli agenti atmosferici e
                                            leggermente elastico. Ideale per uso esterno.</p>
                                    </div>
                                    <div class="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                                        <div class="flex items-center gap-3">
                                            <span
                                                class="inline-flex items-center justify-center rounded-full bg-chartreuse/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-amethyst">PRO</span>
                                            <span class="font-semibold text-amethyst">ABS</span>
                                        </div>
                                        <p class="mt-3 text-sm text-gray-600">Elevata resistenza termica e meccanica.
                                            Richiede post-processing per rifinitura.</p>
                                    </div>
                                    <div class="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                                        <div class="flex items-center gap-3">
                                            <span
                                                class="inline-flex items-center justify-center rounded-full bg-chartreuse/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-amethyst">FLEX</span>
                                            <span class="font-semibold text-amethyst">TPU</span>
                                        </div>
                                        <p class="mt-3 text-sm text-gray-600">Gomma flessibile per guarnizioni,
                                            protezioni, grip e accessori elastici.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <aside class="space-y-6">
                            <div class="rounded-[1.5rem] border border-gray-200 bg-[#1e162f] p-6 text-white shadow-sm">
                                <p class="text-sm font-semibold uppercase tracking-[0.25em] text-white/70">Specifiche
                                    tecniche</p>
                                <div class="mt-5 space-y-4 text-sm text-white/70">
                                    <div>
                                        <p class="text-xs uppercase text-white/40">Layer Height</p>
                                        <p class="mt-1 font-semibold text-white">0.15 - 0.35 mm</p>
                                    </div>
                                    <div>
                                        <p class="text-xs uppercase text-white/40">Volume Max</p>
                                        <p class="mt-1 font-semibold text-white">300 � 300 � 400 mm</p>
                                    </div>
                                    <div>
                                        <p class="text-xs uppercase text-white/40">Tolleranza</p>
                                        <p class="mt-1 font-semibold text-white">�0.10 mm</p>
                                    </div>
                                    <div>
                                        <p class="text-xs uppercase text-white/40">Post-processing</p>
                                        <p class="mt-1 font-semibold text-white">Levigatura / Verniciatura</p>
                                    </div>
                                </div>
                            </div>
                            <div class="rounded-[1.5rem] border border-[#58182c] bg-[#1d101a] p-6 text-white shadow-sm">
                                <div class="flex items-center gap-3">
                                    <span class="h-2 w-2 rounded-full bg-lipstick"></span>
                                    <p class="text-sm font-semibold">Trasparenza Tariffe</p>
                                </div>
                                <p class="mt-4 text-sm text-white/70">Prezzo finale = Tempo di stampa + Costo materiale
                                    (g) + Consumo energetico tracciato + Post-processing. <span
                                        class="text-white">Nessun costo nascosto.</span></p>
                            </div>
                            <a href="preventivo.php"
                                class="inline-flex w-full items-center justify-center rounded-full bg-chartreuse px-5 py-3 text-sm font-bold text-carbon transition hover:bg-chartreuse/90">Richiedi
                                Preventivo ?</a>
                        </aside>
                    </div>
                </div>

                <div id="resina" class="service-panel hidden">
                    <div class="grid gap-10 xl:grid-cols-[1.45fr_0.95fr] items-start xl:items-center">
                        <div class="space-y-6">
                            <h2 class="text-3xl font-black text-amethyst">Stampa 3D Resina SLA/MSLA</h2>
                            <p class="text-gray-700">Alta definizione per dettagli estetici e funzionali. La stampa in
                                resina UV garantisce superfici lisce, dettagli finissimi e tolleranze eccellenti.</p>
                            <p class="text-gray-700">Perfetta per miniature, dental/medical, componenti estetici e
                                prototipi di presentazione.</p>

                            <div class="rounded-[1.5rem] border border-gray-100 bg-white p-7 shadow-sm">
                                <p class="text-xs font-semibold uppercase tracking-[0.25em] text-amethyst">MATERIALI &
                                    OPZIONI</p>
                                <div class="mt-6 space-y-4">
                                    <div class="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                                        <div class="flex items-center gap-3">
                                            <span
                                                class="inline-flex items-center justify-center rounded-full bg-amethyst/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-amethyst">DETAIL</span>
                                            <span class="font-semibold text-amethyst">Resina Standard</span>
                                        </div>
                                        <p class="mt-3 text-sm text-gray-600">Alta definizione superficiale, finitura
                                            liscia. Ideale per modelli estetici e miniature.</p>
                                    </div>
                                    <div class="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                                        <div class="flex items-center gap-3">
                                            <span
                                                class="inline-flex items-center justify-center rounded-full bg-amethyst/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-amethyst">ENG</span>
                                            <span class="font-semibold text-amethyst">Resina Tech Rigida</span>
                                        </div>
                                        <p class="mt-3 text-sm text-gray-600">Propriet� meccaniche elevate. Per
                                            ingranaggi, supporti e parti funzionali.</p>
                                    </div>
                                    <div class="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                                        <div class="flex items-center gap-3">
                                            <span
                                                class="inline-flex items-center justify-center rounded-full bg-amethyst/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-amethyst">FLEX</span>
                                            <span class="font-semibold text-amethyst">Resina Tech Flessibile</span>
                                        </div>
                                        <p class="mt-3 text-sm text-gray-600">Comportamento gommoso. Guarnizioni,
                                            isolatori e componenti protettivi.</p>
                                    </div>
                                    <div class="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                                        <div class="flex items-center gap-3">
                                            <span
                                                class="inline-flex items-center justify-center rounded-full bg-amethyst/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-amethyst">CAST</span>
                                            <span class="font-semibold text-amethyst">Resina Castable</span>
                                        </div>
                                        <p class="mt-3 text-sm text-gray-600">Ideale per la microfusione di gioielli e
                                            particolari metallici.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <aside class="space-y-6">
                            <div class="rounded-[1.5rem] border border-gray-200 bg-[#1e162f] p-6 text-white shadow-sm">
                                <p class="text-sm font-semibold uppercase tracking-[0.25em] text-white/70">Specifiche
                                    tecniche</p>
                                <div class="mt-5 space-y-4 text-sm text-white/70">
                                    <div>
                                        <p class="text-xs uppercase text-white/40">Layer Height</p>
                                        <p class="mt-1 font-semibold text-white">0.025 - 0.10 mm</p>
                                    </div>
                                    <div>
                                        <p class="text-xs uppercase text-white/40">Volume Max</p>
                                        <p class="mt-1 font-semibold text-white">192 � 120 � 245 mm</p>
                                    </div>
                                    <div>
                                        <p class="text-xs uppercase text-white/40">Tolleranza</p>
                                        <p class="mt-1 font-semibold text-white">�0.05 mm</p>
                                    </div>
                                    <div>
                                        <p class="text-xs uppercase text-white/40">Post-processing</p>
                                        <p class="mt-1 font-semibold text-white">Lavaggio UV + Curing</p>
                                    </div>
                                </div>
                            </div>
                            <div class="rounded-[1.5rem] border border-[#58182c] bg-[#1d101a] p-6 text-white shadow-sm">
                                <div class="flex items-center gap-3">
                                    <span class="h-2 w-2 rounded-full bg-lipstick"></span>
                                    <p class="text-sm font-semibold">Trasparenza Tariffe</p>
                                </div>
                                <p class="mt-4 text-sm text-white/70">Prezzo finale = Tempo di stampa + Costo materiale
                                    (g) + Consumo energetico tracciato + Post-processing. <span
                                        class="text-white">Nessun costo nascosto.</span></p>
                            </div>
                            <a href="preventivo.php"
                                class="inline-flex w-full items-center justify-center rounded-full bg-chartreuse px-5 py-3 text-sm font-bold text-carbon transition hover:bg-chartreuse/90">Richiedi
                                Preventivo ?</a>
                        </aside>
                    </div>
                </div>

                <div id="cad" class="service-panel hidden">
                    <div class="grid gap-10 xl:grid-cols-[1.45fr_0.95fr] items-start xl:items-center">
                        <div class="space-y-6">
                            <h2 class="text-3xl font-black text-amethyst">Progettazione CAD & CNC</h2>
                            <p class="text-gray-700">Dall'idea al file pronto per la produzione. Non hai un file 3D?
                                Partiamo da un disegno tecnico, una foto o un oggetto fisico rotto.</p>
                            <p class="text-gray-700">Riproduciamo il componente con precisione millimetrica e lo
                                ottimizziamo per la stampa o la lavorazione CNC.</p>

                            <div class="rounded-[1.5rem] border border-gray-100 bg-white p-7 shadow-sm">
                                <p class="text-xs font-semibold uppercase tracking-[0.25em] text-amethyst">SERVIZI &
                                    OPZIONI</p>
                                <div class="mt-6 space-y-4">
                                    <div class="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                                        <div class="flex items-center gap-3">
                                            <span
                                                class="inline-flex items-center justify-center rounded-full bg-chartreuse/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-amethyst">DESIGN</span>
                                            <span class="font-semibold text-amethyst">Modellazione da disegno</span>
                                        </div>
                                        <p class="mt-3 text-sm text-gray-600">Partendo da disegni tecnici o dimensioni
                                            misurate realizziamo il modello 3D.</p>
                                    </div>
                                    <div class="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                                        <div class="flex items-center gap-3">
                                            <span
                                                class="inline-flex items-center justify-center rounded-full bg-chartreuse/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-amethyst">RE</span>
                                            <span class="font-semibold text-amethyst">Reverse Engineering</span>
                                        </div>
                                        <p class="mt-3 text-sm text-gray-600">Scansione e riproduzione di oggetti fisici
                                            esistenti, anche danneggiati o usurati.</p>
                                    </div>
                                    <div class="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                                        <div class="flex items-center gap-3">
                                            <span
                                                class="inline-flex items-center justify-center rounded-full bg-chartreuse/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-amethyst">OPT</span>
                                            <span class="font-semibold text-amethyst">Ottimizzazione per stampa</span>
                                        </div>
                                        <p class="mt-3 text-sm text-gray-600">Analisi orientamento, supporti minimi e
                                            massima qualit� superficiale.</p>
                                    </div>
                                    <div class="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                                        <div class="flex items-center gap-3">
                                            <span
                                                class="inline-flex items-center justify-center rounded-full bg-chartreuse/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-amethyst">CNC</span>
                                            <span class="font-semibold text-amethyst">Lavorazione CNC</span>
                                        </div>
                                        <p class="mt-3 text-sm text-gray-600">Fresatura, incisione e taglio su legno,
                                            alluminio e materie plastiche.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <aside class="space-y-6">
                            <div class="rounded-[1.5rem] border border-gray-200 bg-[#1e162f] p-6 text-white shadow-sm">
                                <p class="text-sm font-semibold uppercase tracking-[0.25em] text-white/70">Specifiche
                                    tecniche</p>
                                <div class="mt-5 space-y-4 text-sm text-white/70">
                                    <div>
                                        <p class="text-xs uppercase text-white/40">Software</p>
                                        <p class="mt-1 font-semibold text-white">Fusion 360 / SolidWorks</p>
                                    </div>
                                    <div>
                                        <p class="text-xs uppercase text-white/40">Formati output</p>
                                        <p class="mt-1 font-semibold text-white">STL / STEP / OBJ / IGS</p>
                                    </div>
                                    <div>
                                        <p class="text-xs uppercase text-white/40">Revisioni</p>
                                        <p class="mt-1 font-semibold text-white">2 revisioni gratuite</p>
                                    </div>
                                    <div>
                                        <p class="text-xs uppercase text-white/40">Tempi medi</p>
                                        <p class="mt-1 font-semibold text-white">3-7 giorni lavorativi</p>
                                    </div>
                                </div>
                            </div>
                            <div class="rounded-[1.5rem] border border-[#58182c] bg-[#1d101a] p-6 text-white shadow-sm">
                                <div class="flex items-center gap-3">
                                    <span class="h-2 w-2 rounded-full bg-lipstick"></span>
                                    <p class="text-sm font-semibold">Trasparenza Tariffe</p>
                                </div>
                                <p class="mt-4 text-sm text-white/70">Prezzo finale = Tempo di stampa + Costo materiale
                                    (g) + Consumo energetico tracciato + Post-processing. <span
                                        class="text-white">Nessun costo nascosto.</span></p>
                            </div>
                            <a href="preventivo.php"
                                class="inline-flex w-full items-center justify-center rounded-full bg-chartreuse px-5 py-3 text-sm font-bold text-carbon transition hover:bg-chartreuse/90">Richiedi
                                Preventivo ?</a>
                        </aside>
                    </div>
                </div>
            </div>
        </section>
    </main>

    <?php include __DIR__ . '/includes/footer_v2.php'; ?>

    <script>
        const tabButtons = document.querySelectorAll('.tab-button');
        const panels = document.querySelectorAll('.service-panel');

        function activatePanel(id) {
            panels.forEach(panel => {
                panel.classList.toggle('hidden', panel.id !== id);
            });
            tabButtons.forEach(button => {
                const active = button.dataset.tab === id;
                button.classList.toggle('bg-white', active);
                button.classList.toggle('text-black', active);
                button.classList.toggle('text-white/70', !active);
            });
        }

        tabButtons.forEach(button => {
            button.addEventListener('click', () => activatePanel(button.dataset.tab));
        });

        activatePanel('fdm');
    </script>
</body>

</html>