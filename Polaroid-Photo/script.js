const containerPreview = document.getElementById('previewContainer');
const inputFoto = document.getElementById('inputFoto');
const totalPriceEl = document.getElementById('totalPrice');
const zipInfoEl = document.getElementById('zipInfo');

// --- STATE APLIKASI ---
let pages = []; 
let activePageId = null;
let totalUploadedPhotos = 0;

let slotAktif = { pageId: null, slotIdx: null };
let statusFoto = {}; 
let modeKonfig = {}; 

let indexDragAktif = null;
let sedangDragFoto = false;
let koordinatAwalX = 0, koordinatAwalY = 0;
let jarakCubitAwal = null;
let skalaCubitAwal = 1;

// ==========================================
// 1. TEMA MEMORI
// ==========================================
const savedTheme = localStorage.getItem('polaroidTheme') || 'light';
if (savedTheme === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
    document.getElementById('themeToggle').innerHTML = '<i class="fas fa-sun"></i>';
}
document.getElementById('themeToggle').addEventListener('click', function() {
    if (document.body.hasAttribute('data-theme')) {
        document.body.removeAttribute('data-theme');
        localStorage.setItem('polaroidTheme', 'light');
        this.innerHTML = '<i class="fas fa-moon"></i>';
    } else {
        document.body.setAttribute('data-theme', 'dark');
        localStorage.setItem('polaroidTheme', 'dark');
        this.innerHTML = '<i class="fas fa-sun"></i>';
    }
});

// ==========================================
// 2. FUNGSI KERTAS & VISIBILITAS HAPUS
// ==========================================
function updateTombolHapusKertas() {
    const btns = document.querySelectorAll('.btn-hapus-kertas');
    btns.forEach(btn => {
        btn.style.display = pages.length > 1 ? 'block' : 'none';
    });
}

