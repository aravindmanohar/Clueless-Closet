// ==================== STORAGE CONSTANTS ====================
const STORAGE_KEY = 'clueless-closet-wardrobe';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const STORAGE_LIMIT = 5 * 1024 * 1024; // 5MB total limit

// ==================== APP STATE ====================
const app = {
    topwear: [],
    bottomwear: [],
    selectedTop: null,
    selectedBottom: null,
    savedOutfits: []
};

// ==================== STORAGE FUNCTIONS ====================

/**
 * Calculate localStorage usage
 */
function getStorageUsage() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return 0;
        // Rough estimate: 1 character ≈ 1 byte
        return Math.round((stored.length / 1024 / 1024) * 100) / 100;
    } catch (error) {
        return 0;
    }
}

/**
 * Save wardrobe data to localStorage
 */
function saveToLocalStorage() {
    try {
        const data = {
            topwear: app.topwear,
            bottomwear: app.bottomwear,
            savedOutfits: app.savedOutfits,
            savedAt: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        updateStorageInfo();
        console.log('✓ Data saved to localStorage');
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            showNotification('⚠️ Storage limit exceeded! Delete some items to free up space.', 'error');
        } else {
            showNotification('✗ Error saving data', 'error');
        }
        console.error('Storage error:', error);
    }
}

/**
 * Load wardrobe data from localStorage
 */
function loadFromLocalStorage() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const data = JSON.parse(stored);
            app.topwear = data.topwear || [];
            app.bottomwear = data.bottomwear || [];
            app.savedOutfits = data.savedOutfits || [];
            console.log('✓ Data loaded from localStorage');
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error loading data:', error);
        showNotification('✗ Error loading saved data', 'error');
        return false;
    }
}

/**
 * Update storage info display
 */
function updateStorageInfo() {
    const totalItems = app.topwear.length + app.bottomwear.length;
    document.getElementById('itemCount').textContent = totalItems;
    document.getElementById('outfitCount').textContent = app.savedOutfits.length;
    document.getElementById('storageUsed').textContent = getStorageUsage();
}

/**
 * Clear all data with confirmation
 */
function clearAllData() {
    if (confirm('⚠️ Are you sure you want to delete ALL saved items and outfits? This cannot be undone.')) {
        localStorage.removeItem(STORAGE_KEY);
        app.topwear = [];
        app.bottomwear = [];
        app.savedOutfits = [];
        app.selectedTop = null;
        app.selectedBottom = null;
        renderUI();
        showNotification('✓ All data cleared', 'success');
    }
}

/**
 * Convert image file to Base64 for storage
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Validate image file
 */
function validateImageFile(file) {
    const validTypes = ['image/jpeg', 'image/png'];
    
    if (!validTypes.includes(file.type)) {
        showNotification('✗ Only JPG and PNG images are supported', 'error');
        return false;
    }
    
    if (file.size > MAX_IMAGE_SIZE) {
        showNotification('✗ Image must be smaller than 5MB', 'error');
        return false;
    }
    
    return true;
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Show notification toast
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? '#E8F5E9' : type === 'error' ? '#FFEBEE' : '#F5F5F5';
    const textColor = type === 'success' ? '#2E7D32' : type === 'error' ? '#C62828' : '#666';
    const borderColor = type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : '#999';
    
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 6px;
        background-color: ${bgColor};
        color: ${textColor};
        border-left: 4px solid ${borderColor};
        font-size: 14px;
        font-weight: 500;
        z-index: 2000;
        animation: slideIn 0.3s ease;
        max-width: 300px;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Create error placeholder
 */
function createErrorPlaceholder() {
    const div = document.createElement('div');
    div.className = 'error-placeholder';
    div.innerHTML = '<div class="error-icon">⚠️</div><div>Unable to load image</div>';
    return div;
}

/**
 * Create image element with error handler
 */
function createImageElement(src, alt) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    img.loading = 'lazy';
    img.addEventListener('error', function() {
        if (this.parentNode) {
            this.parentNode.replaceChild(createErrorPlaceholder(), this);
        }
    });
    return img;
}

