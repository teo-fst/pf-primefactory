<!DOCTYPE html>
<html lang="it" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PrimeFactory | Servizio di Stampa 3D Professionale</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: { extend: { colors: { brand: { cyan: '#06b6d4', purple: '#a855f7', darkbg: '#0f172a' } } } }
        }
    </script>
    <style>
        .glass-card {
            background: rgba(30, 41, 59, 0.4);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.05);
        }
    </style>
</head>
<body class="bg-brand-darkbg text-slate-100 min-h-screen flex flex-col justify-between font-sans relative overflow-x-hidden">

    <div class="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-brand-cyan/10 rounded-full blur-[120px] pointer-events-none"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-brand-purple/10 rounded-full blur-[120px] pointer-events-none"></div>

    <header class="w-full max-w-6xl mx-auto p-6 flex justify-between items-center border-b border-slate-800/60 relative z-10">
        <div class="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-brand-cyan to-brand-purple tracking-wider">
            PRIMEFACTORY
        </div>
        <nav class="hidden md:flex space-x-8 text-sm font-medium text-slate-400">
            <a href="#tecnologie" class="hover:text-brand-cyan transition">Tecnologie</a>
            <a href="#materiali" class="hover:text-brand-cyan transition">Materiali</a>
            <a href="#sicurezza" class="hover:text-brand-cyan transition">Sicurezza Asset</a>
        </nav>
        <a href="preventivo.php" class="bg-slate-800 hover:bg-slate-700 text-xs font-bold px-4 py-2 rounded-lg border border-slate-700 transition">
            Area Preventivi
        </a>
    </header>

    <main class="flex-grow flex items-center justify-center px-4 relative z-10 py-12">
        <div class="max-w-4xl text-center space-y-8">
            <div class="inline-flex items-center gap-2 bg-gradient-to-r from-brand-cyan/20 to-brand-purple/20 border border-brand-cyan/30 px-4 py-1.5 rounded-full text-xs font-semibold text-brand-cyan">
                <span class="w-2 h-2 rounded-full bg-brand-cyan animate-pulse"></span>
                Ingegneria Additiva & Prototipazione Rapida
            </div>
            
            <h1 class="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight">
                Trasforma i tuoi modelli CAD in <br>
                <span class="bg-clip-text text-transparent bg-gradient-to-r from-brand-cyan via-emerald-400 to-brand-purple">
                    Componenti Reali
                </span>
            </h1>

            <p class="max-w-2xl mx-auto text-base md:text-lg text-slate-400 leading-relaxed">
                Hub di manifattura digitale specializzato in stampe industriali FDM ad alta precisione e resine SLA strutturali. Carica i tuoi file in sicurezza, analizziamo tolleranze e volumi in meno di 24 ore.
            </p>

            <div class="pt-4 flex flex-col sm:flex-row gap-4 justify-center items-center">
                <a href="preventivo.php" class="w-full sm:w-auto bg-gradient-to-r from-brand-cyan to-brand-purple text-slate-900 font-black px-8 py-4 rounded-xl hover:scale-105 transition shadow-lg shadow-brand-cyan/20 text-center">
                    Richiedi Preventivo Istantaneo
                </a>
                <a href="#tecnologie" class="w-full sm:w-auto text-sm font-semibold text-slate-300 hover:text-white px-6 py-4 transition text-center">
                    Scopri le tolleranze di stampa &rarr;
                </a>
            </div>

            <div id="tecnologie" class="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 text-left">
                <div class="glass-card p-6 rounded-xl space-y-2">
                    <div class="text-brand-cyan font-bold text-lg">Tecnologia FDM</div>
                    <p class="text-xs text-slate-400 leading-relaxed">Stampa a filamento fuso ottimizzata per lotti funzionali in PLA Eco, PETG strutturale e ABS ad alta resistenza termica.</p>
                </div>
                <div class="glass-card p-6 rounded-xl space-y-2">
                    <div class="text-brand-purple font-bold text-lg">Stereolitografia SLA</div>
                    <p class="text-xs text-slate-400 leading-relaxed">Resine fotopolimeriche liquide ideali per massima finitura superficiale, accoppiamenti meccanici millimetrici e miniature di precisione.</p>
                </div>
                <div class="glass-card p-6 rounded-xl space-y-2">
                    <div class="text-emerald-400 font-bold text-lg">Reverse Engineering</div>
                    <p class="text-xs text-slate-400 leading-relaxed">Clonazione e scansione hardware di componenti fisici usurati o danneggiati tramite scanner 3D JM Studio Maker Pro.</p>
                </div>
            </div>
        </div>
    </main>

    <footer class="w-full text-center py-6 text-xs text-slate-500 border-t border-slate-900/60 relative z-10">
        <div class="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
            <div>&copy; 2026 PrimeFactory Showcase. Infrastruttura DevOps basata su Git e Container Docker.</div>
            <div class="text-[10px] text-slate-600">Storage isolato con Offuscamento UUID v4 conforme alle linee GDPR.</div>
        </div>
    </footer>

</body>
</html>