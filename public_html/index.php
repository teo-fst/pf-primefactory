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
<body class="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,0,64,0.08),_transparent_35%),linear-gradient(135deg,#ffffff_0%,#fff8fb_100%)] text-carbon">
    <?php include __DIR__ . '/includes/header.php'; ?>

    <main class="flex-grow">
        <section class="max-w-7xl mx-auto px-4 py-16 lg:py-24">
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

                <img src="assets/images/20260626_paco_v5_indica_v1.png" alt="Paco mascot" class="mx-auto h-[35rem] w-auto object-contain drop-shadow-3xl">


                <div class="space-y-8">
                    <div class="inline-flex items-center gap-2 rounded-full border border-chartreuse/40 bg-chartreuse/15 px-4 py-2 text-sm font-semibold text-amethyst">
                        <span class="h-2.5 w-2.5 rounded-full bg-lipstick animate-pulse"></span>
                        Nuova generazione di manifattura additiva sostenibile
                    </div>
                    <h1 class="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-amethyst leading-tight">
                        La tua manifattura digitale,<br>
                        <span class="text-lipstick">trasparente</span> e <span class="text-chartreuse">circolare</span>.
                    </h1>
                    <p class="max-w-2xl text-lg text-gray-700 leading-relaxed">
                        Da PrimeFactory trasformiamo idee, file CAD e materiali di scarto in soluzioni stampate con precisione e responsabilità ambientale. Ogni richiesta viene analizzata da un team tecnico entro 24 ore.
                    </p>
                    <div class="flex flex-col sm:flex-row gap-4">
                        <a href="preventivo.php" class="inline-flex items-center justify-center rounded-2xl bg-amethyst px-6 py-3 text-white font-bold shadow-lg shadow-amethyst/15 transition hover:-translate-y-1">
                            Richiedi un preventivo gratuito
                        </a>
                        <a href="servizi.php" class="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 py-3 font-semibold text-carbon transition hover:border-lipstick">
                            Scopri i servizi
                        </a>
                    </div>
                    <div class="flex flex-wrap gap-4 text-sm text-gray-600">
                        <span class="rounded-full bg-white/80 px-3 py-1 shadow-sm">FDM e Resina</span>
                        <span class="rounded-full bg-white/80 px-3 py-1 shadow-sm">Progettazione CAD</span>
                        <span class="rounded-full bg-white/80 px-3 py-1 shadow-sm">Riciclo e punti fedeltà</span>
                    </div>
                </div>
            </div>
        </section>

        <section class="max-w-7xl mx-auto px-4 pb-20">
            <div class="grid gap-6 md:grid-cols-3">
                <article class="rounded-[1.5rem] border border-gray-100 bg-white/80 p-7 shadow-sm">
                    <div class="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-chartreuse/20 text-2xl">⚙️</div>
                    <h3 class="text-xl font-black text-amethyst">Precisione tecnica</h3>
                    <p class="mt-2 text-sm leading-relaxed text-gray-600">Da prototipi funzionali a pezzi estetici, ogni progetto viene studiato con tolleranze e materiali adeguati.</p>
                </article>
                <article class="rounded-[1.5rem] border border-gray-100 bg-white/80 p-7 shadow-sm">
                    <div class="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-lipstick/10 text-2xl">♻️</div>
                    <h3 class="text-xl font-black text-amethyst">Economia circolare</h3>
                    <p class="mt-2 text-sm leading-relaxed text-gray-600">Ricicliamo le plastiche di scarto e trasformiamo il tuo impegno green in punti fedeltà e sconti.</p>
                </article>
                <article class="rounded-[1.5rem] border border-gray-100 bg-white/80 p-7 shadow-sm">
                    <div class="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amethyst/10 text-2xl">📦</div>
                    <h3 class="text-xl font-black text-amethyst">Flusso semplice</h3>
                    <p class="mt-2 text-sm leading-relaxed text-gray-600">Compila il modulo in 3 passaggi, carica immagine di riferimento e ricevi una risposta pronta per il prossimo step.</p>
                </article>
            </div>
        </section>
    </main>

    <?php include __DIR__ . '/includes/footer.php'; ?>
</body>
</html>
