// 1. Buat Peta
let map = L.map('map',{zoomControl:false}).setView([-8.006657, 112.618495], 15);



// Wadah untuk daftar UMKM
let daftarUMKM = [];

// 2. Tampilan OpenStreetMap
L.tileLayer(
    'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
        attribution: '&copy; OpenStreetMap contributors'
    }
).addTo(map);

// 3. Icon Kuliner

// 4. Marker Statis Kantor Kelurahan
L.marker([-8.0070465, 112.6184146])
    .addTo(map)
    .bindPopup("Kantor Kel. Bandungrejosari")
    .openPopup();

// 5. Membaca Data Google Sheet
const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS1UCtxXlzMVz3AUDdIpmyT7lcO7sUXq4Kn9woEfU8rY2U9qS7XLhmjS4Sc3W6n8T-aqFTLnkzdbwPL/pub?output=csv';
 
const makananIcon = L.icon({
    iconUrl: "Food.png",
    iconSize: [50, 50],
    iconAnchor: [17, 35],
    popupAnchor: [0, -35]
    });

const minumanIcon = L.icon({
    iconUrl: "Drink.png",
    iconSize: [50, 50],
    iconAnchor: [17, 35],
    popupAnchor: [0, -35]
    });

Papa.parse(sheetUrl, {
    download: true,
    header: true,
    complete: function(results) {
        console.log("Data Sheet:", results.data);

        // SATUKAN PROSES DI SINI
        results.data.forEach(function(umkm){
            if(umkm.Lat && umkm.Long){
                
                // Ubah koordinat jadi angka
                const lat = parseFloat(umkm.Lat.replace(',', '.'));
                const lon = parseFloat(umkm.Long.replace(',', '.'));
                
                // Foto Array
                const fotoArray = umkm.URL
                .split(",")
                .map(f => f.trim())

                let galeri = "";

                fotoArray.forEach(function(link){   
                        galeri += `
                            <img
                                src="${link}"
                                style="
                                    width:250px;
                                    height:180px;
                                    object-fit:cover;
                                    border-radius:8px;
                                    flex-shrink:0;
                                "
                            >
                        `;
                    });

                // Buat marker dengan icon, foto, dan link
                let iconUMKM;

                if (umkm.Jenis === "Makanan") {
                    iconUMKM = makananIcon;
                } else if (umkm.Jenis === "Minuman") {
                    iconUMKM = minumanIcon;
                } else {
                    iconUMKM = makananIcon; // ikon default jika jenis tidak dikenali
                }
                const marker = L.marker([lat, lon], {icon : iconUMKM})
            .addTo(map)
            ;
    
        marker.on("click", function(){

            bukaSheet(`
                <div class="popup-title">
                    ${umkm.NamaUsaha} (${umkm.Jenis})
                </div>

                <div class="popup-content">

                    <b>Hari Buka:</b>
                    ${umkm.Hari_buka || "-"}<br>

                    <b>Jam Operasional:</b>
                    ${umkm.Jam_opr || "-"}<br>
                    <b>Menu:</b>
                    ${umkm.Menu || "-"}<br>
                    <br> <br>


                </div>

                <div style="
                    display:flex;
                    overflow-x:auto;
                    gap:10px;
                ">
                    ${galeri}
                </div>

                <div class="popup-button">

                    <a href="${umkm.Gmaps}" target="_blank">
                        📍 Google Maps
                    </a>

                    ${
                        umkm.LinkWA ?
                        `<a href="${umkm.LinkWA}" target="_blank">
                            📞 Pesan Sekarang
                        </a>`
                        : ""
                    }

                </div>
            `);

        });

                // Simpan data ke dalam array untuk dihitung jaraknya nanti
                daftarUMKM.push({
                    Nama: umkm.NamaUsaha,
                    Lat: lat,
                    Lon: lon,
                    marker: marker, 
                    Jenis: umkm.Jenis,
                    KataKunci: umkm.KataKunci,
                    Hari_buka: umkm.Hari_buka
                });
            }
        });
    }
});



