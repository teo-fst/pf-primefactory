<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chi Siamo e Trasparenza Energetica | PrimeFactory</title>
    <meta name="description" content="Scopri l’officina digitale PrimeFactory: trasparenza energetica, precisione tecnica e sostenibilità.">
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
<body class="min-h-screen bg-[linear-gradient(135deg,#fffdfd_0%,#f7f4ff_100%)] text-carbon">
    <?php include __DIR__ . '/includes/header.php'; ?>
    <main class="mx-auto max-w-7xl flex-grow px-4 py-16 lg:px-6">
        <div class="mb-10 max-w-3xl">
            <p class="text-sm font-semibold uppercase tracking-[0.2em] text-lipstick">Chi siamo</p>
            <h1 class="mt-3 text-4xl font-black text-amethyst">Manifattura digitale trasparente ed eco-consapevole</h1>
            <p class="mt-4 text-lg text-gray-700">PrimeFactory unisce tecnologia, sostenibilità e supporto umano per rendere la stampa 3D accessibile e affidabile.</p>
        </div>
        <div class="grid gap-6 lg:grid-cols-2">
            <article class="rounded-[1.5rem] border border-gray-100 bg-white p-7 shadow-sm">
                <h2 class="text-xl font-black text-amethyst">La nostra storia</h2>
                <p class="mt-3 text-sm text-gray-600">Nasciamo per semplificare la produzione di piccoli lotti, prototipi e componenti speciali, senza rinunciare a qualità e trasparenza.</p>
            </article>
            <article class="rounded-[1.5rem] border border-gray-100 bg-white p-7 shadow-sm">
                <h2 class="text-xl font-black text-amethyst">Trasparenza energetica</h2>
                <p class="mt-3 text-sm text-gray-600">Misuriamo i consumi e li rendiamo chiari, così il cliente paga solo il reale impatto energetico del progetto.</p>
            </article>
        </div>
    </main>
    <?php include __DIR__ . '/includes/footer.php'; ?>
</body>
</html>