// ==================== ITEM MANAGEMENT ====================

/**
 * Add single item to wardrobe
 */
async function addItem() {
    const imageFile = document.getElementById('imageUpload').files[0];
    const brand = document.getElementById('brandInput').value.trim();
    const productName = document.getElementById('productNameInput').value.trim();
    const category = document.getElementById('categorySelect').value;
    const shoppingLink = document.getElementById('shoppingLinkInput').value.trim();

    if (!imageFile || !brand || !productName) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    if (!validateImageFile(imageFile)) {
        return;
    }

    try {
        const base64Image = await fileToBase64(imageFile);
        
        const newItem = {
            id: Date.now(),
            brand,
            name: productName,
            image: base64Image,
            link: shoppingLink || null,
            source: 'local',
            uploadedAt: new Date().toISOString()
        };

        if (category === 'topwear') {
            app.topwear.push(newItem);
        } else {
            app.bottomwear.push(newItem);
        }

        // Clear form
        document.getElementById('imageUpload').value = '';
        document.getElementById('brandInput').value = '';
        document.getElementById('productNameInput').value = '';
        document.getElementById('shoppingLinkInput').value = '';

        saveToLocalStorage();
        showNotification('✓ Item added successfully!', 'success');
        renderUI();
    } catch (error) {
        console.error('Error adding item:', error);
        showNotification('✗ Error processing image', 'error');
    }
}

/**
 * Bulk import multiple images
 */
async function bulkImportImages() {
    const files = document.getElementById('bulkImageImport').files;
    const category = document.getElementById('bulkCategorySelect').value;

    if (files.length === 0) {
        showNotification('Please select at least one image', 'error');
        return;
    }

    try {
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            if (!validateImageFile(file)) {
                failCount++;
                continue;
            }

            try {
                const base64Image = await fileToBase64(file);
                
                // Extract filename without extension as default name
                const fileName = file.name.split('.')[0];
                
                const newItem = {
                    id: Date.now() + i,
                    brand: 'Imported',
                    name: fileName,
                    image: base64Image,
                    link: null,
                    source: 'local',
                    uploadedAt: new Date().toISOString()
                };

                if (category === 'topwear') {
                    app.topwear.push(newItem);
                } else {
                    app.bottomwear.push(newItem);
                }

                successCount++;
            } catch (error) {
                console.error(`Error processing ${file.name}:`, error);
                failCount++;
            }
        }

        // Clear form
        document.getElementById('bulkImageImport').value = '';

        saveToLocalStorage();
        const message = failCount > 0 
            ? `✓ Imported ${successCount} items (${failCount} failed)`
            : `✓ Successfully imported ${successCount} items!`;
        showNotification(message, 'success');
        renderUI();
    } catch (error) {
        console.error('Bulk import error:', error);
        showNotification('✗ Error during bulk import', 'error');
    }
}

/**
 * Shuffle outfit
 */
function shuffleOutfit() {
    if (app.topwear.length === 0 || app.bottomwear.length === 0) {
        showNotification('Please add at least one top and one bottom first', 'error');
        return;
    }

    app.selectedTop = app.topwear[Math.floor(Math.random() * app.topwear.length)];
    app.selectedBottom = app.bottomwear[Math.floor(Math.random() * app.bottomwear.length)];
    renderOutfit();
}

/**
 * Save outfit
 */
function saveOutfit() {
    if (!app.selectedTop || !app.selectedBottom) {
        showNotification('Please select a complete outfit first', 'error');
        return;
    }

    const outfit = {
        id: Date.now(),
        top: app.selectedTop,
        bottom: app.selectedBottom
    };

    app.savedOutfits.push(outfit);
    saveToLocalStorage();
    showNotification('❤️ Outfit saved!', 'success');
    renderUI();
}

