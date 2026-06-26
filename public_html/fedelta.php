<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Programma Fedeltà Green e Riciclo Plastica 3D | PrimeFactory</title>
    <meta name="description" content="Scopri il programma fedeltà di PrimeFactory: accumula punti, ricicla plastica e ottieni sconti esclusivi.">
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
</head>
<body class="min-h-screen bg-[linear-gradient(135deg,#ffffff_0%,#f7fff3_100%)] text-carbon">
    <?php include __DIR__ . '/includes/header.php'; ?>
    <main class="mx-auto max-w-7xl flex-grow px-4 py-16 lg:px-6">
        <div class="mb-10 max-w-3xl">
            <p class="text-sm font-semibold uppercase tracking-[0.2em] text-lipstick">Ecosistema & Fedeltà</p>
            <h1 class="mt-3 text-4xl font-black text-amethyst">Unisciti all’ecosistema circolare di PrimeFactory</h1>
            <p class="mt-4 text-lg text-gray-700">Ogni stampa, ogni riciclo e ogni referral contribuiscono a un sistema che premia il tuo impegno green.</p>
        </div>
        <div class="grid gap-6 lg:grid-cols-2">
            <article class="rounded-[1.5rem] border border-gray-100 bg-white p-7 shadow-sm">
                <h2 class="text-xl font-black text-amethyst">Come funziona</h2>
                <p class="mt-3 text-sm text-gray-600">1 € speso = 10 punti, 1 kg di plastica riciclata = 100 punti. Più punti accumuli, più sconti e benefici sblocchi.</p>
            </article>
            <article class="rounded-[1.5rem] border border-gray-100 bg-white p-7 shadow-sm">
                <h2 class="text-xl font-black text-amethyst">Referral</h2>
                <p class="mt-3 text-sm text-gray-600">Invita un amico con il tuo codice e ottenete entrambi vantaggi. Il codice è supportato dal database e valido in tempo reale.</p>
            </article>
        </div>
    </main>
    <?php include __DIR__ . '/includes/footer.php'; ?>
</body>
</html>
