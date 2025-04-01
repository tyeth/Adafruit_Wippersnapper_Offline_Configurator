
// Companion board configurations
const companionBoardConfigs = {
    'adalogger': {
        rtc: 'PCF8523',
        sdCardCS: 10,
        extras: 'SD Card'
    },
    'datalogger-m0': {
        rtc: 'PCF8523',
        sdCardCS: 10,
        extras: 'SD Card'
    },
    'ds3231-precision': {
        rtc: 'DS3231',
        sdCardCS: null,
        extras: 'None'
    },
    'ethernet': {
        rtc: null,
        sdCardCS: null,
        extras: 'Ethernet Controller'
    },
    'ina219': {
        rtc: null,
        sdCardCS: null,
        extras: 'INA219 Current Sensor'
    },
    'airlift': {
        rtc: null,
        sdCardCS: null,
        extras: 'WiFi Module'
    },
    'oled': {
        rtc: null,
        sdCardCS: null,
        extras: 'OLED Display'
    },
    'prop-maker': {
        rtc: null,
        sdCardCS: null,
        extras: 'NeoPixel, Amp, Accelerometer'
    },
    'neopixel': {
        rtc: null,
        sdCardCS: null,
        extras: 'NeoPixel Matrix'
    },
    'joy-featherwing': {
        rtc: null,
        sdCardCS: null,
        extras: 'Joystick, NeoPixel, Display'
    },
    'motorm4': {
        rtc: null,
        sdCardCS: null,
        extras: 'DC/Stepper Motor Controller'
    },
    'rgb-matrix': {
        rtc: null,
        sdCardCS: null,
        extras: 'RGB Matrix Driver'
    }
};

// // Sample components data - will be replaced by data from the JSON files
// let componentsData = {
//     i2c: [],
//     ds18x20: [],
//     pin: [],
//     pixel: [],
//     pwm: [],
//     servo: [],
//     uart: []
// };
let componentsData = appState.componentsData;

// // Global state
// const appState = {
//     selectedBoard: null,
//     companionBoard: null,
//     sdCardCS: null,
//     rtcType: 'soft',
//     statusLEDBrightness: 0.5,
//     i2cBuses: [],
//     i2cMultiplexers: [],
//     selectedComponents: [],
//     usedPins: new Set(),
//     nextComponentId: 1
// };

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Hide loading indicator once data is loaded
    document.getElementById('loading-indicator').classList.add('hidden');
    
    // Board selection handler
    document.getElementById('board-select').addEventListener('change', function() {
        const boardId = this.value;
        if (!boardId) {
            document.getElementById('board-details').classList.add('hidden');
            hideSubsequentSections();
            return;
        }
        
        const board = appState.boardsData[boardId];
        appState.selectedBoard = {
            id: boardId,
            ...board
        };
        
        // Update board details display
        document.getElementById('ref-voltage').textContent = board.referenceVoltage;
        document.getElementById('total-gpio').textContent = board.totalGPIOPins;
        document.getElementById('total-analog').textContent = board.totalAnalogPins;
        document.getElementById('default-scl').textContent = board.defaultI2C.scl;
        document.getElementById('default-sda').textContent = board.defaultI2C.sda;
        document.getElementById('board-details').classList.remove('hidden');
        
        // Set up default I2C bus
        appState.i2cBuses = [{
            id: 'default',
            scl: board.defaultI2C.scl,
            sda: board.defaultI2C.sda
        }];
        
        // Update default I2C bus display
        document.getElementById('default-i2c-scl').textContent = board.defaultI2C.scl;
        document.getElementById('default-i2c-sda').textContent = board.defaultI2C.sda;
        
        // Mark default I2C pins as used
        appState.usedPins.add(board.defaultI2C.scl);
        appState.usedPins.add(board.defaultI2C.sda);
        
        // Show companion board section and all subsequent sections
        document.getElementById('companion-board-section').classList.remove('hidden');
        document.getElementById('manual-config-section').classList.remove('hidden');
        document.getElementById('i2c-bus-section').classList.remove('hidden');
        document.getElementById('components-section').classList.remove('hidden');
        document.getElementById('selected-components-section').classList.remove('hidden');
        document.getElementById('generate-section').classList.remove('hidden');
        
        // Reset companion board selection but keep sections visible
        document.getElementById('companion-board-select').value = '';
        document.getElementById('companion-details').classList.add('hidden');
        
        // Initialize SD and RTC sections based on board
        initializeManualConfig();
        
        // Initialize pins lists for SD and I2C configuration
        populatePinsLists();
        
        // Initialize components sections
        populateComponentLists();
    });
    
    // Companion board selection handler
    document.getElementById('companion-board-select').addEventListener('change', function() {
        const companionId = this.value;
        appState.companionBoard = companionId ? { id: companionId, ...companionBoardConfigs[companionId] } : null;
        
        if (companionId) {
            const companion = companionBoardConfigs[companionId];
            
            // Update companion details display
            document.getElementById('companion-rtc').textContent = companion.rtc || 'None';
            document.getElementById('companion-sd-cs').textContent = companion.sdCardCS !== null ? companion.sdCardCS : 'None';
            document.getElementById('companion-extras').textContent = companion.extras;
            document.getElementById('companion-details').classList.remove('hidden');
            
            // Update SD card section
            if (companion.sdCardCS !== null) {
                appState.sdCardCS = companion.sdCardCS;
                document.getElementById('sd-missing').classList.add('hidden');
                document.getElementById('sd-present').classList.remove('hidden');
                document.getElementById('sd-cs-pin').textContent = companion.sdCardCS;
                
                // Mark SD CS pin as used
                appState.usedPins.add(companion.sdCardCS);
            } else {
                // Companion board doesn't provide SD card, show manual config
                document.getElementById('sd-missing').classList.remove('hidden');
                document.getElementById('sd-present').classList.add('hidden');
                appState.sdCardCS = null;
            }
            
            // Update RTC section
            if (companion.rtc) {
                appState.rtcType = companion.rtc;
                document.getElementById('rtc-missing').classList.add('hidden');
                document.getElementById('rtc-present').classList.remove('hidden');
                document.getElementById('rtc-type').textContent = companion.rtc;
            } else {
                // Companion board doesn't provide RTC, show manual config
                document.getElementById('rtc-missing').classList.remove('hidden');
                document.getElementById('rtc-present').classList.add('hidden');
                appState.rtcType = 'soft';
                document.getElementById('rtc-select').value = 'soft';
            }
        } else {
            document.getElementById('companion-details').classList.add('hidden');
            
            // Reset SD card and RTC sections to manual configuration
            document.getElementById('sd-missing').classList.remove('hidden');
            document.getElementById('sd-present').classList.add('hidden');
            document.getElementById('rtc-missing').classList.remove('hidden');
            document.getElementById('rtc-present').classList.add('hidden');
            
            appState.sdCardCS = null;
            appState.rtcType = 'soft';
            document.getElementById('rtc-select').value = 'soft';
        }
        
        // Refresh pin lists to reflect used pins
        populatePinsLists();
    });
    
    // Add SD card checkbox handler
    document.getElementById('add-sd-card').addEventListener('change', function() {
        if (this.checked) {
            document.getElementById('sd-card-pin-select').classList.remove('hidden');
        } else {
            document.getElementById('sd-card-pin-select').classList.add('hidden');
            appState.sdCardCS = null;
        }
    });
    
    // RTC type selection handler
    document.getElementById('rtc-select').addEventListener('change', function() {
        appState.rtcType = this.value;
    });
    
    // LED brightness slider handler
    document.getElementById('led-brightness').addEventListener('input', function() {
        const value = parseFloat(this.value);
        appState.statusLEDBrightness = value;
        document.getElementById('brightness-value').textContent = value.toFixed(1);
    });
    
    // Add additional I2C bus checkbox handler
    document.getElementById('add-i2c-bus').addEventListener('change', function() {
        if (this.checked) {
            document.getElementById('additional-i2c-config').classList.remove('hidden');
        } else {
            document.getElementById('additional-i2c-config').classList.add('hidden');
            
            // Remove additional I2C bus if unchecked
            const additionalBusIndex = appState.i2cBuses.findIndex(bus => bus.id !== 'default');
            if (additionalBusIndex !== -1) {
                // Free up the pins
                const bus = appState.i2cBuses[additionalBusIndex];
                appState.usedPins.delete(bus.scl);
                appState.usedPins.delete(bus.sda);
                
                // Remove the bus
                appState.i2cBuses.splice(additionalBusIndex, 1);
                
                // Update I2C bus select options
                updateI2CBusOptions();
            }
        }
    });
    
    // Add I2C Multiplexer button handler
    document.getElementById('add-mux-btn').addEventListener('click', function() {
        showAddMultiplexerModal();
    });
    
    // Generate Configuration button handler
    document.getElementById('generate-config-btn').addEventListener('click', function() {
        generateConfiguration();
    });
    
    // Download Configuration button handler
    document.getElementById('download-config-btn').addEventListener('click', function() {
        downloadConfiguration();
    });
    
    // Import Configuration button handler
    document.getElementById('import-btn').addEventListener('click', function() {
        importConfiguration();
    });
    
    // Export Configuration button handler
    document.getElementById('export-btn').addEventListener('click', function() {
        downloadConfiguration(true);
    });
    
    // Modal cancel button handler
    document.getElementById('modal-cancel').addEventListener('click', function() {
        closeModal();
    });
    
    // Modal save button handler
    document.getElementById('modal-save').addEventListener('click', function() {
        saveModalData();
    });

    // Component search functionality
    document.querySelectorAll('.component-search').forEach(searchInput => {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const componentType = this.id.split('-')[0]; // Extract type from ID (e.g., "i2c" from "i2c-search")
            const componentList = document.getElementById(`${componentType}-component-list`);
            
            // Filter components
            const components = componentList.querySelectorAll('.component-card');
            components.forEach(component => {
                const componentName = component.querySelector('h4').textContent.toLowerCase();
                const shouldShow = componentName.includes(searchTerm);
                component.style.display = shouldShow ? 'block' : 'none';
            });
        });
    });
});