/**
 * Remove saved outfit
 */
function removeOutfit(outfitId) {
    app.savedOutfits = app.savedOutfits.filter(o => o.id !== outfitId);
    saveToLocalStorage();
    renderUI();
}

/**
 * Load saved outfit
 */
function loadSavedOutfit(outfitId) {
    const outfit = app.savedOutfits.find(o => o.id === outfitId);
    if (outfit) {
        app.selectedTop = outfit.top;
        app.selectedBottom = outfit.bottom;
        renderOutfit();
    }
}

/**
 * Export wardrobe as JSON
 */
function exportWardrobe() {
    const config = {
        topwear: app.topwear,
        bottomwear: app.bottomwear,
        savedOutfits: app.savedOutfits,
        exportDate: new Date().toISOString()
    };
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clueless-closet-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('✓ Wardrobe exported!', 'success');
}

/**
 * Import wardrobe from JSON
 */
function importWardrobe() {
    const input = document.getElementById('fileInput');
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const config = JSON.parse(event.target.result);
                app.topwear = config.topwear || [];
                app.bottomwear = config.bottomwear || [];
                app.savedOutfits = config.savedOutfits || [];
                saveToLocalStorage();
                renderUI();
                showNotification('✓ Wardrobe imported successfully!', 'success');
                closeSettings();
            } catch (error) {
                console.error('Import error:', error);
                showNotification('✗ Error importing config', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// ==================== RENDERING ====================

/**
 * Render entire UI
 */
function renderUI() {
    renderTopwear();
    renderBottomwear();
    renderOutfit();
    renderSavedOutfits();
    updateStorageInfo();
}

/**
 * Render topwear items
 */
function renderTopwear() {
    const grid = document.getElementById('topwearGrid');
    grid.innerHTML = '';
    
    if (app.topwear.length === 0) {
        grid.innerHTML = '<p style="font-size: 12px; color: var(--text-secondary); text-align: center; padding: 16px;">Add items in Settings</p>';
        return;
    }
    
    app.topwear.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = `item-thumbnail ${app.selectedTop?.id === item.id ? 'selected' : ''}`;
        div.appendChild(createImageElement(item.image, item.name));
        div.onclick = () => {
            app.selectedTop = item;
            renderOutfit();
        };
        div.style.animationDelay = `${index * 50}ms`;
        grid.appendChild(div);
    });
}

/**
 * Render bottomwear items
 */
function renderBottomwear() {
    const grid = document.getElementById('bottomwearGrid');
    grid.innerHTML = '';
    
    if (app.bottomwear.length === 0) {
        grid.innerHTML = '<p style="font-size: 12px; color: var(--text-secondary); text-align: center; padding: 16px;">Add items in Settings</p>';
        return;
    }
    
    app.bottomwear.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = `item-thumbnail ${app.selectedBottom?.id === item.id ? 'selected' : ''}`;
        div.appendChild(createImageElement(item.image, item.name));
        div.onclick = () => {
            app.selectedBottom = item;
            renderOutfit();
        };
        div.style.animationDelay = `${index * 50}ms`;
        grid.appendChild(div);
    });
}

/**
 * Render current outfit
 */