function createPage() {
    const id = 'p' + Date.now(); 
    pages.push({ id, mode: 'white', solid: '#ffb6c1', grad1: '#e0c3fc', grad2: '#8ec5fc', angle: 180 });

    const wrapper = document.createElement('div');
    wrapper.className = 'kertas-wrapper';
    wrapper.id = `wrapper-${id}`;

    const header = document.createElement('div');
    header.className = 'kertas-header';
    header.style.position = 'relative';
    header.style.zIndex = '50';
    header.setAttribute('data-html2canvas-ignore', 'true');
    header.innerHTML = `
        <div class="color-controls">
            <select class="pilih-bingkai">
                <option value="white">Putih Polos</option>
                <option value="solid">Warna Solid</option>
                <option value="gradient">Gradasi</option>
            </select>
            <div id="opsi-warna-${id}" class="opsi-warna"></div>
        </div>
        <button class="btn-hapus-kertas"><i class="fas fa-trash"></i> Hapus Kertas</button>
    `;

    const kertas = document.createElement('div');
    kertas.className = 'kertas-a4';
    kertas.id = `kertas-${id}`;
    
    kertas.addEventListener('click', () => setActivePage(id));

    for (let i = 0; i < 9; i++) {
        const key = `${id}-${i}`;
        statusFoto[key] = { x: 0, y: 0, scale: 1 };
        modeKonfig[key] = false;

        const slot = document.createElement('div');
        slot.className = 'kotak-polaroid';
        slot.id = `slot-${key}`;
        
        slot.innerHTML = `
            <div class="konfig-menu" style="z-index: 100;" data-html2canvas-ignore="true">
                <button class="btn-konf btn-hapus-foto" id="del-${key}" title="Hapus Foto"><i class="fas fa-trash"></i></button>
                <button class="btn-konf btn-gear" id="gear-${key}" title="Pengaturan Foto"><i class="fas fa-cog"></i></button>
            </div>
            <div class="area-foto" id="area-${key}">
                <div class="teks-tambah"><i class="fas fa-plus-circle"></i><br>Foto ${i+1}</div>
                <img id="img-${key}" src="" draggable="false">
            </div>
        `;
        kertas.appendChild(slot);
    }

    const footer = document.createElement('div');
    footer.className = 'kertas-footer';
    footer.style.position = 'relative';
    footer.style.zIndex = '50';
    footer.setAttribute('data-html2canvas-ignore', 'true');
    footer.innerHTML = `<button class="btn-tambah"><i class="fas fa-plus"></i> Tambah Kertas A4</button>`;

    wrapper.appendChild(header);
    wrapper.appendChild(kertas);
    wrapper.appendChild(footer);
    containerPreview.appendChild(wrapper);

    // --- EVENT LISTENER TOMBOL KERTAS ---
    const btnHapusKertas = header.querySelector('.btn-hapus-kertas');
    let deleteTimer;
    btnHapusKertas.addEventListener('click', (e) => {
        e.stopPropagation();
        if (btnHapusKertas.dataset.confirm === "true") {
            hapusKertas(id);
        } else {
            btnHapusKertas.dataset.confirm = "true";
            btnHapusKertas.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Yakin? Klik Lagi';
            btnHapusKertas.style.background = '#ef4444';
            btnHapusKertas.style.color = 'white';
            
            clearTimeout(deleteTimer);
            deleteTimer = setTimeout(() => {
                btnHapusKertas.dataset.confirm = "false";
                btnHapusKertas.innerHTML = '<i class="fas fa-trash"></i> Hapus Kertas';
                btnHapusKertas.style.background = '';
                btnHapusKertas.style.color = '';
            }, 3000);
        }
    });

    const selectBingkai = header.querySelector('.pilih-bingkai');
    selectBingkai.addEventListener('change', (e) => {
        gantiModeWarna(id, e.target.value);
    });

    const btnTambah = footer.querySelector('.btn-tambah');
    btnTambah.addEventListener('click', (e) => {
        e.stopPropagation();
        createPage();
    });

    pasangEventInteraksi(id);
    setActivePage(id);
    kalkulasiHarga();
    cekTombolPDF();
    updateTombolHapusKertas();

    setTimeout(() => wrapper.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
}

function setActivePage(id) {
    activePageId = id;
    document.querySelectorAll('.kertas-wrapper').forEach(el => {
        el.classList.toggle('active-page', el.id === `wrapper-${id}`);
    });
}

function hapusKertas(id) {
    if (pages.length <= 1) return; 
    
    pages = pages.filter(p => p.id !== id);
    document.getElementById(`wrapper-${id}`).remove();
    
    for (let i = 0; i < 9; i++) {
        delete statusFoto[`${id}-${i}`];
        delete modeKonfig[`${id}-${i}`];
    }

    hitungTotalFotoUlang();
    kalkulasiHarga();
    cekTombolPDF();
    updateTombolHapusKertas();

    setActivePage(pages[pages.length - 1].id);
}

function cekTombolPDF() {
    const btnPDF = document.getElementById('btnDownloadPDF');
    if (pages.length > 1) {
        btnPDF.style.display = 'flex';
        document.getElementById('btnDownloadJPG').innerHTML = '<i class="fas fa-file-download"></i> JPG (Hanya Hal. Aktif)';
    } else {
        btnPDF.style.display = 'none';
        document.getElementById('btnDownloadJPG').innerHTML = '<i class="fas fa-file-download"></i> JPG (Hal. Aktif)';
    }
}

// ==========================================
// 3. LOGIKA WARNA & HARGA
// ==========================================
function gantiModeWarna(id, mode) {
    const page = pages.find(p => p.id === id);
    page.mode = mode;
    
    const container = document.getElementById(`opsi-warna-${id}`);
    container.innerHTML = '';

    if (mode === 'solid') {
        container.innerHTML = `<input type="color" value="${page.solid}" title="Ubah Warna">`;
        container.querySelector('input').addEventListener('input', (e) => updateWarna(id, 'solid', e.target.value));
    } else if (mode === 'gradient') {
        container.innerHTML = `
            <input type="color" class="grad1" value="${page.grad1}" title="Warna 1">
            <input type="color" class="grad2" value="${page.grad2}" title="Warna 2">
            <button class="btn-rotate" title="Putar Arah Warna"><i class="fas fa-sync-alt"></i></button>
        `;
        container.querySelector('.grad1').addEventListener('input', (e) => updateWarna(id, 'grad1', e.target.value));
        container.querySelector('.grad2').addEventListener('input', (e) => updateWarna(id, 'grad2', e.target.value));
        container.querySelector('.btn-rotate').addEventListener('click', () => putarGradasi(id));
    }
    terapkanWarnaVisual(id);
    kalkulasiHarga();
}

function updateWarna(id, key, val) { pages.find(p => p.id === id)[key] = val; terapkanWarnaVisual(id); }
function putarGradasi(id) { const page = pages.find(p => p.id === id); page.angle = (page.angle + 45) % 360; terapkanWarnaVisual(id); }

function terapkanWarnaVisual(id) {
    const page = pages.find(p => p.id === id);
    const isColored = page.mode !== 'white';
    const kertas = document.getElementById(`kertas-${id}`);

    kertas.querySelectorAll('.kotak-polaroid').forEach(box => {
        const img = box.querySelector('img');
        if (page.mode === 'white') box.style.background = '#ffffff';
        else if (page.mode === 'solid') box.style.background = page.solid;
        else if (page.mode === 'gradient') box.style.background = `linear-gradient(${page.angle}deg, ${page.grad1}, ${page.grad2})`;

        if (img && img.getAttribute('src') && img.style.display !== 'none') {
            img.style.border = isColored ? "3px solid white" : "none";
            img.style.boxShadow = isColored ? "0 0 10px rgba(0,0,0,0.15)" : "none";
        }
    });
}

function hitungTotalFotoUlang() {
    totalUploadedPhotos = 0;
    document.querySelectorAll('.area-foto img').forEach(img => {
        if (img.getAttribute('src') && img.style.display !== 'none') totalUploadedPhotos++;
    });
}

function kalkulasiHarga() {
    let totalHrg = 0;
    pages.forEach(p => {
        if (p.mode === 'white') totalHrg += 4500;
        else if (p.mode === 'solid') totalHrg += 7500;
        else if (p.mode === 'gradient') totalHrg += 9000;
    });

    let zipCount = Math.max(1, Math.ceil(totalUploadedPhotos / 50));
    let zipPrice = zipCount * 500;
    totalHrg += zipPrice;

    totalPriceEl.innerText = `Rp${totalHrg.toLocaleString('id-ID')}`;
    zipInfoEl.innerText = `(+ ${zipCount} Plastik Zip Rp${zipPrice.toLocaleString('id-ID')})`;
}

// ==========================================
// 4. EVENT INTERAKSI (HAPUS FOTO, GESER, ZOOM)
// ==========================================
function pasangEventInteraksi(pageId) {
    for (let i = 0; i < 9; i++) {
        const key = `${pageId}-${i}`;
        const area = document.getElementById(`area-${key}`);
        const gear = document.getElementById(`gear-${key}`);
        const delBtn = document.getElementById(`del-${key}`);
        const img = document.getElementById(`img-${key}`);
        const slotDiv = document.getElementById(`slot-${key}`);

        gear.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            setActivePage(pageId);
            
            modeKonfig[key] = !modeKonfig[key];
            
            gear.classList.toggle('aktif', modeKonfig[key]);
            gear.innerHTML = modeKonfig[key] ? '<i class="fas fa-check"></i>' : '<i class="fas fa-cog"></i>';
            delBtn.style.display = modeKonfig[key] ? 'flex' : 'none'; 
            
            slotDiv.classList.toggle('mode-konfig', modeKonfig[key]);
            area.style.cursor = modeKonfig[key] ? 'grab' : 'pointer';
        });

        // ==========================================
        // PROSES MENGHAPUS FOTO
        // ==========================================
        delBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            img.removeAttribute('src');
            img.style.display = 'none';
            img.previousElementSibling.style.display = 'block'; 
            
            // KEMBALIKAN LATAR ABU-ABU SAAT DIHAPUS
            area.style.background = ''; 
            
            modeKonfig[key] = false;
            slotDiv.classList.remove('mode-konfig');
            area.style.cursor = 'pointer';
            
            gear.style.display = 'none';
            gear.classList.remove('aktif');
            gear.innerHTML = '<i class="fas fa-cog"></i>';
            delBtn.style.display = 'none';

            statusFoto[key] = { x: 0, y: 0, scale: 1 };
            img.style.transform = `translate(0px, 0px) scale(1)`;

            hitungTotalFotoUlang();
            kalkulasiHarga();
            terapkanWarnaVisual(pageId); 
        });

        area.addEventListener('click', (e) => {
            e.stopPropagation();
            setActivePage(pageId);
            if (!modeKonfig[key]) {
                slotAktif = { pageId, slotIdx: i };
                inputFoto.click();
            }
        });

        area.addEventListener('mousedown', (e) => {
            if (!modeKonfig[key] || !img.getAttribute('src')) return;
            e.preventDefault();
            sedangDragFoto = true; indexDragAktif = key;
            koordinatAwalX = e.clientX - statusFoto[key].x;
            koordinatAwalY = e.clientY - statusFoto[key].y;
            area.style.cursor = 'grabbing';
        });

        area.addEventListener('wheel', (e) => {
            if (!modeKonfig[key] || !img.getAttribute('src')) return;
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            statusFoto[key].scale = Math.max(0.2, Math.min(statusFoto[key].scale + delta, 5));
            img.style.transform = `translate(${statusFoto[key].x}px, ${statusFoto[key].y}px) scale(${statusFoto[key].scale})`;
        }, { passive: false });

        area.addEventListener('touchstart', (e) => {
            if (!modeKonfig[key] || !img.getAttribute('src')) return;
            indexDragAktif = key;
            if (e.touches.length === 1) {
                sedangDragFoto = true;
                koordinatAwalX = e.touches[0].clientX - statusFoto[key].x;
                koordinatAwalY = e.touches[0].clientY - statusFoto[key].y;
            } else if (e.touches.length === 2) {
                sedangDragFoto = false;
                jarakCubitAwal = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
                skalaCubitAwal = statusFoto[key].scale;
            }
        }, { passive: false });

        area.addEventListener('dblclick', () => {
            if (!modeKonfig[key] || !img.getAttribute('src')) return;
            statusFoto[key] = { x: 0, y: 0, scale: 1 };
            img.style.transform = `translate(0px, 0px) scale(1)`;
        });
    }
}