// Helper functions
function hideSubsequentSections() {
    document.getElementById('companion-board-section').classList.add('hidden');
    document.getElementById('manual-config-section').classList.add('hidden');
    document.getElementById('i2c-bus-section').classList.add('hidden');
    document.getElementById('components-section').classList.add('hidden');
    document.getElementById('selected-components-section').classList.add('hidden');
    document.getElementById('generate-section').classList.add('hidden');
}

function resetSubsequentSelections() {
    // Reset companion board selection
    document.getElementById('companion-board-select').value = '';
    document.getElementById('companion-details').classList.add('hidden');
    
    // Reset manual config
    document.getElementById('add-sd-card').checked = false;
    document.getElementById('sd-card-pin-select').classList.add('hidden');
    document.getElementById('rtc-select').value = 'soft';
    document.getElementById('led-brightness').value = 0.5;
    document.getElementById('brightness-value').textContent = '0.5';
    
    // Reset I2C bus config
    document.getElementById('add-i2c-bus').checked = false;
    document.getElementById('additional-i2c-config').classList.add('hidden');
    
    // Reset component selections
    appState.selectedComponents = [];
    appState.i2cMultiplexers = [];
    updateSelectedComponentsList();
    
    // Reset used pins to just the default I2C pins
    appState.usedPins = new Set();
    if (appState.selectedBoard) {
        appState.usedPins.add(appState.selectedBoard.defaultI2C.scl);
        appState.usedPins.add(appState.selectedBoard.defaultI2C.sda);
    }
}

function initializeManualConfig() {
    // Initialize SD card section
    document.getElementById('sd-missing').classList.remove('hidden');
    document.getElementById('sd-present').classList.add('hidden');
    
    // Initialize RTC section
    document.getElementById('rtc-missing').classList.remove('hidden');
    document.getElementById('rtc-present').classList.add('hidden');
    
    // Initialize LED brightness
    document.getElementById('led-brightness').value = 0.5;
    document.getElementById('brightness-value').textContent = '0.5';
    appState.statusLEDBrightness = 0.5;
}