function renderOutfit() {
    const display = document.getElementById('outfitDisplay');
    const details = document.getElementById('outfitDetails');
    const saveBtn = document.getElementById('saveOutfitBtn');

    if (!app.selectedTop || !app.selectedBottom) {
        display.innerHTML = '<div class="empty-state"><p>👗</p><p>Select items from the sidebars to create an outfit</p></div>';
        details.style.display = 'none';
        saveBtn.style.display = 'none';
        return;
    }

    display.innerHTML = '';
    
    const topPiece = document.createElement('div');
    topPiece.className = 'outfit-piece';
    topPiece.appendChild(createImageElement(app.selectedTop.image, app.selectedTop.name));
    
    const bottomPiece = document.createElement('div');
    bottomPiece.className = 'outfit-piece';
    bottomPiece.appendChild(createImageElement(app.selectedBottom.image, app.selectedBottom.name));
    
    display.appendChild(topPiece);
    display.appendChild(bottomPiece);

    const topLink = app.selectedTop.link ? `<a href="${escapeHtml(app.selectedTop.link)}" target="_blank" rel="noopener">View on Shop →</a>` : '';
    const bottomLink = app.selectedBottom.link ? `<a href="${escapeHtml(app.selectedBottom.link)}" target="_blank" rel="noopener">View on Shop →</a>` : '';

    document.getElementById('topDetails').innerHTML = `
        <h4>${escapeHtml(app.selectedTop.brand)}</h4>
        <p>${escapeHtml(app.selectedTop.name)}</p>
        ${topLink}
    `;

    document.getElementById('bottomDetails').innerHTML = `
        <h4>${escapeHtml(app.selectedBottom.brand)}</h4>
        <p>${escapeHtml(app.selectedBottom.name)}</p>
        ${bottomLink}
    `;

    details.style.display = 'block';
    saveBtn.style.display = 'inline-flex';
    renderTopwear();
    renderBottomwear();
}

/**
 * Render saved outfits
 */
function renderSavedOutfits() {
    const container = document.getElementById('savedOutfits');
    const grid = document.getElementById('savedOutfitsGrid');

    if (app.savedOutfits.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    grid.innerHTML = '';

    app.savedOutfits.forEach((outfit, index) => {
        const card = document.createElement('div');
        card.className = 'saved-outfit-card';
        
        const preview = document.createElement('div');
        preview.className = 'saved-outfit-preview';
        
        const topImg = createImageElement(outfit.top.image, outfit.top.name);
        const bottomImg = createImageElement(outfit.bottom.image, outfit.bottom.name);
        
        preview.appendChild(topImg);
        preview.appendChild(bottomImg);
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-outfit-btn';
        removeBtn.textContent = '×';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            removeOutfit(outfit.id);
        };
        
        card.appendChild(removeBtn);
        card.appendChild(preview);
        card.onclick = () => loadSavedOutfit(outfit.id);
        card.style.animationDelay = `${index * 50}ms`;
        grid.appendChild(card);
    });
}

// ==================== MODAL CONTROLS ====================

/**
 * Open settings modal
 */
function openSettings() {
    updateStorageInfo();
    document.getElementById('settingsModal').classList.add('active');
}

/**
 * Close settings modal
 */
function closeSettings() {
    document.getElementById('settingsModal').classList.remove('active');
}

// ==================== EVENT LISTENERS ====================

document.getElementById('shuffleBtn').addEventListener('click', shuffleOutfit);
document.getElementById('settingsBtn').addEventListener('click', openSettings);
document.getElementById('closeSettingsBtn').addEventListener('click', closeSettings);
document.getElementById('addItemBtn').addEventListener('click', addItem);
document.getElementById('bulkImportBtn').addEventListener('click', bulkImportImages);
document.getElementById('saveOutfitBtn').addEventListener('click', saveOutfit);
document.getElementById('exportBtn').addEventListener('click', exportWardrobe);
document.getElementById('importBtn').addEventListener('click', importWardrobe);
document.getElementById('clearDataBtn').addEventListener('click', clearAllData);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSettings();
    if (e.key === ' ' && e.target === document.body) {
        e.preventDefault();
        shuffleOutfit();
    }
});

document.getElementById('settingsModal').addEventListener('click', (e) => {
    if (e.target.id === 'settingsModal') {
        closeSettings();
    }
});

// ==================== INITIALIZATION ====================

window.addEventListener('load', () => {
    if (!loadFromLocalStorage()) {
        console.log('No saved wardrobe found, starting fresh');
    }
    renderUI();
});
