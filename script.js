// Ülke ve vize türüne göre fotoğraf ölçüleri
const countrySpecs = {
    'passport': {
        name: 'Passport Photo',
        width: 35,
        height: 45,
        unit: 'mm',
        dpi: 600,
        background: 'white',
        format: 'JPG',
        maxSize: '500KB'
    },
    'id': {
        name: 'ID Card Photo',
        width: 25,
        height: 35,
        unit: 'mm',
        dpi: 300,
        background: 'white',
        format: 'JPG',
        maxSize: '300KB'
    },
    'visa-us': {
        name: 'US Visa Photo',
        width: 51,
        height: 51,
        unit: 'mm',
        dpi: 600,
        background: 'white',
        format: 'JPG',
        maxSize: '240KB',
        headSize: '70-80%', // Yüzün fotoğrafın %70-80'ini kaplaması gerekiyor[](https://mybiometricphotos.com/visa-photo/united-kingdom/)
    },
    'visa-uk': {
        name: 'UK Visa Photo',
        width: 35,
        height: 45,
        unit: 'mm',
        dpi: 600,
        background: 'light grey',
        format: 'JPG',
        maxSize: '500KB',
        headSize: '29-34mm', // Çeneden saç üstüne kadar[](https://mybiometricphotos.com/visa-photo/united-kingdom/)
    },
    'visa-schengen': {
        name: 'Schengen Visa Photo',
        width: 35,
        height: 45,
        unit: 'mm',
        dpi: 600,
        background: 'light grey',
        format: 'JPG',
        maxSize: '500KB',
        headSize: '32-36mm', // Çeneden saç üstüne kadar[](https://schengeninsuranceinfo.com/schengen-visa/requirements/photo/)[](https://visa2fly.com/blog/schengen-visa-photo-size)
    },
    'visa-canada': {
        name: 'Canada Visa Photo',
        width: 35,
        height: 45,
        unit: 'mm',
        dpi: 600,
        background: 'white',
        format: 'JPG',
        maxSize: '500KB'
    },
    'visa-australia': {
        name: 'Australia Visa Photo',
        width: 45,
        height: 35,
        unit: 'mm',
        dpi: 600,
        background: 'light',
        format: 'JPG',
        maxSize: '500KB'
 extinction: {
        name: 'CV/Resume Photo',
        width: 40,
        height: 50,
        unit: 'mm',
        dpi: 300,
        background: 'white',
        format: 'JPG',
        maxSize: '1MB'
    },
    'linkedin': {
        name: 'LinkedIn Profile Photo',
        width: 400,
        height: 400,
        unit: 'px',
        dpi: 72,
        background: 'any',
        format: 'JPG/PNG',
        maxSize: '2MB'
    }
};

// DOM elementleri
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const countrySelect = document.getElementById('countrySelect');
const specsDisplay = document.getElementById('specsDisplay');
const specsText = document.getElementById('specsText');
const processBtn = document.getElementById('processBtn');
const processing = document.getElementById('processing');
const progressFill = document.getElementById('progressFill');
const previewSection = document.getElementById('previewSection');
const previewGrid = document.getElementById('previewGrid');
const downloadBtn = document.getElementById('downloadBtn');

let selectedFile = null;
let processedFile = null;
let currentPlan = 'free';
let currentUser = null;
let dailyUsage = 0;
let guestUsage = 0;

// Stripe başlatma
const stripe = Stripe('pk_test_51234567890'); // Gerçek Stripe anahtarınızla değiştirin

// Scroll fonksiyonları
function scrollToSignIn() {
    document.getElementById('signIn').scrollIntoView({ behavior: 'smooth' });
}

function scrollToUpload() {
    document.getElementById('uploadSection').scrollIntoView({ behavior: 'smooth' });
}

// Google Sign-In işleyici
function handleSignIn(response) {
    const responsePayload = decodeJWTResponse(response.credential);
    
    currentUser = {
        id: responsePayload.sub,
        name: responsePayload.name,
        email: responsePayload.email,
        picture: responsePayload.picture
    };
    
    updateAfterSignIn();
}

function decodeJWTResponse(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

// E-posta/Şifre ile giriş
function handleEmailSignIn() {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;

    if (!email || !password) {
        alert('Lütfen e-posta ve şifreyi girin');
        return;
    }

    // Mock kimlik doğrulama (gerçek backend API çağrısıyla değiştirin)
    if (email.includes('@') && password.length >= 6) {
        currentUser = {
            id: email,
            name: email.split('@')[0],
            email: email,
            picture: 'https://via.placeholder.com/40'
        };
        updateAfterSignIn();
    } else {
        alert('Geçersiz e-posta veya şifre (şifre en az 6 karakter olmalı)');
    }
}

function updateAfterSignIn() {
    document.getElementById('signInSection').style.display = 'none';
    document.getElementById('userInfo').style.display = 'flex';
    document.getElementById('userPhoto').src = currentUser.picture;
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('usageInfo').style.display = 'block';
    loadUserUsage();
}

function signOut() {
    currentUser = null;
    dailyUsage = 0;
    document.getElementById('signInSection').style.display = 'block';
    document.getElementById('userInfo').style.display = 'none';
    document.getElementById('usageInfo').style.display = 'none';
    
    uploadZone.innerHTML = `
        <div class="upload-icon">📁</div>
        <h3>Fotoğrafınızı sürükleyin veya seçmek için tıklayın</h3>
        <p>JPG, PNG, PDF dosyalarını destekler, maksimum 10MB</p>
    `;
    selectedFile = null;
    processedFile = null;
    previewSection.style.display = 'none';
    processBtn.disabled = true;
}

function loadUserUsage() {
    const today = new Date().toDateString();
    const savedUsage = JSON.parse(localStorage.getItem(`usage_${currentUser?.id || 'guest'}`) || '{}');
    
    if (savedUsage.date === today) {
        if (currentUser) {
            dailyUsage = savedUsage.count || 0;
        } else {
            guestUsage = savedUsage.count || 0;
        }
    } else {
        dailyUsage = 0;
        guestUsage = 0;
    }
    
    updateUsageDisplay();
}

function updateUsageDisplay() {
    const usageInfo = document.getElementById('usageInfo');
    const usageText = document.getElementById('usageText');
    
    if (currentUser && currentPlan === 'free') {
        const remaining = 1 - dailyUsage;
        usageText.textContent = `Ücretsiz Plan: Bugün ${remaining} belge kaldı`;
        usageInfo.style.display = 'block';
        
        if (remaining <= 0) {
            usageText.textContent = 'Bugün ücretsiz limit doldu. Yükseltin!';
            usageInfo.style.background = 'rgba(239, 68, 68, 0.1)';
        }
    } else if (!currentUser) {
        const remaining = 1 - guestUsage;
        usageText.textContent = `Ücretsiz Deneme: Bugün ${remaining} belge kaldı`;
        usageInfo.style.display = 'block';
        
        if (remaining <= 0) {
            usageText.textContent = 'Ücretsiz deneme limiti doldu. Giriş yapın veya yükseltin!';
            usageInfo.style.background = 'rgba(239, 68, 68, 0.1)';
        }
    } else {
        usageInfo.style.display = 'none';
    }
}

function saveUserUsage() {
    const today = new Date().toDateString();
    const usageData = {
        date: today,
        count: currentUser ? dailyUsage : guestUsage
    };
    localStorage.setItem(`usage_${currentUser?.id || 'guest'}`, JSON.stringify(usageData));
}

function checkUsageLimit() {
    if (!currentUser && guestUsage >= 1) {
        document.getElementById('limitReachedModal').style.display = 'block';
        return false;
    }
    if (currentUser && currentPlan === 'free' && dailyUsage >= 1) {
        document.getElementById('limitReachedModal').style.display = 'block';
        return false;
    }
    return true;
}

function closeLimitModal() {
    document.getElementById('limitReachedModal').style.display = 'none';
}

// Olay dinleyicileri
uploadZone.addEventListener('click', () => fileInput.click());
uploadZone.addEventListener('dragover', handleDragOver);
uploadZone.addEventListener('drop', handleDrop);
uploadZone.addEventListener('dragleave', handleDragLeave);
fileInput.addEventListener('change', handleFileSelect);
countrySelect.addEventListener('change', handleCountryChange);
processBtn.addEventListener('click', processFile);
downloadBtn.addEventListener('click', downloadFile);

function handleDragOver(e) {
    e.preventDefault();
    uploadZone.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    handleFile(file);
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    handleFile(file);
}

function handleFile(file) {
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
        selectedFile = file;
        uploadZone.innerHTML = `
            <div class="upload-icon">✅</div>
            <h3>1 dosya seçildi</h3>
            <p>${file.name}</p>
        `;
        updateProcessButton();
    } else {
        alert('Lütfen geçerli bir JPG, PNG veya PDF dosyası seçin.');
    }
}

function handleCountryChange() {
    const selectedCountry = countrySelect.value;
    if (selectedCountry && countrySpecs[selectedCountry]) {
        const specs = countrySpecs[selectedCountry];
        specsDisplay.style.display = 'block';
        specsText.innerHTML = `
            <strong>${specs.name}</strong><br>
            Ölçüler: ${specs.width} × ${specs.height} ${specs.unit}<br>
            Çözünürlük: ${specs.dpi} DPI<br>
            Arka Plan: ${specs.background}<br>
            Format: ${specs.format}<br>
            Maksimum Dosya Boyutu: ${specs.maxSize}<br>
            ${specs.headSize ? `Yüz Ölçüsü: ${specs.headSize}` : ''}
        `;
    } else {
        specsDisplay.style.display = 'none';
    }
    updateProcessButton();
}

function updateProcessButton() {
    processBtn.disabled = !(selectedFile && countrySelect.value);
}

async function processImage(file, specs) {
    return new Promise((resolve) => {
        // Fotoğrafı resmi ölçü ve standartlara göre işleme
        console.log(`Fotoğraf işleniyor: ${specs.name} için ${specs.width}x${specs.height}${specs.unit}, ${specs.dpi} DPI`);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = function() {
            // Ölçüleri mm'den piksele çevirme (varsa)
            const pixelWidth = specs.unit === 'mm' ? 
                (specs.width * specs.dpi) / 25.4 : specs.width;
            const pixelHeight = specs.unit === 'mm' ? 
                (specs.height * specs.dpi) / 25.4 : specs.height;

            canvas.width = pixelWidth;
            canvas.height = pixelHeight;

            // Arka plan rengi ayarlama
            if (specs.background === 'white') {
                ctx.fillStyle = '#FFFFFF';
            } else if (specs.background === 'light grey') {
                ctx.fillStyle = '#D3D3D3'; // Schengen ve UK için açık gri[](https://schengeninsuranceinfo.com/schengen-visa/requirements/photo/)[](https://mybiometricphotos.com/visa-photo/united-kingdom/)
            } else if (specs.background === 'light') {
                ctx.fillStyle = '#F8F8F8';
            }

            if (specs.background !== 'any') {
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            // Yüz boyutunu ayarlama (örneğin, Schengen için %70-80)
            const scale = Math.max(
                canvas.width / img.width,
                canvas.height / img.height
            );
            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;
            const x = (canvas.width - scaledWidth) / 2;
            const y = (canvas.height - scaledHeight) / 2;

            // Yüz boyutunu kontrol etme (Schengen ve UK için özel kural)
            if (specs.headSize) {
                console.log(`Yüz boyutunu ${specs.headSize} olarak ayarlama`);
                // Gerçek AI entegrasyonu için buraya yüz algılama eklenebilir
            }

            ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

            // Dosya boyutunu kontrol etme
            canvas.toBlob((blob) => {
                const fileSizeKB = blob.size / 1024;
                if (fileSizeKB > parseInt(specs.maxSize)) {
                    alert(`Dosya boyutu ${fileSizeKB.toFixed(2)}KB, maksimum ${specs.maxSize} olmalı.`);
                    resolve(null);
                    return;
                }

                resolve({
                    name: file.name.replace(/\.[^/.]+$/, '_optimized.jpg'),
                    blob: blob,
                    url: URL.createObjectURL(blob),
                    originalName: file.name
                });
            }, 'image/jpeg', 0.9);
        };

        img.src = URL.createObjectURL(file);
    });
}

async function processFile() {
    if (!selectedFile || !countrySelect.value) return;
    
    if (!checkUsageLimit()) {
        return;
    }

    processing.style.display = 'block';
    processBtn.disabled = true;
    
    const specs = countrySpecs[countrySelect.value];
    
    // Fotoğraf işleme
    progressFill.style.width = '100%';
    
    processedFile = await processImage(selectedFile, specs);
    
    processing.style.display = 'none';
    
    if (!processedFile) {
        processBtn.disabled = false;
        return;
    }

    if (currentUser) {
        dailyUsage += 1;
    } else {
        guestUsage += 1;
    }
    saveUserUsage();
    updateUsageDisplay();
    
    showPreview();
}

function showPreview() {
    previewGrid.innerHTML = '';
    
    const previewCard = document.createElement('div');
    previewCard.className = 'preview-card';
    previewCard.innerHTML = `
        <h4>Önce</h4>
        <img src="${URL.createObjectURL(selectedFile)}" alt="Orijinal">
        <h4 style="margin-top: 20px;">Sonra</h4>
        <img src="${processedFile.url}" alt="Optimize Edilmiş">
        <p style="margin-top: 10px; font-size: 0.9rem; color: #9ca3af;">
            ${processedFile.name}
        </p>
    `;
    previewGrid.appendChild(previewCard);
    
    previewSection.style.display = 'block';
    processBtn.disabled = false;
}

function downloadFile() {
    const a = document.createElement('a');
    a.href = processedFile.url;
    a.download = processedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function selectPlan(plan) {
    if (plan === 'starter' || plan === 'pro') {
        if (!currentUser) {
            alert('Plan yükseltmek için önce giriş yapın.');
            return;
        }
        
        const priceIds = {
            'starter': 'price_starter_123', // Gerçek fiyat ID'siyle değiştirin
            'pro': 'price_pro_456'        // Gerçek fiyat ID'siyle değiştirin
        };
        
        stripe.redirectToCheckout({
            lineItems: [{
                price: priceIds[plan],
                quantity: 1,
            }],
            mode: 'subscription',
            customerEmail: currentUser.email,
            successUrl: window.location.origin + '/success.html',
            cancelUrl: window.location.origin + '/cancel.html',
        }).then(function (result) {
            if (result.error) {
                alert('Ödeme başarısız: ' + result.error.message);
            }
        });
    } else if (plan === 'enterprise') {
        alert('Kurumsal plan için sales@documentpro.com ile iletişime geçin.');
    }
}

window.addEventListener('load', function() {
    console.log('Document Pro başarıyla başlatıldı!');
    loadUserUsage();
});