window.addEventListener('mousemove', (e) => {
    if (sedangDragFoto && indexDragAktif && modeKonfig[indexDragAktif]) {
        statusFoto[indexDragAktif].x = e.clientX - koordinatAwalX;
        statusFoto[indexDragAktif].y = e.clientY - koordinatAwalY;
        document.getElementById(`img-${indexDragAktif}`).style.transform = `translate(${statusFoto[indexDragAktif].x}px, ${statusFoto[indexDragAktif].y}px) scale(${statusFoto[indexDragAktif].scale})`;
    }
});

window.addEventListener('mouseup', () => { 
    if(indexDragAktif) document.getElementById(`area-${indexDragAktif}`).style.cursor = 'grab'; 
    sedangDragFoto = false; 
    indexDragAktif = null; 
});

window.addEventListener('touchmove', (e) => {
    if (!indexDragAktif || !modeKonfig[indexDragAktif]) return;
    const img = document.getElementById(`img-${indexDragAktif}`);
    const state = statusFoto[indexDragAktif];
    if (sedangDragFoto && e.touches.length === 1) {
        e.preventDefault();
        state.x = e.touches[0].clientX - koordinatAwalX;
        state.y = e.touches[0].clientY - koordinatAwalY;
        img.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
    } else if (e.touches.length === 2 && jarakCubitAwal) {
        e.preventDefault();
        const jarakSekarang = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        state.scale = Math.max(0.2, Math.min(skalaCubitAwal * (jarakSekarang / jarakCubitAwal), 5));
        img.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
    }
}, { passive: false });

