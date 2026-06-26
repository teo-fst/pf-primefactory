<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policy | PrimeFactory</title>
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
<body class="min-h-screen bg-white text-carbon">
    <?php include __DIR__ . '/includes/header.php'; ?>
    <main class="mx-auto max-w-4xl flex-grow px-4 py-16 lg:px-6">
        <h1 class="text-3xl font-black text-amethyst">Privacy Policy</h1>
        <p class="mt-4 text-gray-700">I dati raccolti tramite il form vengono trattati esclusivamente per rispondere alla richiesta di preventivo e non vengono condivisi con terzi.</p>
    </main>
    <?php include __DIR__ . '/includes/footer.php'; ?>
</body>
</html>
