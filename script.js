// Country specifications
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
        maxSize: '240KB'
    },
    'visa-uk': {
        name: 'UK Visa Photo',
        width: 45,
        height: 35,
        unit: 'mm',
        dpi: 600,
        background: 'neutral',
        format: 'JPG',
        maxSize: '500KB'
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
    },
    'cv': {
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

// DOM elements
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

// Initialize Stripe
const stripe = Stripe('pk_test_51234567890'); // Replace with your publishable key

// Scroll functions
function scrollToSignIn() {
    document.getElementById('signIn').scrollIntoView({ behavior: 'smooth' });
}

function scrollToUpload() {
    document.getElementById('uploadSection').scrollIntoView({ behavior: 'smooth' });
}

// Google Sign In Handler
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

// Email/Password Sign In Handler
function handleEmailSignIn() {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;

    if (!email || !password) {
        alert('Please enter both email and password');
        return;
    }

    // Mock authentication (replace with real backend API call)
    if (email.includes('@') && password.length >= 6) {
        currentUser = {
            id: email,
            name: email.split('@')[0],
            email: email,
            picture: 'https://via.placeholder.com/40'
        };
        updateAfterSignIn();
    } else {
        alert('Invalid email or password (password must be at least 6 characters)');
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
        <h3>Drop your photo or click to browse</h3>
        <p>Supports JPG, PNG, PDF files up to 10MB</p>
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
        usageText.textContent = `Free Plan: ${remaining} document remaining today`;
        usageInfo.style.display = 'block';
        
        if (remaining <= 0) {
            usageText.textContent = 'Free limit reached today. Upgrade to continue!';
            usageInfo.style.background = 'rgba(239, 68, 68, 0.1)';
        }
    } else if (!currentUser) {
        const remaining = 1 - guestUsage;
        usageText.textContent = `Free Trial: ${remaining} document remaining today`;
        usageInfo.style.display = 'block';
        
        if (remaining <= 0) {
            usageText.textContent = 'Free trial limit reached. Sign in or upgrade!';
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

// Event listeners
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
            <h3>1 file selected</h3>
            <p>${file.name}</p>
        `;
        updateProcessButton();
    } else {
        alert('Please select a valid JPG, PNG, or PDF file.');
    }
}

function handleCountryChange() {
    const selectedCountry = countrySelect.value;
    if (selectedCountry && countrySpecs[selectedCountry]) {
        const specs = countrySpecs[selectedCountry];
        specsDisplay.style.display = 'block';
        specsText.innerHTML = `
            <strong>${specs.name}</strong><br>
            Size: ${specs.width} × ${specs.height} ${specs.unit}<br>
            Resolution: ${specs.dpi} DPI<br>
            Background: ${specs.background}<br>
            Format: ${specs.format}<br>
            Max file size: ${specs.maxSize}
        `;
    } else {
        specsDisplay.style.display = 'none';
    }
    updateProcessButton();
}

function updateProcessButton() {
    processBtn.disabled = !(selectedFile && countrySelect.value);
}

async function processFile() {
    if (!selectedFile || !countrySelect.value) return;
    
    if (!checkUsageLimit()) {
        return;
    }

    processing.style.display = 'block';
    processBtn.disabled = true;
    
    const specs = countrySpecs[countrySelect.value];
    
    // Simulate AI processing (replace with real GPT API call for advanced features)
    progressFill.style.width = '100%';
    
    processedFile = await processImage(selectedFile, specs);
    
    processing.style.display = 'none';
    
    if (currentUser) {
        dailyUsage += 1;
    } else {
        guestUsage += 1;
    }
    saveUserUsage();
    updateUsageDisplay();
    
    showPreview();
}

async function processImage(file, specs) {
    return new Promise((resolve) => {
        // Mock GPT API integration for AI enhancements
        // Replace with actual API call to a service like OpenAI's GPT-4 Vision or a custom AI model
        console.log('Processing with GPT API (mock): Enhancing image quality, removing background...');
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            const pixelWidth = specs.unit === 'mm' ? 
                (specs.width * specs.dpi) / 25.4 : specs.width;
            const pixelHeight = specs.unit === 'mm' ? 
                (specs.height * specs.dpi) / 25.4 : specs.height;
            
            canvas.width = pixelWidth;
            canvas.height = pixelHeight;
            
            if (specs.background === 'white') {
                ctx.fillStyle = '#FFFFFF';
            } else if (specs.background === 'neutral') {
                ctx.fillStyle = '#F0F0F0';
            } else if (specs.background === 'light') {
                ctx.fillStyle = '#F8F8F8';
            }
            
            if (specs.background !== 'any') {
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            
            const scale = Math.max(
                canvas.width / img.width,
                canvas.height / img.height
            );
            
            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;
            const x = (canvas.width - scaledWidth) / 2;
            const y = (canvas.height - scaledHeight) / 2;
            
            ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
            
            canvas.toBlob((blob) => {
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

function showPreview() {
    previewGrid.innerHTML = '';
    
    const previewCard = document.createElement('div');
    previewCard.className = 'preview-card';
    previewCard.innerHTML = `
        <h4>Before</h4>
        <img src="${URL.createObjectURL(selectedFile)}" alt="Original">
        <h4 style="margin-top: 20px;">After</h4>
        <img src="${processedFile.url}" alt="Optimized">
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
            alert('Please sign in first to upgrade your plan.');
            return;
        }
        
        const priceIds = {
            'starter': 'price_starter_123', // Replace with your price ID
            'pro': 'price_pro_456'        // Replace with your price ID
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
                alert('Payment failed: ' + result.error.message);
            }
        });
    } else if (plan === 'enterprise') {
        alert('Please contact sales@documentpro.com for enterprise inquiries.');
    }
}

window.addEventListener('load', function() {
    console.log('Document Pro initialized successfully!');
    loadUserUsage();
});