window.addEventListener('touchend', () => { 
    sedangDragFoto = false; 
    jarakCubitAwal = null; 
    indexDragAktif = null; 
});

// ==========================================
// PROSES UPLOAD FOTO
// ==========================================
inputFoto.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && slotAktif.pageId !== null) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const key = `${slotAktif.pageId}-${slotAktif.slotIdx}`;
            const img = document.getElementById(`img-${key}`);
            const btnKonfig = document.getElementById(`gear-${key}`);
            const area = document.getElementById(`area-${key}`);
            
            if (!img.getAttribute('src')) {
                totalUploadedPhotos++;
                kalkulasiHarga();
            }

            img.src = ev.target.result;
            img.style.display = 'block';
            img.previousElementSibling.style.display = 'none';
            btnKonfig.style.display = 'flex'; 
            
            // HILANGKAN LATAR ABU-ABU SAAT FOTO MUNCUL
            area.style.background = 'transparent';
            
            statusFoto[key] = { x: 0, y: 0, scale: 1 };
            img.style.transform = `translate(0px, 0px) scale(1)`;
            
            terapkanWarnaVisual(slotAktif.pageId);
        };
        reader.readAsDataURL(file);
    }
    inputFoto.value = '';
});

// ==========================================
// 5. SISTEM DOWNLOAD & PDF (DIPERBARUI)
// ==========================================

