<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PrimeFactory | Stampa 3D Professionale e Manifattura Circolare</title>
    <meta name="description" content="PrimeFactory unisce stampa 3D professionale, progettazione CAD e un ecosistema circolare che premia il riciclo della plastica.">
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
        <section class="max-w-7xl mx-auto px-4 pt-8 pb-2">
            <div class="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
                <div class="relative hidden">
                    <div class="absolute inset-0 -z-10 rounded-[2rem] bg-gradient-to-br from-chartreuse/30 to-lipstick/10 blur-3xl"></div>
                    <div class="glass-card p-8 rounded-[2rem] shadow-2xl shadow-gray-100 border border-gray-100">
                        <div class="mb-6 flex items-center justify-between">
                            <div>
                                <p class="text-sm font-semibold uppercase tracking-[0.2em] text-lipstick">Paco, il mascot</p>
                                <h2 class="text-2xl font-black text-amethyst">Il tuo assistente creativo</h2>
                            </div>
                            <div class="rounded-full bg-chartreuse/20 px-3 py-1 text-xs font-bold text-amethyst">3D Ready</div>
                        </div>
                        <div class="overflow-hidden rounded-[1.5rem] border border-gray-100 bg-gradient-to-br from-white via-amber-50 to-chartreuse/20 p-6">
                            <img src="assets/images/20260626_paco_v5.png" alt="Paco mascot" class="mx-auto h-60 w-auto object-contain drop-shadow-2xl">
                        </div>
                        <div class="mt-6 grid gap-4 sm:grid-cols-2">
                            <div class="rounded-2xl border border-gray-100 bg-white/70 p-4">
                                <p class="text-sm font-bold text-amethyst">Risposta garantita</p>
                                <p class="mt-1 text-sm text-gray-600">Preventivi e indicazioni tecniche entro 24 ore.</p>
                            </div>
                            <div class="rounded-2xl border border-gray-100 bg-white/70 p-4">
                                <p class="text-sm font-bold text-amethyst">Privacy attiva</p>
                                <p class="mt-1 text-sm text-gray-600">Upload protetti e dati trattati con criterio GDPR.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <img src="assets/images/20260626_paco_v5_v3_upscale_v1.png" alt="Paco mascot" class="mx-auto  md:h-[35rem] sm:h-[15rem] hidden sm:block w-auto object-contain drop-shadow-3xl">
                <!--<img src="assets/images/20260626_paco_v5_indica_v1.png" alt="Paco mascot" class="mx-auto h-[35rem] w-auto object-contain drop-shadow-3xl">-->

                <div class="space-y-8">
                    <div class="inline-flex items-center gap-2 rounded-full border border-amethyst/40 bg-chartreuse/15 px-4 py-2 text-sm font-semibold text-amethyst">
                        FDM - RESINA - CAD - CNC - RICICLO
                    </div>
                    <h1 class="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-amethyst leading-tight">
                        La tua manifattura digitale,<br>
                        <span class="text-lipstick">sostenibile</span> e <span class="text-chartreuse hero-shadow">trasparente</span>.
                    </h1>
                    <p class="max-w-2xl text-lg text-gray-700 leading-relaxed">
                        Da PrimeFactory trasformiamo idee, file CAD e materiali di scarto in soluzioni stampate con precisione e responsabilità ambientale. Ogni richiesta viene analizzata da un team tecnico entro 24 ore.
                    </p>
                    <div class="flex flex-col sm:flex-row gap-4">
                        <a href="preventivo.php" class="inline-flex items-center justify-center rounded-2xl bg-amethyst px-6 py-3 text-white font-bold shadow-lg shadow-amethyst/15 transition hover:-translate-y-1">
                            Richiedi un preventivo GRATUITO
                        </a>
                        <a href="servizi.php" class="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 py-3 font-semibold text-carbon transition hover:border-lipstick">
                            Scopri i servizi
                        </a>
                    </div>
                    <div class="flex flex-wrap gap-4 text-sm text-gray-600">
                        <span class="rounded-full bg-white/80 px-3 py-1 shadow-sm">Stampa FDM e SLA</span>
                        <span class="rounded-full bg-white/80 px-3 py-1 shadow-sm">Progettazione CAD e CAM</span>
                        <span class="rounded-full bg-white/80 px-3 py-1 shadow-sm">Riciclo e punti fedeltà</span>
                    </div>
                </div>
            </div>
        </section>
        <hr class="my-8">

        <section class="max-w-7xl mx-auto px-4 pb-2">
            <div class="flex flex-col gap-3">
                <h4 class="font-semibold col-span-3 text-center">PERCHÉ PRIMEFACTORY</h4>
                <h2 class="font-black text-4xl sm:text-2xl col-span-3 text-center">Manifattura tecnica. Etica. Trasparente.</h2>
                <div class="flex sm:flex-row flex-col justify-center h-basis-2/3 gap-4">
                    <article class="flex flex-col text-center items-center sm:justify-center h-full rounded-[1.5rem] border border-gray-100 bg-white/80 p-7 shadow-sm">
                        <div class="font-blackmb-4 flex flex-col h-12 w-12 items-center justify-center rounded-2xl bg-chartreuse/20 text-2xl">⚙️</div>
                        <h3 class="text-xl font-black text-amethyst">Alta Precisione</h3>
                        <p class="mt-2 text-sm leading-relaxed text-gray-600">Tecnologie FDM e Resina con tolleranze da ±0.05mm. Ogni stampa è monitorata e documentata con il report energetico.</p>
                    </article>
                    <article class="flex flex-col text-center items-center sm:justify-center h-full rounded-[1.5rem] border border-gray-100 bg-white/80 p-7 shadow-sm">
                        <div class="mb-4 flex flex-col h-12 w-12 items-center justify-center rounded-2xl bg-lipstick/10 text-2xl">♻️</div>
                        <h3 class="text-xl font-black text-amethyst">Economia circolare</h3>
                        <p class="mt-2 text-sm leading-relaxed text-gray-600">Ricicliamo stampe fallite, supporti e scarti plastici domestici trasformandoli in nuovo filamento e in punti fedeltà.</p>
                    </article>
                    <article class="flex flex-col text-center items-center sm:justify-center h-full rounded-[1.5rem] border border-gray-100 bg-white/80 p-7 shadow-sm">
                        <div class="mb-4 flex flex-col h-12 w-12 items-center justify-center rounded-2xl bg-amethyst/10 text-2xl">📦</div>
                        <h3 class="text-xl font-black text-amethyst">Flusso semplice</h3>
                        <p class="mt-2 text-sm leading-relaxed text-gray-600">Compila il modulo in 3 passaggi, carica immagine di riferimento e ricevi una risposta pronta per il prossimo step.</p>
                    </article>
                </div>
            </div>
        </section>
        <hr class="my-8">

        <section class="max-w-7xl mx-auto px-4 pb-2">
            <div class="rounded-[1.5rem] bg-amethyst text-white p-8 md:p-12">
                <div class="grid md:grid-cols-2 gap-8 items-center">
                    <div>
                        <h2 class="text-3xl md:text-4xl font-black">Stampa, Ricicla, <span class="text-chartreuse">Risparmia.</span></h2>
                        <p class="mt-4 text-gray-200 max-w-lg">Con il nostro Ecosistema Circolare non sei solo un cliente: sei un partner attivo nella transizione verso una produzione a zero rifiuti. Porta 1 kg di plastica e guadagna 100 punti fedeltà.</p>
                        <a href="fedelta.php" class="inline-flex items-center mt-6 rounded-full bg-chartreuse text-amethyst font-bold px-4 py-2 shadow hover:opacity-95">Scopri il programma fedeltà →</a>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div class="rounded-lg border border-amethyst/30 p-6 text-center bg-amethyst/20">
                            <div class="text-3xl font-black text-chartreuse">1€</div>
                            <div class="mt-2 text-sm text-gray-200">10 Punti Fedeltà</div>
                        </div>
                        <div class="rounded-lg border border-amethyst/30 p-6 text-center bg-amethyst/20">
                            <div class="text-3xl font-black text-chartreuse">1 kg</div>
                            <div class="mt-2 text-sm text-gray-200">Scarti = 100 Punti</div>
                        </div>
                        <div class="rounded-lg border border-amethyst/30 p-6 text-center bg-amethyst/20">
                            <div class="text-3xl font-black text-chartreuse">6</div>
                            <div class="mt-2 text-sm text-gray-200">Livelli fedeltà</div>
                        </div>
                        <div class="rounded-lg border border-amethyst/30 p-6 text-center bg-amethyst/20">
                            <div class="text-3xl font-black text-chartreuse">&lt; 24 h</div>
                            <div class="mt-2 text-sm text-gray-200">Risposta preventivo</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
        <hr class="my-8">

        <section class="max-w-7xl mx-auto px-4 pb-2">
            <div class="flex flex-col gap-3">
                <h4 class="font-semibold col-span-3">SERVIZI & TECNOLOGIE</h4>
                <h2 class="font-black text-4xl sm:text-2xl col-span-3">Dalla progettazione alla stampa.</h2>
                <div class="flex sm:flex-row flex-col gap-2">
                    <article class="flex flex-col h-full rounded-[1.5rem] border border-gray-100 bg-white/80 p-7 shadow-sm">
                        <div class="block w-fit gap-2 rounded-full border border-amethyst/40 bg-chartreuse/15 px-4 py-2 text-sm font-semibold text-amethyst">FDM</div>
                        <h3 class="font-black text-amethyst">Stampa 3D FDM</h3>
                        <p class="mt-2 text-sm leading-relaxed text-gray-600">Filamento fuso strato su strato. Parti funzionali, prototipi robusti e grandi formati. Materiali: PLA, PLA riciclato, PETG, ABS, TPU.</p>
                    </article>
                    <article class="flex flex-col h-full rounded-[1.5rem] border border-gray-100 bg-white/80 p-7 shadow-sm">
                        <div class="block w-fit gap-2 rounded-full border border-amethyst/40 bg-chartreuse/15 px-4 py-2 text-sm font-semibold text-amethyst">SLA</div>
                        <h3 class="font-black text-amethyst">Stampa 3D Resina</h3>
                        <p class="mt-2 text-sm leading-relaxed text-gray-600">Alta definizione per miniature, gioielli e componenti estetici. Resina standard e tecnico/ingegneristico.</p>
                    </article>
                    <article class="flex flex-col h-full rounded-[1.5rem] border border-gray-100 bg-white/80 p-7 shadow-sm">
                        <div class="block w-fit gap-2 rounded-full border border-amethyst/40 bg-chartreuse/15 px-4 py-2 text-sm font-semibold text-amethyst">CAD & CNC</div>
                        <h3 class="font-black text-amethyst">Progettazione & Lavorazione</h3>
                        <p class="mt-2 text-sm leading-relaxed text-gray-600">Hai un'idea, un disegno o un oggetto rott? Modelliamo e lavoriamo il tuo progetto dal foglio bianco.</p>
                    </article>
                </div>
            </div>
        </section>
        <hr class="mb-5">

        <section class="max-w-7xl mx-auto px-4 py-4 pb-2">
            <div class="flex flex-col items-center rounded-[1.5rem] bg-amethyst text-white p-8 md:p-12">
                <h2 class="text-3xl md:text-4xl font-black">Pronto a <span class="text-chartreuse">stampare</span>?</h2>
                <p class="text-center mt-4 text-gray-200 max-w-lg">Carica il tuo file 3D (STL, STEP, OBJ) e ricevi un preventivo trasparente entro 24 ore. Nessun costo nascosto.</p>
                <a href="fedelta.php" class="inline-flex items-center mt-6 rounded-full bg-chartreuse text-amethyst font-bold px-4 py-2 shadow hover:opacity-95">Carica il tuo File 3D</a>
            </div>
        </section>

        
    </main>

    <?php include __DIR__ . '/includes/footer_v2.php'; ?>
</body>
</html>