function cariTerdekat() {
    if (!navigator.geolocation) {
        alert("Browser Anda tidak mendukung fitur lokasi.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        function (pos) {
            const userLat = pos.coords.latitude;
            const userLon = pos.coords.longitude;

            daftarUMKM.forEach(function (umkm) {
                const latFloat = parseFloat(String(umkm.Lat).replace(',', '.'));
                const lonFloat = parseFloat(String(umkm.Lon).replace(',', '.'));

                // Menghitung jarak pengguna dengan tiap UMKM
                umkm.jarak = hitungJarak(userLat, userLon, latFloat, lonFloat);
            });

            // Urutkan dari yang paling dekat
            daftarUMKM.sort((a, b) => a.jarak - b.jarak);

            tampilkanDaftar();
        },
        function (error) {
            alert("Gagal mengambil lokasi: " + error.message);
        }
    );
}

function tampilkanDaftar(data = daftarUMKM) {

    let html = "<h3>UMKM Terdekat</h3>";

    console.log("Daftar terurut:", data);

    data.slice(0, 10).forEach(function (umkm) {

        html += `
        <div onclick="zoomUMKM('${umkm.Nama}')"
             style="cursor:pointer;padding:5px;border-bottom:1px solid #ccc;">

            ${umkm.Nama}
            (${umkm.jarak.toFixed(2)} km)

        </div>
        `;

    });

    L.popup({
        maxWidth:300
    })
    .setLatLng(map.getCenter())
    .setContent(html)
    .openOn(map);

}

function cariMakananTerdekat() {

    if (!navigator.geolocation) {
        alert("Browser Anda tidak mendukung fitur lokasi.");
        return;
    }

    navigator.geolocation.getCurrentPosition(

        function (pos) {

            const userLat = pos.coords.latitude;
            const userLon = pos.coords.longitude;

            // Ambil hanya UMKM kategori Makanan
            let daftarMakanan = daftarUMKM.filter(
                umkm => umkm.Jenis === "Makanan"
            );

            // Hitung jarak
            daftarMakanan.forEach(function (umkm) {

                const latFloat = parseFloat(String(umkm.Lat).replace(',', '.'));
                const lonFloat = parseFloat(String(umkm.Lon).replace(',', '.'));

                umkm.jarak = hitungJarak(
                    userLat,
                    userLon,
                    latFloat,
                    lonFloat
                );

            });

            // Urutkan berdasarkan jarak
            daftarMakanan.sort((a, b) => a.jarak - b.jarak);

            // Tampilkan daftar makanan
            tampilkanDaftar(daftarMakanan);

        },

        function (error) {

            alert("Gagal mengambil lokasi: " + error.message);

        }

    );

}

function cariMinumanTerdekat() {

    if (!navigator.geolocation) {
        alert("Browser Anda tidak mendukung fitur lokasi.");
        return;
    }

    navigator.geolocation.getCurrentPosition(

        function (pos) {

            const userLat = pos.coords.latitude;
            const userLon = pos.coords.longitude;

            // Ambil hanya UMKM kategori Minuman
            let daftarMinuman = daftarUMKM.filter(
                umkm => umkm.Jenis === "Minuman"
            );

            // Hitung jarak
            daftarMinuman.forEach(function (umkm) {

                const latFloat = parseFloat(String(umkm.Lat).replace(',', '.'));
                const lonFloat = parseFloat(String(umkm.Lon).replace(',', '.'));

                umkm.jarak = hitungJarak(
                    userLat,
                    userLon,
                    latFloat,
                    lonFloat
                );

            });

            // Urutkan berdasarkan jarak
            daftarMinuman.sort((a, b) => a.jarak - b.jarak);

            // Tampilkan 5 terdekat
            tampilkanDaftar(daftarMinuman);

        },

        function (error) {

            alert("Gagal mengambil lokasi: " + error.message);

        }

    );

}

function zoomUMKM(nama) {

    document.getElementById("searchOverlay").style.display = "none";

    const umkm = daftarUMKM.find(x => x.Nama === nama);

    if (umkm) {

        const latFloat = parseFloat(String(umkm.Lat).replace(',', '.'));
        const lonFloat = parseFloat(String(umkm.Lon).replace(',', '.'));

        map.setView([latFloat, lonFloat], 18);

        setTimeout(() => {
            umkm.marker.openPopup();
        }, 300);

    }
}


function hitungJarak(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius bumi dalam kilometer
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; 
}

const toolbar = document.querySelector(".map-toolbar");