function populatePinsLists() {
    if (!appState.selectedBoard) return;
    
    const pins = appState.selectedBoard.pins;
    
    // Populate SD card pins list
    const sdPinsList = document.getElementById('sd-pins-list');
    sdPinsList.innerHTML = '';
    pins.forEach(pin => {
        const pinElem = document.createElement('div');
        pinElem.className = 'pin' + (appState.usedPins.has(pin) ? ' used' : '');
        pinElem.textContent = pin;
        
        if (!appState.usedPins.has(pin)) {
            pinElem.addEventListener('click', function() {
                // Deselect any previously selected SD CS pin
                if (appState.sdCardCS !== null) {
                    appState.usedPins.delete(appState.sdCardCS);
                }
                
                // Set new SD CS pin
                appState.sdCardCS = pin;
                appState.usedPins.add(pin);
                
                // Update pin selection UI
                const allPins = sdPinsList.querySelectorAll('.pin');
                allPins.forEach(p => p.classList.remove('selected'));
                pinElem.classList.add('selected');
                
                // Refresh other pin lists
                populatePinsLists();
            });
        }
        
        sdPinsList.appendChild(pinElem);
    });
    
    // Populate SCL pins list for additional I2C bus
    const sclPinsList = document.getElementById('scl-pins-list');
    sclPinsList.innerHTML = '';
    pins.forEach(pin => {
        const pinElem = document.createElement('div');
        pinElem.className = 'pin' + (appState.usedPins.has(pin) ? ' used' : '');
        pinElem.textContent = pin;
        
        if (!appState.usedPins.has(pin)) {
            pinElem.addEventListener('click', function() {
                // Find additional I2C bus or create it
                let additionalBus = appState.i2cBuses.find(bus => bus.id !== 'default');
                if (additionalBus) {
                    // Free up old SCL pin if it exists
                    if (additionalBus.scl !== undefined) {
                        appState.usedPins.delete(additionalBus.scl);
                    }
                    
                    // Set new SCL pin
                    additionalBus.scl = pin;
                } else {
                    // Create new additional bus
                    additionalBus = {
                        id: 'additional',
                        scl: pin,
                        sda: undefined
                    };
                    appState.i2cBuses.push(additionalBus);
                }
                
                // Mark pin as used
                appState.usedPins.add(pin);
                
                // Update pin selection UI
                const allPins = sclPinsList.querySelectorAll('.pin');
                allPins.forEach(p => p.classList.remove('selected'));
                pinElem.classList.add('selected');
                
                // Refresh other pin lists
                populatePinsLists();
                
                // Update I2C bus dropdown in components section
                if (additionalBus.sda !== undefined) {
                    updateI2CBusOptions();
                }
            });
        }
        
        sclPinsList.appendChild(pinElem);
    });
    
    // Populate SDA pins list for additional I2C bus
    const sdaPinsList = document.getElementById('sda-pins-list');
    sdaPinsList.innerHTML = '';
    pins.forEach(pin => {
        const pinElem = document.createElement('div');
        pinElem.className = 'pin' + (appState.usedPins.has(pin) ? ' used' : '');
        pinElem.textContent = pin;
        
        if (!appState.usedPins.has(pin)) {
            pinElem.addEventListener('click', function() {
                // Find additional I2C bus or create it
                let additionalBus = appState.i2cBuses.find(bus => bus.id !== 'default');
                if (additionalBus) {
                    // Free up old SDA pin if it exists
                    if (additionalBus.sda !== undefined) {
                        appState.usedPins.delete(additionalBus.sda);
                    }
                    
                    // Set new SDA pin
                    additionalBus.sda = pin;
                } else {
                    // Create new additional bus
                    additionalBus = {
                        id: 'additional',
                        scl: undefined,
                        sda: pin
                    };
                    appState.i2cBuses.push(additionalBus);
                }
                
                // Mark pin as used
                appState.usedPins.add(pin);
                
                // Update pin selection UI
                const allPins = sdaPinsList.querySelectorAll('.pin');
                allPins.forEach(p => p.classList.remove('selected'));
                pinElem.classList.add('selected');
                
                // Refresh other pin lists
                populatePinsLists();
                
                // Update I2C bus dropdown in components section
                if (additionalBus.scl !== undefined) {
                    updateI2CBusOptions();
                }
            });
        }
        
        sdaPinsList.appendChild(pinElem);
    });
}

function updateI2CBusOptions() {
    const i2cBusSelect = document.getElementById('i2c-bus-select');
    i2cBusSelect.innerHTML = '';
    
    appState.i2cBuses.forEach(bus => {
        if (bus.scl !== undefined && bus.sda !== undefined) {
            const option = document.createElement('option');
            option.value = bus.id;
            option.textContent = bus.id === 'default' ? 
                'Default I2C Bus (SCL: ' + bus.scl + ', SDA: ' + bus.sda + ')' : 
                'Additional I2C Bus (SCL: ' + bus.scl + ', SDA: ' + bus.sda + ')';
            i2cBusSelect.appendChild(option);
        }
    });
    
    // Add options for each multiplexer channel
    appState.i2cMultiplexers.forEach(mux => {
        for (let i = 0; i < mux.channels; i++) {
            const option = document.createElement('option');
            const busId = `mux-${mux.id}-ch-${i}`;
            option.value = busId;
            option.textContent = `Multiplexer ${mux.address} - Channel ${i}`;
            i2cBusSelect.appendChild(option);
        }
    });
}

function populateComponentLists() {
    // Populate I2C components
    const i2cList = document.getElementById('i2c-component-list');
    i2cList.innerHTML = '';
    appState.componentsData.i2c.forEach(component => {
        const card = createComponentCard(component, 'i2c');
        i2cList.appendChild(card);
    });
    
    // Populate DS18x20 components
    const ds18x20List = document.getElementById('ds18x20-component-list');
    ds18x20List.innerHTML = '';
    appState.componentsData.ds18x20.forEach(component => {
        const card = createComponentCard(component, 'ds18x20');
        ds18x20List.appendChild(card);
    });
    
    // Populate Pin components
    const pinList = document.getElementById('pin-component-list');
    pinList.innerHTML = '';
    appState.componentsData.pin.forEach(component => {
        const card = createComponentCard(component, 'pin');
        pinList.appendChild(card);
    });
    
    // Populate Pixel components
    const pixelList = document.getElementById('pixel-component-list');
    pixelList.innerHTML = '';
    appState.componentsData.pixel.forEach(component => {
        const card = createComponentCard(component, 'pixel');
        pixelList.appendChild(card);
    });
    
    // Populate PWM components
    const pwmList = document.getElementById('pwm-component-list');
    pwmList.innerHTML = '';
    appState.componentsData.pwm.forEach(component => {
        const card = createComponentCard(component, 'pwm');
        pwmList.appendChild(card);
    });
    
    // Populate Servo components
    const servoList = document.getElementById('servo-component-list');
    servoList.innerHTML = '';
    appState.componentsData.servo.forEach(component => {
        const card = createComponentCard(component, 'servo');
        servoList.appendChild(card);
    });
    
    // Populate UART components
    const uartList = document.getElementById('uart-component-list');
    uartList.innerHTML = '';
    appState.componentsData.uart.forEach(component => {
        const card = createComponentCard(component, 'uart');
        uartList.appendChild(card);
    });
    
    // Update I2C bus options
    updateI2CBusOptions();
}

