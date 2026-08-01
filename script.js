
        // ====================================================
        // LÓGICA DA TELA DE BOAS VINDAS E PERFIL
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
            
            // Garante que o botão fica sempre destravado
            btnStart.disabled = false;
            
            if (hasData) {
                btnStart.innerText = "INICIAR SESSÃO";
            } else {
                btnStart.innerText = "COMEÇAR DO ZERO";
            }
        }

        // ====================================================
        // RESTANTE DO CÓDIGO INTACTO E ATUALIZADO
        // ====================================================
        const DB_NAME = 'meu tv time_v70';
        let games = [];
        let aguardados = [];
        let deathListData = Array.from({length: 100}, () => ({cover: '', name: '', rating: 0}));
        let seriesListData = Array.from({length: 100}, () => ({cover: '', name: '', rating: 0}));
        let malucosListData = Array.from({length: 100}, () => ({cover: '', name: '', rating: 0}));
        let customListas = [];
        let franquiasData = [];

        let displayLimit = 20;
        let currentFiltered = [];
        let favFilter = 'all';
        let currentBadgeFilter = 'all'; 
        let viewMode = 'grid'; // Controla o layout (grid ou list) 

        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js').catch(err => console.log('Erro no SW:', err));
            });
        }

        async function urlToBase64(url, useProxy = false) {
            if (!url || url.startsWith('data:image')) return url;
            
            return new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'Anonymous'; 
                
                const timer = setTimeout(() => {
                    resolve(url); 
                }, 5000); 
                
                img.onload = () => {
                    clearTimeout(timer);
                    try {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        
                        const MAX_WIDTH = 300; 
                        let scaleSize = MAX_WIDTH / img.width;
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

        async function loadData() {
            try {
                let loadedGames = await localforage.getItem(DB_NAME);
                let loadedAguardados = await localforage.getItem('ct_aguardados_v70');
                let loadedDeathList = await localforage.getItem('cineDeathList_v70');
                let loadedSeriesList = await localforage.getItem('cineSeriesList_v70');
                let loadedMalucosList = await localforage.getItem('cineMalucosList_v70');
                let loadedListas = await localforage.getItem('ct_listas_custom');
                let loadedFranquias = await localforage.getItem('ct_franquias_v70');

                if (!loadedGames && localStorage.getItem('meu tv timer_v50')) {
                    loadedGames = JSON.parse(localStorage.getItem('meu tv time_v50'));
                    await localforage.setItem(DB_NAME, loadedGames);
                }
                
                if (loadedGames) games = loadedGames;
                if (loadedAguardados) aguardados = loadedAguardados;
                if (loadedDeathList) deathListData = loadedDeathList;
                if (loadedSeriesList) seriesListData = loadedSeriesList;
                if (loadedMalucosList) malucosListData = loadedMalucosList;
                if (loadedListas) customListas = loadedListas;
                if (loadedFranquias) franquiasData = loadedFranquias;
            } catch (err) {
                console.error("Erro ao carregar dados:", err);
            }
        }

        let scrollObserver;
        function setupScrollObserver() {
            if(scrollObserver) scrollObserver.disconnect();
            const sentinel = document.getElementById('scrollSentinel');
            const options = { root: document.getElementById('scrollContainer'), threshold: 0.1 };
            scrollObserver = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && displayLimit < currentFiltered.length) {
                    displayLimit += 20;
                    renderGamesGridOnly(); 
                } else if (displayLimit >= currentFiltered.length) {
                    sentinel.innerText = "FIM DA BIBLIOTECA";
                    sentinel.style.opacity = "0.2";
                }
            }, options);
            scrollObserver.observe(sentinel);
        }

        function toggleBlock(id, btn) {
            const el = document.getElementById(id);
            const isCollapsed = el.classList.toggle('section-collapsed');
            btn.innerText = isCollapsed ? '＋' : '−';
        }

        /* === SISTEMA DE FRANQUIAS === */
        function openFranquias() {
            document.getElementById('franquiasModal').style.display = 'flex';
            renderFranquias();
        }

        function closeFranquias() {
            document.getElementById('franquiasModal').style.display = 'none';
        }

        function renderFranquias() {
            franquiasData.sort((a, b) => a.name.localeCompare(b.name));
            const sidebar = document.getElementById('franquiasSidebarList');
            const grid = document.getElementById('franquiasGrid');

            let sidebarHTML = '';

            franquiasData.forEach((f) => {
                let total = f.games.length;
                let zerados = f.games.filter(g => g.completed).length;
                let perc = total > 0 ? ((zerados / total) * 100).toFixed(0) : 0;
                let percText = perc + '%';
                
                sidebarHTML += `
                    <div class="flex border-b border-[var(--border)] text-[11px] font-bold hover:bg-[var(--input)] transition-colors cursor-pointer group" onclick="document.getElementById('franq-${f.id}').scrollIntoView({behavior:'smooth'})">
                        <div class="flex-1 py-3 px-4 text-[var(--text-dim)] group-hover:text-[var(--text-main)] truncate transition-colors" title="${f.name}">${f.name}</div>
                        <div class="w-16 py-3 px-2 text-center border-l border-[var(--border)] ${perc == 100 ? 'text-[var(--green)] drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'text-[var(--accent)]'}">${percText}</div>
                    </div>
                `;
            });
            sidebar.innerHTML = sidebarHTML || '<div class="text-center py-6 text-xs opacity-40 font-bold uppercase tracking-widest text-[var(--text-main)]">Lista Vazia</div>';

            const grouped = {};
            franquiasData.forEach(f => {
                let letter = f.name.charAt(0).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                if (!/[A-Z]/.test(letter)) letter = '#';
                if (!grouped[letter]) grouped[letter] = [];
                grouped[letter].push(f);
            });

            const sortedLetters = Object.keys(grouped).sort();

            if (sortedLetters.length === 0) {
                grid.innerHTML = '<div class="w-full text-center py-20 opacity-40 font-black uppercase text-sm text-[var(--text-main)] tracking-widest absolute left-0 right-0 mt-10">Nenhuma franquia foi criada. Use o botão "+ Nova Franquia".</div>';
                return;
            }

            let gridHTML = '';
            sortedLetters.forEach(letter => {
                let colHTML = `
                    <div class="flex-shrink-0 w-[300px] sm:w-[350px] lg:w-[400px] flex flex-col gap-6 relative">
                        <div class="bg-[var(--sticky-bg)] backdrop-blur-md text-[var(--accent)] font-black text-center py-2 text-2xl uppercase tracking-widest sticky top-0 z-20 shadow-[0_5px_15px_var(--shadow-heavy)] border border-[var(--border)] rounded-xl drop-shadow-[0_0_8px_rgba(225,29,72,0.4)]">
                            ${letter}
                        </div>
                        <div class="flex flex-col gap-6">
                `;

                grouped[letter].forEach(f => {
                    let total = f.games.length;
                    let zerados = f.games.filter(g => g.completed).length;
                    let perc = total > 0 ? ((zerados / total) * 100).toFixed(0) : 0;
                    let percText = perc + '%';
                    
                    let gamesHTML = f.games.map((g, gIndex) => {
                        return `
                        <div class="flex items-center gap-3 py-2.5 px-4 border-b border-dashed border-[var(--border)] hover:bg-[var(--white-highlight)] transition-colors group relative">
                            <input type="checkbox" ${g.completed ? 'checked' : ''} onchange="toggleFranquiaObra('${f.id}', ${gIndex})" class="w-4 h-4 game-checkbox" style="accent-color: var(--accent);">
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
                                <span class="text-[11px] font-black ${perc == 100 ? 'text-[var(--green)] drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'text-[var(--accent)] drop-shadow-[0_0_5px_rgba(225,29,72,0.5)]'}">${percText}</span>
                                <div class="absolute bottom-0 left-0 w-full h-1 bg-[var(--surface)]">
                                    <div class="h-full ${perc == 100 ? 'bg-[var(--green)] shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-[var(--accent)] shadow-[0_0_8px_rgba(225,29,72,0.5)]'} transition-all duration-500" style="width: ${perc}%"></div>
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
            let name = prompt("Digite o nome da Franquia/Saga:");
            if (name && name.trim()) {
                franquiasData.push({ id: crypto.randomUUID(), name: name.trim(), games: [] });
                await manualSave();
                renderFranquias();
            }
        }

        async function promptAddObraFranquia(id) {
            let nomes = prompt("Digite os títulos das obras (separe por vírgula para adicionar várias de uma vez):");
            if (nomes && nomes.trim()) {
                let f = franquiasData.find(x => x.id === id);
                let listaNomes = nomes.split(',').map(n => n.trim()).filter(n => n);
                listaNomes.forEach(nome => {
                    f.games.push({ name: nome, completed: false });
                });
                await manualSave();
                renderFranquias();
            }
        }

        async function toggleFranquiaObra(id, gameIndex) {
            let f = franquiasData.find(x => x.id === id);
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
                let f = franquiasData.find(x => x.id === id);
                f.games.splice(gameIndex, 1);
                await manualSave();
                renderFranquias();
            }
        }

        /* === LISTAS CUSTOMIZADAS === */
        let currentListaId = null;
        let draggedGameIndex = null;

        function openListas() {
            document.getElementById('listasMainModal').style.display = 'flex';
            renderListasGrid();
        }
        function closeListas() { document.getElementById('listasMainModal').style.display = 'none'; }

        function renderListasGrid() {
    const grid = document.getElementById('listasGrid');
    grid.innerHTML = customListas.map((l, index) => { // <-- 1. Adicionado o ', index' aqui
        
        // Conta apenas obras que ainda existem na biblioteca
        const obrasValidas = l.games.filter(gameItem => {
            return typeof gameItem === 'string' ? games.some(g => g.id === gameItem) : true;
        });

        // Prepara as 5 capas
        const fallbackCover = l.cover || 'https://via.placeholder.com/150x225?text=Lista';
        const capas = Array(5).fill(fallbackCover);
        
        obrasValidas.slice(0, 5).forEach((obra, idx) => {
            let gData = typeof obra === 'string' ? games.find(g => g.id === obra) : obra;
            if(gData && gData.cover) capas[idx] = gData.cover;
        });
        
        let coversHTML = '';
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

        // 2. Adicionados os comandos draggable e de estilo visual de borda ao arrastar na div abaixo:
        return `
        <div draggable="true" ondragstart="handleUnifiedDragStart(event, ${index}, 'listaPrincipal')" ondragover="handleUnifiedDragOver(event, 'listaPrincipal')" ondragleave="handleUnifiedDragLeave(event, 'listaPrincipal')" ondrop="handleUnifiedDrop(event, ${index}, 'listaPrincipal')" class="flex flex-col cursor-grab active:cursor-grabbing group transition-all duration-300 p-2 border-2 border-transparent rounded-xl hover:bg-[var(--surface)] hover:shadow-lg" onclick="openListaDetail('${l.id}')">
            
            <!-- FILEIRA DE CAPAS MAIORES ESTILO LETTERBOXD -->
            <div class="flex items-center justify-start w-full pointer-events-none">
                ${coversHTML}
            </div>
            
            <!-- TÍTULO E INFOS (Alinhados à esquerda e adaptáveis ao tema) -->
            <div class="mt-3 flex flex-col justify-start items-start w-full px-1">
                
                <!-- Nome da lista (agora usa var(--text-main) para se adaptar ao tema claro e escuro) -->
                <h3 class="text-[16px] sm:text-[18px] font-bold text-[var(--text-main)] truncate w-full tracking-tight" title="${l.title}">
                    ${l.title}
                </h3>
                
                <!-- Contagem e Botões lado a lado -->
                <div class="flex items-center gap-3 mt-1">
                    <!-- Quantidade de Obras -->
                    <span class="text-[12px] text-[var(--text-dim)] font-medium">
                        ${obrasValidas.length} obras
                    </span>
                    
                    <!-- Botões logo na frente da quantidade -->
                    <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button onclick="event.stopPropagation(); openListaForm('${l.id}')" class="text-[var(--text-dim)] hover:text-[var(--text-main)] transition text-[13px]" title="Editar Lista">✏️</button>
                        <button onclick="event.stopPropagation(); deleteLista('${l.id}')" class="text-[var(--text-dim)] hover:text-red-500 transition text-[13px]" title="Excluir Lista">✖</button>
                    </div>
                </div>
                
            </div>
        </div>
    `}).join('') || '<div class="col-span-full text-center py-12 text-gray-500 font-bold uppercase tracking-widest text-xs">Nenhuma lista criada ainda.</div>';
}

        async function removeGameFromLista(index) { const list = customListas.find(l => l.id === currentListaId); list.games.splice(index, 1); await manualSave(); renderListaGamesGrid(); }
// ==========================================
// FUNÇÕES DE CRIAÇÃO E EDIÇÃO DE LISTAS
// ==========================================

function openListaForm(id = null) {
    document.getElementById('editListaId').value = id || '';
    if (id) {
        const list = customListas.find(l => l.id === id);
        document.getElementById('listaName').value = list.title || '';
        document.getElementById('listaCover').value = list.cover || '';
        document.getElementById('listaFormTitle').innerText = "Editar Lista";
    } else {
        document.getElementById('listaName').value = '';
        document.getElementById('listaCover').value = '';
        document.getElementById('listaFormTitle').innerText = "Nova Lista";
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

    if (!title) {
        alert("O título da lista é obrigatório!");
        return;
    }

    if (id) {
        // Atualiza a lista existente
        const list = customListas.find(l => l.id === id);
        if (list) {
            list.title = title;
            list.cover = cover;
        }
    } else {
        // Cria uma nova lista
        customListas.push({
            id: crypto.randomUUID(),
            title: title,
            cover: cover,
            games: []
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

// ==========================================
// FUNÇÕES DE DETALHE DA LISTA (ENTRAR NA LISTA)
// ==========================================

function openListaDetail(id) {
    currentListaId = id;
    const list = customListas.find(l => l.id === id);
    if (!list) return;

    // Preenche o cabeçalho do modal com os dados da lista
    document.getElementById('listaDetailTitle').innerText = list.title;
    document.getElementById('listaDetailCover').src = list.cover || 'https://via.placeholder.com/150x100?text=Lista';
    
    // Troca os modais
    document.getElementById('listasMainModal').style.display = 'none';
    document.getElementById('listaDetailModal').style.display = 'flex';
    
    renderListaGamesGrid();
}

function closeListaDetail() {
    currentListaId = null;
    document.getElementById('listaDetailModal').style.display = 'none';
    document.getElementById('listasMainModal').style.display = 'flex';
    renderListasGrid(); // Atualiza as contagens na grid principal
}

function renderListaGamesGrid() {
    const list = customListas.find(l => l.id === currentListaId);
    if (!list) return;

    // Garante que só mostre obras que ainda existem na biblioteca (ou externas)
    const validGames = list.games.filter(item => {
        if (typeof item === 'string') return games.some(g => g.id === item);
        return true; 
    });

    document.getElementById('listaDetailCount').innerText = validGames.length;

    const grid = document.getElementById('listaGamesGrid');
    
    grid.innerHTML = validGames.map((item, index) => {
        let g = typeof item === 'string' ? games.find(x => x.id === item) : item;
        
        // Incluí o sistema unificado de Drag & Drop nas capas de dentro da lista
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

        function openListaPicker() { document.getElementById('pickerSearchInput').value = ''; document.getElementById('listaPickerModal').style.display = 'flex'; renderListaPicker(); }
        function closeListaPicker() { document.getElementById('listaPickerModal').style.display = 'none'; }
        async function toggleGameInLista(gameId) {
            const list = customListas.find(l => l.id === currentListaId);
            const existingIndex = list.games.findIndex(item => item === gameId || (item.id === gameId));
            if (existingIndex !== -1) list.games.splice(existingIndex, 1); else list.games.push(gameId);
            await manualSave(); renderListaPicker(); renderListaGamesGrid(); 
        }
        function renderListaPicker() {
            const query = (document.getElementById('pickerSearchInput').value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const list = customListas.find(l => l.id === currentListaId);
            const grid = document.getElementById('listaPickerGrid');
            const filtered = games.filter(g => (g.name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(query)).sort((a,b) => a.name.localeCompare(b.name));
            grid.innerHTML = filtered.map(g => {
                const isSelected = list.games.some(item => item === g.id || item.id === g.id);
                return `
                <div onclick="toggleGameInLista('${g.id}')" class="poster-card-sm !w-full !h-auto aspect-[2/3] cursor-pointer border-4 transition-all relative ${isSelected ? 'border-emerald-500 scale-95 opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}">
                    <img src="${g.cover}" class="main-cover pointer-events-none" onerror="this.src='https://via.placeholder.com/150x225?text=Capa'">
                    ${isSelected ? `<div class="absolute inset-0 bg-emerald-500/20 flex items-center justify-center"><div class="bg-emerald-500 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg font-bold">✓</div></div>` : ''}
                </div>
                `;
            }).join('');
        }

        function openExternalGameForm() { document.getElementById('extGameName').value = ''; document.getElementById('extGameCover').value = ''; document.getElementById('externalGameModal').style.display = 'flex'; }
        function closeExternalGameForm() { document.getElementById('externalGameModal').style.display = 'none'; }
        async function saveExternalGame() {
            const name = document.getElementById('extGameName').value.trim();
            const coverInput = document.getElementById('extGameCover').value.trim();
            if(!name || !coverInput) return alert("Preencha o nome e a URL da capa!");
            const coverBase64 = await urlToBase64(coverInput);
            const list = customListas.find(l => l.id === currentListaId);
            list.games.push({ id: crypto.randomUUID(), isExternal: true, name: name, cover: coverBase64 });
            await manualSave(); closeExternalGameForm(); renderListaGamesGrid();
        }

        /* === SESSÕES / EPISÓDIOS === */
        function openSessionFromEdit() {
            const id = document.getElementById('editId').value;
            if(!id) return alert('Salve a obra na sua biblioteca primeiro antes de registrar sessões!');
            openSessionModal(id);
        }
        function openSessionModal(id) {
    const g = games.find(x => x.id === id);
    document.getElementById('sessionId').value = id;
    document.getElementById('sessionDate').value = new Date().toISOString().split('T')[0];
    
    // Verifica se é Filme ou OVA (obras de volume único)
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

    let totalM = (parseInt(g.minutes) || 0) + m;
    let addH = Math.floor(totalM / 60);
    g.minutes = totalM % 60;
    g.hours = (parseInt(g.hours) || 0) + h + addH;
    
    // Verifica se é Filme ou OVA para não somar episódios onde não deve
    const isSingle = ['Filme', 'Filme OVA'].includes(g.type || 'Filme');
    
    if(!isSingle) {
        g.epWatched = (parseInt(g.epWatched) || 0) + epAdd;
    }

    // NOVA CHAMADA AQUI
    updateAutoStatus(g);

    if(document.getElementById('modal').style.display === 'flex') {
        document.getElementById('gameHours').value = g.hours;
        document.getElementById('gameMinutes').value = g.minutes;
        if(!isSingle) document.getElementById('epWatched').value = g.epWatched;
    }

    await manualSave();
    closeSessionModal();
}

        /* === RESTO DAS FUNÇÕES DO MEU TV TIME === */
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

        function calculateItemTotalMinutes(g) {
    const baseMin = (parseInt(g.hours) || 0) * 60 + (parseInt(g.minutes) || 0);
    const tipo = (g.type || 'Filme').toLowerCase();
    const isSingle = tipo === 'filme' || tipo === 'filme ova';
    
    const baseTime = isSingle ? baseMin : baseMin * (parseInt(g.epWatched) || 0);
    return baseTime * (g.watchCount || 1);
}

        function openComments() { document.getElementById('commentsModal').style.display = 'flex'; document.getElementById('commentSearchInput').value = ''; updateCommentsDropdown(); renderCommentsList(); }
        function closeComments() { document.getElementById('commentsModal').style.display = 'none'; }
        function updateCommentsDropdown() {
            const select = document.getElementById('commentsGameSelect');
            const available = games.filter(g => !g.hasCommentSection).sort((a,b) => (a.name||"").localeCompare(b.name||""));
            select.innerHTML = '<option value="">Selecione uma obra da biblioteca...</option>' + available.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
        }
        async function addGameToComments() {
            const id = document.getElementById('commentsGameSelect').value;
            if(!id) return; const g = games.find(x => x.id === id);
            if(g) { g.hasCommentSection = true; g.comment = g.comment || ''; await manualSave(); updateCommentsDropdown(); renderCommentsList(); }
        }
        function toggleCommentSize(id, btn) {
            const ta = document.getElementById(`comment-text-${id}`);
            if(ta.classList.contains('h-24')) {
                ta.classList.remove('h-24'); ta.classList.add('h-48');
                btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>';
            } else {
                ta.classList.add('h-24'); ta.classList.remove('h-48');
                btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>';
            }
        }
        async function saveSpecificComment(id) { const g = games.find(x => x.id === id); if(g) { g.comment = document.getElementById(`comment-text-${id}`).value; await manualSave(); } }
        async function removeCommentSec(id) { if(confirm('Remover esta obra das análises?')) { const g = games.find(x => x.id === id); if(g) { g.hasCommentSection = false; g.comment = ''; await manualSave(); updateCommentsDropdown(); renderCommentsList(); } } }

        function renderCommentsList() {
            const container = document.getElementById('commentsListContainer');
            const searchQ = (document.getElementById('commentSearchInput').value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const commented = games.filter(g => g.hasCommentSection && (g.name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(searchQ)).sort((a,b) => (a.name||"").localeCompare(b.name||""));
            container.innerHTML = commented.map(g => `
                <div class="flex items-start p-3 gap-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl relative group overflow-hidden">
                    <div class="w-16 h-24 flex-shrink-0 rounded-md overflow-hidden border border-[var(--border)] bg-[var(--input)]">
                        <img src="${g.cover || ''}" class="w-full h-full object-cover" onerror="this.src='https://via.placeholder.com/150x225?text=Capa'">
                    </div>
                    <div class="flex flex-col justify-center overflow-hidden w-1/4 min-w-[120px] h-24">
                        <h4 class="text-xs font-black uppercase text-[var(--text-main)] truncate w-full" title="${g.name}">${g.name}</h4>
                        <span class="text-[10px] text-[var(--accent)] font-bold mt-1.5 flex items-center gap-1">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            ${formatMinutes(calculateItemTotalMinutes(g))}
                        </span>
                        <span class="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-[var(--input)] border border-[var(--border)] type-${(g.type || 'filme').toLowerCase().replace(' ', '-')} w-max mt-1.5 shadow-inner tracking-widest truncate max-w-full">${g.type || 'Filme'}</span>
                    </div>
                    <div class="flex-1 relative flex items-start">
                        <textarea id="comment-text-${g.id}" class="modern-input w-full h-24 text-xs text-comment-normal resize-none transition-all duration-300 pr-8" placeholder="Escreva sua análise..." onchange="saveSpecificComment('${g.id}')">${g.comment || ''}</textarea>
                        <button onclick="toggleCommentSize('${g.id}', this)" class="absolute right-2 bottom-2 w-6 h-6 rounded border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition" title="Expandir"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg></button>
                    </div>
                    <button onclick="removeCommentSec('${g.id}')" class="absolute top-1 right-1 text-red-500 opacity-0 group-hover:opacity-100 text-[10px] p-1 bg-[var(--surface)] rounded-full shadow-md z-10 transition-opacity" title="Excluir">✖</button>
                </div>
            `).join('') || '<div class="text-center p-8 opacity-40"><p class="text-xs font-bold uppercase tracking-widest">Nenhuma análise encontrada.</p></div>';
        }

        /* === RETROSPECTIVA CINÉFILA === */
        function openRetrospectiva() {
            const yearsPlayed = [...new Set(games.flatMap(g => [g.startDate?.split('-')[0]].filter(Boolean)))].sort((a,b) => b-a);
            const select = document.getElementById('retroYearSelect');
            if (yearsPlayed.length === 0) return alert("Nenhuma obra registrada com data de início para gerar a retrospectiva!");
            
            // Adiciona a opção "Todos os Anos" (value="all") no topo da lista
            select.innerHTML = '<option value="all">Todos os Anos</option>' + yearsPlayed.map(y => `<option value="${y}">${y}</option>`).join('');
            
            // Inicia mostrando os dados de todos os anos
            select.value = 'all';
            renderRetrospectiva('all');
            
            document.getElementById('retrospectivaModal').style.display = 'flex';
        }

        function closeRetrospectiva() { document.getElementById('retrospectivaModal').style.display = 'none'; }

        function renderRetrospectiva(ano) {
            if (!ano) return;
            
            // Altera o texto de parabéns dependendo se é um ano específico ou tudo
            document.getElementById('retroYearLabel').innerText = ano === 'all' ? 'TODOS OS ANOS' : ano;
            
            // Se for 'all', pega todos com data. Se for um ano específico, filtra por ele.
            const jogosAno = getFilteredGamesForStats().filter(g => {
                if (!g.startDate) return false;
                if ((g.status || 'watchlist').toLowerCase() === 'watchlist') return false; // Bloqueia a Watchlist aqui!
                if (ano === 'all') return true;
                return g.startDate.startsWith(ano);
            });

            document.getElementById('retroTotalGames').innerText = `${jogosAno.length} Obras`;

            // ... (o resto da função continua exatamente igual a partir daqui) ...

            let totalMinsAno = 0;
            jogosAno.forEach(g => { totalMinsAno += calculateItemTotalMinutes(g); });
            const tH = Math.floor(totalMinsAno / 60); const tM = totalMinsAno % 60;
            document.getElementById('retroTotalTime').innerText = `${tH}:${tM.toString().padStart(2, '0')}:00`;

            const typeMap = {};
            jogosAno.forEach(g => {
                const t = g.type || 'Filme';
                typeMap[t] = (typeMap[t] || 0) + calculateItemTotalMinutes(g);
            });
            const sortedTypes = Object.entries(typeMap).sort((a,b) => b[1] - a[1]);
            const topType = sortedTypes.length > 0 ? sortedTypes[0] : null;
            
            if (topType && totalMinsAno > 0) {
                const perc = ((topType[1] / totalMinsAno) * 100).toFixed(2);
                document.getElementById('retroPlatPercent').innerText = `${perc.replace('.', ',')}%`;
                document.getElementById('retroTopPlatName').innerText = topType[0];
            } else {
                document.getElementById('retroPlatPercent').innerText = `0%`;
                document.getElementById('retroTopPlatName').innerText = `---`;
            }

            document.getElementById('retroZerados').innerText = jogosAno.filter(g => (g.status||'').toLowerCase() === 'visto').length;

            const sortedGames = [...jogosAno].sort((a,b) => calculateItemTotalMinutes(b) - calculateItemTotalMinutes(a));
            document.getElementById('retroTopGamesList').innerHTML = sortedGames.slice(0, 5).map((g, i) => {
                const mins = calculateItemTotalMinutes(g);
                const hrs = `${Math.floor(mins/60)}:${(mins%60).toString().padStart(2, '0')}:00`;
                return `
                    <div class="flex justify-between items-center border-b border-[var(--border)] pb-2 last:border-0 last:pb-0">
                        <div class="flex items-center gap-2 overflow-hidden">
                            <span class="text-[10px] font-black text-[var(--text-dim)]">${i+1}º</span>
                            <span class="text-[11px] font-black uppercase truncate ${i===0 ? 'text-[var(--accent)] text-sm' : 'text-[var(--text-main)]'}">${g.name}</span>
                        </div>
                        <span class="text-[10px] font-bold text-[var(--text-dim)] ml-2 whitespace-nowrap">${hrs}</span>
                    </div>
                `;
            }).join('') || '<p class="text-xs text-center opacity-50">Sem dados</p>';

            const genMap = {};
            jogosAno.forEach(g => {
                if(!g.genre) return;
                const gens = g.genre.split(/[,/|-]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
                const t = calculateItemTotalMinutes(g);
                gens.forEach(gen => { genMap[gen] = (genMap[gen] || 0) + t; });
            });
            const sortedGenres = Object.entries(genMap).sort((a,b) => b[1] - a[1]).slice(0, 3);
            document.getElementById('retroTopGenresList').innerHTML = sortedGenres.map((gen, i) => {
                const perc = totalMinsAno > 0 ? ((gen[1] / totalMinsAno) * 100).toFixed(2) : 0;
                return `
                    <div class="flex items-center justify-between border-b border-[var(--border)] py-2 last:border-0 last:pb-0">
                        <div class="flex items-center gap-2 flex-1 min-w-0 pr-2">
                            <div class="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded bg-[var(--accent)] text-[#FFFFFF] text-[10px] font-black shadow-[0_0_10px_var(--accent-glow)]">${i+1}º</div>
                            <span class="font-black uppercase truncate flex-1 min-w-0 ${i===0 ? 'text-[var(--text-main)] text-[12px]' : 'text-[var(--text-dim)] text-[11px]'}">${gen[0]}</span>
                        </div>
                        <div class="text-right flex flex-col justify-center flex-shrink-0">
                            <span class="text-[8px] font-bold text-[var(--text-dim)] mb-0.5">${Math.floor(gen[1]/60)}:${(gen[1]%60).toString().padStart(2, '0')}:00</span>
                            <span class="text-[13px] font-black text-[var(--accent)] drop-shadow-[0_0_5px_var(--accent-glow)]">${perc.toString().replace('.', ',')}%</span>
                        </div>
                    </div>
                `;
            }).join('') || '<p class="text-xs text-center opacity-50 mt-4">Sem dados</p>';

            const monthNames = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
            const monthMap = {};
            jogosAno.forEach(g => {
                const mIndex = parseInt(g.startDate.split('-')[1]) - 1;
                if(mIndex >= 0 && mIndex <= 11) monthMap[mIndex] = (monthMap[mIndex] || 0) + calculateItemTotalMinutes(g);
            });
            const sortedMonths = Object.entries(monthMap).sort((a,b) => b[1] - a[1]);
            if(sortedMonths.length > 0) {
                const topM = sortedMonths[0]; const botM = sortedMonths[sortedMonths.length - 1];
                const topPerc = ((topM[1] / totalMinsAno) * 100).toFixed(2);
                document.getElementById('retroTopMonth').innerText = monthNames[topM[0]];
                document.getElementById('retroTopMonthStats').innerHTML = `${topPerc.replace('.', ',')}% <br> <span class="text-[var(--text-dim)] font-normal text-[9px]">${Math.floor(topM[1]/60)}:${(topM[1]%60).toString().padStart(2, '0')}:00</span>`;
                const botPerc = ((botM[1] / totalMinsAno) * 100).toFixed(2);
                document.getElementById('retroBottomMonth').innerText = monthNames[botM[0]];
                document.getElementById('retroBottomMonthStats').innerHTML = `${botPerc.replace('.', ',')}% <br> <span class="text-[var(--text-dim)] font-normal text-[9px]">${Math.floor(botM[1]/60)}:${(botM[1]%60).toString().padStart(2, '0')}:00</span>`;
            } else {
                document.getElementById('retroTopMonth').innerText = '---'; document.getElementById('retroTopMonthStats').innerText = '';
                document.getElementById('retroBottomMonth').innerText = '---'; document.getElementById('retroBottomMonthStats').innerText = '';
            }

            let filmes = 0, series = 0;
jogosAno.forEach(g => {
    const t = (g.type || 'Filme').toLowerCase();
    if(['filme', 'filme ova'].includes(t)) filmes++; 
    else if(['série', 'anime', 'desenho'].includes(t)) series++;
});
            const tEras = filmes + series;
            document.getElementById('retroPercFilmes').innerText = tEras > 0 ? `${((filmes/tEras)*100).toFixed(2).replace('.', ',')}%` : '0%';
            document.getElementById('retroPercSeries').innerText = tEras > 0 ? `${((series/tEras)*100).toFixed(2).replace('.', ',')}%` : '0%';

            // Décadas
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

            document.getElementById('retroBacklogTotal').innerText = games.filter(g => (g.status||'').toLowerCase() === 'watchlist').length;
        }

        /* === LINHA DO TEMPO (TIMELINE) === */
        function openTimeline() {
    const yearsPlayed = [...new Set(games.flatMap(g => [g.startDate?.split('-')[0]].filter(Boolean)))].sort((a,b) => b-a);
    const select = document.getElementById('timelineYearSelect');
    if (yearsPlayed.length === 0) return alert("Nenhuma obra registrada com data de início para gerar a linha do tempo!");
    
    select.innerHTML = '<option value="all">Todos os Anos</option>' + yearsPlayed.map(y => `<option value="${y}">${y}</option>`).join('');
    
    // Altera o padrão para "Todos os Anos"
    select.value = 'all';
    renderTimeline('all');
    
    document.getElementById('timelineModal').style.display = 'flex';
}

        function closeTimeline() { 
            document.getElementById('timelineModal').style.display = 'none'; 
        }

        /* === CONQUISTAS & UI UPDATES === */
        function renderBadges() {
            let globalMinutes = games.reduce((acc, g) => acc + calculateItemTotalMinutes(g), 0);
            let totalH = Math.floor(globalMinutes / 60);

            const watchlist = games.filter(g => (g.status||'').toLowerCase() === 'watchlist').length;
            const favoritos = games.filter(g => g.isFavorite).length;

            const cType = (t) => games.filter(x => (x.status||'').toLowerCase() === 'visto' && (x.type||'filme').toLowerCase() === t).length;
            const cTG = (t, keys) => games.filter(x => (x.status||'').toLowerCase() === 'visto' && (x.type||'filme').toLowerCase() === t && keys.some(k => (x.genre||'').toLowerCase().includes(k))).length;
            const cEps = (t, minEps) => games.filter(x => (x.status||'').toLowerCase() === 'visto' && (x.type||'filme').toLowerCase() === t && parseInt(x.epWatched||0) >= minEps).length;
            const cEpsCurto = (t, maxEps) => games.filter(x => (x.status||'').toLowerCase() === 'visto' && (x.type||'filme').toLowerCase() === t && parseInt(x.epWatched||0) <= maxEps && parseInt(x.epWatched||0) > 0).length;
            const cFav = (t) => games.filter(x => x.isFavorite && (x.type||'filme').toLowerCase() === t).length;
            const cRate = (t, r) => games.filter(x => (x.type||'filme').toLowerCase() === t && parseFloat(x.rating) === r).length;

            const fVistos = games.filter(x => (x.status||'').toLowerCase() === 'visto' && ['filme', 'filme ova'].includes((x.type||'filme').toLowerCase())).length;
const sVistos = games.filter(x => (x.status||'').toLowerCase() === 'visto' && ['série', 'anime', 'desenho'].includes((x.type||'filme').toLowerCase())).length;

            const badgesData = [
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
                { diff: 'facil', name: 'Boas Risadas', icon: '😂', req: '1 Filme de Comédia', unlocked: cTG('filme', ['comédia','comedy']) >= 1 },
                { diff: 'medio', name: 'Stand-up', icon: '🎤', req: '10 Filmes de Comédia', unlocked: cTG('filme', ['comédia','comedy']) >= 10 },
                { diff: 'facil', name: 'Lenço de Papel', icon: '😢', req: '1 Filme de Drama', unlocked: cTG('filme', ['drama']) >= 1 },
                { diff: 'medio', name: 'Rio de Lágrimas', icon: '🌊', req: '10 Filmes de Drama', unlocked: cTG('filme', ['drama']) >= 10 },
                { diff: 'facil', name: 'Frio na Espinha', icon: '👻', req: '1 Filme de Terror', unlocked: cTG('filme', ['terror','horror']) >= 1 },
                { diff: 'medio', name: 'Pesadelo Real', icon: '🧟', req: '10 Filmes de Terror', unlocked: cTG('filme', ['terror','horror']) >= 10 },
                { diff: 'facil', name: 'Futuro Distópico', icon: '🛸', req: '1 Filme Sci-Fi', unlocked: cTG('filme', ['ficção','sci-fi','science']) >= 1 },
                { diff: 'medio', name: 'Viagem Estelar', icon: '🚀', req: '10 Filmes Sci-Fi', unlocked: cTG('filme', ['ficção','sci-fi','science']) >= 10 },
                { diff: 'facil', name: 'Coração Quentinho', icon: '💌', req: '1 Filme de Romance', unlocked: cTG('filme', ['romance','love']) >= 1 },
                { diff: 'medio', name: 'Apaixonado', icon: '💘', req: '10 Filmes Romance', unlocked: cTG('filme', ['romance','love']) >= 10 },
                { diff: 'facil', name: 'Mundo Mágico', icon: '🧙‍♂️', req: '1 Filme Fantasia', unlocked: cTG('filme', ['fantasia','fantasy']) >= 1 },
                { diff: 'facil', name: 'Criança Interior', icon: '🧸', req: '1 Animação', unlocked: cTG('filme', ['animação','animation']) >= 1 },
                { diff: 'medio', name: 'Magia Pura', icon: '✨', req: '10 Animações', unlocked: cTG('filme', ['animação','animation']) >= 10 },
                { diff: 'facil', name: 'Mistério Solucionado', icon: '🔎', req: '1 Filme Policial/Suspense', unlocked: cTG('filme', ['policial','crime','investigação','suspense','mystery']) >= 1 },
                { diff: 'medio', name: 'Anos Dourados', icon: '📻', req: '5 Filmes dos Anos 80', unlocked: games.filter(x=>(x.status||'').toLowerCase() === 'visto' && (x.type||'filme').toLowerCase() === 'filme' && parseInt(x.releaseYear)>=1980 && parseInt(x.releaseYear)<=1989).length >= 5 },
                { diff: 'medio', name: 'Nostalgia 90s', icon: '📼', req: '10 Filmes dos Anos 90', unlocked: games.filter(x=>(x.status||'').toLowerCase() === 'visto' && (x.type||'filme').toLowerCase() === 'filme' && parseInt(x.releaseYear)>=1990 && parseInt(x.releaseYear)<=1999).length >= 10 },
                { diff: 'facil', name: 'Obra-Prima', icon: '👑', req: '1 Filme Nota 5', unlocked: cRate('filme', 5) >= 1 },
                { diff: 'facil', name: 'Decepção', icon: '🗑️', req: '1 Filme Nota 1', unlocked: cRate('filme', 1) >= 1 },
                { diff: 'medio', name: 'Cinemateca', icon: '🎞️', req: '5 Filmes Favoritos', unlocked: cFav('filme') >= 5 },

                { diff: 'facil', name: 'Piloto Aprovado', icon: '📺', req: '1 Série Finalizada', unlocked: sVistos >= 1 },
                { diff: 'facil', name: 'Temporada Renovada', icon: '📅', req: '5 Séries Finalizadas', unlocked: sVistos >= 5 },
                { diff: 'medio', name: 'Serial Killer', icon: '🔪', req: '10 Séries Finalizadas', unlocked: sVistos >= 10 },
                { diff: 'medio', name: 'Viciado em Cliffhangers', icon: '😱', req: '25 Séries Finalizadas', unlocked: sVistos >= 25 },
                { diff: 'dificil', name: 'Controle Remoto', icon: '🎛️', req: '50 Séries Finalizadas', unlocked: sVistos >= 50 },
                { diff: 'ultra', name: 'Dono da Emissora', icon: '📡', req: '100 Séries Finalizadas', unlocked: sVistos >= 100 },
                { diff: 'facil', name: 'Sitcom', icon: '🛋️', req: '1 Série Comédia', unlocked: cTG('série', ['comédia','comedy','sitcom']) >= 1 },
                { diff: 'medio', name: 'Risada de Fundo', icon: '😆', req: '5 Séries Comédia', unlocked: cTG('série', ['comédia','comedy','sitcom']) >= 5 },
                { diff: 'facil', name: 'Tensão no Ar', icon: '🎭', req: '1 Série Drama', unlocked: cTG('série', ['drama']) >= 1 },
                { diff: 'medio', name: 'Emmy Winner', icon: '🏆', req: '5 Séries Drama', unlocked: cTG('série', ['drama']) >= 5 },
                { diff: 'facil', name: 'Além da Imaginação', icon: '👽', req: '1 Série Sci-Fi/Fantasia', unlocked: cTG('série', ['ficção','sci-fi','science','fantasia']) >= 1 },
                { diff: 'medio', name: 'Multiverso', icon: '🌌', req: '5 Séries Sci-Fi', unlocked: cTG('série', ['ficção','sci-fi','science','fantasia']) >= 5 },
                { diff: 'facil', name: 'Detetive Particular', icon: '🕵️', req: '1 Série Investigação', unlocked: cTG('série', ['policial','crime','investigação','mystery']) >= 1 },
                { diff: 'medio', name: 'Arquivo Frio', icon: '📂', req: '5 Séries Investigação', unlocked: cTG('série', ['policial','crime','investigação','mystery']) >= 5 },
                { diff: 'facil', name: 'Capa e Espada', icon: '🦸', req: '1 Série Heróis/Ação', unlocked: cTG('série', ['herói','hero','ação','action']) >= 1 },
                { diff: 'facil', name: 'Maratona Leve', icon: '🏃', req: 'Série com >20 eps', unlocked: cEps('série', 20) >= 1 },
                { diff: 'medio', name: 'Noites em Claro', icon: '🦉', req: 'Série com >50 eps', unlocked: cEps('série', 50) >= 1 },
                { diff: 'dificil', name: 'Uma Vida Inteira', icon: '👴', req: 'Série com >100 eps', unlocked: cEps('série', 100) >= 1 },
                { diff: 'facil', name: 'Fã de Carteirinha', icon: '🎫', req: '1 Série Favorita', unlocked: cFav('série') >= 1 },
                { diff: 'medio', name: 'Altar das Séries', icon: '⛩️', req: '5 Séries Favoritas', unlocked: cFav('série') >= 5 },
                { diff: 'medio', name: 'Assistindo Tudo', icon: '👀', req: '5 Status "Assistindo"', unlocked: games.filter(x=>(x.status||'').toLowerCase()==='assistindo' && (x.type||'filme').toLowerCase()==='série').length >= 5 },
                { diff: 'facil', name: 'Cancelada Cedo', icon: '✂️', req: '1 Abandonada', unlocked: games.filter(x=>(x.status||'').toLowerCase()==='abandonado' && (x.type||'filme').toLowerCase()==='série').length >= 1 },
                { diff: 'medio', name: 'Perdeu a Graça', icon: '📉', req: '5 Abandonadas', unlocked: games.filter(x=>(x.status||'').toLowerCase()==='abandonado' && (x.type||'filme').toLowerCase()==='série').length >= 5 },
                { diff: 'facil', name: 'Minissérie', icon: '🤏', req: 'Série Finalizada <=10 eps', unlocked: cEpsCurto('série', 10) >= 1 },
                { diff: 'medio', name: 'Crítico de TV', icon: '🌟', req: '5 Séries Nota 5', unlocked: cRate('série', 5) >= 5 },
                { diff: 'facil', name: 'Tempo Perdido', icon: '⌛', req: '1 Série Nota 1', unlocked: cRate('série', 1) >= 1 },
                { diff: 'facil', name: 'Documentarista', icon: '🎥', req: '1 Série Documentário', unlocked: cTG('série', ['documentário','doc','reality']) >= 1 },
                { diff: 'facil', name: 'Susto em Partes', icon: '🔪', req: '1 Série de Terror', unlocked: cTG('série', ['terror','horror']) >= 1 }
            ];

            const unlockedCount = badgesData.filter(b => b.unlocked).length;
            document.getElementById('badgesUnlockedCount').innerText = unlockedCount;
            document.getElementById('badgesProgressBar').style.width = `${(unlockedCount / badgesData.length) * 100}%`;

            let filteredBadges = badgesData;
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

            const grid = document.getElementById('badgesModalGrid');
            grid.innerHTML = filteredBadges.map(b => {
                const colorClasses = b.unlocked ? getColor(b.diff) : 'grayscale opacity-30 border-[var(--border)]';
                return `
                <div class="flex flex-col items-center justify-center p-3 rounded-xl bg-[var(--input)] border-2 transition-all duration-300 ${colorClasses} hover:scale-105 cursor-help text-center h-28 w-full relative overflow-hidden" title="Requisito: ${b.req}">
                    ${b.unlocked ? `<div class="absolute -top-1 -right-1 w-6 h-6 bg-current opacity-20 rounded-bl-full"></div>` : ''}
                    <span class="text-[7px] font-black uppercase mb-1 opacity-70 tracking-widest">${getLabel(b.diff)}</span>
                    <span class="text-3xl mb-1.5 drop-shadow-md filter ${!b.unlocked ? 'grayscale' : ''}">${b.icon}</span>
                    <span class="text-[10px] font-black uppercase leading-tight line-clamp-2 w-full px-1 ${b.unlocked ? 'text-[var(--text-main)]' : 'text-[var(--text-dim)]'}">${b.name}</span>
                </div>
            `}).join('') || '<p class="col-span-full text-center py-10 opacity-50 font-bold text-lg uppercase tracking-widest">Nenhuma conquista encontrada neste filtro.</p>';
        }

        function openBadges() { document.getElementById('badgesModal').style.display = 'flex'; renderBadges(); }
        function closeBadges() { document.getElementById('badgesModal').style.display = 'none'; }
        function setBadgeFilter(filterType, btnElement) {
            currentBadgeFilter = filterType;
            const buttons = document.querySelectorAll('.badge-filter-btn');
            buttons.forEach(btn => btn.classList.remove('active'));
            if(btnElement) btnElement.classList.add('active');
            renderBadges();
        }

       /* === SISTEMA UNIFICADO: LISTAS TOP 100 === */
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
    }
};

let currentTop100Type = null;
let draggedTop100Index = null;

function openTop100List(type) {
    currentTop100Type = type;
    const config = top100Config[type];
    
    // Atualiza a aparência do modal de forma dinâmica
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

        function openTop10() {
            const modal = document.getElementById('top10Modal');
            const grid = document.getElementById('top10Grid');
            
            const topGames = [...games]
                .filter(g => g.type === 'Série')
                .sort((a, b) => calculateItemTotalMinutes(b) - calculateItemTotalMinutes(a));
            
            grid.innerHTML = topGames.map((g, i) => `
                <div class="card-inner overflow-hidden border border-[var(--accent)]/30 hover:shadow-[0_10px_20px_rgba(225,29,72,0.3)] relative">
                    <div class="poster-container" onclick="document.getElementById('game-${g.id}').scrollIntoView({behavior:'smooth',block:'center'}); closeTop10();" style="cursor:pointer;">
                        <img src="${g.cover}" class="blur-bg" loading="lazy" aria-hidden="true">
                        <img src="${g.cover}" class="main-cover" onerror="this.src='https://via.placeholder.com/400x600?text=Capa'" loading="lazy">
                    </div>
                    <div class="p-2 bg-[var(--surface)] text-center border-t border-[var(--border)] relative">
                        <div class="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[var(--accent)]/50 to-transparent"></div>
                        <h4 class="text-[9px] font-black uppercase truncate text-center w-full text-[var(--text-main)] mb-1">${g.name}</h4>
                        <span class="text-[var(--accent)] font-bold text-[10px] block drop-shadow-[0_0_5px_rgba(225,29,72,0.4)]">${formatMinutes(calculateItemTotalMinutes(g))}</span>
                        <span class="text-[7px] text-[var(--text-dim)] uppercase type-${(g.type||'filme').toLowerCase().replace(' ', '-')}">${g.type || 'Filme'}</span>
                    </div>
                </div>
            `).join('') || '<p class="col-span-full text-center py-10 opacity-40">Nenhuma Série com tempo registrado para exibir!</p>';
            
            modal.style.display = 'flex';
        }
        function closeTop10() { document.getElementById('top10Modal').style.display = 'none'; }

        function spinRoleta() {
            const backlog = games.filter(g => (g.status||'').toLowerCase() === 'watchlist');
            if(backlog.length === 0) return alert('Sua Watchlist está vazia! 🎉 Adicione títulos primeiro.');
            
            const randomGame = backlog[Math.floor(Math.random() * backlog.length)];
            document.getElementById('roletaGameName').innerText = randomGame.name;
            document.getElementById('roletaResult').innerHTML = `
                <img src="${randomGame.cover}" class="blur-bg" loading="lazy">
                <img src="${randomGame.cover}" class="main-cover" loading="lazy" onerror="this.src='https://via.placeholder.com/400x600?text=Capa'">
            `;
            document.getElementById('roletaModal').style.display = 'flex';
        }
        function closeRoleta() { document.getElementById('roletaModal').style.display = 'none'; }

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
// Variável global para armazenar o gênero selecionado na biblioteca
let currentCollectionGenre = 'Todos';

function setCollectionGenre(genre, btnElement) {
    currentCollectionGenre = genre;
    
    // Reseta o visual de todos os botões
    const buttons = document.querySelectorAll('.collection-genre-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active', 'bg-[var(--accent)]/10', 'text-[var(--accent)]', 'border-[var(--accent)]', 'shadow-[0_0_8px_rgba(225,29,72,0.4)]');
        btn.classList.add('border-[var(--border)]', 'text-[var(--text-dim)]');
    });
    
    // Aplica o visual ativo ao botão clicado
    if (btnElement) {
        btnElement.classList.remove('border-[var(--border)]', 'text-[var(--text-dim)]');
        btnElement.classList.add('active', 'bg-[var(--accent)]/10', 'text-[var(--accent)]', 'border-[var(--accent)]', 'shadow-[0_0_8px_rgba(225,29,72,0.4)]');
    }
    
    // Chama a função existente para re-filtrar e re-renderizar a grid principal
    if (typeof resetAndRender === "function") {
        resetAndRender();
    }
}

        async function manualSave() {
            try {
                await localforage.setItem(DB_NAME, games);
                await localforage.setItem('ct_aguardados_v70', aguardados);
                await localforage.setItem('cineDeathList_v70', deathListData);
                await localforage.setItem('cineSeriesList_v70', seriesListData);
                await localforage.setItem('cineMalucosList_v70', malucosListData);
                await localforage.setItem('ct_listas_custom', customListas);
                await localforage.setItem('ct_franquias_v70', franquiasData);
                applyFilters();
                renderGames();
                renderAbsoluteCinema();
                if(document.getElementById('badgesModal').style.display === 'flex') { renderBadges(); }
                if(document.getElementById('franquiasModal').style.display === 'flex') { renderFranquias(); }
                const toast = document.getElementById('saveToast');
                toast.classList.add('show');
                setTimeout(() => toast.classList.remove('show'), 2000);
            } catch (err) { console.error("Erro ao salvar:", err); }
        }

        async function exportBackup() {
    // Busca a foto de perfil diretamente do banco para incluir no backup
    const profilePic = await localforage.getItem('ct_profile_pic_v70');

    const backupData = { 
        games: games, 
        aguardados: aguardados, 
        deathList: deathListData, 
        seriesList: seriesListData,
        malucosList: malucosListData,
        listas: customListas, 
        franquias: franquiasData,
        profilePic: profilePic || null
    };
    
    const jsonString = JSON.stringify(backupData);
    
    // Pergunta ao usuário qual formato ele prefere
    const exportJson = confirm("Deseja exportar no formato padrão (.json)?\n\n[OK] Formato Padrão (.json) - Texto legível, arquivo maior.\n[Cancelar] Formato Otimizado (.ctbak) - Comprimido e mais rápido.");
    
    let blob;
    let filename;

    if (exportJson) {
        // Usa a API nativa para criar um arquivo JSON padrão
        blob = new Blob([jsonString], { type: 'application/json' });
        filename = `meutvtime_full_backup.json`;
    } else {
        // Usa a API nativa do navegador para comprimir em GZIP
        const stream = new Blob([jsonString], { type: 'application/json' }).stream();
        const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
        const compressedResponse = new Response(compressedStream);
        blob = await compressedResponse.blob();
        filename = `meutvtime_full_backup.ctbak`;
    }
    
    // Baixa o arquivo direto
    const a = document.createElement('a'); 
    a.href = URL.createObjectURL(blob); 
    a.download = filename; 
    a.click();
    
    // Limpa a URL da memória para não vazar memória do navegador
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function importBackup(e) {
    const file = e.target.files[0]; 
    if(!file) return;

    try {
        const arrayBuffer = await file.arrayBuffer();
        let d = null;

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
                // ==========================================
                // MODO MESCLAR - MESCLAGEM PROFUNDA
                // ==========================================
                if(d.games) {
                    d.games.forEach(impG => {
                        // Cria uma nova obra com um ID gerado na hora, forçando a inserção
                        let novaObra = { ...impG, id: crypto.randomUUID() };
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
                    let emptyIndex = 0;
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
                    let emptyIndex = 0;
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
                    let emptyIndex = 0;
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
                            customListas.push(impL); // Lista nova
                        } else {
                            // Se a lista já existe, soma as obras que faltam nela
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
                            // Unifica as obras marcadas e adicionadas na franquia
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
                // ==========================================
                // MODO SUBSTITUIR
                // ==========================================
                const confReplace = confirm("Tem certeza? Isso vai APAGAR sua biblioteca atual e usar apenas a do backup.");
                if(!confReplace) {
                    document.getElementById('fileInput').value = ""; 
                    return;
                }
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
            alert("Arquivo inválido. O formato dos dados não bate com o esperado pelo Meu Tv Time."); 
        }
    } catch(err) { 
        console.error("Erro técnico ao ler o arquivo:", err);
        alert("Erro técnico ao ler o arquivo. Veja o console (F12) para detalhes."); 
    } finally {
        document.getElementById('fileInput').value = "";
    }
}

        function toggleTheme() { document.body.classList.toggle('light-mode'); }
        function scrollContainer(id, amt) { document.getElementById(id).scrollBy({ left: amt, behavior: 'smooth' }); }
        
        function toggleEpFields() {
    const type = document.getElementById('gameType').value;
    const epFields = document.getElementById('epFields');
    const isSingle = type === 'Filme' || type === 'Filme OVA';
    
    document.getElementById('durationLabel').innerText = isSingle ? "DURAÇÃO TOTAL" : "TEMPO MÉDIO POR EPISÓDIO";
    isSingle ? epFields.classList.add('hidden') : epFields.classList.remove('hidden');
}

        function openModal() { document.getElementById('modal').style.display = 'flex'; toggleEpFields(); }
        function closeModal() { 
    document.getElementById('modal').style.display = 'none'; 
    document.getElementById('editId').value = ''; 
    
    // CORREÇÃO: Limpa os campos, mas IGNORA o checkbox para não bugar o estado dele
    document.querySelectorAll('#modal input:not([type="checkbox"])').forEach(i => i.value = ''); 
    
    // Garante que a caixa de salvar URL fique desmarcada sempre que fechar
    document.getElementById('saveCoverOnlyUrl').checked = false; 
    
    tempSeasonDates = [];
    document.getElementById('seasonDatesContainer').innerHTML = '';
}
        function openAguardadoModal() { document.getElementById('aguardadoModal').style.display = 'flex'; }
        function closeAguardadoModal() { document.getElementById('aguardadoModal').style.display = 'none'; }
        
        async function saveAguardado() { 
    const nameInput = document.getElementById('aguardadoName') ? document.getElementById('aguardadoName').value.trim() : '';
    const coverInput = document.getElementById('aguardadoCover').value.trim(); 
    const date = document.getElementById('aguardadoDate').value.trim(); 
    
    if (!coverInput && !nameInput) {
        alert("Por favor, insira o Título ou a URL do poster!");
        return;
    }

    const btn = document.getElementById('btnSaveAguardado');
    if(btn) { btn.innerText = "SALVANDO..."; btn.disabled = true; }

    // Salvando a obra na array utilizando apenas a URL fornecida (coverInput)
    aguardados.push({
        name: nameInput,
        cover: coverInput, 
        date: date || 'TBA'
    }); 
    
    await manualSave(); 
    
    if(document.getElementById('aguardadoName')) document.getElementById('aguardadoName').value = '';
    document.getElementById('aguardadoCover').value = '';
    document.getElementById('aguardadoDate').value = '';
    
    if(btn) { btn.innerText = "ADICIONAR"; btn.disabled = false; }
    closeAguardadoModal(); 
}

        function openEditCoverModal(id) {
            const g = games.find(x => x.id === id);
            if(!g) return;
            document.getElementById('editCoverGameId').value = id;
            document.getElementById('editCoverGameName').innerText = g.name;
            document.getElementById('editCoverInput').value = g.cover || '';
            document.getElementById('editCoverModal').style.display = 'flex';
        }

        function closeEditCoverModal() {
            document.getElementById('editCoverModal').style.display = 'none';
        }

        async function saveCoverAction(type) {
            const id = document.getElementById('editCoverGameId').value;
            const newUrl = document.getElementById('editCoverInput').value.trim();
            const g = games.find(x => x.id === id);
            
            if(!g) return;
            if(!newUrl) {
                alert("Por favor, insira uma URL válida!");
                return;
            }

            // Opcional: altera o texto do botão para mostrar que está carregando
            if(type === 'base64') {
                const coverBase64 = await urlToBase64(newUrl);
                
                // CORREÇÃO: Verifica se o resultado NÃO é um código Base64
                if (!coverBase64.startsWith('data:image')) {
                    alert("⚠️ AVISO: Não foi possível converter a nova capa para código offline. Ela foi salva apenas como Link (URL).");
                }
                
                g.cover = coverBase64;
            } else {
                g.cover = newUrl; // Salva só a URL
            }
            
            await manualSave();
            closeEditCoverModal();
        }
// --- NOVAS FUNÇÕES DE BUSCA ---
let searchTimeout;

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
// ------------------------------
        function formatMinutes(totalMin) { return `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`; }

        function applyFilters() {
            // Função auxiliar para remover acentos (ç, ã, etc) e padronizar minúsculas
            const normalizeText = (text) => (text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            const queryRaw = (document.getElementById('searchInput').value || "");
            const query = normalizeText(queryRaw);
            const sF = document.getElementById('statusFilter').value || 'all';
            const tF = document.getElementById('typeFilter').value || 'all';
            const gF = document.getElementById('genreFilter').value || 'all'; 
            const yF = document.getElementById('yearFilter').value || 'all'; 
            const ryF = document.getElementById('releaseYearFilter').value || 'all'; 
            const ratF = document.getElementById('ratingFilter').value || 'all'; 
            
            // Normaliza os valores selecionados nos filtros de gênero
            const normalizedGF = normalizeText(gF);
            const normalizedBtnGenre = normalizeText(currentCollectionGenre);

            currentFiltered = games.filter(g => {
                const yearPlayed = g.startDate?.split('-')[0];
                const yearReleased = g.releaseYear?.toString();
                
                // Busca expandida: por nome ou por ano de lançamento
                const matchName = normalizeText(g.name).includes(query);
                const matchYear = (g.releaseYear || "").toString().includes(queryRaw);

                const matchStatus = sF === 'all' || (g.status||'watchlist').toLowerCase() === sF.toLowerCase();
                const matchType = tF === 'all' || (g.type||'Filme') === tF;
                const matchYF = yF === 'all' || yearPlayed === yF;
                const matchRYF = ryF === 'all' || yearReleased === ryF;
                const matchRating = ratF === 'all' || parseFloat(g.rating || 0) === parseFloat(ratF);

                // === FILTROS DE GÊNERO CORRIGIDOS E UNIFICADOS ===
            // Quebra a string "Ação, Comédia" em uma array ['acao', 'comedia']
            const gameGenresList = normalizeText(g.genre)
                .split(/[,/]/) // Divide usando vírgula ou barra
                .map(s => {
                    let textoLimpo = s.trim();
                    // Unifica as variações de sci-fi e ficção científica para apenas "ficcao"
                    if (textoLimpo === 'ficcao cientifica' || textoLimpo === 'sci-fi' || textoLimpo === 'sci fi') {
                        return 'ficcao';
                    }
                    return textoLimpo;
                });
            
            // Garante que o valor buscado pelo botão ou dropdown também seja padronizado
            const finalGF = (normalizedGF === 'ficcao cientifica' || normalizedGF === 'sci-fi' || normalizedGF === 'sci fi') ? 'ficcao' : normalizedGF;
            const finalBtnGenre = (normalizedBtnGenre === 'ficcao cientifica' || normalizedBtnGenre === 'sci-fi' || normalizedBtnGenre === 'sci fi') ? 'ficcao' : normalizedBtnGenre;

            // Checa se a array contém a palavra exata
            const matchGlobalGenre = gF === 'all' || gameGenresList.includes(finalGF);
            const matchGenreBtn = currentCollectionGenre === 'Todos' || gameGenresList.includes(finalBtnGenre);

                return (matchName || matchYear) && matchStatus && matchType && matchYF && matchRYF && matchRating && matchGenreBtn && matchGlobalGenre;
            });

            // LÓGICA DE ORDENAÇÃO: Organiza pela Data Assistido (Decrescente)
            currentFiltered.sort((a, b) => {
                const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
                const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
                
                return dateB - dateA;
            });

            updateDashboard(currentFiltered);
            setupScrollObserver(); 
        }

        function resetFilters() {
            document.getElementById('searchInput').value = '';
            document.getElementById('typeFilter').value = 'all';
            document.getElementById('genreFilter').value = 'all'; // NOVO: Limpa o gênero global
            document.getElementById('releaseYearFilter').value = 'all';
            document.getElementById('yearFilter').value = 'all';
            document.getElementById('statusFilter').value = 'all';
            document.getElementById('ratingFilter').value = 'all';
            
            // Caso queira também resetar os botões de gênero da coleção ao clicar em Limpar
            if(typeof setCollectionGenre === 'function') {
                const todosBtn = document.querySelector('.collection-genre-btn');
                if(todosBtn) setCollectionGenre('Todos', todosBtn);
            }

            resetAndRender();
        }

        function resetAndRender() { displayLimit = 20; document.getElementById('scrollSentinel').innerText = "Carregando Biblioteca..."; document.getElementById('scrollSentinel').style.opacity = "0.4"; renderGames(); }

function setViewMode(mode) {
            // Só executa se estiver clicando em um modo diferente do atual
            if (viewMode === mode) return;
            
            viewMode = mode;
            
            const btnGrid = document.getElementById('btnViewGrid');
            const btnList = document.getElementById('btnViewList');
            const grid = document.getElementById('gameGrid');
            
            // Classes base para o botão ativo e inativo
            const activeClasses = "px-3 py-1.5 text-[9px] font-black tracking-widest transition-all bg-[var(--accent)] text-white shadow-[0_0_10px_var(--accent-glow)]";
            const inactiveClasses = "px-3 py-1.5 text-[9px] font-black tracking-widest transition-all text-[var(--text-dim)] hover:text-[var(--text-main)] hover:bg-[var(--surfaceHover)]";
            
            if (viewMode === 'grid') {
                btnGrid.className = activeClasses;
                btnList.className = inactiveClasses;
                grid.className = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 transition-all duration-300';
            } else {
                btnList.className = activeClasses;
                btnGrid.className = inactiveClasses;
                grid.className = 'flex flex-col gap-3 transition-all duration-300';
            }
            
            // Re-renderiza a biblioteca com o novo formato
            renderGamesGridOnly();
        }

       function renderGamesGridOnly() {
    const grid = document.getElementById('gameGrid');
    
    // RESTAURADO: Usa o displayLimit para carregar blocos de 20 em 20
    const paginated = currentFiltered.slice(0, displayLimit); 
    
    // RESTAURADO: Mantém o sentinel visível para o Intersection Observer detectar o final da tela
    const sentinel = document.getElementById('scrollSentinel');
    if (sentinel) {
        sentinel.style.display = 'block';
    }
    
    grid.innerHTML = paginated.map(g => {
// ... (o resto da função continua igual)
const displayType = (g.type === 'Filme OVA') ? 'Filme' : (g.type || 'Filme');
                const totalMinutes = calculateItemTotalMinutes(g);
                
                let epProg = '';
                if (!['Filme', 'Filme OVA'].includes(g.type || 'Filme') && g.epTotal > 0) {
                    const percent = Math.round((g.epWatched / g.epTotal) * 100) || 0;
                    const barColor = percent >= 100 ? 'bg-[var(--green)] shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-[var(--accent)] shadow-[0_0_8px_rgba(225,29,72,0.3)]';
                    epProg = `<div class="mt-1 space-y-1 w-full">
                        <div class="flex justify-between text-[7px] font-black opacity-60 uppercase"><span>Eps: ${g.epWatched}/${g.epTotal}</span><span>${percent}%</span></div>
                        <div class="h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
                            <div class="h-full ${barColor} transition-all duration-700" style="width: ${percent}%"></div>
                        </div>
                    </div>`;
                }

                if (viewMode === 'list') {
                    // ==================================
                    // HTML DO MODO LISTA EM LINHA (SEM CAPA)
                    // ==================================
                    return `
                    <div class="game-card w-full" id="game-${g.id}">
                        <div class="card-inner flex flex-row items-center py-2.5 px-4 gap-4 overflow-hidden bg-gradient-to-r from-[var(--surface)] to-[var(--input)] hover:border-[var(--accent)] transition-colors">
                            
                            <div class="flex items-center gap-3 flex-1 min-w-[150px]">
                                <div onclick="event.stopPropagation(); toggleFavorite('${g.id}')" class="text-lg leading-none cursor-pointer hover:scale-110 flex-shrink-0 ${g.isFavorite ? 'fav-active' : 'opacity-30 hover:opacity-100'}">★</div>
                                <h3 class="text-[12px] font-black uppercase truncate text-[var(--text-main)] cursor-pointer hover:text-[var(--accent)] transition-colors" title="${g.name}" onclick="openDetails('${g.id}')">
                                    ${(g.watchCount && g.watchCount > 1) ? `<span class="text-[var(--accent)] mr-1 drop-shadow-md">x${g.watchCount}</span>` : ''}${g.name}
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
                                <span class="text-[var(--accent)] font-black text-[9px] drop-shadow-[0_0_3px_rgba(225,29,72,0.4)]">${formatMinutes(totalMinutes)}</span>
                            </div>

                            <div class="hidden lg:block w-[100px] flex-shrink-0 -mt-2">
    ${!['Filme', 'Filme OVA'].includes(g.type || 'Filme') && g.epTotal > 0 ? epProg : ''}
</div>

                            <div class="flex items-center gap-2 flex-shrink-0 pl-2 border-l border-[var(--border)]">
    <button onclick="openDetails('${g.id}')" class="text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors text-[9px] font-black uppercase px-2 py-1 border border-[var(--accent)]/30 rounded" title="Ver Detalhes">Detalhes</button>
    <button onclick="editGame('${g.id}')" class="text-[var(--text-dim)] hover:text-[var(--text-main)] transition text-[12px] p-1" title="Editar">✏️</button>
    ${!['Filme', 'Filme OVA'].includes(g.type || 'Filme') ? `<button onclick="event.stopPropagation(); addOneEpisode('${g.id}')" class="text-indigo-500 hover:text-indigo-400 transition text-[12px] p-1 font-black" title="Adicionar 1 Episódio">+1</button>` : ''}
    <button onclick="if(confirm('Excluir Título?')){games=games.filter(x=>x.id!=='${g.id}');manualSave();}" class="text-red-500/60 hover:text-red-500 transition text-[12px] p-1 font-black" title="Excluir">✖</button>
                                                                    </div>
                        </div>
                    </div>`;
                } 
else {
                   // ==================================
// HTML DO MODO GRID (COM BOTÕES: OPÇÕES -> DETALHES -> NOTAS)
// ==================================
return `
<div class="game-card" id="game-${g.id}">
    <div class="card-inner flex flex-col justify-between h-full bg-[var(--surface)] border border-[var(--border)] rounded-lg overflow-hidden group">
        
        <!-- CONTAINER DA CAPA -->
        <div class="poster-container relative aspect-[2/3] overflow-hidden">
            ${(g.watchCount && g.watchCount > 1) ? `<div class="absolute top-0 left-1/2 -translate-x-1/2 bg-[var(--accent)] text-[#FFFFFF] text-[10px] font-black px-4 py-0.5 rounded-b-lg shadow-[0_5px_15px_var(--accent-glow)] z-30 border border-t-0 border-[var(--border)] tracking-widest backdrop-blur-md bg-opacity-90">x${g.watchCount}</div>` : ''}

            ${g.cover 
                ? `<img src="${g.cover}" class="blur-bg" loading="lazy" aria-hidden="true">
                   <img src="${g.cover}" class="main-cover" onerror="this.src='https://via.placeholder.com/400x600?text=Capa'" loading="lazy">` 
                : `<div class="absolute inset-0 flex items-center justify-center bg-[var(--input)] pointer-events-none">
                       <div class="-rotate-45 text-4xl font-black text-[var(--text-main)] border-[6px] border-[var(--text-main)] py-2 px-6 rounded-2xl opacity-[0.08] select-none tracking-widest">
                           ${g.type ? g.type.toUpperCase() : 'FILME'}
                       </div>
                   </div>`
            }
            
            <!-- OVERLAY DA CAPA: BOTÕES + OPÇÕES, DETALHES E NOTAS -->
            <div class="absolute inset-0 bg-[var(--surface)]/80 flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm z-20 p-2">
                <button onclick="openOptionsMenu('${g.id}')" class="btn btn-outline w-[130px] text-[10px] border-[var(--text-main)] text-[var(--text-main)] hover:bg-[var(--text-main)] hover:text-black shadow-[0_0_10px_rgba(255,255,255,0.2)] px-3 py-1.5 uppercase tracking-widest transition-colors">
                    + OPÇÕES
                </button>
                <button onclick="openDetails('${g.id}')" class="btn btn-primary w-[130px] text-[9px] py-1.5 tracking-widest uppercase shadow-[0_0_10px_rgba(225,29,72,0.4)]">
                    Detalhes
                </button>
                <button onclick="openRatingModal('${g.id}')" class="btn btn-outline w-[130px] text-[9px] py-1.5 border-amber-400/50 text-amber-400 hover:bg-amber-400 hover:text-black transition-colors tracking-widest uppercase shadow-[0_0_10px_rgba(251,191,36,0.2)]">
                    ★ NOTAS
                </button>
            </div>
        </div>

        <!-- CONTEÚDO DO CARD (LIMPO E COMPACTO) -->
        <div class="card-body-info relative flex flex-col flex-1 py-1.5 px-2">
            <div class="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[var(--white-highlight)] to-transparent"></div>
            
            <h3 class="text-[9px] font-medium uppercase truncate text-center w-full leading-tight tracking-wide text-[var(--text-main)] mb-0.5 mt-1" title="${g.name}">${g.name}</h3>
            
            <div class="flex items-center justify-center gap-2">
                <span class="text-[8px] font-bold text-[var(--text-dim)] uppercase tracking-widest">${g.releaseYear || '---'}</span>
                <div onclick="event.stopPropagation(); toggleFavorite('${g.id}')" class="text-[0.65rem] leading-none cursor-pointer transition-transform hover:scale-125 select-none ${g.isFavorite ? 'fav-active' : 'opacity-20 hover:opacity-100'}" title="${g.isFavorite ? 'Remover dos favoritos' : 'Favoritar'}">❤︎</div>
            </div>
        </div>
    </div>
</div>
`;
                }
            }).join('');
        }

/* =========================================================
   SISTEMA UNIFICADO DE DRAG & DROP
   ========================================================= */
let draggedItem = { index: null, type: null };

// Utilitário para pegar a cor da borda baseado no tipo
const getDragBorder = (type) => {
    if (['listaPrincipal', 'listaDetail'].includes(type)) return '!border-emerald-500';
    if (['aguardados', 'favoritos'].includes(type)) return '!border-[var(--accent)]';
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
        const allFavs = games.filter(g => g.isFavorite).sort((a, b) => (a.favOrder || 0) - (b.favOrder || 0));
        const displayFavs = favFilter === 'all' ? allFavs : allFavs.filter(g => (g.type || 'Filme') === favFilter);
        const movedItem = displayFavs.splice(draggedItem.index, 1)[0];
        displayFavs.splice(targetIndex, 0, movedItem);
        
        // Re-aplica a ordem global de favoritos no banco
        displayFavs.forEach((fav, i) => {
            const gameRef = games.find(g => g.id === fav.id);
            if (gameRef) gameRef.favOrder = i;
        });
        await manualSave();
        renderGames();
    } 
    else if (type === 'top100') {
        const config = top100Config[currentTop100Type];
        const arr = config.data();
        const moved = arr.splice(draggedItem.index, 1)[0];
        arr.splice(targetIndex, 0, moved);
        await localforage.setItem(config.key, arr);
        renderTop100List();
    }

    // Reseta após a ação
    draggedItem = { index: null, type: null }; 
}
        function renderGames() {
            applyFilters();
            const upGrid = document.getElementById('upcomingGrid');
            const favGrid = document.getElementById('statFavorites');
            
            upGrid.innerHTML = aguardados.map((a, i) => `
                <div 
    draggable="true" 
    ondragstart="handleUnifiedDragStart(event, ${i}, 'aguardados')" 
    ondragover="handleUnifiedDragOver(event, 'aguardados')" 
    ondragleave="handleUnifiedDragLeave(event, 'aguardados')" 
    ondrop="handleUnifiedDrop(event, ${i}, 'aguardados')"
    class="poster-card-sm group flex flex-col justify-between !w-[160px] !h-[240px] md:!w-[180px] md:!h-[270px] shadow-[0_5px_15px_var(--shadow-med)] border-2 border-transparent hover:border-[var(--accent)] cursor-grab active:cursor-grabbing transition-transform relative" 
    title="Arraste para reordenar">
                    
                    <!-- Botão de remover isolado para não conflitar com o Drag & Drop -->
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
            
            const allFavs = games.filter(g => g.isFavorite).sort((a, b) => (a.favOrder || 0) - (b.favOrder || 0));
            const displayFavs = favFilter === 'all' ? allFavs : allFavs.filter(g => (g.type || 'Filme') === favFilter);
            
            favGrid.innerHTML = displayFavs.map((f, index) => `
                <div
    draggable="true"
    ondragstart="handleUnifiedDragStart(event, ${index}, 'favoritos')"
    ondragover="handleUnifiedDragOver(event, 'favoritos')"
    ondragleave="handleUnifiedDragLeave(event, 'favoritos')"
    ondrop="handleUnifiedDrop(event, ${index}, 'favoritos')"
    onclick="document.getElementById('game-${f.id}').scrollIntoView({behavior:'smooth',block:'center'})"
    class="poster-card-sm border-2 border-transparent hover:border-[var(--accent)] hover:scale-105 transition-transform cursor-grab active:cursor-grabbing"
    title="Arraste para reordenar"
>
                >
                    <img src="${f.cover}" class="blur-bg pointer-events-none" loading="lazy" aria-hidden="true">
                    <img src="${f.cover}" class="main-cover pointer-events-none" loading="lazy" onerror="this.src='https://via.placeholder.com/400x600?text=Capa';">
                </div>`).join('') || '<p class="opacity-30 p-4 text-xs font-bold w-full text-center mt-8 text-[var(--text-main)]">Nenhum favorito encontrado.</p>';
            
            renderGamesGridOnly();
           updateYearFilters();
            renderLastWatchedMovies();
            initUnifiedAutoScroll();
            renderSeasonal();
        }

        function updateDashboard(list) {
            document.getElementById('statTotal').innerText = list.length;
            document.getElementById('statZ').innerText = list.filter(g => (g.status||'').toLowerCase() === 'visto').length;
            document.getElementById('statWatch').innerText = list.filter(g => (g.status||'').toLowerCase() === 'watchlist').length;
            
            // Adicionamos uma verificação que ignora o status 'watchlist' na soma
            let totalM = list.reduce((acc, g) => {
                if ((g.status || 'watchlist').toLowerCase() === 'watchlist') return acc;
                return acc + calculateItemTotalMinutes(g);
            }, 0);
            let totalH = Math.floor(totalM / 60);
            document.getElementById('statHours').innerText = `${totalH}h`;

            // === CÁLCULO DA NOTA MÉDIA RESTAURADO ===
            const rated = list.filter(g => parseFloat(g.rating) > 0);
            document.getElementById('statAvg').innerText = rated.length ? (rated.reduce((acc, g) => acc + parseFloat(g.rating), 0) / rated.length).toFixed(1) : '0.0';

            const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
            const monthTimeMap = {}; 
            list.forEach(g => { 
                if ((g.status || 'watchlist').toLowerCase() === 'watchlist') return; // Trava para o Watchlist
                if(g.startDate) { 
                    const mIndex = parseInt(g.startDate.split('-')[1]) - 1; 
                    if(mIndex >= 0 && mIndex <= 11) { 
                        const mName = monthNames[mIndex]; 
                        const gameMinutes = calculateItemTotalMinutes(g);
                        monthTimeMap[mName] = (monthTimeMap[mName] || 0) + gameMinutes; 
                    } 
                } 
            });
            const sortedMonths = Object.entries(monthTimeMap).sort((a,b) => b[1] - a[1]);
            document.getElementById('statMonth').innerText = sortedMonths.length > 0 ? sortedMonths[0][0] : '---';
            
            // --- CÁLCULO SEPARADO PARA PRINCIPAL E SUBGÊNERO ---
            const mainGenres = {};
            const subGenres = {};
            let totalMain = 0;
            let totalSub = 0;

            list.forEach(g => { 
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

            const top5Main = Object.entries(mainGenres).sort((a,b) => b[1] - a[1]).slice(0, 5);
            const top5Sub = Object.entries(subGenres).sort((a,b) => b[1] - a[1]).slice(0, 5);

            // Estética Minimalista - Sem quantidade, % Verde e Mais Espaçado
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

            // Layout com divisória central suave e mais espaçamento interno
            document.getElementById('genreStatsList').innerHTML = `
                <div class="flex gap-6 md:gap-8 py-2">
                    <div class="flex-1 min-w-0">${renderGenreColumn(top5Main, totalMain, 'Gêneros Principais')}</div>
                    <div class="w-px bg-gradient-to-b from-transparent via-[var(--border)] to-transparent flex-shrink-0"></div>
                    <div class="flex-1 min-w-0">${renderGenreColumn(top5Sub, totalSub, 'Subgêneros')}</div>
                </div>
            `;
        }

        function updateYearFilters() {
            const yearSelect = document.getElementById('yearFilter');
            const releaseSelect = document.getElementById('releaseYearFilter');
            const currentYear = yearSelect.value;
            const currentRelease = releaseSelect.value;

            const watchYears = [...new Set(games.map(g => g.startDate?.split('-')[0]).filter(Boolean))].sort((a,b) => b-a);
            const releaseYears = [...new Set(games.map(g => g.releaseYear).filter(Boolean))].sort((a,b) => b-a);

            if (yearSelect.options.length !== watchYears.length + 1) {
                yearSelect.innerHTML = '<option value="all">Visto em</option>' + watchYears.map(y => `<option value="${y}">${y}</option>`).join('');
                yearSelect.value = watchYears.includes(currentYear) ? currentYear : 'all';
            }
            if (releaseSelect.options.length !== releaseYears.length + 1) {
                releaseSelect.innerHTML = '<option value="all">Lançamento</option>' + releaseYears.map(y => `<option value="${y}">${y}</option>`).join('');
                releaseSelect.value = releaseYears.includes(currentRelease) ? currentRelease : 'all';
            }
        }
function updateAutoStatus(g) {
    // 1. Ignora a lógica se o usuário marcou manualmente como "Abandonado"
    if ((g.status || '').toLowerCase() === 'abandonado') return;
    
    // 2. Aplica apenas para Séries, Animes e Desenhos
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

        async function saveGame() {
            const id = document.getElementById('editId').value;
            const gameName = document.getElementById('gameName').value.trim();
            
            if(!gameName) return;

            // Sistema de verificação de duplicidade na biblioteca
            const obraDuplicada = games.find(x => x.name.toLowerCase() === gameName.toLowerCase() && x.id !== id);
            if (obraDuplicada) {
                alert(`Aviso: A obra "${gameName}" já existe em sua biblioteca!`);
                return; // Interrompe o processo e evita o cadastro duplicado
            }

            const existing = id ? games.find(x => x.id === id) : null;
            
            const inputGenre = document.getElementById('gameGenre').value || "Outros";
            const processedGenre = inputGenre.split(',').map(g => g.trim()).filter(Boolean).slice(0, 2).join(', ');

            const coverInput = document.getElementById('gameCover').value.trim();
            const saveOnlyUrl = document.getElementById('saveCoverOnlyUrl')?.checked;
            // Se o checkbox estiver marcado, usa a URL crua. Se não, converte para Base64.
            const coverFinal = saveOnlyUrl ? coverInput : await urlToBase64(coverInput);

            // CORREÇÃO: Verifica se a imagem final NÃO é um código Base64 válido
            if (!saveOnlyUrl && coverInput !== '' && !coverFinal.startsWith('data:image')) {
                alert("⚠️ AVISO: O site de origem bloqueou a conversão desta imagem para código offline (erro de segurança/timeout). A capa foi salva apenas como Link (URL).");
            }

            const g = { 
                id: id || crypto.randomUUID(), 
                name: gameName, 
                type: document.getElementById('gameType').value, 
                cover: coverFinal, 
                genre: processedGenre, 
                director: document.getElementById('gameDirector').value.trim(), // NOVO
                studio: document.getElementById('gameStudio').value.trim(),     // NOVO
                releaseYear: document.getElementById('gameReleaseYear').value.trim(), 
                epWatched: parseInt(document.getElementById('epWatched').value) || 0,
                epTotal: parseInt(document.getElementById('epTotal').value) || 0,
                seasons: parseInt(document.getElementById('gameSeasons').value) || 0,
                seasonDates: [...tempSeasonDates], // Salva a lista inteira
                hours: parseInt(document.getElementById('gameHours').value) || 0, 
                minutes: parseInt(document.getElementById('gameMinutes').value) || 0, 
                rating: parseFloat(document.getElementById('gameRating').value) || 0, 
                status: document.getElementById('gameStatus').value, 
                startDate: document.getElementById('gameStartDate').value, 
                isFavorite: existing ? existing.isFavorite : false,
                sessions: existing ? (existing.sessions || []) : [],
                comment: existing ? existing.comment : '',
                hasCommentSection: existing ? existing.hasCommentSection : false,
            watchCount: existing ? (existing.watchCount || 1) : 1,
            favOrder: existing ? existing.favOrder : undefined
        };
        
        // NOVA CHAMADA AQUI
        updateAutoStatus(g);
        
        if(!id) games.push(g); else { const idx = games.findIndex(x => x.id === id); games[idx] = g; }
        await manualSave(); 
        closeModal();
        }
async function addOneEpisode(id) {
    const g = games.find(x => x.id === id);
    if (!g) return; 
    
    // Verifica se é Filme ou OVA
    const isSingle = ['Filme', 'Filme OVA'].includes(g.type || 'Filme');
    if (isSingle) return; 
    
    const currentEps = parseInt(g.epWatched) || 0;
    
    // Se for o primeiro episódio (saindo do zero para o um), adiciona a data atual
    if (currentEps === 0) {
        g.startDate = new Date().toISOString().split('T')[0];
    }
    
    g.epWatched = currentEps + 1;
    g.lastUpdate = Date.now(); // NOVO: Marca o momento exato em que o episódio foi visto!
    
// NOVA CHAMADA AQUI
    updateAutoStatus(g);

    await manualSave();
}

        function editGame(id) {
            const g = games.find(x => x.id === id);
            document.getElementById('editId').value = id;
            document.getElementById('gameName').value = g.name || '';
            document.getElementById('gameType').value = g.type || 'Filme';
            document.getElementById('gameCover').value = g.cover || '';
            document.getElementById('gameGenre').value = g.genre || '';
            document.getElementById('gameDirector').value = g.director || ''; // NOVO
            document.getElementById('gameStudio').value = g.studio || '';     // NOVO
            document.getElementById('gameReleaseYear').value = g.releaseYear || '';
            document.getElementById('epWatched').value = g.epWatched || 0;
            document.getElementById('epTotal').value = g.epTotal || 0;
            document.getElementById('gameSeasons').value = g.seasons || 0;
            // Carrega as datas salvas e renderiza os botõezinhos (S1, S2, etc)
            tempSeasonDates = g.seasonDates ? [...g.seasonDates] : [];
            renderSeasonDatesUI();
            document.getElementById('gameHours').value = g.hours || 0;
            document.getElementById('gameMinutes').value = g.minutes || 0;
            document.getElementById('gameRating').value = g.rating || 0;
            document.getElementById('gameStatus').value = g.status || 'Watchlist';
            document.getElementById('gameStartDate').value = g.startDate || '';
            document.getElementById('modalTitle').innerText = "Editar Obra";
            openModal();
        }

        async function toggleFavorite(id) {
            const g = games.find(x => x.id === id);
            if (g) {
                g.isFavorite = !g.isFavorite;
                if (g.isFavorite && g.favOrder === undefined) {
                    g.favOrder = Date.now();
                }
                await manualSave();
            }
        }
// Função para modificar a nota diretamente pelo card
async function setGameRating(id, rating) {
    const g = games.find(x => x.id === id);
    if (g) {
        g.rating = rating;
        await manualSave();
    }
}
/* === MODAL DE NOTAS === */
        function openRatingModal(id) {
            const g = games.find(x => x.id === id);
            if (!g) return;

            document.getElementById('ratingModalGameId').value = id;
            document.getElementById('ratingModalGameName').innerText = g.name || '';
            document.getElementById('ratingModalSelect').value = g.rating || 0;

            document.getElementById('ratingModal').style.display = 'flex';
        }

        function closeRatingModal() {
            document.getElementById('ratingModal').style.display = 'none';
        }

        async function saveRatingModal() {
            const id = document.getElementById('ratingModalGameId').value;
            const newRating = parseInt(document.getElementById('ratingModalSelect').value) || 0;

            const g = games.find(x => x.id === id);
            if (g) {
                g.rating = newRating;
                await manualSave();
            }

            closeRatingModal();
        }
/* === TELA CHEIA E PLANO DE FUNDO === */
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

        async function changeBackground() {
            const url = prompt("Cole a URL da imagem para o plano de fundo (ou deixe em branco para remover):");
            if (url !== null) {
                if (url.trim() === "") {
                    document.body.style.backgroundImage = 'none';
                    await localforage.removeItem('ct_custom_bg_v70');
                } else {
                    // Adiciona uma máscara escura (rgba) por cima da imagem para garantir que os textos continuem legíveis
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
        async function initApp() { 
            await loadData();
            await loadProfilePic();
            checkDataStatus();
            resetAndRender(); 
            renderAbsoluteCinema(); // <--- LINHA ADICIONADA AQUI!
            initUnifiedAutoScroll(); // Inicializa os carrosséis após os dados existirem
            loadCustomBackground();  // Restaura o fundo personalizado salvo
        }
window.onload = initApp;
/* =========================================================
   SISTEMA UNIFICADO DE AUTO-SCROLL (ALTA PERFORMANCE)
   ========================================================= */
const scrollState = {
    'statFavorites': { speed: 0.4, pos: 0, paused: false, waiting: false },
    'upcomingGrid': { speed: 0.4, pos: 0, paused: false, waiting: false },
    'lastWatchedMovies': { speed: 0.4, pos: 0, paused: false, waiting: false }
};

let globalScrollFrame = null;

function initUnifiedAutoScroll() {
    Object.keys(scrollState).forEach(id => {
        const container = document.getElementById(id);
        if (!container) return;

        // Reset de estilos para o auto-scroll deslizar liso
        container.style.scrollSnapType = 'none';
        container.style.scrollBehavior = 'auto';

        // Controles de Pausa
        const pause = () => scrollState[id].paused = true;
        const play = () => scrollState[id].paused = false;

        container.onmouseenter = pause;
        container.onmouseleave = play;
        container.ontouchstart = pause;
        container.ontouchend = play;

        scrollState[id].pos = container.scrollLeft;
    });

    // Garante que só roda 1 requestAnimationFrame para todo o app
    if (globalScrollFrame) cancelAnimationFrame(globalScrollFrame);
    globalScrollLoop();
}

function globalScrollLoop() {
    Object.keys(scrollState).forEach(id => {
        const state = scrollState[id];
        const container = document.getElementById(id);
        
        if (!container) return;

        // Executa a rolagem se não estiver pausado ou esperando
        if (!state.paused && !state.waiting && container.scrollWidth > container.clientWidth) {
            state.pos += state.speed;
            container.scrollLeft = state.pos;

            // Retorna ao início suavemente
            if (Math.ceil(container.scrollLeft + container.clientWidth) >= container.scrollWidth - 1) {
                state.waiting = true;
                container.scrollLeft = 0;
                state.pos = 0;
                setTimeout(() => state.waiting = false, 2000);
            }
        } else if (state.paused) {
            // Sincroniza a posição caso o usuário arraste manualmente
            state.pos = container.scrollLeft;
        }
    });

    globalScrollFrame = requestAnimationFrame(globalScrollLoop);
}

function renderLastWatchedMovies() {
    const container = document.getElementById('lastWatchedMovies');
    if(!container) return;

    // Filtra apenas filmes (ou OVAs) que já foram marcados como "Visto"
    const watchedMovies = games.filter(g => 
        (g.status || '').toLowerCase() === 'visto' && 
        ['Filme', 'Filme OVA'].includes(g.type || 'Filme')
    );

    // Ordena da data de visualização mais recente para a mais antiga
    watchedMovies.sort((a, b) => {
        const dateA = a.startDate || "";
        const dateB = b.startDate || "";
        if(dateA === dateB) {
            return (b.lastUpdate || 0) - (a.lastUpdate || 0); // Desempata pela última interação
        }
        return dateB.localeCompare(dateA);
    });

    // Pega as últimas 10 obras
    const top10Watched = watchedMovies.slice(0, 10);

    container.innerHTML = top10Watched.map(f => `
        <div onclick="document.getElementById('game-${f.id}').scrollIntoView({behavior:'smooth',block:'center'})" class="poster-card-sm border-2 border-transparent hover:border-[var(--accent)] hover:scale-105 transition-transform cursor-pointer relative" title="${f.name}">
            <img src="${f.cover}" class="blur-bg pointer-events-none" loading="lazy" aria-hidden="true">
            <img src="${f.cover}" class="main-cover pointer-events-none" loading="lazy" onerror="this.src='https://via.placeholder.com/400x600?text=Capa';">
        </div>
    `).join('') || '<p class="opacity-30 p-4 text-xs font-bold w-full text-center mt-8 text-[var(--text-main)] uppercase tracking-widest">Nenhum filme assistido ainda.</p>';
}     

       /* === MODAL DE DETALHES === */
async function openDetails(id) {
    const g = games.find(x => x.id === id);
    if(!g) return;

    document.getElementById('detailCover').src = g.cover || 'https://via.placeholder.com/400x600?text=Capa';
    
    // --- NOVO: CONTROLE DA TAG DE REASSISTIR NA CAPA ---
    const rewatchEl = document.getElementById('detailRewatch');
    if (rewatchEl) {
        if (g.watchCount && g.watchCount > 1) {
            rewatchEl.innerText = 'x' + g.watchCount;
            rewatchEl.classList.remove('hidden');
        } else {
            rewatchEl.classList.add('hidden');
        }
    }
    // ---------------------------------------------------
    
    const typeEl = document.getElementById('detailType');
    // ... resto do código continua igual ...
    typeEl.innerText = g.type || 'Filme';
    typeEl.className = `text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-[var(--input)] border border-[var(--border)] w-max mb-1.5 shadow-inner type-${(g.type||'filme').toLowerCase().replace(' ', '-')}`;
    
    document.getElementById('detailTitle').innerText = g.name || '';
    if (document.getElementById('detailYear')) document.getElementById('detailYear').innerText = g.releaseYear || '----';
if (document.getElementById('detailGenre')) document.getElementById('detailGenre').innerText = g.genre || 'Sem Gênero';
if (document.getElementById('detailYearGenre')) document.getElementById('detailYearGenre').innerText = `${g.releaseYear || '----'} • ${g.genre || 'Sem Gênero'}`;
    
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

    document.getElementById('detailStatus').innerText = g.status || 'Watchlist';
    document.getElementById('detailDate').innerText = g.startDate ? g.startDate.split('-').reverse().join('/') : '---';

    // --- NOVO: EXIBIR DIRETOR E ESTÚDIO NO POPUP ---
    document.getElementById('detailDirectorDisplay').innerText = g.director || '---';
    document.getElementById('detailStudioDisplay').innerText = g.studio || '---';
    // -----------------------------------------------

    const extraInfoDiv = document.getElementById('tmdbExtraInfo');
    if(extraInfoDiv) extraInfoDiv.classList.add('hidden');
    
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
            
            // --- SINCRONIZAÇÃO INTELIGENTE DE EPISÓDIOS ---
            const epsPerSeasonArray = [];
            const epsPerSeasonAvg = Math.ceil(effectiveEpTotal / effectiveSeasons);
            
            // 1. Calcula quantos episódios existem por temporada
            for (let s = 1; s <= effectiveSeasons; s++) {
                let epsInThisSeason = epsPerSeasonAvg;
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
            
            // 2. Se você marcou episodios no botão "+1 EP" fora do popup, 
            // a quantidade visual estará defasada. Aqui nós completamos os marcadores!
            if (g.watchedEpisodes.length !== targetWatched) {
                g.watchedEpisodes = [];
                let count = 0;
                for (let s = 1; s <= effectiveSeasons; s++) {
                    for (let e = 1; e <= epsPerSeasonArray[s - 1]; e++) {
                        if (count < targetWatched) {
                            g.watchedEpisodes.push(`S${s}E${e}`);
                            count++;
                        }
                    }
                }
                // Salva o preenchimento automático silenciosamente
                manualSave();
            }
            // ----------------------------------------------
            
            let html = '';
            
            for (let s = 1; s <= effectiveSeasons; s++) {
                const epsInThisSeason = epsPerSeasonArray[s - 1];
                
                const sPrefix = `S${s}E`;
                const epsVistosNaTemp = g.watchedEpisodes.filter(e => e.startsWith(sPrefix)).length;
                const seasonChecked = (epsVistosNaTemp >= epsInThisSeason && epsInThisSeason > 0);
                const seasonBtnColor = seasonChecked ? 'bg-[var(--text-main)] text-[var(--bg)] border-transparent' : 'border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--text-main)] hover:text-[var(--text-main)]';

                let epsHtml = '';
                for (let e = 1; e <= epsInThisSeason; e++) {
                    const epCode = `S${s}E${e}`;
                    const isWatched = g.watchedEpisodes.includes(epCode);
                    const checkClasses = isWatched 
                        ? 'bg-[var(--text-main)] border-transparent text-[var(--bg)]' 
                        : 'border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--text-main)] hover:text-[var(--text-main)]';
                        
                    epsHtml += `
                    <div class="flex items-center justify-between p-3 border-t border-[var(--border)] hover:opacity-80 transition-colors cursor-pointer" onclick="toggleStaticEpisode('${g.id}', ${s}, ${e}, this)">
                        <div class="flex items-center gap-4 min-w-0 w-3/4">
                            <div class="w-12 h-8 flex-shrink-0 bg-[var(--input)] rounded flex items-center justify-center border border-[var(--border)] shadow-sm text-[var(--text-dim)] text-[8px] font-black">
                                EP
                            </div>
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

    document.getElementById('detailsModal').style.display = 'flex';
}
// =========================================================
// EDIÇÃO CUSTOMIZADA DE EPISÓDIOS POR TEMPORADA
// =========================================================
async function editSeasonEps(gameId, seasonNum) {
    const g = games.find(x => x.id === gameId);
    if (!g) return;

    const effectiveSeasons = (g.seasons && g.seasons > 0) ? g.seasons : 1;
    const effectiveEpTotal = (g.epTotal && g.epTotal > 0) ? g.epTotal : Math.max(parseInt(g.epWatched) || 0, 12);
    const epsPerSeason = Math.ceil(effectiveEpTotal / effectiveSeasons);
    
    // Descobre quantos episódios tem atualmente para exibir no prompt
    let currentEps = epsPerSeason;
    if (seasonNum === effectiveSeasons) {
        currentEps = effectiveEpTotal - (epsPerSeason * (effectiveSeasons - 1));
        if (currentEps <= 0) currentEps = epsPerSeason;
    }
    if (g.seasonEps && g.seasonEps[seasonNum]) {
        currentEps = g.seasonEps[seasonNum];
    }

    const newValue = prompt(`Quantos episódios a Temporada ${seasonNum} possui?`, currentEps);
    if (newValue === null) return; // Cancelado
    
    const newEps = parseInt(newValue);
    if (isNaN(newEps) || newEps < 1) {
        alert("Valor inválido! Digite um número maior que 0.");
        return;
    }

    // Salva o novo valor apenas para esta temporada
    if (!g.seasonEps) g.seasonEps = {};
    g.seasonEps[seasonNum] = newEps;

    // Recalcula o TOTAL GERAL de episódios da obra somando todas as temporadas
    let novoTotalDeEps = 0;
    for (let i = 1; i <= effectiveSeasons; i++) {
        if (g.seasonEps[i]) {
            novoTotalDeEps += g.seasonEps[i];
        } else {
            let fallback = epsPerSeason;
            if (i === effectiveSeasons) {
                fallback = effectiveEpTotal - (epsPerSeason * (effectiveSeasons - 1));
                if (fallback <= 0) fallback = epsPerSeason;
            }
            novoTotalDeEps += fallback;
        }
    }
    
    // Atualiza a obra com o novo total
    // Atualiza a obra com o novo total
    g.epTotal = novoTotalDeEps;

    // NOVA CHAMADA AQUI
    updateAutoStatus(g);

    await manualSave();
    
    // Recarrega o Popup inteiro por trás para aplicar o novo HTML
    await openDetails(gameId);
    
    // Mantém as listas de episódios abertas onde você estava mexendo
    const list = document.getElementById('seasonsModalList');
    const icon = document.getElementById('allSeasonsToggleIcon');
    if (list) {
        list.classList.remove('hidden'); list.classList.add('flex');
        if (icon) icon.innerText = '🔼';
    }
    setTimeout(() => toggleStaticSeasonAccordion(seasonNum), 50);
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
/* === MODAL DE OPÇÕES DO CARD === */
        function openOptionsMenu(id) {
            const g = games.find(x => x.id === id);
            if (!g) return;

            const displayType = (g.type === 'Filme OVA') ? 'Filme' : (g.type || 'Filme');
            const totalMinutes = calculateItemTotalMinutes(g);

            document.getElementById('optionsType').innerText = g.type || 'Filme';
            document.getElementById('optionsType').className = `text-[8px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded bg-[var(--tab-bg)] border border-[var(--border)] inline-block mb-2 type-${displayType.toLowerCase().replace(' ', '-')}`;
            document.getElementById('optionsTitle').innerText = g.name || '';
            document.getElementById('optionsInfo').innerText = `${g.releaseYear || '----'} • ${g.status || 'Watchlist'} • ★ ${g.rating || 0}/10 • ${formatMinutes(totalMinutes)}`;

            // Progresso de episódios (para Séries/Animes/Desenhos)
            const epProgContainer = document.getElementById('optionsEpProgress');
            if (!['Filme', 'Filme OVA'].includes(g.type || 'Filme') && g.epTotal > 0) {
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

            // Injeção dos Botões de Ação
            const isSingle = ['Filme', 'Filme OVA'].includes(g.type || 'Filme');
            let buttonsHTML = `
                <button onclick="openDetails('${g.id}'); closeOptionsMenu();" class="btn btn-primary w-full !text-[10px] py-2 tracking-widest uppercase shadow-[0_0_10px_rgba(225,29,72,0.3)]">Detalhes Completos</button>
                ${(isSingle && (g.status || 'Watchlist').toLowerCase() === 'watchlist') ? `<button onclick="markAsWatched('${g.id}')" class="btn btn-primary w-full !text-[10px] py-2 tracking-widest uppercase bg-emerald-600 hover:bg-emerald-700 shadow-[0_0_10px_rgba(16,185,129,0.3)] border-none">Assistir</button>` : ''}
                ${!isSingle ? `<button onclick="addOneEpisode('${g.id}'); openOptionsMenu('${g.id}');" class="btn btn-outline !text-[10px] py-2 border-indigo-500/30 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-colors">+1 Episódio</button>` : ''}
                <div class="grid grid-cols-2 gap-2">
                    <button onclick="addRewatch('${g.id}'); closeOptionsMenu();" class="btn btn-outline !text-[10px] py-2 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-colors">+ Reassistir</button>
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
async function markAsWatched(id) {
    const g = games.find(x => x.id === id);
    if (!g) return;
    
    // Atualiza o status para Visto e define a data atual
    g.status = 'Visto';
    g.startDate = new Date().toISOString().split('T')[0];
    
    // Salva as alterações e fecha o menu de opções
    await manualSave();
    closeOptionsMenu();
}
/* ==========================================
           LÓGICA: ANIMES DA TEMPORADA (Adaptado para Meu Tv Time)
           ========================================== */
        
        let currentSeasonFilter = 'auto';

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

            let season = '';
            let icon = '';
            
            if (month >= 1 && month <= 3) { season = 'Inverno'; icon = '❄️'; }
            else if (month >= 4 && month <= 6) { season = 'Primavera'; icon = '🌸'; }
            else if (month >= 7 && month <= 9) { season = 'Verão'; icon = '☀️'; }
            else if (month >= 10 && month <= 12) { season = 'Outono'; icon = '🍂'; }

            return { year, season, icon };
        }

        function renderSeasonal() {
            // No Meu Tv Time, o type padrão é "Filme", filtramos explícito por "Anime"
            const animes = games.filter(g => (g.type || 'Filme') === 'Anime');
            const assistindo = animes.filter(g => g.status === 'Assistindo' && g.startDate);

            let dataAtual = new Date();
            let targetSeasonInfo = getSeasonInfo(`${dataAtual.getFullYear()}-${(dataAtual.getMonth() + 1).toString().padStart(2, '0')}`);

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
                // Checa a data inicial que você começou a assistir
                if (g.startDate) datesToCheck.push(g.startDate);
                
                // Checa todas as temporadas que você cadastrou
                if (g.seasonDates && g.seasonDates.length > 0) {
                    datesToCheck.push(...g.seasonDates);
                }
                
                // Se o anime for de Inverno 2024 (S1) ou Inverno 2026 (S3), ele aparece!
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
            let epProg = '';
            const percent = g.epTotal > 0 ? Math.round((g.epWatched / g.epTotal) * 100) : 0;
            const barColor = percent >= 100 ? 'bg-[var(--green)] shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-[var(--accent)] shadow-[0_0_8px_var(--accent-glow)]';
            
            epProg = `
            <div class="mt-1 space-y-1">
                <div class="flex justify-between text-[9px] font-black uppercase text-[var(--text-main)]">
    <span>Eps: <span class="font-bold">${g.epWatched}</span> / ${g.epTotal || '?'}</span>
    <span>${percent}%</span>
</div>
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

                        <!-- OVERLAY DE HOVER (APARECE O BOTÃO +1 EP COM COR DO MEU TV TIME) -->
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

// ==========================================
        // SISTEMA DE ALTERNÂNCIA DE ESTATÍSTICAS
        // ==========================================
        let statsMediaType = 'filmes';

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

            if (targetModal === 'top10') openTop10();
            if (targetModal === 'retro') renderRetrospectiva(document.getElementById('retroYearSelect').value);
            if (targetModal === 'timeline') renderTimeline(document.getElementById('timelineYearSelect').value);
            if (targetModal === 'badges') renderBadges();
        }

        function getFilteredGamesForStats() {
            return games.filter(g => {
                const t = (g.type || 'Filme').toLowerCase();
                if (statsMediaType === 'filmes') {
                    return ['filme', 'série'].includes(t);
                } else {
                    return ['anime', 'desenho', 'filme ova'].includes(t);
                }
            });
        }

        // ================= FUNÇÕES ATUALIZADAS =================
        function openTop10() {
            const modal = document.getElementById('top10Modal');
            const grid = document.getElementById('top10Grid');
            
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

        // ==== SUBSTITUI QUALQUER VERSÃO ANTERIOR DE OPENRETROSPECTIVA ====
        function openRetrospectiva() {
            const yearsPlayed = [...new Set(games.flatMap(g => [g.startDate?.split('-')[0]].filter(Boolean)))].sort((a,b) => b-a);
            const select = document.getElementById('retroYearSelect');
            if (yearsPlayed.length === 0) return alert("Nenhuma obra registrada com data de início para gerar a retrospectiva!");
            
            select.innerHTML = '<option value="all">Todos os Anos</option>' + yearsPlayed.map(y => `<option value="${y}">${y}</option>`).join('');
            select.value = 'all';
            
            renderRetrospectiva('all');
            document.getElementById('retrospectivaModal').style.display = 'flex';
        }

        function renderRetrospectiva(ano) {
            if (!ano) return;
            document.getElementById('retroYearLabel').innerText = ano === 'all' ? 'TODOS OS ANOS' : ano;
            
            const jogosAno = getFilteredGamesForStats().filter(g => {
                if (!g.startDate) return false;
                if ((g.status || 'watchlist').toLowerCase() === 'watchlist') return false; // Bloqueia a Watchlist aqui!
                if (ano === 'all') return true;
                return g.startDate.startsWith(ano);
            });

            document.getElementById('retroTotalGames').innerText = `${jogosAno.length} Obras`;

            let totalMinsAno = 0;
            jogosAno.forEach(g => { totalMinsAno += calculateItemTotalMinutes(g); });
            const tH = Math.floor(totalMinsAno / 60); const tM = totalMinsAno % 60;
            document.getElementById('retroTotalTime').innerText = `${tH}:${tM.toString().padStart(2, '0')}:00`;

            const typeMap = {};
            jogosAno.forEach(g => {
                const t = g.type || 'Filme';
                typeMap[t] = (typeMap[t] || 0) + calculateItemTotalMinutes(g);
            });
            const sortedTypes = Object.entries(typeMap).sort((a,b) => b[1] - a[1]);
            const topType = sortedTypes.length > 0 ? sortedTypes[0] : null;
            
            if (topType && totalMinsAno > 0) {
                const perc = ((topType[1] / totalMinsAno) * 100).toFixed(2);
                document.getElementById('retroPlatPercent').innerText = `${perc.replace('.', ',')}%`;
                document.getElementById('retroTopPlatName').innerText = topType[0];
            } else {
                document.getElementById('retroPlatPercent').innerText = `0%`;
                document.getElementById('retroTopPlatName').innerText = `---`;
            }

            document.getElementById('retroZerados').innerText = jogosAno.filter(g => (g.status||'').toLowerCase() === 'visto').length;

            const sortedGames = [...jogosAno].sort((a,b) => calculateItemTotalMinutes(b) - calculateItemTotalMinutes(a));
            document.getElementById('retroTopGamesList').innerHTML = sortedGames.slice(0, 5).map((g, i) => {
                const mins = calculateItemTotalMinutes(g);
                const hrs = `${Math.floor(mins/60)}:${(mins%60).toString().padStart(2, '0')}:00`;
                return `
                    <div class="flex justify-between items-center border-b border-[var(--border)] pb-2 last:border-0 last:pb-0">
                        <div class="flex items-center gap-2 overflow-hidden">
                            <span class="text-[10px] font-black text-[var(--text-dim)]">${i+1}º</span>
                            <span class="text-[11px] font-black uppercase truncate ${i===0 ? 'text-[var(--accent)] text-sm' : 'text-[var(--text-main)]'}">${g.name}</span>
                        </div>
                        <span class="text-[10px] font-bold text-[var(--text-dim)] ml-2 whitespace-nowrap">${hrs}</span>
                    </div>
                `;
            }).join('') || '<p class="text-xs text-center opacity-50">Sem dados</p>';

            const genMap = {};
            jogosAno.forEach(g => {
                if(!g.genre) return;
                const gens = g.genre.split(/[,/|-]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
                const t = calculateItemTotalMinutes(g);
                gens.forEach(gen => { genMap[gen] = (genMap[gen] || 0) + t; });
            });
            const sortedGenres = Object.entries(genMap).sort((a,b) => b[1] - a[1]).slice(0, 3);
            document.getElementById('retroTopGenresList').innerHTML = sortedGenres.map((gen, i) => {
                const perc = totalMinsAno > 0 ? ((gen[1] / totalMinsAno) * 100).toFixed(2) : 0;
                return `
                    <div class="flex items-center justify-between border-b border-[var(--border)] py-2 last:border-0 last:pb-0">
                        <div class="flex items-center gap-2 flex-1 min-w-0 pr-2">
                            <div class="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded bg-[var(--accent)] text-[#FFFFFF] text-[10px] font-black shadow-[0_0_10px_var(--accent-glow)]">${i+1}º</div>
                            <span class="font-black uppercase truncate flex-1 min-w-0 ${i===0 ? 'text-[var(--text-main)] text-[12px]' : 'text-[var(--text-dim)] text-[11px]'}">${gen[0]}</span>
                        </div>
                        <div class="text-right flex flex-col justify-center flex-shrink-0">
                            <span class="text-[8px] font-bold text-[var(--text-dim)] mb-0.5">${Math.floor(gen[1]/60)}:${(gen[1]%60).toString().padStart(2, '0')}:00</span>
                            <span class="text-[13px] font-black text-[var(--accent)] drop-shadow-[0_0_5px_var(--accent-glow)]">${perc.toString().replace('.', ',')}%</span>
                        </div>
                    </div>
                `;
            }).join('') || '<p class="text-xs text-center opacity-50 mt-4">Sem dados</p>';

            const monthNames = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
            const monthMap = {};
            jogosAno.forEach(g => {
                const mIndex = parseInt(g.startDate.split('-')[1]) - 1;
                if(mIndex >= 0 && mIndex <= 11) monthMap[mIndex] = (monthMap[mIndex] || 0) + calculateItemTotalMinutes(g);
            });
            const sortedMonths = Object.entries(monthMap).sort((a,b) => b[1] - a[1]);
            if(sortedMonths.length > 0) {
                const topM = sortedMonths[0]; const botM = sortedMonths[sortedMonths.length - 1];
                const topPerc = ((topM[1] / totalMinsAno) * 100).toFixed(2);
                document.getElementById('retroTopMonth').innerText = monthNames[topM[0]];
                document.getElementById('retroTopMonthStats').innerHTML = `${topPerc.replace('.', ',')}% <br> <span class="text-[var(--text-dim)] font-normal text-[9px]">${Math.floor(topM[1]/60)}:${(topM[1]%60).toString().padStart(2, '0')}:00</span>`;
                const botPerc = ((botM[1] / totalMinsAno) * 100).toFixed(2);
                document.getElementById('retroBottomMonth').innerText = monthNames[botM[0]];
                document.getElementById('retroBottomMonthStats').innerHTML = `${botPerc.replace('.', ',')}% <br> <span class="text-[var(--text-dim)] font-normal text-[9px]">${Math.floor(botM[1]/60)}:${(botM[1]%60).toString().padStart(2, '0')}:00</span>`;
            } else {
                document.getElementById('retroTopMonth').innerText = '---'; document.getElementById('retroTopMonthStats').innerText = '';
                document.getElementById('retroBottomMonth').innerText = '---'; document.getElementById('retroBottomMonthStats').innerText = '';
            }

            // ATUALIZAÇÃO SEGURA DAS LABELS DE FORMATOS
            let tipo1 = 0, tipo2 = 0;
            let label1 = statsMediaType === 'filmes' ? 'Filmes' : 'Animes';
            let label2 = statsMediaType === 'filmes' ? 'Séries' : 'Desenhos/OVAs';

            jogosAno.forEach(g => {
                const t = (g.type || 'Filme').toLowerCase();
                if (statsMediaType === 'filmes') {
                    if(['filme'].includes(t)) tipo1++; 
                    else if(['série'].includes(t)) tipo2++;
                } else {
                    if(['anime'].includes(t)) tipo1++;
                    else if(['desenho', 'filme ova'].includes(t)) tipo2++;
                }
            });

            const tEras = tipo1 + tipo2;
            
            const elLabel1 = document.getElementById('retroFormatLabel1') || document.getElementById('retroPercFilmes')?.previousElementSibling;
            if(elLabel1) elLabel1.innerText = label1;
            
            const elLabel2 = document.getElementById('retroFormatLabel2') || document.getElementById('retroPercSeries')?.previousElementSibling;
            if(elLabel2) elLabel2.innerText = label2;
            
            const elPerc1 = document.getElementById('retroPerc1') || document.getElementById('retroPercFilmes');
            if(elPerc1) elPerc1.innerText = tEras > 0 ? `${((tipo1/tEras)*100).toFixed(2).replace('.', ',')}%` : '0%';
            
            const elPerc2 = document.getElementById('retroPerc2') || document.getElementById('retroPercSeries');
            if(elPerc2) elPerc2.innerText = tEras > 0 ? `${((tipo2/tEras)*100).toFixed(2).replace('.', ',')}%` : '0%';

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

            document.getElementById('retroBacklogTotal').innerText = getFilteredGamesForStats().filter(g => (g.status||'').toLowerCase() === 'watchlist').length;
        }
let timelineViewMode = 'vertical'; // Estado inicial

function setTimelineViewMode(mode) {
    if (timelineViewMode === mode) return; // Não faz nada se já estiver no mesmo modo
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
    
    // Atualiza a renderização com o novo layout
    renderTimeline(document.getElementById('timelineYearSelect').value);
}

        function renderTimeline(ano) {
    const container = document.getElementById('timelineContent');
    
    // Usa a função de filtro para respeitar se o usuário está vendo Filmes ou Animes
    let validGames = getFilteredGamesForStats().filter(g => g.startDate);
    
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

    let html = '';

    // DEFINE OS TAMANHOS DINAMICAMENTE (Menor no modo Horizontal)
    const isHorizontal = timelineViewMode === 'horizontal';
    const cardWidth = isHorizontal ? 'w-28' : 'w-36';
    const posterHeight = isHorizontal ? 'h-40' : 'h-48';
    const titleSize = isHorizontal ? 'text-[9px]' : 'text-[10px]';

    // ESTRUTURA BASE DO CONTÊINER
    if (!isHorizontal) {
        html = '<div class="absolute left-4 md:left-[39px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500/80 to-transparent z-0"></div>';
    } else {
        html = `<div class="relative flex overflow-x-auto custom-scroll gap-12 pb-12 pt-8 px-4 items-start w-full min-h-[450px]">
                    <!-- Linha Mestra Horizontal -->
                    <div class="absolute left-0 right-0 top-[60px] h-0.5 bg-gradient-to-r from-indigo-500/80 to-transparent z-0"></div>`;
    }
    
    sortedKeys.forEach(key => {
        const [y, m] = key.split('-');
        const monthName = monthNames[parseInt(m) - 1];
        const label = ano === 'all' ? `${monthName} de ${y}` : monthName;
        
        const items = grouped[key].sort((a,b) => b.startDate.localeCompare(a.startDate));

        // === LÓGICA DE FILEIRAS DINÂMICAS ===
        // Divide o total de obras por 5 para saber quantas fileiras precisa. 
        // Ex: 3 obras = 1 fileira | 10 obras = 2 fileiras
        let rowCount = Math.ceil(items.length / 5);
        if (rowCount > 2) rowCount = 2; // Limita a no máximo 3 fileiras para não "estourar" a altura da tela
        if (rowCount < 1) rowCount = 1; 
        const gridRowsClass = `grid-rows-${rowCount}`;

        // CRIAÇÃO DOS CARDS
        let cardsHtml = items.map(g => {
            let epProg = '';
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

        // INJEÇÃO DA ESTRUTURA DE ACORDO COM O MODO
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
                        <!-- Ponto na linha centralizado com o Mês -->
                        <div class="absolute top-[50px] left-8 -translate-y-1/2 w-4 h-4 rounded-full bg-indigo-500 border-4 border-[var(--bg)] shadow-[0_0_15px_rgba(99,102,241,0.8)] z-20"></div>
                        <!-- Linha de conexão que desce até os cards -->
                        <div class="absolute top-[50px] left-[35px] w-0.5 h-[30px] bg-indigo-500/50 z-10"></div>
                    </div>
                    
                    <!-- GRID COM CLASSE DINÂMICA (gridRowsClass) -->
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

        // ================= CONQUISTAS RESTAURADAS E ATUALIZADAS =================
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
            
            let globalMinutes = listToEvaluate.reduce((acc, g) => {
    if ((g.status || 'watchlist').toLowerCase() === 'watchlist') return acc;
    return acc + calculateItemTotalMinutes(g);
}, 0);
            let totalH = Math.floor(globalMinutes / 60);

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

            let badgesData = [];

            if (statsMediaType === 'filmes') {
                const fVistos = listToEvaluate.filter(x => (x.status||'').toLowerCase() === 'visto' && ['filme'].includes((x.type||'').toLowerCase())).length;
                const sVistos = listToEvaluate.filter(x => (x.status||'').toLowerCase() === 'visto' && ['série'].includes((x.type||'').toLowerCase())).length;

                badgesData = [
                    // GERAIS (16)
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

                    // FILMES - QUANTIDADE (7)
                    { diff: 'facil', name: 'Primeira Sessão', icon: '🎬', req: '1 Filme Visto', unlocked: fVistos >= 1 },
                    { diff: 'facil', name: 'Sessão da Tarde', icon: '📺', req: '10 Filmes Vistos', unlocked: fVistos >= 10 },
                    { diff: 'medio', name: 'Cartão Fidelidade', icon: '🎫', req: '25 Filmes Vistos', unlocked: fVistos >= 25 },
                    { diff: 'medio', name: 'Academia Meu Tv Time', icon: '🏆', req: '50 Filmes Vistos', unlocked: fVistos >= 50 },
                    { diff: 'dificil', name: 'Crítico de Ouro', icon: '🧐', req: '100 Filmes Vistos', unlocked: fVistos >= 100 },
                    { diff: 'dificil', name: 'Diretor Honorário', icon: '🎥', req: '250 Filmes Vistos', unlocked: fVistos >= 250 },
                    { diff: 'ultra', name: 'Lenda de Hollywood', icon: '⭐', req: '500 Filmes Vistos', unlocked: fVistos >= 500 },

                    // FILMES - GÊNEROS (21)
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

                    // FILMES - DÉCADAS & OUTROS (9)
                    { diff: 'medio', name: 'Clássicos 70s', icon: '🪩', req: '5 Filmes dos Anos 70', unlocked: listToEvaluate.filter(x=>(x.status||'').toLowerCase() === 'visto' && (x.type||'').toLowerCase() === 'filme' && parseInt(x.releaseYear)>=1970 && parseInt(x.releaseYear)<=1979).length >= 5 },
                    { diff: 'medio', name: 'Anos Dourados', icon: '📻', req: '5 Filmes dos Anos 80', unlocked: listToEvaluate.filter(x=>(x.status||'').toLowerCase() === 'visto' && (x.type||'').toLowerCase() === 'filme' && parseInt(x.releaseYear)>=1980 && parseInt(x.releaseYear)<=1989).length >= 5 },
                    { diff: 'medio', name: 'Nostalgia 90s', icon: '📼', req: '10 Filmes dos Anos 90', unlocked: listToEvaluate.filter(x=>(x.status||'').toLowerCase() === 'visto' && (x.type||'').toLowerCase() === 'filme' && parseInt(x.releaseYear)>=1990 && parseInt(x.releaseYear)<=1999).length >= 10 },
                    { diff: 'facil', name: 'Anos 2000', icon: '💿', req: '10 Filmes dos Anos 00', unlocked: listToEvaluate.filter(x=>(x.status||'').toLowerCase() === 'visto' && (x.type||'').toLowerCase() === 'filme' && parseInt(x.releaseYear)>=2000 && parseInt(x.releaseYear)<=2009).length >= 10 },
                    { diff: 'facil', name: 'Obra-Prima', icon: '👑', req: '1 Filme Nota 5', unlocked: cRate('filme', 5) >= 1 },
                    { diff: 'medio', name: 'Gosto Exigente', icon: '💎', req: '10 Filmes Nota 5', unlocked: cRate('filme', 5) >= 10 },
                    { diff: 'facil', name: 'Decepção', icon: '🗑️', req: '1 Filme Nota 1', unlocked: cRate('filme', 1) >= 1 },
                    { diff: 'medio', name: 'Cinemateca', icon: '🎞️', req: '5 Filmes Favoritos', unlocked: cFav('filme') >= 5 },
                    { diff: 'dificil', name: 'Hall da Fama', icon: '🖼️', req: '15 Filmes Favoritos', unlocked: cFav('filme') >= 15 },

                    // SÉRIES - QUANTIDADE E STATUS (14)
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

                    // SÉRIES - GÊNEROS (20)
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

                    // SÉRIES - EPISÓDIOS E OUTROS (13)
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
            } else {
                const animes = listToEvaluate.filter(g => (g.type || 'Anime') === 'Anime');
                const desenhos = listToEvaluate.filter(g => (g.type || '') === 'Desenho');
                const filmes = listToEvaluate.filter(g => (g.type || '') === 'Filme OVA');

                badgesData = [
                    // ANIMES - GERAL & STATUS (19)
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

                    // ANIMES - GÊNEROS (21)
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

                    // ANIMES - TEMPO, EPS, FILMES & DÉCADAS (20)
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

                    // DESENHOS - GERAL E STATUS (15)
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

                    // DESENHOS - GÊNEROS E OUTROS (25)
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
            }

            const unlockedCount = badgesData.filter(b => b.unlocked).length;
            const bUnlLabel = document.getElementById('badgesUnlockedCount');
            if(bUnlLabel) bUnlLabel.innerText = unlockedCount;
            const bProg = document.getElementById('badgesProgressBar');
            if(bProg) bProg.style.width = `${(unlockedCount / badgesData.length) * 100}%`;

            let filteredBadges = badgesData;
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

            const grid = document.getElementById('badgesModalGrid');
            if(grid) {
                grid.innerHTML = filteredBadges.map(b => {
                    const colorClasses = b.unlocked ? getColor(b.diff) : 'grayscale opacity-30 border-[var(--border)]';
                    return `
                    <div class="flex flex-col items-center justify-center p-3 rounded-xl bg-[var(--input)] border-2 transition-all duration-300 ${colorClasses} hover:scale-105 cursor-help text-center h-28 w-full relative overflow-hidden" title="Requisito: ${b.req}">
                        ${b.unlocked ? `<div class="absolute -top-1 -right-1 w-6 h-6 bg-current opacity-20 rounded-bl-full"></div>` : ''}
                        <span class="text-[7px] font-black uppercase mb-1 opacity-70 tracking-widest">${getLabel(b.diff)}</span>
                        <span class="text-3xl mb-1.5 drop-shadow-md filter ${!b.unlocked ? 'grayscale' : ''}">${b.icon}</span>
                        <span class="text-[10px] font-black uppercase leading-tight line-clamp-2 w-full px-1 ${b.unlocked ? 'text-[var(--text-main)]' : 'text-[var(--text-dim)]'}">${b.name}</span>
                    </div>
                `}).join('') || '<p class="col-span-full text-center py-10 opacity-50 font-bold text-lg uppercase tracking-widest">Nenhuma conquista encontrada neste filtro.</p>';
            }
        }
 /* === ASSISTIR A SEGUIR (WATCH NEXT) - DINÂMICO === */
let assistirFiltroAtual = 'all';

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
    
    // Atualiza o visual dos botões
    const buttons = document.querySelectorAll('.assistir-filter-btn');
    buttons.forEach(btn => {
        btn.classList.remove('border-blue-500', 'text-blue-500', 'shadow-[0_0_10px_rgba(59,130,246,0.4)]', 'bg-blue-500/10', 'active');
        btn.classList.add('border-[var(--border)]', 'text-[var(--text-dim)]');
    });
    
    if(btnElement) {
        btnElement.classList.remove('border-[var(--border)]', 'text-[var(--text-dim)]');
        btnElement.classList.add('border-blue-500', 'text-blue-500', 'shadow-[0_0_10px_rgba(59,130,246,0.4)]', 'bg-blue-500/10', 'active');
    }
    
    // Recarrega a lista
    renderAssistirASeguir();
}

// Função que adiciona +1 episódio e imediatamente recarrega a lista
async function addOneEpisodeFromAssistir(id) {
    await addOneEpisode(id);
    renderAssistirASeguir();
}

function renderAssistirASeguir() {
    const listContainer = document.getElementById('assistirASeguirList');
    const searchQuery = (document.getElementById('assistirSearchInput')?.value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Pega tanto as obras Assistindo quanto as já Vistas
    let obras = games.filter(g => 
        ['Assistindo', 'Visto'].includes(g.status || 'Watchlist') && 
        ['Série', 'Anime', 'Desenho'].includes(g.type)
    );

    // APLICA O FILTRO ATUAL DOS PILLS
    if (assistirFiltroAtual !== 'all') {
        obras = obras.filter(g => g.type === assistirFiltroAtual);
    }
    
    // APLICA O FILTRO DA BUSCA
    if (searchQuery) {
        obras = obras.filter(g => (g.name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(searchQuery));
    }

    const emAndamento = [];
    const emDia = [];

    // Separa: Se o status for Visto OU se já viu tudo que lançou (epWatched >= epTotal), vai pros Assistidos
    obras.forEach(g => {
        const watched = parseInt(g.epWatched) || 0;
        const total = parseInt(g.epTotal) || 0;
        
        if (g.status === 'Visto' || (total > 0 && watched >= total)) {
            emDia.push(g);
        } else {
            emAndamento.push(g);
        }
    });

    // Ordenação Mágica: Ordena pela última vez assistido
    const sortByUpdate = (a, b) => {
        const timeA = a.lastUpdate || 0;
        const timeB = b.lastUpdate || 0;
        return timeB - timeA; 
    };

    emAndamento.sort(sortByUpdate);
    emDia.sort(sortByUpdate);

    // Construtor do HTML do Card
    const generateItemHTML = (g) => {
        const watched = parseInt(g.epWatched) || 0;
        const total = parseInt(g.epTotal) || 0;
        const percent = total > 0 ? Math.round((watched / total) * 100) : 0;
        const barColor = percent >= 100 ? 'bg-[var(--green)] shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-[var(--accent)] shadow-[0_0_8px_var(--accent-glow)]';

        return `
        <div class="flex items-center bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 gap-4 shadow-[0_10px_20px_var(--shadow-med)] hover:border-[var(--accent)] hover:-translate-y-1 transition-all duration-300 mb-4">
            <div class="w-[80px] h-[120px] sm:w-[100px] sm:h-[150px] flex-shrink-0 rounded-lg overflow-hidden bg-[var(--input)] border border-[var(--border)] shadow-md cursor-pointer relative group" onclick="openDetails('${g.id}')">
                <img src="${g.cover}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onerror="this.src='https://via.placeholder.com/150x225?text=Capa'">
            </div>
            <div class="flex-1 flex flex-col justify-center min-w-0 py-2">
                <span class="text-[9px] font-black uppercase tracking-widest type-${g.type.toLowerCase().replace(' ', '-')} mb-1 w-max px-2 py-0.5 rounded bg-[var(--input)] border border-[var(--border)] shadow-inner">${g.type}</span>
                <h3 class="text-base sm:text-lg font-black uppercase truncate mb-3 cursor-pointer hover:text-[var(--accent)] transition-colors" style="color: var(--text-main);" title="${g.name}" onclick="openDetails('${g.id}')">${g.name}</h3>
                <div class="w-full bg-[var(--input)] rounded-full h-2.5 sm:h-3 border border-[var(--border)] relative overflow-hidden shadow-inner">
                    <div class="h-full ${barColor} transition-all duration-700" style="width: ${percent}%"></div>
                </div>
                <div class="flex justify-between items-center mt-2">
                    <div class="text-[10px] sm:text-[11px] font-bold text-[var(--text-dim)] uppercase tracking-widest">
                        Eps: <span class="font-black text-[12px] ml-1 drop-shadow-md" style="color: var(--text-main);">${watched}</span> <span class="opacity-50 mx-1">/</span> ${total || '?'}
                    </div>
                    <span class="text-[10px] font-black" style="color: var(--text-main);">${percent}%</span>
                </div>
            </div>
            <div class="flex-shrink-0 ml-2">
                <button onclick="addOneEpisodeFromAssistir('${g.id}')" class="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-[3px] border-[var(--accent)] bg-[var(--surface)] flex items-center justify-center text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[#FFFFFF] transition-all duration-300 shadow-[0_0_15px_var(--accent-glow)] group" title="Marcar +1 Episódio">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" class="group-hover:scale-110 transition-transform"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
            </div>
        </div>
        `;
    };

    let html = '';

    if (emAndamento.length === 0 && emDia.length === 0) {
        html = `
            <div class="text-center py-16 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-inner">
                <p class="opacity-40 font-black uppercase tracking-widest text-[12px] text-[var(--text-main)]">Nenhuma obra encontrada para o filtro atual.</p>
            </div>`;
    } else {
        
        // 1. OBRAS EM DIA (OCULTAS NO TOPO)
        if (emDia.length > 0) {
            html += `
            <div class="mb-8 pb-6 border-b border-[var(--border)] flex flex-col items-center">
                <button id="btnToggleAssistidos" onclick="toggleAssistidos()" class="btn btn-outline border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text-main)] hover:border-[var(--text-main)] px-6 py-2 text-[10px] uppercase tracking-widest font-black shadow-lg">
                    Mostrar Obras em Dia 🔽
                </button>
                
                <div id="assistirASeguirEmDia" class="hidden flex flex-col w-full mt-6">
                    ${emDia.map(generateItemHTML).join('')}
                </div>
            </div>
            `;
        }

        // 2. OBRAS PENDENTES (EM ANDAMENTO)
        if (emAndamento.length > 0) {
            html += emAndamento.map(generateItemHTML).join('');
        } else {
            html += `
            <div class="text-center py-8 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-inner mb-4">
                <p class="opacity-40 font-black uppercase tracking-widest text-[11px] text-[var(--text-main)]">Você está em dia com tudo nesta categoria!</p>
            </div>`;
        }
    }

    listContainer.innerHTML = html;
}
  let tempSeasonDates = [];

        function addSeasonDateUI() {
            const input = document.getElementById('seasonDateInput');
            const date = input.value;
            if (date && !tempSeasonDates.includes(date)) {
                tempSeasonDates.push(date);
                // Ordena do lançamento mais antigo para o mais novo
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
            container.innerHTML = tempSeasonDates.map((d, index) => `
                <div class="flex items-center gap-2 text-[10px] font-bold bg-[var(--surface)] border border-[var(--border)] text-[var(--text-main)] px-2 py-1.5 rounded-lg shadow-sm">
                    <span class="text-[var(--accent)] font-black uppercase">S${index + 1}</span>
                    <span>${d.split('-').reverse().join('/')}</span>
                    <button type="button" onclick="removeSeasonDateUI('${d}')" class="text-red-500 hover:text-red-400 ml-1 text-xs" title="Remover Temporada">✖</button>
                </div>
            `).join('');
        }
let targetListRef = null; // 'death', 'series' ou 'malucos'

function openQuickPicker(listType) {
    targetListRef = listType;
    document.getElementById('quickPickerModal').style.display = 'flex';
    renderQuickPicker();
}

function renderQuickPicker() {
    const query = document.getElementById('quickPickerSearch').value.toLowerCase();
    const grid = document.getElementById('quickPickerGrid');
    grid.innerHTML = games.filter(g => g.name.toLowerCase().includes(query)).map(g => `
        <div onclick="addToList('${g.id}', '${g.name}', '${g.cover}')" class="poster-card-sm aspect-[2/3] cursor-pointer hover:scale-105 transition-transform border border-[var(--border)]">
            <img src="${g.cover}" class="main-cover" onerror="this.src='https://via.placeholder.com/150x225?text=Capa'">
        </div>
    `).join('');
}

async function addToList(id, name, cover) {
    let list = (targetListRef === 'death') ? deathListData : (targetListRef === 'series' ? seriesListData : malucosListData);
    let key = (targetListRef === 'death') ? 'cineDeathList_v70' : (targetListRef === 'series' ? 'cineSeriesList_v70' : 'cineMalucosList_v70');
    
    // CORREÇÃO AQUI: Agora ele só pega o slot se o nome E a capa estiverem vazios
    let emptyIndex = list.findIndex(item => (!item.name || item.name === '') && (!item.cover || item.cover === ''));
    
    if (emptyIndex !== -1) {
        list[emptyIndex] = { cover: cover, name: name, rating: 0 };
        await localforage.setItem(key, list);
        alert(`${name} adicionado à lista!`);
        document.getElementById('quickPickerModal').style.display = 'none';
        
        // Atualiza a visualização se o modal da lista estiver aberto
        if(targetListRef === 'death') openDeathList();
        else if(targetListRef === 'series') openSeriesList();
        else openMalucosList();
    } else {
        alert("Lista cheia! Não há mais slots completamente vazios (sem capa e sem nome).");
    }
}
// =========================================================
// CONTROLE DE TEMPORADAS E EPISÓDIOS ESTÁTICOS (SEM API)
// =========================================================

// Expande ou retrai a temporada selecionada
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

// Marca/Desmarca um episódio específico
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

    // NOVA CHAMADA AQUI
    updateAutoStatus(g);

    await manualSave();
    
    updateStaticSeasonCounterUI(gameId, seasonNum);
    updateGlobalCounterUI(g);
}

// Marca/Desmarca a temporada inteira no botão pai
async function markStaticSeasonWatched(gameId, seasonNum, totalEps) {
    const g = games.find(x => x.id === gameId);
    if (!g) return;
    if (!g.watchedEpisodes) g.watchedEpisodes = [];

    const sPrefix = `S${seasonNum}E`;
    const epsVistos = g.watchedEpisodes.filter(e => e.startsWith(sPrefix)).length;
    
    let addedCount = 0;
    let removedCount = 0;
    
    if (epsVistos === totalEps) {
        g.watchedEpisodes = g.watchedEpisodes.filter(e => !e.startsWith(sPrefix));
        removedCount = totalEps;
    } else {
        for(let i=1; i<=totalEps; i++) {
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

    // NOVA CHAMADA AQUI
    updateAutoStatus(g);

    await manualSave();
    
    // Atualiza os estilos visuais de todos os episódios contidos nessa temporada
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

// Atualiza o textinho de progresso "12/24" da temporada
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

// Sincroniza a barra de progresso principal lá no topo
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
   /* ==================================================== */
        /* ANÁLISE COMPORTAMENTAL SUPREMA (COM PREVISÃO E PIZZAS) */
        /* ==================================================== */
        function openEstatisticasGerais() {
            const yearsPlayed = [...new Set(games.flatMap(g => [g.startDate?.split('-')[0]].filter(Boolean)))].sort((a,b) => b-a);
            const select = document.getElementById('egYearSelect');
            select.innerHTML = '<option value="all">Todo o Período</option>' + yearsPlayed.map(y => `<option value="${y}">${y}</option>`).join('');
            select.value = 'all';

            renderEstatisticasGerais('all');
            document.getElementById('estatisticasGeraisModal').style.display = 'flex';
        }

        function closeEstatisticasGerais() {
            document.getElementById('estatisticasGeraisModal').style.display = 'none';
        }

        // Função auxiliar para gerar gráficos de Pizza Nativos
        function renderGenericPieChart(dataObj, chartId, legendId, colors) {
            const total = Object.values(dataObj).reduce((a, b) => a + b, 0);
            const chart = document.getElementById(chartId);
            const legend = document.getElementById(legendId);
            
            if (total === 0) {
                chart.style.background = '#374151'; // Cinza escuro
                legend.innerHTML = '<p class="opacity-30 text-[10px] text-center uppercase">Sem Dados</p>';
                return;
            }

            let degAcc = 0;
            let gradientStr = [];
            let legendHTML = '';

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
            const list = ano === 'all' 
                ? games 
                : games.filter(g => g.startDate && g.startDate.startsWith(ano));

            if (list.length === 0 && ano !== 'all') {
                alert("Nenhuma obra iniciada neste ano!");
                document.getElementById('egYearSelect').value = 'all';
                return renderEstatisticasGerais('all');
            }

            // 1. TEMPO DE VIDA ABSOLUTO (ANOS, MESES, DIAS)
            let totalM = list.reduce((acc, g) => acc + calculateItemTotalMinutes(g), 0);
            let totalH = Math.floor(totalM / 60);
            const totalDiasT = Math.floor(totalH / 24);
            const anosV = Math.floor(totalDiasT / 365);
            const mesesV = Math.floor((totalDiasT % 365) / 30);
            const diasV = (totalDiasT % 365) % 30;

            let strTempo = '';
            if (anosV > 0) strTempo += `<span><span class="text-teal-400">${anosV}</span> Ano${anosV>1?'s':''}</span>`;
            if (mesesV > 0) strTempo += `<span><span class="text-blue-400">${mesesV}</span> Mês${mesesV>1?'es':''}</span>`;
            strTempo += `<span><span class="text-teal-400">${diasV}</span> Dia${diasV!==1?'s':''}</span>`;
            
            if(totalM === 0) strTempo = '<span class="text-[var(--text-dim)]">0 Dias</span>';
            document.getElementById('egTempoVida').innerHTML = strTempo;

            // 2. TOTAL DE EPISÓDIOS DA BIBLIOTECA
            const totalEps = list.reduce((acc, g) => acc + (parseInt(g.epWatched) || 0), 0);
            document.getElementById('egTotalEps').innerText = totalEps;

            // 3. TEMPO PARA ZERAR A BIBLIOTECA (Watchlist + Andamento)
            let minRestantes = 0;
            list.forEach(g => {
                const status = (g.status || '').toLowerCase();
                if (status === 'visto' || status === 'abandonado') return; // Já foi

                const isFilme = ['Filme', 'Filme OVA'].includes(g.type || 'Filme');
                if (isFilme) {
                    minRestantes += ((parseInt(g.hours)||0)*60 + (parseInt(g.minutes)||0));
                } else {
                    const epTotais = parseInt(g.epTotal) || parseInt(g.epWatched) || 0; // Se não tem total, assume o visto para dar 0
                    const epVistos = parseInt(g.epWatched) || 0;
                    const epFaltam = Math.max(0, epTotais - epVistos);
                    // Usa a duração cadastrada, se não tiver, assume média de 24min por ep para animes/séries
                    const duracaoEp = ((parseInt(g.hours)||0)*60 + (parseInt(g.minutes)||0)) || 24; 
                    minRestantes += (epFaltam * duracaoEp);
                }
            });

            const horasRestantes = Math.floor(minRestantes / 60);
            const diasRestantes = Math.floor(horasRestantes / 24);
            const mesesRestantes = Math.floor(diasRestantes / 30);
            const diasSobraRestantes = diasRestantes % 30;

            let strRestante = '';
            if (mesesRestantes > 0) strRestante += `<span><span class="text-white">${mesesRestantes}</span> Meses</span> e `;
            if (diasSobraRestantes > 0 || mesesRestantes === 0) strRestante += `<span><span class="text-white">${diasSobraRestantes}</span> Dias</span>`;
            if (minRestantes === 0) strRestante = '<span class="text-[var(--text-dim)] opacity-50">Tudo Zerado! 🎉</span>';
            
            document.getElementById('egTempoRestante').innerHTML = strRestante;

            // 4. PERFIL BÁSICO
            const concluidos = list.filter(g => (g.status||'').toLowerCase() === 'visto').length;
            const abandonados = list.filter(g => (g.status||'').toLowerCase() === 'abandonado').length;
            const taxaConclusao = list.length > 0 ? ((concluidos / list.length) * 100).toFixed(1) : 0;
            const taxaAbandono = list.length > 0 ? ((abandonados / list.length) * 100).toFixed(1) : 0;
            const rewatch = list.filter(g => (g.watchCount || 1) > 1).length;

            document.getElementById('egTaxaConclusao').innerText = `${taxaConclusao.toString().replace('.', ',')}%`;
            document.getElementById('egTaxaAbandono').innerText = `${taxaAbandono.toString().replace('.', ',')}%`;
            document.getElementById('egFatorReplay').innerText = rewatch;

            const filmesVistos = list.filter(g => ['Filme', 'Filme OVA'].includes(g.type || 'Filme') && (g.status||'').toLowerCase() === 'visto');
            let totalMinFilmes = filmesVistos.reduce((acc, g) => acc + ((parseInt(g.hours)||0)*60 + (parseInt(g.minutes)||0)), 0);
            let mediaMinFilmes = filmesVistos.length > 0 ? Math.floor(totalMinFilmes / filmesVistos.length) : 0;
            document.getElementById('egMediaFilmes').innerText = mediaMinFilmes > 0 ? `${Math.floor(mediaMinFilmes/60)}h ${mediaMinFilmes%60}m` : '---';

            const uniqueGens = new Set();
            list.forEach(g => { if(g.genre) g.genre.split(/[,/|-]+/).forEach(s => uniqueGens.add(s.trim().toUpperCase())); });
            uniqueGens.delete('');
            document.getElementById('egGenerosExplorados').innerText = uniqueGens.size;

            // 5. GRÁFICO DE COLUNAS: ATIVIDADE POR MÊS
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
                        <span class="text-[9px] font-black text-teal-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md">${qtd}</span>
                        <div class="w-full max-w-[24px] bg-gradient-to-t from-teal-700 to-teal-400 rounded-t-md shadow-[0_0_10px_rgba(45,212,191,0.3)] transition-all duration-1000 ease-out" style="height: 0%;" data-target-height="${hPerc}%"></div>
                        <span class="text-[8px] sm:text-[9px] font-black uppercase text-[var(--text-dim)] mt-2">${mesesNomes[i]}</span>
                    </div>
                `;
            }).join('');

            setTimeout(() => {
                document.querySelectorAll('#egColChart > div > div').forEach(bar => { bar.style.height = bar.getAttribute('data-target-height'); });
            }, 100);

            // 6. GRÁFICO DE PIZZA: STATUS
            const stColors = ['#10B981', '#3B82F6', '#EF4444', '#4B5563']; // Verde, Azul, Vermelho, Cinza
            const stData = {
                'Vistos': list.filter(g => (g.status||'').toLowerCase() === 'visto').length,
                'Assistindo': list.filter(g => (g.status||'').toLowerCase() === 'assistindo').length,
                'Abandonados': list.filter(g => (g.status||'').toLowerCase() === 'abandonado').length,
                'Watchlist': list.filter(g => (g.status||'').toLowerCase() === 'watchlist').length
            };
            renderGenericPieChart(stData, 'egPieChart', 'egPieLegend', stColors);

            // 7. GRÁFICO DE PIZZA: GÊNEROS MAIS ASSISTIDOS (Apenas o 1º item ANTES da vírgula)
            const genCount = {};
            list.forEach(g => {
                if(g.genre) {
                    // Pega apenas a primeira palavra antes da vírgula
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
            
            const pieColors = ['#F43F5E', '#8B5CF6', '#06B6D4', '#F59E0B', '#6B7280']; // Rosa, Roxo, Ciano, Laranja, Cinza
            renderGenericPieChart(genDataToRender, 'egGenrePieChart', 'egGenrePieLegend', pieColors);

            // 8. GRÁFICO DE PIZZA: SUBGÊNEROS/TAGS MAIS ASSISTIDOS (Tudo DEPOIS da vírgula)
            const subCount = {};
            list.forEach(g => {
                if(g.genre && g.genre.includes(',')) {
                    // Divide o texto por vírgulas
                    const parts = g.genre.split(',');
                    // Ignora o primeiro item [0] e contabiliza apenas o resto
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
            
            // Paleta invertida para os subgêneros
            const subColors = ['#0EA5E9', '#10B981', '#F97316', '#D946EF', '#6B7280']; 
            renderGenericPieChart(subDataToRender, 'egSubPieChart', 'egSubPieLegend', subColors);

            // 9. VERSUS LA vs ANIM E CLÁSSICOS vs MODERNOS
            const la = list.filter(g => ['Filme', 'Série'].includes(g.type || 'Filme')).length;
            const anim = list.filter(g => ['Anime', 'Desenho', 'Filme OVA'].includes(g.type || 'Filme')).length;
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

            // 10. CURIOSIDADES EXTRAS (Ajustado para focar no Gênero Principal)
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
// Dentro de renderEstatisticasGerais(ano):
const filteredForStats = ano === 'all' 
    ? games 
    : games.filter(g => g.startDate && g.startDate.startsWith(ano));

updateDirectorAndStudioStats(filteredForStats);
        }
// Funções para alternar por CLIQUE (e fechar ao clicar fora)
    function toggleDropdown(event) {
        event.stopPropagation();
        const container = event.currentTarget.closest('.dropdown-container');
        const menu = container.querySelector('.dropdown-menu');
        
        // Fecha todos os outros menus abertos
        document.querySelectorAll('.dropdown-menu').forEach(m => {
            if (m !== menu) m.classList.add('hidden');
        });
        
        // Alterna o atual
        menu.classList.toggle('hidden');
    }

    function closeAllDropdowns() {
        document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.add('hidden'));
    }

    // Fecha os menus se o usuário clicar em qualquer outro lugar da tela
    window.addEventListener('click', () => {
        closeAllDropdowns();
    });

// ====================================================
// BOOT INTELIGENTE E RECARREGAMENTO (PWA)
// ====================================================

let isPwaBooted = false;

async function bootApp() {
    if (isPwaBooted) return;
    
    // 1. Carrega todos os dados do banco de dados local
    await initApp();
    
    // 2. Verifica se você já tem filmes/séries/listas salvos
    const hasData = games.length > 0 || customListas.length > 0 || franquiasData.length > 0 || deathListData.some(d => d.name !== '') || seriesListData.some(d => d.name !== '') || malucosListData.some(d => d.name !== '');
    
    // 3. Se já tiver dados, ele PULA a tela inicial automaticamente!
    if (hasData) {
        enterApp();
    }
    
    isPwaBooted = true;
}

// Executa o Boot assim que o arquivo é aberto
bootApp();

// Atualiza silenciosamente quando o app volta do segundo plano
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        
        // Só atualiza os dados se o app já estiver aberto e pulado a tela de inicio
        if (isStandalone && isPwaBooted) {
            initApp(); 
        }
    }
});
// ==========================================
        // PROCESSAMENTO DE DIRETORES E ESTÚDIOS (BLOCO 6)
        // ==========================================
        function processEntityStats(list, key) {
            const map = {};

            list.forEach(g => {
                const rawValue = g[key];
                if (!rawValue || rawValue.trim() === '') return;

                // Separa múltiplos estúdios/diretores por vírgula, barra ou ponto e vírgula
                const parts = rawValue.split(/[,/;|]+/).map(s => s.trim()).filter(Boolean);
                const mins = calculateItemTotalMinutes(g);
                const rating = parseFloat(g.rating || 0);
                const isFav = !!g.isFavorite;

                parts.forEach(name => {
                    const normalizedKey = name.toUpperCase();
                    if (!map[normalizedKey]) {
                        map[normalizedKey] = { name, count: 0, time: 0, ratings: [], favorites: 0 };
                    }
                    map[normalizedKey].count += 1;
                    map[normalizedKey].time += mins;
                    if (rating > 0) map[normalizedKey].ratings.push(rating);
                    if (isFav) map[normalizedKey].favorites += 1;
                });
            });

            const items = Object.values(map);
            items.forEach(item => {
                item.avgRating = item.ratings.length ? (item.ratings.reduce((a, b) => a + b, 0) / item.ratings.length) : 0;
            });

            const topWatched = [...items].sort((a, b) => b.count - a.count || b.time - a.time);
            const topFavorite = [...items].sort((a, b) => {
                if (b.favorites !== a.favorites) return b.favorites - a.favorites;
                if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
                return b.count - a.count;
            });

            return {
                top5: topWatched.slice(0, 5),
                mostWatched: topWatched[0] || null,
                favorite: topFavorite[0] || null
            };
        }

        function updateDirectorAndStudioStats(filteredGames) {
            const dirStats = processEntityStats(filteredGames, 'director');
            const stdStats = processEntityStats(filteredGames, 'studio');

            // --- DIRETORES ---
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

            // --- ESTÚDIOS ---
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
// ==========================================
// INTEGRAÇÃO TMDB API
// ==========================================

// Função para Salvar a Chave da API
async function configurarTMDB() {
    const currentKey = await localforage.getItem('tmdb_api_key') || '';
    const key = prompt("Insira sua chave de API do TMDB (v3 auth):", currentKey);
    
    if (key !== null) { // Se não clicou em Cancelar
        await localforage.setItem('tmdb_api_key', key.trim());
        alert("Chave TMDB salva com sucesso no seu navegador!");
    }
}

// Função para buscar os dados na API
async function buscarTMDB() {
    const apiKey = await localforage.getItem('tmdb_api_key');
    if (!apiKey) {
        alert("Chave TMDB não encontrada! Vá em '⚙️ Sistema > 🔑 Configurar API TMDB' e adicione sua chave.");
        return;
    }

    const titulo = document.getElementById('gameName').value.trim();
    if (!titulo) {
        alert("Por favor, digite o título da obra no campo antes de buscar.");
        return;
    }

    const btnBusca = document.querySelector('button[onclick="buscarTMDB()"]');
    const textoOriginal = btnBusca.innerText;
    btnBusca.innerText = "Buscando...";
    btnBusca.disabled = true;

    // Define se busca filme ou série dependendo do formato selecionado no select
    const tipoApp = document.getElementById('gameType').value;
    const isMovie = ['Filme', 'Filme OVA'].includes(tipoApp);
    const tmdbType = isMovie ? 'movie' : 'tv';

    try {
        // 1. Procura pela obra usando query
        const searchRes = await fetch(`https://api.themoviedb.org/3/search/${tmdbType}?api_key=${apiKey}&query=${encodeURIComponent(titulo)}&language=pt-BR`);
        const searchData = await searchRes.json();

        if (!searchData.results || searchData.results.length === 0) {
            alert(`Nenhuma obra encontrada com o título "${titulo}" no formato selecionado.`);
            btnBusca.innerText = textoOriginal;
            btnBusca.disabled = false;
            return;
        }

        // Pega o ID do primeiro resultado relevante
        const tmdbId = searchData.results[0].id;

        // 2. Faz uma segunda chamada puxando os detalhes completos e a equipe (credits)
        const detailsRes = await fetch(`https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?api_key=${apiKey}&language=pt-BR&append_to_response=credits`);
        const data = await detailsRes.json();

        // --- PREENCHENDO OS CAMPOS ---
        
        // Poster URL
        if (data.poster_path) {
            document.getElementById('gameCover').value = `https://image.tmdb.org/t/p/original${data.poster_path}`;
        }

        // Título exato
        document.getElementById('gameName').value = data.title || data.name || titulo;

        // Gênero e Subgênero (Separados por vírgula)
        if (data.genres && data.genres.length > 0) {
            document.getElementById('gameGenre').value = data.genres.map(g => g.name).join(', ');
        }

        // Ano de Lançamento
        const dataLancamento = data.release_date || data.first_air_date || '';
        if (dataLancamento) {
            document.getElementById('gameReleaseYear').value = dataLancamento.split('-')[0];
        }

        // Estúdio
        if (data.production_companies && data.production_companies.length > 0) {
            document.getElementById('gameStudio').value = data.production_companies[0].name;
        }

        // Diretor
        if (isMovie && data.credits && data.credits.crew) {
            const diretorObj = data.credits.crew.find(c => c.job === 'Director');
            if (diretorObj) document.getElementById('gameDirector').value = diretorObj.name;
        } else if (!isMovie && data.created_by && data.created_by.length > 0) {
            // Em séries (TV), usamos quem criou a obra
            document.getElementById('gameDirector').value = data.created_by.map(c => c.name).join(', ');
        }

        // --- CORREÇÃO APLICADA AQUI: Duração Total / Média por Episódio ---
        let runtimeMinutos = 0;

        if (isMovie && data.runtime) {
            runtimeMinutos = data.runtime; // Filmes possuem runtime exato
        } else if (!isMovie) {
            if (data.episode_run_time && data.episode_run_time.length > 0) {
                runtimeMinutos = data.episode_run_time[0];
            } else if (data.last_episode_to_air && data.last_episode_to_air.runtime) {
                runtimeMinutos = data.last_episode_to_air.runtime;
            } else if (data.runtime) {
                runtimeMinutos = data.runtime;
            }
        }

        // Converte para inteiro de forma segura
        runtimeMinutos = parseInt(runtimeMinutos) || 0;

        // Fallback de segurança: Se for Série/Anime e vier zerado, assume 24 min
        if (!isMovie && runtimeMinutos === 0) {
            runtimeMinutos = 24;
        }

        // Separa os minutos totais em Horas e Minutos
        document.getElementById('gameHours').value = Math.floor(runtimeMinutos / 60);
        document.getElementById('gameMinutes').value = runtimeMinutos % 60;

        // Bônus: Para Séries, já pega a quantidade de Temporadas e Total de Episódios
        if (!isMovie) {
            document.getElementById('gameSeasons').value = data.number_of_seasons || '';
            document.getElementById('epTotal').value = data.number_of_episodes || '';
        }

    } catch (err) {
        console.error("Erro na busca do TMDB:", err);
        alert("Houve um erro ao se comunicar com o TMDB. Verifique sua conexão e a validade da chave API.");
    } finally {
        // Restaura o botão
        btnBusca.innerText = textoOriginal;
        btnBusca.disabled = false;
    }
}
// ==========================================
// INTEGRAÇÃO API TMDB
// ==========================================

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

    // Pega o nome que já estiver digitado no input de registro
    const query = document.getElementById('gameName').value.trim();
    document.getElementById('tmdbSearchInput').value = query;
    
    document.getElementById('tmdbSearchModal').style.display = 'flex';
    document.getElementById('tmdbResultsGrid').innerHTML = '';
    
    if (query) {
        fetchTMDB();
    } else {
        document.getElementById('tmdbSearchInput').focus();
    }
}

function closeTmdbSearch() {
    document.getElementById('tmdbSearchModal').style.display = 'none';
}

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

// Variável global para guardar os dados temporários da obra sendo visualizada
let currentTMDBPreviewData = null;

// ==========================================
// FUNÇÕES DE BUSCA TMDB (ATUALIZADAS)
// ==========================================

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
        // Aumentei a qualidade da imagem trocando w500 para ter capas mais nítidas
        const posterUrl = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://via.placeholder.com/300x450?text=Sem+Capa';
        const typeLabel = item.media_type === 'movie' ? 'Filme' : 'Série';

        // Layout limpo: Capa 100% visível, título e ano organizados logo abaixo da imagem
        return `
        <div onclick="openTmdbPreview('${item.id}', '${item.media_type}')" class="flex flex-col gap-3 cursor-pointer group">
            
            <div class="w-full aspect-[2/3] rounded-xl overflow-hidden border-2 border-[var(--border)] group-hover:border-[var(--accent)] group-hover:-translate-y-2 group-hover:shadow-[0_15px_30px_rgba(225,29,72,0.3)] transition-all duration-300 relative bg-[var(--surface)] shadow-md">
                <img src="${posterUrl}" class="w-full h-full object-cover" onerror="this.src='https://via.placeholder.com/300x450?text=Capa'">
                
                <!-- Tag do tipo no topo da imagem (bem discreta) -->
                <div class="absolute top-2 right-2 bg-black/80 px-2 py-1 rounded text-[8px] font-black uppercase text-[var(--accent)] backdrop-blur-md border border-[var(--border)] shadow-md">
                    ${typeLabel}
                </div>
            </div>
            
            <!-- Textos ficam fora da imagem para não atrapalhar a visão -->
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
        // Busca completa incluindo créditos, imagens (capas/backdrops) e vídeos (trailers)
        const response = await fetch(`https://api.themoviedb.org/3/${mediaType}/${id}?api_key=${apiKey}&language=pt-BR&append_to_response=credits,images,videos&include_image_language=pt,en,null`);
        const data = await response.json();

        // Extração de dados
        const title = data.title || data.name;
        const releaseDate = data.release_date || data.first_air_date || '';
        const year = releaseDate ? releaseDate.split('-')[0] : '';
        const mainPoster = data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : '';
        const backdrop = data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : '';
        const synopsis = data.overview || 'Sinopse não disponível para esta obra em português.';
        const voteAverage = data.vote_average ? data.vote_average.toFixed(1) : '0.0';
        
        const isAnime = data.origin_country && data.origin_country.includes('JP') && data.genres.some(g => g.name.toLowerCase().includes('animação') || g.name.toLowerCase().includes('animation'));
        let type = mediaType === 'movie' ? 'Filme' : 'Série';
        if (mediaType === 'tv' && isAnime) type = 'Anime';

        const genres = data.genres ? data.genres.map(g => g.name).slice(0, 3).join(', ') : 'Outros';
        
        let director = '';
        if (mediaType === 'movie' && data.credits && data.credits.crew) {
            const dirData = data.credits.crew.find(c => c.job === 'Director');
            if (dirData) director = dirData.name;
        } else if (mediaType === 'tv' && data.created_by && data.created_by.length > 0) {
            director = data.created_by[0].name;
        }

        let studio = '';
        if (data.production_companies && data.production_companies.length > 0) {
            studio = data.production_companies[0].name;
        }

        let hours = 0, minutes = 0, epTotal = 0, seasons = 0;
        if (mediaType === 'movie') {
            const runtime = data.runtime || 0;
            hours = Math.floor(runtime / 60);
            minutes = runtime % 60;
        } else {
            epTotal = data.number_of_episodes || 0;
            seasons = data.number_of_seasons || 0;
            
            // --- CORREÇÃO APLICADA AQUI: Tratamento do Tempo Médio por Episódio para TV ---
            let averageRuntime = 0;
            if (data.episode_run_time && data.episode_run_time.length > 0) {
                averageRuntime = data.episode_run_time[0];
            } else if (data.last_episode_to_air && data.last_episode_to_air.runtime) {
                averageRuntime = data.last_episode_to_air.runtime;
            } else if (data.runtime) {
                averageRuntime = data.runtime;
            }
            
            hours = Math.floor(averageRuntime / 60);
            minutes = averageRuntime % 60;
            // -----------------------------------------------------------------------------
        }

        // Salva globalmente para quando for adicionar
        currentTMDBPreviewData = {
            name: title,
            type: type,
            cover: mainPoster,
            genre: genres,
            director: director,
            studio: studio,
            releaseYear: year,
            epTotal: epTotal,
            seasons: seasons,
            hours: hours,
            minutes: minutes
        };

        // PREENCHENDO O MODAL DE PREVIEW
        document.getElementById('tmdbPreviewBackdrop').style.backgroundImage = backdrop ? `url('${backdrop}')` : 'none';
        document.getElementById('tmdbPreviewPoster').src = mainPoster || 'https://via.placeholder.com/400x600?text=Capa';
        document.getElementById('tmdbPreviewType').innerText = type;
        document.getElementById('tmdbPreviewTitle').innerText = title;
        document.getElementById('tmdbPreviewTitle').title = title;
        document.getElementById('tmdbPreviewYear').innerText = year || '----';
        document.getElementById('tmdbPreviewGenres').innerText = genres;
        document.getElementById('tmdbPreviewRating').innerText = voteAverage;
        document.getElementById('tmdbPreviewSynopsis').innerText = synopsis;

        // Trata o Trailer (procura um vídeo no YouTube)
        const trailerContainer = document.getElementById('tmdbPreviewTrailerContainer');
        trailerContainer.innerHTML = '';
        if (data.videos && data.videos.results && data.videos.results.length > 0) {
            const trailer = data.videos.results.find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')) || data.videos.results.find(v => v.site === 'YouTube');
            if (trailer) {
                trailerContainer.innerHTML = `
                    <a href="https://www.youtube.com/watch?v=${trailer.key}" target="_blank" class="btn btn-outline border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white text-[9px] py-1.5 px-3 flex items-center gap-2 w-max shadow-sm tracking-widest font-black uppercase transition-all">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                        Assistir Trailer
                    </a>
                `;
            }
        }

        // Trata as Opções de Capa (Posters)
        const posterContainer = document.getElementById('tmdbPosterOptions');
        posterContainer.innerHTML = '';
        if (data.images && data.images.posters && data.images.posters.length > 0) {
            // Pega até 10 capas alternativas (ordenadas por popularidade, misturando BR e EN)
            const posters = data.images.posters.slice(0, 10);
            posterContainer.innerHTML = posters.map((p, index) => {
                const pUrl = `https://image.tmdb.org/t/p/w300${p.file_path}`;
                const highResUrl = `https://image.tmdb.org/t/p/w500${p.file_path}`;
                return `
                <div onclick="selectPreviewPoster('${highResUrl}')" class="w-12 h-18 sm:w-16 sm:h-24 flex-shrink-0 cursor-pointer border-2 border-transparent hover:border-[var(--accent)] transition-all rounded overflow-hidden">
                    <img src="${pUrl}" class="w-full h-full object-cover">
                </div>`;
            }).join('');
        } else {
            posterContainer.innerHTML = '<span class="text-[8px] text-[var(--text-dim)] uppercase px-2 w-full text-center block">Sem capas alternativas</span>';
        }

        // Reseta os campos de Adição
        document.getElementById('tmdbAddStatus').value = 'Watchlist';
        document.getElementById('tmdbAddRating').value = '0';
        
        // Define a data atual como padrão no campo "Data Visto"
        document.getElementById('tmdbAddDate').value = new Date().toISOString().split('T')[0];

        // Mostra o Modal de Preview
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
    // Altera a imagem visível no modal
    document.getElementById('tmdbPreviewPoster').src = url;
    // Salva a escolha para caso ele clique em "Adicionar"
    if (currentTMDBPreviewData) {
        currentTMDBPreviewData.cover = url;
    }
}

async function confirmAddFromPreview() {
    if (!currentTMDBPreviewData) return;

    const status = document.getElementById('tmdbAddStatus').value;
    const rating = parseFloat(document.getElementById('tmdbAddRating').value) || 0;
    
    let date = document.getElementById('tmdbAddDate').value;
    if (status === 'Watchlist') date = ''; 

    const obraDuplicada = games.find(x => x.name.toLowerCase() === currentTMDBPreviewData.name.toLowerCase());
    if (obraDuplicada) {
        alert(`Aviso: A obra "${currentTMDBPreviewData.name}" já está na sua biblioteca!`);
        return;
    }

    // Garante uma duração padrão por episódio caso venha zerada do TMDB (ex: 24 min para animes/séries)
    let duracaoMinutos = currentTMDBPreviewData.minutes;
    let duracaoHoras = currentTMDBPreviewData.hours;
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
    
    // Tratamento correto dos episódios assistidos de acordo com o status escolhido
    const isEpisodic = ['Série', 'Anime', 'Desenho'].includes(newGame.type);
    
    if (isEpisodic) {
        if (status === 'Visto') {
            newGame.epWatched = newGame.epTotal > 0 ? newGame.epTotal : 12; // Se o total não vier, assume um padrão
        } else if (status === 'Assistindo') {
            newGame.epWatched = 1; // Começa com 1 episódio para o tempo somar corretamente
            if (!newGame.startDate) {
                newGame.startDate = new Date().toISOString().split('T')[0];
            }
        } else {
            newGame.epWatched = 0; // Watchlist
        }
    }

    // Chama o auto-status por último para alinhar tudo perfeitamente
    if (typeof updateAutoStatus === "function") {
        updateAutoStatus(newGame);
    }

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
        // Interceptador Mágico: Roda a sua função antiga e logo depois roda a nova!
        const originalRenderEst_v70 = typeof renderEstatisticasGerais === 'function' ? renderEstatisticasGerais : null;
        renderEstatisticasGerais = function(ano) {
            // Executa tudo que já existia (gráficos, pizzas, totais)
            if(originalRenderEst_v70) originalRenderEst_v70(ano);
            
            // Filtra os dados e executa o bloco novo
            const filteredForStats = ano === 'all' 
                ? games 
                : games.filter(g => g.startDate && g.startDate.startsWith(ano));
                
            updateDirectorAndStudioStats(filteredForStats);
        };
   