L.DomEvent.disableClickPropagation(toolbar);
L.DomEvent.disableScrollPropagation(toolbar);

function bukaSearch(){

    document.getElementById("searchOverlay").style.display = "block";

    document.getElementById("searchInput").focus();

}

function tutupSearch(){

    document.getElementById("searchOverlay").style.display = "none";

}

function cariUMKM() {

    const keyword = document
        .getElementById("searchInput")
        .value
        .toLowerCase()
        .trim();

    const hasil = document.getElementById("hasilSearch");

    hasil.innerHTML = "";

    if (keyword === "") return;

    if (!navigator.geolocation) {
        hasil.innerHTML = "<div class='hasil-item'>Browser tidak mendukung lokasi.</div>";
        return;
    }

    navigator.geolocation.getCurrentPosition(function(pos){

        const userLat = pos.coords.latitude;
        const userLon = pos.coords.longitude;

        const hasilCari = daftarUMKM.filter(umkm => {

            const latFloat = parseFloat(String(umkm.Lat).replace(',', '.'));
            const lonFloat = parseFloat(String(umkm.Lon).replace(',', '.'));

            umkm.jarak = hitungJarak(userLat, userLon, latFloat, lonFloat);

            const nama = (umkm.Nama || "").toLowerCase();
            const kataKunci = (umkm.KataKunci || "").toLowerCase();

            return nama.includes(keyword) || kataKunci.includes(keyword);

        });

        hasilCari.sort((a,b) => a.jarak - b.jarak);

        hasilCari.forEach(function(umkm){

            hasil.innerHTML += `
                <div class="hasil-item"
                     onclick="zoomUMKM('${umkm.Nama}')">

                    <b>${umkm.Nama}</b><br>
                    <small>📍 ${umkm.jarak.toFixed(2)} km</small>

                </div>
            `;

        });

    });

}

// Lokasi sekarang

let markerLokasi = null;
function lokasiSaya() {

    if (!navigator.geolocation) {
        alert("Browser Anda tidak mendukung lokasi.");
        return;
    }

    navigator.geolocation.getCurrentPosition(

        function(pos){

            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;

            // Hapus marker lama
            if(markerLokasi){
                map.removeLayer(markerLokasi);
            }

            markerLokasi = L.circleMarker([lat, lon],{

                radius:8,
                color:"#fff",
                weight:3,

                fillColor:"#007bff",
                fillOpacity:1

            })
            .addTo(map)
            .bindPopup("📍 Lokasi Anda");

            map.setView([lat, lon], 17);

            markerLokasi.openPopup();

        },

        function(error){
            alert(error.message);
        }

    );

}

map.on("zoomend", function () {

    const zoom = map.getZoom();

    // Marker UMKM
    daftarUMKM.forEach(function(umkm){

        if (!umkm.marker) return;

        if (zoom < 13) {

            if (map.hasLayer(umkm.marker)) {
                map.removeLayer(umkm.marker);
            }

        } else {

            if (!map.hasLayer(umkm.marker)) {
                umkm.marker.addTo(map);
            }

        }

    });

    // Marker lokasi pengguna
    if (markerLokasi) {

        if (zoom < 13) {

            if (map.hasLayer(markerLokasi)) {
                map.removeLayer(markerLokasi);
            }

        } else {

            if (!map.hasLayer(markerLokasi)) {
                markerLokasi.addTo(map);
            }

        }

    }

});

map.on("zoomend", function(){

    const zoom = map.getZoom();

    daftarUMKM.forEach(function(umkm){

        if(!umkm.marker) return;

        if(zoom >= 16){

            umkm.marker.bindTooltip(umkm.Nama,{
                permanent:true,
                direction:"left",
                offset:[0,-20],
                className:"nama-umkm"
            });

            umkm.marker.openTooltip();

        }else{

            umkm.marker.closeTooltip();

        }

    });

});


function bukaSheet(html){

    document.getElementById("sheetContent").innerHTML = html;

    const sheet = document.getElementById("bottomSheet");

    sheet.classList.remove("hide");
    sheet.classList.add("show");

}

function tutupSheet(){

    const sheet = document.getElementById("bottomSheet");

    sheet.classList.remove("show");
    sheet.classList.add("hide");

}