function createComponentCard(component, type) {
    const card = document.createElement('div');
    card.className = 'component-card';
    card.dataset.id = component.id;
    card.dataset.type = type;
    
    // Add image if available
    if (component.image) {
        const img = document.createElement('img');
        img.src = "https://raw.githubusercontent.com/adafruit/Wippersnapper_Components/refs/heads/main/" + component.image;
        img.alt = component.name;
        card.appendChild(img);
    }
    
    const title = document.createElement('h4');
    title.textContent = component.name;
    card.appendChild(title);
    
    if (type === 'i2c' && component.address) {
        const address = document.createElement('p');
        address.textContent = `Address: ${component.address}`;
        card.appendChild(address);
    }
    
    if (component.dataTypes && component.dataTypes.length > 0) {
        const dataTypes = document.createElement('p');
        dataTypes.textContent = `Data Types: ${component.dataTypes.length}`;
        card.appendChild(dataTypes);
    }
    
    const addBtn = document.createElement('button');
    addBtn.textContent = 'Add Component';
    addBtn.addEventListener('click', function() {
        showComponentConfigModal(component, type);
    });
    card.appendChild(addBtn);
    
    return card;
}

function showComponentConfigModal(component, type) {
    const modal = document.getElementById('component-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    
    // Set modal title
    modalTitle.textContent = `Configure ${component.name}`;
    
    // Clear previous content
    modalContent.innerHTML = '';
    
    // Build configuration form based on component type
    let html = '<form id="component-config-form">';
    
    // Common fields
    html += `
        <div>
            <label for="component-name">Component Name:</label>
            <input type="text" id="component-name" value="${component.name}" required>
        </div>
        <div>
            <label for="component-period">Polling Period (seconds):</label>
            <input type="number" id="component-period" value="30" min="1" required>
        </div>
    `;
    
    // Component-specific fields
    if (type === 'i2c') {
        // I2C bus selection
        html += `
            <div>
                <label for="modal-i2c-bus">I2C Bus:</label>
                <select id="modal-i2c-bus" required>
        `;
        
        // Add options for each configured I2C bus
        appState.i2cBuses.forEach(bus => {
            if (bus.scl !== undefined && bus.sda !== undefined) {
                html += `<option value="${bus.id}">${bus.id === 'default' ? 
                    'Default I2C Bus (SCL: ' + bus.scl + ', SDA: ' + bus.sda + ')' : 
                    'Additional I2C Bus (SCL: ' + bus.scl + ', SDA: ' + bus.sda + ')'}</option>`;
            }
        });
        
        // Add options for each multiplexer channel
        appState.i2cMultiplexers.forEach(mux => {
            for (let i = 0; i < mux.channels; i++) {
                const busId = `mux-${mux.id}-ch-${i}`;
                html += `<option value="${busId}">Multiplexer ${mux.address} - Channel ${i}</option>`;
            }
        });
        
        html += `
            </select>
        </div>
        `;
        
        // I2C Address
        html += `
            <div>
                <label for="modal-i2c-address">I2C Address:</label>
                <input type="text" id="modal-i2c-address" value="${component.address}" required>
            </div>
        `;
        
        // Special case for multiplexers
        if (component.id === 'pca9546' || component.id === 'pca9548' || 
            component.id === 'tca9546' || component.id === 'tca9548') {
            
            const defaultChannels = component.id.includes('9548') ? 8 : 4;
            
            html += `
                <div>
                    <label for="modal-mux-channels">Number of Channels:</label>
                    <input type="number" id="modal-mux-channels" value="${component.channels || defaultChannels}" min="1" max="${defaultChannels}" required readonly>
                    <p><small>This multiplexer has ${defaultChannels} channels</small></p>
                </div>
            `;
        }
    } else if (type === 'ds18x20' || type === 'pin' || type === 'pixel' || type === 'pwm' || type === 'servo') {
        // Pin selection for other component types
        html += `
            <div>
                <label for="modal-pin-select">Select Pin:</label>
                <select id="modal-pin-select" required>
                    <option value="">-- Select a Pin --</option>
        `;
        
        // Add available pins
        if (appState.selectedBoard) {
            appState.selectedBoard.pins.forEach(pin => {
                if (!appState.usedPins.has(pin)) {
                    html += `<option value="${pin}">Pin ${pin}</option>`;
                }
            });
        }
        
        html += `
                </select>
            </div>
        `;
        
        // Additional fields for pixel components
        if (type === 'pixel') {
            html += `
                <div>
                    <label for="modal-pixel-count">Number of Pixels:</label>
                    <input type="number" id="modal-pixel-count" value="1" min="1" required>
                </div>
            `;
        }
    } else if (type === 'uart') {
        // UART pin selection
        html += `
            <div>
                <label for="modal-uart-tx">TX Pin:</label>
                <select id="modal-uart-tx" required>
                    <option value="">-- Select TX Pin --</option>
        `;
        
        // Add available pins for TX
        if (appState.selectedBoard) {
            appState.selectedBoard.pins.forEach(pin => {
                if (!appState.usedPins.has(pin)) {
                    html += `<option value="${pin}">Pin ${pin}</option>`;
                }
            });
        }
        
        html += `
                </select>
            </div>
            <div>
                <label for="modal-uart-rx">RX Pin:</label>
                <select id="modal-uart-rx" required>
                    <option value="">-- Select RX Pin --</option>
        `;
        
        // Add available pins for RX
        if (appState.selectedBoard) {
            appState.selectedBoard.pins.forEach(pin => {
                if (!appState.usedPins.has(pin) && pin !== parseInt(document.getElementById('modal-uart-tx')?.value)) {
                    html += `<option value="${pin}">Pin ${pin}</option>`;
                }
            });
        }
        
        html += `
                </select>
            </div>
        `;
    }
    
    // Data type selection
    if (component.dataTypes && component.dataTypes.length > 0) {
        html += `
            <div>
                <h4>Select Data Types:</h4>
                <div id="data-type-checkboxes">
        `;
        
        component.dataTypes.forEach(dataType => {
            const displayName = typeof dataType === 'string' ? 
                dataType : (dataType.displayName || dataType.sensorType);
            const value = typeof dataType === 'string' ? 
                dataType : JSON.stringify(dataType);
            
            html += `
                <div>
                    <label>
                        <input type="checkbox" name="data-type" value='${value}' checked>
                        ${displayName}
                    </label>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    html += '</form>';
    
    modalContent.innerHTML = html;
    
    // Store component info for use when saving
    modalContent.dataset.componentId = component.id;
    modalContent.dataset.componentType = type;
    
    // Show the modal
    modal.style.display = 'block';
}

function closeModal() {
    const modal = document.getElementById('component-modal');
    modal.style.display = 'none';
}

function saveModalData() {
    const modalContent = document.getElementById('modal-content');
    const componentId = modalContent.dataset.componentId;
    const componentType = modalContent.dataset.componentType;
    
    // Get component template
    const componentTemplate = componentsData[componentType].find(c => c.id === componentId);
    
    // Get form values
    const name = document.getElementById('component-name').value;
    const period = parseInt(document.getElementById('component-period').value);
    
    // Initialize component config
    const componentConfig = {
        instanceId: appState.nextComponentId++,
        name: name,
        componentAPI: componentType,
        period: period
    };
    
    // Special handling for I2C
    if (componentType === 'i2c') {
        const i2cBus = document.getElementById('modal-i2c-bus').value;
        const i2cAddress = document.getElementById('modal-i2c-address').value;
        
        componentConfig.i2cDeviceName = componentId;
        componentConfig.i2cDeviceAddress = i2cAddress;
        
        // Handle multiplexer channel if selected
        if (i2cBus.startsWith('mux-')) {
            const [_, muxId, __, channelNum] = i2cBus.split('-');
            const mux = appState.i2cMultiplexers.find(m => m.id === parseInt(muxId));
            
            if (mux) {
                componentConfig.i2cMuxAddress = mux.address;
                componentConfig.i2cMuxChannel = channelNum;
            }
        } else if (i2cBus === 'additional') {
            // Add SCL/SDA for additional bus
            const additionalBus = appState.i2cBuses.find(b => b.id === 'additional');
            if (additionalBus) {
                componentConfig.i2cBusScl = additionalBus.scl.toString();
                componentConfig.i2cBusSda = additionalBus.sda.toString();
            }
        }
        
        // Special case for multiplexers
        if (componentId === 'pca9546' || componentId === 'pca9548' || 
            componentId === 'tca9546' || componentId === 'tca9548') {
            
            const channels = parseInt(document.getElementById('modal-mux-channels').value);
            
            // Add to multiplexers list
            const muxConfig = {
                id: appState.nextComponentId - 1, // Use the same ID assigned to componentConfig
                address: i2cAddress,
                channels: channels
            };
            
            appState.i2cMultiplexers.push(muxConfig);
            
            // Update I2C bus options
            updateI2CBusOptions();
            
            // Remove any components using this multiplexer
            appState.selectedComponents = appState.selectedComponents.filter(c => 
                !(c.i2cMuxAddress && c.i2cMuxAddress === componentConfig.i2cDeviceAddress));
        } else {
            // Add data types for non-multiplexer components
            const dataTypeCheckboxes = document.querySelectorAll('input[name="data-type"]:checked');
            if (dataTypeCheckboxes.length > 0) {
                componentConfig.i2cDeviceSensorTypes = Array.from(dataTypeCheckboxes).map(checkbox => {
                    try {
                        return { type: JSON.parse(checkbox.value) };
                    } catch (e) {
                        return { type: checkbox.value };
                    }
                });
            }
        }
    } else if (componentType === 'ds18x20') {
        const pin = document.getElementById('modal-pin-select').value;
        
        componentConfig.pinName = `D${pin}`;
        componentConfig.sensorResolution = 12;
        
        // Mark pin as used
        appState.usedPins.add(parseInt(pin));
        
        // Add data types
        const dataTypeCheckboxes = document.querySelectorAll('input[name="data-type"]:checked');
        if (dataTypeCheckboxes.length > 0) {
            componentConfig.sensorTypeCount = dataTypeCheckboxes.length;
            
            // Add each sensor type
            Array.from(dataTypeCheckboxes).forEach((checkbox, index) => {
                const typeValue = checkbox.value.replace(/"/g, '');
                componentConfig[`sensorType${index + 1}`] = typeValue;
            });
        }
    } else if (componentType === 'pin' || componentType === 'pwm' || componentType === 'servo') {
        const pin = document.getElementById('modal-pin-select').value;
        
        componentConfig.pinName = `D${pin}`;
        
        // Mark pin as used
        appState.usedPins.add(parseInt(pin));
    } else if (componentType === 'pixel') {
        const pin = document.getElementById('modal-pin-select').value;
        const pixelCount = document.getElementById('modal-pixel-count').value;
        
        componentConfig.pinName = `D${pin}`;
        componentConfig.numPixels = parseInt(pixelCount);
        
        // Mark pin as used
        appState.usedPins.add(parseInt(pin));
    } else if (componentType === 'uart') {
        const txPin = document.getElementById('modal-uart-tx').value;
        const rxPin = document.getElementById('modal-uart-rx').value;
        
        componentConfig.txPin = `D${txPin}`;
        componentConfig.rxPin = `D${rxPin}`;
        
        // Mark pins as used
        appState.usedPins.add(parseInt(txPin));
        appState.usedPins.add(parseInt(rxPin));
        
        // Add data types
        const dataTypeCheckboxes = document.querySelectorAll('input[name="data-type"]:checked');
        if (dataTypeCheckboxes.length > 0) {
            componentConfig.sensorTypes = Array.from(dataTypeCheckboxes).map(checkbox => {
                try {
                    return JSON.parse(checkbox.value);
                } catch (e) {
                    return checkbox.value;
                }
            });
        }
    }
    
    // Add component to the selected components list
    appState.selectedComponents.push(componentConfig);
    
    // Update the selected components list
    updateSelectedComponentsList();
    
    // Refresh pin lists
    populatePinsLists();
    
    // Close the modal
    closeModal();
}

function showAddMultiplexerModal() {
    // Check if there are I2C buses available
    if (appState.i2cBuses.length === 0) {
        alert('No I2C buses available. Please configure an I2C bus first.');
        return;
    }
    
    // Find the multiplexer components
    const multiplexers = appState.componentsData.i2c.filter(c => 
        c.id === 'pca9546' || c.id === 'pca9548' || 
        c.id === 'tca9546' || c.id === 'tca9548'
    );
    
    if (multiplexers.length === 0) {
        alert('No multiplexer components found in the component data.');
        return;
    }
    
    // Show component config modal for the first multiplexer
    showComponentConfigModal(multiplexers[0], 'i2c');
}

function updateSelectedComponentsList() {
    const selectedList = document.getElementById('selected-components-list');
    
    if (appState.selectedComponents.length === 0) {
        selectedList.innerHTML = '<p>No components selected yet.</p>';
        return;
    }
    
    let html = '<ul class="component-details-list">';
    
    appState.selectedComponents.forEach(component => {
        let detailsText = '';
        
        // Show connection details based on component type
        if (component.componentAPI === 'i2c') {
            // Base I2C information
            detailsText += `<br>Address: ${component.i2cDeviceAddress}`;
            
            // Show bus information
            if (component.i2cBusScl && component.i2cBusSda) {
                detailsText += `<br>Bus: Custom (SCL: ${component.i2cBusScl}, SDA: ${component.i2cBusSda})`;
            } else if (component.i2cMuxAddress) {
                detailsText += `<br>Connected to: Multiplexer ${component.i2cMuxAddress} - Channel ${component.i2cMuxChannel}`;
            } else {
                // Default bus
                const defaultBus = appState.i2cBuses.find(bus => bus.id === 'default');
                if (defaultBus) {
                    detailsText += `<br>Bus: Default (SCL: ${defaultBus.scl}, SDA: ${defaultBus.sda})`;
                }
            }
            
            // Show sensor types
            if (component.i2cDeviceSensorTypes && component.i2cDeviceSensorTypes.length > 0) {
                detailsText += '<br>Data types: ';
                component.i2cDeviceSensorTypes.forEach((sensor, index) => {
                    const sensorType = typeof sensor.type === 'object' ? 
                        sensor.type.displayName || sensor.type.sensorType : sensor.type;
                    detailsText += (index > 0 ? ', ' : '') + sensorType;
                });
            }
        } else if (component.componentAPI === 'ds18x20') {
            detailsText += `<br>Pin: ${component.pinName}`;
            detailsText += `<br>Resolution: ${component.sensorResolution}-bit`;
            
            // Show sensor types
            const sensorTypes = [];
            for (let i = 1; i <= component.sensorTypeCount; i++) {
                if (component[`sensorType${i}`]) {
                    sensorTypes.push(component[`sensorType${i}`]);
                }
            }
            
            if (sensorTypes.length > 0) {
                detailsText += '<br>Data types: ' + sensorTypes.join(', ');
            }
        } else if (component.componentAPI === 'pin' || component.componentAPI === 'pwm' || component.componentAPI === 'servo') {
            detailsText += `<br>Pin: ${component.pinName}`;
        } else if (component.componentAPI === 'pixel') {
            detailsText += `<br>Pin: ${component.pinName}`;
            detailsText += `<br>Pixels: ${component.numPixels}`;
        } else if (component.componentAPI === 'uart') {
            detailsText += `<br>TX Pin: ${component.txPin}, RX Pin: ${component.rxPin}`;
            
            // Show sensor types
            if (component.sensorTypes && component.sensorTypes.length > 0) {
                detailsText += '<br>Data types: ';
                component.sensorTypes.forEach((sensor, index) => {
                    const sensorType = typeof sensor === 'object' ? 
                        sensor.displayName || sensor.sensorType : sensor;
                    detailsText += (index > 0 ? ', ' : '') + sensorType;
                });
            }
        }
        
        // Add polling period
        detailsText += `<br>Polling period: ${component.period} seconds`;
        
        html += `<li>
            <div class="component-item">
                <div class="component-info">
                    <strong>${component.name}</strong> (${component.componentAPI})
                    ${detailsText}
                </div>
                <div class="component-actions">
                    <button onclick="removeComponent(${component.instanceId})">Remove</button>
                </div>
            </div>
        </li>`;
    });
    
    html += '</ul>';
    selectedList.innerHTML = html;
}

function removeComponent(instanceId) {
    // Find the component
    const componentIndex = appState.selectedComponents.findIndex(c => c.instanceId === instanceId);
    if (componentIndex === -1) return;
    
    const component = appState.selectedComponents[componentIndex];
    
    // Free up pins used by this component
    if (component.pinName) {
        const pinNumber = parseInt(component.pinName.replace('D', ''));
        appState.usedPins.delete(pinNumber);
    }
    
    if (component.txPin) {
        const txPinNumber = parseInt(component.txPin.replace('D', ''));
        appState.usedPins.delete(txPinNumber);
    }
    
    if (component.rxPin) {
        const rxPinNumber = parseInt(component.rxPin.replace('D', ''));
        appState.usedPins.delete(rxPinNumber);
    }
    
    // Check if this is a multiplexer and remove it from the multiplexers list
    if (component.componentAPI === 'i2c' && 
        (component.i2cDeviceName === 'pca9546' || component.i2cDeviceName === 'pca9548' ||
         component.i2cDeviceName === 'tca9546' || component.i2cDeviceName === 'tca9548')) {
        
        const muxIndex = appState.i2cMultiplexers.findIndex(m => m.id === component.instanceId);
        if (muxIndex !== -1) {
            appState.i2cMultiplexers.splice(muxIndex, 1);
            
            // Update I2C bus options
            updateI2CBusOptions();
            
            // Remove any components using this multiplexer
            appState.selectedComponents = appState.selectedComponents.filter(c => 
                !(c.i2cMuxAddress && c.i2cMuxAddress === component.i2cDeviceAddress));
        }
    }
    
    // Remove the component
    appState.selectedComponents.splice(componentIndex, 1);
    
    // Update the selected components list
    updateSelectedComponentsList();
    
    // Refresh pin lists
    populatePinsLists();
}

function generateConfiguration() {
    // Check if a board is selected
    if (!appState.selectedBoard) {
        alert('Please select a board before generating configuration.');
        return;
    }
    
    // Check if there are any components
    if (appState.selectedComponents.length === 0) {
        alert('Please add at least one component before generating configuration.');
        return;
    }
    
    // Build the configuration object
    const config = {
        exportedFromDevice: {
            referenceVoltage: appState.selectedBoard.referenceVoltage,
            totalGPIOPins: appState.selectedBoard.totalGPIOPins,
            totalAnalogPins: appState.selectedBoard.totalAnalogPins,
            statusLEDBrightness: appState.statusLEDBrightness
        },
        components: []
    };
    
    // Add SD card CS pin if present
    if (appState.sdCardCS !== null) {
        config.exportedFromDevice.sd_cs_pin = appState.sdCardCS;
    }
    
    // Add RTC type if not 'soft'
    if (appState.rtcType !== 'soft') {
        config.exportedFromDevice.rtc = appState.rtcType;
    }
    
    // Add components
    appState.selectedComponents.forEach(component => {
        // Create a clean component object without the instanceId
        const cleanComponent = {...component};
        delete cleanComponent.instanceId;
        
        config.components.push(cleanComponent);
    });
    
    // Convert to formatted JSON and display
    const jsonOutput = JSON.stringify(config, null, 4);
    document.getElementById('config-output').textContent = jsonOutput;
    document.getElementById('config-output-container').classList.remove('hidden');
    
    // Also update the export tab
    document.getElementById('export-config').textContent = jsonOutput;
}

function downloadConfiguration(fromExportTab = false) {
    // Get the configuration JSON
    const configText = fromExportTab ? 
        document.getElementById('export-config').textContent : 
        document.getElementById('config-output').textContent;
    
    if (configText === 'No configuration generated yet.') {
        alert('Please generate a configuration first.');
        return;
    }
    
    // Create a Blob with the configuration
    const blob = new Blob([configText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create a download link and trigger it
    const a = document.createElement('a');
    a.href = url;
    a.download = 'config.json';
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importConfiguration() {
    const jsonText = document.getElementById('import-json').value.trim();
    if (!jsonText) {
        alert('Please paste a valid JSON configuration.');
        return;
    }
    
    try {
        // Parse the JSON
        const config = JSON.parse(jsonText);
        
        // Reset the application state
        resetAppState();
        
        // Import the configuration
        importConfigObject(config);
        
        // Update the UI
        document.getElementById('import-json').value = '';
        alert('Configuration imported successfully. Please check the Build tab to see your configuration.');
        
        // Switch to the Build tab
        openTab(null, 'BuildConfig');
    } catch (error) {
        alert('Error importing configuration: ' + error.message);
    }
}

function resetAppState() {
    appState.selectedBoard = null;
    appState.companionBoard = null;
    appState.sdCardCS = null;
    appState.rtcType = 'soft';
    appState.statusLEDBrightness = 0.5;
    appState.i2cBuses = [];
    appState.i2cMultiplexers = [];
    appState.selectedComponents = [];
    appState.usedPins = new Set();
    appState.nextComponentId = 1;
    
    // Reset UI elements
    document.getElementById('board-select').value = '';
    document.getElementById('companion-board-select').value = '';
    document.getElementById('led-brightness').value = 0.5;
    document.getElementById('brightness-value').textContent = '0.5';
    document.getElementById('add-sd-card').checked = false;
    document.getElementById('add-i2c-bus').checked = false;
    
    // Hide sections
    hideSubsequentSections();
}

function importConfigObject(config) {
    // Import device details
    const deviceConfig = config.exportedFromDevice;
    
    // Try to find the board that matches the configuration
    let matchedBoard = null;
    for (const [boardId, boardConfig] of Object.entries(appState.boardsData)) {
        if (boardConfig.referenceVoltage === deviceConfig.referenceVoltage &&
            boardConfig.totalGPIOPins === deviceConfig.totalGPIOPins &&
            boardConfig.totalAnalogPins === deviceConfig.totalAnalogPins) {
            matchedBoard = boardId;
            break;
        }
    }
    
    if (matchedBoard) {
        // Select the matched board
        document.getElementById('board-select').value = matchedBoard;
        const event = new Event('change');
        document.getElementById('board-select').dispatchEvent(event);
        
        // Import SD card CS pin
        if (deviceConfig.sd_cs_pin !== undefined) {
            appState.sdCardCS = deviceConfig.sd_cs_pin;
            document.getElementById('add-sd-card').checked = true;
            document.getElementById('sd-card-pin-select').classList.remove('hidden');
            appState.usedPins.add(deviceConfig.sd_cs_pin);
        }
        
        // Import RTC type
        if (deviceConfig.rtc) {
            appState.rtcType = deviceConfig.rtc;
            document.getElementById('rtc-select').value = deviceConfig.rtc;
            const rtcEvent = new Event('change');
            document.getElementById('rtc-select').dispatchEvent(rtcEvent);
        }
        
        // Import LED brightness
        if (deviceConfig.statusLEDBrightness !== undefined) {
            appState.statusLEDBrightness = deviceConfig.statusLEDBrightness;
            document.getElementById('led-brightness').value = deviceConfig.statusLEDBrightness;
            document.getElementById('brightness-value').textContent = deviceConfig.statusLEDBrightness;
        }
        
        // Import components
        if (config.components && Array.isArray(config.components)) {
            // First pass: find and set up multiplexers
            config.components.forEach(component => {
                if (component.componentAPI === 'i2c' && 
                    (component.i2cDeviceName === 'pca9546' || component.i2cDeviceName === 'pca9548' ||
                     component.i2cDeviceName === 'tca9546' || component.i2cDeviceName === 'tca9548')) {
                    const channels = component.i2cDeviceName.includes('9548') ? 8 : 4;
                    const muxConfig = {
                        id: appState.nextComponentId++,
                        address: component.i2cDeviceAddress,
                        channels: channels
                    };
                    
                    appState.i2cMultiplexers.push(muxConfig);
                    
                    // Add to selected components
                    const componentConfig = {
                        ...component,
                        instanceId: muxConfig.id
                    };
                    
                    appState.selectedComponents.push(componentConfig);
                }
            });
            
            // Second pass: import other components
            config.components.forEach(component => {
                if (component.componentAPI === 'i2c' && 
                    (component.i2cDeviceName === 'pca9546' || component.i2cDeviceName === 'pca9548' ||
                     component.i2cDeviceName === 'tca9546' || component.i2cDeviceName === 'tca9548')) {
                    // Skip multiplexers (already handled)
                    return;
                }
                
                // Add component to the selected components
                const componentConfig = {
                    ...component,
                    instanceId: appState.nextComponentId++
                };
                
                appState.selectedComponents.push(componentConfig);
                
                // Mark used pins
                if (component.pinName) {
                    const pinNumber = parseInt(component.pinName.replace('D', ''));
                    appState.usedPins.add(pinNumber);
                }
                
                if (component.txPin) {
                    const txPinNumber = parseInt(component.txPin.replace('D', ''));
                    appState.usedPins.add(txPinNumber);
                }
                
                if (component.rxPin) {
                    const rxPinNumber = parseInt(component.rxPin.replace('D', ''));
                    appState.usedPins.add(rxPinNumber);
                }
            });
            
            // Update selected components list
            updateSelectedComponentsList();
        }
        
        // Show all sections
        document.getElementById('companion-board-section').classList.remove('hidden');
        document.getElementById('manual-config-section').classList.remove('hidden');
        document.getElementById('i2c-bus-section').classList.remove('hidden');
        document.getElementById('components-section').classList.remove('hidden');
        document.getElementById('selected-components-section').classList.remove('hidden');
        document.getElementById('generate-section').classList.remove('hidden');
        
        // Update I2C bus options
        updateI2CBusOptions();
        
        // Refresh pin lists
        populatePinsLists();
    } else {
        alert('Could not identify the board from the configuration. Please select a board manually.');
    }
}

// Initialize sample data components if there is no external data
function initializeSampleComponents() {
    // Sample I2C components
    appState.componentsData.i2c = [
        { id: 'bme280', name: 'BME280', address: '0x77', dataTypes: ['ambient-temp', 'ambient-temp-fahrenheit', 'relative-humidity', 'pressure', 'altitude'] },
        { id: 'sht30', name: 'SHT30', address: '0x44', dataTypes: ['ambient-temp', 'ambient-temp-fahrenheit', 'relative-humidity'] },
        { id: 'mcp9808', name: 'MCP9808', address: '0x18', dataTypes: ['ambient-temp', 'ambient-temp-fahrenheit'] },
        { id: 'bh1750', name: 'BH1750', address: '0x23', dataTypes: ['light'] },
        { id: 'sgp30', name: 'SGP30', address: '0x58', dataTypes: ['eco2', 'tvoc'] },
        { id: 'pca9546', name: 'PCA9546 4-Channel Multiplexer', address: '0x70', channels: 4 },
        { id: 'pca9548', name: 'PCA9548 8-Channel Multiplexer', address: '0x70', channels: 8 },
        { id: 'tca9546', name: 'TCA9546 4-Channel Multiplexer', address: '0x70', channels: 4 },
        { id: 'tca9548', name: 'TCA9548 8-Channel Multiplexer', address: '0x70', channels: 8 }
    ];
    
    // Sample DS18x20 components
    appState.componentsData.ds18x20 = [
        { id: 'ds18b20', name: 'DS18B20', dataTypes: ['object-temp', 'object-temp-fahrenheit'] },
        { id: 'ds18b20_waterproof', name: 'DS18B20 Waterproof', dataTypes: ['object-temp', 'object-temp-fahrenheit'] }
    ];
    
    // Sample pin components
    appState.componentsData.pin = [
        { id: 'led', name: 'LED', dataTypes: [] },
        { id: 'push_button', name: 'Push Button', dataTypes: ['digital-input'] },
        { id: 'toggle_switch', name: 'Toggle Switch', dataTypes: ['digital-input'] },
        { id: 'potentiometer', name: 'Potentiometer', dataTypes: ['analog-input'] }
    ];
    
    // Sample pixel components
    appState.componentsData.pixel = [
        { id: 'neopixel', name: 'NeoPixel', dataTypes: [] },
        { id: 'dotstar', name: 'DotStar', dataTypes: [] }
    ];
    
    // Sample PWM components
    appState.componentsData.pwm = [
        { id: 'dimmable_led', name: 'Dimmable LED', dataTypes: [] },
        { id: 'piezo_buzzer', name: 'Piezo Buzzer', dataTypes: [] }
    ];
    
    // Sample servo components
    appState.componentsData.servo = [
        { id: 'servo', name: 'Servo Motor', dataTypes: [] }
    ];
    
    // Sample UART components
    appState.componentsData.uart = [
        { id: 'pms5003', name: 'PMS5003 Air Quality Sensor', dataTypes: ['pm10-std', 'pm25-std', 'pm100-std'] }
    ];
}

// Initialize sample board configs if there is no external data
function initializeSampleBoards() {
    appState.boardsData = {
        'feather-esp32': {
            referenceVoltage: 3.3,
            totalGPIOPins: 21,
            totalAnalogPins: 14,
            defaultI2C: { scl: 22, sda: 23 },
            pins: [0, 2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33, 34, 35, 36, 39]
        },
        'feather-esp32s2': {
            referenceVoltage: 3.3,
            totalGPIOPins: 22,
            totalAnalogPins: 6,
            defaultI2C: { scl: 42, sda: 41 },
            pins: [0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 21, 33, 34, 35, 36, 37, 38, 39, 41, 42]
        },
        'feather-esp32s3-tft': {
            referenceVoltage: 3.3,
            totalGPIOPins: 18,
            totalAnalogPins: 6,
            defaultI2C: { scl: 9, sda: 8 },
            pins: [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 17, 18, 21, 38, 39, 40, 41, 42]
        },
        'feather-esp32c3': {
            referenceVoltage: 3.3,
            totalGPIOPins: 13,
            totalAnalogPins: 4,
            defaultI2C: { scl: 5, sda: 4 },
            pins: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 18, 19, 20, 21]
        },
        'qtpy-esp32c3': {
            referenceVoltage: 3.3,
            totalGPIOPins: 11,
            totalAnalogPins: 4,
            defaultI2C: { scl: 5, sda: 4 },
            pins: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        }
    };
}

// Run initialization if no data loader is detected
if (typeof loadWippersnapperData === 'undefined') {
    console.log('No data loader detected, initializing with sample data');
    document.addEventListener('DOMContentLoaded', function() {
        // Hide loading indicator
        document.getElementById('loading-indicator').classList.add('hidden');
        
        // Initialize with sample data
        initializeSampleBoards();
        initializeSampleComponents();
    });
}