function bersihkanKertasUntukRender(kertas, format) {
    Object.keys(modeKonfig).forEach(k => { 
        if (modeKonfig[k]) {
            const gear = document.getElementById(`gear-${k}`);
            if(gear) gear.click(); 
        }
    });

    kertas.parentElement.classList.remove('active-page');
    kertas.querySelectorAll('.area-foto').forEach(area => {
        area.style.background = 'transparent';
        const teks = area.querySelector('.teks-tambah');
        if (teks) teks.style.display = 'none';
    });

    if (format === 'png') {
        kertas.style.background = 'transparent';
        kertas.style.boxShadow = 'none';
        kertas.style.border = 'none';
    } else {
        kertas.style.background = '#ffffff';
    }
}

function pulihkanKertasSetelahRender(kertas) {
    if (kertas.id === `kertas-${activePageId}`) kertas.parentElement.classList.add('active-page');
    kertas.style.background = '';
    kertas.style.boxShadow = '';
    kertas.style.border = '';
    
    // PERBAIKAN BUG PDF: Mengecek apakah kotak ada fotonya atau tidak
    kertas.querySelectorAll('.area-foto').forEach(area => {
        const img = area.querySelector('img');
        const teks = area.querySelector('.teks-tambah');
        
        if (img && img.getAttribute('src') && img.style.display !== 'none') {
            area.style.background = 'transparent'; // Tetap transparan jika ada foto
            if (teks) teks.style.display = 'none';
        } else {
            area.style.background = ''; // Kembali abu-abu jika kosong
            if (teks) teks.style.display = 'block';
        }
    });
}

function simpanSatuKertas(format, btnId) {
    const tombol = document.getElementById(btnId);
    const teksAsli = tombol.innerHTML;
    tombol.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
    tombol.style.pointerEvents = 'none';

    const kertas = document.getElementById(`kertas-${activePageId}`);
    const timestamp = Date.now();

    const rect = kertas.getBoundingClientRect();
    const gayaAsli = kertas.getAttribute('style') || '';
    kertas.style.width = rect.width + 'px';
    kertas.style.height = rect.height + 'px';

    bersihkanKertasUntukRender(kertas, format);

    html2canvas(kertas, { 
        scale: 4, useCORS: true, backgroundColor: format === 'png' ? null : '#ffffff' 
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Polaroid_${timestamp}.${format}`;
        link.href = canvas.toDataURL(`image/${format}`, 1.0);
        link.click();
    }).finally(() => {
        tombol.innerHTML = teksAsli;
        tombol.style.pointerEvents = 'auto';
        kertas.setAttribute('style', gayaAsli);
        pulihkanKertasSetelahRender(kertas);
        terapkanWarnaVisual(activePageId);
    });
}

document.getElementById('btnDownloadPDF').addEventListener('click', async function() {
    const tombol = this;
    const teksAsli = tombol.innerHTML;
    tombol.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyusun PDF...';
    tombol.style.pointerEvents = 'none';

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const timestamp = Date.now();

    for (let i = 0; i < pages.length; i++) {
        const pageId = pages[i].id;
        const kertas = document.getElementById(`kertas-${pageId}`);

        const rect = kertas.getBoundingClientRect();
        const gayaAsli = kertas.getAttribute('style') || '';
        kertas.style.width = rect.width + 'px';
        kertas.style.height = rect.height + 'px';

        bersihkanKertasUntukRender(kertas, 'jpeg');

        const canvas = await html2canvas(kertas, { scale: 4, useCORS: true, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);

        kertas.setAttribute('style', gayaAsli);
        pulihkanKertasSetelahRender(kertas);
        terapkanWarnaVisual(pageId);
    }

    pdf.save(`Order_Massal_${timestamp}.pdf`);
    tombol.innerHTML = teksAsli;
    tombol.style.pointerEvents = 'auto';
});

document.getElementById('btnDownloadJPG').addEventListener('click', () => simpanSatuKertas('jpeg', 'btnDownloadJPG'));
document.getElementById('btnDownloadPNG').addEventListener('click', () => simpanSatuKertas('png', 'btnDownloadPNG'));

// Inisialisasi Halaman Pertama
createPage();
