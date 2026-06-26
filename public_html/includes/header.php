<?php
$activePage = basename($_SERVER['PHP_SELF']);
?>
<header class="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur">
    <div class="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-4 md:flex-row lg:px-6">
        <a href="index.php" class="flex items-center gap-3 text-2xl font-black text-amethyst">
            <img src="assets/images/20260626_primefactory_logo_v1_upscale_v1.png" alt="PrimeFactory logo" class="h-20 w-auto">
            <span>PrimeFactory</span>
        </a>
        <nav class="flex flex-wrap items-center justify-center gap-4 text-sm lg:gap-6 lg:text-lg font-semibold text-gray-700">
            <a href="index.php" class="transition hover:text-lipstick <?php echo $activePage === 'index.php' ? 'text-lipstick' : ''; ?>">Home</a>
            <a href="servizi.php" class="transition hover:text-lipstick <?php echo $activePage === 'servizi.php' ? 'text-lipstick' : ''; ?>">Servizi & Tariffe</a>
            <a href="fedelta.php" class="transition hover:text-lipstick <?php echo $activePage === 'fedelta.php' ? 'text-lipstick' : ''; ?>">Ecosistema & Fedeltà</a>
            <a href="chi-siamo.php" class="transition hover:text-lipstick <?php echo $activePage === 'chi-siamo.php' ? 'text-lipstick' : ''; ?>">Chi Siamo</a>
            <a href="preventivo.php" class="sm:block hidden rounded-full bg-amethyst px-4 py-2 text-white transition hover:bg-carbon <?php echo $activePage === 'preventivo.php' ? 'bg-lipstick' : ''; ?>">Richiedi Preventivo</a>
        </nav>
    </div>
</header>
