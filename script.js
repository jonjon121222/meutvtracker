// =========================================================================
// PARTE 1: VARIÁVEIS GLOBAIS, INICIALIZAÇÃO, STORAGE E UTILITÁRIOS
// =========================================================================

const DB_NAME = 'meu tv time_v70';
var games = [];
var aguardados = [];
var aguardadosGamer = [];
var fortniteHours = 0;
var deathListData = Array.from({length: 100}, () => ({cover: '', name: '', rating: 0}));
var seriesListData = Array.from({length: 100}, () => ({cover: '', name: '', rating: 0}));
var malucosListData = Array.from({length: 100}, () => ({cover: '', name: '', rating: 0}));
var jogos100ListData = Array.from({length: 100}, () => ({cover: '', name: '', rating: 0}));
var customListas = [];
var franquiasData = [];

// Arrays para o Modo Gamer
var jogosPlataformasData = [];
var storesData = [];
var storeGamesData = [];
var generosTiposData = [];
var currentActiveStoreId = null; 
var draggedPlatIndex = null;
var draggedGtIndex = null;

// Controles de Interface
var displayLimitTV = 20;
var displayLimitGamer = 20;
var currentFiltered = [];
var favFilter = 'all';
var currentBadgeFilter = 'all'; 
var viewModeTV = 'grid'; 
var viewModeGamer = 'grid'; 
var currentCollectionGenreTV = 'Todos';
var currentCollectionGenreGamer = 'Todos'; 
var searchTimeout;

// Estados Globais
var currentAppMode = localStorage.getItem('ct_last_mode_v70') || 'tv';
var currentDetailsMode = 'small';
var currentDetailId = null;
var isPwaBooted = false;

// ====================================================
// SERVICE WORKER
// ====================================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log('Erro no SW:', err));
    });
}

// ====================================================
// UTILITÁRIOS BASE
// ====================================================
function formatMinutes(totalMin) { 
    return `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`; 
}

function toggleBlock(id, btn) {
    const el = document.getElementById(id);
    const isCollapsed = el.classList.toggle('section-collapsed');
    btn.innerText = isCollapsed ? '＋' : '−';
}

function toggleTheme() { 
    document.body.classList.toggle('light-mode'); 
}

function scrollContainer(id, amt) { 
    document.getElementById(id).scrollBy({ left: amt, behavior: 'smooth' }); 
}

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            alert(`Erro ao tentar entrar em tela cheia: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

async function urlToBase64(url, useProxy = false) {
    if (!url || url.startsWith('data:image')) return url;
    
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous'; 
        
        const timer = setTimeout(() => { resolve(url); }, 5000); 
        
        img.onload = () => {
            clearTimeout(timer);
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const MAX_WIDTH = 300; 
                var scaleSize = MAX_WIDTH / img.width;
                if (scaleSize > 1) scaleSize = 1;
                
                canvas.width = img.width * scaleSize;
                canvas.height = img.height * scaleSize;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/webp', 0.7));
            } catch (err) {
                resolve(url);
            }
        };
        
        img.onerror = () => { 
            clearTimeout(timer);
            if (!useProxy) {
                console.log("CORS bloqueou a imagem. Tentando forçar via Proxy...");
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
                resolve(urlToBase64(proxyUrl, true)); 
            } else {
                resolve(url); 
            }
        };
        img.src = url;
    });
}

// ====================================================
// BANCO DE DADOS (LOCALFORAGE)
// ====================================================
async function loadData() {
    try {
        var loadedGames = await localforage.getItem(DB_NAME);
        var loadedAguardados = await localforage.getItem('ct_aguardados_v70');
        var loadedDeathList = await localforage.getItem('cineDeathList_v70');
        var loadedSeriesList = await localforage.getItem('cineSeriesList_v70');
        var loadedMalucosList = await localforage.getItem('cineMalucosList_v70');
        var loadedJogos100 = await localforage.getItem('cineJogos100List_v70');
        var loadedFortnite = await localforage.getItem('ct_fortnite_hours_v70');
        var loadedListas = await localforage.getItem('ct_listas_custom');
        var loadedFranquias = await localforage.getItem('ct_franquias_v70');
        var loadedAguardadosGamer = await localforage.getItem('ct_aguardados_gamer_v70');
        var loadedJogosPlat = await localforage.getItem('ct_jogos_plat_v70');
        var loadedStores = await localforage.getItem('ct_stores_v70');
        var loadedStoreGames = await localforage.getItem('ct_store_games_v70');
        var loadedGenerosTipos = await localforage.getItem('ct_generos_tipos_v70');

        // Migração de dados de versões antigas (se houver)
        if (!loadedGames && localStorage.getItem('meu tv timer_v50')) {
            loadedGames = JSON.parse(localStorage.getItem('meu tv time_v50'));
            await localforage.setItem(DB_NAME, loadedGames);
        }
        
        if (loadedGames) games = loadedGames;
        if (loadedAguardados) aguardados = loadedAguardados;
        if (loadedDeathList) deathListData = loadedDeathList;
        if (loadedSeriesList) seriesListData = loadedSeriesList;
        if (loadedMalucosList) malucosListData = loadedMalucosList;
        if (loadedJogos100) jogos100ListData = loadedJogos100;
        if (loadedListas) customListas = loadedListas;
        if (loadedFranquias) franquiasData = loadedFranquias;
        if (loadedAguardadosGamer) aguardadosGamer = loadedAguardadosGamer;
        if (loadedFortnite !== null) fortniteHours = loadedFortnite;
        if (loadedJogosPlat) jogosPlataformasData = loadedJogosPlat;
        if (loadedStores) storesData = loadedStores;
        if (loadedStoreGames) storeGamesData = loadedStoreGames;
        if (loadedGenerosTipos) generosTiposData = loadedGenerosTipos;
    } catch (err) {
        console.error("Erro ao carregar dados:", err);
    }
}

async function manualSave() {
    try {
        await localforage.setItem(DB_NAME, games);
        await localforage.setItem('ct_aguardados_v70', aguardados);
        await localforage.setItem('cineDeathList_v70', deathListData);
        await localforage.setItem('cineSeriesList_v70', seriesListData);
        await localforage.setItem('cineMalucosList_v70', malucosListData);
        await localforage.setItem('cineJogos100List_v70', jogos100ListData);
        await localforage.setItem('ct_listas_custom', customListas);
        await localforage.setItem('ct_franquias_v70', franquiasData);
        await localforage.setItem('ct_aguardados_gamer_v70', aguardadosGamer);
        await localforage.setItem('ct_jogos_plat_v70', jogosPlataformasData);
        await localforage.setItem('ct_stores_v70', storesData);
        await localforage.setItem('ct_store_games_v70', storeGamesData);
        await localforage.setItem('ct_generos_tipos_v70', generosTiposData);
        
        applyFilters();
        renderGames();
        renderAbsoluteCinema();
        if(typeof renderAbsoluteVideoGame === 'function') renderAbsoluteVideoGame();
        if(document.getElementById('badgesModal').style.display === 'flex') { renderBadges(); }
        if(document.getElementById('franquiasModal').style.display === 'flex') { renderFranquias(); }
        
        const toast = document.getElementById('saveToast');
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
    } catch (err) { console.error("Erro ao salvar:", err); }
}

// ====================================================
// BOAS VINDAS E FUNDOS
// ====================================================
function enterApp() {
    const welcome = document.getElementById('welcome-screen');
    const mainApp = document.getElementById('mainApp');
    welcome.classList.add('welcome-hidden');
    setTimeout(() => {
        welcome.style.display = 'none';
        mainApp.style.display = 'flex';
        void mainApp.offsetWidth; 
        mainApp.classList.add('app-visible');
    }, 800); 
}

async function changeProfilePic(event) {
    const file = event.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        const base64 = e.target.result;
        document.getElementById('profilePicWelcome').src = base64;
        document.getElementById('profilePicWelcome').classList.remove('hidden');
        document.getElementById('profilePicPlaceholder').classList.add('hidden');
        await localforage.setItem('ct_profile_pic_v70', base64);
    };
    reader.readAsDataURL(file);
}

async function loadProfilePic() {
    const pic = await localforage.getItem('ct_profile_pic_v70');
    if (pic) {
        document.getElementById('profilePicWelcome').src = pic;
        document.getElementById('profilePicWelcome').classList.remove('hidden');
        document.getElementById('profilePicPlaceholder').classList.add('hidden');
    }
}

function checkDataStatus() {
    const hasData = games.length > 0 || customListas.length > 0 || franquiasData.length > 0 || deathListData.some(d => d.name !== '') || seriesListData.some(d => d.name !== '') || malucosListData.some(d => d.name !== '');
    const btnStart = document.getElementById('btnStartWelcome');
    btnStart.disabled = false;
    if (hasData) {
        btnStart.innerText = "INICIAR SESSÃO";
    } else {
        btnStart.innerText = "COMEÇAR DO ZERO";
    }
}

async function changeBackground() {
    const url = prompt("Cole a URL da imagem para o plano de fundo (ou deixe em branco para remover):");
    if (url !== null) {
        if (url.trim() === "") {
            document.body.style.backgroundImage = 'none';
            await localforage.removeItem('ct_custom_bg_v70');
        } else {
            const bgStyle = `linear-gradient(rgba(0,0,0,0.80), rgba(0,0,0,0.90)), url('${url.trim()}')`;
            document.body.style.backgroundImage = bgStyle;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center';
            document.body.style.backgroundAttachment = 'fixed';
            await localforage.setItem('ct_custom_bg_v70', url.trim());
        }
    }
}

async function loadCustomBackground() {
    const bgUrl = await localforage.getItem('ct_custom_bg_v70');
    if (bgUrl) {
        document.body.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.80), rgba(0,0,0,0.90)), url('${bgUrl}')`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundAttachment = 'fixed';
    }
}

// ====================================================
// ALTERNÂNCIA DE MODOS (TV / GAMER)
// ====================================================
function switchAppMode(mode, force = false) {
    if (!force && currentAppMode === mode) return;
    
    currentAppMode = mode;
    localStorage.setItem('ct_last_mode_v70', mode); 

    const tvSection = document.getElementById('tv-mode-section');
    const gamerSection = document.getElementById('gamer-mode-section');
    const sliderBg = document.getElementById('sliderBg');
    const btnTV = document.getElementById('btnModeTV');
    const btnGamer = document.getElementById('btnModeGamer');
    const appTitle = document.getElementById('mainAppTitle');

    const filterTitle = document.querySelector('.dropdown-menu h4');
    const typeFilter = document.getElementById('typeFilter');
    const genreFilter = document.getElementById('genreFilter');
    const statusFilter = document.getElementById('statusFilter');
const platformFilter = document.getElementById('platformFilter');
    
    // NOVO: Pega o botão central que acabamos de adicionar o ID
    const btnMainRegister = document.getElementById('btnMainRegister'); 

    if (mode === 'tv') {
        tvSection.classList.remove('hidden');
        gamerSection.classList.add('hidden');
        
        sliderBg.style.transform = 'translateX(0)';
        sliderBg.classList.remove('bg-blue-500', 'shadow-[0_0_10px_rgba(59,130,246,0.6)]');
        sliderBg.classList.add('bg-[var(--accent)]', 'shadow-[0_0_10px_var(--accent-glow)]');
        
        btnTV.classList.add('text-white'); btnTV.classList.remove('text-[var(--text-dim)]');
        btnGamer.classList.add('text-[var(--text-dim)]'); btnGamer.classList.remove('text-white');
        
        appTitle.innerHTML = 'SCENIX <span style="color: var(--accent); text-shadow: 0 0 10px var(--accent-glow);">TIME</span>';

        if (filterTitle) {
            filterTitle.innerHTML = '🔍 Filtros Avançados';
            filterTitle.className = 'text-[9px] font-black text-[var(--accent)] uppercase tracking-widest px-1 pb-1 mb-1 border-b border-[var(--border)]';
        }
        if (typeFilter) {
            typeFilter.style.display = 'block'; 
            typeFilter.innerHTML = '<option value="all">Formatos</option><option value="Filme">Filmes</option><option value="Série">Séries</option><option value="Anime">Animes</option><option value="Desenho">Desenhos</option><option value="Filme OVA">Filme OVAs</option>';
            typeFilter.value = 'all';
        }
        if (genreFilter) {
            genreFilter.innerHTML = '<option value="all">Gêneros</option><option value="Ação">Ação</option><option value="Animação">Animação</option><option value="Aventura">Aventura</option><option value="Comédia">Comédia</option><option value="Comédia Romantica">Comédia Romantica</option><option value="Crime">Crime</option><option value="Documentário">Documentário</option><option value="Drama">Drama</option><option value="Espionagem">Espionagem</option><option value="Esporte">Esporte</option><option value="Família">Família</option><option value="Fantasia">Fantasia</option><option value="Ficção Científica">Ficção Científica</option><option value="Isekai">Isekai</option><option value="Policial">Policial</option><option value="Romance">Romance</option><option value="Suspense">Suspense</option><option value="Terror">Terror</option>';
            genreFilter.value = 'all';
        }
        if (statusFilter) {
            statusFilter.innerHTML = '<option value="all">Status</option><option value="Assistindo">Assistindo</option><option value="Visto">Visto</option><option value="Watchlist">Watchlist</option><option value="Abandonado">Abandonado</option>';
            statusFilter.value = 'all';
        }
if (platformFilter) {
            platformFilter.style.display = 'none'; 
            platformFilter.value = 'all';
        }
        
        // NOVO: Cores TV Time para o botão Central
        if (btnMainRegister) {
            btnMainRegister.classList.remove('bg-blue-500', 'shadow-[0_10px_25px_rgba(59,130,246,0.6)]', 'hover:shadow-[0_15px_35px_rgba(59,130,246,0.8)]');
            btnMainRegister.classList.add('bg-[var(--accent)]', 'shadow-[0_10px_25px_rgba(225,29,72,0.6)]', 'hover:shadow-[0_15px_35px_rgba(225,29,72,0.8)]');
        }
        
    } else {
        tvSection.classList.add('hidden');
        gamerSection.classList.remove('hidden');
        
        sliderBg.style.transform = 'translateX(100%)';
        sliderBg.classList.remove('bg-[var(--accent)]', 'shadow-[0_0_10px_var(--accent-glow)]');
        sliderBg.classList.add('bg-blue-500', 'shadow-[0_0_10px_rgba(59,130,246,0.6)]');
        
        btnGamer.classList.add('text-white'); btnGamer.classList.remove('text-[var(--text-dim)]');
        btnTV.classList.add('text-[var(--text-dim)]'); btnTV.classList.remove('text-white');
        
        appTitle.innerHTML = 'SCENIX <span class="text-blue-500" style="text-shadow: 0 0 10px rgba(59,130,246,0.8);">TIME</span>';

        if (filterTitle) {
            filterTitle.innerHTML = '🎮 Filtros Gamer';
            filterTitle.className = 'text-[9px] font-black text-blue-500 uppercase tracking-widest px-1 pb-1 mb-1 border-b border-[var(--border)]';
        }
        if (typeFilter) {
            typeFilter.style.display = 'none'; 
            typeFilter.value = 'all';
        }
        if (genreFilter) {
            genreFilter.innerHTML = '<option value="all">Gêneros de Jogos</option><option value="Ação">Ação</option><option value="Aventura">Aventura</option><option value="RPG">RPG</option><option value="Tiro">Tiro / Shooter</option><option value="Plataforma">Plataforma</option><option value="Luta">Luta</option><option value="Esporte">Esporte</option><option value="Corrida">Corrida</option><option value="Estratégia">Estratégia</option><option value="Simulação">Simulação</option><option value="Terror">Terror / Survival</option><option value="Puzzle">Puzzle</option><option value="Stealth">Stealth</option><option value="Mundo Aberto">Mundo Aberto</option><option value="Sobrevivência">Sobrevivência</option><option value="MMO">MMO</option>';
            genreFilter.value = 'all';
        }
        if (statusFilter) {
            statusFilter.innerHTML = '<option value="all">Status do Jogo</option><option value="Assistindo">Jogando / Andamento</option><option value="Visto">Zerado</option><option value="Watchlist">Backlog</option><option value="Abandonado">Abandonado (Dropado)</option>';
            statusFilter.value = 'all';
        }
if (platformFilter) {
            platformFilter.style.display = 'block'; 
            platformFilter.innerHTML = '<option value="all">Todas as Plataformas</option><option value="3DO">3DO</option><option value="Amiga CD32">Amiga CD32</option><option value="Arcade - Mame">Arcade - Mame</option><option value="Atari 2600">Atari 2600</option><option value="Atari 7800">Atari 7800</option><option value="Atomiswave">Atomiswave</option><option value="Celular">Celular</option><option value="Coleco Vision">Coleco Vision</option><option value="Dreamcast">Dreamcast</option><option value="Famicom - Family Computer">Famicom - Family Computer</option><option value="Flash (PC)">Flash (PC)</option><option value="Game e Watch">Game e Watch</option><option value="Game Gear - Sega">Game Gear - Sega</option><option value="GameCube">GameCube</option><option value="GB - Game Boy">GB - Game Boy</option><option value="GBA - Game Boy Advance">GBA - Game Boy Advance</option><option value="GBC - Game Boy Color">GBC - Game Boy Color</option><option value="GX4000 - Amstrad">GX4000 - Amstrad</option><option value="Intellivision">Intellivision</option><option value="Jaguar - Atari">Jaguar - Atari</option><option value="Java (Celular)">Java (Celular)</option><option value="Lynx - Atari">Lynx - Atari</option><option value="Magnavox Odyssey">Magnavox Odyssey</option><option value="Master System">Master System</option><option value="Master System - Tec Toy">Master System - Tec Toy</option><option value="Mega Drive">Mega Drive</option><option value="Mega Drive 32X">Mega Drive 32X</option><option value="Model 2 - Sega">Model 2 - Sega</option><option value="Model 3 - Sega">Model 3 - Sega</option><option value="MSX">MSX</option><option value="Naomi - Sega">Naomi - Sega</option><option value="Naomi 2 - Sega">Naomi 2 - Sega</option><option value="Neo-Geo">Neo-Geo</option><option value="Neo-Geo Pocket">Neo-Geo Pocket</option><option value="Neo-Geo Pocket Color">Neo-Geo Pocket Color</option><option value="NES - Nintendinho">NES - Nintendinho</option><option value="Nintendo 3DS">Nintendo 3DS</option><option value="Nintendo 64">Nintendo 64</option><option value="Nintendo Color TV  - Game 6">Nintendo Color TV  - Game 6</option><option value="Nintendo DS">Nintendo DS</option><option value="Nintendo Wii">Nintendo Wii</option><option value="Nintendo Wii U">Nintendo Wii U</option><option value="Odyssey - Gradiente">Odyssey - Gradiente</option><option value="OpenBOR">OpenBOR</option><option value="PC">PC</option><option value="PC Engine - TurboGrafx-16">PC Engine - TurboGrafx-16</option><option value="Phantom System - Gradiente">Phantom System - Gradiente</option><option value="Philips CD">Philips CD</option><option value="Pinball FX3">Pinball FX3</option><option value="Playstation 1">Playstation 1</option><option value="Playstation 2">Playstation 2</option><option value="Playstation 3">Playstation 3</option><option value="Playstation 4">Playstation 4</option><option value="Playstation 5">Playstation 5</option><option value="PONG - Atari">PONG - Atari</option><option value="PS Vita">PS Vita</option><option value="PSP">PSP</option><option value="Sega CD">Sega CD</option><option value="Sega Saturn">Sega Saturn</option><option value="SG-1000 - Sega">SG-1000 - Sega</option><option value="SNES - Super Nintendo">SNES - Super Nintendo</option><option value="Switch">Switch</option><option value="TELEJOGO - PHILCO BR">TELEJOGO - PHILCO BR</option><option value="Turbo Game - CCE">Turbo Game - CCE</option><option value="Vectrex">Vectrex</option><option value="Virtual Boy">Virtual Boy</option><option value="Wonder Swan Color - Bandai">Wonder Swan Color - Bandai</option><option value="Xbox">Xbox</option><option value="Xbox 360">Xbox 360</option><option value="Xbox One">Xbox One</option><option value="Xbox Series X/S">Xbox Series X/S</option>';
            platformFilter.value = 'all';
        }

        // NOVO: Cores Gamer para o botão Central
        if (btnMainRegister) {
            btnMainRegister.classList.remove('bg-[var(--accent)]', 'shadow-[0_10px_25px_rgba(225,29,72,0.6)]', 'hover:shadow-[0_15px_35px_rgba(225,29,72,0.8)]');
            btnMainRegister.classList.add('bg-blue-500', 'shadow-[0_10px_25px_rgba(59,130,246,0.6)]', 'hover:shadow-[0_15px_35px_rgba(59,130,246,0.8)]');
        }
    }

    if (typeof resetAndRender === 'function') resetAndRender();

    if (!force) {
        document.getElementById('scrollContainer').scrollTo({ top: 0, behavior: 'smooth' });
    }
}// =========================================================================
// PARTE 2: SISTEMA DE FILTROS E RENDERIZAÇÃO BASE (CARDS E DRAG & DROP)
// =========================================================================

// --- SISTEMA DE SCROLL INFINITO (LAZY LOAD) ---
function setupScrollObserver() {
    const observerOptions = {
        root: document.getElementById('scrollContainer'),
        rootMargin: '0px',
        threshold: 0.1
    };

    const observerCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (entry.target.id === 'scrollSentinel' && currentAppMode === 'tv') {
                    displayLimitTV += 20;
                    renderGamesGridOnly();
                } else if (entry.target.id === 'scrollSentinelGamer' && currentAppMode === 'gamer') {
                    displayLimitGamer += 20;
                    renderGamesGridOnly();
                }
            }
        });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    const sentinelTV = document.getElementById('scrollSentinel');
    if (sentinelTV) observer.observe(sentinelTV);

    const sentinelGamer = document.getElementById('scrollSentinelGamer');
    if (sentinelGamer) observer.observe(sentinelGamer);
}

// --- FUNÇÕES DE BUSCA E FILTROS ---
function handleSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        resetAndRender();
    }, 300); // 300 milissegundos de debounce
}

function clearSearchField() {
    document.getElementById('searchInput').value = '';
    resetAndRender();
}

// NOVA FUNÇÃO: Preenche dinamicamente os anos de lançamento e anos que você jogou/assistiu
function updateYearFilters() {
    const releaseYearSelect = document.getElementById('releaseYearFilter');
    const yearSelect = document.getElementById('yearFilter');

    if (!releaseYearSelect || !yearSelect) return;

    // Salva as opções selecionadas atualmente para não perder ao trocar de aba
    const currentRYF = releaseYearSelect.value;
    const currentYF = yearSelect.value;

    // Filtra os itens com base no modo atual (TV ou Gamer) para não misturar os anos
    const modeGames = games.filter(g => currentAppMode === 'gamer' ? g.type === 'Jogo' : g.type !== 'Jogo');

    // Extrai anos únicos e ordena do mais recente para o mais antigo
    const releaseYears = [...new Set(modeGames.map(g => g.releaseYear).filter(y => y && y.toString().trim() !== ''))].sort((a, b) => b - a);
    const watchedYears = [...new Set(modeGames.map(g => g.startDate ? g.startDate.split('-')[0] : null).filter(y => y))].sort((a, b) => b - a);

    // Texto dinâmico: "Ano Jogado" no GamerTracker e "Ano Assistido" no Meu TV Time
    const yearLabelText = currentAppMode === 'gamer' ? 'Ano Jogado' : 'Ano Assistido';

    // Popula os selects do HTML
    releaseYearSelect.innerHTML = '<option value="all">Ano de Lançamento</option>' +
        releaseYears.map(y => `<option value="${y}">${y}</option>`).join('');

    yearSelect.innerHTML = `<option value="all">${yearLabelText}</option>` +
        watchedYears.map(y => `<option value="${y}">${y}</option>`).join('');

    // Restaura as seleções caso elas ainda existam nas novas opções
    if (releaseYears.includes(currentRYF) || currentRYF === 'all') releaseYearSelect.value = currentRYF;
    if (watchedYears.includes(currentYF) || currentYF === 'all') yearSelect.value = currentYF;
}
function applyFilters() {
    const normalizeText = (text) => (text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const queryRaw = (document.getElementById('searchInput').value || "");
    const query = normalizeText(queryRaw);
    const sF = document.getElementById('statusFilter').value || 'all';
    const tF = document.getElementById('typeFilter').value || 'all';
    const gF = document.getElementById('genreFilter').value || 'all'; 
    const yF = document.getElementById('yearFilter').value || 'all'; 
    const ryF = document.getElementById('releaseYearFilter').value || 'all'; 
    const ratF = document.getElementById('ratingFilter').value || 'all'; 
    
    // NOVO: Captura o valor do filtro de plataformas
    const pF = document.getElementById('platformFilter') ? document.getElementById('platformFilter').value : 'all';
    
    const normalizedGF = normalizeText(gF);

    currentFiltered = games.filter(g => {
        const yearPlayed = g.startDate?.split('-')[0];
        const yearReleased = g.releaseYear?.toString();
        
        const matchName = normalizeText(g.name).includes(query);
        const matchYear = (g.releaseYear || "").toString().includes(queryRaw);

        const matchStatus = sF === 'all' || (g.status||'watchlist').toLowerCase() === sF.toLowerCase();
        const matchType = tF === 'all' || (g.type||'Filme') === tF;
        const matchYF = yF === 'all' || yearPlayed === yF;
        const matchRYF = ryF === 'all' || yearReleased === ryF;
        const matchRating = ratF === 'all' || Math.floor(parseFloat(g.rating || 0)) === parseInt(ratF);
        
        // NOVO: Verifica se a plataforma do jogo bate com o select
        const matchPlatform = pF === 'all' || (g.gamePlatform || '').toLowerCase().trim() === pF.toLowerCase().trim();

        const gameGenresList = normalizeText(g.genre)
            .split(/[,/]/)
            .map(s => {
                var textoLimpo = s.trim();
                if (textoLimpo === 'ficcao cientifica' || textoLimpo === 'sci-fi' || textoLimpo === 'sci fi') {
                    return 'ficcao';
                }
                return textoLimpo;
            });
        
        const finalGF = (normalizedGF === 'ficcao cientifica' || normalizedGF === 'sci-fi' || normalizedGF === 'sci fi') ? 'ficcao' : normalizedGF;
        const matchGlobalGenre = gF === 'all' || gameGenresList.includes(finalGF);

        // NOVO: matchPlatform incluso na condição de retorno final
        return (matchName || matchYear) && matchStatus && matchType && matchYF && matchRYF && matchRating && matchGlobalGenre && matchPlatform;
    });

    currentFiltered.sort((a, b) => {
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
        return dateB - dateA;
    });

    if (typeof updateDashboard === 'function') updateDashboard(currentFiltered);
    if (typeof setupScrollObserver === 'function') setupScrollObserver(); 
}

function resetFilters() {
    if (document.getElementById('searchInput')) document.getElementById('searchInput').value = '';
    if (document.getElementById('typeFilter')) document.getElementById('typeFilter').value = 'all';
    if (document.getElementById('genreFilter')) document.getElementById('genreFilter').value = 'all';
    if (document.getElementById('releaseYearFilter')) document.getElementById('releaseYearFilter').value = 'all';
    if (document.getElementById('yearFilter')) document.getElementById('yearFilter').value = 'all';
    if (document.getElementById('statusFilter')) document.getElementById('statusFilter').value = 'all';
    if (document.getElementById('ratingFilter')) document.getElementById('ratingFilter').value = 'all';
    
    // NOVO: Reseta o filtro de plataformas
    if (document.getElementById('platformFilter')) document.getElementById('platformFilter').value = 'all';
    
    resetFiltersTV();
    resetFiltersGamer();
    resetAndRender();
}
function resetAndRender() { 
    displayLimitTV = 20; 
    displayLimitGamer = 20;
    
    const sentinelTV = document.getElementById('scrollSentinel');
    if (sentinelTV) {
        sentinelTV.innerText = "Carregando TV Time...";
        sentinelTV.style.opacity = "0.4";
    }
    
    const sentinelGamer = document.getElementById('scrollSentinelGamer');
    if (sentinelGamer) {
        sentinelGamer.innerText = "Carregando Gametracker...";
        sentinelGamer.style.opacity = "0.4";
    }
    
    if (typeof renderGames === 'function') renderGames(); 
}

function setCollectionGenre(genre, btnElement, target) {
    if (target === 'tv') {
        currentCollectionGenreTV = genre;
        const buttons = document.querySelectorAll('.tv-genre-btn');
        buttons.forEach(btn => {
            btn.classList.remove('active', 'bg-[var(--accent)]/10', 'text-[var(--accent)]', 'border-[var(--accent)]', 'shadow-[0_0_8px_rgba(225,29,72,0.4)]');
            btn.classList.add('border-[var(--border)]', 'text-[var(--text-dim)]');
        });
        if (btnElement) {
            btnElement.classList.remove('border-[var(--border)]', 'text-[var(--text-dim)]');
            btnElement.classList.add('active', 'bg-[var(--accent)]/10', 'text-[var(--accent)]', 'border-[var(--accent)]', 'shadow-[0_0_8px_rgba(225,29,72,0.4)]');
        }
        displayLimitTV = 20;
    } else if (target === 'gamer') {
        currentCollectionGenreGamer = genre;
        const buttons = document.querySelectorAll('.gamer-genre-btn');
        buttons.forEach(btn => {
            btn.classList.remove('active', 'bg-blue-500/10', 'text-blue-500', 'border-blue-500', 'shadow-[0_0_8px_rgba(59,130,246,0.4)]');
            btn.classList.add('border-[var(--border)]', 'text-[var(--text-dim)]');
        });
        if (btnElement) {
            btnElement.classList.remove('border-[var(--border)]', 'text-[var(--text-dim)]');
            btnElement.classList.add('active', 'bg-blue-500/10', 'text-blue-500', 'border-blue-500', 'shadow-[0_0_8px_rgba(59,130,246,0.4)]');
        }
        displayLimitGamer = 20;
    }
    renderGamesGridOnly();
}

function resetFiltersTV() {
    const btnTodos = document.querySelector('.tv-genre-btn');
    if (btnTodos) setCollectionGenre('Todos', btnTodos, 'tv');
}

function resetFiltersGamer() {
    const btnTodos = document.querySelector('.gamer-genre-btn');
    if (btnTodos) setCollectionGenre('Todos', btnTodos, 'gamer');
}

function setViewMode(mode, target) {
    if (target === 'tv') {
        if (viewModeTV === mode) return;
        viewModeTV = mode;
        
        const btnGrid = document.getElementById('btnViewGridTV');
        const btnList = document.getElementById('btnViewListTV');
        const grid = document.getElementById('gameGrid');
        
        const activeClasses = "px-3 py-1.5 text-[9px] font-black tracking-widest transition-all bg-[var(--accent)] text-white shadow-[0_0_10px_var(--accent-glow)]";
        const inactiveClasses = "px-3 py-1.5 text-[9px] font-black tracking-widest transition-all text-[var(--text-dim)] hover:text-[var(--text-main)] hover:bg-[var(--surfaceHover)]";
        
        if (mode === 'grid') {
            btnGrid.className = activeClasses;
            btnList.className = inactiveClasses;
            grid.className = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 transition-all duration-300';
        } else {
            btnList.className = activeClasses;
            btnGrid.className = inactiveClasses;
            grid.className = 'flex flex-col gap-3 transition-all duration-300';
        }
    } else if (target === 'gamer') {
        if (viewModeGamer === mode) return;
        viewModeGamer = mode;
        
        const btnGrid = document.getElementById('btnViewGridGamer');
        const btnList = document.getElementById('btnViewListGamer');
        const grid = document.getElementById('gameGridGamer');
        
        const activeClasses = "px-3 py-1.5 text-[9px] font-black tracking-widest transition-all bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]";
        const inactiveClasses = "px-3 py-1.5 text-[9px] font-black tracking-widest transition-all text-[var(--text-dim)] hover:text-[var(--text-main)] hover:bg-[var(--surfaceHover)]";
        
        if (mode === 'grid') {
            btnGrid.className = activeClasses;
            btnList.className = inactiveClasses;
            grid.className = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 transition-all duration-300';
        } else {
            btnList.className = activeClasses;
            btnGrid.className = inactiveClasses;
            grid.className = 'flex flex-col gap-3 transition-all duration-300';
        }
    }
    renderGamesGridOnly();
}

// --- GERAÇÃO DE CARDS E GRID PRINCIPAL ---
function generateCardHTML(g, currentViewMode) {
    // A função de cálculo virá na Parte 4, mas usamos com segurança aqui
    const totalMinutes = typeof calculateItemTotalMinutes === 'function' ? calculateItemTotalMinutes(g) : 0;
    
    var epProg = '';
    const isGame = g.type === 'Jogo';
    const isMovie = ['Filme', 'Filme OVA'].includes(g.type || 'Filme');

    if (!isMovie && !isGame && g.epTotal > 0) {
        const percent = Math.round((g.epWatched / g.epTotal) * 100) || 0;
        const barColor = percent >= 100 ? 'bg-[var(--green)] shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-[var(--accent)] shadow-[0_0_8px_rgba(225,29,72,0.3)]';
        epProg = `<div class="mt-1 space-y-1 w-full">
            <div class="flex justify-between text-[7px] font-black opacity-60 uppercase"><span>Eps: ${g.epWatched}/${g.epTotal}</span><span>${percent}%</span></div>
            <div class="h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div class="h-full ${barColor} transition-all duration-700" style="width: ${percent}%"></div>
            </div>
        </div>`;
    } else if (isGame && g.targetHours > 0) {
        const hAtuais = parseInt(g.hours) || 0;
        var percent = (g.status === 'Visto' || g.status === 'Zerado') ? 100 : Math.min(Math.round((hAtuais / g.targetHours) * 100), 99);
        const barColor = percent >= 100 ? 'bg-[var(--green)] shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-[#3b82f6] shadow-[0_0_8px_rgba(59,130,246,0.3)]';
        epProg = `<div class="mt-1 space-y-1 w-full">
            <div class="flex justify-between text-[7px] font-black opacity-60 uppercase"><span>Horas: ${hAtuais}/${g.targetHours}</span><span>${percent}%</span></div>
            <div class="h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div class="h-full ${barColor} transition-all duration-700" style="width: ${percent}%"></div>
            </div>
        </div>`;
    }

    if (currentViewMode === 'list') {
        return `
        <div class="game-card w-full" id="game-${g.id}">
            <div class="card-inner flex flex-row items-center py-2.5 px-4 gap-4 overflow-hidden bg-gradient-to-r from-[var(--surface)] to-[var(--input)] hover:border-[${isGame ? '#3b82f6' : 'var(--accent)'}] transition-colors">
                
                <div class="flex items-center gap-3 flex-1 min-w-[150px]">
                    <div onclick="event.stopPropagation(); toggleFavorite('${g.id}', this)" class="text-lg leading-none cursor-pointer hover:scale-110 flex-shrink-0 ${g.isFavorite ? 'fav-active' : 'opacity-30 hover:opacity-100'}">★</div>
                    <h3 class="text-[12px] font-black uppercase truncate text-[var(--text-main)] cursor-pointer hover:text-[${isGame ? '#3b82f6' : 'var(--accent)'}] transition-colors" title="${g.name}" onclick="openDetails('${g.id}')">
                        ${(g.watchCount && g.watchCount > 1) ? `<span class="text-[${isGame ? '#3b82f6' : 'var(--accent)'}] mr-1 drop-shadow-md">x${g.watchCount}</span>` : ''}${g.name}
                    </h3>
                </div>
                
                <div class="hidden md:flex items-center gap-2 text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-widest w-[180px] flex-shrink-0">
                    <span>${g.releaseYear || '----'}</span>
                    <span class="w-1 h-1 bg-[var(--border)] rounded-full"></span>
                    <span class="type-${(g.type||'filme').toLowerCase().replace(' ', '-')}">${g.type || 'Filme'}</span>
                    <span class="w-1 h-1 bg-[var(--border)] rounded-full"></span>
                    <span class="status-${(g.status || 'watchlist').toLowerCase()} px-1.5 py-0.5 rounded shadow-sm text-white">${g.status || 'Watchlist'}</span>
                </div>
                
                <div class="hidden sm:flex flex-col items-end w-[80px] flex-shrink-0 text-right">
                    <div class="text-[11px] font-black mb-1 flex items-center justify-end gap-1 cursor-pointer hover:scale-110 transition-transform" style="color: var(--star-filled); text-shadow: 0 0 5px var(--star-glow);" onclick="event.stopPropagation(); const r = prompt('Digite a nota (0 a 10):', ${g.rating || 0}); if(r !== null && r >= 0 && r <= 10) setGameRating('${g.id}', parseInt(r));">
                        ★ <span class="text-[var(--text-main)]">${g.rating || 0}<span class="text-[9px] text-[var(--text-dim)]">/10</span></span>
                    </div>
                    <span class="text-[${isGame ? '#3b82f6' : 'var(--accent)'}] font-black text-[9px] drop-shadow-[0_0_3px_rgba(${isGame ? '59,130,246' : '225,29,72'},0.4)]">${formatMinutes(totalMinutes)}</span>
                </div>

                <div class="hidden lg:block w-[100px] flex-shrink-0 -mt-2">
                    ${!['Filme', 'Filme OVA'].includes(g.type || 'Filme') && (g.epTotal > 0 || g.targetHours > 0) ? epProg : ''}
                </div>

                <div class="flex items-center gap-2 flex-shrink-0 pl-2 border-l border-[var(--border)]">
                    <button onclick="openDetails('${g.id}')" class="text-[${isGame ? '#3b82f6' : 'var(--accent)'}] hover:bg-[${isGame ? '#3b82f6' : 'var(--accent)'}] hover:text-white transition-colors text-[9px] font-black uppercase px-2 py-1 border border-[${isGame ? '#3b82f6' : 'var(--accent)'}]/30 rounded" title="Ver Detalhes">Detalhes</button>
                    <button onclick="editGame('${g.id}')" class="text-[var(--text-dim)] hover:text-[var(--text-main)] transition text-[12px] p-1" title="Editar">✏️</button>
                    ${!['Filme', 'Filme OVA'].includes(g.type || 'Filme') ? `<button onclick="event.stopPropagation(); addOneEpisode('${g.id}')" class="text-indigo-500 hover:text-indigo-400 transition text-[12px] p-1 font-black" title="Adicionar 1 Episódio">+1</button>` : ''}
                    <button onclick="if(confirm('Excluir Título?')){games=games.filter(x=>x.id!=='${g.id}');manualSave();}" class="text-red-500/60 hover:text-red-500 transition text-[12px] p-1 font-black" title="Excluir">✖</button>
                </div>
            </div>
        </div>`;
    } 
    else {
        return `
        <div class="game-card" id="game-${g.id}">
            <div class="card-inner flex flex-col justify-between h-full bg-[var(--surface)] border border-[var(--border)] rounded-lg overflow-hidden group">
                
                <div class="poster-container relative aspect-[2/3] overflow-hidden">
                    ${(g.watchCount && g.watchCount > 1) ? `<div class="absolute top-0 left-1/2 -translate-x-1/2 bg-[${isGame ? '#3b82f6' : 'var(--accent)'}] text-[#FFFFFF] text-[10px] font-black px-4 py-0.5 rounded-b-lg shadow-[0_5px_15px_rgba(${isGame ? '59,130,246' : '225,29,72'},0.5)] z-30 border border-t-0 border-[var(--border)] tracking-widest backdrop-blur-md bg-opacity-90">x${g.watchCount}</div>` : ''}

                    ${g.cover 
                        ? `<img src="${g.cover}" class="blur-bg" loading="lazy" aria-hidden="true">
                           <img src="${g.cover}" class="main-cover" onerror="this.src='https://via.placeholder.com/400x600?text=Capa'" loading="lazy">` 
                        : `<div class="absolute inset-0 flex items-center justify-center bg-[var(--input)] pointer-events-none">
                               <div class="-rotate-45 text-4xl font-black text-[var(--text-main)] border-[6px] border-[var(--text-main)] py-2 px-6 rounded-2xl opacity-[0.08] select-none tracking-widest">
                                   ${g.type ? g.type.toUpperCase() : 'FILME'}
                               </div>
                           </div>`
                    }
                    
                    <div class="absolute inset-0 bg-[var(--surface)]/80 flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm z-20 p-2">
                        <button onclick="openOptionsMenu('${g.id}')" class="btn btn-outline w-[130px] text-[10px] border-[var(--text-main)] text-[var(--text-main)] hover:bg-[var(--text-main)] hover:text-black shadow-[0_0_10px_rgba(255,255,255,0.2)] px-3 py-1.5 uppercase tracking-widest transition-colors">
                            + OPÇÕES
                        </button>
                        <button onclick="openDetails('${g.id}')" class="btn btn-primary w-[130px] text-[9px] py-1.5 tracking-widest uppercase shadow-[0_0_10px_rgba(${isGame ? '59,130,246' : '225,29,72'},0.4)] ${isGame ? 'bg-blue-600 border-blue-500 hover:bg-blue-700' : ''}">
                            Detalhes
                        </button>
                        <button onclick="openRatingModal('${g.id}')" class="btn btn-outline w-[130px] text-[9px] py-1.5 border-amber-400/50 text-amber-400 hover:bg-amber-400 hover:text-black transition-colors tracking-widest uppercase shadow-[0_0_10px_rgba(251,191,36,0.2)]">
                            ★ NOTAS
                        </button>
                    </div>
                </div>

                <div class="card-body-info relative flex flex-col flex-1 py-1.5 px-2">
                    <div class="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[var(--white-highlight)] to-transparent"></div>
                    
                    <h3 class="text-[9px] font-medium uppercase truncate text-center w-full leading-tight tracking-wide text-[var(--text-main)] mb-0.5 mt-1" title="${g.name}">${g.name}</h3>
                    
                    <div class="flex items-center justify-center gap-2">
                        <span class="text-[8px] font-bold text-[var(--text-dim)] uppercase tracking-widest">${g.releaseYear || '---'}</span>
                        <div onclick="event.stopPropagation(); toggleFavorite('${g.id}', this)" class="text-[0.65rem] leading-none cursor-pointer transition-transform hover:scale-125 select-none ${g.isFavorite ? 'fav-active' : 'opacity-20 hover:opacity-100'}" title="${g.isFavorite ? 'Remover dos favoritos' : 'Favoritar'}">❤︎</div>
                    </div>
                </div>
            </div>
        </div>
        `;
    }
}

function renderGamesGridOnly() {
    const gridTV = document.getElementById('gameGrid');
    const gridGamer = document.getElementById('gameGridGamer');

    const normalizeText = (text) => (text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const finalBtnGenreTV = normalizeText(currentCollectionGenreTV);
    const finalBtnGenreGamer = normalizeText(currentCollectionGenreGamer);

    // Filtra TV vs Jogos
    var tvFiltered = currentFiltered.filter(g => g.type !== 'Jogo');
    var gamerFiltered = currentFiltered.filter(g => g.type === 'Jogo');

    // Filtra pelo gênero clicado (TV)
    if (currentCollectionGenreTV !== 'Todos') {
        tvFiltered = tvFiltered.filter(g => {
            const gameGenresList = normalizeText(g.genre).split(/[,/]/).map(s => {
                var txt = s.trim();
                return (txt === 'ficcao cientifica' || txt === 'sci-fi' || txt === 'sci fi') ? 'ficcao' : txt;
            });
            const checkGenre = (finalBtnGenreTV === 'ficcao cientifica' || finalBtnGenreTV === 'sci-fi' || finalBtnGenreTV === 'sci fi') ? 'ficcao' : finalBtnGenreTV;
            return gameGenresList.includes(checkGenre);
        });
    }

    // Filtra pelo gênero clicado (Gamer)
    if (currentCollectionGenreGamer !== 'Todos') {
        gamerFiltered = gamerFiltered.filter(g => {
            const gameGenresList = normalizeText(g.genre).split(/[,/]/).map(s => s.trim());
            return gameGenresList.includes(finalBtnGenreGamer);
        });
    }

    // Paginação
    const paginatedTV = tvFiltered.slice(0, displayLimitTV);
    const paginatedGamer = gamerFiltered.slice(0, displayLimitGamer);

    // Injeta HTML e reutiliza a função de Cards
    if (gridTV) gridTV.innerHTML = paginatedTV.map(g => generateCardHTML(g, viewModeTV)).join('');
    if (gridGamer) gridGamer.innerHTML = paginatedGamer.map(g => generateCardHTML(g, viewModeGamer)).join('');

    // Update Sentinels
    const sentinelTV = document.getElementById('scrollSentinel');
    if (sentinelTV) {
        sentinelTV.style.display = 'block';
        if (displayLimitTV >= tvFiltered.length) {
            sentinelTV.innerText = "FIM DA BIBLIOTECA TV TIME";
            sentinelTV.style.opacity = "0.2";
        } else {
            sentinelTV.innerText = "Carregando TV Time...";
            sentinelTV.style.opacity = "0.4";
        }
    }

    const sentinelGamer = document.getElementById('scrollSentinelGamer');
    if (sentinelGamer) {
        sentinelGamer.style.display = 'block';
        if (displayLimitGamer >= gamerFiltered.length) {
            sentinelGamer.innerText = "FIM DA BIBLIOTECA GAMER";
            sentinelGamer.style.opacity = "0.2";
        } else {
            sentinelGamer.innerText = "Carregando Gametracker...";
            sentinelGamer.style.opacity = "0.4";
        }
    }
}

// =========================================================
// SISTEMA UNIFICADO DE DRAG & DROP
// =========================================================

// Utilitário para pegar a cor da borda baseado no tipo
const getDragBorder = (type) => {
    if (['listaPrincipal', 'listaDetail'].includes(type)) return '!border-emerald-500';
    if (['aguardados', 'favoritos'].includes(type)) return '!border-[var(--accent)]';
    if (['aguardadosGamer', 'favoritosGamer'].includes(type)) return '!border-blue-500';
    if (type === 'top100') return top100Config[currentTop100Type].colors.dragBorder;
    return '!border-white';
};

function handleUnifiedDragStart(e, index, type) {
    draggedItem = { index, type };
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => e.target.classList.add('opacity-50'), 0);
}

function handleUnifiedDragOver(e, type) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add(getDragBorder(type), 'scale-105');
    if (type === 'listaPrincipal') e.currentTarget.classList.add('shadow-emerald-500/20');
}

function handleUnifiedDragLeave(e, type) {
    e.currentTarget.classList.remove(getDragBorder(type), 'scale-105');
    if (type === 'listaPrincipal') e.currentTarget.classList.remove('shadow-emerald-500/20');
}

async function handleUnifiedDrop(e, targetIndex, type) {
    e.preventDefault();
    e.currentTarget.classList.remove(getDragBorder(type), 'scale-105');
    if (type === 'listaPrincipal') e.currentTarget.classList.remove('shadow-emerald-500/20');
    
    // Remove a opacidade do elemento arrastado globalmente
    document.querySelectorAll('.opacity-50').forEach(el => el.classList.remove('opacity-50'));

    // Trava se arrastou pro mesmo lugar, para fora, ou misturou tipos de lista
    if (draggedItem.index === targetIndex || draggedItem.index === null || draggedItem.type !== type) return;

    // Roteador de Lógica (Atualiza a array correta)
    if (type === 'listaPrincipal') {
        const moved = customListas.splice(draggedItem.index, 1)[0];
        customListas.splice(targetIndex, 0, moved);
        await manualSave();
        renderListasGrid();
    } 
    else if (type === 'listaDetail') {
        const list = customListas.find(l => l.id === currentListaId);
        const moved = list.games.splice(draggedItem.index, 1)[0];
        list.games.splice(targetIndex, 0, moved);
        await manualSave();
        renderListaGamesGrid();
    } 
    else if (type === 'aguardados') {
        const moved = aguardados.splice(draggedItem.index, 1)[0];
        aguardados.splice(targetIndex, 0, moved);
        await manualSave();
        renderGames(); // Recarrega as estreias
    } 
    else if (type === 'favoritos') {
        const allFavs = games.filter(g => g.isFavorite && g.type !== 'Jogo').sort((a, b) => (a.favOrder || 0) - (b.favOrder || 0));
        const displayFavs = favFilter === 'all' ? allFavs : allFavs.filter(g => (g.type || 'Filme') === favFilter);
        const movedItem = displayFavs.splice(draggedItem.index, 1)[0];
        displayFavs.splice(targetIndex, 0, movedItem);
        
        displayFavs.forEach((fav, i) => {
            const gameRef = games.find(g => g.id === fav.id);
            if (gameRef) gameRef.favOrder = i;
        });
        await manualSave();
        renderGames();
    } 
    else if (type === 'favoritosGamer') {
        const allFavsGamer = games.filter(g => g.isFavorite && g.type === 'Jogo').sort((a, b) => (a.favOrder || 0) - (b.favOrder || 0));
        const movedItem = allFavsGamer.splice(draggedItem.index, 1)[0];
        allFavsGamer.splice(targetIndex, 0, movedItem);
        
        allFavsGamer.forEach((fav, i) => {
            const gameRef = games.find(g => g.id === fav.id);
            if (gameRef) gameRef.favOrder = i;
        });
        await manualSave();
        renderGames();
    } 
else if (type === 'retro') {
        const grid = document.getElementById('retroCardsGrid');
        const childrenArray = Array.from(grid.children);
        
        // Pega o elemento do índice antigo
        const movedItem = childrenArray[draggedItem.index];
        
        // Remove ele visualmente e reinjeta na nova posição alvo
        if (draggedItem.index < targetIndex) {
            grid.insertBefore(movedItem, childrenArray[targetIndex].nextSibling);
        } else {
            grid.insertBefore(movedItem, childrenArray[targetIndex]);
        }

        // Salva a nova ordem customizada (pelo atributo dataset) na máquina do usuário
        const newOrder = Array.from(grid.children).map(child => child.getAttribute('data-card-id'));
        localStorage.setItem('ct_retro_layout_order_v70', JSON.stringify(newOrder));
    }
    else if (type === 'top100') {
        const config = top100Config[currentTop100Type];
        const arr = config.data();
        const moved = arr.splice(draggedItem.index, 1)[0];
        arr.splice(targetIndex, 0, moved);
        await localforage.setItem(config.key, arr);
        renderTop100List();
    }
    else if (type === 'aguardadosGamer') {
        const moved = aguardadosGamer.splice(draggedItem.index, 1)[0];
        aguardadosGamer.splice(targetIndex, 0, moved);
        await manualSave();
        renderAguardadosGamer();
    }

    draggedItem = { index: null, type: null }; 
}
// =========================================================================
// PARTE 3: DASHBOARDS PRINCIPAIS E SCROLL AUTOMÁTICO
// =========================================================================

function renderGames() {
    applyFilters();
    const upGrid = document.getElementById('upcomingGrid');
    const favGrid = document.getElementById('statFavorites');
    
    // 1. Estreias TV Time
    if (upGrid) {
        upGrid.innerHTML = aguardados.map((a, i) => `
            <div draggable="true" ondragstart="handleUnifiedDragStart(event, ${i}, 'aguardados')" ondragover="handleUnifiedDragOver(event, 'aguardados')" ondragleave="handleUnifiedDragLeave(event, 'aguardados')" ondrop="handleUnifiedDrop(event, ${i}, 'aguardados')" class="poster-card-sm group flex flex-col justify-between !w-[160px] !h-[240px] md:!w-[180px] md:!h-[270px] shadow-[0_5px_15px_var(--shadow-med)] border-2 border-transparent hover:border-[var(--accent)] cursor-grab active:cursor-grabbing transition-transform relative" title="Arraste para reordenar">
                <div class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-[60] bg-[var(--surface)] rounded-full shadow-lg border border-red-500/50">
                    <button onclick="event.stopPropagation(); if(confirm('Remover Estreia?')){aguardados.splice(${i},1);manualSave();}" class="w-6 h-6 rounded-full flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition text-[10px]">✖</button>
                </div>
                ${a.cover 
                    ? `<img src="${a.cover}" class="blur-bg pointer-events-none" loading="lazy" aria-hidden="true"><img src="${a.cover}" class="main-cover pointer-events-none" loading="lazy" onerror="this.src='https://via.placeholder.com/400x600?text=Capa';">`
                    : `<div class="flex-1 flex items-center justify-center p-2 text-center bg-[var(--surfaceHover)] pointer-events-none"><span class="text-[10px] font-black text-[var(--text-dim)] uppercase break-words">${a.name}</span></div>`
                }
                ${a.name && a.cover ? `<div class="absolute top-0 left-0 w-full bg-gradient-to-b from-black/90 via-black/50 to-transparent pt-2 pb-6 px-2 z-10 text-[10px] font-black text-white uppercase truncate text-center drop-shadow-md pointer-events-none">${a.name}</div>` : ''}
                <div class="release-date-tag !text-[11px] !py-2.5 !bg-[var(--surface)]/95 border-t border-[var(--border)] shadow-[0_-5px_15px_rgba(0,0,0,0.5)] backdrop-blur-md pointer-events-none">${a.date || 'TBA'}</div>
            </div>`).join('');
    }
    
    // 2. Favoritos TV Time
    if (favGrid) {
        const allFavs = games.filter(g => g.isFavorite && g.type !== 'Jogo').sort((a, b) => (a.favOrder || 0) - (b.favOrder || 0));
        const displayFavs = favFilter === 'all' ? allFavs : allFavs.filter(g => (g.type || 'Filme') === favFilter);
        
        favGrid.innerHTML = displayFavs.map((f, index) => `
            <div draggable="true" ondragstart="handleUnifiedDragStart(event, ${index}, 'favoritos')" ondragover="handleUnifiedDragOver(event, 'favoritos')" ondragleave="handleUnifiedDragLeave(event, 'favoritos')" ondrop="handleUnifiedDrop(event, ${index}, 'favoritos')" onclick="document.getElementById('game-${f.id}').scrollIntoView({behavior:'smooth',block:'center'})" class="poster-card-sm border-2 border-transparent hover:border-[var(--accent)] hover:scale-105 transition-transform cursor-grab active:cursor-grabbing" title="Arraste para reordenar">
                <img src="${f.cover}" class="blur-bg pointer-events-none" loading="lazy" aria-hidden="true">
                <img src="${f.cover}" class="main-cover pointer-events-none" loading="lazy" onerror="this.src='https://via.placeholder.com/400x600?text=Capa';">
            </div>`).join('') || '<p class="opacity-30 p-4 text-xs font-bold w-full text-center mt-8 text-[var(--text-main)]">Nenhum favorito encontrado.</p>';
    }

    // 3. Favoritos Gamer
    const favGamerGrid = document.getElementById('statFavoritesGamer');
    if (favGamerGrid) {
        const gamerFavs = games.filter(g => g.isFavorite && g.type === 'Jogo').sort((a, b) => (a.favOrder || 0) - (b.favOrder || 0));
        favGamerGrid.innerHTML = gamerFavs.map((f, index) => `
            <div draggable="true" ondragstart="handleUnifiedDragStart(event, ${index}, 'favoritosGamer')" ondragover="handleUnifiedDragOver(event, 'favoritosGamer')" ondragleave="handleUnifiedDragLeave(event, 'favoritosGamer')" ondrop="handleUnifiedDrop(event, ${index}, 'favoritosGamer')" onclick="document.getElementById('game-${f.id}').scrollIntoView({behavior:'smooth',block:'center'})" class="poster-card-sm border-2 border-transparent hover:border-blue-500 hover:scale-105 transition-transform cursor-grab active:cursor-grabbing bg-[var(--surface)] shadow-[0_5px_15px_var(--shadow-med)]" title="Arraste para reordenar">
                <img src="${f.cover}" class="blur-bg pointer-events-none" loading="lazy" aria-hidden="true">
                <img src="${f.cover}" class="main-cover pointer-events-none" loading="lazy" onerror="this.src='https://via.placeholder.com/400x600?text=Capa';">
            </div>`).join('') || '<p class="opacity-30 p-4 text-xs font-bold w-full text-center mt-8 text-blue-500 uppercase tracking-widest">Nenhum jogo favorito.</p>';
    }            
    
    renderGamesGridOnly();
    if (typeof updateYearFilters === 'function') updateYearFilters();
    renderLastWatchedMovies();
    renderLastPlayedGames();
    if (typeof renderSeasonal === 'function') renderSeasonal();
    if (typeof renderAguardadosGamer === 'function') renderAguardadosGamer();
    initUnifiedAutoScroll();
}

function updateDashboard(list) {
    if (typeof updateDashboardGamer === 'function') updateDashboardGamer(); 
    
    const tvList = list.filter(g => g.type !== 'Jogo');

    // Variáveis de acumulação (Single-Pass)
    let totalVistos = 0, totalWatchlist = 0, totalMinutos = 0, somaNotas = 0, qtdNotas = 0;
    const monthTimeMap = {}, mainGenres = {}, subGenres = {};
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    
    let totalMain = 0, totalSub = 0;

    // A mágica acontece aqui: 1 ÚNICO LOOP varre todos os dados simultaneamente
    tvList.forEach(g => {
        const status = (g.status || '').toLowerCase();
        
        // Contagem de Status
        if (status === 'visto') totalVistos++;
        else if (status === 'watchlist') totalWatchlist++;
        
        // Contagem de Tempo e Meses (Ignora Watchlist)
        if (status !== 'watchlist') {
            const gameMinutes = calculateItemTotalMinutes(g);
            totalMinutos += gameMinutes;
            
            if (g.startDate) {
                const mIndex = parseInt(g.startDate.split('-')[1]) - 1;
                if (mIndex >= 0 && mIndex <= 11) {
                    const mName = monthNames[mIndex];
                    monthTimeMap[mName] = (monthTimeMap[mName] || 0) + gameMinutes;
                }
            }
        }
        
        // Contagem de Notas
        if (parseFloat(g.rating) > 0) {
            somaNotas += parseFloat(g.rating);
            qtdNotas++;
        }

        // Contagem de Gêneros
        if(g.genre) { 
            const parts = g.genre.split(/[,/|-]+/).map(n => n.trim().toUpperCase()).filter(Boolean);
            if(parts.length > 0) {
                const main = parts[0];
                mainGenres[main] = (mainGenres[main] || 0) + 1;
                totalMain++;
                for(let i = 1; i < parts.length; i++) {
                    const sub = parts[i];
                    subGenres[sub] = (subGenres[sub] || 0) + 1;
                    totalSub++;
                }
            }
        } 
    });

    // Atualiza a DOM de uma só vez
    document.getElementById('statTotal').innerText = tvList.length;
    document.getElementById('statZ').innerText = totalVistos;
    document.getElementById('statWatch').innerText = totalWatchlist;
    document.getElementById('statHours').innerText = `${Math.floor(totalMinutos / 60)}h`;
    document.getElementById('statAvg').innerText = qtdNotas ? (somaNotas / qtdNotas).toFixed(1) : '0.0';

    const sortedMonths = Object.entries(monthTimeMap).sort((a,b) => b[1] - a[1]);
    document.getElementById('statMonth').innerText = sortedMonths.length > 0 ? sortedMonths[0][0] : '---';

    const top5Main = Object.entries(mainGenres).sort((a,b) => b[1] - a[1]).slice(0, 5);
    const top5Sub = Object.entries(subGenres).sort((a,b) => b[1] - a[1]).slice(0, 5);

    const renderGenreColumn = (data, total, title) => {
        const listHtml = data.map(([name, count]) => {
            const percent = total > 0 ? (count / total * 100).toFixed(1) : 0;
            return `
                <div class="mb-4 group cursor-default">
                    <div class="flex justify-between items-end text-[10px] font-bold uppercase tracking-widest mb-2">
                        <span class="text-[var(--text-main)] truncate pr-2 group-hover:text-[var(--accent)] transition-colors duration-300" title="${name}">${name}</span>
                        <span class="text-[var(--green)] font-black drop-shadow-[0_0_5px_rgba(16,185,129,0.5)] flex-shrink-0">${percent}%</span>
                    </div>
                    <div class="h-1.5 bg-[var(--input)] border border-[var(--border)] rounded-full overflow-hidden shadow-inner">
                        <div class="h-full bg-[var(--accent)] transition-all duration-700" style="width: ${percent}%; box-shadow: 0 0 10px var(--accent-glow);"></div>
                    </div>
                </div>`;
        }).join('') || '<p class="opacity-30 text-[10px] font-bold text-center py-6 uppercase tracking-widest">Sem dados</p>';

        return `
            <div class="flex flex-col w-full">
                <h3 class="text-[11px] font-black uppercase text-[var(--text-dim)] border-b border-[var(--border)] pb-3 mb-5 tracking-widest text-center">${title}</h3>
                ${listHtml}
            </div>
        `;
    };

    document.getElementById('genreStatsList').innerHTML = `
        <div class="flex gap-6 md:gap-8 py-2">
            <div class="flex-1 min-w-0">${renderGenreColumn(top5Main, totalMain, 'Gêneros Principais')}</div>
            <div class="w-px bg-gradient-to-b from-transparent via-[var(--border)] to-transparent flex-shrink-0"></div>
            <div class="flex-1 min-w-0">${renderGenreColumn(top5Sub, totalSub, 'Subgêneros')}</div>
        </div>
    `;
}

function updateDashboardGamer() {
    const jogos = games.filter(g => g.type === 'Jogo');
    
    // Variáveis de acumulação (Single-Pass)
    let totalVistos = 0, totalWatchlist = 0, totalMinutos = 0, somaNotas = 0, qtdNotas = 0;
    let totalDLCs = 0, totalNotaMaxima = 0, totalDropados = 0;
    const monthTimeMapGamer = {}, genCount = {};
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    const jogosJogando = [];
    const jogosZerados = [];

    // 1 ÚNICO LOOP resolve todos os cálculos
    jogos.forEach(g => {
        const status = (g.status || '').toLowerCase();
        
        // Status e Metadados Básicos
       if (status === 'visto') {
    totalVistos++;
    if ((g.name || '').toUpperCase().startsWith('DLC')) totalDLCs++;
    if (g.endDate || g.startDate) jogosZerados.push(g);
}
        else if (status === 'watchlist') totalWatchlist++;
        else if (status === 'abandonado') totalDropados++;
        else if (status === 'assistindo' && g.startDate) jogosJogando.push(g);
        
        // Tempo Total e Meses
        const mins = calculateItemTotalMinutes(g);
        totalMinutos += mins;
        
        if (g.startDate) {
            const mIndex = parseInt(g.startDate.split('-')[1]) - 1;
            if (mIndex >= 0 && mIndex <= 11) {
                const mName = monthNames[mIndex];
                monthTimeMapGamer[mName] = (monthTimeMapGamer[mName] || 0) + mins;
            }
        }

        // Notas
        const rating = parseFloat(g.rating);
        if (rating > 0) {
            somaNotas += rating;
            qtdNotas++;
            if (rating === 10) totalNotaMaxima++;
        }

        // Gêneros
        if (g.genre) {
            const parts = g.genre.split(/[,/|-]+/).map(n => n.trim().toUpperCase()).filter(Boolean);
            if (parts.length > 0) {
                genCount[parts[0]] = (genCount[parts[0]] || 0) + 1;
            }
        }
    });

    // Injeta na DOM
    document.getElementById('statTotalGamer').innerText = jogos.length;
    document.getElementById('statZGamer').innerText = totalVistos;
    document.getElementById('statWatchGamer').innerText = totalWatchlist;
    document.getElementById('statHoursGamer').innerText = `${Math.floor(totalMinutos / 60)}h`;
    document.getElementById('statAvgGamer').innerText = qtdNotas ? (somaNotas / qtdNotas).toFixed(1) : '0.0';

    const sortedMonthsGamer = Object.entries(monthTimeMapGamer).sort((a,b) => b[1] - a[1]);
    document.getElementById('statMonthGamer').innerText = sortedMonthsGamer.length > 0 ? sortedMonthsGamer[0][0] : '---';

    document.getElementById('statDLCGamer').innerText = totalDLCs;
    document.getElementById('statMaxNotaGamer').innerText = totalNotaMaxima;
    document.getElementById('statDropadosGamer').innerText = totalDropados;

    const elFortnite = document.getElementById('statFortniteGamer');
    if (elFortnite && typeof fortniteHours !== 'undefined') {
        elFortnite.innerText = fortniteHours + 'h';
    }

    // Listas Recentes
    jogosJogando.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    const ultimosJogando = jogosJogando.slice(0, 3);
    const recemJogadoList = document.getElementById('recemJogadoList');
    if (recemJogadoList) {
        if (ultimosJogando.length > 0) {
            recemJogadoList.innerHTML = ultimosJogando.map(g => `
                <div class="flex text-[13px] font-medium text-[var(--text-dim)] divide-x divide-[var(--border)] items-center hover:bg-[var(--white-highlight)] transition-colors cursor-pointer" onclick="openDetails('${g.id}')">
                    <div class="flex-1 py-3 px-4 text-left truncate text-[var(--text-main)] font-black" title="${g.name}">${g.name}</div>
                    <div class="w-24 py-3 px-2 text-center flex-shrink-0 text-blue-500 font-bold">${Math.floor(calculateItemTotalMinutes(g)/60)}h ${(calculateItemTotalMinutes(g)%60)}m</div>
                    <div class="w-24 py-3 px-2 text-center flex-shrink-0 text-[9px] uppercase tracking-widest">${g.gamePlatform || '---'}</div>
                </div>
            `).join('');
        } else {
            recemJogadoList.innerHTML = `<div class="flex text-[13px] font-medium text-[var(--text-dim)] items-center h-full"><div class="flex-1 py-4 px-4 text-center text-[10px] font-bold uppercase tracking-widest">Nenhum jogo em andamento</div></div>`;
        }
    }

    jogosZerados.sort((a, b) => {
    // Função para converter "DD-MM-YYYY" (ou "YYYY-MM-DD") em milissegundos para ordenação correta
    const parseDate = (dateStr) => {
        if (!dateStr) return 0;
        const parts = dateStr.split('-');
        // Se a primeira parte for o dia (DD-MM-YYYY)
        if (parts[0].length === 2) {
            return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
        }
        // Se já estiver no formato (YYYY-MM-DD)
        return new Date(dateStr).getTime();
    };

    const dateA = a.endDate || a.startDate || "";
    const dateB = b.endDate || b.startDate || "";
    
    return parseDate(dateB) - parseDate(dateA);
});
    const ultimosZerados = jogosZerados.slice(0, 3);
    const recemFinalizadoList = document.getElementById('recemFinalizadoList');
    if (recemFinalizadoList) {
        if (ultimosZerados.length > 0) {
            recemFinalizadoList.innerHTML = ultimosZerados.map(g => `
                <div class="flex text-[13px] font-medium text-[var(--text-dim)] divide-x divide-[var(--border)] items-center hover:bg-[var(--white-highlight)] transition-colors cursor-pointer" onclick="openDetails('${g.id}')">
                    <div class="flex-1 py-3 px-4 text-left truncate text-[var(--text-main)] font-black" title="${g.name}">${g.name}</div>
                    <div class="w-24 py-3 px-2 text-center flex-shrink-0 text-[var(--green)] font-bold">${Math.floor(calculateItemTotalMinutes(g)/60)}h ${(calculateItemTotalMinutes(g)%60)}m</div>
                    <div class="w-24 py-3 px-2 text-center flex-shrink-0 text-[9px] uppercase tracking-widest">${g.gamePlatform || '---'}</div>
                </div>
            `).join('');
        } else {
            recemFinalizadoList.innerHTML = `<div class="flex text-[13px] font-medium text-[var(--text-dim)] items-center h-full"><div class="flex-1 py-4 px-4 text-center text-[10px] font-bold uppercase tracking-widest">Nenhum jogo zerado recentemente</div></div>`;
        }
    }

    // Gêneros Gamer
    const top5Gens = Object.entries(genCount).sort((a,b) => b[1] - a[1]).slice(0, 5);
    const genreListGamer = document.getElementById('genreStatsListGamer');
    if (genreListGamer) {
        genreListGamer.innerHTML = top5Gens.map(([name, count]) => {
            const percent = jogos.length > 0 ? (count / jogos.length * 100).toFixed(1) : 0;
            return `
                <div class="mb-4 group cursor-default">
                    <div class="flex justify-between items-end text-[10px] font-bold uppercase tracking-widest mb-1.5">
                        <span class="text-[var(--text-main)] truncate pr-2 group-hover:text-blue-500 transition-colors duration-300" title="${name}">${name}</span>
                        <div class="flex gap-2 items-center">
                            <span class="text-[var(--text-dim)] text-[9px]">${count} Jogos</span>
                            <span class="text-blue-500 font-black drop-shadow-[0_0_5px_rgba(59,130,246,0.5)] flex-shrink-0">${percent}%</span>
                        </div>
                    </div>
                    <div class="h-1.5 bg-[var(--input)] border border-[var(--border)] rounded-full overflow-hidden shadow-inner">
                        <div class="h-full bg-blue-500 transition-all duration-700" style="width: ${percent}%; box-shadow: 0 0 10px rgba(59,130,246,0.5);"></div>
                    </div>
                </div>`;
        }).join('') || '<p class="opacity-30 text-[10px] font-bold text-center py-6 uppercase tracking-widest">Sem dados de jogos</p>';
    }
}
function renderLastWatchedMovies() {
    const container = document.getElementById('lastWatchedMovies');
    if(!container) return;

    const watchedMovies = games.filter(g => 
        (g.status || '').toLowerCase() === 'visto' && 
        ['Filme', 'Filme OVA'].includes(g.type || 'Filme')
    );

    watchedMovies.sort((a, b) => {
        const dateA = a.startDate || "";
        const dateB = b.startDate || "";
        if(dateA === dateB) {
            return (b.lastUpdate || 0) - (a.lastUpdate || 0);
        }
        return dateB.localeCompare(dateA);
    });

    const top10Watched = watchedMovies.slice(0, 10);

    container.innerHTML = top10Watched.map(f => `
        <div onclick="document.getElementById('game-${f.id}').scrollIntoView({behavior:'smooth',block:'center'})" class="poster-card-sm border-2 border-transparent hover:border-[var(--accent)] hover:scale-105 transition-transform cursor-pointer relative" title="${f.name}">
            <img src="${f.cover}" class="blur-bg pointer-events-none" loading="lazy" aria-hidden="true">
            <img src="${f.cover}" class="main-cover pointer-events-none" loading="lazy" onerror="this.src='https://via.placeholder.com/400x600?text=Capa';">
        </div>
    `).join('') || '<p class="opacity-30 p-4 text-xs font-bold w-full text-center mt-8 text-[var(--text-main)] uppercase tracking-widest">Nenhum filme assistido ainda.</p>';
}

function renderLastPlayedGames() {
    const container = document.getElementById('lastPlayedGames');
    if(!container) return;

    const playedGames = games.filter(g => 
        g.type === 'Jogo' && 
        ['Assistindo', 'Visto'].includes(g.status || '')
    );

    playedGames.sort((a, b) => {
        const timeA = a.lastUpdate || (a.startDate ? new Date(a.startDate).getTime() : 0);
        const timeB = b.lastUpdate || (b.startDate ? new Date(b.startDate).getTime() : 0);
        return timeB - timeA;
    });

    const top10Played = playedGames.slice(0, 10);

    container.innerHTML = top10Played.map(f => `
        <div onclick="document.getElementById('game-${f.id}').scrollIntoView({behavior:'smooth',block:'center'})" class="poster-card-sm border-2 border-transparent hover:border-blue-500 hover:scale-105 transition-transform cursor-pointer relative bg-[var(--surface)] shadow-[0_5px_15px_var(--shadow-med)]" title="${f.name}">
            <img src="${f.cover}" class="blur-bg pointer-events-none" loading="lazy" aria-hidden="true">
            <img src="${f.cover}" class="main-cover pointer-events-none" loading="lazy" onerror="this.src='https://via.placeholder.com/400x600?text=Capa';">
        </div>
    `).join('') || '<p class="opacity-30 p-4 text-xs font-bold w-full text-center mt-8 text-blue-500 uppercase tracking-widest">Nenhum jogo jogado recentemente.</p>';
}

// =========================================================================
// LÓGICA: ANIMES DA TEMPORADA (RESTAURADA)
// =========================================================================
var currentSeasonFilter = 'auto';

function setSeasonalFilter(season, btnElement) {
    currentSeasonFilter = season;
    
    const buttons = document.querySelectorAll('.season-btn');
    buttons.forEach(b => {
        b.classList.remove('border-[var(--accent)]', 'text-[var(--accent)]');
        b.classList.add('border-[var(--border)]', 'text-[var(--text-dim)]');
    });
    
    if (btnElement) {
        btnElement.classList.remove('border-[var(--border)]', 'text-[var(--text-dim)]');
        btnElement.classList.add('border-[var(--accent)]', 'text-[var(--accent)]');
    }
    
    renderSeasonal();
}

function getSeasonInfo(dateString) {
    if (!dateString) return null;
    const parts = dateString.split('-');
    if (parts.length < 2) return null;
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);

    var season = '';
    var icon = '';
    
    if (month >= 1 && month <= 3) { season = 'Inverno'; icon = '❄️'; }
    else if (month >= 4 && month <= 6) { season = 'Primavera'; icon = '🌸'; }
    else if (month >= 7 && month <= 9) { season = 'Verão'; icon = '☀️'; }
    else if (month >= 10 && month <= 12) { season = 'Outono'; icon = '🍂'; }

    return { year, season, icon };
}

function renderSeasonal() {
    const animes = games.filter(g => (g.type || 'Filme') === 'Anime');
    const assistindo = animes.filter(g => g.status === 'Assistindo' && g.startDate);

    var dataAtual = new Date();
    var targetSeasonInfo = getSeasonInfo(`${dataAtual.getFullYear()}-${(dataAtual.getMonth() + 1).toString().padStart(2, '0')}`);

    // Se estiver assistindo algo, a "temporada atual" foca no anime mais recente
    if (assistindo.length > 0) {
        const latest = assistindo.reduce((a, b) => {
            const dateA = a.seasonDate || a.startDate || "";
            const dateB = b.seasonDate || b.startDate || "";
            return (dateA > dateB ? a : b);
        });
        targetSeasonInfo = getSeasonInfo(latest.seasonDate || latest.startDate);
    }

    if (currentSeasonFilter !== 'auto') {
        targetSeasonInfo.season = currentSeasonFilter;
        if (currentSeasonFilter === 'Primavera') targetSeasonInfo.icon = '🌸';
        if (currentSeasonFilter === 'Verão') targetSeasonInfo.icon = '☀️';
        if (currentSeasonFilter === 'Outono') targetSeasonInfo.icon = '🍂';
        if (currentSeasonFilter === 'Inverno') targetSeasonInfo.icon = '❄️';
    }

    const titleEl = document.getElementById('seasonalTitle');
    if (titleEl && targetSeasonInfo) {
        titleEl.innerHTML = `${targetSeasonInfo.icon} ANIMES TEMPORADA DE ${targetSeasonInfo.season.toUpperCase()} ${targetSeasonInfo.year}`;
    }

    const seasonalAnimes = animes.filter(g => {
        const datesToCheck = [];
        if (g.startDate) datesToCheck.push(g.startDate);
        
        if (g.seasonDates && g.seasonDates.length > 0) {
            datesToCheck.push(...g.seasonDates);
        }
        
        return datesToCheck.some(d => {
            const info = getSeasonInfo(d);
            return info && info.year === targetSeasonInfo.year && info.season === targetSeasonInfo.season;
        });
    });

    const grid = document.getElementById('seasonalGrid');
    if (grid) {
        grid.innerHTML = seasonalAnimes.map(g => generateSeasonalCardHTML(g)).join('') || '<div class="col-span-full text-center py-12 opacity-40 font-bold uppercase tracking-widest text-xs">Nenhum anime registrado nesta temporada.</div>';
    }
}

function generateSeasonalCardHTML(g) {
    var epProg = '';
    const percent = g.epTotal > 0 ? Math.round((g.epWatched / g.epTotal) * 100) : 0;
    const barColor = percent >= 100 ? 'bg-[var(--green)] shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-[var(--accent)] shadow-[0_0_8px_var(--accent-glow)]';
    
    epProg = `
    <div class="mt-1 space-y-1">
        <div class="flex justify-between text-[9px] font-black uppercase text-[var(--text-main)]">
            <span>Eps: <span class="font-bold">${g.epWatched}</span> / ${g.epTotal || '?'}</span>
            <span>${percent}%</span>
        </div>
        <div class="h-1.5 bg-[var(--surfaceHover)] rounded-full overflow-hidden border border-[var(--border)]">
            <div class="h-full ${barColor} transition-all duration-700" style="width: ${percent}%"></div>
        </div>
    </div>`;

    const starsHTML = `
    <div class="flex justify-center items-center gap-1 mb-1.5 text-[11px] font-black cursor-pointer hover:scale-110 transition-transform" style="color: var(--star-filled); text-shadow: 0 0 5px var(--star-glow);" onclick="event.stopPropagation(); const r = prompt('Digite a nota (0 a 10):', ${g.rating || 0}); if(r !== null && r >= 0 && r <= 10) setGameRating('${g.id}', parseInt(r));">
        ★ <span class="text-[var(--text-main)]">${g.rating || 0}<span class="text-[8px] text-[var(--text-dim)]">/10</span></span>
    </div>`;

    return `
    <div class="game-card fade-in" id="seasonal-game-${g.id}">
        <div class="card-inner flex flex-col justify-between border-2 border-[var(--border)] hover:border-[var(--accent)] transition-all bg-[var(--surface)]">
            
            <div class="poster-container group relative aspect-[2/3] cursor-pointer" onclick="openDetails('${g.id}')">
                ${(!g.cover || g.cover.trim() === '') ? `
                    <div class="absolute inset-0 bg-[var(--input)] flex items-center justify-center overflow-hidden z-[1]">
                        <span class="inline-block border-[3px] border-current rounded-md px-2 py-1 font-black tracking-widest uppercase -rotate-[35deg] opacity-[0.30] text-sm whitespace-nowrap select-none drop-shadow-md type-anime">
                            ANIMES
                        </span>
                    </div>
                ` : `
                    <img src="${g.cover}" class="blur-bg" loading="lazy" aria-hidden="true">
                    <img src="${g.cover}" class="main-cover" onerror="this.src='https://via.placeholder.com/400x600?text=Capa'" loading="lazy">
                `}
                
                <div class="absolute bottom-1.5 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                    <span class="px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest status-${(g.status || 'watchlist').toLowerCase()} shadow-md whitespace-nowrap">${g.status || 'Watchlist'}</span>
                </div>

                <div class="absolute inset-0 bg-[var(--surface)]/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm z-40">
                    <button onclick="event.stopPropagation(); addOneEpisode('${g.id}')" class="btn btn-primary text-[11px] shadow-[0_0_15px_var(--accent-glow)] px-4 py-2 hover:scale-110 tracking-widest">+1 EP</button>
                </div>
            </div>

            <div class="card-body-info relative p-3 flex flex-col justify-center flex-1">
                <h3 class="text-[10px] font-black uppercase truncate text-center w-full leading-tight tracking-wide text-[var(--text-main)] mb-1" title="${g.name}">${g.name}</h3>
                ${starsHTML}
                ${epProg}
            </div>
        </div>
    </div>
    `;
}

// --- CONTROLES DE ROLETA E FILTROS RÁPIDOS ---
function spinRoleta() {
    const isGamerMode = currentAppMode === 'gamer';
    const backlog = games.filter(g => (g.status||'').toLowerCase() === 'watchlist' && (isGamerMode ? g.type === 'Jogo' : g.type !== 'Jogo'));
    
    if(backlog.length === 0) return alert(isGamerMode ? 'Seu Backlog Gamer está vazio! 🎮' : 'Sua Watchlist de TV está vazia! 🍿');
    
    const randomGame = backlog[Math.floor(Math.random() * backlog.length)];
    document.getElementById('roletaGameName').innerText = randomGame.name;
    document.getElementById('roletaResult').innerHTML = `
        <img src="${randomGame.cover}" class="blur-bg" loading="lazy">
        <img src="${randomGame.cover}" class="main-cover" loading="lazy" onerror="this.src='https://via.placeholder.com/400x600?text=Capa'">
    `;
    
    const roletaBorder = document.getElementById('roletaResult');
    if (isGamerMode) {
        roletaBorder.classList.remove('border-[var(--accent)]');
        roletaBorder.classList.add('border-blue-500');
    } else {
        roletaBorder.classList.add('border-[var(--accent)]');
        roletaBorder.classList.remove('border-blue-500');
    }

    document.getElementById('roletaModal').style.display = 'flex';
}

function closeRoleta() { 
    document.getElementById('roletaModal').style.display = 'none'; 
}

function setFavFilter(val, btnElement) { 
    favFilter = val; 
    const buttons = document.querySelectorAll('.fav-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    if(btnElement) {
        btnElement.classList.add('active');
    } else {
        document.querySelector('.fav-btn').classList.add('active'); 
    }
    renderGames(); 
}

// --- SISTEMA DE AUTO-SCROLL UNIFICADO ---
const scrollState = {
    'statFavorites': { speed: 0.4, pos: 0, paused: false, waiting: false },
    'upcomingGrid': { speed: 0.4, pos: 0, paused: false, waiting: false },
    'upcomingGridGamer': { speed: 0.4, pos: 0, paused: false, waiting: false },
    'lastWatchedMovies': { speed: 0.4, pos: 0, paused: false, waiting: false },
    'lastPlayedGames': { speed: 0.4, pos: 0, paused: false, waiting: false }
};

var globalScrollFrame = null;

function initUnifiedAutoScroll() {
    Object.keys(scrollState).forEach(id => {
        const container = document.getElementById(id);
        if (!container) return;

        container.style.scrollSnapType = 'none';
        container.style.scrollBehavior = 'auto';

        const pause = () => scrollState[id].paused = true;
        const play = () => scrollState[id].paused = false;

        container.onmouseenter = pause;
        container.onmouseleave = play;
        container.ontouchstart = pause;
        container.ontouchend = play;

        scrollState[id].pos = container.scrollLeft;
    });

    if (globalScrollFrame) cancelAnimationFrame(globalScrollFrame);
    globalScrollLoop();
}

function globalScrollLoop() {
    Object.keys(scrollState).forEach(id => {
        const state = scrollState[id];
        const container = document.getElementById(id);
        
        if (!container) return;

        if (!state.paused && !state.waiting && container.scrollWidth > container.clientWidth) {
            state.pos += state.speed;
            container.scrollLeft = state.pos;

            if (Math.ceil(container.scrollLeft + container.clientWidth) >= container.scrollWidth - 1) {
                state.waiting = true;
                container.scrollLeft = 0;
                state.pos = 0;
                setTimeout(() => state.waiting = false, 2000);
            }
        } else if (state.paused) {
            state.pos = container.scrollLeft;
        }
    });

    globalScrollFrame = requestAnimationFrame(globalScrollLoop);
}
// =========================================================================
// PARTE 4: CRUD CENTRAL, CÁLCULOS, SESSÕES E TMDB API
// =========================================================================

// --- CÁLCULOS E STATUS AUTOMÁTICO ---
function calculateItemTotalMinutes(g) {
    const baseMin = (parseInt(g.hours) || 0) * 60 + (parseInt(g.minutes) || 0);
    const tipo = (g.type || 'Filme').toLowerCase();
    const isSingle = tipo === 'filme' || tipo === 'filme ova' || tipo === 'jogo';
    
    const baseTime = isSingle ? baseMin : baseMin * (parseInt(g.epWatched) || 0);
    return baseTime * (g.watchCount || 1);
}

function updateAutoStatus(g) {
    if ((g.status || '').toLowerCase() === 'abandonado') return;
    
    const tipo = (g.type || '').toLowerCase();
    if (['série', 'anime', 'desenho'].includes(tipo)) {
        const watched = parseInt(g.epWatched) || 0;
        const total = parseInt(g.epTotal) || 0;
        
        if (watched === 0) {
            g.status = 'Watchlist';
        } else if (total > 0 && watched >= total) {
            g.status = 'Visto';
        } else {
            g.status = 'Assistindo';
        }
    }
}

// --- CONTROLE DE DATAS DAS TEMPORADAS ---
var tempSeasonDates = [];

function addSeasonDateUI() {
    const input = document.getElementById('seasonDateInput');
    const date = input.value;
    if (date && !tempSeasonDates.includes(date)) {
        tempSeasonDates.push(date);
        tempSeasonDates.sort(); 
        renderSeasonDatesUI();
    }
    input.value = '';
}

function removeSeasonDateUI(dateToRemove) {
    tempSeasonDates = tempSeasonDates.filter(d => d !== dateToRemove);
    renderSeasonDatesUI();
}

function renderSeasonDatesUI() {
    const container = document.getElementById('seasonDatesContainer');
    if(container) {
        container.innerHTML = tempSeasonDates.map((d, index) => `
            <div class="flex items-center gap-2 text-[10px] font-bold bg-[var(--surface)] border border-[var(--border)] text-[var(--text-main)] px-2 py-1.5 rounded-lg shadow-sm">
                <span class="text-[var(--accent)] font-black uppercase">S${index + 1}</span>
                <span>${d.split('-').reverse().join('/')}</span>
                <button type="button" onclick="removeSeasonDateUI('${d}')" class="text-red-500 hover:text-red-400 ml-1 text-xs" title="Remover Temporada">✖</button>
            </div>
        `).join('');
    }
}

// --- MODAL DE REGISTRO E EDIÇÃO ---
function toggleEpFields() {
    const type = document.getElementById('gameType').value;
    const epFields = document.getElementById('epFields');
    const gameExtraFields = document.getElementById('gameExtraFields');
    
    const tmdbBtn = document.querySelector('button[onclick="buscarTMDB()"]');
    const dirInput = document.getElementById('gameDirector');
    const stuInput = document.getElementById('gameStudio');
    const dirLabel = dirInput ? dirInput.previousElementSibling : null;
    const stuLabel = stuInput ? stuInput.previousElementSibling : null;

    const statusSelect = document.getElementById('gameStatus');
    const currentStatusValue = statusSelect.value; 
    const labelStartDate = document.getElementById('labelStartDate');
    const containerEndDate = document.getElementById('containerEndDate');
    
    // NOVO: Selecionamos o campo do título para mudar o texto
    const nameInput = document.getElementById('gameName'); 
    
    const isSingle = type === 'Filme' || type === 'Filme OVA' || type === 'Jogo';
    document.getElementById('durationLabel').innerText = isSingle ? "DURAÇÃO TOTAL" : "TEMPO MÉDIO POR EPISÓDIO";
    if (epFields) isSingle ? epFields.classList.add('hidden') : epFields.classList.remove('hidden');

    if (type === 'Jogo') {
        if (gameExtraFields) gameExtraFields.classList.remove('hidden');
        if (tmdbBtn) tmdbBtn.style.display = 'none';
        
        // NOVO: Texto limpo para Jogos
        if (nameInput) nameInput.placeholder = "Digite o nome do jogo"; 
        
        if (dirLabel) dirLabel.innerText = "DESENVOLVEDORA";
        if (dirInput) dirInput.placeholder = "Ex: Naughty Dog, Rockstar";
        if (stuLabel) stuLabel.innerText = "PUBLICADORA";
        if (stuInput) stuInput.placeholder = "Ex: Sony, Xbox";

        if (statusSelect) {
            statusSelect.innerHTML = '<option value="Assistindo">Jogando / Andamento</option><option value="Visto">Zerado</option><option value="Watchlist">Backlog</option><option value="Abandonado">Dropado</option>';
            statusSelect.value = currentStatusValue || 'Watchlist';
        }
        if (labelStartDate) labelStartDate.innerText = "INICIADO EM";
        if (containerEndDate) containerEndDate.classList.remove('hidden');
        
    } else {
        if (gameExtraFields) gameExtraFields.classList.add('hidden');
        if (tmdbBtn) tmdbBtn.style.display = 'inline-block';
        
        // NOVO: Texto com o aviso do TMDB para Filmes/Séries/Animes
        if (nameInput) nameInput.placeholder = "Digite o nome e clique em Buscar TMDB"; 
        
        if (dirLabel) dirLabel.innerText = "DIRETOR";
        if (dirInput) dirInput.placeholder = "Ex: C. Nolan";
        if (stuLabel) stuLabel.innerText = "ESTÚDIO";
        if (stuInput) stuInput.placeholder = "Ex: Warner Bros.";

        if (statusSelect) {
            statusSelect.innerHTML = '<option value="Assistindo">Assistindo</option><option value="Visto">Visto</option><option value="Watchlist">Watchlist</option><option value="Abandonado">Abandonado</option>';
            statusSelect.value = currentStatusValue || 'Watchlist';
        }
        if (labelStartDate) labelStartDate.innerText = "DATA ASSISTIDO";
        if (containerEndDate) containerEndDate.classList.add('hidden');
    }
}
function openModal() { 
    document.getElementById('modal').style.display = 'flex'; 
    const editId = document.getElementById('editId').value;
    const isEdit = editId !== '';
    const typeSelect = document.getElementById('gameType');
    const modalTitle = document.getElementById('modalTitle'); // Puxa a referência do título
    
    // NOVO: Atualiza o título do modal dependendo se é edição ou novo registro
    if (isEdit) {
        modalTitle.innerText = "Editar Obra";
    } else {
        modalTitle.innerText = "Registro da Obra";
    }
    
    // 1. Descobrir qual formato deve ser aplicado
    let intendedType = 'Filme';
    if (isEdit) {
        // Se for edição, busca o tipo original direto do banco de dados (ignora o HTML temporário)
        const g = games.find(x => x.id === editId);
        if (g) intendedType = g.type || 'Filme';
    } else {
        // Se for cadastro novo, usa o valor que já estava lá
        intendedType = typeSelect.value;
        
        // Se o app estiver no modo TV, mas o dropdown ficou travado em "Jogo" do modo Gamer, reseta para Filme
        if (currentAppMode === 'tv' && intendedType === 'Jogo') {
            intendedType = 'Filme';
        }
    }

    // 2. Renderiza as opções dependendo do modo do app ou do tipo da obra
    if (currentAppMode === 'gamer' || intendedType === 'Jogo') {
        typeSelect.innerHTML = '<option value="Jogo">Jogo</option>';
        typeSelect.value = 'Jogo';
    } else {
        typeSelect.innerHTML = '<option value="Filme">Filme</option><option value="Série">Série</option><option value="Anime">Anime</option><option value="Desenho">Desenho</option><option value="Filme OVA">Filme OVA</option>';
        
        // 3. Restaura o valor após injetar as opções do HTML
        if (intendedType !== 'Jogo') {
            typeSelect.value = intendedType;
        } else {
            typeSelect.value = 'Filme'; // Fallback se vier do modo Gamer para TV
        }
    }
    
    toggleEpFields(); 
}
function closeModal() { 
    document.getElementById('modal').style.display = 'none'; 
    document.getElementById('editId').value = ''; 
    document.querySelectorAll('#modal input:not([type="checkbox"])').forEach(i => i.value = ''); 
    
    // NOVO: Reseta o select de plataforma caso ele tenha sido usado
    if(document.getElementById('gamePlatform')) document.getElementById('gamePlatform').value = ''; 
    
    if(document.getElementById('saveCoverOnlyUrl')) document.getElementById('saveCoverOnlyUrl').checked = false; 
    tempSeasonDates = [];
    if(document.getElementById('seasonDatesContainer')) document.getElementById('seasonDatesContainer').innerHTML = '';
}
async function saveGame() {
    const id = document.getElementById('editId').value;
    const gameName = document.getElementById('gameName').value.trim();
    if(!gameName) return;

    const obraDuplicada = games.find(x => x.name.toLowerCase() === gameName.toLowerCase() && x.id !== id);
    if (obraDuplicada) {
        alert(`Aviso: A obra "${gameName}" já existe em sua biblioteca!`);
        return; 
    }

    const existing = id ? games.find(x => x.id === id) : null;
    const inputGenre = document.getElementById('gameGenre').value || "Outros";
    const processedGenre = inputGenre.split(',').map(g => g.trim()).filter(Boolean).slice(0, 2).join(', ');

    const coverInput = document.getElementById('gameCover').value.trim();
    const saveOnlyUrl = document.getElementById('saveCoverOnlyUrl')?.checked;
    const coverFinal = saveOnlyUrl ? coverInput : await urlToBase64(coverInput);

    if (!saveOnlyUrl && coverInput !== '' && !coverFinal.startsWith('data:image')) {
        alert("⚠️ AVISO: O site de origem bloqueou a conversão desta imagem para código offline (erro de segurança/timeout). A capa foi salva apenas como Link (URL).");
    }

    const g = { 
        id: id || crypto.randomUUID(), 
        name: gameName, 
        type: document.getElementById('gameType').value, 
        cover: coverFinal, 
        genre: processedGenre,
        gamePlatform: document.getElementById('gamePlatform') ? document.getElementById('gamePlatform').value.trim() : '',
        targetHours: document.getElementById('gameTargetHours') ? parseInt(document.getElementById('gameTargetHours').value) || 0 : 0,
        director: document.getElementById('gameDirector').value.trim(),
        studio: document.getElementById('gameStudio').value.trim(),    
        releaseYear: document.getElementById('gameReleaseYear').value.trim(), 
        epWatched: parseInt(document.getElementById('epWatched').value) || 0,
        epTotal: parseInt(document.getElementById('epTotal').value) || 0,
        seasons: parseInt(document.getElementById('gameSeasons').value) || 0,
        seasonDates: [...tempSeasonDates], 
        hours: parseInt(document.getElementById('gameHours').value) || 0, 
        minutes: parseInt(document.getElementById('gameMinutes').value) || 0, 
        rating: parseFloat(document.getElementById('gameRating').value) || 0, 
        status: document.getElementById('gameStatus').value, 
        startDate: document.getElementById('gameStartDate').value, 
        endDate: document.getElementById('gameEndDate') ? document.getElementById('gameEndDate').value : '', 
        isFavorite: existing ? existing.isFavorite : false,
        sessions: existing ? (existing.sessions || []) : [],
        comment: existing ? existing.comment : '',
        hasCommentSection: existing ? existing.hasCommentSection : false,
        watchCount: existing ? (existing.watchCount || 1) : 1,
        favOrder: existing ? existing.favOrder : undefined
    };
    
    updateAutoStatus(g);
    
    if(!id) games.push(g); else { const idx = games.findIndex(x => x.id === id); games[idx] = g; }
    await manualSave(); 
    closeModal();
}

function editGame(id) {
    const g = games.find(x => x.id === id);
    document.getElementById('editId').value = id;
    document.getElementById('gameName').value = g.name || '';
    document.getElementById('gameType').value = g.type || 'Filme';
    document.getElementById('gameCover').value = g.cover || '';
    document.getElementById('gameGenre').value = g.genre || '';
    document.getElementById('gameDirector').value = g.director || ''; 
    document.getElementById('gameStudio').value = g.studio || '';     
    document.getElementById('gameReleaseYear').value = g.releaseYear || '';
    if(document.getElementById('gamePlatform')) document.getElementById('gamePlatform').value = g.gamePlatform || '';
    if(document.getElementById('gameTargetHours')) document.getElementById('gameTargetHours').value = g.targetHours || 0;
    document.getElementById('epWatched').value = g.epWatched || 0;
    document.getElementById('epTotal').value = g.epTotal || 0;
    document.getElementById('gameSeasons').value = g.seasons || 0;
    
    tempSeasonDates = g.seasonDates ? [...g.seasonDates] : [];
    renderSeasonDatesUI();
    
    document.getElementById('gameHours').value = g.hours || 0;
    document.getElementById('gameMinutes').value = g.minutes || 0;
    document.getElementById('gameRating').value = g.rating || 0;
    document.getElementById('gameStatus').value = g.status || 'Watchlist';
    document.getElementById('gameStartDate').value = g.startDate || '';
    if(document.getElementById('gameEndDate')) document.getElementById('gameEndDate').value = g.endDate || '';
    document.getElementById('modalTitle').innerText = "Editar Obra";
    openModal();
}

// --- FUNÇÕES RÁPIDAS DE CARD ---
async function addOneEpisode(id) {
    const g = games.find(x => x.id === id);
    if (!g) return; 
    
    const isSingle = ['Filme', 'Filme OVA'].includes(g.type || 'Filme');
    if (isSingle) return; 
    
    const currentEps = parseInt(g.epWatched) || 0;
    
    if (currentEps === 0) {
        g.startDate = new Date().toISOString().split('T')[0];
    }
    
    g.epWatched = currentEps + 1;
    g.lastUpdate = Date.now(); 
    
    updateAutoStatus(g);
    await manualSave();
}

async function markAsWatched(id) {
    const g = games.find(x => x.id === id);
    if (!g) return;
    g.status = 'Visto';
    g.startDate = new Date().toISOString().split('T')[0];
    await manualSave();
    if(typeof closeOptionsMenu === 'function') closeOptionsMenu();
}

async function toggleFavorite(id, elementoClicado) {
    const g = games.find(x => x.id === id);
    if (!g) return;

    g.isFavorite = !g.isFavorite;
    if (g.isFavorite && g.favOrder === undefined) { g.favOrder = Date.now(); }

    if (elementoClicado) {
        if (g.isFavorite) {
            elementoClicado.classList.add('fav-active');
            elementoClicado.classList.remove('opacity-20', 'hover:opacity-100', 'opacity-30'); 
            elementoClicado.title = 'Remover dos favoritos';
        } else {
            elementoClicado.classList.remove('fav-active');
            elementoClicado.classList.add('opacity-20', 'hover:opacity-100');
            elementoClicado.title = 'Favoritar';
        }
    }
    await localforage.setItem(DB_NAME, games);
}
// --- MODAL DE NOTAS RÁPIDAS ---

// Abre o modal e preenche os dados da obra
function openRatingModal(id) {
    const g = games.find(x => x.id === id);
    if (!g) return;

    // Preenche os campos ocultos e de texto com os dados da obra selecionada
    document.getElementById('ratingModalGameId').value = id;
    document.getElementById('ratingModalGameName').innerText = g.name;
    
    // Define o valor atual da nota no select (ou 0 se não tiver nota)
    document.getElementById('ratingModalSelect').value = g.rating || 0;
    
    // Exibe o modal na tela
    document.getElementById('ratingModal').style.display = 'flex';
}

// Fecha o modal limpando a tela
function closeRatingModal() {
    document.getElementById('ratingModal').style.display = 'none';
}

// Salva a nova nota no banco de dados e atualiza a interface
async function saveRatingModal() {
    const id = document.getElementById('ratingModalGameId').value;
    const rating = document.getElementById('ratingModalSelect').value;
    
    const g = games.find(x => x.id === id);
    if (g) {
        // Converte a nota para número e salva na propriedade do objeto
        g.rating = parseFloat(rating) || 0;
        
        // Salva as alterações no LocalForage e renderiza os cards novamente
        await manualSave();
    }
    
    // Fecha o modal após salvar
    closeRatingModal();
}

async function setGameRating(id, rating) {
    const g = games.find(x => x.id === id);
    if (g) {
        g.rating = rating;
        await manualSave();
    }
}

async function addRewatch(id) {
    const g = games.find(x => x.id === id);
    if (!g) return;
    g.watchCount = (g.watchCount || 1) + 1;
    await manualSave();
}

async function clearRewatch(id) {
    const g = games.find(x => x.id === id);
    if (!g) return;
    if (confirm(`Deseja remover o multiplicador de reassistidas de ${g.name}?\nO tempo extra será removido do total.`)) {
        g.watchCount = 1;
        await manualSave();
    }
}

// --- MODAL DE TROCAR CAPA ---
function openEditCoverModal(id) {
    const g = games.find(x => x.id === id);
    if(!g) return;
    document.getElementById('editCoverGameId').value = id;
    document.getElementById('editCoverGameName').innerText = g.name;
    document.getElementById('editCoverInput').value = g.cover || '';
    document.getElementById('editCoverModal').style.display = 'flex';
}

function closeEditCoverModal() { document.getElementById('editCoverModal').style.display = 'none'; }

async function saveCoverAction(type) {
    const id = document.getElementById('editCoverGameId').value;
    const newUrl = document.getElementById('editCoverInput').value.trim();
    const g = games.find(x => x.id === id);
    
    if(!g) return;
    if(!newUrl) return alert("Por favor, insira uma URL válida!");

    if(type === 'base64') {
        const coverBase64 = await urlToBase64(newUrl);
        if (!coverBase64.startsWith('data:image')) {
            alert("⚠️ AVISO: Não foi possível converter a nova capa para código offline. Ela foi salva apenas como Link (URL).");
        }
        g.cover = coverBase64;
    } else {
        g.cover = newUrl; 
    }
    
    await manualSave();
    closeEditCoverModal();
}

// --- MODAL DE SESSÕES ---
function openSessionFromEdit() {
    const id = document.getElementById('editId').value;
    if(!id) return alert('Salve a obra na sua biblioteca primeiro antes de registrar sessões!');
    openSessionModal(id);
}

function openSessionModal(id) {
    const g = games.find(x => x.id === id);
    if(!g) return;
    document.getElementById('sessionId').value = id;
    document.getElementById('sessionDate').value = new Date().toISOString().split('T')[0];
    
    const isSingle = ['Filme', 'Filme OVA'].includes(g.type || 'Filme');
    document.getElementById('sessionEpContainer').style.display = isSingle ? 'none' : 'block';
    document.getElementById('sessionModal').style.display = 'flex';
}

function closeSessionModal() {
    document.getElementById('sessionModal').style.display = 'none';
    document.getElementById('sessionHours').value = '0';
    document.getElementById('sessionMinutes').value = '0';
    document.getElementById('sessionEps').value = '0';
    document.getElementById('sessionNotes').value = '';
}

async function saveSession() {
    const id = document.getElementById('sessionId').value;
    const g = games.find(x => x.id === id);
    if(!g) return;

    const h = parseInt(document.getElementById('sessionHours').value) || 0;
    const m = parseInt(document.getElementById('sessionMinutes').value) || 0;
    const epAdd = parseInt(document.getElementById('sessionEps').value) || 0;
    const note = document.getElementById('sessionNotes').value.trim();
    const date = document.getElementById('sessionDate').value;

    if(!g.sessions) g.sessions = [];
    g.sessions.push({ date, h, m, epAdd, note });

    var totalM = (parseInt(g.minutes) || 0) + m;
    var addH = Math.floor(totalM / 60);
    g.minutes = totalM % 60;
    g.hours = (parseInt(g.hours) || 0) + h + addH;
    
    const isSingle = ['Filme', 'Filme OVA'].includes(g.type || 'Filme');
    if(!isSingle) {
        g.epWatched = (parseInt(g.epWatched) || 0) + epAdd;
    }

    updateAutoStatus(g);

    if(document.getElementById('modal').style.display === 'flex') {
        document.getElementById('gameHours').value = g.hours;
        document.getElementById('gameMinutes').value = g.minutes;
        if(!isSingle) document.getElementById('epWatched').value = g.epWatched;
    }

    await manualSave();
    closeSessionModal();
}

// --- ESTREIAS AGUARDADAS (TV E GAMER) ---
function openAguardadoModal() { document.getElementById('aguardadoModal').style.display = 'flex'; }
function closeAguardadoModal() { document.getElementById('aguardadoModal').style.display = 'none'; }

async function saveAguardado() { 
    const nameInput = document.getElementById('aguardadoName') ? document.getElementById('aguardadoName').value.trim() : '';
    const coverInput = document.getElementById('aguardadoCover').value.trim(); 
    const date = document.getElementById('aguardadoDate').value.trim(); 
    
    if (!coverInput && !nameInput) return alert("Por favor, insira o Título ou a URL do poster!");

    const btn = document.getElementById('btnSaveAguardado');
    if(btn) { btn.innerText = "SALVANDO..."; btn.disabled = true; }

    aguardados.push({ name: nameInput, cover: coverInput, date: date || 'TBA' }); 
    await manualSave(); 
    
    if(document.getElementById('aguardadoName')) document.getElementById('aguardadoName').value = '';
    document.getElementById('aguardadoCover').value = '';
    document.getElementById('aguardadoDate').value = '';
    
    if(btn) { btn.innerText = "ADICIONAR"; btn.disabled = false; }
    closeAguardadoModal(); 
}

function openAguardadoGamerModal() { document.getElementById('aguardadoGamerModal').style.display = 'flex'; }
function closeAguardadoGamerModal() { document.getElementById('aguardadoGamerModal').style.display = 'none'; }

async function saveAguardadoGamer() {
    const nameInput = document.getElementById('aguardadoGamerName').value.trim();
    const coverInput = document.getElementById('aguardadoGamerCover').value.trim(); 
    const date = document.getElementById('aguardadoGamerDate').value.trim(); 
    
    if (!coverInput && !nameInput) return alert("Por favor, insira o Título ou a URL do poster!");

    const btn = document.getElementById('btnSaveAguardadoGamer');
    if(btn) { btn.innerText = "SALVANDO..."; btn.disabled = true; }

    aguardadosGamer.push({ name: nameInput, cover: coverInput, date: date || 'TBA' }); 
    await manualSave(); 
    
    document.getElementById('aguardadoGamerName').value = '';
    document.getElementById('aguardadoGamerCover').value = '';
    document.getElementById('aguardadoGamerDate').value = '';
    
    if(btn) { btn.innerText = "ADICIONAR"; btn.disabled = false; }
    closeAguardadoGamerModal(); 
}

// ====================================================
// INTEGRAÇÃO TMDB API (NOVO FORMATO)
// ====================================================
function configurarTMDB() {
    const currentKey = localStorage.getItem('tmdb_api_key') || '';
    const newKey = prompt("Insira sua API Key do TMDB (v3 auth):", currentKey);
    if (newKey !== null && newKey.trim() !== '') {
        localStorage.setItem('tmdb_api_key', newKey.trim());
        alert("Chave TMDB salva com sucesso!");
    }
}

function buscarTMDB() {
    const apiKey = localStorage.getItem('tmdb_api_key');
    if (!apiKey) {
        alert("Você precisa configurar sua API Key do TMDB primeiro!");
        configurarTMDB();
        return;
    }

    const query = document.getElementById('gameName').value.trim();
    if(document.getElementById('tmdbSearchInput')) document.getElementById('tmdbSearchInput').value = query;
    
    document.getElementById('tmdbSearchModal').style.display = 'flex';
    document.getElementById('tmdbResultsGrid').innerHTML = '';
    
    if (query) { fetchTMDB(); } else { document.getElementById('tmdbSearchInput').focus(); }
}

function closeTmdbSearch() { document.getElementById('tmdbSearchModal').style.display = 'none'; }

async function fetchTMDB() {
    const apiKey = localStorage.getItem('tmdb_api_key');
    const query = document.getElementById('tmdbSearchInput').value.trim();
    if (!query) return;

    document.getElementById('tmdbLoading').classList.remove('hidden');
    document.getElementById('tmdbResultsGrid').innerHTML = '';

    try {
        const response = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=pt-BR&page=1`);
        const data = await response.json();
        const results = data.results.filter(item => item.media_type === 'movie' || item.media_type === 'tv');
        renderTMDBResults(results);
    } catch (error) {
        alert("Erro ao buscar no TMDB. Verifique sua conexão ou API Key.");
        console.error(error);
    } finally {
        document.getElementById('tmdbLoading').classList.add('hidden');
    }
}

function renderTMDBResults(results) {
    const grid = document.getElementById('tmdbResultsGrid');
    
    if (results.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-16 opacity-50 font-black uppercase tracking-widest text-xs text-[var(--text-main)]">Nenhuma obra encontrada. Verifique o termo digitado.</div>';
        return;
    }

    grid.innerHTML = results.map(item => {
        const title = item.title || item.name;
        const releaseDate = item.release_date || item.first_air_date || '';
        const year = releaseDate ? releaseDate.split('-')[0] : '----';
        const posterUrl = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://via.placeholder.com/300x450?text=Sem+Capa';
        const typeLabel = item.media_type === 'movie' ? 'Filme' : 'Série';

        return `
        <div onclick="openTmdbPreview('${item.id}', '${item.media_type}')" class="flex flex-col gap-3 cursor-pointer group">
            <div class="w-full aspect-[2/3] rounded-xl overflow-hidden border-2 border-[var(--border)] group-hover:border-[var(--accent)] group-hover:-translate-y-2 group-hover:shadow-[0_15px_30px_rgba(225,29,72,0.3)] transition-all duration-300 relative bg-[var(--surface)] shadow-md">
                <img src="${posterUrl}" class="w-full h-full object-cover" onerror="this.src='https://via.placeholder.com/300x450?text=Capa'">
                <div class="absolute top-2 right-2 bg-black/80 px-2 py-1 rounded text-[8px] font-black uppercase text-[var(--accent)] backdrop-blur-md border border-[var(--border)] shadow-md">${typeLabel}</div>
            </div>
            <div class="text-center px-1">
                <h3 class="text-[11px] font-black text-[var(--text-main)] uppercase truncate w-full group-hover:text-[var(--accent)] transition-colors" title="${title}">${title}</h3>
                <p class="text-[9px] font-bold text-[var(--text-dim)] tracking-widest mt-0.5">${year}</p>
            </div>
        </div>`;
    }).join('');
}

async function openTmdbPreview(id, mediaType) {
    const apiKey = localStorage.getItem('tmdb_api_key');
    document.getElementById('tmdbLoading').classList.remove('hidden');
    
    try {
        const response = await fetch(`https://api.themoviedb.org/3/${mediaType}/${id}?api_key=${apiKey}&language=pt-BR&append_to_response=credits,images,videos&include_image_language=pt,en,null`);
        const data = await response.json();

        const title = data.title || data.name;
        const releaseDate = data.release_date || data.first_air_date || '';
        const year = releaseDate ? releaseDate.split('-')[0] : '';
        const mainPoster = data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : '';
        const backdrop = data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : '';
        const synopsis = data.overview || 'Sinopse não disponível para esta obra em português.';
        const voteAverage = data.vote_average ? data.vote_average.toFixed(1) : '0.0';
        
        const isAnime = data.origin_country && data.origin_country.includes('JP') && data.genres.some(g => g.name.toLowerCase().includes('animação') || g.name.toLowerCase().includes('animation'));
        var type = mediaType === 'movie' ? 'Filme' : 'Série';
        if (mediaType === 'tv' && isAnime) type = 'Anime';

        const genres = data.genres ? data.genres.map(g => g.name).slice(0, 3).join(', ') : 'Outros';
        
        var director = '';
        if (mediaType === 'movie' && data.credits && data.credits.crew) {
            const dirData = data.credits.crew.find(c => c.job === 'Director');
            if (dirData) director = dirData.name;
        } else if (mediaType === 'tv' && data.created_by && data.created_by.length > 0) {
            director = data.created_by[0].name;
        }

        var studio = '';
        if (data.production_companies && data.production_companies.length > 0) {
            studio = data.production_companies[0].name;
        }

        var hours = 0, minutes = 0, epTotal = 0, seasons = 0;
        if (mediaType === 'movie') {
            const runtime = data.runtime || 0;
            hours = Math.floor(runtime / 60);
            minutes = runtime % 60;
        } else {
            epTotal = data.number_of_episodes || 0;
            seasons = data.number_of_seasons || 0;
            var averageRuntime = 0;
            if (data.episode_run_time && data.episode_run_time.length > 0) {
                averageRuntime = data.episode_run_time[0];
            } else if (data.last_episode_to_air && data.last_episode_to_air.runtime) {
                averageRuntime = data.last_episode_to_air.runtime;
            } else if (data.runtime) {
                averageRuntime = data.runtime;
            }
            hours = Math.floor(averageRuntime / 60);
            minutes = averageRuntime % 60;
        }

        currentTMDBPreviewData = {
            name: title, type: type, cover: mainPoster, genre: genres, director: director, studio: studio,
            releaseYear: year, epTotal: epTotal, seasons: seasons, hours: hours, minutes: minutes
        };

        document.getElementById('tmdbPreviewBackdrop').style.backgroundImage = backdrop ? `url('${backdrop}')` : 'none';
        document.getElementById('tmdbPreviewPoster').src = mainPoster || 'https://via.placeholder.com/400x600?text=Capa';
        document.getElementById('tmdbPreviewType').innerText = type;
        document.getElementById('tmdbPreviewTitle').innerText = title;
        document.getElementById('tmdbPreviewTitle').title = title;
        document.getElementById('tmdbPreviewYear').innerText = year || '----';
        document.getElementById('tmdbPreviewGenres').innerText = genres;
        document.getElementById('tmdbPreviewRating').innerText = voteAverage;
        document.getElementById('tmdbPreviewSynopsis').innerText = synopsis;

        const trailerContainer = document.getElementById('tmdbPreviewTrailerContainer');
        trailerContainer.innerHTML = '';
        if (data.videos && data.videos.results && data.videos.results.length > 0) {
            const trailer = data.videos.results.find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')) || data.videos.results.find(v => v.site === 'YouTube');
            if (trailer) {
                trailerContainer.innerHTML = `
                    <a href="https://www.youtube.com/watch?v=${trailer.key}" target="_blank" class="btn btn-outline border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white text-[9px] py-1.5 px-3 flex items-center gap-2 w-max shadow-sm tracking-widest font-black uppercase transition-all">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg> Assistir Trailer
                    </a>`;
            }
        }

        const posterContainer = document.getElementById('tmdbPosterOptions');
        posterContainer.innerHTML = '';
        if (data.images && data.images.posters && data.images.posters.length > 0) {
            const posters = data.images.posters.slice(0, 10);
            posterContainer.innerHTML = posters.map((p, index) => {
                const pUrl = `https://image.tmdb.org/t/p/w300${p.file_path}`;
                const highResUrl = `https://image.tmdb.org/t/p/w500${p.file_path}`;
                return `<div onclick="selectPreviewPoster('${highResUrl}')" class="w-12 h-18 sm:w-16 sm:h-24 flex-shrink-0 cursor-pointer border-2 border-transparent hover:border-[var(--accent)] transition-all rounded overflow-hidden"><img src="${pUrl}" class="w-full h-full object-cover"></div>`;
            }).join('');
        } else {
            posterContainer.innerHTML = '<span class="text-[8px] text-[var(--text-dim)] uppercase px-2 w-full text-center block">Sem capas alternativas</span>';
        }

        document.getElementById('tmdbAddStatus').value = 'Watchlist';
        document.getElementById('tmdbAddRating').value = '0';
        document.getElementById('tmdbAddDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('tmdbPreviewModal').style.display = 'flex';
        
    } catch (error) {
        alert("Erro ao buscar os detalhes profundos da obra.");
        console.error(error);
    } finally {
        document.getElementById('tmdbLoading').classList.add('hidden');
    }
}

function closeTmdbPreview() {
    document.getElementById('tmdbPreviewModal').style.display = 'none';
    currentTMDBPreviewData = null;
}

function selectPreviewPoster(url) {
    document.getElementById('tmdbPreviewPoster').src = url;
    if (currentTMDBPreviewData) currentTMDBPreviewData.cover = url;
}

async function confirmAddFromPreview() {
    if (!currentTMDBPreviewData) return;

    const status = document.getElementById('tmdbAddStatus').value;
    const rating = parseFloat(document.getElementById('tmdbAddRating').value) || 0;
    var date = document.getElementById('tmdbAddDate').value;
    if (status === 'Watchlist') date = ''; 

    const obraDuplicada = games.find(x => x.name.toLowerCase() === currentTMDBPreviewData.name.toLowerCase());
    if (obraDuplicada) {
        alert(`Aviso: A obra "${currentTMDBPreviewData.name}" já está na sua biblioteca!`);
        return;
    }

    var duracaoMinutos = currentTMDBPreviewData.minutes;
    var duracaoHoras = currentTMDBPreviewData.hours;
    if (!duracaoMinutos && !duracaoHoras && ['Série', 'Anime', 'Desenho'].includes(currentTMDBPreviewData.type)) {
        duracaoMinutos = 24; 
    }

    const newGame = {
        id: crypto.randomUUID(),
        name: currentTMDBPreviewData.name,
        type: currentTMDBPreviewData.type,
        cover: currentTMDBPreviewData.cover,
        genre: currentTMDBPreviewData.genre,
        director: currentTMDBPreviewData.director,
        studio: currentTMDBPreviewData.studio,
        releaseYear: currentTMDBPreviewData.releaseYear,
        epWatched: 0,
        epTotal: currentTMDBPreviewData.epTotal || 0,
        seasons: currentTMDBPreviewData.seasons || 1,
        seasonDates: [],
        hours: duracaoHoras || 0,
        minutes: duracaoMinutos || 0,
        rating: rating,
        status: status,
        startDate: date,
        isFavorite: false,
        sessions: [],
        comment: '',
        hasCommentSection: false,
        watchCount: 1
    };
    
    const isEpisodic = ['Série', 'Anime', 'Desenho'].includes(newGame.type);
    
    if (isEpisodic) {
        if (status === 'Visto') {
            newGame.epWatched = newGame.epTotal > 0 ? newGame.epTotal : 12; 
        } else if (status === 'Assistindo') {
            newGame.epWatched = 1; 
            if (!newGame.startDate) newGame.startDate = new Date().toISOString().split('T')[0];
        } else {
            newGame.epWatched = 0; 
        }
    }

    if (typeof updateAutoStatus === "function") updateAutoStatus(newGame);
    games.push(newGame);
    
    const btnSalvar = document.querySelector('#tmdbPreviewModal .btn-primary');
    const oldText = btnSalvar.innerText;
    btnSalvar.innerText = 'OBRA SALVA! ✔️';
    btnSalvar.classList.add('bg-[var(--green)]', 'border-[var(--green)]');
    
    await manualSave(); 
    
    setTimeout(() => {
        document.getElementById('gameName').value = '';
        closeTmdbPreview();
        closeTmdbSearch();
        closeModal();
        btnSalvar.innerText = oldText;
        btnSalvar.classList.remove('bg-[var(--green)]', 'border-[var(--green)]');
    }, 800);
}
// =========================================================================
// PARTE 5: MODAL DE DETALHES, MODO EXPANDIDO E OPÇÕES
// =========================================================================

// --- CONTROLES DE VISUALIZAÇÃO DO MODAL ---
function toggleDetailsMode(mode) {
    currentDetailsMode = mode;
    const smallPopup = document.getElementById('detailPopupSmall');
    const largePopup = document.getElementById('detailPopupLarge');
    const wrapper = document.getElementById('detailsWrapper');
    
    if (mode === 'large') {        
        smallPopup.classList.add('hidden');
        smallPopup.classList.remove('flex');
        largePopup.classList.remove('hidden');
        largePopup.classList.add('flex');
        wrapper.classList.remove('max-w-[480px]', 'max-w-[640px]');
        wrapper.classList.add('max-w-[520px]');
    } else {
        largePopup.classList.add('hidden');
        largePopup.classList.remove('flex');
        smallPopup.classList.remove('hidden');
        smallPopup.classList.add('flex');
        wrapper.classList.remove('max-w-[520px]', 'max-w-[640px]');
        wrapper.classList.add('max-w-[480px]');
    }
}

async function changeDetailBackdrop() {
    if (!currentDetailId) return;
    const g = games.find(x => x.id === currentDetailId);
    if (!g) return;
    
    const url = prompt("Cole a URL da imagem de fundo (Backdrop panorâmico):", g.backdrop || '');
    if (url !== null) {
        g.backdrop = url.trim();
        document.getElementById('detailLargeBackdrop').style.backgroundImage = g.backdrop ? `url('${g.backdrop}')` : 'none';
        await manualSave();
    }
}

function closeDetails() {
    document.getElementById('detailsModal').style.display = 'none';
}

function toggleAllSeasonsBox() {
    const list = document.getElementById('seasonsModalList');
    const icon = document.getElementById('allSeasonsToggleIcon');
    if (list.classList.contains('hidden')) {
        list.classList.remove('hidden'); list.classList.add('flex');
        if(icon) icon.innerText = '🔼';
    } else {
        list.classList.add('hidden'); list.classList.remove('flex');
        if(icon) icon.innerText = '🔽';
    }
}

// --- RENDERIZAÇÃO DO MODAL DE DETALHES ---
async function openDetails(id) {
    const g = games.find(x => x.id === id);
    if(!g) return;

    currentDetailId = id; 
    
    // 1. MODO PADRÃO (MENOR)
    document.getElementById('detailCover').src = g.cover || 'https://via.placeholder.com/400x600?text=Capa';
    
    const rewatchEl = document.getElementById('detailRewatch');
    if (rewatchEl) {
        if (g.watchCount && g.watchCount > 1) {
            rewatchEl.innerText = 'x' + g.watchCount;
            rewatchEl.classList.remove('hidden');
        } else {
            rewatchEl.classList.add('hidden');
        }
    }
    
    const typeEl = document.getElementById('detailType');
    typeEl.innerText = g.type || 'Filme';
    typeEl.className = `text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-[var(--input)] border border-[var(--border)] w-max mb-1.5 shadow-inner type-${(g.type||'filme').toLowerCase().replace(' ', '-')}`;
    
    document.getElementById('detailTitle').innerText = g.name || '';
    if (document.getElementById('detailYear')) document.getElementById('detailYear').innerText = g.releaseYear || '----';
    if (document.getElementById('detailGenre')) document.getElementById('detailGenre').innerText = g.genre || 'Sem Gênero';
    
    const labelsNota = {
        0: "Sem Nota", 1: "Puta Merda", 2: "Terrível", 3: "Ruim", 
        4: "Mediocre", 5: "Tanto Faz", 6: "Decente", 7: "Bom", 
        8: "Muito Bom", 9: "Incrível", 10: "Obra-prima"
    };
    const notaAtual = parseInt(g.rating) || 0;

    document.getElementById('detailRating').innerHTML = `
        <div class="flex flex-col items-center justify-center">
            <div class="text-[14px] font-black flex items-center gap-1" style="color: var(--star-filled); text-shadow: 0 0 10px var(--star-glow);">
                ★ <span class="text-[var(--text-main)]">${notaAtual}<span class="text-[10px] text-[var(--text-dim)]">/10</span></span>
            </div>
            <span class="text-[8px] font-black uppercase text-[var(--accent)] mt-1 tracking-widest">${labelsNota[notaAtual]}</span>
        </div>
    `;
    
    document.getElementById('detailTime').innerText = formatMinutes(calculateItemTotalMinutes(g));

    const progContainer = document.getElementById('detailSeriesProgress');
    const isEpisodic = ['Série', 'Anime', 'Desenho'].includes(g.type);

    if (isEpisodic) {
        progContainer.classList.remove('hidden');
        progContainer.classList.add('flex');
        
        const safeEpTotal = g.epTotal > 0 ? g.epTotal : Math.max(parseInt(g.epWatched) || 0, 12);
        const percent = Math.round((g.epWatched / safeEpTotal) * 100) || 0;
        
        document.getElementById('detailEpText').innerText = `Episódios: ${g.epWatched || 0}/${g.epTotal > 0 ? g.epTotal : '?'}`;
        document.getElementById('detailEpPercent').innerText = `${percent}%`;
        
        const bar = document.getElementById('detailEpBar');
        bar.style.width = `${Math.min(percent, 100)}%`;
        bar.className = `h-full transition-all duration-700 ${percent >= 100 ? 'bg-[var(--green)] shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-[var(--accent)] shadow-[0_0_10px_var(--accent-glow)]'}`;
        
        document.getElementById('detailSeasonsText').innerText = g.seasons ? `Temporadas: ${g.seasons}` : 'Temporadas: 1';
        document.getElementById('detailSeasonDateText').innerText = (g.seasonDates && g.seasonDates.length > 0) ? `Nova Temp: ${g.seasonDates[g.seasonDates.length - 1].split('-').reverse().join('/')}` : '';
    } else {
        progContainer.classList.add('hidden');
        progContainer.classList.remove('flex');
    }

    // Tradutor de Status para o modo Gamer
    let displayStatus = g.status || 'Watchlist';
    if (g.type === 'Jogo') {
        const gamerStatusMap = {
            'Assistindo': 'Jogando',
            'Visto': 'Zerado',
            'Watchlist': 'Backlog',
            'Abandonado': 'Dropado'
        };
        displayStatus = gamerStatusMap[g.status] || g.status || 'Backlog';
    }

    // Define isGame antes para poder usar a condicional
    const isGame = g.type === 'Jogo';

    document.getElementById('detailStatus').innerText = displayStatus;
// ==========================================
    // LÓGICA DA PLATAFORMA NOS DETALHES
    // ==========================================
    const platContainerSmall = document.getElementById('detailPlatformContainer');
    const platContainerLarge = document.getElementById('detailLargePlatformContainer');
    
    // Mostra a plataforma se for um Jogo e se ele tiver uma plataforma registrada
    if (isGame && g.gamePlatform && g.gamePlatform.trim() !== '') {
        if (platContainerSmall) platContainerSmall.classList.remove('hidden');
        if (document.getElementById('detailPlatform')) document.getElementById('detailPlatform').innerText = g.gamePlatform;
        
        if (platContainerLarge) platContainerLarge.classList.remove('hidden');
        if (document.getElementById('detailLargePlatform')) document.getElementById('detailLargePlatform').innerText = g.gamePlatform;
    } else {
        // Esconde se for TV Time (Série, Filme, etc) ou se o jogo não tiver plataforma
        if (platContainerSmall) platContainerSmall.classList.add('hidden');
        if (platContainerLarge) platContainerLarge.classList.add('hidden');
    }
    // ==========================================
    document.getElementById('detailDate').innerText = g.startDate ? g.startDate.split('-').reverse().join('/') : '---';
    document.getElementById('detailDirectorDisplay').innerText = g.director || '---';
    // Se for Jogo pega endDate, senão pega studio normal
    document.getElementById('detailStudioDisplay').innerText = isGame ? (g.endDate ? g.endDate.split('-').reverse().join('/') : '---') : (g.studio || '---');

    // ----------------------------------------------------
    // LÓGICA DE TEXTO DINÂMICO PARA JOGOS (MODO MENOR)
    // ----------------------------------------------------
    const lblDate = document.getElementById('labelDetailDate');
    const lblDir = document.getElementById('labelDetailDirector');
    const lblStd = document.getElementById('labelDetailStudio');
    
    if (lblDate) lblDate.innerText = isGame ? "INICIADO EM" : "VISTO EM";
    if (lblDir) lblDir.innerText = isGame ? "DESENVOLVEDORA" : "DIRETOR";
    // Trocado de PUBLICADORA para CONCLUÍDO EM
    if (lblStd) lblStd.innerText = isGame ? "CONCLUÍDO EM" : "ESTÚDIO";
    // ----------------------------------------------------

    // 2. MODO EXPANDIDO (CINEMATOGRÁFICO)
    const backdropUrl = g.backdrop || g.cover || 'https://via.placeholder.com/600x400?text=Sem+Fundo';
    document.getElementById('detailLargeBackdrop').style.backgroundImage = `url('${backdropUrl}')`;
    document.getElementById('detailLargeCover').src = g.cover || 'https://via.placeholder.com/400x600?text=Capa';
    
    document.getElementById('detailLargeTitle').innerText = g.name || '';
    document.getElementById('detailLargeYear').innerText = g.releaseYear || '----';
    document.getElementById('detailLargeType').innerText = g.type || 'Filme';
    
    const ratingStr = g.rating > 0 ? parseFloat(g.rating).toFixed(1).replace('.', ',') : '-,-';
    document.getElementById('detailLargeRating').innerText = ratingStr;
    
    document.getElementById('detailLargeStatus').innerText = displayStatus;
    document.getElementById('detailLargeTime').innerText = formatMinutes(calculateItemTotalMinutes(g));
    document.getElementById('detailLargeGenre').innerText = g.genre || '---';
    document.getElementById('detailLargeDirector').innerText = g.director || '---';
    // Injeta a data de conclusão no lugar do estúdio
    document.getElementById('detailLargeStudio').innerText = isGame ? (g.endDate ? g.endDate.split('-').reverse().join('/') : '---') : (g.studio || '---');
    document.getElementById('detailLargeDate').innerText = g.startDate ? g.startDate.split('-').reverse().join('/') : '---';

    // ----------------------------------------------------
    // LÓGICA DE TEXTO DINÂMICO PARA JOGOS (MODO EXPANDIDO)
    // ----------------------------------------------------
    const lblLargeDate = document.getElementById('labelLargeDate');
    const lblLargeDir = document.getElementById('labelLargeDirector');
    const lblLargeStd = document.getElementById('labelLargeStudio');
    
    if (lblLargeDate) lblLargeDate.innerText = isGame ? "Iniciado em:" : "Data Visto:";
    if (lblLargeDir) lblLargeDir.innerText = isGame ? "Desenvolvedora:" : "Diretor:";
    // Trocado de Publicadora para Concluído em:
    if (lblLargeStd) lblLargeStd.innerText = isGame ? "Concluído em:" : "Estúdio:";
    // ----------------------------------------------------

    // 3. LÓGICA DE TEMPORADAS E EPISÓDIOS
    const seasonsBox = document.getElementById('seasonsBox');
    const seasonsModalList = document.getElementById('seasonsModalList');
    
    if (seasonsBox && seasonsModalList) {
        if (isEpisodic) {
            seasonsBox.classList.remove('hidden');
            seasonsBox.classList.add('flex');
            seasonsModalList.classList.add('hidden');
            seasonsModalList.classList.remove('flex');
            const toggleIcon = document.getElementById('allSeasonsToggleIcon');
            if(toggleIcon) toggleIcon.innerText = '🔽';
            
            if (!g.watchedEpisodes) g.watchedEpisodes = [];
            
            const effectiveSeasons = (g.seasons && g.seasons > 0) ? g.seasons : 1;
            const effectiveEpTotal = (g.epTotal && g.epTotal > 0) ? g.epTotal : Math.max(parseInt(g.epWatched) || 0, 12);
            
            const epsPerSeasonArray = [];
            const epsPerSeasonAvg = Math.ceil(effectiveEpTotal / effectiveSeasons);
            
            for (var s = 1; s <= effectiveSeasons; s++) {
                var epsInThisSeason = epsPerSeasonAvg;
                if (s === effectiveSeasons) {
                    epsInThisSeason = effectiveEpTotal - (epsPerSeasonAvg * (effectiveSeasons - 1));
                    if (epsInThisSeason <= 0) epsInThisSeason = epsPerSeasonAvg;
                }
                if (g.seasonEps && g.seasonEps[s]) {
                    epsInThisSeason = parseInt(g.seasonEps[s]);
                }
                epsPerSeasonArray.push(epsInThisSeason);
            }

            const targetWatched = parseInt(g.epWatched) || 0;
            
            if (g.watchedEpisodes.length !== targetWatched) {
                g.watchedEpisodes = [];
                var count = 0;
                for (var s = 1; s <= effectiveSeasons; s++) {
                    for (var e = 1; e <= epsPerSeasonArray[s - 1]; e++) {
                        if (count < targetWatched) {
                            g.watchedEpisodes.push(`S${s}E${e}`);
                            count++;
                        }
                    }
                }
                manualSave();
            }
            
            var html = '';
            for (var s = 1; s <= effectiveSeasons; s++) {
                const epsInThisSeason = epsPerSeasonArray[s - 1];
                const sPrefix = `S${s}E`;
                const epsVistosNaTemp = g.watchedEpisodes.filter(e => e.startsWith(sPrefix)).length;
                const seasonChecked = (epsVistosNaTemp >= epsInThisSeason && epsInThisSeason > 0);
                const seasonBtnColor = seasonChecked ? 'bg-[var(--text-main)] text-[var(--bg)] border-transparent' : 'border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--text-main)] hover:text-[var(--text-main)]';

                var epsHtml = '';
                for (var e = 1; e <= epsInThisSeason; e++) {
                    const epCode = `S${s}E${e}`;
                    const isWatched = g.watchedEpisodes.includes(epCode);
                    const checkClasses = isWatched 
                        ? 'bg-[var(--text-main)] border-transparent text-[var(--bg)]' 
                        : 'border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--text-main)] hover:text-[var(--text-main)]';
                        
                    epsHtml += `
                    <div class="flex items-center justify-between p-3 border-t border-[var(--border)] hover:opacity-80 transition-colors cursor-pointer" onclick="toggleStaticEpisode('${g.id}', ${s}, ${e}, this)">
                        <div class="flex items-center gap-4 min-w-0 w-3/4">
                            <div class="w-12 h-8 flex-shrink-0 bg-[var(--input)] rounded flex items-center justify-center border border-[var(--border)] shadow-sm text-[var(--text-dim)] text-[8px] font-black">EP</div>
                            <div class="flex flex-col min-w-0 justify-center flex-1">
                                <h5 class="text-[13px] font-bold text-[var(--text-main)] mb-0.5">S${String(s).padStart(2, '0')} | E${String(e).padStart(2, '0')}</h5>
                                <span class="text-[11px] text-[var(--text-dim)] truncate w-full">Episódio ${e}</span>
                            </div>
                        </div>
                        <div class="flex-shrink-0 ml-3 pr-2">
                            <div class="w-6 h-6 rounded-full border flex items-center justify-center transition-colors ep-check-btn ${checkClasses}">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="${isWatched ? 'opacity-100' : 'opacity-0'} transition-opacity"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                        </div>
                    </div>`;
                }

                html += `
                <div class="bg-[var(--surfaceHover)] border border-transparent rounded-2xl overflow-hidden flex flex-col mb-2 flex-shrink-0 shadow-sm">
                    <div class="flex items-center justify-between p-4 cursor-pointer hover:opacity-80 transition" onclick="toggleStaticSeasonAccordion(${s})">
                        <div class="flex items-center gap-2">
                            <h4 class="text-[15px] font-bold text-[var(--text-main)]">Temporada ${s}</h4>
                            <button onclick="event.stopPropagation(); editSeasonEps('${g.id}', ${s})" class="text-[12px] opacity-40 hover:opacity-100 hover:text-[var(--accent)] transition px-1" title="Editar Episódios desta Temporada">✏️</button>
                            <span id="static-icon-season-${s}" class="text-[var(--text-dim)] text-[10px] ml-1 transition-transform duration-300">🔽</span>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="text-[13px] font-medium text-[var(--text-dim)]" id="static-count-season-${s}">${epsVistosNaTemp}/${epsInThisSeason}</span>
                            <button onclick="event.stopPropagation(); markStaticSeasonWatched('${g.id}', ${s}, ${epsInThisSeason})" class="w-6 h-6 rounded-full border ${seasonBtnColor} flex items-center justify-center transition-colors season-check-btn">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </button>
                        </div>
                    </div>
                    <div id="static-episodes-season-${s}" class="hidden flex-col bg-[var(--surfaceHover)]">
                        ${epsHtml}
                    </div>
                </div>`;
            }
            seasonsModalList.innerHTML = html;
        } else {
            seasonsBox.classList.add('hidden');
            seasonsBox.classList.remove('flex');
            seasonsModalList.innerHTML = '';
        }
    }

    toggleDetailsMode(currentDetailsMode);
    document.getElementById('detailsModal').style.display = 'flex';
}

// --- CONTROLE ESTÁTICO DE SESSÕES (FRONT-END SEM API) ---
async function editSeasonEps(gameId, seasonNum) {
    const g = games.find(x => x.id === gameId);
    if (!g) return;

    const effectiveSeasons = (g.seasons && g.seasons > 0) ? g.seasons : 1;
    const effectiveEpTotal = (g.epTotal && g.epTotal > 0) ? g.epTotal : Math.max(parseInt(g.epWatched) || 0, 12);
    const epsPerSeason = Math.ceil(effectiveEpTotal / effectiveSeasons);
    
    var currentEps = epsPerSeason;
    if (seasonNum === effectiveSeasons) {
        currentEps = effectiveEpTotal - (epsPerSeason * (effectiveSeasons - 1));
        if (currentEps <= 0) currentEps = epsPerSeason;
    }
    if (g.seasonEps && g.seasonEps[seasonNum]) {
        currentEps = g.seasonEps[seasonNum];
    }

    const newValue = prompt(`Quantos episódios a Temporada ${seasonNum} possui?`, currentEps);
    if (newValue === null) return; 
    
    const newEps = parseInt(newValue);
    if (isNaN(newEps) || newEps < 1) {
        alert("Valor inválido! Digite um número maior que 0.");
        return;
    }

    if (!g.seasonEps) g.seasonEps = {};
    g.seasonEps[seasonNum] = newEps;

    var novoTotalDeEps = 0;
    for (var i = 1; i <= effectiveSeasons; i++) {
        if (g.seasonEps[i]) {
            novoTotalDeEps += g.seasonEps[i];
        } else {
            var fallback = epsPerSeason;
            if (i === effectiveSeasons) {
                fallback = effectiveEpTotal - (epsPerSeason * (effectiveSeasons - 1));
                if (fallback <= 0) fallback = epsPerSeason;
            }
            novoTotalDeEps += fallback;
        }
    }
    
    g.epTotal = novoTotalDeEps;
    updateAutoStatus(g);
    await manualSave();
    
    await openDetails(gameId);
    
    const list = document.getElementById('seasonsModalList');
    const icon = document.getElementById('allSeasonsToggleIcon');
    if (list) {
        list.classList.remove('hidden'); list.classList.add('flex');
        if (icon) icon.innerText = '🔼';
    }
    setTimeout(() => toggleStaticSeasonAccordion(seasonNum), 50);
}

function toggleStaticSeasonAccordion(seasonNumber) {
    const epContainer = document.getElementById(`static-episodes-season-${seasonNumber}`);
    const icon = document.getElementById(`static-icon-season-${seasonNumber}`);
    
    if (epContainer.classList.contains('hidden')) {
        epContainer.classList.remove('hidden');
        epContainer.classList.add('flex');
        icon.innerText = '🔼';
    } else {
        epContainer.classList.add('hidden');
        epContainer.classList.remove('flex');
        icon.innerText = '🔽';
    }
}

async function toggleStaticEpisode(gameId, seasonNum, epNum, element) {
    const g = games.find(x => x.id === gameId);
    if (!g) return;
    
    if (!g.watchedEpisodes) g.watchedEpisodes = [];
    const epCode = `S${seasonNum}E${epNum}`;
    
    const checkBtn = element.querySelector('.ep-check-btn');
    const svgIcon = checkBtn.querySelector('svg');
    const isChecked = g.watchedEpisodes.includes(epCode);
    
    if (!isChecked) {
        g.watchedEpisodes.push(epCode);
        g.epWatched = (parseInt(g.epWatched) || 0) + 1;
        checkBtn.classList.remove('border-[var(--border)]', 'text-[var(--text-dim)]', 'hover:border-[var(--text-main)]', 'hover:text-[var(--text-main)]');
        checkBtn.classList.add('bg-[var(--text-main)]', 'border-transparent', 'text-[var(--bg)]');
        svgIcon.classList.replace('opacity-0', 'opacity-100');
    } else {
        g.watchedEpisodes = g.watchedEpisodes.filter(e => e !== epCode);
        g.epWatched = Math.max(0, (parseInt(g.epWatched) || 0) - 1);
        checkBtn.classList.remove('bg-[var(--text-main)]', 'border-transparent', 'text-[var(--bg)]');
        checkBtn.classList.add('border-[var(--border)]', 'text-[var(--text-dim)]', 'hover:border-[var(--text-main)]', 'hover:text-[var(--text-main)]');
        svgIcon.classList.replace('opacity-100', 'opacity-0');
    }
    
    g.lastUpdate = Date.now();
    updateAutoStatus(g);
    await manualSave();
    
    updateStaticSeasonCounterUI(gameId, seasonNum);
    updateGlobalCounterUI(g);
}

async function markStaticSeasonWatched(gameId, seasonNum, totalEps) {
    const g = games.find(x => x.id === gameId);
    if (!g) return;
    if (!g.watchedEpisodes) g.watchedEpisodes = [];

    const sPrefix = `S${seasonNum}E`;
    const epsVistos = g.watchedEpisodes.filter(e => e.startsWith(sPrefix)).length;
    
    var addedCount = 0;
    var removedCount = 0;
    
    if (epsVistos === totalEps) {
        g.watchedEpisodes = g.watchedEpisodes.filter(e => !e.startsWith(sPrefix));
        removedCount = totalEps;
    } else {
        for(var i=1; i<=totalEps; i++) {
            const epCode = `S${seasonNum}E${i}`;
            if(!g.watchedEpisodes.includes(epCode)) {
                g.watchedEpisodes.push(epCode);
                addedCount++;
            }
        }
    }

    if (addedCount > 0) g.epWatched = (parseInt(g.epWatched) || 0) + addedCount;
    if (removedCount > 0) g.epWatched = Math.max(0, (parseInt(g.epWatched) || 0) - removedCount);
        
    g.lastUpdate = Date.now();
    updateAutoStatus(g);
    await manualSave();
    
    const epContainer = document.getElementById(`static-episodes-season-${seasonNum}`);
    if (epContainer) {
        const epRows = epContainer.querySelectorAll('.ep-check-btn');
        epRows.forEach((btn, index) => {
            const epCode = `S${seasonNum}E${index + 1}`;
            const isWatched = g.watchedEpisodes.includes(epCode);
            const svgIcon = btn.querySelector('svg');
            
            if (isWatched) {
                btn.classList.remove('border-[var(--border)]', 'text-[var(--text-dim)]', 'hover:border-[var(--text-main)]', 'hover:text-[var(--text-main)]');
                btn.classList.add('bg-[var(--text-main)]', 'border-transparent', 'text-[var(--bg)]');
                svgIcon.classList.replace('opacity-0', 'opacity-100');
            } else {
                btn.classList.remove('bg-[var(--text-main)]', 'border-transparent', 'text-[var(--bg)]');
                btn.classList.add('border-[var(--border)]', 'text-[var(--text-dim)]', 'hover:border-[var(--text-main)]', 'hover:text-[var(--text-main)]');
                svgIcon.classList.replace('opacity-100', 'opacity-0');
            }
        });
    }
    
    updateStaticSeasonCounterUI(gameId, seasonNum);
    updateGlobalCounterUI(g);
}

function updateStaticSeasonCounterUI(gameId, seasonNum) {
    const countEl = document.getElementById(`static-count-season-${seasonNum}`);
    if(!countEl) return;
    const g = games.find(x => x.id === gameId);
    if(!g || !g.watchedEpisodes) return;

    const sPrefix = `S${seasonNum}E`;
    const epsVistos = g.watchedEpisodes.filter(e => e.startsWith(sPrefix)).length;
    
    const currentText = countEl.innerText;
    const total = currentText.split('/')[1];
    countEl.innerText = `${epsVistos}/${total}`;

    const seasonBtn = countEl.parentElement.querySelector('.season-check-btn');
    if(epsVistos === parseInt(total) && parseInt(total) > 0) {
        seasonBtn.className = 'w-6 h-6 rounded-full border bg-[var(--text-main)] border-transparent text-[var(--bg)] flex items-center justify-center transition-colors season-check-btn';
    } else {
        seasonBtn.className = 'w-6 h-6 rounded-full border border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--text-main)] hover:text-[var(--text-main)] flex items-center justify-center transition-colors season-check-btn';
    }
}

function updateGlobalCounterUI(g) {
    if (g.epTotal > 0) {
        const percent = Math.round((g.epWatched / g.epTotal) * 100) || 0;
        const textEl = document.getElementById('detailEpText');
        const percEl = document.getElementById('detailEpPercent');
        const barEl = document.getElementById('detailEpBar');
        
        if(textEl) textEl.innerText = `Episódios: ${g.epWatched}/${g.epTotal}`;
        if(percEl) percEl.innerText = `${percent}%`;
        if(barEl) {
            barEl.style.width = `${percent}%`;
            barEl.className = `h-full transition-all duration-700 ${percent >= 100 ? 'bg-[var(--green)] shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-[var(--accent)] shadow-[0_0_10px_var(--accent-glow)]'}`;
        }
    }
}

// --- MODAL DE OPÇÕES DE CARD RÁPIDAS ---
function openOptionsMenu(id) {
    const g = games.find(x => x.id === id);
    if (!g) return;

    const displayType = (g.type === 'Filme OVA') ? 'Filme' : (g.type || 'Filme');
    const totalMinutes = calculateItemTotalMinutes(g);

    document.getElementById('optionsType').innerText = g.type || 'Filme';
    document.getElementById('optionsType').className = `text-[8px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded bg-[var(--tab-bg)] border border-[var(--border)] inline-block mb-2 type-${displayType.toLowerCase().replace(' ', '-')}`;
    document.getElementById('optionsTitle').innerText = g.name || '';
    document.getElementById('optionsInfo').innerText = `${g.releaseYear || '----'} • ${g.status || 'Watchlist'} • ★ ${g.rating || 0}/10 • ${formatMinutes(totalMinutes)}`;

    const epProgContainer = document.getElementById('optionsEpProgress');
    
    // Oculta a barra de episódios também para Jogos
    if (!['Filme', 'Filme OVA', 'Jogo'].includes(g.type || 'Filme') && g.epTotal > 0) {
        epProgContainer.classList.remove('hidden');
        epProgContainer.classList.add('flex');
        const percent = Math.round((g.epWatched / g.epTotal) * 100) || 0;
        document.getElementById('optionsEpText').innerText = `Episódios: ${g.epWatched}/${g.epTotal}`;
        document.getElementById('optionsEpPercent').innerText = `${percent}%`;
        const bar = document.getElementById('optionsEpBar');
        bar.style.width = `${percent}%`;
        bar.className = `h-full ${percent >= 100 ? 'bg-[var(--green)] shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-[var(--accent)] shadow-[0_0_8px_var(--accent-glow)]'}`;
    } else {
        epProgContainer.classList.add('hidden');
        epProgContainer.classList.remove('flex');
    }

    const isSingle = ['Filme', 'Filme OVA'].includes(g.type || 'Filme');
    const isGame = g.type === 'Jogo'; // Cria a verificação exclusiva para jogos
    
    var buttonsHTML = `
        <button onclick="openDetails('${g.id}'); closeOptionsMenu();" class="btn btn-primary w-full !text-[10px] py-2 tracking-widest uppercase shadow-[0_0_10px_rgba(225,29,72,0.3)]">Detalhes Completos</button>
        
        ${((isSingle || isGame) && (g.status || 'Watchlist').toLowerCase() === 'watchlist') ? `<button onclick="markAsWatched('${g.id}')" class="btn btn-primary w-full !text-[10px] py-2 tracking-widest uppercase bg-emerald-600 hover:bg-emerald-700 shadow-[0_0_10px_rgba(16,185,129,0.3)] border-none">${isGame ? 'Marcar como Zerado' : 'Assistir'}</button>` : ''}
        
        ${(!isSingle && !isGame) ? `<button onclick="addOneEpisode('${g.id}'); openOptionsMenu('${g.id}');" class="btn btn-outline !text-[10px] py-2 border-indigo-500/30 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-colors">+1 Episódio</button>` : ''}
        
        <div class="grid grid-cols-2 gap-2">
            ${isGame ? 
            `<button onclick="addRewatch('${g.id}'); closeOptionsMenu();" class="btn btn-outline !text-[10px] py-2 border-blue-500/30 text-blue-500 hover:bg-blue-500 hover:text-white transition-colors">+ Rejogar</button>` : 
            `<button onclick="addRewatch('${g.id}'); closeOptionsMenu();" class="btn btn-outline !text-[10px] py-2 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-colors">+ Reassistir</button>`}
            
            <button onclick="openEditCoverModal('${g.id}'); closeOptionsMenu();" class="btn btn-outline !text-[10px] py-2 border-rose-400/30 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors">Trocar Capa</button>
            <button onclick="editGame('${g.id}'); closeOptionsMenu();" class="btn btn-outline !text-[10px] py-2 border-[var(--borderSubtle)] text-[var(--text-dim)] hover:text-white transition-colors">Editar</button>
            <button onclick="if(confirm('Excluir Título?')){games=games.filter(x=>x.id!=='${g.id}');manualSave();closeOptionsMenu();}" class="btn btn-outline !text-[10px] py-2 border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white transition-colors">Excluir</button>
        </div>
        
        ${(g.watchCount && g.watchCount > 1) ? `<button onclick="clearRewatch('${g.id}'); closeOptionsMenu();" class="btn btn-outline w-full !text-[9px] py-1.5 border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white transition-colors">Zerar Contador (x${g.watchCount})</button>` : ''}
    `;

    document.getElementById('optionsButtons').innerHTML = buttonsHTML;
    document.getElementById('optionsModal').style.display = 'flex';
}
function closeOptionsMenu() {
    document.getElementById('optionsModal').style.display = 'none';
}
// =========================================================================
// PARTE 6: FRANQUIAS, LISTAS CUSTOMIZADAS E TOP 100
// =========================================================================

// --- SISTEMA DE FRANQUIAS E SAGAS ---
var currentFranquiasMode = 'tv'; 

function openFranquias() {
    currentFranquiasMode = currentAppMode; 
    switchFranquiasMode(currentFranquiasMode);
    document.getElementById('franquiasModal').style.display = 'flex';
}

function closeFranquias() {
    document.getElementById('franquiasModal').style.display = 'none';
}

function switchFranquiasMode(mode) {
    currentFranquiasMode = mode;
    const sliderBg = document.getElementById('sliderBgFranquias');
    const btnTV = document.getElementById('btnModeFranquiasTV');
    const btnGamer = document.getElementById('btnModeFranquiasGamer');
    const title = document.getElementById('franquiasMainTitle');
    
    if (mode === 'tv') {
        if(sliderBg) {
            sliderBg.style.transform = 'translateX(0)';
            sliderBg.classList.remove('bg-blue-500', 'shadow-[0_0_10px_rgba(59,130,246,0.4)]');
            sliderBg.classList.add('bg-orange-500', 'shadow-[0_0_10px_rgba(249,115,22,0.4)]');
        }
        if(btnTV) { btnTV.classList.add('text-white'); btnTV.classList.remove('text-[var(--text-dim)]'); }
        if(btnGamer) { btnGamer.classList.add('text-[var(--text-dim)]'); btnGamer.classList.remove('text-white'); }
        if(title) { 
            title.classList.remove('text-blue-500'); title.classList.add('text-orange-500'); 
            title.innerHTML = '📚 Franquias & Sagas <span class="text-[10px] text-[var(--text-dim)] tracking-widest mt-0.5">TV TIME</span>'; 
        }
    } else {
        if(sliderBg) {
            sliderBg.style.transform = 'translateX(100%)';
            sliderBg.classList.remove('bg-orange-500', 'shadow-[0_0_10px_rgba(249,115,22,0.4)]');
            sliderBg.classList.add('bg-blue-500', 'shadow-[0_0_10px_rgba(59,130,246,0.4)]');
        }
        if(btnGamer) { btnGamer.classList.add('text-white'); btnGamer.classList.remove('text-[var(--text-dim)]'); }
        if(btnTV) { btnTV.classList.add('text-[var(--text-dim)]'); btnTV.classList.remove('text-white'); }
        if(title) { 
            title.classList.remove('text-orange-500'); title.classList.add('text-blue-500'); 
            title.innerHTML = '🎮 Franquias & Sagas <span class="text-[10px] text-[var(--text-dim)] tracking-widest mt-0.5">GAMER</span>'; 
        }
    }
    renderFranquias();
}

function renderFranquias() {
    const filteredFranquias = franquiasData.filter(f => (f.mode || 'tv') === currentFranquiasMode);
    filteredFranquias.sort((a, b) => a.name.localeCompare(b.name));
    
    const sidebar = document.getElementById('franquiasSidebarList');
    const grid = document.getElementById('franquiasGrid');
    var sidebarHTML = '';

    filteredFranquias.forEach((f) => {
        var total = f.games.length;
        var zerados = f.games.filter(g => g.completed).length;
        var perc = total > 0 ? ((zerados / total) * 100).toFixed(0) : 0;
        var percText = perc + '%';
        var corDestaque = currentFranquiasMode === 'tv' ? 'text-[var(--accent)]' : 'text-blue-500';
        
        sidebarHTML += `
            <div class="flex border-b border-[var(--border)] text-[11px] font-bold hover:bg-[var(--input)] transition-colors cursor-pointer group" onclick="document.getElementById('franq-${f.id}').scrollIntoView({behavior:'smooth'})">
                <div class="flex-1 py-3 px-4 text-[var(--text-dim)] group-hover:text-[var(--text-main)] truncate transition-colors" title="${f.name}">${f.name}</div>
                <div class="w-16 py-3 px-2 text-center border-l border-[var(--border)] ${perc == 100 ? 'text-[var(--green)] drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]' : corDestaque}">${percText}</div>
            </div>
        `;
    });
    sidebar.innerHTML = sidebarHTML || '<div class="text-center py-6 text-xs opacity-40 font-bold uppercase tracking-widest text-[var(--text-main)]">Nenhuma franquia nesta aba</div>';

    const grouped = {};
    filteredFranquias.forEach(f => {
        var letter = f.name.charAt(0).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (!/[A-Z]/.test(letter)) letter = '#';
        if (!grouped[letter]) grouped[letter] = [];
        grouped[letter].push(f);
    });

    const sortedLetters = Object.keys(grouped).sort();

    if (sortedLetters.length === 0) {
        grid.innerHTML = '<div class="w-full text-center py-20 opacity-40 font-black uppercase text-sm text-[var(--text-main)] tracking-widest absolute left-0 right-0 mt-10">Nenhuma franquia foi criada nesta categoria. Use o botão "+ Nova Franquia".</div>';
        return;
    }

    var gridHTML = '';
    sortedLetters.forEach(letter => {
        const corHeader = currentFranquiasMode === 'tv' ? 'text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]' : 'text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]';
        const corAccent = currentFranquiasMode === 'tv' ? 'var(--accent)' : '#3b82f6';

        var colHTML = `
            <div class="flex-shrink-0 w-[300px] sm:w-[350px] lg:w-[400px] flex flex-col gap-6 relative">
                <div class="bg-[var(--sticky-bg)] backdrop-blur-md font-black text-center py-2 text-2xl uppercase tracking-widest sticky top-0 z-20 shadow-[0_5px_15px_var(--shadow-heavy)] border border-[var(--border)] rounded-xl ${corHeader}">
                    ${letter}
                </div>
                <div class="flex flex-col gap-6">
        `;

        grouped[letter].forEach(f => {
            var total = f.games.length;
            var zerados = f.games.filter(g => g.completed).length;
            var perc = total > 0 ? ((zerados / total) * 100).toFixed(0) : 0;
            var percText = perc + '%';
            
            var gamesHTML = f.games.map((g, gIndex) => {
                return `
                <div class="flex items-center gap-3 py-2.5 px-4 border-b border-dashed border-[var(--border)] hover:bg-[var(--white-highlight)] transition-colors group relative">
                    <input type="checkbox" ${g.completed ? 'checked' : ''} onchange="toggleFranquiaObra('${f.id}', ${gIndex})" class="w-4 h-4 game-checkbox cursor-pointer" style="accent-color: ${corAccent};">
                    <span class="text-[11px] font-bold flex-1 truncate transition-colors ${g.completed ? 'text-[var(--text-dim)] line-through' : 'text-[var(--text-main)]'}">${g.name}</span>
                    <button onclick="removerObraFranquia('${f.id}', ${gIndex})" class="text-red-500 opacity-0 group-hover:opacity-100 px-2 font-black text-[10px] hover:text-red-400 transition" title="Remover Obra">✖</button>
                </div>
            `}).join('');

            colHTML += `
                <div id="franq-${f.id}" class="dashboard-block bg-[var(--surface)] border border-[var(--border)] rounded-2xl flex flex-col flex-shrink-0 overflow-hidden relative">
                    <div class="bg-[var(--input)] border-b border-[var(--border)] py-3 px-4 flex justify-between items-center relative shadow-inner">
                        <div class="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[var(--white-highlight)] to-transparent"></div>
                        <span class="font-black uppercase tracking-wide text-[13px] text-[var(--text-main)] truncate pr-4">${f.name}</span>
                        <div class="flex gap-2 flex-shrink-0">
                            <button onclick="promptAddObraFranquia('${f.id}')" class="w-6 h-6 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--green)] hover:bg-[var(--green)] hover:text-white hover:border-[var(--green)] flex items-center justify-center transition font-bold" title="Adicionar Obra">＋</button>
                            <button onclick="deletarFranquia('${f.id}')" class="w-6 h-6 rounded border border-[var(--border)] bg-[var(--surface)] text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 flex items-center justify-center transition text-xs" title="Excluir Franquia">✖</button>
                        </div>
                    </div>
                    
                    <div class="flex flex-col flex-1 bg-[var(--surface)]">
                        ${gamesHTML || '<div class="text-center text-xs py-8 opacity-40 font-bold uppercase tracking-widest text-[var(--text-main)]">Nenhuma obra.</div>'}
                    </div>

                    <div class="p-3 bg-[var(--input)] border-t border-[var(--border)] flex justify-between items-center relative">
                        <span class="text-[9px] font-black uppercase text-[var(--text-dim)] tracking-widest">Progresso: ${zerados}/${total}</span>
                        <span class="text-[11px] font-black ${perc == 100 ? 'text-[var(--green)] drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'text-[' + corAccent + ']'}">${percText}</span>
                        <div class="absolute bottom-0 left-0 w-full h-1 bg-[var(--surface)]">
                            <div class="h-full ${perc == 100 ? 'bg-[var(--green)] shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-[' + corAccent + ']'}" style="width: ${perc}%"></div>
                        </div>
                    </div>
                </div>
            `;
        });
        colHTML += `</div></div>`;
        gridHTML += colHTML;
    });
    grid.innerHTML = gridHTML;
}

async function promptNovaFranquia() {
    var name = prompt("Digite o nome da Franquia/Saga:");
    if (name && name.trim()) {
        franquiasData.push({ 
            id: crypto.randomUUID(), 
            name: name.trim(), 
            games: [],
            mode: currentFranquiasMode 
        });
        await manualSave();
        renderFranquias();
    }
}

async function promptAddObraFranquia(id) {
    var nomes = prompt("Digite os títulos das obras (separe por vírgula para adicionar várias de uma vez):");
    if (nomes && nomes.trim()) {
        var f = franquiasData.find(x => x.id === id);
        var listaNomes = nomes.split(',').map(n => n.trim()).filter(n => n);
        listaNomes.forEach(nome => {
            f.games.push({ name: nome, completed: false });
        });
        await manualSave();
        renderFranquias();
    }
}

async function toggleFranquiaObra(id, gameIndex) {
    var f = franquiasData.find(x => x.id === id);
    f.games[gameIndex].completed = !f.games[gameIndex].completed;
    await manualSave();
    renderFranquias();
}

async function deletarFranquia(id) {
    if (confirm("Tem certeza que deseja EXCLUIR esta franquia inteira?")) {
        franquiasData = franquiasData.filter(x => x.id !== id);
        await manualSave();
        renderFranquias();
    }
}

async function removerObraFranquia(id, gameIndex) {
    if (confirm("Remover esta obra da lista?")) {
        var f = franquiasData.find(x => x.id === id);
        f.games.splice(gameIndex, 1);
        await manualSave();
        renderFranquias();
    }
}

// --- SISTEMA DE LISTAS CUSTOMIZADAS ---
var currentListaId = null;
var currentListasMode = 'tv'; 

function openListas() {
    currentListasMode = currentAppMode; 
    switchListasMode(currentListasMode);
    document.getElementById('listasMainModal').style.display = 'flex';
}

function closeListas() { 
    document.getElementById('listasMainModal').style.display = 'none'; 
}

function switchListasMode(mode) {
    currentListasMode = mode;
    const sliderBg = document.getElementById('sliderBgListas');
    const btnTV = document.getElementById('btnModeListasTV');
    const btnGamer = document.getElementById('btnModeListasGamer');
    const title = document.getElementById('listasMainTitle');
    const header = document.getElementById('listasMainHeader');
    
    if (mode === 'tv') {
        if(sliderBg) {
            sliderBg.style.transform = 'translateX(0)';
            sliderBg.classList.remove('bg-blue-500', 'shadow-[0_0_10px_rgba(59,130,246,0.4)]');
            sliderBg.classList.add('bg-emerald-500', 'shadow-[0_0_10px_rgba(16,185,129,0.4)]');
        }
        if(btnTV) { btnTV.classList.add('text-white'); btnTV.classList.remove('text-[var(--text-dim)]'); }
        if(btnGamer) { btnGamer.classList.add('text-[var(--text-dim)]'); btnGamer.classList.remove('text-white'); }
        if(title) { 
            title.classList.remove('text-blue-500'); title.classList.add('text-emerald-500'); 
            title.innerHTML = '📋 Minhas Listas <span class="text-[10px] text-[var(--text-dim)] tracking-widest mt-0.5">TV TIME</span>'; 
        }
        if(header) { header.classList.remove('border-blue-500/30'); header.classList.add('border-emerald-500/30'); }
    } else {
        if(sliderBg) {
            sliderBg.style.transform = 'translateX(100%)';
            sliderBg.classList.remove('bg-emerald-500', 'shadow-[0_0_10px_rgba(16,185,129,0.4)]');
            sliderBg.classList.add('bg-blue-500', 'shadow-[0_0_10px_rgba(59,130,246,0.4)]');
        }
        if(btnGamer) { btnGamer.classList.add('text-white'); btnGamer.classList.remove('text-[var(--text-dim)]'); }
        if(btnTV) { btnTV.classList.add('text-[var(--text-dim)]'); btnTV.classList.remove('text-white'); }
        if(title) { 
            title.classList.remove('text-emerald-500'); title.classList.add('text-blue-500'); 
            title.innerHTML = '📋 Minhas Listas <span class="text-[10px] text-[var(--text-dim)] tracking-widest mt-0.5">GAMER</span>'; 
        }
        if(header) { header.classList.remove('border-emerald-500/30'); header.classList.add('border-blue-500/30'); }
    }
    renderListasGrid();
}

function renderListasGrid() {
    const grid = document.getElementById('listasGrid');
    
    grid.innerHTML = customListas.map((l, index) => {
        if ((l.mode || 'tv') !== currentListasMode) return '';
        
        const obrasValidas = l.games.filter(gameItem => {
            return typeof gameItem === 'string' ? games.some(g => g.id === gameItem) : true;
        });

        const fallbackCover = l.cover || 'https://via.placeholder.com/150x225?text=Lista';
        const capas = Array(5).fill(fallbackCover);
        
        obrasValidas.slice(0, 5).forEach((obra, idx) => {
            var gData = typeof obra === 'string' ? games.find(g => g.id === obra) : obra;
            if(gData && gData.cover) capas[idx] = gData.cover;
        });
        
        var coversHTML = '';
        const zIndexes = ['z-[50]', 'z-[40]', 'z-[30]', 'z-[20]', 'z-[10]'];
        
        capas.forEach((capaUrl, idx) => {
            const marginClass = idx === 0 ? '' : '-ml-10 sm:-ml-14'; 
            const shadowClass = idx === 0 ? 'shadow-md' : 'shadow-[-8px_0_15px_rgba(0,0,0,0.9)]';
            
            coversHTML += `
                <div class="w-20 h-32 sm:w-28 sm:h-40 relative ${marginClass} ${zIndexes[idx]} ${shadowClass} flex-shrink-0 border border-white/5 bg-[#1a1a1a] transition-transform duration-200 group-hover:-translate-y-1 rounded-sm overflow-hidden">
                    <img src="${capaUrl}" class="w-full h-full object-cover pointer-events-none" onerror="this.src='https://via.placeholder.com/150x225?text=Capa'">
                </div>
            `;
        });

        return `
        <div draggable="true" ondragstart="handleUnifiedDragStart(event, ${index}, 'listaPrincipal')" ondragover="handleUnifiedDragOver(event, 'listaPrincipal')" ondragleave="handleUnifiedDragLeave(event, 'listaPrincipal')" ondrop="handleUnifiedDrop(event, ${index}, 'listaPrincipal')" class="flex flex-col cursor-grab active:cursor-grabbing group transition-all duration-300 p-2 border-2 border-transparent rounded-xl hover:bg-[var(--surface)] hover:shadow-lg" onclick="openListaDetail('${l.id}')">
            
            <div class="flex items-center justify-start w-full pointer-events-none">
                ${coversHTML}
            </div>
            
            <div class="mt-3 flex flex-col justify-start items-start w-full px-1">
                <h3 class="text-[16px] sm:text-[18px] font-bold text-[var(--text-main)] truncate w-full tracking-tight" title="${l.title}">
                    ${l.title}
                </h3>
                
                <div class="flex items-center gap-3 mt-1">
                    <span class="text-[12px] text-[var(--text-dim)] font-medium">
                        ${obrasValidas.length} obras
                    </span>
                    
                    <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button onclick="event.stopPropagation(); openListaForm('${l.id}')" class="text-[var(--text-dim)] hover:text-[var(--text-main)] transition text-[13px]" title="Editar Lista">✏️</button>
                        <button onclick="event.stopPropagation(); deleteLista('${l.id}')" class="text-[var(--text-dim)] hover:text-red-500 transition text-[13px]" title="Excluir Lista">✖</button>
                    </div>
                </div>
            </div>
        </div>
    `}).join('') || '<div class="col-span-full text-center py-12 text-gray-500 font-bold uppercase tracking-widest text-xs">Nenhuma lista criada nesta categoria.</div>';
}

function openListaForm(id = null) {
    document.getElementById('editListaId').value = id || '';
    const modalTitle = document.getElementById('listaFormTitle');
    const cor = currentListasMode === 'tv' ? 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]';
    modalTitle.className = `text-xl font-black mb-6 uppercase tracking-wider ${cor}`;

    if (id) {
        const list = customListas.find(l => l.id === id);
        document.getElementById('listaName').value = list.title || '';
        document.getElementById('listaCover').value = list.cover || '';
        modalTitle.innerText = "Editar Lista";
    } else {
        document.getElementById('listaName').value = '';
        document.getElementById('listaCover').value = '';
        modalTitle.innerText = "Nova Lista";
    }
    document.getElementById('listaFormModal').style.display = 'flex';
}

function closeListaForm() {
    document.getElementById('listaFormModal').style.display = 'none';
}

async function saveLista() {
    const id = document.getElementById('editListaId').value;
    const title = document.getElementById('listaName').value.trim();
    const cover = document.getElementById('listaCover').value.trim();

    if (!title) { alert("O título da lista é obrigatório!"); return; }

    if (id) {
        const list = customListas.find(l => l.id === id);
        if (list) {
            list.title = title;
            list.cover = cover;
        }
    } else {
        customListas.push({
            id: crypto.randomUUID(),
            title: title,
            cover: cover,
            games: [],
            mode: currentListasMode 
        });
    }

    await manualSave();
    closeListaForm();
    renderListasGrid();
}

async function deleteLista(id) {
    if (confirm("Tem certeza que deseja excluir esta lista?")) {
        customListas = customListas.filter(l => l.id !== id);
        await manualSave();
        renderListasGrid();
    }
}

function openListaDetail(id) {
    currentListaId = id;
    const list = customListas.find(l => l.id === id);
    if (!list) return;

    document.getElementById('listaDetailTitle').innerText = list.title;
    document.getElementById('listaDetailCover').src = list.cover || 'https://via.placeholder.com/150x100?text=Lista';
    
    document.getElementById('listasMainModal').style.display = 'none';
    document.getElementById('listaDetailModal').style.display = 'flex';
    
    renderListaGamesGrid();
}

function closeListaDetail() {
    currentListaId = null;
    document.getElementById('listaDetailModal').style.display = 'none';
    document.getElementById('listasMainModal').style.display = 'flex';
    renderListasGrid(); 
}

function renderListaGamesGrid() {
    const list = customListas.find(l => l.id === currentListaId);
    if (!list) return;

    const validGames = list.games.filter(item => {
        if (typeof item === 'string') return games.some(g => g.id === item);
        return true; 
    });

    document.getElementById('listaDetailCount').innerText = validGames.length;

    const grid = document.getElementById('listaGamesGrid');
    
    grid.innerHTML = validGames.map((item, index) => {
        var g = typeof item === 'string' ? games.find(x => x.id === item) : item;
        
        return `
        <div draggable="true" ondragstart="handleUnifiedDragStart(event, ${index}, 'listaDetail')" ondragover="handleUnifiedDragOver(event, 'listaDetail')" ondragleave="handleUnifiedDragLeave(event, 'listaDetail')" ondrop="handleUnifiedDrop(event, ${index}, 'listaDetail')" class="poster-card-sm group cursor-grab active:cursor-grabbing border-2 border-transparent hover:border-emerald-500 relative transition-transform">
            <button onclick="event.stopPropagation(); removeGameFromLista(${index})" class="absolute top-1 right-1 w-6 h-6 bg-[var(--surface)] text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition z-50 border border-red-500/50 hover:bg-red-500 hover:text-white">✖</button>
            <img src="${g.cover}" class="blur-bg pointer-events-none" aria-hidden="true" loading="lazy">
            <img src="${g.cover}" class="main-cover pointer-events-none" onerror="this.src='https://via.placeholder.com/150x225?text=Capa'" loading="lazy">
            ${typeof item !== 'string' ? `<div class="absolute bottom-0 left-0 w-full bg-black/80 text-white text-[9px] font-black uppercase text-center py-1.5 z-20 truncate backdrop-blur-sm border-t border-[var(--border)]">${g.name}</div>` : ''}
        </div>
        `;
    }).join('') || '<div class="col-span-full text-center py-12 text-gray-500 font-bold uppercase tracking-widest text-xs">Nenhuma obra nesta lista.</div>';
}

async function removeGameFromLista(index) { 
    const list = customListas.find(l => l.id === currentListaId); 
    list.games.splice(index, 1); 
    await manualSave(); 
    renderListaGamesGrid(); 
}

function openListaPicker() { 
    document.getElementById('pickerSearchInput').value = ''; 
    document.getElementById('listaPickerModal').style.display = 'flex'; 
    renderListaPicker(); 
}

function closeListaPicker() { 
    document.getElementById('listaPickerModal').style.display = 'none'; 
}

async function toggleGameInLista(gameId, element) {
    const list = customListas.find(l => l.id === currentListaId);
    const existingIndex = list.games.findIndex(item => item === gameId || (item.id === gameId));
    
    if (existingIndex !== -1) { 
        // Se a obra já está na lista: Remove dos dados e tira o estilo visual
        list.games.splice(existingIndex, 1); 
        
        element.classList.remove('border-emerald-500', 'scale-95', 'opacity-100');
        element.classList.add('border-transparent', 'opacity-60', 'hover:opacity-100');
        
        const checkmark = element.querySelector('.selection-check');
        if (checkmark) checkmark.remove();
        
    } else { 
        // Se a obra NÃO está na lista: Adiciona nos dados e coloca o estilo visual
        list.games.push(gameId); 
        
        element.classList.remove('border-transparent', 'opacity-60', 'hover:opacity-100');
        element.classList.add('border-emerald-500', 'scale-95', 'opacity-100');
        element.insertAdjacentHTML('beforeend', `<div class="selection-check absolute inset-0 bg-emerald-500/20 flex items-center justify-center pointer-events-none"><div class="bg-emerald-500 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg font-bold">✓</div></div>`);
    }
    
    await manualSave(); 
    // Atualiza a lista por trás, mas NÃO recarrega o modal de escolha, eliminando o travamento
    renderListaGamesGrid(); 
}

function renderListaPicker() {
    const query = (document.getElementById('pickerSearchInput').value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const list = customListas.find(l => l.id === currentListaId);
    const grid = document.getElementById('listaPickerGrid');
    
    // OTIMIZAÇÃO: Cria a lista de consulta rápida
    const selectedSet = new Set(list.games.map(item => typeof item === 'string' ? item : item.id));
    
    const filtered = games.filter(g => {
        const isTargetMode = currentListasMode === 'tv' ? g.type !== 'Jogo' : g.type === 'Jogo';
        
        // NOVA REGRA: Se a busca estiver vazia, filtra apenas as obras que JÁ ESTÃO selecionadas
        if (query === "") {
            return isTargetMode && selectedSet.has(g.id);
        }
        
        // Se houver texto na busca, procura normalmente
        const matchesQuery = (g.name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(query);
        return isTargetMode && matchesQuery;
        
    }).sort((a,b) => a.name.localeCompare(b.name));

    // Mensagem amigável quando abrir a janela e a lista ainda não tiver obras
    if (query === "" && filtered.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-12 opacity-50 font-bold uppercase tracking-widest text-xs">Digite o nome da obra para buscar...</div>';
        return;
    }

    grid.innerHTML = filtered.map(g => {
        const isSelected = selectedSet.has(g.id);
        
        return `
        <div onclick="toggleGameInLista('${g.id}', this)" class="poster-card-sm !w-full !h-auto aspect-[2/3] cursor-pointer border-4 transition-all relative ${isSelected ? 'border-emerald-500 scale-95 opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}">
            <img src="${g.cover}" loading="lazy" class="main-cover pointer-events-none" onerror="this.src='https://via.placeholder.com/150x225?text=Capa'">
            ${isSelected ? `<div class="selection-check absolute inset-0 bg-emerald-500/20 flex items-center justify-center pointer-events-none z-10"><div class="bg-emerald-500 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg font-bold">✓</div></div>` : ''}
        </div>
        `;
    }).join('');
}

function openExternalGameForm() { 
    document.getElementById('extGameName').value = ''; 
    document.getElementById('extGameCover').value = ''; 
    document.getElementById('externalGameModal').style.display = 'flex'; 
}

function closeExternalGameForm() { 
    document.getElementById('externalGameModal').style.display = 'none'; 
}

async function saveExternalGame() {
    const name = document.getElementById('extGameName').value.trim();
    const coverInput = document.getElementById('extGameCover').value.trim();
    if(!name || !coverInput) return alert("Preencha o nome e a URL da capa!");
    const coverBase64 = await urlToBase64(coverInput);
    const list = customListas.find(l => l.id === currentListaId);
    list.games.push({ id: crypto.randomUUID(), isExternal: true, name: name, cover: coverBase64 });
    await manualSave(); closeExternalGameForm(); renderListaGamesGrid();
}

// --- SISTEMA TOP 100 LISTS UNIFICADO ---
const top100Config = {
    'death': { 
        title: '✋😮🤚 100 Obras + Absolute Cinema', 
        colors: {
            header: 'border-emerald-500/30', title: 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]',
            btnImport: 'bg-emerald-600', btnClose: 'border-emerald-500/50 text-emerald-500 hover:bg-emerald-500 hover:border-emerald-500 hover:text-white',
            hoverCard: 'hover:border-emerald-500/50 hover:shadow-[0_10px_20px_rgba(16,185,129,0.2)]',
            focusInput: 'focus:border-emerald-500', dragBorder: '!border-emerald-500'
        },
        data: () => deathListData, key: 'cineDeathList_v70' 
    },
    'series': { 
        title: '📺 100 Séries', 
        colors: {
            header: 'border-purple-500/30', title: 'text-purple-500 drop-shadow-[0_0_8px_rgba(168,85,247,0.3)]',
            btnImport: 'bg-purple-600', btnClose: 'border-purple-500/50 text-purple-500 hover:bg-purple-500 hover:border-purple-500 hover:text-white',
            hoverCard: 'hover:border-purple-500/50 hover:shadow-[0_10px_20px_rgba(168,85,247,0.2)]',
            focusInput: 'focus:border-purple-500', dragBorder: '!border-purple-500'
        },
        data: () => seriesListData, key: 'cineSeriesList_v70' 
    },
    'malucos': { 
        title: '🤪 100 Filmes Malucos', 
        colors: {
            header: 'border-lime-500/30', title: 'text-lime-500 drop-shadow-[0_0_8px_rgba(132,204,22,0.3)]',
            btnImport: 'bg-lime-600', btnClose: 'border-lime-500/50 text-lime-500 hover:bg-lime-500 hover:border-lime-500 hover:text-white',
            hoverCard: 'hover:border-lime-500/50 hover:shadow-[0_10px_20px_rgba(132,204,22,0.2)]',
            focusInput: 'focus:border-lime-500', dragBorder: '!border-lime-500'
        },
        data: () => malucosListData, key: 'cineMalucosList_v70' 
    },
    'jogos': { 
        title: '🎮 100 Jogos Históricos',
        colors: {
            header: 'border-blue-500/30', title: 'text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]',
            btnImport: 'bg-blue-600', btnClose: 'border-blue-500/50 text-blue-500 hover:bg-blue-500 hover:border-blue-500 hover:text-white',
            hoverCard: 'hover:border-blue-500/50 hover:shadow-[0_10px_20px_rgba(59,130,246,0.2)]',
            focusInput: 'focus:border-blue-500', dragBorder: '!border-blue-500'
        },
        data: () => jogos100ListData, key: 'cineJogos100List_v70' 
    }
};

var currentTop100Type = null;
var targetListRef = null;

function openTop100List(type) {
    currentTop100Type = type;
    const config = top100Config[type];
    
    document.getElementById('top100Header').className = `flex justify-between items-center mb-8 sticky top-0 sticky-header-bg p-4 px-6 rounded-2xl z-[210] shadow-[0_10px_30px_var(--shadow-heavy)] border border-transparent transition-colors ${config.colors.header}`;
    document.getElementById('top100Title').className = `text-xl font-black uppercase tracking-widest transition-colors ${config.colors.title}`;
    document.getElementById('top100Title').innerText = config.title;
    
    document.getElementById('top100BtnImport').className = `btn btn-primary transition-colors ${config.colors.btnImport}`;
    document.getElementById('top100BtnImport').onclick = () => openQuickPicker(type);
    
    document.getElementById('top100BtnClose').className = `btn btn-outline transition-colors ${config.colors.btnClose}`;
    
    renderTop100List();
    document.getElementById('top100Modal').style.display = 'flex';
}

function closeTop100List() { 
    document.getElementById('top100Modal').style.display = 'none'; 
    currentTop100Type = null; 
}

function renderTop100List() {
    const config = top100Config[currentTop100Type];
    const grid = document.getElementById('top100Grid');
    
    grid.innerHTML = config.data().map((data, i) => `
        <div draggable="true" ondragstart="handleUnifiedDragStart(event, ${i}, 'top100')" ondragover="handleUnifiedDragOver(event, 'top100')" ondragleave="handleUnifiedDragLeave(event, 'top100')" ondrop="handleUnifiedDrop(event, ${i}, 'top100')" class="card-inner p-3 group border border-[var(--border)] cursor-grab active:cursor-grabbing transition-transform ${config.colors.hoverCard}">
            <div class="poster-container rounded overflow-hidden cursor-pointer border border-[var(--border)] bg-[var(--input)] relative" onclick="setTop100Cover(${i})">
                <img src="${data.cover}" class="blur-bg ${!data.cover ? 'hidden' : ''}" loading="lazy" aria-hidden="true">
                <img src="${data.cover}" class="main-cover ${!data.cover ? 'hidden' : ''} ${!data.name ? 'opacity-10 grayscale' : ''}" loading="lazy">
                <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-[var(--surface)]/80 backdrop-blur-sm transition text-[10px] font-bold text-[var(--text-main)] uppercase tracking-widest z-20">Mudar Capa</div>
                ${!data.cover ? '<div class="flex items-center justify-center h-full text-3xl opacity-10 font-light z-10 relative">+</div>' : ''}
            </div>
            <div class="mt-3">
                <input type="text" value="${data.name || ''}" placeholder="TÍTULO..." onchange="setTop100Name(${i}, this.value)" class="w-full bg-transparent border-b border-[var(--border)] text-center font-bold text-[10px] text-[var(--text-main)] uppercase pb-1 outline-none transition cursor-text ${config.colors.focusInput}">
            </div>
            <div class="flex justify-center mt-2">
                <select onchange="setTop100Rating(${i}, this.value)" class="modern-input !text-[9px] !py-1 !px-2 !bg-[var(--surfaceHover)] text-center font-black cursor-pointer shadow-inner" style="color: var(--star-filled);">
                    <option value="0" ${data.rating == 0 ? 'selected' : ''}>Sem Nota</option>
                    ${[1,2,3,4,5,6,7,8,9,10].map(n => `<option value="${n}" ${data.rating == n ? 'selected' : ''}>★ ${n}/10</option>`).join('')}
                </select>
            </div>
        </div>
    `).join('');
}

async function setTop100Name(index, name) { 
    const config = top100Config[currentTop100Type];
    config.data()[index].name = name.trim().toUpperCase(); 
    await localforage.setItem(config.key, config.data()); 
    renderTop100List(); 
}

async function setTop100Cover(index) { 
    const url = prompt("Cole a URL da Capa:"); 
    if(url !== null) { 
        const config = top100Config[currentTop100Type];
        config.data()[index].cover = url.trim(); 
        await localforage.setItem(config.key, config.data()); 
        renderTop100List(); 
    } 
}

async function setTop100Rating(index, rating) { 
    const config = top100Config[currentTop100Type];
    config.data()[index].rating = rating; 
    await localforage.setItem(config.key, config.data()); 
    renderTop100List(); 
}

// Quick Picker para as Listas Top 100
function openQuickPicker(listType) {
    targetListRef = listType;
    document.getElementById('quickPickerModal').style.display = 'flex';
    document.getElementById('quickPickerSearch').value = '';
    renderQuickPicker();
}

function renderQuickPicker() {
    const query = document.getElementById('quickPickerSearch').value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const grid = document.getElementById('quickPickerGrid');
    
    // Filtra pelo tipo que a lista atual suporta
    const validGames = games.filter(g => {
        const isGameMode = targetListRef === 'jogos';
        const isGameType = g.type === 'Jogo';
        const matchesQuery = g.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(query);
        return (isGameMode ? isGameType : !isGameType) && matchesQuery;
    });

    grid.innerHTML = validGames.map(g => `
        <div onclick="addToList('${g.name}', '${g.cover}')" class="poster-card-sm !w-full !h-auto aspect-[2/3] cursor-pointer hover:scale-105 transition-transform border border-[var(--border)]">
            <img src="${g.cover}" class="main-cover" onerror="this.src='https://via.placeholder.com/150x225?text=Capa'">
        </div>
    `).join('');
}

async function addToList(name, cover) {
    const config = top100Config[targetListRef];
    var list = config.data();
    
    var emptyIndex = list.findIndex(item => (!item.name || item.name === '') && (!item.cover || item.cover === ''));
    
    if (emptyIndex !== -1) {
        list[emptyIndex] = { cover: cover, name: name, rating: 0 };
        await localforage.setItem(config.key, list);
        alert(`${name} adicionado à lista!`);
        document.getElementById('quickPickerModal').style.display = 'none';
        
        // Se a lista estiver aberta por trás, atualiza a view
        if(currentTop100Type === targetListRef) {
            renderTop100List();
        }
    } else {
        alert("Lista cheia! Não há mais slots completamente vazios (sem capa e sem nome).");
    }
}
// =========================================================================
// PARTE 7: ESTATÍSTICAS UNIFICADAS 1 (TOP 10, RETROSPECTIVA E TIMELINE)
// =========================================================================

// --- CONTROLE GLOBAL DE ESTATÍSTICAS (FILMES / ANIMES / JOGOS) ---
var statsMediaType = 'filmes';

function setStatsMode(mode, targetModal) {
    statsMediaType = mode;
    
    document.querySelectorAll('.stats-toggle-filmes').forEach(btn => {
        btn.className = mode === 'filmes' 
            ? 'stats-toggle-filmes btn btn-primary text-[9px] px-3 py-1' 
            : 'stats-toggle-filmes btn btn-outline text-[9px] px-3 py-1 text-[var(--text-dim)] border-transparent hover:border-[var(--border)]';
    });
    
    document.querySelectorAll('.stats-toggle-animes').forEach(btn => {
        btn.className = mode === 'animes' 
            ? 'stats-toggle-animes btn btn-primary text-[9px] px-3 py-1' 
            : 'stats-toggle-animes btn btn-outline text-[9px] px-3 py-1 text-[var(--text-dim)] border-transparent hover:border-[var(--border)]';
    });

    document.querySelectorAll('.stats-toggle-jogos').forEach(btn => {
        btn.className = mode === 'jogos' 
            ? 'stats-toggle-jogos btn btn-primary text-[9px] px-3 py-1 bg-blue-600 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' 
            : 'stats-toggle-jogos btn btn-outline text-[9px] px-3 py-1 text-[var(--text-dim)] border-transparent hover:border-[var(--border)]';
    });

    if (targetModal === 'top10') openTop10();
    if (targetModal === 'retro') renderRetrospectiva(document.getElementById('retroYearSelect').value);
    if (targetModal === 'timeline') renderTimeline(document.getElementById('timelineYearSelect').value);
    if (targetModal === 'badges' && typeof renderBadges === 'function') renderBadges();
    if (targetModal === 'notas' && typeof openNotas === 'function') openNotas();
}

function getFilteredGamesForStats() {
    return games.filter(g => {
        const t = (g.type || 'Filme').toLowerCase();
        if (statsMediaType === 'filmes') {
            return ['filme', 'série'].includes(t);
        } else if (statsMediaType === 'animes') {
            return ['anime', 'desenho', 'filme ova'].includes(t);
        } else {
            return ['jogo'].includes(t);
        }
    });
}

// --- TOP 10 MAIS ASSISTIDOS (TV TIME) ---
function openTop10() {
    const modal = document.getElementById('top10Modal');
    const grid = document.getElementById('top10Grid');
    
    // Se a pessoa abrir o Mais Assistidos, garante que não está buscando jogos
    if (statsMediaType === 'jogos') setStatsMode('filmes', null);
    
    const listToRank = getFilteredGamesForStats();
    
    const topGames = [...listToRank]
        .sort((a, b) => calculateItemTotalMinutes(b) - calculateItemTotalMinutes(a))
        .slice(0, 20); 
    
    grid.innerHTML = topGames.map((g, i) => `
        <div class="card-inner overflow-hidden border border-[var(--accent)]/30 hover:shadow-[0_10px_20px_rgba(225,29,72,0.3)] relative">
            <div class="absolute top-2 left-2 bg-[var(--accent)] text-white font-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center z-30 shadow-md">${i+1}</div>
            <div class="poster-container" onclick="document.getElementById('game-${g.id}').scrollIntoView({behavior:'smooth',block:'center'}); closeTop10();" style="cursor:pointer;">
                <img src="${g.cover}" class="blur-bg" loading="lazy" aria-hidden="true">
                <img src="${g.cover}" class="main-cover" onerror="this.src='https://via.placeholder.com/400x600?text=Capa'" loading="lazy">
            </div>
            <div class="p-2 bg-[var(--surface)] text-center border-t border-[var(--border)] relative">
                <div class="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[var(--accent)]/50 to-transparent"></div>
                <h4 class="text-[9px] font-black uppercase truncate text-center w-full text-[var(--text-main)] mb-1">${g.name}</h4>
                <span class="text-[var(--accent)] font-bold text-[10px] block drop-shadow-[0_0_5px_rgba(225,29,72,0.4)]">${formatMinutes(calculateItemTotalMinutes(g))}</span>
                <span class="text-[7px] text-[var(--text-dim)] uppercase type-${(g.type||'filme').toLowerCase().replace(/[ /]/g, '-')}">${g.type || 'Filme'}</span>
            </div>
        </div>
    `).join('') || `<p class="col-span-full text-center py-10 opacity-40">Nenhuma Obra com tempo registrado para exibir!</p>`;
    
    modal.style.display = 'flex';
}

function closeTop10() { 
    document.getElementById('top10Modal').style.display = 'none'; 
}

// --- TOP 10 MAIS JOGADOS (GAMER) EXCLUSIVO ---
function openTop10Gamer() {
    const modal = document.getElementById('top10GamerModal');
    const grid = document.getElementById('top10GamerGrid');
    
    // Pega apenas jogos independentemente da variável statsMediaType
    const listToRank = games.filter(g => g.type === 'Jogo');
    
    const topGames = [...listToRank]
        .sort((a, b) => calculateItemTotalMinutes(b) - calculateItemTotalMinutes(a))
        .slice(0, 20); 
    
    grid.innerHTML = topGames.map((g, i) => `
        <div class="card-inner overflow-hidden border border-blue-500/30 hover:shadow-[0_10px_20px_rgba(59,130,246,0.3)] relative">
            <div class="absolute top-2 left-2 bg-blue-500 text-white font-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center z-30 shadow-md">${i+1}</div>
            <div class="poster-container" onclick="document.getElementById('game-${g.id}').scrollIntoView({behavior:'smooth',block:'center'}); closeTop10Gamer();" style="cursor:pointer;">
                <img src="${g.cover}" class="blur-bg" loading="lazy" aria-hidden="true">
                <img src="${g.cover}" class="main-cover" onerror="this.src='https://via.placeholder.com/400x600?text=Capa'" loading="lazy">
            </div>
            <div class="p-2 bg-[var(--surface)] text-center border-t border-[var(--border)] relative">
                <div class="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
                <h4 class="text-[9px] font-black uppercase truncate text-center w-full text-[var(--text-main)] mb-1">${g.name}</h4>
                <span class="text-blue-500 font-bold text-[10px] block drop-shadow-[0_0_5px_rgba(59,130,246,0.4)]">${formatMinutes(calculateItemTotalMinutes(g))}</span>
                <span class="text-[7px] text-[var(--text-dim)] uppercase type-jogo">Jogo</span>
            </div>
        </div>
    `).join('') || `<p class="col-span-full text-center py-10 opacity-40">Nenhum Jogo com tempo registrado para exibir!</p>`;
    
    modal.style.display = 'flex';
}

function closeTop10Gamer() {
    document.getElementById('top10GamerModal').style.display = 'none';
}

// --- RECUPERAR A ORDEM SALVA NA RETROSPECTIVA ---
function applyRetroLayoutOrder() {
    const grid = document.getElementById('retroCardsGrid');
    if (!grid) return;
    const savedOrder = localStorage.getItem('ct_retro_layout_order_v70');
    if (savedOrder) {
        const orderArray = JSON.parse(savedOrder);
        orderArray.forEach(cardId => {
            const card = grid.querySelector(`[data-card-id="${cardId}"]`);
            if (card) {
                // Ao adicionar algo de volta na mesma DIV pai, ele move pra última posição (reorganizando do jeito que queríamos)
                grid.appendChild(card);
            }
        });
        
        // Recalcular índices após restauração (para o motor unificado de drop não se perder nas posições físicas)
        Array.from(grid.children).forEach((child, idx) => {
            child.setAttribute('ondragstart', `handleUnifiedDragStart(event, ${idx}, 'retro')`);
            child.setAttribute('ondrop', `handleUnifiedDrop(event, ${idx}, 'retro')`);
        });
    }
}

// --- RETROSPECTIVA ANUAL ---
function openRetrospectiva() {
    const yearsPlayed = [...new Set(games.flatMap(g => [g.startDate?.split('-')[0]].filter(Boolean)))].sort((a,b) => b-a);
    const select = document.getElementById('retroYearSelect');
    if (yearsPlayed.length === 0) return alert("Nenhuma obra registrada com data de início para gerar a retrospectiva!");
    
    select.innerHTML = '<option value="all">Todos os Anos</option>' + yearsPlayed.map(y => `<option value="${y}">${y}</option>`).join('');
    select.value = 'all';
    
    // ATENÇÃO: Chama a reordenação das caixas antes de injetar os dados visualmente!
    applyRetroLayoutOrder();
    
    renderRetrospectiva('all');
    document.getElementById('retrospectivaModal').style.display = 'flex';
}

function closeRetrospectiva() { 
    document.getElementById('retrospectivaModal').style.display = 'none'; 
}

function renderRetrospectiva(ano) {
    if (!ano) return;
    document.getElementById('retroYearLabel').innerText = ano === 'all' ? 'TODOS OS ANOS' : ano;
    
    // Identifica se estamos rodando a retrospectiva em modo Gamer
    const isGamer = statsMediaType === 'jogos';
    
    // Filtro unificado (Omitimos títulos em Backlog/Watchlist e validamos o ano)
    const jogosAno = getFilteredGamesForStats().filter(g => {
        if (!g.startDate) return false;
        if ((g.status || 'watchlist').toLowerCase() === 'watchlist') return false; 
        if (ano === 'all') return true;
        return g.startDate.startsWith(ano);
    });

    // 1. ATUALIZAÇÃO DINÂMICA DE RÓTULOS (TEXTOS)
    const setElemText = (id, text) => { const el = document.getElementById(id); if (el) el.innerText = text; };
    
    setElemText('retroLabelObras', isGamer ? 'Você Jogou' : 'Você Assistiu');
    setElemText('retroLabelTempo', isGamer ? 'Tempo Jogando' : 'Tempo na Tela');
    setElemText('retroLabelPlat', isGamer ? 'do tempo na Plataforma' : 'do tempo assistindo');
    setElemText('retroLabelZerados', isGamer ? 'Zerados' : 'Finalizados');
    setElemText('retroLabelTopList', isGamer ? 'Games + Jogados' : 'Obras + Longas');
    setElemText('retroLabelTopGenre', isGamer ? 'Gêneros + Jogados' : 'Gênero + Assistido');
    setElemText('retroLabelMps', isGamer ? 'Mês + Jogado' : 'Mês + Assistido');
    setElemText('retroLabelMms', isGamer ? 'Mês - Jogado' : 'Mês - Assistido');
    setElemText('retroDistTitle', isGamer ? '% Eras' : '% Formatos');
    setElemText('retroLabelDecades', isGamer ? 'Plataformas + Jogadas' : 'Décadas + Vistas');
    setElemText('retroLabelWatchlist', isGamer ? 'Backlog' : 'Watchlist');

    // 2. ATUALIZAÇÃO DE CORES (AZUL PARA GAMER, ACCENT PARA TV TIME)
    const hlColor = isGamer ? 'text-blue-500' : 'text-[var(--accent)]';
    const bgGlow = isGamer ? 'drop-shadow-[0_0_10px_rgba(59,130,246,0.4)]' : 'drop-shadow-[0_0_10px_var(--accent-glow)]';
    const bgBadge = isGamer ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]' : 'bg-[var(--accent)] shadow-[0_0_10px_var(--accent-glow)]';
    const textBadge = isGamer ? 'text-blue-500 drop-shadow-[0_0_5px_rgba(59,130,246,0.6)]' : 'text-[var(--accent)] drop-shadow-[0_0_5px_var(--accent-glow)]';

    // Obras / Games Totais
    const totGamesEl = document.getElementById('retroTotalGames');
    totGamesEl.innerText = `${jogosAno.length} ${isGamer ? 'Games' : 'Obras'}`;
    totGamesEl.className = `text-4xl font-black ${hlColor} ${bgGlow}`;

    // Tempo de Tela Total
    var totalMinsAno = 0;
    jogosAno.forEach(g => { totalMinsAno += calculateItemTotalMinutes(g); });
    const tH = Math.floor(totalMinsAno / 60); const tM = totalMinsAno % 60;
    
    const totTimeEl = document.getElementById('retroTotalTime');
    totTimeEl.innerText = `${tH}:${tM.toString().padStart(2, '0')}:00`;
    totTimeEl.className = `text-4xl font-black ${hlColor} ${bgGlow}`;

    // Plataforma vs Tipo (Usa gamePlatform no modo gamer, e type no modo TV)
    const typeMap = {};
    jogosAno.forEach(g => {
        const t = isGamer ? (g.gamePlatform || 'Outros') : (g.type || 'Filme');
        typeMap[t] = (typeMap[t] || 0) + calculateItemTotalMinutes(g);
    });
    const sortedTypes = Object.entries(typeMap).sort((a,b) => b[1] - a[1]);
    const topType = sortedTypes.length > 0 ? sortedTypes[0] : null;
    
    const platPercEl = document.getElementById('retroPlatPercent');
    if (topType && totalMinsAno > 0) {
        const perc = ((topType[1] / totalMinsAno) * 100).toFixed(2);
        platPercEl.innerText = `${perc.replace('.', ',')}%`;
        document.getElementById('retroTopPlatName').innerText = topType[0];
    } else {
        platPercEl.innerText = `0%`;
        document.getElementById('retroTopPlatName').innerText = `---`;
    }
    platPercEl.className = `text-4xl font-black ${hlColor} ${bgGlow}`;

    // Contagem de Obras Finalizadas (SCENIX TIME sempre salva 'visto', mas para o front exibiremos dinamicamente)
    document.getElementById('retroZerados').innerText = jogosAno.filter(g => (g.status||'').toLowerCase() === 'visto').length;
    
    // Tratamento de DLCs Exclusivo Gamer
    const dlcContainer = document.getElementById('retroDlcContainer');
    if (dlcContainer) {
        if (isGamer) {
            dlcContainer.classList.remove('hidden');
            document.getElementById('retroTotalDlcZeradas').innerText = jogosAno.filter(g => (g.status||'').toLowerCase() === 'visto' && (g.name || '').toUpperCase().startsWith('DLC')).length;
        } else {
            dlcContainer.classList.add('hidden');
        }
    }

    // Top 5 Obras Mais Longas/Jogadas
    const sortedGames = [...jogosAno].sort((a,b) => calculateItemTotalMinutes(b) - calculateItemTotalMinutes(a));
    document.getElementById('retroTopGamesList').innerHTML = sortedGames.slice(0, 5).map((g, i) => {
        const mins = calculateItemTotalMinutes(g);
        const hrs = `${Math.floor(mins/60)}:${(mins%60).toString().padStart(2, '0')}:00`;
        return `
            <div class="flex justify-between items-center border-b border-[var(--border)] pb-2 last:border-0 last:pb-0">
                <div class="flex items-center gap-2 overflow-hidden">
                    <span class="text-[10px] font-black text-[var(--text-dim)]">${i+1}º</span>
                    <span class="text-[11px] font-black uppercase truncate ${i===0 ? hlColor + ' text-sm' : 'text-[var(--text-main)]'}">${g.name}</span>
                </div>
                <span class="text-[10px] font-bold text-[var(--text-dim)] ml-2 whitespace-nowrap">${hrs}</span>
            </div>
        `;
    }).join('') || '<p class="text-xs text-center opacity-50">Sem dados suficientes</p>';

    // Distribuição de Gêneros e Tipos
    const genMap = {};
    const tipoMap = {};
    jogosAno.forEach(g => {
        if(!g.genre) return;
        const parts = g.genre.split(/[,/|-]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
        const t = calculateItemTotalMinutes(g);
        if (parts.length > 0) {
            genMap[parts[0]] = (genMap[parts[0]] || 0) + t; // Captura o Gênero Primário
            for (let i = 1; i < parts.length; i++) {
                tipoMap[parts[i]] = (tipoMap[parts[i]] || 0) + t; // Subgêneros (Para o modo gamer)
            }
        }
    });
    
    const renderGenresHTML = (arr) => arr.map((gen, i) => {
        const perc = totalMinsAno > 0 ? ((gen[1] / totalMinsAno) * 100).toFixed(2) : 0;
        return `
            <div class="flex items-center justify-between border-b border-[var(--border)] py-2 last:border-0 last:pb-0">
                <div class="flex items-center gap-2 flex-1 min-w-0 pr-2">
                    <div class="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded ${bgBadge} text-[#FFFFFF] text-[10px] font-black">${i+1}º</div>
                    <span class="font-black uppercase truncate flex-1 min-w-0 ${i===0 ? 'text-[var(--text-main)] text-[12px]' : 'text-[var(--text-dim)] text-[11px]'}">${gen[0]}</span>
                </div>
                <div class="text-right flex flex-col justify-center flex-shrink-0">
                    <span class="text-[8px] font-bold text-[var(--text-dim)] mb-0.5">${Math.floor(gen[1]/60)}:${(gen[1]%60).toString().padStart(2, '0')}:00</span>
                    <span class="text-[13px] font-black ${textBadge}">${perc.toString().replace('.', ',')}%</span>
                </div>
            </div>
        `;
    }).join('') || '<p class="text-xs text-center opacity-50 mt-4">Sem dados</p>';

    document.getElementById('retroTopGenresList').innerHTML = renderGenresHTML(Object.entries(genMap).sort((a,b) => b[1] - a[1]).slice(0, 3));
    
    // Card Extra: Tipos / Subgêneros (Exclusivo Modo Gamer)
    const tiposContainer = document.getElementById('retroTopTiposContainer');
    if (tiposContainer) {
        if (isGamer) {
            tiposContainer.classList.remove('hidden');
            tiposContainer.classList.add('flex');
            document.getElementById('retroTopTiposList').innerHTML = renderGenresHTML(Object.entries(tipoMap).sort((a,b) => b[1] - a[1]).slice(0, 3));
        } else {
            tiposContainer.classList.add('hidden');
            tiposContainer.classList.remove('flex');
        }
    }

    // Mês Positivo e Negativo
    const monthNames = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
    const monthMap = {};
    jogosAno.forEach(g => {
        const mIndex = parseInt(g.startDate.split('-')[1]) - 1;
        if(mIndex >= 0 && mIndex <= 11) monthMap[mIndex] = (monthMap[mIndex] || 0) + calculateItemTotalMinutes(g);
    });
    const sortedMonths = Object.entries(monthMap).sort((a,b) => b[1] - a[1]);
    const topMonthEl = document.getElementById('retroTopMonth');
    const botMonthEl = document.getElementById('retroBottomMonth');
    
    topMonthEl.className = `text-3xl font-black uppercase mt-1 ${hlColor} ${bgGlow}`;
    botMonthEl.className = `text-xl font-black uppercase mt-1 ${hlColor} ${bgGlow}`;

    if(sortedMonths.length > 0) {
        const topM = sortedMonths[0]; const botM = sortedMonths[sortedMonths.length - 1];
        const topPerc = ((topM[1] / totalMinsAno) * 100).toFixed(2);
        topMonthEl.innerText = monthNames[topM[0]];
        document.getElementById('retroTopMonthStats').innerHTML = `${topPerc.replace('.', ',')}% <br> <span class="text-[var(--text-dim)] font-normal text-[9px]">${Math.floor(topM[1]/60)}:${(topM[1]%60).toString().padStart(2, '0')}:00</span>`;
        const botPerc = ((botM[1] / totalMinsAno) * 100).toFixed(2);
        botMonthEl.innerText = monthNames[botM[0]];
        document.getElementById('retroBottomMonthStats').innerHTML = `${botPerc.replace('.', ',')}% <br> <span class="text-[var(--text-dim)] font-normal text-[9px]">${Math.floor(botM[1]/60)}:${(botM[1]%60).toString().padStart(2, '0')}:00</span>`;
    } else {
        topMonthEl.innerText = '---'; document.getElementById('retroTopMonthStats').innerText = '';
        botMonthEl.innerText = '---'; document.getElementById('retroBottomMonthStats').innerText = '';
    }

    // Lógica Alternável (% Eras para Jogos | % Formatos para Animes/Filmes)
    const elLabel1 = document.getElementById('retroFormatLabel1');
    const elLabel2 = document.getElementById('retroFormatLabel2');
    const elPerc1 = document.getElementById('retroPerc1');
    const elPerc2 = document.getElementById('retroPerc2');
    const row3 = document.getElementById('retroFormatRow3');
    const elLabel3 = document.getElementById('retroFormatLabel3');
    const elPerc3 = document.getElementById('retroPerc3');

    elPerc1.className = `text-sm font-black ${hlColor}`;
    elPerc2.className = `text-sm font-black ${hlColor}`;
    if(elPerc3) elPerc3.className = `text-sm font-black ${hlColor}`;

    if (isGamer) {
        let retro = 0, antigos = 0, atuais = 0;
        jogosAno.forEach(g => {
            const ry = parseInt(g.releaseYear);
            if (!ry) return;
            if (ry <= 2000) retro++;
            else if (ry < 2015) antigos++;
            else atuais++;
        });
        const tEras = retro + antigos + atuais;
        
        if(elLabel1) elLabel1.innerText = 'Retro (Até 2000)';
        if(elLabel2) elLabel2.innerText = 'Antigos (01-14)';
        if(elLabel3) elLabel3.innerText = 'Atuais (2015+)';
        
        if(elPerc1) elPerc1.innerText = tEras > 0 ? `${((retro/tEras)*100).toFixed(2).replace('.', ',')}%` : '0%';
        if(elPerc2) elPerc2.innerText = tEras > 0 ? `${((antigos/tEras)*100).toFixed(2).replace('.', ',')}%` : '0%';
        if(elPerc3) elPerc3.innerText = tEras > 0 ? `${((atuais/tEras)*100).toFixed(2).replace('.', ',')}%` : '0%';
        
        if(row3) { row3.classList.remove('hidden'); row3.classList.add('flex'); }
    } else {
        var tipo1 = 0, tipo2 = 0;
        var label1 = statsMediaType === 'filmes' ? 'Filmes' : 'Animes';
        var label2 = statsMediaType === 'filmes' ? 'Séries' : 'Desenhos/OVAs';

        jogosAno.forEach(g => {
            const t = (g.type || 'Filme').toLowerCase();
            if (statsMediaType === 'filmes') {
                if(['filme'].includes(t)) tipo1++; else if(['série'].includes(t)) tipo2++;
            } else {
                if(['anime'].includes(t)) tipo1++; else if(['desenho', 'filme ova'].includes(t)) tipo2++;
            }
        });

        const tEras = tipo1 + tipo2;
        
        if(elLabel1) elLabel1.innerText = label1;
        if(elLabel2) elLabel2.innerText = label2;
        if(elPerc1) elPerc1.innerText = tEras > 0 ? `${((tipo1/tEras)*100).toFixed(2).replace('.', ',')}%` : '0%';
        if(elPerc2) elPerc2.innerText = tEras > 0 ? `${((tipo2/tEras)*100).toFixed(2).replace('.', ',')}%` : '0%';
        
        if(row3) { row3.classList.remove('flex'); row3.classList.add('hidden'); }
    }

    // Tabela Final (Plataformas Jogadas vs Décadas de Lançamento)
    if (isGamer) {
        const platMap = {};
        jogosAno.forEach(g => {
            const p = g.gamePlatform || 'Outros';
            platMap[p] = (platMap[p] || 0) + calculateItemTotalMinutes(g);
        });
        const sortedPlats = Object.entries(platMap).sort((a,b) => b[1] - a[1]);
        document.getElementById('retroDecadesTable').innerHTML = sortedPlats.slice(0, 5).map(p => {
            const perc = totalMinsAno > 0 ? ((p[1] / totalMinsAno) * 100).toFixed(2) : 0;
            return `
                <div class="flex justify-between items-center border-b border-[var(--border)] py-1 last:border-0">
                    <span class="text-[var(--text-main)] truncate max-w-[100px]">${p[0]}</span>
                    <span>${perc.toString().replace('.', ',')}%</span>
                </div>
            `;
        }).join('') || '<p class="text-center opacity-50">Sem dados</p>';
    } else {
        const decMap = {};
        jogosAno.forEach(g => {
            const ry = parseInt(g.releaseYear);
            if(ry) { const decade = Math.floor(ry/10)*10; decMap[`Anos ${decade}`] = (decMap[`Anos ${decade}`] || 0) + 1; }
        });
        document.getElementById('retroDecadesTable').innerHTML = Object.entries(decMap).sort((a,b) => b[1]-a[1]).slice(0, 5).map(p => `
            <div class="flex justify-between items-center border-b border-[var(--border)] py-1 last:border-0">
                <span class="text-[var(--text-main)] truncate">${p[0]}</span>
                <span>${p[1]} Obras</span>
            </div>
        `).join('') || '<p class="text-center opacity-50">Sem dados</p>';
    }
// ---------------------------------------------------------
    // LÓGICA 1: GAMES / OBRAS MENOS JOGADOS (GAMES - JOGADOS)
    // ---------------------------------------------------------
    const labelBottomList = document.getElementById('retroLabelBottomList');
    if (labelBottomList) {
        labelBottomList.innerText = isGamer ? 'GAMES - JOGADOS' : 'OBRAS - ASSISTIDAS';
    }

    // Filtra obras que não estão na Watchlist e que têm tempo de tela > 0
    const sortedLeastGames = [...jogosAno]
        .filter(g => {
            const tempoTotal = calculateItemTotalMinutes(g);
            return (g.status || '').toLowerCase() !== 'watchlist' && tempoTotal > 0;
        })
        .sort((a, b) => {
            return calculateItemTotalMinutes(a) - calculateItemTotalMinutes(b);
        });

    const bottom5 = sortedLeastGames.slice(0, 5);
    document.getElementById('retroBottomGamesList').innerHTML = bottom5.map((g, i) => {
        const mins = calculateItemTotalMinutes(g);
        const hrs = `${Math.floor(mins/60)}:${(mins%60).toString().padStart(2, '0')}:00`;
        return `
            <div class="flex justify-between items-center border-b border-[var(--border)] pb-2 last:border-0 last:pb-0">
                <div class="flex items-center gap-2 overflow-hidden">
                    <span class="text-[10px] font-black text-[var(--text-dim)]">${i+1}º</span>
                    <span class="text-[11px] font-black uppercase truncate text-[var(--text-main)]">${g.name}</span>
                </div>
                <span class="text-[10px] font-bold text-[var(--text-dim)] ml-2 whitespace-nowrap">${hrs}</span>
            </div>
        `;
    }).join('') || '<p class="text-xs text-center opacity-50">Sem dados</p>';

    // ---------------------------------------------------------
    // LÓGICA 2: TOP NOTAS MÁXIMAS
    // ---------------------------------------------------------
    // Filtra apenas quem tem nota, priorizando quem tem a maior nota, e como critério de desempate, o maior tempo jogado
    const sortedRatedGames = [...jogosAno]
        .filter(g => (parseFloat(g.rating) || 0) > 0)
        .sort((a, b) => {
            const rA = parseFloat(a.rating) || 0;
            const rB = parseFloat(b.rating) || 0;
            if (rB !== rA) return rB - rA; // Desempate 1: Nota
            return calculateItemTotalMinutes(b) - calculateItemTotalMinutes(a); // Desempate 2: Mais tempo consumido
        });

    const top3Rated = sortedRatedGames.slice(0, 3);
    document.getElementById('retroTopRatedGamesList').innerHTML = top3Rated.map((g, i) => {
        // Estrela dourada padrão para avaliação
        const starColor = 'text-amber-400'; 
        return `
            <div class="flex justify-between items-center border-b border-[var(--border)] pb-2 last:border-0 last:pb-0">
                <div class="flex items-center gap-2 overflow-hidden">
                    <span class="text-[10px] font-black text-[var(--text-dim)]">${i+1}º</span>
                    <span class="text-[11px] font-black uppercase truncate text-[var(--text-main)]">${g.name}</span>
                </div>
                <span class="text-[11px] font-black ${starColor} ml-2 whitespace-nowrap drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]">
                    ${g.rating || '0.0'} ★
                </span>
            </div>
        `;
    }).join('') || '<p class="text-xs text-center opacity-50">Sem dados</p>';

    // Base de Watchlist / Backlog Final e Encerramento
    const backlogTotEl = document.getElementById('retroBacklogTotal');
    backlogTotEl.innerText = getFilteredGamesForStats().filter(g => (g.status||'').toLowerCase() === 'watchlist').length;
    backlogTotEl.className = `text-2xl font-black ${hlColor} ${bgGlow}`;
    
    const parabensTitle = document.getElementById('retroParabensTitle');
    if (parabensTitle) parabensTitle.className = `text-lg font-black uppercase mb-2 ${hlColor}`;
}

// --- LINHA DO TEMPO (TIMELINE) ---
var timelineViewMode = 'vertical'; 

function setTimelineViewMode(mode) {
    if (timelineViewMode === mode) return; 
    timelineViewMode = mode;
    
    const btnVertical = document.getElementById('btnTimelineVertical');
    const btnHorizontal = document.getElementById('btnTimelineHorizontal');
    
    const activeClasses = "px-3 py-1.5 text-[9px] font-black tracking-widest transition-all bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]";
    const inactiveClasses = "px-3 py-1.5 text-[9px] font-black tracking-widest transition-all text-[var(--text-dim)] hover:text-[var(--text-main)] hover:bg-[var(--surfaceHover)]";
    
    if (mode === 'vertical') {
        btnVertical.className = activeClasses;
        btnHorizontal.className = inactiveClasses;
    } else {
        btnHorizontal.className = activeClasses;
        btnVertical.className = inactiveClasses;
    }
    
    renderTimeline(document.getElementById('timelineYearSelect').value);
}

function openTimeline() {
    const yearsPlayed = [...new Set(games.flatMap(g => [g.startDate?.split('-')[0]].filter(Boolean)))].sort((a,b) => b-a);
    const select = document.getElementById('timelineYearSelect');
    if (yearsPlayed.length === 0) return alert("Nenhuma obra registrada com data de início para gerar a linha do tempo!");
    
    select.innerHTML = '<option value="all">Todos os Anos</option>' + yearsPlayed.map(y => `<option value="${y}">${y}</option>`).join('');
    select.value = 'all';
    
    renderTimeline('all');
    document.getElementById('timelineModal').style.display = 'flex';
}

function closeTimeline() { 
    document.getElementById('timelineModal').style.display = 'none'; 
}

function renderTimeline(ano) {
    const container = document.getElementById('timelineContent');
    
    var validGames = getFilteredGamesForStats().filter(g => g.startDate);
    
    if (ano !== 'all') {
        validGames = validGames.filter(g => g.startDate.startsWith(ano));
    }

    if (validGames.length === 0) {
        container.innerHTML = '<div class="text-center p-12 opacity-50 font-bold uppercase tracking-widest text-xs">Nenhuma obra registrada neste período.</div>';
        return;
    }

    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const grouped = {};
    
    validGames.forEach(g => {
        const parts = g.startDate.split('-');
        if(parts.length >= 2) {
            const key = `${parts[0]}-${parts[1]}`;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(g);
        }
    });

    const sortedKeys = Object.keys(grouped).sort((a,b) => b.localeCompare(a));

    var html = '';
    const isHorizontal = timelineViewMode === 'horizontal';
    const cardWidth = isHorizontal ? 'w-28' : 'w-36';
    const posterHeight = isHorizontal ? 'h-40' : 'h-48';
    const titleSize = isHorizontal ? 'text-[9px]' : 'text-[10px]';

    if (!isHorizontal) {
        html = '<div class="absolute left-4 md:left-[39px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500/80 to-transparent z-0"></div>';
    } else {
        html = `<div class="relative flex overflow-x-auto custom-scroll gap-12 pb-12 pt-8 px-4 items-start w-full min-h-[450px]">
                    <div class="absolute left-0 right-0 top-[60px] h-0.5 bg-gradient-to-r from-indigo-500/80 to-transparent z-0"></div>`;
    }
    
    sortedKeys.forEach(key => {
        const [y, m] = key.split('-');
        const monthName = monthNames[parseInt(m) - 1];
        const label = ano === 'all' ? `${monthName} de ${y}` : monthName;
        
        const items = grouped[key].sort((a,b) => b.startDate.localeCompare(a.startDate));

        var rowCount = Math.ceil(items.length / 5);
        if (rowCount > 2) rowCount = 2; 
        if (rowCount < 1) rowCount = 1; 
        const gridRowsClass = `grid-rows-${rowCount}`;

        var cardsHtml = items.map(g => {
            var epProg = '';
            if (!['Filme', 'Filme OVA'].includes(g.type || 'Filme') && g.epTotal > 0) {
                const percent = Math.round((g.epWatched / g.epTotal) * 100) || 0;
                const barColor = percent >= 100 ? 'bg-[var(--green)] shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]';
                epProg = `
                    <div class="mt-auto pt-2 w-full px-2 pb-2 border-t border-[var(--border)] bg-[var(--input)] rounded-b-lg">
                        <div class="flex justify-between text-[7px] font-black opacity-80 uppercase mb-1 text-[var(--text-main)]">
                            <span>Eps: ${g.epWatched}/${g.epTotal}</span><span>${percent}%</span>
                        </div>
                        <div class="h-1 bg-black/40 rounded-full overflow-hidden border border-[var(--border)]">
                            <div class="h-full ${barColor} transition-all duration-700" style="width: ${percent}%"></div>
                        </div>
                    </div>
                `;
            } else {
                epProg = `<div class="h-2"></div>`;
            }

            return `
            <div class="card-inner overflow-hidden border border-[var(--border)] hover:border-indigo-500/50 hover:shadow-[0_10px_20px_rgba(99,102,241,0.2)] bg-[var(--surface)] ${cardWidth} flex-shrink-0 cursor-pointer snap-start" onclick="openDetails('${g.id}')">
                <div class="poster-container ${posterHeight} w-full bg-[var(--input)] relative">
                    ${g.cover 
                        ? `<img src="${g.cover}" class="blur-bg" loading="lazy" aria-hidden="true">
                           <img src="${g.cover}" class="main-cover" onerror="this.src='https://via.placeholder.com/150x225?text=Capa'" loading="lazy">`
                        : `<div class="absolute inset-0 flex items-center justify-center bg-[var(--input)] overflow-hidden pointer-events-none">
                               <div class="-rotate-45 text-xl font-black text-[var(--text-main)] border-[4px] border-[var(--text-main)] py-1 px-3 rounded-xl opacity-[0.08] select-none tracking-widest">
                                   ${g.type ? g.type.toUpperCase() : 'FILME'}
                               </div>
                           </div>`
                    }
                    <div class="absolute top-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest text-[var(--text-main)] border border-[var(--border)] backdrop-blur-sm z-20 shadow-lg">
                        ${g.startDate.split('-').reverse().join('/')}
                    </div>
                </div>
                <div class="p-2 text-center relative flex flex-col items-center">
                    <h4 class="${titleSize} font-black uppercase truncate w-full text-[var(--text-main)] mb-1" title="${g.name}">${g.name}</h4>
                    <span class="text-[6px] text-[var(--text-dim)] uppercase type-${(g.type||'filme').toLowerCase().replace(/[ /]/g, '-')} font-bold tracking-widest">${g.type || 'Filme'}</span>
                </div>
                ${epProg}
            </div>
            `;
        }).join('');

        if (!isHorizontal) {
            html += `
                <div class="relative z-10 pl-12 md:pl-20 mb-8">
                    <div class="absolute left-[11px] md:left-[31.5px] top-2 w-4 h-4 rounded-full bg-indigo-500 border-4 border-[var(--bg)] shadow-[0_0_15px_rgba(99,102,241,0.8)] z-20"></div>
                    <h3 class="text-xl md:text-2xl font-black text-[var(--text-main)] uppercase tracking-widest drop-shadow-md mb-4 mt-0.5 flex flex-wrap items-center gap-3">
                        ${label}
                        <span class="text-[10px] text-[var(--text-dim)] font-bold bg-[var(--input)] px-2 py-1 rounded-md border border-[var(--border)] shadow-inner">${items.length} Obras Registradas</span>
                    </h3>
                    <div class="flex overflow-x-auto gap-4 pb-4 custom-scroll pr-4 snap-x snap-mandatory">
                        ${cardsHtml}
                    </div>
                </div>
            `;
        } else {
            html += `
                <div class="relative z-10 flex flex-col items-start shrink-0 mr-8">
                    <div class="flex items-center w-full h-[60px] relative">
                        <div class="absolute top-0 left-2 whitespace-nowrap">
                            <h3 class="text-lg md:text-xl font-black text-[var(--text-main)] uppercase tracking-widest drop-shadow-md flex items-center gap-2">
                                ${label}
                                <span class="text-[9px] text-[var(--text-dim)] bg-[var(--input)] px-2 py-1 rounded-md border border-[var(--border)] shadow-inner">${items.length}</span>
                            </h3>
                        </div>
                        <div class="absolute top-[50px] left-8 -translate-y-1/2 w-4 h-4 rounded-full bg-indigo-500 border-4 border-[var(--bg)] shadow-[0_0_15px_rgba(99,102,241,0.8)] z-20"></div>
                        <div class="absolute top-[50px] left-[35px] w-0.5 h-[30px] bg-indigo-500/50 z-10"></div>
                    </div>
                    <div class="grid ${gridRowsClass} grid-flow-col gap-3 pl-4 pt-6 mt-2 pb-4">
                        ${cardsHtml}
                    </div>
                </div>
            `;
        }
    });

    if (isHorizontal) {
        html += `</div>`;
    }

    container.innerHTML = html;
}
// =========================================================================
// PARTE 8: ESTATÍSTICAS UNIFICADAS 2 (ANÁLISE COMPORTAMENTAL, CONQUISTAS E NOTAS)
// =========================================================================

// --- ANÁLISE COMPORTAMENTAL SUPREMA ---
var currentEstatMode = 'tv';

function openEstatisticasGerais() {
    currentEstatMode = currentAppMode; 
    switchEstatMode(currentEstatMode);
    document.getElementById('estatisticasGeraisModal').style.display = 'flex';
}

function closeEstatisticasGerais() {
    document.getElementById('estatisticasGeraisModal').style.display = 'none';
}

function switchEstatMode(mode) {
    currentEstatMode = mode;
    const sliderBg = document.getElementById('sliderBgEstat');
    const btnTV = document.getElementById('btnModeEstatTV');
    const btnGamer = document.getElementById('btnModeEstatGamer');
    const title = document.getElementById('estatMainTitle');
    const header = document.getElementById('estatMainHeader');
    
    const egEpsLabel = document.getElementById('egEpsLabel');
    const egMediaLabel = document.getElementById('egMediaLabel');
    const egDirTitle = document.getElementById('egDirTitle');
    const egStdTitle = document.getElementById('egStdTitle');
    
    if (mode === 'tv') {
        if(sliderBg) {
            sliderBg.style.transform = 'translateX(0)';
            sliderBg.classList.remove('bg-blue-500', 'shadow-[0_0_10px_rgba(59,130,246,0.4)]');
            sliderBg.classList.add('bg-teal-500', 'shadow-[0_0_10px_rgba(20,184,166,0.4)]');
        }
        if(btnTV) { btnTV.classList.add('text-white'); btnTV.classList.remove('text-[var(--text-dim)]'); }
        if(btnGamer) { btnGamer.classList.add('text-[var(--text-dim)]'); btnGamer.classList.remove('text-white'); }
        if(title) { 
            title.classList.remove('text-blue-500'); title.classList.add('text-[var(--text-main)]'); 
            title.innerHTML = '<span>🔬 <span class="text-teal-500">Análise Comportamental</span></span> <span class="text-[10px] text-[var(--text-dim)] tracking-widest mt-0.5">TV TIME</span>'; 
        }
        if(header) { header.classList.remove('border-blue-500/30'); header.classList.add('border-teal-500/30'); }
        
        if(egEpsLabel) egEpsLabel.innerText = 'Episódios Devorados';
        if(egMediaLabel) egMediaLabel.innerText = 'Por Filme/OVA';
        if(egDirTitle) egDirTitle.innerHTML = '🎬 Diretores em Destaque';
        if(egStdTitle) egStdTitle.innerHTML = '🏢 Estúdios & Produtoras';
        
    } else {
        if(sliderBg) {
            sliderBg.style.transform = 'translateX(100%)';
            sliderBg.classList.remove('bg-teal-500', 'shadow-[0_0_10px_rgba(20,184,166,0.4)]');
            sliderBg.classList.add('bg-blue-500', 'shadow-[0_0_10px_rgba(59,130,246,0.4)]');
        }
        if(btnGamer) { btnGamer.classList.add('text-white'); btnGamer.classList.remove('text-[var(--text-dim)]'); }
        if(btnTV) { btnTV.classList.add('text-[var(--text-dim)]'); btnTV.classList.remove('text-white'); }
        if(title) { 
            title.classList.remove('text-[var(--text-main)]'); title.classList.add('text-blue-500'); 
            title.innerHTML = '<span>🔬 <span class="text-blue-500">Análise Comportamental</span></span> <span class="text-[10px] text-[var(--text-dim)] tracking-widest mt-0.5">GAMER</span>'; 
        }
        if(header) { header.classList.remove('border-teal-500/30'); header.classList.add('border-blue-500/30'); }
        
        if(egEpsLabel) egEpsLabel.innerText = 'Obras na Coleção';
        if(egMediaLabel) egMediaLabel.innerText = 'Por Jogo Zerado';
        if(egDirTitle) egDirTitle.innerHTML = '💻 Desenvolvedoras';
        if(egStdTitle) egStdTitle.innerHTML = '🏢 Publicadoras (Publishers)';
    }
    
    const filteredForYears = games.filter(g => mode === 'tv' ? g.type !== 'Jogo' : g.type === 'Jogo');
    const yearsPlayed = [...new Set(filteredForYears.flatMap(g => [g.startDate?.split('-')[0]].filter(Boolean)))].sort((a,b) => b-a);
    const select = document.getElementById('egYearSelect');
    const currentVal = select.value || 'all';
    
    select.innerHTML = '<option value="all">Todo o Período</option>' + yearsPlayed.map(y => `<option value="${y}">${y}</option>`).join('');
    if(yearsPlayed.includes(currentVal)) select.value = currentVal; else select.value = 'all';

    renderEstatisticasGerais(select.value);
}

function renderGenericPieChart(dataObj, chartId, legendId, colors) {
    const total = Object.values(dataObj).reduce((a, b) => a + b, 0);
    const chart = document.getElementById(chartId);
    const legend = document.getElementById(legendId);
    
    if (total === 0) {
        chart.style.background = '#374151'; 
        legend.innerHTML = '<p class="opacity-30 text-[10px] text-center uppercase">Sem Dados</p>';
        return;
    }

    var degAcc = 0;
    var gradientStr = [];
    var legendHTML = '';

    const sortedData = Object.entries(dataObj).sort((a,b) => b[1] - a[1]);
    
    sortedData.forEach((item, index) => {
        const name = item[0];
        const val = item[1];
        const perc = (val / total) * 100;
        const color = colors[index % colors.length];
        
        const startDeg = degAcc;
        const endDeg = degAcc + perc;
        gradientStr.push(`${color} ${startDeg}% ${endDeg}%`);
        degAcc += perc;

        legendHTML += `
            <div class="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                <div class="flex items-center gap-2 truncate pr-2">
                    <div class="w-3 h-3 flex-shrink-0 rounded-full" style="background-color: ${color}"></div>
                    <span class="text-[var(--text-main)] truncate" title="${name}">${name} (${val})</span>
                </div>
                <span class="font-black" style="color: ${color}">${perc.toFixed(1)}%</span>
            </div>
        `;
    });

    chart.style.background = `conic-gradient(${gradientStr.join(', ')})`;
    legend.innerHTML = legendHTML;
}

function renderEstatisticasGerais(ano) {
    const list = games.filter(g => {
        const isTargetMode = currentEstatMode === 'tv' ? g.type !== 'Jogo' : g.type === 'Jogo';
        const isTargetYear = ano === 'all' ? true : (g.startDate && g.startDate.startsWith(ano));
        return isTargetMode && isTargetYear;
    });

    if (list.length === 0 && ano !== 'all') {
        alert("Nenhuma obra iniciada neste ano para essa categoria!");
        document.getElementById('egYearSelect').value = 'all';
        return renderEstatisticasGerais('all');
    }

    // 1. TEMPO DE VIDA ABSOLUTO
    var totalM = list.reduce((acc, g) => acc + calculateItemTotalMinutes(g), 0);
    var totalH = Math.floor(totalM / 60);
    const totalDiasT = Math.floor(totalH / 24);
    const anosV = Math.floor(totalDiasT / 365);
    const mesesV = Math.floor((totalDiasT % 365) / 30);
    const diasV = (totalDiasT % 365) % 30;

    var strTempo = '';
    const mainColor = currentEstatMode === 'tv' ? 'text-teal-400' : 'text-blue-400';
    if (anosV > 0) strTempo += `<span><span class="${mainColor}">${anosV}</span> Ano${anosV>1?'s':''}</span>`;
    if (mesesV > 0) strTempo += `<span><span class="text-white">${mesesV}</span> Mês${mesesV>1?'es':''}</span>`;
    strTempo += `<span><span class="${mainColor}">${diasV}</span> Dia${diasV!==1?'s':''}</span>`;
    
    if(totalM === 0) strTempo = '<span class="text-[var(--text-dim)]">0 Dias</span>';
    document.getElementById('egTempoVida').innerHTML = strTempo;

    // 2. TOTAL EPS / OBRAS
    if (currentEstatMode === 'tv') {
        const totalEps = list.reduce((acc, g) => acc + (parseInt(g.epWatched) || 0), 0);
        document.getElementById('egTotalEps').innerText = totalEps;
    } else {
        document.getElementById('egTotalEps').innerText = list.length;
    }

    // 3. TEMPO RESTANTE (PREVISÃO)
    var minRestantes = 0;
    list.forEach(g => {
        const status = (g.status || '').toLowerCase();
        if (status === 'visto' || status === 'abandonado') return; 

        if (currentEstatMode === 'gamer') {
            const targetMins = (parseInt(g.targetHours) || 0) * 60;
            const playedMins = (parseInt(g.hours) || 0) * 60 + (parseInt(g.minutes) || 0);
            minRestantes += Math.max(0, targetMins - playedMins);
        } else {
            const isFilme = ['Filme', 'Filme OVA'].includes(g.type || 'Filme');
            if (isFilme) {
                minRestantes += ((parseInt(g.hours)||0)*60 + (parseInt(g.minutes)||0));
            } else {
                const epTotais = parseInt(g.epTotal) || parseInt(g.epWatched) || 0; 
                const epVistos = parseInt(g.epWatched) || 0;
                const epFaltam = Math.max(0, epTotais - epVistos);
                const duracaoEp = ((parseInt(g.hours)||0)*60 + (parseInt(g.minutes)||0)) || 24; 
                minRestantes += (epFaltam * duracaoEp);
            }
        }
    });

    const horasRestantes = Math.floor(minRestantes / 60);
    const diasRestantes = Math.floor(horasRestantes / 24);
    const mesesRestantes = Math.floor(diasRestantes / 30);
    const diasSobraRestantes = diasRestantes % 30;

    var strRestante = '';
    if (mesesRestantes > 0) strRestante += `<span><span class="text-white">${mesesRestantes}</span> Meses</span> e `;
    if (diasSobraRestantes > 0 || mesesRestantes === 0) strRestante += `<span><span class="text-white">${diasSobraRestantes}</span> Dias</span>`;
    if (minRestantes === 0) strRestante = '<span class="text-[var(--text-dim)] opacity-50">Tudo Zerado! 🎉</span>';
    
    document.getElementById('egTempoRestante').innerHTML = strRestante;

    // 4. PERFIL BÁSICO E DURAÇÃO MÉDIA
    const concluidos = list.filter(g => (g.status||'').toLowerCase() === 'visto').length;
    const abandonados = list.filter(g => (g.status||'').toLowerCase() === 'abandonado').length;
    const taxaConclusao = list.length > 0 ? ((concluidos / list.length) * 100).toFixed(1) : 0;
    const taxaAbandono = list.length > 0 ? ((abandonados / list.length) * 100).toFixed(1) : 0;
    const rewatch = list.filter(g => (g.watchCount || 1) > 1).length;

    document.getElementById('egTaxaConclusao').innerText = `${taxaConclusao.toString().replace('.', ',')}%`;
    document.getElementById('egTaxaAbandono').innerText = `${taxaAbandono.toString().replace('.', ',')}%`;
    document.getElementById('egFatorReplay').innerText = rewatch;

    const concluidosList = list.filter(g => (g.status||'').toLowerCase() === 'visto');
    var totalMinConcluidos = concluidosList.reduce((acc, g) => acc + ((parseInt(g.hours)||0)*60 + (parseInt(g.minutes)||0)), 0);
    var mediaMinConcluidos = concluidosList.length > 0 ? Math.floor(totalMinConcluidos / concluidosList.length) : 0;
    document.getElementById('egMediaFilmes').innerText = mediaMinConcluidos > 0 ? `${Math.floor(mediaMinConcluidos/60)}h ${mediaMinConcluidos%60}m` : '---';

    const uniqueGens = new Set();
    list.forEach(g => { if(g.genre) g.genre.split(/[,/|-]+/).forEach(s => uniqueGens.add(s.trim().toUpperCase())); });
    uniqueGens.delete('');
    document.getElementById('egGenerosExplorados').innerText = uniqueGens.size;

    // 5. ATIVIDADE POR MÊS
    const mesesNomes = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    const obrasPorMes = new Array(12).fill(0);
    list.forEach(g => {
        if(g.startDate) {
            const m = parseInt(g.startDate.split('-')[1]) - 1;
            if(m >= 0 && m <= 11) obrasPorMes[m]++;
        }
    });
    const maxObrasMes = Math.max(...obrasPorMes, 1);
    
    document.getElementById('egColChart').innerHTML = obrasPorMes.map((qtd, i) => {
        const hPerc = (qtd / maxObrasMes) * 100;
        return `
            <div class="flex flex-col items-center justify-end h-full flex-1 group">
                <span class="text-[9px] font-black ${mainColor} mb-1 opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md">${qtd}</span>
                <div class="w-full max-w-[24px] bg-gradient-to-t ${currentEstatMode === 'tv' ? 'from-teal-700 to-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.3)]' : 'from-blue-700 to-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]'} rounded-t-md transition-all duration-1000 ease-out" style="height: 0%;" data-target-height="${hPerc}%"></div>
                <span class="text-[8px] sm:text-[9px] font-black uppercase text-[var(--text-dim)] mt-2">${mesesNomes[i]}</span>
            </div>
        `;
    }).join('');

    setTimeout(() => {
        document.querySelectorAll('#egColChart > div > div').forEach(bar => { bar.style.height = bar.getAttribute('data-target-height'); });
    }, 100);

    // 6. PIZZA: STATUS
    const stColors = ['#10B981', '#3B82F6', '#EF4444', '#4B5563'];
    const stData = {
        'Vistos': list.filter(g => (g.status||'').toLowerCase() === 'visto').length,
        'Assistindo': list.filter(g => (g.status||'').toLowerCase() === 'assistindo').length,
        'Abandonados': list.filter(g => (g.status||'').toLowerCase() === 'abandonado').length,
        'Watchlist': list.filter(g => (g.status||'').toLowerCase() === 'watchlist').length
    };
    renderGenericPieChart(stData, 'egPieChart', 'egPieLegend', stColors);

    // 7. PIZZA: GÊNEROS MAIS ASSISTIDOS
    const genCount = {};
    list.forEach(g => {
        if(g.genre) {
            const mainGen = g.genre.split(',')[0].trim().toUpperCase();
            if(mainGen) genCount[mainGen] = (genCount[mainGen]||0)+1;
        }
    });
    const sortedGens = Object.entries(genCount).sort((a,b) => b[1] - a[1]);
    const top4Gens = sortedGens.slice(0, 4);
    const othersGenSum = sortedGens.slice(4).reduce((acc, curr) => acc + curr[1], 0);
    
    const genDataToRender = {};
    top4Gens.forEach(item => genDataToRender[item[0]] = item[1]);
    if (othersGenSum > 0) genDataToRender['OUTROS'] = othersGenSum;
    const pieColors = ['#F43F5E', '#8B5CF6', '#06B6D4', '#F59E0B', '#6B7280'];
    renderGenericPieChart(genDataToRender, 'egGenrePieChart', 'egGenrePieLegend', pieColors);

    // 8. PIZZA: SUBGÊNEROS/TAGS
    const subCount = {};
    list.forEach(g => {
        if(g.genre && g.genre.includes(',')) {
            const parts = g.genre.split(',');
            parts.slice(1).forEach(s => {
                const k = s.trim().toUpperCase(); 
                if(k) subCount[k] = (subCount[k]||0)+1;
            });
        }
    });
    const sortedSubs = Object.entries(subCount).sort((a,b) => b[1] - a[1]);
    const top4Subs = sortedSubs.slice(0, 4);
    const othersSubSum = sortedSubs.slice(4).reduce((acc, curr) => acc + curr[1], 0);
    
    const subDataToRender = {};
    top4Subs.forEach(item => subDataToRender[item[0]] = item[1]);
    if (othersSubSum > 0) subDataToRender['OUTROS'] = othersSubSum;
    const subColors = ['#0EA5E9', '#10B981', '#F97316', '#D946EF', '#6B7280']; 
    renderGenericPieChart(subDataToRender, 'egSubPieChart', 'egSubPieLegend', subColors);

    // 9. VERSUS ADAPTATIVO
    var la = 0, anim = 0;
    const elVs1 = document.getElementById('egLabelVs1');
    const elVs2 = document.getElementById('egLabelVs2');
    
    if (currentEstatMode === 'tv') {
        if(elVs1) elVs1.innerText = "Live-Action";
        if(elVs2) elVs2.innerText = "Animação";
        la = list.filter(g => ['Filme', 'Série'].includes(g.type || 'Filme')).length;
        anim = list.filter(g => ['Anime', 'Desenho', 'Filme OVA'].includes(g.type || 'Filme')).length;
    } else {
        if(elVs1) elVs1.innerText = "Jogos Longos (>30h)";
        if(elVs2) elVs2.innerText = "Jogos Curtos (<30h)";
        la = list.filter(g => calculateItemTotalMinutes(g) >= 1800).length; 
        anim = list.filter(g => calculateItemTotalMinutes(g) < 1800).length; 
    }
    
    const tFmt = la + anim;
    setTimeout(() => {
        document.getElementById('egBarraLa').style.width = tFmt > 0 ? `${(la/tFmt)*100}%` : '50%';
        document.getElementById('egBarraAnim').style.width = tFmt > 0 ? `${(anim/tFmt)*100}%` : '50%';
    }, 100);
    document.getElementById('egPercLa').innerText = tFmt > 0 ? `${Math.round((la/tFmt)*100)}%` : '';
    document.getElementById('egPercAnim').innerText = tFmt > 0 ? `${Math.round((anim/tFmt)*100)}%` : '';

    const classicos = list.filter(g => parseInt(g.releaseYear) > 0 && parseInt(g.releaseYear) < 2000).length;
    const modernos = list.filter(g => parseInt(g.releaseYear) >= 2000).length;
    const tEras = classicos + modernos;
    setTimeout(() => {
        document.getElementById('egBarraClass').style.width = tEras > 0 ? `${(classicos/tEras)*100}%` : '50%';
        document.getElementById('egBarraMod').style.width = tEras > 0 ? `${(modernos/tEras)*100}%` : '50%';
    }, 100);
    document.getElementById('egPercClass').innerText = tEras > 0 ? `${Math.round((classicos/tEras)*100)}%` : '';
    document.getElementById('egPercMod').innerText = tEras > 0 ? `${Math.round((modernos/tEras)*100)}%` : '';

    // 10. CURIOSIDADES EXTRAS
    const favGens = {};
    list.filter(g => g.isFavorite).forEach(g => {
        if(g.genre) {
            const k = g.genre.split(',')[0].trim().toUpperCase();
            if(k) favGens[k] = (favGens[k]||0)+1;
        }
    });
    const topFavGen = Object.entries(favGens).sort((a,b) => b[1] - a[1])[0];
    document.getElementById('egGeneroConforto').innerText = topFavGen ? topFavGen[0] : 'NENHUM';

    const dropGens = {};
    list.filter(g => (g.status||'').toLowerCase() === 'abandonado').forEach(g => {
        if(g.genre) {
            const k = g.genre.split(',')[0].trim().toUpperCase();
            if(k) dropGens[k] = (dropGens[k]||0)+1;
        }
    });
    const topDropGen = Object.entries(dropGens).sort((a,b) => b[1] - a[1])[0];
    document.getElementById('egGeneroDrop').innerText = topDropGen ? topDropGen[0] : 'NENHUM';

    const titan = [...list].sort((a,b) => calculateItemTotalMinutes(b) - calculateItemTotalMinutes(a))[0];
    if (titan && calculateItemTotalMinutes(titan) > 0) {
        document.getElementById('egObraTita').innerText = titan.name;
        const titanMins = calculateItemTotalMinutes(titan);
        document.getElementById('egObraTitaTempo').innerText = `${Math.floor(titanMins/60)}h ${titanMins%60}m`;
    } else {
        document.getElementById('egObraTita').innerText = '---';
        document.getElementById('egObraTitaTempo').innerText = '0h 0m';
    }

    const anosOuro = {};
    list.filter(g => (g.status||'').toLowerCase() === 'visto' && parseInt(g.releaseYear) > 1900).forEach(g => {
        anosOuro[g.releaseYear] = (anosOuro[g.releaseYear] || 0) + 1;
    });
    const topAnoOuro = Object.entries(anosOuro).sort((a,b) => b[1] - a[1])[0];
    document.getElementById('egAnoOuro').innerText = topAnoOuro ? topAnoOuro[0] : '---';

    updateDirectorAndStudioStats(list);
}

function processEntityStats(list, key) {
    const map = {};
    list.forEach(g => {
        const rawValue = g[key];
        if (!rawValue || rawValue.trim() === '') return;
        const parts = rawValue.split(/[,/;|]+/).map(s => s.trim()).filter(Boolean);
        const mins = calculateItemTotalMinutes(g);
        const rating = parseFloat(g.rating || 0);
        const isFav = !!g.isFavorite;

        parts.forEach(name => {
            const normalizedKey = name.toUpperCase();
            if (!map[normalizedKey]) map[normalizedKey] = { name, count: 0, time: 0, ratings: [], favorites: 0 };
            map[normalizedKey].count += 1;
            map[normalizedKey].time += mins;
            if (rating > 0) map[normalizedKey].ratings.push(rating);
            if (isFav) map[normalizedKey].favorites += 1;
        });
    });

    const items = Object.values(map);
    items.forEach(item => { item.avgRating = item.ratings.length ? (item.ratings.reduce((a, b) => a + b, 0) / item.ratings.length) : 0; });
    const topWatched = [...items].sort((a, b) => b.count - a.count || b.time - a.time);
    const topFavorite = [...items].sort((a, b) => {
        if (b.favorites !== a.favorites) return b.favorites - a.favorites;
        if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
        return b.count - a.count;
    });
    return { top5: topWatched.slice(0, 5), mostWatched: topWatched[0] || null, favorite: topFavorite[0] || null };
}

function updateDirectorAndStudioStats(filteredGames) {
    const dirStats = processEntityStats(filteredGames, 'director');
    const stdStats = processEntityStats(filteredGames, 'studio');

    const elTopDir = document.getElementById('egTopDirector');
    const elTopDirCnt = document.getElementById('egTopDirectorCount');
    const elFavDir = document.getElementById('egFavDirector');
    const elFavDirRat = document.getElementById('egFavDirectorRating');
    const elDirList = document.getElementById('egTopDirectorsList');

    if (dirStats.mostWatched) {
        if(elTopDir) elTopDir.innerText = dirStats.mostWatched.name;
        if(elTopDirCnt) elTopDirCnt.innerText = `${dirStats.mostWatched.count} obras • ${formatMinutes(dirStats.mostWatched.time)}`;
    } else {
        if(elTopDir) elTopDir.innerText = '---'; if(elTopDirCnt) elTopDirCnt.innerText = '0 obras';
    }

    if (dirStats.favorite) {
        if(elFavDir) elFavDir.innerText = dirStats.favorite.name;
        if(elFavDirRat) elFavDirRat.innerText = `Nota ${dirStats.favorite.avgRating.toFixed(1)} ★ (${dirStats.favorite.favorites} ❤︎)`;
    } else {
        if(elFavDir) elFavDir.innerText = '---'; if(elFavDirRat) elFavDirRat.innerText = 'Nota 0.0 ★';
    }

    const maxDir = dirStats.top5.length > 0 ? dirStats.top5[0].count : 1;
    if(elDirList) {
        elDirList.innerHTML = dirStats.top5.map((d, i) => `
            <div class="space-y-1">
                <div class="flex justify-between items-center text-[10px] font-bold uppercase">
                    <span class="truncate text-[var(--text-main)]"><b class="text-[var(--accent)] mr-1.5">#${i + 1}</b> ${d.name}</span>
                    <span class="text-[var(--text-dim)] flex-shrink-0 ml-2">${d.count} obras</span>
                </div>
                <div class="h-1.5 bg-[var(--input)] border border-[var(--border)] rounded-full overflow-hidden">
                    <div class="h-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent-glow)] transition-all duration-500" style="width: ${(d.count / maxDir) * 100}%"></div>
                </div>
            </div>`).join('') || '<p class="opacity-40 text-[9px] font-bold text-center py-4 uppercase">Nenhum diretor cadastrado</p>';
    }

    const elTopStd = document.getElementById('egTopStudio');
    const elTopStdCnt = document.getElementById('egTopStudioCount');
    const elFavStd = document.getElementById('egFavStudio');
    const elFavStdRat = document.getElementById('egFavStudioRating');
    const elStdList = document.getElementById('egTopStudiosList');

    if (stdStats.mostWatched) {
        if(elTopStd) elTopStd.innerText = stdStats.mostWatched.name;
        if(elTopStdCnt) elTopStdCnt.innerText = `${stdStats.mostWatched.count} obras • ${formatMinutes(stdStats.mostWatched.time)}`;
    } else {
        if(elTopStd) elTopStd.innerText = '---'; if(elTopStdCnt) elTopStdCnt.innerText = '0 obras';
    }

    if (stdStats.favorite) {
        if(elFavStd) elFavStd.innerText = stdStats.favorite.name;
        if(elFavStdRat) elFavStdRat.innerText = `Nota ${stdStats.favorite.avgRating.toFixed(1)} ★ (${stdStats.favorite.favorites} ❤︎)`;
    } else {
        if(elFavStd) elFavStd.innerText = '---'; if(elFavStdRat) elFavStdRat.innerText = 'Nota 0.0 ★';
    }

    const maxStd = stdStats.top5.length > 0 ? stdStats.top5[0].count : 1;
    if(elStdList) {
        elStdList.innerHTML = stdStats.top5.map((s, i) => `
            <div class="space-y-1">
                <div class="flex justify-between items-center text-[10px] font-bold uppercase">
                    <span class="truncate text-[var(--text-main)]"><b class="text-teal-400 mr-1.5">#${i + 1}</b> ${s.name}</span>
                    <span class="text-[var(--text-dim)] flex-shrink-0 ml-2">${s.count} obras</span>
                </div>
                <div class="h-1.5 bg-[var(--input)] border border-[var(--border)] rounded-full overflow-hidden">
                    <div class="h-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)] transition-all duration-500" style="width: ${(s.count / maxStd) * 100}%"></div>
                </div>
            </div>`).join('') || '<p class="opacity-40 text-[9px] font-bold text-center py-4 uppercase">Nenhum estúdio cadastrado</p>';
    }
}

// --- CONQUISTAS (BADGES) ---
function openBadges() { document.getElementById('badgesModal').style.display = 'flex'; renderBadges(); }
function closeBadges() { document.getElementById('badgesModal').style.display = 'none'; }
function setBadgeFilter(filterType, btnElement) {
    currentBadgeFilter = filterType;
    const buttons = document.querySelectorAll('.badge-filter-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    if(btnElement) btnElement.classList.add('active');
    renderBadges();
}

function renderBadges() {
    const listToEvaluate = getFilteredGamesForStats();
    
    var globalMinutes = listToEvaluate.reduce((acc, g) => {
        if ((g.status || 'watchlist').toLowerCase() === 'watchlist') return acc;
        return acc + calculateItemTotalMinutes(g);
    }, 0);
    var totalH = Math.floor(globalMinutes / 60);

    const watchlist = listToEvaluate.filter(g => (g.status||'').toLowerCase() === 'watchlist').length;
    const favoritos = listToEvaluate.filter(g => g.isFavorite).length;

    const cType = (t) => listToEvaluate.filter(x => (x.status||'').toLowerCase() === 'visto' && (x.type||'').toLowerCase() === t).length;
    const cTG = (t, keys) => listToEvaluate.filter(x => (x.status||'').toLowerCase() === 'visto' && (x.type||'').toLowerCase() === t && keys.some(k => (x.genre||'').toLowerCase().includes(k))).length;
    const cEps = (t, minEps) => listToEvaluate.filter(x => (x.status||'').toLowerCase() === 'visto' && (x.type||'').toLowerCase() === t && parseInt(x.epWatched||0) >= minEps).length;
    const cEpsCurto = (t, maxEps) => listToEvaluate.filter(x => (x.status||'').toLowerCase() === 'visto' && (x.type||'').toLowerCase() === t && parseInt(x.epWatched||0) <= maxEps && parseInt(x.epWatched||0) > 0).length;
    const cFav = (t) => listToEvaluate.filter(x => x.isFavorite && (x.type||'').toLowerCase() === t).length;
    const cRate = (t, r) => listToEvaluate.filter(x => (x.type||'').toLowerCase() === t && parseFloat(x.rating) === r).length;

    const countGen = (list, words) => list.filter(g => (g.status||'').toLowerCase() === 'visto' && words.some(w => (g.genre||'').toLowerCase().includes(w))).length;
    const countEpsTotal = (list) => list.reduce((acc, g) => acc + (parseInt(g.epWatched)||0), 0);
    const countHoursTotal = (list) => list.reduce((acc, g) => acc + Math.floor(calculateItemTotalMinutes(g)/60), 0);
    const countStatusTotal = (list, status) => list.filter(g => (g.status||'').toLowerCase() === status).length;
    const countRateTotal = (list, rate) => list.filter(g => parseFloat(g.rating) === rate).length;
    const countFavTotal = (list) => list.filter(g => g.isFavorite).length;
    const countDecTotal = (list, yr) => list.filter(g => g.releaseYear >= yr && g.releaseYear < yr+10 && (g.status||'').toLowerCase() === 'visto').length;
    const hasLongTotal = (list, eps) => list.some(g => (g.status||'').toLowerCase() === 'visto' && parseInt(g.epWatched) >= eps);
    const countRewatchTotal = (list) => list.reduce((acc, g) => acc + ((g.watchCount||1)-1), 0);
    const countCommentsTotal = (list) => list.filter(g => g.hasCommentSection && g.comment && g.comment.trim() !== '').length;

    var badgesData = [];

    if (statsMediaType === 'filmes') {
        const fVistos = listToEvaluate.filter(x => (x.status||'').toLowerCase() === 'visto' && ['filme'].includes((x.type||'').toLowerCase())).length;
        const sVistos = listToEvaluate.filter(x => (x.status||'').toLowerCase() === 'visto' && ['série'].includes((x.type||'').toLowerCase())).length;

        badgesData = [
            { diff: 'facil', name: 'O Início', icon: '⏱️', req: '1 Hora Total', unlocked: totalH >= 1 },
            { diff: 'facil', name: 'Maratonista', icon: '🛋️', req: '10 Horas Totais', unlocked: totalH >= 10 },
            { diff: 'medio', name: 'Frequente', icon: '🍿', req: '50 Horas Totais', unlocked: totalH >= 50 },
            { diff: 'medio', name: 'Dedicação', icon: '🔥', req: '100 Horas Totais', unlocked: totalH >= 100 },
            { diff: 'medio', name: 'Vida Dupla', icon: '🎭', req: '250 Horas Totais', unlocked: totalH >= 250 },
            { diff: 'dificil', name: 'Veterano', icon: '🎖️', req: '500 Horas Totais', unlocked: totalH >= 500 },
            { diff: 'ultra', name: 'Guardião do Tempo', icon: '⏳', req: '1000 Horas Totais', unlocked: totalH >= 1000 },
            { diff: 'ultra', name: 'Deus do Playtime', icon: '⚡', req: '2000 Horas Totais', unlocked: totalH >= 2000 },
            { diff: 'ultra', name: 'Além da Matriz', icon: '🌌', req: '5000 Horas Totais', unlocked: totalH >= 5000 },
            { diff: 'facil', name: 'A Pilha Cresce', icon: '📚', req: '10 na Watchlist', unlocked: watchlist >= 10 },
            { diff: 'medio', name: 'Acumulador', icon: '📦', req: '50 na Watchlist', unlocked: watchlist >= 50 },
            { diff: 'dificil', name: 'Compulsivo', icon: '💳', req: '100 na Watchlist', unlocked: watchlist >= 100 },
            { diff: 'facil', name: 'Coração Bate Forte', icon: '❤️', req: '1 Favorito Geral', unlocked: favoritos >= 1 },
            { diff: 'medio', name: 'Amor Verdadeiro', icon: '💖', req: '10 Favoritos Gerais', unlocked: favoritos >= 10 },
            { diff: 'dificil', name: 'Galeria de Arte', icon: '🖼️', req: '25 Favoritos Gerais', unlocked: favoritos >= 25 },
            { diff: 'ultra', name: 'Museu Pessoal', icon: '🏛️', req: '50 Favoritos Gerais', unlocked: favoritos >= 50 },
            { diff: 'facil', name: 'Primeira Sessão', icon: '🎬', req: '1 Filme Visto', unlocked: fVistos >= 1 },
            { diff: 'facil', name: 'Sessão da Tarde', icon: '📺', req: '10 Filmes Vistos', unlocked: fVistos >= 10 },
            { diff: 'medio', name: 'Cartão Fidelidade', icon: '🎫', req: '25 Filmes Vistos', unlocked: fVistos >= 25 },
            { diff: 'medio', name: 'Academia Meu Tv Time', icon: '🏆', req: '50 Filmes Vistos', unlocked: fVistos >= 50 },
            { diff: 'dificil', name: 'Crítico de Ouro', icon: '🧐', req: '100 Filmes Vistos', unlocked: fVistos >= 100 },
            { diff: 'dificil', name: 'Diretor Honorário', icon: '🎥', req: '250 Filmes Vistos', unlocked: fVistos >= 250 },
            { diff: 'ultra', name: 'Lenda de Hollywood', icon: '⭐', req: '500 Filmes Vistos', unlocked: fVistos >= 500 },
            { diff: 'facil', name: 'Adrenalina', icon: '💥', req: '1 Filme de Ação', unlocked: cTG('filme', ['ação','action']) >= 1 },
            { diff: 'medio', name: 'Explosão Total', icon: '🧨', req: '10 Filmes de Ação', unlocked: cTG('filme', ['ação','action']) >= 10 },
            { diff: 'dificil', name: 'Herói de Ação', icon: '🏍️', req: '25 Filmes de Ação', unlocked: cTG('filme', ['ação','action']) >= 25 },
            { diff: 'facil', name: 'Boas Risadas', icon: '😂', req: '1 Filme de Comédia', unlocked: cTG('filme', ['comédia','comedy']) >= 1 },
            { diff: 'medio', name: 'Stand-up', icon: '🎤', req: '10 Filmes de Comédia', unlocked: cTG('filme', ['comédia','comedy']) >= 10 },
            { diff: 'dificil', name: 'Palhaço da Turma', icon: '🤡', req: '25 Filmes de Comédia', unlocked: cTG('filme', ['comédia','comedy']) >= 25 },
            { diff: 'facil', name: 'Lenço de Papel', icon: '😢', req: '1 Filme de Drama', unlocked: cTG('filme', ['drama']) >= 1 },
            { diff: 'medio', name: 'Rio de Lágrimas', icon: '🌊', req: '10 Filmes de Drama', unlocked: cTG('filme', ['drama']) >= 10 },
            { diff: 'dificil', name: 'Carga Emocional', icon: '🌧️', req: '25 Filmes de Drama', unlocked: cTG('filme', ['drama']) >= 25 },
            { diff: 'facil', name: 'Frio na Espinha', icon: '👻', req: '1 Filme de Terror', unlocked: cTG('filme', ['terror','horror']) >= 1 },
            { diff: 'medio', name: 'Pesadelo Real', icon: '🧟', req: '10 Filmes de Terror', unlocked: cTG('filme', ['terror','horror']) >= 10 },
            { diff: 'dificil', name: 'Sobrevivente', icon: '🪓', req: '25 Filmes de Terror', unlocked: cTG('filme', ['terror','horror']) >= 25 },
            { diff: 'facil', name: 'Futuro Distópico', icon: '🛸', req: '1 Filme Sci-Fi', unlocked: cTG('filme', ['ficção','sci-fi','science']) >= 1 },
            { diff: 'medio', name: 'Viagem Estelar', icon: '🚀', req: '10 Filmes Sci-Fi', unlocked: cTG('filme', ['ficção','sci-fi','science']) >= 10 },
            { diff: 'dificil', name: 'Explorador Espacial', icon: '🌌', req: '25 Filmes Sci-Fi', unlocked: cTG('filme', ['ficção','sci-fi','science']) >= 25 },
            { diff: 'facil', name: 'Coração Quentinho', icon: '💌', req: '1 Filme de Romance', unlocked: cTG('filme', ['romance','love']) >= 1 },
            { diff: 'medio', name: 'Apaixonado', icon: '💘', req: '10 Filmes Romance', unlocked: cTG('filme', ['romance','love']) >= 10 },
            { diff: 'facil', name: 'Mundo Mágico', icon: '🧙‍♂️', req: '1 Filme Fantasia', unlocked: cTG('filme', ['fantasia','fantasy']) >= 1 },
            { diff: 'facil', name: 'Criança Interior', icon: '🧸', req: '1 Animação', unlocked: cTG('filme', ['animação','animation']) >= 1 },
            { diff: 'medio', name: 'Magia Pura', icon: '✨', req: '10 Animações', unlocked: cTG('filme', ['animação','animation']) >= 10 },
            { diff: 'facil', name: 'Mistério Solucionado', icon: '🔎', req: '1 Filme Policial/Suspense', unlocked: cTG('filme', ['policial','crime','investigação','suspense','mystery']) >= 1 },
            { diff: 'medio', name: 'Clássicos 70s', icon: '🪩', req: '5 Filmes dos Anos 70', unlocked: listToEvaluate.filter(x=>(x.status||'').toLowerCase() === 'visto' && (x.type||'').toLowerCase() === 'filme' && parseInt(x.releaseYear)>=1970 && parseInt(x.releaseYear)<=1979).length >= 5 },
            { diff: 'medio', name: 'Anos Dourados', icon: '📻', req: '5 Filmes dos Anos 80', unlocked: listToEvaluate.filter(x=>(x.status||'').toLowerCase() === 'visto' && (x.type||'').toLowerCase() === 'filme' && parseInt(x.releaseYear)>=1980 && parseInt(x.releaseYear)<=1989).length >= 5 },
            { diff: 'medio', name: 'Nostalgia 90s', icon: '📼', req: '10 Filmes dos Anos 90', unlocked: listToEvaluate.filter(x=>(x.status||'').toLowerCase() === 'visto' && (x.type||'').toLowerCase() === 'filme' && parseInt(x.releaseYear)>=1990 && parseInt(x.releaseYear)<=1999).length >= 10 },
            { diff: 'facil', name: 'Anos 2000', icon: '💿', req: '10 Filmes dos Anos 00', unlocked: listToEvaluate.filter(x=>(x.status||'').toLowerCase() === 'visto' && (x.type||'').toLowerCase() === 'filme' && parseInt(x.releaseYear)>=2000 && parseInt(x.releaseYear)<=2009).length >= 10 },
            { diff: 'facil', name: 'Obra-Prima', icon: '👑', req: '1 Filme Nota 5', unlocked: cRate('filme', 5) >= 1 },
            { diff: 'medio', name: 'Gosto Exigente', icon: '💎', req: '10 Filmes Nota 5', unlocked: cRate('filme', 5) >= 10 },
            { diff: 'facil', name: 'Decepção', icon: '🗑️', req: '1 Filme Nota 1', unlocked: cRate('filme', 1) >= 1 },
            { diff: 'medio', name: 'Cinemateca', icon: '🎞️', req: '5 Filmes Favoritos', unlocked: cFav('filme') >= 5 },
            { diff: 'dificil', name: 'Hall da Fama', icon: '🖼️', req: '15 Filmes Favoritos', unlocked: cFav('filme') >= 15 },
            { diff: 'facil', name: 'Piloto Aprovado', icon: '📺', req: '1 Série Finalizada', unlocked: sVistos >= 1 },
            { diff: 'facil', name: 'Temporada Renovada', icon: '📅', req: '5 Séries Finalizadas', unlocked: sVistos >= 5 },
            { diff: 'medio', name: 'Serial Killer', icon: '🔪', req: '10 Séries Finalizadas', unlocked: sVistos >= 10 },
            { diff: 'medio', name: 'Viciado em Cliffhangers', icon: '😱', req: '25 Séries Finalizadas', unlocked: sVistos >= 25 },
            { diff: 'dificil', name: 'Controle Remoto', icon: '🎛️', req: '50 Séries Finalizadas', unlocked: sVistos >= 50 },
            { diff: 'ultra', name: 'Dono da Emissora', icon: '📡', req: '100 Séries Finalizadas', unlocked: sVistos >= 100 },
            { diff: 'medio', name: 'Assistindo Tudo', icon: '👀', req: '5 Status "Assistindo"', unlocked: listToEvaluate.filter(x=>(x.status||'').toLowerCase()==='assistindo' && (x.type||'').toLowerCase()==='série').length >= 5 },
            { diff: 'dificil', name: 'O Polvo', icon: '🐙', req: '10 Status "Assistindo"', unlocked: listToEvaluate.filter(x=>(x.status||'').toLowerCase()==='assistindo' && (x.type||'').toLowerCase()==='série').length >= 10 },
            { diff: 'facil', name: 'Cancelada Cedo', icon: '✂️', req: '1 Abandonada', unlocked: listToEvaluate.filter(x=>(x.status||'').toLowerCase()==='abandonado' && (x.type||'').toLowerCase()==='série').length >= 1 },
            { diff: 'medio', name: 'Perdeu a Graça', icon: '📉', req: '5 Abandonadas', unlocked: listToEvaluate.filter(x=>(x.status||'').toLowerCase()==='abandonado' && (x.type||'').toLowerCase()==='série').length >= 5 },
            { diff: 'facil', name: 'Minissérie', icon: '🤏', req: 'Série Finalizada <=10 eps', unlocked: cEpsCurto('série', 10) >= 1 },
            { diff: 'medio', name: 'Crítico de TV', icon: '🌟', req: '5 Séries Nota 5', unlocked: cRate('série', 5) >= 5 },
            { diff: 'dificil', name: 'Avaliador Mestre', icon: '💯', req: '25 Séries Nota 5', unlocked: cRate('série', 5) >= 25 },
            { diff: 'facil', name: 'Tempo Perdido', icon: '⌛', req: '1 Série Nota 1', unlocked: cRate('série', 1) >= 1 },
            { diff: 'facil', name: 'Sitcom', icon: '🛋️', req: '1 Série Comédia', unlocked: cTG('série', ['comédia','comedy','sitcom']) >= 1 },
            { diff: 'medio', name: 'Risada de Fundo', icon: '😆', req: '5 Séries Comédia', unlocked: cTG('série', ['comédia','comedy','sitcom']) >= 5 },
            { diff: 'dificil', name: 'Rei do Stand-up', icon: '🎤', req: '15 Séries Comédia', unlocked: cTG('série', ['comédia','comedy','sitcom']) >= 15 },
            { diff: 'facil', name: 'Tensão no Ar', icon: '🎭', req: '1 Série Drama', unlocked: cTG('série', ['drama']) >= 1 },
            { diff: 'medio', name: 'Emmy Winner', icon: '🏆', req: '5 Séries Drama', unlocked: cTG('série', ['drama']) >= 5 },
            { diff: 'dificil', name: 'Novela Pessoal', icon: '😭', req: '15 Séries Drama', unlocked: cTG('série', ['drama']) >= 15 },
            { diff: 'facil', name: 'Além da Imaginação', icon: '👽', req: '1 Série Sci-Fi/Fantasia', unlocked: cTG('série', ['ficção','sci-fi','science','fantasia']) >= 1 },
            { diff: 'medio', name: 'Multiverso', icon: '🌌', req: '5 Séries Sci-Fi', unlocked: cTG('série', ['ficção','sci-fi','science','fantasia']) >= 5 },
            { diff: 'dificil', name: 'Buraco Negro', icon: '🛸', req: '15 Séries Sci-Fi', unlocked: cTG('série', ['ficção','sci-fi','science','fantasia']) >= 15 },
            { diff: 'facil', name: 'Detetive Particular', icon: '🕵️', req: '1 Série Investigação', unlocked: cTG('série', ['policial','crime','investigação','mystery']) >= 1 },
            { diff: 'medio', name: 'Arquivo Frio', icon: '📂', req: '5 Séries Investigação', unlocked: cTG('série', ['policial','crime','investigação','mystery']) >= 5 },
            { diff: 'dificil', name: 'Xerife', icon: '🚨', req: '15 Séries Investigação', unlocked: cTG('série', ['policial','crime','investigação','mystery']) >= 15 },
            { diff: 'facil', name: 'Capa e Espada', icon: '🦸', req: '1 Série Heróis/Ação', unlocked: cTG('série', ['herói','hero','ação','action']) >= 1 },
            { diff: 'medio', name: 'Vingador', icon: '🛡️', req: '5 Séries de Heróis', unlocked: cTG('série', ['herói','hero','ação','action']) >= 5 },
            { diff: 'facil', name: 'Documentarista', icon: '🎥', req: '1 Série Documentário', unlocked: cTG('série', ['documentário','doc','reality']) >= 1 },
            { diff: 'medio', name: 'Verdade Nua e Crua', icon: '📰', req: '5 Documentários', unlocked: cTG('série', ['documentário','doc','reality']) >= 5 },
            { diff: 'facil', name: 'Susto em Partes', icon: '🔪', req: '1 Série de Terror', unlocked: cTG('série', ['terror','horror']) >= 1 },
            { diff: 'medio', name: 'Insônia', icon: '🫣', req: '5 Séries de Terror', unlocked: cTG('série', ['terror','horror']) >= 5 },
            { diff: 'facil', name: 'Apaixonado', icon: '💘', req: '1 Série de Romance', unlocked: cTG('série', ['romance','love']) >= 1 },
            { diff: 'medio', name: 'Cupido', icon: '🏹', req: '5 Séries de Romance', unlocked: cTG('série', ['romance','love']) >= 5 },
            { diff: 'facil', name: 'Maratona Leve', icon: '🏃', req: 'Série com >20 eps', unlocked: cEps('série', 20) >= 1 },
            { diff: 'medio', name: 'Noites em Claro', icon: '🦉', req: 'Série com >50 eps', unlocked: cEps('série', 50) >= 1 },
            { diff: 'dificil', name: 'Uma Vida Inteira', icon: '👴', req: 'Série com >100 eps', unlocked: cEps('série', 100) >= 1 },
            { diff: 'ultra', name: 'Imortal', icon: '🧬', req: 'Série com >300 eps', unlocked: cEps('série', 300) >= 1 },
            { diff: 'facil', name: 'Fã de Carteirinha', icon: '🎫', req: '1 Série Favorita', unlocked: cFav('série') >= 1 },
            { diff: 'medio', name: 'Altar das Séries', icon: '⛩️', req: '5 Séries Favoritas', unlocked: cFav('série') >= 5 },
            { diff: 'dificil', name: 'Hall da Fama da TV', icon: '⭐', req: '15 Séries Favoritas', unlocked: cFav('série') >= 15 },
            { diff: 'facil', name: 'Anotador', icon: '✍️', req: 'Escrever 1 Análise', unlocked: countCommentsTotal(listToEvaluate) >= 1 },
            { diff: 'medio', name: 'Crítico Pessoal', icon: '📝', req: 'Escrever 10 Análises', unlocked: countCommentsTotal(listToEvaluate) >= 10 },
            { diff: 'dificil', name: 'Reviewer Profissional', icon: '🗞️', req: 'Escrever 25 Análises', unlocked: countCommentsTotal(listToEvaluate) >= 25 },
            { diff: 'facil', name: 'Diário de Bordo', icon: '📖', req: '1 Sessão (Temporada)', unlocked: listToEvaluate.some(g => g.sessions && g.sessions.length > 0) },
            { diff: 'medio', name: 'Rotina de TV', icon: '📆', req: '15 Sessões (Temporada)', unlocked: listToEvaluate.reduce((acc, g) => acc + (g.sessions?.length || 0), 0) >= 15 },
            { diff: 'dificil', name: 'Lista Negra', icon: '💀', req: '1 Obra na Lista Negra', unlocked: deathListData.some(d => d.name !== '') }
        ];
   } else if (statsMediaType === 'animes') {
        const animes = listToEvaluate.filter(g => (g.type || 'Anime') === 'Anime');
        const desenhos = listToEvaluate.filter(g => (g.type || '') === 'Desenho');
        const filmes = listToEvaluate.filter(g => (g.type || '') === 'Filme OVA');

        badgesData = [
            { diff: 'facil', name: 'Otaku Starter', icon: '🌱', req: 'Adicionar o 1º Anime', unlocked: animes.length >= 1 },
            { diff: 'facil', name: 'Primeiro Episódio', icon: '📺', req: 'Completar 1 Anime', unlocked: countStatusTotal(animes, 'visto') >= 1 },
            { diff: 'medio', name: 'Genin', icon: '🥷', req: 'Completar 10 Animes', unlocked: countStatusTotal(animes, 'visto') >= 10 },
            { diff: 'medio', name: 'Chuunin', icon: '⚔️', req: 'Completar 25 Animes', unlocked: countStatusTotal(animes, 'visto') >= 25 },
            { diff: 'dificil', name: 'Jounin', icon: '🦅', req: 'Completar 50 Animes', unlocked: countStatusTotal(animes, 'visto') >= 50 },
            { diff: 'ultra', name: 'Hokage', icon: '⛩️', req: 'Completar 100 Animes', unlocked: countStatusTotal(animes, 'visto') >= 100 },
            { diff: 'facil', name: 'Acumulador de Plantão', icon: '📚', req: '20 Animes na Watchlist', unlocked: countStatusTotal(animes, 'watchlist') >= 20 },
            { diff: 'medio', name: 'Colecionador Otaku', icon: '📦', req: '50 Animes na Watchlist', unlocked: countStatusTotal(animes, 'watchlist') >= 50 },
            { diff: 'facil', name: 'Vício na Temporada', icon: '🔥', req: 'Assistir 5 Animes ao mesmo tempo', unlocked: countStatusTotal(animes, 'assistindo') >= 5 },
            { diff: 'medio', name: 'Dropei com Força', icon: '✂️', req: 'Abandonar 5 Animes', unlocked: countStatusTotal(animes, 'abandonado') >= 5 },
            { diff: 'facil', name: 'Waifu / Husbando', icon: '💘', req: 'Favoritar 1 Anime', unlocked: countFavTotal(animes) >= 1 },
            { diff: 'medio', name: 'Harém Formado', icon: '💍', req: 'Favoritar 10 Animes', unlocked: countFavTotal(animes) >= 10 },
            { diff: 'dificil', name: 'Altar Otaku', icon: '✨', req: 'Favoritar 25 Animes', unlocked: countFavTotal(animes) >= 25 },
            { diff: 'facil', name: 'É Mais de 8000!', icon: '💥', req: 'Dar Nota 5 para 1 Anime', unlocked: countRateTotal(animes, 5) >= 1 },
            { diff: 'medio', name: 'Perfeição Animada', icon: '🏆', req: 'Dar Nota 5 para 10 Animes', unlocked: countRateTotal(animes, 5) >= 10 },
            { diff: 'facil', name: 'Essa Foi de F*der', icon: '📉', req: 'Dar Nota 1 para 1 Anime', unlocked: countRateTotal(animes, 1) >= 1 },
            { diff: 'medio', name: 'Omae Wa Mou Shindeiru', icon: '👁️', req: 'Avaliar 25 Animes', unlocked: animes.filter(g => parseFloat(g.rating) > 0).length >= 25 },
            { diff: 'dificil', name: 'Bankai', icon: '🗡️', req: 'Avaliar 50 Animes', unlocked: animes.filter(g => parseFloat(g.rating) > 0).length >= 50 },
            { diff: 'dificil', name: 'Domínio Expansivo', icon: '🤞', req: '5 Animes Fav + Nota 5', unlocked: animes.filter(g => g.isFavorite && parseFloat(g.rating) === 5).length >= 5 },
            { diff: 'facil', name: 'O Poder da Amizade', icon: '👊', req: '5 Animes Shounen/Ação', unlocked: countGen(animes, ['shounen', 'ação', 'action']) >= 5 },
            { diff: 'medio', name: 'Arco de Torneio', icon: '🏟️', req: '10 Animes Shounen/Ação', unlocked: countGen(animes, ['shounen', 'ação', 'action']) >= 10 },
            { diff: 'facil', name: 'Coração Palpitante', icon: '💌', req: '5 Animes Shoujo/Romance', unlocked: countGen(animes, ['shoujo', 'romance']) >= 5 },
            { diff: 'facil', name: 'Tsundere Alert', icon: '😠', req: '10 Animes de Romance', unlocked: countGen(animes, ['romance', 'shoujo']) >= 10 },
            { diff: 'medio', name: 'Caminhão-kun Ataca!', icon: '🚚', req: '5 Animes Isekai/Fantasia', unlocked: countGen(animes, ['isekai', 'fantasia', 'fantasy']) >= 5 },
            { diff: 'dificil', name: 'Rei Demônio', icon: '👑', req: '15 Animes Isekai/Fantasia', unlocked: countGen(animes, ['isekai', 'fantasia', 'fantasy']) >= 15 },
            { diff: 'medio', name: 'Mecha Piloto', icon: '🤖', req: '3 Animes Mecha/Robô', unlocked: countGen(animes, ['mecha', 'robô']) >= 3 },
            { diff: 'dificil', name: 'Gundam Master', icon: '🦾', req: '10 Animes Mecha/Robô', unlocked: countGen(animes, ['mecha', 'robô']) >= 10 },
            { diff: 'medio', name: 'Clube Escolar', icon: '☕', req: '5 Slice of Life/Escolar', unlocked: countGen(animes, ['slice', 'escolar', 'school']) >= 5 },
            { diff: 'dificil', name: 'Festival Cultural', icon: '🎆', req: '15 Slice of Life/Escolar', unlocked: countGen(animes, ['slice', 'escolar', 'school']) >= 15 },
            { diff: 'medio', name: 'Zona do Medo', icon: '👻', req: '3 Animes de Terror/Gore', unlocked: countGen(animes, ['terror', 'horror', 'gore']) >= 3 },
            { diff: 'dificil', name: 'Sobrevivente', icon: '🩸', req: '10 Animes de Terror/Gore', unlocked: countGen(animes, ['terror', 'horror', 'gore']) >= 10 },
            { diff: 'medio', name: 'Pelo Poder do Prisma', icon: '✨', req: '3 Mahou Shoujo/Magia', unlocked: countGen(animes, ['mahou', 'magia', 'magic']) >= 3 },
            { diff: 'medio', name: 'Campeonato Nacional', icon: '🏐', req: '3 Animes de Esporte', unlocked: countGen(animes, ['esporte', 'sports']) >= 3 },
            { diff: 'medio', name: 'Gênio Investigador', icon: '🧠', req: '3 Mistério/Psicológico', unlocked: countGen(animes, ['mistério', 'mystery', 'psicológico']) >= 3 },
            { diff: 'medio', name: 'Rindo Até Chorar', icon: '😂', req: '5 Animes de Comédia', unlocked: countGen(animes, ['comédia', 'comedy']) >= 5 },
            { diff: 'dificil', name: 'Clube de Comédia', icon: '🤡', req: '15 Animes de Comédia', unlocked: countGen(animes, ['comédia', 'comedy']) >= 15 },
            { diff: 'medio', name: 'Futuro Cyberpunk', icon: '🔌', req: '3 Sci-Fi/Cyberpunk', unlocked: countGen(animes, ['sci-fi', 'cyberpunk']) >= 3 },
            { diff: 'facil', name: 'Ídolo Pop', icon: '🎤', req: '3 Animes de Música/Idol', unlocked: countGen(animes, ['música', 'music', 'idol']) >= 3 },
            { diff: 'medio', name: 'Lágrimas de Chuva', icon: '😭', req: '5 Animes de Drama', unlocked: countGen(animes, ['drama', 'tragédia']) >= 5 },
            { diff: 'facil', name: 'Batalha de Cartas', icon: '🃏', req: '2 Animes de Jogos', unlocked: countGen(animes, ['jogos', 'cartas', 'game']) >= 2 },
            { diff: 'medio', name: 'Episódio da Praia', icon: '🏖️', req: '10 de Ecchi ou Comédia', unlocked: countGen(animes, ['ecchi', 'comédia', 'comedy']) >= 10 },
            { diff: 'facil', name: 'Cineasta de Tóquio', icon: '🎬', req: '5 Filmes/OVAs Vistos', unlocked: countStatusTotal(filmes, 'visto') >= 5 },
            { diff: 'medio', name: 'Ghibli Vibes', icon: '🌲', req: '10 Filmes/OVAs Vistos', unlocked: countStatusTotal(filmes, 'visto') >= 10 },
            { diff: 'facil', name: 'Shorts Lover', icon: '⏱️', req: '5 Animes Curtos (<15 eps)', unlocked: animes.filter(g => (g.status||'').toLowerCase() === 'visto' && g.epTotal <= 15).length >= 5 },
            { diff: 'medio', name: 'Caçador de Fillers', icon: '🍜', req: 'Ver 1 Anime com >200 eps', unlocked: hasLongTotal(animes, 200) },
            { diff: 'dificil', name: 'O Grande Pirata', icon: '🏴‍☠️', req: 'Ver 1 Anime com >500 eps', unlocked: hasLongTotal(animes, 500) },
            { diff: 'facil', name: 'Centurião Otaku', icon: '💯', req: '100 Eps Vistos', unlocked: countEpsTotal(animes) >= 100 },
            { diff: 'medio', name: 'Senhor dos Mil', icon: '👑', req: '1.000 Eps Vistos', unlocked: countEpsTotal(animes) >= 1000 },
            { diff: 'ultra', name: 'Além da Matriz', icon: '🌌', req: '5.000 Eps Vistos', unlocked: countEpsTotal(animes) >= 5000 },
            { diff: 'ultra', name: 'Deus do Shounen', icon: '⛰️', req: '10.000 Eps Vistos', unlocked: countEpsTotal(animes) >= 10000 },
            { diff: 'facil', name: 'Tempo no Isekai', icon: '⏳', req: '100 Horas Assistidas', unlocked: countHoursTotal(animes) >= 100 },
            { diff: 'medio', name: 'Absorvido pela Tela', icon: '🧟', req: '250 Horas Assistidas', unlocked: countHoursTotal(animes) >= 250 },
            { diff: 'dificil', name: 'Sem Dormir', icon: '🦉', req: '500 Horas Assistidas', unlocked: countHoursTotal(animes) >= 500 },
            { diff: 'ultra', name: 'Za Warudo!', icon: '⏱️', req: '1.000 Horas Assistidas', unlocked: countHoursTotal(animes) >= 1000 },
            { diff: 'facil', name: 'Re-Assistidor Lenda', icon: '🔁', req: 'Reassistir 1 Anime', unlocked: animes.some(g => g.watchCount > 1) },
            { diff: 'medio', name: 'Loop Temporal', icon: '🌀', req: '5 Reassistidas Totais', unlocked: countRewatchTotal(animes) >= 5 },
            { diff: 'medio', name: 'Culto aos 80s', icon: '📼', req: '3 Animes dos anos 80', unlocked: countDecTotal(animes, 1980) >= 3 },
            { diff: 'medio', name: 'Nostalgia 90s', icon: '📻', req: '5 Animes dos anos 90', unlocked: countDecTotal(animes, 1990) >= 5 },
            { diff: 'facil', name: 'Geração 2000', icon: '💿', req: '10 Animes dos anos 00', unlocked: countDecTotal(animes, 2000) >= 10 },
            { diff: 'dificil', name: 'Plus Ultra!', icon: '💪', req: 'Animes de 3 Décadas', unlocked: [1980,1990,2000,2010,2020].filter(d => countDecTotal(animes, d) > 0).length >= 3 },
            { diff: 'facil', name: 'Radar Otaku', icon: '📡', req: 'Ter 1 Estreia Aguardada', unlocked: aguardados.length >= 1 },
            { diff: 'facil', name: 'Sábado de Manhã', icon: '☀️', req: 'Completar 1 Desenho', unlocked: countStatusTotal(desenhos, 'visto') >= 1 },
            { diff: 'facil', name: 'Criança Interior', icon: '🧸', req: 'Completar 10 Desenhos', unlocked: countStatusTotal(desenhos, 'visto') >= 10 },
            { diff: 'medio', name: 'Fã de Carteirinha', icon: '🎫', req: 'Completar 25 Desenhos', unlocked: countStatusTotal(desenhos, 'visto') >= 25 },
            { diff: 'dificil', name: 'Especialista em Animação', icon: '🎨', req: 'Completar 50 Desenhos', unlocked: countStatusTotal(desenhos, 'visto') >= 50 },
            { diff: 'ultra', name: 'Lenda do Sofá', icon: '🛋️', req: 'Completar 100 Desenhos', unlocked: countStatusTotal(desenhos, 'visto') >= 100 },
            { diff: 'ultra', name: 'O Avatar', icon: '🧘', req: 'Ter 100 Desenhos Cadastrados', unlocked: desenhos.length >= 100 },
            { diff: 'facil', name: 'Pulei de Canal', icon: '📺', req: 'Abandonar 3 Desenhos', unlocked: countStatusTotal(desenhos, 'abandonado') >= 3 },
            { diff: 'facil', name: 'Maratonando', icon: '👀', req: 'Assistir 5 Desenhos ao msm tempo', unlocked: countStatusTotal(desenhos, 'assistindo') >= 5 },
            { diff: 'facil', name: 'Lista de Desejos', icon: '📝', req: '10 Desenhos na Watchlist', unlocked: countStatusTotal(desenhos, 'watchlist') >= 10 },
            { diff: 'facil', name: 'Pipoca Americana', icon: '💥', req: 'Dar Nota 5 para 1 Desenho', unlocked: countRateTotal(desenhos, 5) >= 1 },
            { diff: 'medio', name: 'Calçada da Fama', icon: '⭐', req: 'Dar Nota 5 para 5 Desenhos', unlocked: countRateTotal(desenhos, 5) >= 5 },
            { diff: 'facil', name: 'Ruína da Infância', icon: '🗑️', req: 'Dar Nota 1 para 1 Desenho', unlocked: countRateTotal(desenhos, 1) >= 1 },
            { diff: 'facil', name: 'Favorito do Peito', icon: '💘', req: 'Favoritar 1 Desenho', unlocked: countFavTotal(desenhos) >= 1 },
            { diff: 'medio', name: 'Baú de Brinquedos', icon: '🎁', req: 'Favoritar 10 Desenhos', unlocked: countFavTotal(desenhos) >= 10 },
            { diff: 'dificil', name: 'Acervo Cartoon', icon: '🏰', req: 'Favoritar 25 Desenhos', unlocked: countFavTotal(desenhos) >= 25 },
            { diff: 'facil', name: 'Toon Force', icon: '🤪', req: '5 de Comédia/Aventura', unlocked: countGen(desenhos, ['comédia', 'comedy', 'aventura']) >= 5 },
            { diff: 'medio', name: 'Acme Corp', icon: '🧨', req: '10 de Comédia/Slapstick', unlocked: countGen(desenhos, ['comédia', 'comedy', 'humor']) >= 10 },
            { diff: 'facil', name: 'Herói de Quadrinhos', icon: '🦇', req: '3 Super-heróis/Ação', unlocked: countGen(desenhos, ['super-herói', 'herói', 'ação', 'action']) >= 3 },
            { diff: 'medio', name: 'Liga da Justiça', icon: '🛡️', req: '10 Super-heróis/Ação', unlocked: countGen(desenhos, ['super-herói', 'herói', 'ação', 'action']) >= 10 },
            { diff: 'facil', name: 'Magia do Rato', icon: '🐭', req: '5 de Família/Magia', unlocked: countGen(desenhos, ['família', 'family', 'magia', 'fantasia']) >= 5 },
            { diff: 'medio', name: 'Humor Ácido', icon: '🍻', req: '3 de Humor Adulto/Sátira', unlocked: countGen(desenhos, ['adulto', 'adult', 'humor negro', 'sátira']) >= 3 },
            { diff: 'dificil', name: 'Stand-Up Animado', icon: '🍺', req: '10 de Humor Adulto/Sátira', unlocked: countGen(desenhos, ['adulto', 'adult', 'humor negro', 'sátira']) >= 10 },
            { diff: 'facil', name: 'Mistério S.A.', icon: '🐕', req: '3 de Mistério/Detetive', unlocked: countGen(desenhos, ['mistério', 'mystery', 'detetive']) >= 3 },
            { diff: 'facil', name: 'Sci-Fi Ocidental', icon: '🚀', req: '3 de Sci-Fi/Espaço', unlocked: countGen(desenhos, ['sci-fi', 'espaço', 'space']) >= 3 },
            { diff: 'medio', name: 'Vilão da Semana', icon: '😈', req: 'Ver 3 Desenhos Ação/Aventura', unlocked: countGen(desenhos, ['ação', 'action', 'aventura', 'adventure']) >= 3 },
            { diff: 'medio', name: 'Mestre dos Elementos', icon: '🌪️', req: 'Desenho Visto (>50 eps & Nota >= 4)', unlocked: desenhos.some(g => (g.status||'').toLowerCase()==='visto' && g.epTotal > 50 && g.rating >= 4) },
            { diff: 'facil', name: 'Anos 80 Animado', icon: '🎸', req: '3 Desenhos dos anos 80', unlocked: countDecTotal(desenhos, 1980) >= 3 },
            { diff: 'medio', name: 'Era de Ouro', icon: '📼', req: '5 Desenhos dos anos 90', unlocked: countDecTotal(desenhos, 1990) >= 5 },
            { diff: 'medio', name: 'Geração Nick', icon: '🧡', req: '10 Desenhos dos anos 00', unlocked: countDecTotal(desenhos, 2000) >= 10 },
            { diff: 'medio', name: 'Binge-Watcher', icon: '🍕', req: 'Ver Desenho com >100 eps', unlocked: hasLongTotal(desenhos, 100) },
            { diff: 'dificil', name: 'Família Amarela', icon: '🍩', req: 'Ver Desenho com >300 eps', unlocked: hasLongTotal(desenhos, 300) },
            { diff: 'facil', name: 'Re-Assistindo Clássicos', icon: '🔙', req: 'Reassistir 1 Desenho', unlocked: desenhos.some(g => g.watchCount > 1) },
            { diff: 'medio', name: 'Preso na TV', icon: '🔁', req: '5 Reassistidas em Desenhos', unlocked: countRewatchTotal(desenhos) >= 5 },
            { diff: 'facil', name: 'Centena Animada', icon: '💯', req: '100 Eps de Desenhos', unlocked: countEpsTotal(desenhos) >= 100 },
            { diff: 'medio', name: 'Mil Eps Ocidentais', icon: '🗺️', req: '1.000 Eps de Desenhos', unlocked: countEpsTotal(desenhos) >= 1000 },
            { diff: 'dificil', name: 'Além dos Quadrinhos', icon: '🦸', req: '2.500 Eps de Desenhos', unlocked: countEpsTotal(desenhos) >= 2500 },
            { diff: 'facil', name: 'Sessão Matinal', icon: '🥣', req: '50 Horas de Desenhos', unlocked: countHoursTotal(desenhos) >= 50 },
            { diff: 'medio', name: 'Férias Escolares', icon: '🛹', req: '150 Horas de Desenhos', unlocked: countHoursTotal(desenhos) >= 150 },
            { diff: 'ultra', name: 'Animação é Cinema!', icon: '🎥', req: '300 Horas de Desenhos', unlocked: countHoursTotal(desenhos) >= 300 }
        ];
   } else if (statsMediaType === 'jogos') {
        const jogos = listToEvaluate.filter(g => (g.type || '') === 'Jogo');
        badgesData = [
            // 1. Quantidades de Biblioteca e Status
            { diff: 'facil', name: 'Start Game', icon: '🎮', req: 'Adicionar o 1º Jogo', unlocked: jogos.length >= 1 },
            { diff: 'facil', name: 'Colecionador Iniciante', icon: '🕹️', req: 'Adicionar 10 Jogos', unlocked: jogos.length >= 10 },
            { diff: 'medio', name: 'Biblioteca Cheia', icon: '📚', req: 'Adicionar 50 Jogos', unlocked: jogos.length >= 50 },
            { diff: 'dificil', name: 'Arquivo Digital', icon: '🏛️', req: 'Adicionar 100 Jogos', unlocked: jogos.length >= 100 },
            { diff: 'facil', name: 'Primeiro Zeramento', icon: '🏆', req: 'Zerado 1 Jogo', unlocked: countStatusTotal(jogos, 'visto') >= 1 },
            { diff: 'facil', name: 'Ganhando Ritmo', icon: '🏅', req: 'Zerado 5 Jogos', unlocked: countStatusTotal(jogos, 'visto') >= 5 },
            { diff: 'medio', name: 'Caçador de Troféus', icon: '🥇', req: 'Zerado 10 Jogos', unlocked: countStatusTotal(jogos, 'visto') >= 10 },
            { diff: 'dificil', name: 'Platinador', icon: '💎', req: 'Zerado 25 Jogos', unlocked: countStatusTotal(jogos, 'visto') >= 25 },
            { diff: 'ultra', name: 'Deus do Joystick', icon: '⚡', req: 'Zerado 50 Jogos', unlocked: countStatusTotal(jogos, 'visto') >= 50 },
            { diff: 'ultra', name: 'Zerador Implacável', icon: '👑', req: 'Zerado 100 Jogos', unlocked: countStatusTotal(jogos, 'visto') >= 100 },
            { diff: 'facil', name: 'Wishlist', icon: '🛒', req: '10 Jogos na Watchlist', unlocked: countStatusTotal(jogos, 'watchlist') >= 10 },
            { diff: 'medio', name: 'O Peso da Biblioteca', icon: '📦', req: '50 Jogos na Watchlist', unlocked: countStatusTotal(jogos, 'watchlist') >= 50 },
            { diff: 'dificil', name: 'Acumulador Compulsivo', icon: '🛍️', req: '100 Jogos na Watchlist', unlocked: countStatusTotal(jogos, 'watchlist') >= 100 },
            { diff: 'facil', name: 'Jogando de Tudo', icon: '👀', req: 'Assistindo (Jogando) 5', unlocked: countStatusTotal(jogos, 'assistindo') >= 5 },
            { diff: 'facil', name: 'Rage Quit', icon: '💥', req: 'Abandonar 1 Jogo', unlocked: countStatusTotal(jogos, 'abandonado') >= 1 },
            { diff: 'medio', name: 'Sem Tempo Irmão', icon: '🗑️', req: 'Abandonar 5 Jogos', unlocked: countStatusTotal(jogos, 'abandonado') >= 5 },
            
            // 2. Avaliações e Favoritos
            { diff: 'facil', name: 'Favorito da Vida', icon: '❤️', req: 'Favoritar 1 Jogo', unlocked: countFavTotal(jogos) >= 1 },
            { diff: 'medio', name: 'Top 5 Pessoal', icon: '💖', req: 'Favoritar 5 Jogos', unlocked: countFavTotal(jogos) >= 5 },
            { diff: 'dificil', name: 'Hall da Fama', icon: '🏛️', req: 'Favoritar 10 Jogos', unlocked: countFavTotal(jogos) >= 10 },
            { diff: 'facil', name: 'Absolute Video Game', icon: '🌟', req: 'Dar Nota 10 para 1 Jogo', unlocked: countRateTotal(jogos, 10) >= 1 },
            { diff: 'medio', name: 'Crítico Exigente', icon: '🧐', req: 'Dar Nota 10 para 5 Jogos', unlocked: countRateTotal(jogos, 10) >= 5 },
            { diff: 'dificil', name: 'O Panteão', icon: '💯', req: 'Dar Nota 10 para 15 Jogos', unlocked: countRateTotal(jogos, 10) >= 15 },
            { diff: 'facil', name: 'Jogo Quebrado', icon: '🗑️', req: 'Dar Nota 1 para 1 Jogo', unlocked: countRateTotal(jogos, 1) >= 1 },
            { diff: 'medio', name: 'Refund Solicitado', icon: '📉', req: 'Dar Nota 1 para 3 Jogos', unlocked: countRateTotal(jogos, 1) >= 3 },
            { diff: 'facil', name: 'Primeiro Review', icon: '✍️', req: 'Avaliar 1 Jogo', unlocked: jogos.filter(g => parseFloat(g.rating) > 0).length >= 1 },
            { diff: 'medio', name: 'Analista de Metacritic', icon: '📊', req: 'Avaliar 25 Jogos', unlocked: jogos.filter(g => parseFloat(g.rating) > 0).length >= 25 },
            { diff: 'dificil', name: 'Curador Especialista', icon: '🎖️', req: 'Avaliar 50 Jogos', unlocked: jogos.filter(g => parseFloat(g.rating) > 0).length >= 50 },
            { diff: 'dificil', name: 'Jogo Perfeito', icon: '✨', req: 'Jogo Favorito + Nota 10', unlocked: jogos.filter(g => g.isFavorite && parseFloat(g.rating) === 10).length >= 1 },

            // 3. Tempo Jogado
            { diff: 'facil', name: 'Dedicado', icon: '⏳', req: '100 Horas Jogadas', unlocked: countHoursTotal(jogos) >= 100 },
            { diff: 'medio', name: 'Sem Vida Social', icon: '🛋️', req: '250 Horas Jogadas', unlocked: countHoursTotal(jogos) >= 250 },
            { diff: 'dificil', name: 'Noites em Claro', icon: '🧛', req: '500 Horas Jogadas', unlocked: countHoursTotal(jogos) >= 500 },
            { diff: 'ultra', name: 'Lenda Viva', icon: '👑', req: '1.000 Horas Jogadas', unlocked: countHoursTotal(jogos) >= 1000 },
            { diff: 'ultra', name: 'O Matrix', icon: '🌌', req: '2.000 Horas Jogadas', unlocked: countHoursTotal(jogos) >= 2000 },
            { diff: 'ultra', name: 'Viajante do Tempo', icon: '🕰️', req: '5.000 Horas Jogadas', unlocked: countHoursTotal(jogos) >= 5000 },
            { diff: 'dificil', name: 'Jogador Dedicado', icon: '🗓️', req: 'Um jogo com > 100h', unlocked: jogos.some(g => Math.floor(calculateItemTotalMinutes(g)/60) >= 100) },

            // 4. Gêneros: Ação, Aventura, Mundo Aberto
            { diff: 'facil', name: 'Herói de Ação', icon: '⚔️', req: '5 Jogos de Ação', unlocked: countGen(jogos, ['ação', 'action']) >= 5 },
            { diff: 'medio', name: 'Mercenário', icon: '💣', req: '15 Jogos de Ação', unlocked: countGen(jogos, ['ação', 'action']) >= 15 },
            { diff: 'dificil', name: 'Lenda da Ação', icon: '🦸', req: '30 Jogos de Ação', unlocked: countGen(jogos, ['ação', 'action']) >= 30 },
            { diff: 'facil', name: 'Aventureiro', icon: '🗺️', req: '5 Jogos de Aventura', unlocked: countGen(jogos, ['aventura', 'adventure']) >= 5 },
            { diff: 'medio', name: 'Explorador', icon: '🧭', req: '15 Jogos de Aventura', unlocked: countGen(jogos, ['aventura', 'adventure']) >= 15 },
            { diff: 'dificil', name: 'Desbravador', icon: '🏔️', req: '30 Jogos de Aventura', unlocked: countGen(jogos, ['aventura', 'adventure']) >= 30 },
            { diff: 'facil', name: 'Mundo Aberto', icon: '🌍', req: '5 Mundo Aberto', unlocked: countGen(jogos, ['mundo aberto', 'open world']) >= 5 },
            { diff: 'medio', name: 'Sem Limites', icon: '🌌', req: '15 Mundo Aberto', unlocked: countGen(jogos, ['mundo aberto', 'open world']) >= 15 },

            // 5. Gêneros: RPG, Estratégia, Puzzle
            { diff: 'facil', name: 'Iniciante de RPG', icon: '🧙‍♂️', req: '1 Jogo de RPG', unlocked: countGen(jogos, ['rpg']) >= 1 },
            { diff: 'medio', name: 'Mestre do RPG', icon: '🛡️', req: '10 Jogos de RPG', unlocked: countGen(jogos, ['rpg']) >= 10 },
            { diff: 'dificil', name: 'Dragon Slayer', icon: '🐉', req: '25 Jogos de RPG', unlocked: countGen(jogos, ['rpg']) >= 25 },
            { diff: 'facil', name: 'Tático', icon: '♟️', req: '1 Jogo de Estratégia', unlocked: countGen(jogos, ['estratégia', 'strategy', 'rts']) >= 1 },
            { diff: 'medio', name: 'Estrategista', icon: '🧠', req: '5 Jogos de Estratégia', unlocked: countGen(jogos, ['estratégia', 'strategy', 'rts']) >= 5 },
            { diff: 'dificil', name: 'General', icon: '👑', req: '15 Jogos de Estratégia', unlocked: countGen(jogos, ['estratégia', 'strategy', 'rts']) >= 15 },
            { diff: 'facil', name: 'Deck Builder', icon: '🃏', req: '5 Cartas/Puzzle', unlocked: countGen(jogos, ['puzzle', 'cartas', 'card']) >= 5 },

            // 6. Gêneros: Tiro, Sobrevivência, Stealth, Terror
            { diff: 'facil', name: 'Gatilho Rápido', icon: '🔫', req: '5 Jogos de Tiro', unlocked: countGen(jogos, ['tiro', 'shooter', 'fps']) >= 5 },
            { diff: 'medio', name: 'Headshot', icon: '🎯', req: '15 Jogos de Tiro', unlocked: countGen(jogos, ['tiro', 'shooter', 'fps']) >= 15 },
            { diff: 'dificil', name: 'Franco-Atirador', icon: '🎖️', req: '30 Jogos de Tiro', unlocked: countGen(jogos, ['tiro', 'shooter', 'fps']) >= 30 },
            { diff: 'facil', name: 'Na Selva', icon: '🏕️', req: '1 Sobrevivência', unlocked: countGen(jogos, ['sobrevivência', 'survival']) >= 1 },
            { diff: 'medio', name: 'Sobrevivente', icon: '🪓', req: '5 Sobrevivência', unlocked: countGen(jogos, ['sobrevivência', 'survival']) >= 5 },
            { diff: 'facil', name: 'Na Sombra', icon: '🥷', req: '1 Jogo Stealth', unlocked: countGen(jogos, ['stealth', 'furtividade']) >= 1 },
            { diff: 'medio', name: 'Assassino Silencioso', icon: '🗡️', req: '5 Jogos Stealth', unlocked: countGen(jogos, ['stealth', 'furtividade']) >= 5 },
            { diff: 'facil', name: 'Susto Controlado', icon: '🧟', req: '3 Jogos de Terror', unlocked: countGen(jogos, ['terror', 'horror']) >= 3 },
            { diff: 'medio', name: 'Fã de Jumpscare', icon: '👻', req: '10 Jogos de Terror', unlocked: countGen(jogos, ['terror', 'horror']) >= 10 },

            // 7. Gêneros: Esporte, Corrida, Luta, Simulação
            { diff: 'facil', name: 'Atleta de Sofá', icon: '⚽', req: '5 Jogos de Esporte', unlocked: countGen(jogos, ['esporte', 'sports']) >= 5 },
            { diff: 'medio', name: 'Campeão', icon: '🏆', req: '15 Jogos de Esporte', unlocked: countGen(jogos, ['esporte', 'sports']) >= 15 },
            { diff: 'facil', name: 'Pé no Talo', icon: '🏎️', req: '1 Jogo de Corrida', unlocked: countGen(jogos, ['corrida', 'racing', 'forza']) >= 1 },
            { diff: 'medio', name: 'Corredor', icon: '🏁', req: '5 Jogos de Corrida', unlocked: countGen(jogos, ['corrida', 'racing', 'forza']) >= 5 },
            { diff: 'dificil', name: 'Piloto de Fuga', icon: '🚥', req: '15 Jogos de Corrida', unlocked: countGen(jogos, ['corrida', 'racing', 'forza']) >= 15 },
            { diff: 'facil', name: 'Sparring', icon: '🥊', req: '1 Jogo de Luta', unlocked: countGen(jogos, ['luta', 'fighting']) >= 1 },
            { diff: 'medio', name: 'Rei do Combate', icon: '🥋', req: '5 Jogos de Luta', unlocked: countGen(jogos, ['luta', 'fighting']) >= 5 },
            { diff: 'dificil', name: 'Torneio Mortal', icon: '🐉', req: '15 Jogos de Luta', unlocked: countGen(jogos, ['luta', 'fighting']) >= 15 },
            { diff: 'facil', name: 'Simulador Virtual', icon: '✈️', req: '5 Jogos Simulação', unlocked: countGen(jogos, ['simulação', 'simulation', 'sim']) >= 5 },

            // 8. Gêneros: Plataforma, MMO, Co-op
            { diff: 'facil', name: 'Pulo Perfeito', icon: '🦘', req: '5 Plataforma', unlocked: countGen(jogos, ['plataforma', 'platform']) >= 5 },
            { diff: 'medio', name: 'Coelho Encanador', icon: '🍄', req: '15 Plataforma', unlocked: countGen(jogos, ['plataforma', 'platform']) >= 15 },
            { diff: 'facil', name: 'Quebra-Cabeça', icon: '🧩', req: '1 Puzzle', unlocked: countGen(jogos, ['puzzle', 'quebra-cabeça']) >= 1 },
            { diff: 'facil', name: 'Casual Gamer', icon: '🕹️', req: '5 Party/Casual/Indie', unlocked: countGen(jogos, ['casual', 'party', 'indie']) >= 5 },
            { diff: 'facil', name: 'MMO Player', icon: '🌐', req: '1 MMO', unlocked: countGen(jogos, ['mmo', 'multiplayer']) >= 1 },
            { diff: 'medio', name: 'Jogador de Equipe', icon: '🤝', req: '5 Co-op', unlocked: countGen(jogos, ['co-op', 'coop', 'multiplayer']) >= 5 },

            // 9. Retrogaming e Épocas
            { diff: 'facil', name: 'Raízes 8-bit', icon: '👾', req: '5 Jogos dos anos 80', unlocked: countDecTotal(jogos, 1980) >= 5 },
            { diff: 'medio', name: 'Nostalgia 16-bit', icon: '📺', req: '5 Jogos dos anos 90', unlocked: countDecTotal(jogos, 1990) >= 5 },
            { diff: 'medio', name: 'Revolução 3D', icon: '💿', req: '10 Jogos dos anos 00', unlocked: countDecTotal(jogos, 2000) >= 10 },
            { diff: 'medio', name: 'Geração HD', icon: '🎮', req: '10 Jogos dos anos 10', unlocked: countDecTotal(jogos, 2010) >= 10 },
            { diff: 'dificil', name: 'Retrogamer', icon: '🕹️', req: '20 Jogos Clássicos (<2005)', unlocked: jogos.filter(g => g.releaseYear < 2005 && (g.status||'').toLowerCase() === 'visto').length >= 20 },
            { diff: 'dificil', name: 'Historiador', icon: '🕰️', req: 'Jogos de 3 Décadas', unlocked: [1980,1990,2000,2010,2020].filter(d => countDecTotal(jogos, d) > 0).length >= 3 },

            // 10. Funções da Plataforma
            { diff: 'facil', name: 'Hype Train', icon: '🚂', req: '1 Jogo Aguardado', unlocked: aguardadosGamer.length >= 1 },
            { diff: 'medio', name: 'Bilhete de Pré-venda', icon: '🎟️', req: '5 Jogos Aguardados', unlocked: aguardadosGamer.length >= 5 },
            { diff: 'facil', name: 'New Game+', icon: '🔁', req: 'Rejogar 1x', unlocked: countRewatchTotal(jogos) >= 1 },
            { diff: 'medio', name: 'Preso no Loop', icon: '🔄', req: 'Rejogar 5x', unlocked: countRewatchTotal(jogos) >= 5 },
            { diff: 'facil', name: 'Diário de Bordo', icon: '📝', req: '1 Sessão de Jogo', unlocked: jogos.some(g => g.sessions && g.sessions.length > 0) },
            { diff: 'medio', name: 'Jogador Rotineiro', icon: '🗓️', req: '15 Sessões de Jogo', unlocked: jogos.reduce((acc, g) => acc + (g.sessions?.length || 0), 0) >= 15 },
            { diff: 'facil', name: 'Reviewer de Games', icon: '💬', req: 'Escrever 1 Análise', unlocked: countCommentsTotal(jogos) >= 1 },
            { diff: 'medio', name: 'Jornalista de Games', icon: '🗞️', req: 'Escrever 10 Análises', unlocked: countCommentsTotal(jogos) >= 10 },
            { diff: 'facil', name: 'Master Race', icon: '🗄️', req: 'Criar 3 Plataformas', unlocked: jogosPlataformasData.length >= 3 },
            { diff: 'facil', name: 'Consumista', icon: '🛒', req: 'Criar 1 Loja', unlocked: storesData.length >= 1 },
            { diff: 'medio', name: 'Sale na Steam', icon: '💳', req: '10 Jogos em Lojas', unlocked: storeGamesData.length >= 10 },
            { diff: 'dificil', name: 'Carteira Vazia', icon: '🧾', req: '50 Jogos em Lojas', unlocked: storeGamesData.length >= 50 },
            { diff: 'ultra', name: 'Dono da Loja', icon: '💸', req: '100 Jogos em Lojas', unlocked: storeGamesData.length >= 100 },
            { diff: 'facil', name: 'Organizador', icon: '📋', req: 'Criar 1 Lista Gamer', unlocked: customListas.filter(l => (l.mode || 'tv') === 'gamer').length >= 1 },
            { diff: 'medio', name: 'Bibliotecário', icon: '📚', req: 'Criar 5 Listas Gamer', unlocked: customListas.filter(l => (l.mode || 'tv') === 'gamer').length >= 5 },
            
            // Diversos Finais
            { diff: 'facil', name: 'Free to Play', icon: '🎁', req: '5 Jogos "Resgate"', unlocked: storeGamesData.filter(g => g.price.toLowerCase().includes('resgate') || g.price.toLowerCase().includes('grátis') || g.price === '0,00').length >= 5 },
            { diff: 'facil', name: 'Fã de Franquia', icon: '🛡️', req: 'Criar 1 Franquia', unlocked: franquiasData.filter(f => (f.mode || 'tv') === 'gamer').length >= 1 },
            { diff: 'dificil', name: 'Lore Master', icon: '📜', req: 'Zerar 100% (3+ Jogos)', unlocked: franquiasData.filter(f => (f.mode||'tv')==='gamer' && f.games.length >= 3 && f.games.every(g=>g.completed)).length >= 1 },
            { diff: 'medio', name: 'Game Dev', icon: '🛠️', req: 'Devs em 10 Jogos', unlocked: jogos.filter(g => g.director && g.director.trim() !== '').length >= 10 },
            { diff: 'facil', name: 'Especialista', icon: '🏷️', req: 'Criar 3 Gêneros', unlocked: generosTiposData.length >= 3 }
        ];
    }

    const unlockedCount = badgesData.filter(b => b.unlocked).length;
    const bUnlLabel = document.getElementById('badgesUnlockedCount');
    if(bUnlLabel) bUnlLabel.innerText = unlockedCount;
    const bProg = document.getElementById('badgesProgressBar');
    if(bProg) bProg.style.width = `${(unlockedCount / badgesData.length) * 100}%`;

    var filteredBadges = badgesData;
    if (currentBadgeFilter !== 'all') {
        if (currentBadgeFilter === 'unlocked') filteredBadges = badgesData.filter(b => b.unlocked);
        else if (currentBadgeFilter === 'locked') filteredBadges = badgesData.filter(b => !b.unlocked);
        else filteredBadges = badgesData.filter(b => b.diff === currentBadgeFilter);
    }

    const getColor = (diff) => {
        if(diff === 'facil') return 'text-emerald-500 border-emerald-500 shadow-emerald-500/40';
        if(diff === 'medio') return 'text-blue-500 border-blue-500 shadow-blue-500/40';
        if(diff === 'dificil') return 'text-purple-500 border-purple-500 shadow-purple-500/40';
        if(diff === 'ultra') return 'text-amber-500 border-amber-500 shadow-amber-500/40';
        return 'text-gray-500 border-gray-500';
    }
    
    const getLabel = (diff) => {
        if(diff === 'facil') return 'Fácil';
        if(diff === 'medio') return 'Médio';
        if(diff === 'dificil') return 'Difícil';
        if(diff === 'ultra') return 'Ultra Hard';
        return '';
    }

    // NOVO: Armazena os dados atuais na janela para o popup acessar depois
    window.lastRenderedBadges = filteredBadges;

    const grid = document.getElementById('badgesModalGrid');
    if(grid) {
        grid.innerHTML = filteredBadges.map((b, idx) => {
            const colorClasses = b.unlocked ? getColor(b.diff) : 'grayscale opacity-30 border-[var(--border)]';
            return `
            <div onclick="openBadgeDetails(${idx})" class="flex flex-col items-center justify-center p-3 rounded-xl bg-[var(--input)] border-2 transition-all duration-300 ${colorClasses} hover:scale-105 cursor-pointer text-center h-28 w-full relative overflow-hidden" title="Requisito: ${b.req}">
                ${b.unlocked ? `<div class="absolute -top-1 -right-1 w-6 h-6 bg-current opacity-20 rounded-bl-full"></div>` : ''}
                <span class="text-[7px] font-black uppercase mb-1 opacity-70 tracking-widest">${getLabel(b.diff)}</span>
                <span class="text-3xl mb-1.5 drop-shadow-md filter ${!b.unlocked ? 'grayscale' : ''}">${b.icon}</span>
                <span class="text-[10px] font-black uppercase leading-tight line-clamp-2 w-full px-1 ${b.unlocked ? 'text-[var(--text-main)]' : 'text-[var(--text-dim)]'}">${b.name}</span>
            </div>
        `}).join('') || '<p class="col-span-full text-center py-10 opacity-50 font-bold text-lg uppercase tracking-widest">Nenhuma conquista encontrada neste filtro.</p>';
    }
}

// --- POPUP DINÂMICO DE CONQUISTAS ---
window.openBadgeDetails = function(index) {
    const b = window.lastRenderedBadges[index];
    if (!b) return;
    
    // Remove qualquer popup anterior para evitar duplicação
    const existing = document.getElementById('badgePopupModal');
    if (existing) existing.remove();

    const statusText = b.unlocked ? 'Desbloqueada' : 'Bloqueada';
    const statusColor = b.unlocked ? 'text-emerald-500' : 'text-red-500';

    const modalHTML = `
    <div id="badgePopupModal" class="fixed inset-0 modal-overlay z-[1000] flex items-center justify-center p-4 transition-all" onclick="this.remove()">
        <div class="modal-content w-full max-w-xs p-6 text-center relative bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl" onclick="event.stopPropagation()">
            <button onclick="document.getElementById('badgePopupModal').remove()" class="absolute top-4 right-4 text-[var(--text-dim)] hover:text-white font-black text-sm transition-colors">✖</button>
            
            <span class="text-6xl mb-3 block drop-shadow-md filter ${!b.unlocked ? 'grayscale opacity-50' : ''}">${b.icon}</span>
            <h2 class="text-xl font-black uppercase tracking-wider text-[var(--text-main)] mb-1">${b.name}</h2>
            <p class="text-[10px] font-black uppercase tracking-widest ${statusColor} mb-5 drop-shadow-sm">${statusText}</p>
            
            <div class="bg-[var(--input)] border border-[var(--border)] rounded-xl p-4 shadow-inner">
                <p class="text-[9px] font-black uppercase text-[var(--text-dim)] tracking-widest mb-1.5">Requisito da Conquista</p>
                <!-- Alterado para amarelo/dourado aqui 👇 -->
                <p class="text-sm font-bold text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]">${b.req}</p>
            </div>
            
            <button onclick="document.getElementById('badgePopupModal').remove()" class="btn btn-outline w-full mt-4 border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--surfaceHover)]">Fechar</button>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
};

// --- MINHAS NOTAS ---
function openNotas() {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
    const listToEvaluate = getFilteredGamesForStats();
    
    listToEvaluate.forEach(g => {
        const nota = Math.floor(parseFloat(g.rating)) || 0;
        if (counts[nota] !== undefined) counts[nota]++;
    });

    const descricoes = {
        10: { texto: "Obra-prima", cor: "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" },
        9:  { texto: "Incrível", cor: "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]" },
        8:  { texto: "Muito Bom", cor: "text-teal-400 drop-shadow-[0_0_8px_rgba(45,212,191,0.6)]" },
        7:  { texto: "Bom", cor: "text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.6)]" },
        6:  { texto: "Decente", cor: "text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.6)]" },
        5:  { texto: "Tanto Faz", cor: "text-[var(--text-main)] drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]" },
        4:  { texto: "Mediocre", cor: "text-[var(--text-dim)] drop-shadow-[0_0_8px_rgba(156,163,175,0.6)]" },
        3:  { texto: "Ruim", cor: "text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.6)]" },
        2:  { texto: "Terrível", cor: "text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.6)]" },
        1:  { texto: "P#$% Merda", cor: "text-red-600 drop-shadow-[0_0_8px_rgba(220,38,38,0.6)]" }
    };

    const tbody = document.getElementById('notasTableBody');
    tbody.innerHTML = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(n => `
        <tr class="border-b border-[var(--border)] last:border-0 hover:bg-[var(--input)] transition-colors">
            <td class="p-4 text-center text-lg ${descricoes[n].cor}">${n} ★</td>
            <td class="p-4 uppercase tracking-widest text-[11px] font-black opacity-90">${descricoes[n].texto}</td>
            <td class="p-4 text-center text-[var(--accent)] font-black text-xl drop-shadow-[0_0_5px_rgba(225,29,72,0.4)]">${counts[n]}</td>
        </tr>
    `).join('');

    document.getElementById('notasModal').style.display = 'flex';
}

function closeNotas() { 
    document.getElementById('notasModal').style.display = 'none'; 
}
// =========================================================================
// PARTE 9: A SEGUIR E MÓDULOS GAMER (PLATAFORMAS, LOJAS, GÊNEROS E FORTNITE)
// =========================================================================

// --- ASSISTIR A SEGUIR (WATCH NEXT) ---
var assistirFiltroAtual = 'all';

function openAssistirASeguir() {
    document.getElementById('assistirASeguirModal').style.display = 'flex';
    renderAssistirASeguir();
}

function closeAssistirASeguir() {
    document.getElementById('assistirASeguirModal').style.display = 'none';
}

function toggleAssistidos() {
    const div = document.getElementById('assistirASeguirEmDia');
    const btn = document.getElementById('btnToggleAssistidos');
    if(div.classList.contains('hidden')) {
        div.classList.remove('hidden');
        btn.innerHTML = 'Esconder Obras em Dia 🔼';
    } else {
        div.classList.add('hidden');
        btn.innerHTML = 'Mostrar Obras em Dia 🔽';
    }
}

function setAssistirFiltro(tipo, btnElement) {
    assistirFiltroAtual = tipo;
    const buttons = document.querySelectorAll('.assistir-filter-btn');
    buttons.forEach(btn => {
        btn.classList.remove('border-blue-500', 'text-blue-500', 'shadow-[0_0_10px_rgba(59,130,246,0.4)]', 'bg-blue-500/10', 'active');
        btn.classList.add('border-[var(--border)]', 'text-[var(--text-dim)]');
    });
    
    if(btnElement) {
        btnElement.classList.remove('border-[var(--border)]', 'text-[var(--text-dim)]');
        btnElement.classList.add('border-blue-500', 'text-blue-500', 'shadow-[0_0_10px_rgba(59,130,246,0.4)]', 'bg-blue-500/10', 'active');
    }
    renderAssistirASeguir();
}

async function addOneEpisodeFromAssistir(id) {
    await addOneEpisode(id);
    renderAssistirASeguir();
}

function renderAssistirASeguir() {
    const listContainer = document.getElementById('assistirASeguirList');
    const searchQuery = (document.getElementById('assistirSearchInput')?.value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const isGamerMode = currentAppMode === 'gamer';

    const modalTitle = document.querySelector('#assistirASeguirModal h2');
    if (modalTitle) {
        modalTitle.innerText = isGamerMode ? '🎮 Continuar Jogando' : '▶ Assistir a Seguir';
        modalTitle.className = isGamerMode ? 'text-xl font-black text-blue-500 uppercase tracking-widest drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]' : 'text-xl font-black text-[var(--accent)] uppercase tracking-widest drop-shadow-[0_0_8px_rgba(225,29,72,0.3)]';
    }

    var obras = games.filter(g => 
        ['Assistindo', 'Visto'].includes(g.status || 'Watchlist') && 
        (isGamerMode ? g.type === 'Jogo' : ['Série', 'Anime', 'Desenho'].includes(g.type))
    );

    if (assistirFiltroAtual !== 'all' && !isGamerMode) {
        obras = obras.filter(g => g.type === assistirFiltroAtual);
    }
    if (searchQuery) obras = obras.filter(g => (g.name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(searchQuery));

    const emAndamento = [];
    const emDia = [];

    obras.forEach(g => {
        const watched = isGamerMode ? (parseInt(g.hours) || 0) : (parseInt(g.epWatched) || 0);
        const total = isGamerMode ? (parseInt(g.targetHours) || 0) : (parseInt(g.epTotal) || 0);
        
        if (g.status === 'Visto' || (total > 0 && watched >= total)) {
            emDia.push(g);
        } else {
            emAndamento.push(g);
        }
    });

    const sortByUpdate = (a, b) => (b.lastUpdate || 0) - (a.lastUpdate || 0);
    emAndamento.sort(sortByUpdate);
    emDia.sort(sortByUpdate);

    const generateItemHTML = (g) => {
        const isGame = g.type === 'Jogo';
        const watched = isGame ? (parseInt(g.hours) || 0) : (parseInt(g.epWatched) || 0);
        const total = isGame ? (parseInt(g.targetHours) || 0) : (parseInt(g.epTotal) || 0);
        const percent = total > 0 ? Math.round((watched / total) * 100) : 0;
        
        const mainColor = isGame ? 'blue-500' : '[var(--accent)]';
        const glowColor = isGame ? 'rgba(59,130,246,0.4)' : 'var(--accent-glow)';
        const barColor = percent >= 100 ? 'bg-[var(--green)] shadow-[0_0_8px_rgba(16,185,129,0.5)]' : `bg-${mainColor} shadow-[0_0_8px_${glowColor}]`;
        const unitName = isGame ? 'Hrs' : 'Eps';
        
        const btnAction = isGame ? `openSessionModal('${g.id}')` : `addOneEpisodeFromAssistir('${g.id}')`;
        const btnIcon = isGame ? '⏱️' : '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" class="group-hover:scale-110 transition-transform"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';

        return `
        <div class="flex items-center bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 gap-4 shadow-[0_10px_20px_var(--shadow-med)] hover:border-${mainColor} hover:-translate-y-1 transition-all duration-300 mb-4">
            <div class="w-[80px] h-[120px] sm:w-[100px] sm:h-[150px] flex-shrink-0 rounded-lg overflow-hidden border border-[var(--border)] shadow-md cursor-pointer relative group" onclick="openDetails('${g.id}')">
                <img src="${g.cover}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onerror="this.src='https://via.placeholder.com/150x225?text=Capa'">
            </div>
            <div class="flex-1 flex flex-col justify-center min-w-0 py-2">
                <span class="text-[9px] font-black uppercase tracking-widest type-${g.type.toLowerCase().replace(' ', '-')} mb-1 w-max px-2 py-0.5 rounded bg-[var(--input)] border border-[var(--border)] shadow-inner">${g.type}</span>
                <h3 class="text-base sm:text-lg font-black uppercase truncate mb-3 cursor-pointer hover:text-${mainColor} transition-colors text-[var(--text-main)]" title="${g.name}" onclick="openDetails('${g.id}')">${g.name}</h3>
                <div class="w-full bg-[var(--input)] rounded-full h-2.5 border border-[var(--border)] relative overflow-hidden shadow-inner">
                    <div class="h-full ${barColor} transition-all duration-700" style="width: ${percent}%"></div>
                </div>
                <div class="flex justify-between items-center mt-2">
                    <div class="text-[10px] sm:text-[11px] font-bold text-[var(--text-dim)] uppercase tracking-widest">
                        ${unitName}: <span class="font-black text-[12px] ml-1 text-[var(--text-main)] drop-shadow-md">${watched}</span> <span class="opacity-50 mx-1">/</span> ${total || '?'}
                    </div>
                    <span class="text-[10px] font-black text-[var(--text-main)]">${percent}%</span>
                </div>
            </div>
            <div class="flex-shrink-0 ml-2">
                <button onclick="${btnAction}" class="w-12 h-12 rounded-full border-[3px] border-${mainColor} bg-[var(--surface)] flex items-center justify-center text-${mainColor} hover:bg-${mainColor} hover:text-[#FFFFFF] transition-all shadow-[0_0_15px_${glowColor}] group" title="${isGame ? 'Registrar Sessão' : 'Marcar +1 Episódio'}">
                    ${btnIcon}
                </button>
            </div>
        </div>
        `;
    };

    var html = '';
    if (emAndamento.length === 0 && emDia.length === 0) {
        html = `<div class="text-center py-16 bg-[var(--surface)] border border-[var(--border)] rounded-2xl"><p class="opacity-40 font-black uppercase text-[12px]">Nenhuma obra em andamento.</p></div>`;
    } else {
        if (emDia.length > 0) {
            html += `<div class="mb-8 pb-6 border-b border-[var(--border)] flex flex-col items-center"><button id="btnToggleAssistidos" onclick="toggleAssistidos()" class="btn btn-outline px-6 py-2 text-[10px] uppercase font-black">Mostrar Obras em Dia 🔽</button><div id="assistirASeguirEmDia" class="hidden flex flex-col w-full mt-6">${emDia.map(generateItemHTML).join('')}</div></div>`;
        }
        if (emAndamento.length > 0) {
            html += emAndamento.map(generateItemHTML).join('');
        }
    }
    listContainer.innerHTML = html;
}

// --- FORTNITE HOURS ---
async function addFortniteHours() {
    const extra = prompt("Quantas horas extra deseja adicionar?", "0");
    if (extra !== null && extra.trim() !== "") {
        const parsed = parseInt(extra);
        if (!isNaN(parsed)) {
            fortniteHours += parsed;
            document.getElementById('statFortniteGamer').innerText = fortniteHours + 'h';
            await localforage.setItem('ct_fortnite_hours_v70', fortniteHours);
        }
    }
}

// --- JOGOS E PLATAFORMAS (KANBAN) ---
function openJogosPlataformas() { document.getElementById('jogosPlataformasModal').style.display = 'flex'; renderJogosPlataformas(); }
function closeJogosPlataformas() { document.getElementById('jogosPlataformasModal').style.display = 'none'; }
function handleDragStartPlat(e, index) { draggedPlatIndex = index; e.dataTransfer.effectAllowed = 'move'; }
function handleDragOverPlat(e) { e.preventDefault(); e.currentTarget.classList.add('border-teal-500', 'scale-[1.02]'); }
function handleDragLeavePlat(e) { e.currentTarget.classList.remove('border-teal-500', 'scale-[1.02]'); }
async function handleDropPlat(e, targetIndex) {
    e.preventDefault(); e.currentTarget.classList.remove('border-teal-500', 'scale-[1.02]');
    if (draggedPlatIndex === targetIndex || draggedPlatIndex === null) return;
    const movedItem = jogosPlataformasData.splice(draggedPlatIndex, 1)[0];
    jogosPlataformasData.splice(targetIndex, 0, movedItem);
    draggedPlatIndex = null; await manualSave(); renderJogosPlataformas();
}

function renderJogosPlataformas() {
    const sidebar = document.getElementById('jpSidebarList');
    const grid = document.getElementById('jpGrid');
    var sidebarHTML = '';

    jogosPlataformasData.forEach((p) => {
        var total = p.games.length;
        var zerados = p.games.filter(g => g.completed).length;
        var perc = total > 0 ? ((zerados / total) * 100).toFixed(0) : 0;
        sidebarHTML += `
            <div class="flex border-b border-[var(--border)] text-[11px] font-bold hover:bg-[var(--input)] transition-colors cursor-pointer group" onclick="document.getElementById('plat-${p.id}').scrollIntoView({behavior:'smooth'})">
                <div class="flex-1 py-3 px-4 text-[var(--text-dim)] group-hover:text-[var(--text-main)] truncate transition-colors">${p.name}</div>
                <div class="w-16 py-3 px-2 text-center border-l border-[var(--border)] ${perc == 100 ? 'text-[var(--green)]' : 'text-teal-500'}">${perc}%</div>
            </div>`;
    });
    sidebar.innerHTML = sidebarHTML || '<div class="text-center py-6 text-xs opacity-40 font-bold uppercase tracking-widest text-[var(--text-main)]">Lista Vazia</div>';

    if (jogosPlataformasData.length === 0) {
        grid.innerHTML = '<div class="w-full text-center py-20 opacity-40 font-black uppercase text-sm tracking-widest absolute left-0 right-0 mt-10">Nenhuma categoria criada.</div>'; return;
    }

    grid.innerHTML = jogosPlataformasData.map((p, pIndex) => {
        var total = p.games.length;
        var zerados = p.games.filter(g => g.completed).length;
        var perc = total > 0 ? ((zerados / total) * 100).toFixed(0) : 0;
        
        var gamesHTML = p.games.map((g, gIndex) => `
            <div class="flex items-center gap-3 py-2.5 px-4 border-b border-dashed border-[var(--border)] hover:bg-[var(--white-highlight)] group">
                <input type="checkbox" ${g.completed ? 'checked' : ''} onchange="toggleJPGame('${p.id}', ${gIndex})" class="w-4 h-4 accent-teal-500 cursor-pointer">
                <span class="text-[11px] font-bold flex-1 truncate ${g.completed ? 'text-[var(--text-dim)] line-through' : 'text-[var(--text-main)]'}">${g.name}</span>
                <button onclick="removerJogoJP('${p.id}', ${gIndex})" class="text-red-500 opacity-0 group-hover:opacity-100 px-2 font-black text-[10px] transition">✖</button>
            </div>
        `).join('');

        return `
            <div draggable="true" ondragstart="handleDragStartPlat(event, ${pIndex})" ondragover="handleDragOverPlat(event)" ondragleave="handleDragLeavePlat(event)" ondrop="handleDropPlat(event, ${pIndex})" class="flex-shrink-0 w-[300px] sm:w-[350px] lg:w-[400px] flex flex-col gap-6 relative cursor-move transition-transform border-2 border-transparent rounded-2xl">
                <div class="w-full h-48 sm:h-56 rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--input)] shadow-xl relative group">
                    <img src="${p.cover || 'https://via.placeholder.com/400x200?text=Capa'}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105">
                    <div class="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none"></div>
                    <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button onclick="setPlataformaCover('${p.id}')" class="bg-black/60 backdrop-blur border border-[var(--border)] text-white text-[10px] font-bold uppercase px-3 py-1.5 rounded hover:bg-teal-500 transition">Mudar Capa</button>
                    </div>
                    <div class="absolute bottom-4 left-4 right-4 flex justify-between items-end pointer-events-none">
                        <h2 class="text-xl sm:text-2xl font-black uppercase text-white drop-shadow-md truncate">${p.name}</h2>
                    </div>
                </div>
                
                <div id="plat-${p.id}" class="dashboard-block bg-[var(--surface)] border border-[var(--border)] rounded-2xl flex flex-col flex-shrink-0 overflow-hidden cursor-default">
                    <div class="bg-[var(--input)] border-b border-[var(--border)] py-3 px-4 flex justify-between items-center shadow-inner">
                        <span class="font-black uppercase tracking-wide text-[10px] text-[var(--text-dim)] pr-4">JOGOS</span>
                        <div class="flex gap-2">
                           <button onclick="promptAddJogoJP('${p.id}')" class="w-6 h-6 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--green)] hover:bg-[var(--green)] hover:text-white transition font-bold">＋</button>
                           <button onclick="deletarPlataforma('${p.id}')" class="w-6 h-6 rounded border border-[var(--border)] bg-[var(--surface)] text-red-500 hover:bg-red-500 hover:text-white transition text-xs">✖</button>
                        </div>
                    </div>
                    <div class="flex flex-col flex-1 bg-[var(--surface)] max-h-[500px] overflow-y-auto custom-scroll">
                        ${gamesHTML || '<div class="text-center text-xs py-8 opacity-40 font-bold uppercase tracking-widest text-[var(--text-main)]">Nenhum jogo.</div>'}
                    </div>
                    <div class="p-3 bg-[var(--input)] border-t border-[var(--border)] flex justify-between items-center relative">
                        <span class="text-[9px] font-black uppercase text-[var(--text-dim)] tracking-widest">Progresso: ${zerados}/${total}</span>
                        <span class="text-[11px] font-black ${perc == 100 ? 'text-[var(--green)]' : 'text-teal-500'}">${perc}%</span>
                        <div class="absolute bottom-0 left-0 w-full h-1 bg-[var(--surface)]">
                            <div class="h-full ${perc == 100 ? 'bg-[var(--green)]' : 'bg-teal-500'} transition-all duration-500" style="width: ${perc}%"></div>
                        </div>
                    </div>
                </div>
            </div>`;
    }).join('');
}

async function promptNovaPlataforma() {
    var name = prompt("Digite o nome da Plataforma/Categoria:");
    if (name && name.trim()) { jogosPlataformasData.push({ id: crypto.randomUUID(), name: name.trim(), cover: '', games: [] }); await manualSave(); renderJogosPlataformas(); }
}
async function setPlataformaCover(id) {
    var url = prompt("Cole a URL da imagem da capa:");
    if (url) { var p = jogosPlataformasData.find(x => x.id === id); if (p) { p.cover = await urlToBase64(url.trim()); await manualSave(); renderJogosPlataformas(); } }
}
async function promptAddJogoJP(id) {
    var nomes = prompt("Digite os nomes dos jogos (separe por vírgula):");
    if (nomes) { var p = jogosPlataformasData.find(x => x.id === id); nomes.split(',').forEach(n => { if(n.trim()) p.games.push({ name: n.trim(), completed: false }); }); await manualSave(); renderJogosPlataformas(); }
}
async function toggleJPGame(id, gameIndex) { var p = jogosPlataformasData.find(x => x.id === id); p.games[gameIndex].completed = !p.games[gameIndex].completed; await manualSave(); renderJogosPlataformas(); }
async function deletarPlataforma(id) { if (confirm("EXCLUIR coluna e seus jogos?")) { jogosPlataformasData = jogosPlataformasData.filter(x => x.id !== id); await manualSave(); renderJogosPlataformas(); } }
async function removerJogoJP(id, gameIndex) { if (confirm("Remover este jogo?")) { var p = jogosPlataformasData.find(x => x.id === id); p.games.splice(gameIndex, 1); await manualSave(); renderJogosPlataformas(); } }

// --- MINHAS LOJAS E COMPRAS ---
function maskCurrency(input) {
    var v = input.value.replace(/\D/g, '');
    if (v === '') { input.value = ''; return; }
    v = (parseInt(v, 10) / 100).toFixed(2).replace('.', ',');
    v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    input.value = 'R$ ' + v;
}

function updateStoreTotals() {
    var total = 0;
    storeGamesData.forEach(g => {
        if (g.price && g.price.includes('R$')) {
            var val = parseFloat(g.price.replace('R$', '').replace(/\./g, '').replace(',', '.').trim());
            if (!isNaN(val)) total += val;
        }
    });
    const el = document.getElementById('storeTotalSpent');
    if (el) el.innerText = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function openStoreModal() { document.getElementById('storeMainModal').style.display = 'flex'; document.getElementById('storeGridView').style.display = 'block'; document.getElementById('storeDetailView').style.display = 'none'; currentActiveStoreId = null; if(document.getElementById('globalStoreSearch')) document.getElementById('globalStoreSearch').value = ''; renderStores(); }
function closeStoreModal() { document.getElementById('storeMainModal').style.display = 'none'; }
function openStoreFormModal() { document.getElementById('sFormName').value = ''; document.getElementById('sFormCover').value = ''; document.getElementById('storeFormModal').style.display = 'flex'; }
function closeStoreFormModal() { document.getElementById('storeFormModal').style.display = 'none'; }

async function saveStore() {
    const name = document.getElementById('sFormName').value.trim();
    if(!name) return alert("Digite o nome da Loja!");
    storesData.push({ id: crypto.randomUUID(), name, cover: await urlToBase64(document.getElementById('sFormCover').value.trim()) });
    await manualSave(); closeStoreFormModal(); renderStores();
}
async function deleteStore(id) {
    if(confirm("Excluir esta Loja e todos os seus jogos?")) { storesData = storesData.filter(s => s.id !== id); storeGamesData = storeGamesData.filter(g => g.storeId !== id); await manualSave(); renderStores(); }
}
function openStoreGameFormModal() {
    if(storesData.length === 0) return alert("Crie uma Loja primeiro!");
    document.getElementById('sgFormName').value = ''; document.getElementById('sgFormPrice').value = '';
    document.getElementById('sgFormStore').innerHTML = storesData.map(s => `<option value="${s.id}" ${s.id === currentActiveStoreId ? 'selected' : ''}>${s.name}</option>`).join('');
    document.getElementById('storeGameFormModal').style.display = 'flex';
}
function closeStoreGameFormModal() { document.getElementById('storeGameFormModal').style.display = 'none'; }
async function saveStoreGame() {
    const name = document.getElementById('sgFormName').value.trim();
    var price = document.getElementById('sgFormPrice').value.trim();
    if(!name) return alert("Digite o nome do Jogo!");
    if (!price || price === 'R$ 0,00') price = 'Resgate';
    storeGamesData.push({ id: crypto.randomUUID(), name, storeId: document.getElementById('sgFormStore').value, price });
    await manualSave(); closeStoreGameFormModal(); currentActiveStoreId ? renderStoreGamesDetail() : renderStores();
}
async function deleteStoreGame(id) {
    if(confirm("Remover aquisição?")) { storeGamesData = storeGamesData.filter(g => g.id !== id); await manualSave(); currentActiveStoreId ? renderStoreGamesDetail() : renderStores(); }
}
function openStoreImportModal() { document.getElementById('siFormText').value = ''; document.getElementById('storeImportModal').style.display = 'flex'; }
function closeStoreImportModal() { document.getElementById('storeImportModal').style.display = 'none'; }

async function processStoreImport() {
    const text = document.getElementById('siFormText').value.trim();
    if (!text) return alert("Cole a lista!");
    var count = 0;
    for (var line of text.split('\n')) {
        if (!line.trim()) continue;
        const parts = line.split(';').map(p => p.trim());
        if (parts.length >= 2) {
            const [name, storeName] = parts;
            var price = parts[2] || 'Resgate';
            if (price.toLowerCase() !== 'resgate' && price.toLowerCase() !== 'grátis' && !price.includes('R$')) {
                var val = parseFloat(price.replace('R$', '').replace('.', '').replace(',', '.'));
                price = (!isNaN(val) && val > 0) ? 'R$ ' + val.toFixed(2).replace('.', ',') : 'Resgate';
            }
            var store = storesData.find(s => s.name.toLowerCase() === storeName.toLowerCase());
            if (!store) { store = { id: crypto.randomUUID(), name: storeName, cover: '' }; storesData.push(store); }
            storeGamesData.push({ id: crypto.randomUUID(), name, storeId: store.id, price });
            count++;
        }
    }
    if (count > 0) { await manualSave(); closeStoreImportModal(); renderStores(); alert(`${count} jogos importados!`); }
}

function renderStores() {
    updateStoreTotals(); 
    const grid = document.getElementById('storeGrid');
    const searchQ = (document.getElementById('globalStoreSearch')?.value || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    if (searchQ) {
        const filtered = storeGamesData.filter(g => (g.name||'').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(searchQ)).reverse();
        grid.className = 'w-full flex flex-col';
        grid.innerHTML = `<div class="overflow-x-auto w-full pb-10"><table class="w-full text-left border-collapse whitespace-nowrap min-w-[600px] border border-[var(--border)] rounded-xl bg-[var(--bg)]">
            <thead><tr class="bg-[var(--input)] text-[10px] text-[var(--text-dim)] uppercase border-b border-[var(--border)]"><th class="p-4 pl-6">Jogo</th><th class="p-4">Loja</th><th class="p-4">Valor</th><th class="p-4 text-center">Ações</th></tr></thead>
            <tbody class="text-xs font-bold text-[var(--text-main)] divide-y divide-[var(--border)]">
                ${filtered.map(g => {
                    const store = storesData.find(s => s.id === g.storeId);
                    const isGratis = g.price.toLowerCase().includes('resgate') || g.price.toLowerCase().includes('grátis') || g.price === '0,00';
                    return `<tr class="hover:bg-[var(--input)] group"><td class="p-4 pl-6 truncate max-w-[250px]">${g.name}</td><td class="p-4 truncate text-[var(--text-dim)]">${store?store.name:'Desconhecida'}</td><td class="p-4 ${isGratis ? 'text-emerald-500' : 'text-[var(--text-main)]'}">${g.price}</td><td class="p-4 text-center"><button onclick="deleteStoreGame('${g.id}')" class="text-red-500/50 hover:text-red-500 btn btn-outline py-1 px-3 border-red-500/30">Remover</button></td></tr>`;
                }).join('') || `<tr><td colspan="4" class="text-center py-12 opacity-40 uppercase tracking-widest text-xs">Nenhum resultado.</td></tr>`}
            </tbody></table></div>`;
    } else {
        grid.className = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8';
        grid.innerHTML = storesData.map(s => `
            <div onclick="openStoreDetail('${s.id}')" class="relative group cursor-pointer rounded-2xl overflow-hidden border-2 border-[var(--border)] bg-[var(--input)] shadow-lg hover:border-purple-500 hover:-translate-y-2 transition-all flex flex-col aspect-video">
                <img src="${s.cover}" class="w-full h-full object-cover opacity-60" onerror="this.src='https://via.placeholder.com/300x150?text=Loja'">
                <div class="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                <div class="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                    <div class="flex flex-col"><h3 class="text-[15px] font-black uppercase text-white drop-shadow-md truncate max-w-[150px]">${s.name}</h3><span class="text-[10px] font-black text-purple-400 bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm mt-1 w-max">${storeGamesData.filter(g => g.storeId === s.id).length} Jogos</span></div>
                    <button onclick="event.stopPropagation(); deleteStore('${s.id}')" class="text-red-500 opacity-0 group-hover:opacity-100 bg-[var(--surface)] border border-[var(--border)] rounded p-2 hover:bg-red-500 hover:text-white transition">✖</button>
                </div>
            </div>`).join('') || '<div class="col-span-full text-center py-10 opacity-40 uppercase text-[12px] font-bold">Nenhuma loja cadastrada</div>';
    }
}

function openStoreDetail(id) {
    currentActiveStoreId = id; const store = storesData.find(s => s.id === id); if(!store) return;
    document.getElementById('activeStoreName').innerText = store.name; document.getElementById('activeStoreCover').src = store.cover || 'https://via.placeholder.com/150x100?text=Loja'; document.getElementById('storeDetailSearch').value = '';
    document.getElementById('storeGridView').style.display = 'none'; document.getElementById('storeDetailView').style.display = 'flex'; renderStoreGamesDetail(); updateStoreTotals();
}

function closeStoreDetail() { currentActiveStoreId = null; document.getElementById('storeDetailView').style.display = 'none'; document.getElementById('storeGridView').style.display = 'block'; renderStores(); }

function renderStoreGamesDetail() {
    if(!currentActiveStoreId) return;
    const searchQ = (document.getElementById('storeDetailSearch').value || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const filtered = storeGamesData.filter(g => g.storeId === currentActiveStoreId && (g.name||'').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(searchQ)).reverse(); 
    document.getElementById('activeStoreCount').innerText = `${filtered.length} Jogos Cadastrados`;
    document.getElementById('storeGamesDetailBody').innerHTML = filtered.map(g => {
        const isGratis = g.price.toLowerCase().includes('resgate') || g.price.toLowerCase().includes('grátis') || g.price === '0,00';
        return `<tr class="hover:bg-[var(--input)] group"><td class="p-4 pl-6 truncate max-w-[250px]">${g.name}</td><td class="p-4 font-black ${isGratis ? 'text-emerald-500' : 'text-purple-400'}">${g.price}</td><td class="p-4 text-center"><button onclick="deleteStoreGame('${g.id}')" class="text-red-500/50 hover:text-red-500 btn btn-outline py-1 px-3 border-red-500/30 opacity-0 group-hover:opacity-100 transition">Remover</button></td></tr>`;
    }).join('') || '<tr><td colspan="3" class="text-center py-12 opacity-40 text-xs uppercase font-black tracking-widest">Nenhum jogo na loja</td></tr>';
}

// --- GÊNEROS E TIPOS (GAMER) ---
function openGenerosTipos() { document.getElementById('generosTiposModal').style.display = 'flex'; renderGenerosTipos(); }
function closeGenerosTipos() { document.getElementById('generosTiposModal').style.display = 'none'; }
function handleDragStartGT(e, index) { draggedGtIndex = index; e.dataTransfer.effectAllowed = 'move'; }
function handleDragOverGT(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; e.currentTarget.classList.add('border-fuchsia-500', 'scale-[1.02]'); }
function handleDragLeaveGT(e) { e.currentTarget.classList.remove('border-fuchsia-500', 'scale-[1.02]'); }
async function handleDropGT(e, targetIndex) {
    e.preventDefault(); e.currentTarget.classList.remove('border-fuchsia-500', 'scale-[1.02]');
    if (draggedGtIndex === targetIndex || draggedGtIndex === null) return;
    const moved = generosTiposData.splice(draggedGtIndex, 1)[0];
    generosTiposData.splice(targetIndex, 0, moved);
    draggedGtIndex = null; await manualSave(); renderGenerosTipos();
}

function toggleGtColorPicker(id) {
    const el = document.getElementById('cp-' + id);
    document.querySelectorAll('[id^="cp-"]').forEach(p => { if(p.id !== 'cp-' + id) p.classList.add('hidden'); });
    el.classList.toggle('hidden');
}

async function setGtColor(id, hexColor) { var g = generosTiposData.find(x => x.id === id); if(g) { g.color = hexColor; await manualSave(); renderGenerosTipos(); } }

function renderGenerosTipos() {
    const grid = document.getElementById('generosTiposGrid');
    if (generosTiposData.length === 0) { grid.innerHTML = '<div class="col-span-full text-center py-20 opacity-40 font-black uppercase text-sm">Nenhum Gênero cadastrado.</div>'; return; }

    grid.innerHTML = generosTiposData.map((g, idxCard) => {
        const masterName = g.name.toUpperCase(); const color = g.color || '#e879f9'; 
        const jogosMaster = games.filter(jogo => {
            if (!jogo.genre || jogo.type !== 'Jogo') return false; 
            const genreUpper = jogo.genre.toUpperCase();
            if (!genreUpper.includes(masterName)) return false;
            return g.subgenres.length === 0 || g.subgenres.some(sub => genreUpper.includes(sub.toUpperCase()));
        }).length;

        var subHTML = g.subgenres.map((sub, idx) => {
            const subName = sub.toUpperCase();
            const qtd = games.filter(jogo => jogo.type === 'Jogo' && jogo.genre && jogo.genre.toUpperCase().includes(masterName) && jogo.genre.toUpperCase().includes(subName)).length;
            return `<div class="flex justify-between items-center py-2 border-b border-dashed border-[var(--border)] last:border-0 hover:bg-[var(--white-highlight)] px-2 group rounded"><span class="text-[11px] font-bold text-[var(--text-main)] uppercase pointer-events-none">${sub}</span><div class="flex items-center gap-2"><span class="text-[9px] font-black text-[var(--text-dim)] bg-[var(--bg)] px-2 py-0.5 rounded shadow-inner">${qtd}</span><button onclick="removerSubgenero('${g.id}', ${idx})" class="text-red-500 opacity-0 group-hover:opacity-100 text-[10px] font-black px-1 transition">✖</button></div></div>`;
        }).join('');

        return `
        <div draggable="true" ondragstart="handleDragStartGT(event, ${idxCard})" ondragover="handleDragOverGT(event)" ondragleave="handleDragLeaveGT(event)" ondrop="handleDropGT(event, ${idxCard})" class="dashboard-block bg-[var(--surface)] border border-[var(--border)] rounded-2xl flex flex-col shadow-md cursor-move break-inside-avoid mb-6 w-full">
            <div class="bg-[var(--input)] border-b border-[var(--border)] py-4 px-5 flex flex-col relative shadow-inner rounded-t-2xl">
                <div class="absolute top-0 left-0 w-full h-px" style="background: linear-gradient(to right, transparent, ${color}80, transparent);"></div>
                <div class="flex justify-between items-center mb-1">
                    <h3 class="font-black uppercase tracking-widest text-[14px] truncate flex-1" style="color: ${color}; filter: drop-shadow(0 0 5px ${color}66);">${g.name}</h3>
                    <div class="flex gap-2 relative flex-shrink-0">
                        <button onclick="toggleGtColorPicker('${g.id}')" class="w-7 h-7 rounded border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center hover:scale-110"><div class="w-3 h-3 rounded-full" style="background-color: ${color}"></div></button>
                        <div id="cp-${g.id}" class="hidden absolute top-9 right-0 bg-[var(--surface)] border border-[var(--border)] p-2 rounded-xl shadow-2xl flex gap-2 z-50"><div onclick="setGtColor('${g.id}', '#e879f9')" class="w-5 h-5 rounded-full cursor-pointer bg-fuchsia-400"></div><div onclick="setGtColor('${g.id}', '#60a5fa')" class="w-5 h-5 rounded-full cursor-pointer bg-blue-400"></div><div onclick="setGtColor('${g.id}', '#34d399')" class="w-5 h-5 rounded-full cursor-pointer bg-emerald-400"></div><div onclick="setGtColor('${g.id}', '#fbbf24')" class="w-5 h-5 rounded-full cursor-pointer bg-amber-400"></div><div onclick="setGtColor('${g.id}', '#f87171')" class="w-5 h-5 rounded-full cursor-pointer bg-red-400"></div></div>
                        <button onclick="promptAddSubgenero('${g.id}')" class="w-7 h-7 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--green)] hover:bg-[var(--green)] hover:text-white font-bold transition">＋</button>
                        <button onclick="deletarGeneroMaster('${g.id}')" class="w-7 h-7 rounded border border-[var(--border)] bg-[var(--surface)] text-red-500 hover:bg-red-500 hover:text-white text-xs transition">✖</button>
                    </div>
                </div>
                <div class="flex items-center gap-1.5 mt-1"><span class="text-[9px] font-black uppercase opacity-50">Total:</span><span class="text-[11px] font-black px-2 py-0.5 rounded-full" style="background-color: ${color}; color: #000;">${jogosMaster}</span></div>
            </div>
            <div class="flex flex-col p-4 bg-[var(--surface)] rounded-b-2xl">${subHTML || '<div class="text-center text-xs py-4 opacity-40 font-bold uppercase tracking-widest">Sem Tipos</div>'}</div>
        </div>`;
    }).join('');
}

async function promptNovoGeneroMaster() { var name = prompt("Nome do Gênero Principal (Ex: AÇÃO, RPG):"); if (name) { generosTiposData.push({ id: crypto.randomUUID(), name: name.trim().toUpperCase(), subgenres: [], color: '#e879f9' }); await manualSave(); renderGenerosTipos(); } }
async function promptAddSubgenero(id) { var nome = prompt("Tipo ou Subgênero (Ex: FPS, Tático):"); if (nome) { generosTiposData.find(x => x.id === id).subgenres.push(nome.trim().toUpperCase()); await manualSave(); renderGenerosTipos(); } }
async function removerSubgenero(id, subIndex) { if(confirm("Remover Tipo/Subgênero?")) { generosTiposData.find(x => x.id === id).subgenres.splice(subIndex, 1); await manualSave(); renderGenerosTipos(); } }
async function deletarGeneroMaster(id) { if(confirm("EXCLUIR este Gênero Principal?")) { generosTiposData = generosTiposData.filter(x => x.id !== id); await manualSave(); renderGenerosTipos(); } }
// =========================================================================
// PARTE 10: MODO ORBITAL 3D, ANÁLISES, BACKUP E INICIALIZAÇÃO FINAL
// =========================================================================

// --- ANÁLISES / COMENTÁRIOS ---
var currentCommentsMode = 'tv';

function openComments() { 
    currentCommentsMode = currentAppMode; 
    switchCommentsMode(currentCommentsMode);
    document.getElementById('commentsModal').style.display = 'flex'; 
    document.getElementById('commentSearchInput').value = ''; 
}

function closeComments() { 
    document.getElementById('commentsModal').style.display = 'none'; 
}

function switchCommentsMode(mode) {
    currentCommentsMode = mode;
    const sliderBg = document.getElementById('sliderBgComments');
    const btnTV = document.getElementById('btnModeCommentsTV');
    const btnGamer = document.getElementById('btnModeCommentsGamer');
    const title = document.getElementById('commentsMainTitle');
    
    if (mode === 'tv') {
        if(sliderBg) {
            sliderBg.style.transform = 'translateX(0)';
            sliderBg.classList.remove('bg-blue-500', 'shadow-[0_0_10px_rgba(59,130,246,0.4)]');
            sliderBg.classList.add('bg-pink-500', 'shadow-[0_0_10px_rgba(236,72,153,0.4)]');
        }
        if(btnTV) { btnTV.classList.add('text-white'); btnTV.classList.remove('text-[var(--text-dim)]'); }
        if(btnGamer) { btnGamer.classList.add('text-[var(--text-dim)]'); btnGamer.classList.remove('text-white'); }
        if(title) { 
            title.classList.remove('text-blue-500'); title.classList.add('text-pink-500'); 
            title.innerHTML = '💬 Suas Análises <span class="text-[10px] text-[var(--text-dim)] tracking-widest mt-0.5">TV TIME</span>'; 
        }
    } else {
        if(sliderBg) {
            sliderBg.style.transform = 'translateX(100%)';
            sliderBg.classList.remove('bg-pink-500', 'shadow-[0_0_10px_rgba(236,72,153,0.4)]');
            sliderBg.classList.add('bg-blue-500', 'shadow-[0_0_10px_rgba(59,130,246,0.4)]');
        }
        if(btnGamer) { btnGamer.classList.add('text-white'); btnGamer.classList.remove('text-[var(--text-dim)]'); }
        if(btnTV) { btnTV.classList.add('text-[var(--text-dim)]'); btnTV.classList.remove('text-white'); }
        if(title) { 
            title.classList.remove('text-pink-500'); title.classList.add('text-blue-500'); 
            title.innerHTML = '💬 Suas Análises <span class="text-[10px] text-[var(--text-dim)] tracking-widest mt-0.5">GAMER</span>'; 
        }
    }
    updateCommentsDropdown(); 
    renderCommentsList();
}

function updateCommentsDropdown() {
    const select = document.getElementById('commentsGameSelect');
    if(!select) return;
    const available = games.filter(g => !g.hasCommentSection && (currentCommentsMode === 'tv' ? g.type !== 'Jogo' : g.type === 'Jogo')).sort((a,b) => (a.name||"").localeCompare(b.name||""));
    select.innerHTML = '<option value="">Selecione uma obra da biblioteca...</option>' + available.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
}

async function addGameToComments() {
    const select = document.getElementById('commentsGameSelect');
    if(!select) return;
    const id = select.value;
    if(!id) return; 
    const g = games.find(x => x.id === id);
    if(g) { 
        g.hasCommentSection = true; 
        g.comment = g.comment || ''; 
        await manualSave(); 
        updateCommentsDropdown(); 
        renderCommentsList(); 
    }
}

function toggleCommentSize(id, btn) {
    const ta = document.getElementById(`comment-text-${id}`);
    if(!ta) return;
    if(ta.classList.contains('h-24')) {
        ta.classList.remove('h-24'); ta.classList.add('h-48');
        btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>';
    } else {
        ta.classList.add('h-24'); ta.classList.remove('h-48');
        btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>';
    }
}

async function saveSpecificComment(id) { 
    const g = games.find(x => x.id === id); 
    const ta = document.getElementById(`comment-text-${id}`);
    if(g && ta) { 
        g.comment = ta.value; 
        await manualSave(); 
    } 
}

async function removeCommentSec(id) { 
    if(confirm('Remover esta obra das análises?')) { 
        const g = games.find(x => x.id === id); 
        if(g) { 
            g.hasCommentSection = false; 
            g.comment = ''; 
            await manualSave(); 
            updateCommentsDropdown(); 
            renderCommentsList(); 
        } 
    } 
}

function renderCommentsList() {
    const container = document.getElementById('commentsListContainer');
    if(!container) return;
    const searchQ = (document.getElementById('commentSearchInput')?.value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    const commented = games.filter(g => g.hasCommentSection && (currentCommentsMode === 'tv' ? g.type !== 'Jogo' : g.type === 'Jogo') && (g.name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(searchQ)).sort((a,b) => (a.name||"").localeCompare(b.name||""));
    
    container.innerHTML = commented.map(g => {
        const hlColor = currentCommentsMode === 'tv' ? 'var(--accent)' : '#3b82f6';
        return `
        <div class="flex items-start p-3 gap-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl relative group overflow-hidden">
            <div class="w-16 h-24 flex-shrink-0 rounded-md overflow-hidden border border-[var(--border)] bg-[var(--input)]">
                <img src="${g.cover || ''}" class="w-full h-full object-cover" onerror="this.src='https://via.placeholder.com/150x225?text=Capa'">
            </div>
            <div class="flex flex-col justify-center overflow-hidden w-1/4 min-w-[120px] h-24">
                <h4 class="text-xs font-black uppercase text-[var(--text-main)] truncate w-full" title="${g.name}">${g.name}</h4>
                <span class="text-[10px] font-bold mt-1.5 flex items-center gap-1" style="color: ${hlColor}">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    ${formatMinutes(calculateItemTotalMinutes(g))}
                </span>
                <span class="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-[var(--input)] border border-[var(--border)] type-${(g.type || 'filme').toLowerCase().replace(' ', '-')} w-max mt-1.5 shadow-inner tracking-widest truncate max-w-full">${g.type || 'Filme'}</span>
            </div>
            <div class="flex-1 relative flex items-start">
                <textarea id="comment-text-${g.id}" class="modern-input w-full h-24 text-xs text-comment-normal resize-none transition-all duration-300 pr-8" placeholder="Escreva sua análise..." onchange="saveSpecificComment('${g.id}')">${g.comment || ''}</textarea>
                <button onclick="toggleCommentSize('${g.id}', this)" class="absolute right-2 bottom-2 w-6 h-6 rounded border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center text-[var(--text-dim)] hover:text-white transition" title="Expandir"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg></button>
            </div>
            <button onclick="removeCommentSec('${g.id}')" class="absolute top-1 right-1 text-red-500 opacity-0 group-hover:opacity-100 text-[10px] p-1 bg-[var(--surface)] rounded-full shadow-md z-10 transition-opacity" title="Excluir">✖</button>
        </div>
    `}).join('') || '<div class="text-center p-8 opacity-40"><p class="text-xs font-bold uppercase tracking-widest">Nenhuma análise encontrada nesta aba.</p></div>';
}

// --- BACKUP E RESTAURAÇÃO ---
async function exportBackup() {
    const profilePic = await localforage.getItem('ct_profile_pic_v70');
    const backupData = { 
        games: games, 
        aguardados: aguardados, 
        deathList: deathListData, 
        seriesList: seriesListData,
        malucosList: malucosListData,
        listas: customListas, 
        franquias: franquiasData,
        jogosPlataformas: jogosPlataformasData,
        stores: storesData,
        storeGames: storeGamesData,
        generosTipos: generosTiposData,
        profilePic: profilePic || null
    };
    
    const jsonString = JSON.stringify(backupData);
    const exportJson = confirm("Deseja exportar no formato padrão (.json)?\n\n[OK] Formato Padrão (.json) - Texto legível, arquivo maior.\n[Cancelar] Formato Otimizado (.ctbak) - Comprimido e mais rápido.");
    
    var blob;
    var filename;

    if (exportJson) {
        blob = new Blob([jsonString], { type: 'application/json' });
        filename = `meutvtime_full_backup.json`;
    } else {
        const stream = new Blob([jsonString], { type: 'application/json' }).stream();
        const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
        const compressedResponse = new Response(compressedStream);
        blob = await compressedResponse.blob();
        filename = `meutvtime_full_backup.ctbak`;
    }
    
    const a = document.createElement('a'); 
    a.href = URL.createObjectURL(blob); 
    a.download = filename; 
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function importBackup(e) {
    const file = e.target.files[0]; 
    if(!file) return;

    try {
        const arrayBuffer = await file.arrayBuffer();
        var d = null;

        if (file.name.toLowerCase().endsWith('.json')) {
            const text = new TextDecoder().decode(arrayBuffer);
            d = JSON.parse(text);
        } else {
            try {
                const stream = new Blob([arrayBuffer]).stream();
                const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
                const decompressedResponse = new Response(decompressedStream);
                const text = await decompressedResponse.text();
                d = JSON.parse(text);
            } catch (gzipError) {
                const text = new TextDecoder().decode(arrayBuffer);
                d = JSON.parse(text);
            }
        }

        if (d && (d.games || d.aguardados || d.deathList || d.seriesList || d.malucosList || d.listas || d.franquias || d.profilePic)) {
            const isMerge = confirm("Você deseja MESCLAR (juntar) este backup com sua biblioteca atual?\n\n[OK] para Mesclar (Atualiza horas, episódios e unifica listas)\n[Cancelar] para SUBSTITUIR (Apaga a atual e usa a do backup)");

            if (isMerge) {
                if(d.games) {
                    d.games.forEach(impG => {
                        var novaObra = { ...impG, id: crypto.randomUUID() };
                        games.push(novaObra);
                    });
                    await localforage.setItem(DB_NAME, games);
                }
                if(d.aguardados) {
                    d.aguardados.forEach(impA => {
                        const exists = aguardados.find(a => a.name === impA.name);
                        if(!exists) aguardados.push(impA);
                    });
                    await localforage.setItem('ct_aguardados_v70', aguardados);
                }
                if(d.deathList) {
                    var emptyIndex = 0;
                    d.deathList.forEach(itemImportado => {
                        if (itemImportado.name || itemImportado.cover) {
                            const jaExiste = deathListData.some(item => item.name === itemImportado.name && item.name !== '');
                            if (!jaExiste) {
                                while (emptyIndex < 100 && deathListData[emptyIndex].name !== '') { emptyIndex++; }
                                if (emptyIndex < 100) { deathListData[emptyIndex] = itemImportado; }
                            }
                        }
                    });
                    await localforage.setItem('cineDeathList_v70', deathListData);
                }
                if(d.seriesList) {
                    var emptyIndex = 0;
                    d.seriesList.forEach(itemImportado => {
                        if (itemImportado.name || itemImportado.cover) {
                            const jaExiste = seriesListData.some(item => item.name === itemImportado.name && item.name !== '');
                            if (!jaExiste) {
                                while (emptyIndex < 100 && seriesListData[emptyIndex].name !== '') { emptyIndex++; }
                                if (emptyIndex < 100) { seriesListData[emptyIndex] = itemImportado; }
                            }
                        }
                    });
                    await localforage.setItem('cineSeriesList_v70', seriesListData);
                }
                if(d.malucosList) {
                    var emptyIndex = 0;
                    d.malucosList.forEach(itemImportado => {
                        if (itemImportado.name || itemImportado.cover) {
                            const jaExiste = malucosListData.some(item => item.name === itemImportado.name && item.name !== '');
                            if (!jaExiste) {
                                while (emptyIndex < 100 && malucosListData[emptyIndex].name !== '') { emptyIndex++; }
                                if (emptyIndex < 100) { malucosListData[emptyIndex] = itemImportado; }
                            }
                        }
                    });
                    await localforage.setItem('cineMalucosList_v70', malucosListData);
                }
                if(d.listas) {
                    d.listas.forEach(impL => {
                        const exists = customListas.find(l => l.id === impL.id || (l.title && impL.title && l.title.toLowerCase() === impL.title.toLowerCase()));
                        if(!exists) {
                            customListas.push(impL); 
                        } else {
                            if (impL.games) {
                                impL.games.forEach(gId => {
                                    if (typeof gId === 'string') {
                                        if (!exists.games.includes(gId)) exists.games.push(gId);
                                    } else {
                                        const extExists = exists.games.find(ex => typeof ex === 'object' && ex.name === gId.name);
                                        if (!extExists) exists.games.push(gId);
                                    }
                                });
                            }
                        }
                    });
                    await localforage.setItem('ct_listas_custom', customListas);
                }
                if(d.franquias) {
                    d.franquias.forEach(impF => {
                        const exists = franquiasData.find(f => f.id === impF.id || (f.name && impF.name && f.name.toLowerCase() === impF.name.toLowerCase()));
                        if(!exists) {
                            franquiasData.push(impF);
                        } else {
                            if (impF.games) {
                                impF.games.forEach(impGame => {
                                    const gameExists = exists.games.find(g => g.name.toLowerCase() === impGame.name.toLowerCase());
                                    if (!gameExists) {
                                        exists.games.push(impGame);
                                    } else if (impGame.completed && !gameExists.completed) {
                                        gameExists.completed = true;
                                    }
                                });
                            }
                        }
                    });
                    await localforage.setItem('ct_franquias_v70', franquiasData);
                }
                if(d.profilePic && !await localforage.getItem('ct_profile_pic_v70')) {
                    await localforage.setItem('ct_profile_pic_v70', d.profilePic);
                }
                
                alert("Backup MESCLADO com sucesso!");
                initApp();
            } else {
                const confReplace = confirm("Tem certeza? Isso vai APAGAR sua biblioteca atual e usar apenas a do backup.");
                if(!confReplace) { document.getElementById('fileInput').value = ""; return; }
                if(d.games) { games = d.games; await localforage.setItem(DB_NAME, games); }
                if(d.aguardados) { aguardados = d.aguardados; await localforage.setItem('ct_aguardados_v70', aguardados); }
                if(d.deathList) { deathListData = d.deathList; await localforage.setItem('cineDeathList_v70', deathListData); }
                if(d.seriesList) { seriesListData = d.seriesList; await localforage.setItem('cineSeriesList_v70', seriesListData); }
                if(d.malucosList) { malucosListData = d.malucosList; await localforage.setItem('cineMalucosList_v70', malucosListData); }
                if(d.listas) { customListas = d.listas; await localforage.setItem('ct_listas_custom', customListas); }
                if(d.franquias) { franquiasData = d.franquias; await localforage.setItem('ct_franquias_v70', franquiasData); }
                if(d.profilePic) { await localforage.setItem('ct_profile_pic_v70', d.profilePic); }
                
                alert("Backup IMPORTADO E SUBSTITUÍDO!");
                initApp();
            }
        } else { 
            alert("Arquivo inválido. O formato dos dados não bate com o esperado."); 
        }
    } catch(err) { 
        console.error("Erro técnico ao ler o arquivo:", err);
        alert("Erro técnico ao ler o arquivo. Veja o console (F12) para detalhes."); 
    } finally {
        document.getElementById('fileInput').value = "";
    }
}

/* ========================================================================= */
/* MOTOR 3D ORBITAL (ESFERA, OLHO DE PEIXE E FILEIRAS VERTICAIS)             */
/* ========================================================================= */

let orbitalActive = false;
let orbitalMode = 'sphere'; // 'sphere', 'fisheye' ou 'fileiras'
let orbitalData = [];
let orbitalFocusedItemId = null; 

// Variáveis Físicas e Câmera
let sphereRotX = 0, sphereRotY = 0;
let sphereZoom = -800;
let isDraggingOrbital = false;
let isFocusingOrbital = false; // Controla se a câmera está animando para o foco
let orbitalStartX = 0, orbitalStartY = 0;
let orbitalStartRotX = 0, orbitalStartRotY = 0;
let orbitalScrollLeft = 0, orbitalScrollTop = 0;

let orbitalAnimFrame = null;
let lastOrbitalTime = performance.now();
let dragThresholdPassed = false; // Controle de clique x drag

function abrirOrbital() {
    orbitalActive = true;
    orbitalFocusedItemId = null;
    isFocusingOrbital = false;
    lastOrbitalTime = performance.now();
    
    document.getElementById('orbitalModal').style.display = 'flex';
    
    limparBuscaOrbital();
    
    // Pega as obras da biblioteca global
    const baseList = typeof games !== 'undefined' ? games : [];
    let watchlistGames = baseList.filter(g => (g.status || 'watchlist').toLowerCase() === 'watchlist');
    
    // Embaralha a Watchlist toda vez que o modo 3D é aberto!
    for (let i = watchlistGames.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [watchlistGames[i], watchlistGames[j]] = [watchlistGames[j], watchlistGames[i]];
    }
    
    orbitalData = watchlistGames.slice(0, 300); // 300 obras com fluidez
    
    document.getElementById('hud-status-text').innerHTML = `COORD: 34.092 / 118.328<br/>ESCANEANDO [${orbitalData.length} OBRAS]`;
    
    sphereRotX = 0;
    sphereRotY = 0;
    sphereZoom = -800;

    atualizarUISliderOrbital(); // Atualiza a UI do Slide ao abrir!
    renderizarOrbital();
}

function fecharOrbital() {
    orbitalActive = false;
    orbitalFocusedItemId = null;
    isFocusingOrbital = false;
    document.getElementById('orbitalModal').style.display = 'none';
    if (orbitalAnimFrame) cancelAnimationFrame(orbitalAnimFrame);
    if (window.orbitalTweenFrame) cancelAnimationFrame(window.orbitalTweenFrame);
    document.body.classList.remove('is-dragging-3d');
}

// ---- NOVA LÓGICA DO SLIDER TRIPLO ----
function atualizarUISliderOrbital() {
    const sliderBg = document.getElementById('orbitalSliderBg');
    const btnSphere = document.getElementById('btnOrbitalSphere');
    const btnFisheye = document.getElementById('btnOrbitalFisheye');
    const btnFileiras = document.getElementById('btnOrbitalFileiras');
    
    if (!sliderBg) return;

    let index = 0;
    if (orbitalMode === 'fisheye') index = 1;
    if (orbitalMode === 'fileiras') index = 2;

    // Desloca o fundo brilhante para a aba correta
    sliderBg.style.transform = `translateX(${index * 100}%)`;
    
    // Reseta as cores para "desligado"
    [btnSphere, btnFisheye, btnFileiras].forEach(btn => {
        btn.classList.remove('text-cyan-400');
        btn.classList.add('text-white/50');
    });
    
    // Acende a cor de quem estiver ativo
    if (index === 0) { btnSphere.classList.add('text-cyan-400'); btnSphere.classList.remove('text-white/50'); }
    else if (index === 1) { btnFisheye.classList.add('text-cyan-400'); btnFisheye.classList.remove('text-white/50'); }
    else { btnFileiras.classList.add('text-cyan-400'); btnFileiras.classList.remove('text-white/50'); }
}

function setOrbitalMode(mode) {
    if (orbitalMode === mode) return; // Ignora se clicar no que já tá ativo
    
    orbitalMode = mode;
    atualizarUISliderOrbital();
    
    orbitalFocusedItemId = null; 
    isFocusingOrbital = false;
    renderizarOrbital();
}
// ---- SISTEMA DE BUSCA E FOCO ----
function limparBuscaOrbital() {
    const input = document.getElementById('orbitalSearchInput');
    const clearBtn = document.getElementById('orbitalClearBtn');
    if (input) input.value = '';
    if (clearBtn) {
        clearBtn.classList.add('opacity-0');
        setTimeout(() => clearBtn.classList.add('hidden'), 300);
    }
    destacarItemOrbital(null); 
}

function focarCameraEsfera(targetX, targetY) {
    if (window.orbitalTweenFrame) cancelAnimationFrame(window.orbitalTweenFrame);
    
    isFocusingOrbital = true; 
    
    let currentY = sphereRotY;
    let deltaY = (targetY - currentY) % 360;
    if (deltaY > 180) deltaY -= 360;
    if (deltaY < -180) deltaY += 360;
    let finalTargetY = currentY + deltaY;

    let currentX = sphereRotX;
    let deltaX = (targetX - currentX) % 360;
    if (deltaX > 180) deltaX -= 360;
    if (deltaX < -180) deltaX += 360;
    let finalTargetX = currentX + deltaX;
    
    const animate = () => {
        if (!orbitalActive) {
            isFocusingOrbital = false;
            return;
        }

        const diffX = Math.abs(finalTargetX - sphereRotX);
        const diffY = Math.abs(finalTargetY - sphereRotY);
        
        if (diffX < 0.5 && diffY < 0.5) {
            sphereRotX = finalTargetX;
            sphereRotY = finalTargetY;
            document.getElementById('orbitalScene').style.transform = `translateZ(${sphereZoom}px) rotateX(${sphereRotX}deg) rotateY(${sphereRotY}deg)`;
            isFocusingOrbital = false; 
            return;
        }
        
        sphereRotX += (finalTargetX - sphereRotX) * 0.08;
        sphereRotY += (finalTargetY - sphereRotY) * 0.08;
        
        document.getElementById('orbitalScene').style.transform = `translateZ(${sphereZoom}px) rotateX(${sphereRotX}deg) rotateY(${sphereRotY}deg)`;
        window.orbitalTweenFrame = requestAnimationFrame(animate);
    };
    animate();
}

function destacarItemOrbital(id, isSearch = false) {
    document.querySelectorAll('.orbital-focused-ring').forEach(el => {
        el.classList.remove('ring-4', 'ring-cyan-400', 'ring-fuchsia-500', 'shadow-[0_0_40px_rgba(34,211,238,0.8)]', 'shadow-[0_0_40px_rgba(217,70,239,0.8)]', 'orbital-focused-ring');
    });
    
    orbitalFocusedItemId = id;
    if (!id) return;

    // Busca o item original E o clone dele (para o modo fileiras)
    const items = [
        document.getElementById(`orbital-item-${id}`),
        document.getElementById(`clone-${id}`)
    ];

    items.forEach(itemEl => {
        if (itemEl) {
            let innerBox;
            if (orbitalMode === 'sphere') {
                innerBox = itemEl.firstElementChild;
            } else if (orbitalMode === 'fisheye') {
                innerBox = itemEl.querySelector('.fisheye-inner').firstElementChild;
            } else {
                innerBox = itemEl.firstElementChild; // Para Fileiras
            }
            
            if (isSearch) {
                innerBox.classList.add('ring-4', 'ring-fuchsia-500', 'shadow-[0_0_40px_rgba(217,70,239,0.8)]', 'orbital-focused-ring');
            } else {
                innerBox.classList.add('ring-4', 'ring-cyan-400', 'shadow-[0_0_40px_rgba(34,211,238,0.8)]', 'orbital-focused-ring');
            }
        }
    });
}

// Função unificada para focar na obra nos 3 modos
function focarObraDOM(itemEl) {
    if (!itemEl) return;
    
    if (orbitalMode === 'sphere') {
        const rX = parseFloat(itemEl.dataset.rotx);
        const rY = parseFloat(itemEl.dataset.roty);
        focarCameraEsfera(-rX, -rY); 
        
    } else if (orbitalMode === 'fisheye') {
        isFocusingOrbital = true; 
        itemEl.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
        
        setTimeout(() => {
            isFocusingOrbital = false;
        }, 800);
        
    } else if (orbitalMode === 'fileiras') {
        isFocusingOrbital = true; 
        
        // Fim do bug horizontal: Calculamos a rolagem VERTICAL da coluna manualmente
        const col = itemEl.closest('[id^="fileira-col-"]');
        if (col) {
            // Descobre o ponto exato para a capa ficar no centro vertical da coluna
            const targetScroll = itemEl.offsetTop - (col.clientHeight / 2) + (itemEl.clientHeight / 2);
            
            // Manda rolar de forma suave, sem afetar o eixo X (horizontal) da tela
            col.scrollTo({ top: targetScroll, behavior: 'smooth' });
            
            setTimeout(() => {
                isFocusingOrbital = false;
                col.dataset.exactScroll = col.scrollTop; 
            }, 800);
        }
    }
}
function focarObraOrbital(termo) {
    const clearBtn = document.getElementById('orbitalClearBtn');
    
    if (termo && termo.trim() !== '') {
        clearBtn.classList.remove('hidden');
        setTimeout(() => clearBtn.classList.remove('opacity-0'), 10);
    } else {
        clearBtn.classList.add('opacity-0');
        setTimeout(() => clearBtn.classList.add('hidden'), 300);
        destacarItemOrbital(null);
        return;
    }
    
    const query = termo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const match = orbitalData.find(g => (g.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(query));
    
    if (match) {
        destacarItemOrbital(match.id, true); 
        const itemEl = document.getElementById(`orbital-item-${match.id}`);
        focarObraDOM(itemEl);
    }
}

function sortearOrbital() {
    if (orbitalData.length === 0) return alert("Nenhuma obra encontrada para sortear!");
    const randomGame = orbitalData[Math.floor(Math.random() * orbitalData.length)];
    focarObraOrbital(randomGame.name);
}

// ---- RENDERIZAÇÃO E MOTOR 3D ----
function renderizarOrbital() {
    if (orbitalAnimFrame) cancelAnimationFrame(orbitalAnimFrame);
    if (window.orbitalTweenFrame) cancelAnimationFrame(window.orbitalTweenFrame);

    const container = document.getElementById('orbitalContainer');
    const scene = document.getElementById('orbitalScene');
    scene.innerHTML = ''; 

    // ==========================================
    // MODO 1: ESFERA (MANTIDO INTACTO)
    // ==========================================
    if (orbitalMode === 'sphere') {
        container.style.overflow = 'hidden';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        
        scene.className = 'relative w-0 h-0';
        scene.style.width = '0';
        scene.style.height = '0';
        scene.style.padding = '0';
        scene.style.gridTemplateColumns = ''; // Limpa grid do fisheye
        scene.style.transform = `translateZ(${sphereZoom}px) rotateX(${sphereRotX}deg) rotateY(${sphereRotY}deg)`;
        
        const numItems = orbitalData.length;
        const radius = 1000;
        const goldenAngle = Math.PI * (3 - Math.sqrt(5));

        orbitalData.forEach((movie, i) => {
            const y = numItems > 1 ? 1 - (i / (numItems - 1)) * 2 : 0;
            const radiusAtY = Math.sqrt(1 - y * y);
            const theta = goldenAngle * i;
            
            const x = Math.cos(theta) * radiusAtY;
            const z = Math.sin(theta) * radiusAtY;
            
            const rotateY = Math.atan2(x, z) * (180 / Math.PI);
            const rotateX = Math.asin(-y) * (180 / Math.PI);
            
            // Tratamento contra Z-Fighting (Pequenas variações na distância para as capas não se cortarem)
            const raioEmCamadas = radius + (Math.random() * 80 - 40);

            const item = document.createElement('div');
            item.id = `orbital-item-${movie.id}`; 
            item.dataset.rotx = rotateX;          
            item.dataset.roty = rotateY;          
            item.className = 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 group transition-all duration-300 cursor-pointer z-0';
            item.style.width = '160px';
            item.style.height = '240px';
            item.style.transformStyle = 'preserve-3d';
            item.style.transform = `rotateY(${rotateY}deg) rotateX(${rotateX}deg) translateZ(${raioEmCamadas}px)`;
            
            item.innerHTML = `
                <div class="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#2a2a2a] via-[#111] to-[#050505] p-[4px] shadow-[0_10px_30px_rgba(0,0,0,0.8)] group-hover:scale-110 transition-all duration-300 border border-transparent group-hover:border-cyan-400">
                    <div class="w-full h-full rounded-xl overflow-hidden relative bg-black shadow-[inset_0_0_20px_rgba(0,0,0,0.9)]">
                        <img src="${movie.cover}" class="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none" draggable="false" onerror="this.src='https://via.placeholder.com/300x450?text=Capa'">
                    </div>
                </div>
            `;
            
            item.addEventListener('mouseup', (e) => { 
                e.stopPropagation();
                if (!dragThresholdPassed) { 
                    if (orbitalFocusedItemId === movie.id) {
                        document.getElementById('detailsModal').style.zIndex = '10000';
                        openDetails(movie.id); 
                    } else {
                        destacarItemOrbital(movie.id, false); 
                        focarObraDOM(item);
                    }
                }
            });
            scene.appendChild(item);
        });

    // ==========================================
    // MODO 2: OLHO DE PEIXE (MANTIDO INTACTO)
    // ==========================================
    } else if (orbitalMode === 'fisheye') {
        container.style.display = 'block';
        container.style.overflow = 'hidden'; 
        
        scene.className = 'relative grid place-content-center gap-6 md:gap-10';
        scene.style.width = '4000px';
        scene.style.height = '3500px';
        scene.style.transform = 'none';
        scene.style.padding = '1000px';
        scene.style.gridTemplateColumns = 'repeat(10, minmax(0, 1fr))';

        orbitalData.forEach(movie => {
            const item = document.createElement('div');
            item.id = `orbital-item-${movie.id}`; 
            item.className = 'w-[200px] h-[300px] md:w-[220px] md:h-[330px] flex items-center justify-center cursor-pointer fisheye-container z-0';
            item.style.transformStyle = 'preserve-3d';
            
            item.innerHTML = `
                <div class="fisheye-inner relative transition-transform origin-center w-full h-full" style="transform-style: preserve-3d; will-change: transform, opacity;">
                    <div class="absolute inset-0 rounded-[24px] bg-gradient-to-br from-[#2a2a2a] via-[#111] to-[#050505] p-[6px] shadow-[0_20px_50px_rgba(0,0,0,0.8)] transition-all duration-300 hover:scale-[1.05] border border-transparent hover:border-cyan-400">
                        <div class="w-full h-full rounded-[18px] overflow-hidden relative bg-black">
                            <img src="${movie.cover}" class="w-full h-full object-cover opacity-70 hover:opacity-100 hover:scale-110 transition-all duration-500 pointer-events-none" draggable="false" onerror="this.src='https://via.placeholder.com/300x450?text=Capa'">
                        </div>
                    </div>
                </div>
            `;
            
            item.addEventListener('mouseup', (e) => { 
                e.stopPropagation();
                if (!dragThresholdPassed) { 
                    if (orbitalFocusedItemId === movie.id) {
                        document.getElementById('detailsModal').style.zIndex = '10000';
                        openDetails(movie.id); 
                    } else {
                        destacarItemOrbital(movie.id, false); 
                        focarObraDOM(item);
                    }
                }
            });
            scene.appendChild(item);
        });

        container.scrollLeft = (4000 - container.clientWidth) / 2;
        container.scrollTop = (3500 - container.clientHeight) / 2;

    // ==========================================
    // MODO 3: FILEIRAS CENTRAIS
    // ==========================================
    } else if (orbitalMode === 'fileiras') {
        container.style.display = 'flex';
        container.style.overflow = 'hidden'; 
        container.style.justifyContent = 'center'; 
        container.style.alignItems = 'center';

        scene.className = 'relative flex gap-2 sm:gap-4 md:gap-6 w-full h-full justify-center overflow-hidden max-w-[1200px] mx-auto';
        scene.style.width = '100%';
        scene.style.height = '100%';
        scene.style.transform = 'none';
        scene.style.padding = '0';
        scene.style.gridTemplateColumns = '';

        // Configura as 4 fileiras
        for (let c = 0; c < 4; c++) {
            const col = document.createElement('div');
            col.id = `fileira-col-${c}`;
            col.className = 'flex flex-col gap-2 sm:gap-4 md:gap-6 w-[23vw] sm:w-[160px] md:w-[200px] h-full overflow-y-auto no-scrollbar py-4 pointer-events-auto flex-shrink-0';
            scene.appendChild(col);
        }

        // Distribui os itens entre as 4 colunas
        orbitalData.forEach((movie, i) => {
            const colIndex = i % 4;
            const col = document.getElementById(`fileira-col-${colIndex}`);

            const item = document.createElement('div');
            item.id = `orbital-item-${movie.id}`; 
            item.className = 'w-full h-[34vw] sm:h-[240px] md:h-[300px] flex-shrink-0 cursor-pointer group';
            
            item.innerHTML = `
                <div class="relative w-full h-full rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#2a2a2a] via-[#111] to-[#050505] p-1 sm:p-[4px] shadow-[0_10px_30px_rgba(0,0,0,0.8)] transition-all duration-300 hover:scale-[1.03] border border-transparent hover:border-cyan-400">
                    <div class="w-full h-full rounded-[10px] sm:rounded-[14px] overflow-hidden relative bg-black shadow-[inset_0_0_20px_rgba(0,0,0,0.9)]">
                        <img src="${movie.cover}" class="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none" draggable="false" onerror="this.src='https://via.placeholder.com/300x450?text=Capa'">
                    </div>
                </div>
            `;
            
            item.addEventListener('mouseup', (e) => { 
                e.stopPropagation();
                if (!dragThresholdPassed) { 
                    if (orbitalFocusedItemId === movie.id) {
                        document.getElementById('detailsModal').style.zIndex = '10000';
                        openDetails(movie.id); 
                    } else {
                        destacarItemOrbital(movie.id, false); 
                        focarObraDOM(item);
                    }
                }
            });

            col.appendChild(item);
        });

        // Clona os itens para criar o loop contínuo perfeitamente
        setTimeout(() => {
            for (let c = 0; c < 4; c++) {
                const col = document.getElementById(`fileira-col-${c}`);
                const children = Array.from(col.children);
                
                children.forEach(child => {
                    const clone = child.cloneNode(true);
                    clone.id = clone.id.replace('orbital-item-', 'clone-');
                    const movieId = clone.id.replace('clone-', '');
                    
                    clone.addEventListener('mouseup', (e) => {
                        e.stopPropagation();
                        if (!dragThresholdPassed) {
                            if (orbitalFocusedItemId === movieId) {
                                document.getElementById('detailsModal').style.zIndex = '10000';
                                openDetails(movieId);
                            } else {
                                destacarItemOrbital(movieId, false);
                                focarObraDOM(clone);
                            }
                        }
                    });
                    
                    col.appendChild(clone);
                });
                
                if (c % 2 !== 0) {
                    col.scrollTop = col.scrollHeight / 2;
                }
                col.dataset.exactScroll = col.scrollTop;
            }
        }, 50);
    }

    lastOrbitalTime = performance.now();
    animarLoopFisico();
}

function animarLoopFisico(time) {
    if (!orbitalActive) return;
    
    const delta = time - lastOrbitalTime;
    lastOrbitalTime = time;
    
    // Animação Automática (Esfera)
    if (orbitalMode === 'sphere' && !isDraggingOrbital && !isFocusingOrbital) {
        if (delta < 100) { 
            sphereRotY += 0.005 * delta; 
            document.getElementById('orbitalScene').style.transform = `translateZ(${sphereZoom}px) rotateX(${sphereRotX}deg) rotateY(${sphereRotY}deg)`;
        }
    }
    
    // Lente Fisheye
    if (orbitalMode === 'fisheye') {
        atualizarLenteFisheye();
    }

    // Animação Automática Cruzada (Fileiras)
    if (orbitalMode === 'fileiras' && !isDraggingOrbital && !isFocusingOrbital) {
        const speed = 0.015 * delta; // Movimento suave lento
        
        for (let c = 0; c < 4; c++) {
            const col = document.getElementById(`fileira-col-${c}`);
            if (!col || col.scrollHeight === 0) continue;
            
            if (col.dataset.exactScroll === undefined) {
                col.dataset.exactScroll = col.scrollTop;
            }
            
            // Pares sobem (dir = 1), Ímpares descem (dir = -1)
            let dir = (c % 2 === 0) ? 1 : -1; 
            let exactValue = parseFloat(col.dataset.exactScroll) + (speed * dir);

            const halfHeight = col.scrollHeight / 2;
            
            // Teletransporte invisível para o loop contínuo
            if (dir === 1 && exactValue >= halfHeight) {
                exactValue -= halfHeight;
            } else if (dir === -1 && exactValue <= 0) {
                exactValue += halfHeight;
            }

            col.dataset.exactScroll = exactValue;
            col.scrollTop = exactValue;
        }
    }
    
    orbitalAnimFrame = requestAnimationFrame(animarLoopFisico);
}

function atualizarLenteFisheye() {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const maxDist = Math.max(cx, cy) * 1.5;

    document.querySelectorAll('.fisheye-container').forEach(containerEl => {
        const rect = containerEl.getBoundingClientRect();
        
        if (rect.right < -100 || rect.left > window.innerWidth + 100 || rect.bottom < -100 || rect.top > window.innerHeight + 100) {
            containerEl.querySelector('.fisheye-inner').style.opacity = 0;
            return;
        }

        const itemCx = rect.left + rect.width / 2;
        const itemCy = rect.top + rect.height / 2;
        
        const dx = itemCx - cx;
        const dy = itemCy - cy;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalizedDist = Math.min(distance / maxDist, 1);
        
        const z = -Math.pow(distance, 1.2) * 0.4;
        const rotateY = (dx / cx) * -40; 
        const rotateX = (dy / cy) * 40;
        
        const inner = containerEl.querySelector('.fisheye-inner');
        if (inner) {
            const opacity = Math.max(0.1, 1 - normalizedDist * 0.7);
            inner.style.transform = `translateZ(${z}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            inner.style.opacity = opacity;
        }
    });
}

// ==========================================
// INTERAÇÕES UNIFICADAS (DRAG & ZOOM)
// ==========================================

function initDragOrbital(e) {
    if (!orbitalActive) return;
    isDraggingOrbital = true;
    dragThresholdPassed = false; 
    isFocusingOrbital = false; 
    
    if (e.type === 'touchstart') {
        orbitalStartX = e.touches[0].clientX;
        orbitalStartY = e.touches[0].clientY;
    } else {
        orbitalStartX = e.clientX;
        orbitalStartY = e.clientY;
    }

    if (orbitalMode === 'sphere') {
        if (window.orbitalTweenFrame) cancelAnimationFrame(window.orbitalTweenFrame);
        orbitalStartRotX = sphereRotX;
        orbitalStartRotY = sphereRotY;
    } else if (orbitalMode === 'fisheye') {
        const container = document.getElementById('orbitalContainer');
        orbitalScrollLeft = container.scrollLeft;
        orbitalScrollTop = container.scrollTop;
    } else if (orbitalMode === 'fileiras') {
        for (let c = 0; c < 4; c++) {
            const col = document.getElementById(`fileira-col-${c}`);
            if (col) col.dataset.startScroll = col.scrollTop;
        }
    }
}

function moveDragOrbital(e) {
    if (!isDraggingOrbital || !orbitalActive) return;

    let currentX, currentY;
    if (e.type === 'touchmove') {
        currentX = e.touches[0].clientX;
        currentY = e.touches[0].clientY;
    } else {
        currentX = e.clientX;
        currentY = e.clientY;
    }

    const diffX = currentX - orbitalStartX;
    const diffY = currentY - orbitalStartY;

    if (Math.abs(diffX) > 5 || Math.abs(diffY) > 5) {
        dragThresholdPassed = true; 
        document.body.classList.add('is-dragging-3d');
    }

    if (orbitalMode === 'sphere') {
        sphereRotY = orbitalStartRotY + diffX * 0.5;
        sphereRotX = orbitalStartRotX - diffY * 0.5;
        sphereRotX = Math.max(-90, Math.min(90, sphereRotX));
        document.getElementById('orbitalScene').style.transform = `translateZ(${sphereZoom}px) rotateX(${sphereRotX}deg) rotateY(${sphereRotY}deg)`;
    
    } else if (orbitalMode === 'fisheye') {
        const container = document.getElementById('orbitalContainer');
        container.scrollLeft = orbitalScrollLeft - diffX;
        container.scrollTop = orbitalScrollTop - diffY;
    
    } else if (orbitalMode === 'fileiras') {
        for (let c = 0; c < 4; c++) {
            const col = document.getElementById(`fileira-col-${c}`);
            if (col) {
                // Ao arrastar com o mouse, a fileira acompanha
                col.scrollTop = parseFloat(col.dataset.startScroll) - diffY;
                col.dataset.exactScroll = col.scrollTop; 

                const halfHeight = col.scrollHeight / 2;
                if (col.scrollTop >= halfHeight) {
                    col.scrollTop -= halfHeight;
                    col.dataset.startScroll = parseFloat(col.dataset.startScroll) - halfHeight;
                    col.dataset.exactScroll = col.scrollTop;
                }
                if (col.scrollTop <= 0) {
                    col.scrollTop += halfHeight;
                    col.dataset.startScroll = parseFloat(col.dataset.startScroll) + halfHeight;
                    col.dataset.exactScroll = col.scrollTop;
                }
            }
        }
    }
}

function endDragOrbital() {
    isDraggingOrbital = false;
    document.body.classList.remove('is-dragging-3d');
}

function handleZoomOrbital(e) {
    if (!orbitalActive || orbitalMode !== 'sphere') return;
    sphereZoom -= e.deltaY * 0.8;
    sphereZoom = Math.max(-2500, Math.min(200, sphereZoom));
    document.getElementById('orbitalScene').style.transform = `translateZ(${sphereZoom}px) rotateX(${sphereRotX}deg) rotateY(${sphereRotY}deg)`;
}

// Eventos Globais do Motor 3D 
document.addEventListener('mousedown', initDragOrbital, { passive: false });
document.addEventListener('mousemove', moveDragOrbital, { passive: false });
window.addEventListener('mouseup', endDragOrbital, true); 

document.addEventListener('touchstart', initDragOrbital, { passive: false });
document.addEventListener('touchmove', moveDragOrbital, { passive: false });
window.addEventListener('touchend', endDragOrbital, true);

document.addEventListener('wheel', handleZoomOrbital, { passive: false });
// ====================================================
// DROPDOWNS E BOOT DO APLICATIVO
// ====================================================
function toggleDropdown(event) {
    event.stopPropagation();
    const container = event.currentTarget.closest('.dropdown-container');
    const menu = container.querySelector('.dropdown-menu');
    
    document.querySelectorAll('.dropdown-menu').forEach(m => {
        if (m !== menu) m.classList.add('hidden');
    });
    menu.classList.toggle('hidden');
}

function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.add('hidden'));
}

window.addEventListener('click', () => { closeAllDropdowns(); });

async function bootApp() {
    if (isPwaBooted) return;
    await initApp();
    
    const hasData = games.length > 0 || customListas.length > 0 || franquiasData.length > 0 || deathListData.some(d => d.name !== '') || seriesListData.some(d => d.name !== '') || malucosListData.some(d => d.name !== '');
    if (hasData) { enterApp(); }
    isPwaBooted = true;
}

bootApp();

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        if (isStandalone && isPwaBooted) { initApp(); }
    }
});

// Inicializador Principal
async function initApp() { 
    await loadData();
    await loadProfilePic();
    checkDataStatus();
    switchAppMode(currentAppMode, true);
    resetAndRender(); 
    renderAbsoluteCinema(); 
    if(typeof renderAbsoluteVideoGame === 'function') renderAbsoluteVideoGame(); 
    initUnifiedAutoScroll(); 
    loadCustomBackground();  
}

window.onload = initApp;