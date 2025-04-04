// Companion board configurations
/*
List of supported companion boards:
Adalogger FeatherWing - RTC + SD Add-on For All Feather Boards
Product ID: 2922
Add to Cart, Adalogger FeatherWing - RTC + SD Add-on For All Feather Boards

Adafruit PiCowbell Adalogger for Pico - MicroSD, RTC & STEMMA QTAngled shot of black, rectangular datalogging board.
Adafruit PiCowbell Adalogger for Pico - MicroSD, RTC & STEMMA QT
Product ID: 5703

Adafruit Feather RP2040 Adalogger - 8MB Flash with microSD Card - STEMMA QT / Qwiic
Product ID: 5980
(This is a board that includes RTC and SD, not a companion board)

Newer Rev.B Adafruit Assembled Data Logging shield for Arduino  (SD CS = 10, RTC = PCF8523)
Product ID: 1141

Older Rev.A Adafruit Assembled Data Logging shield for Arduino  (SD CS = 10, RTC = DS1307)
Product ID: 1141

Adafruit Audio BFF Add-on for QT Py and Xiao (SD CS = A0, no RTC)
Product ID: 5769

Adafruit microSD Card BFF Add-On for QT Py and Xiao (SD CS = TX, no RTC)
Product ID: 5683

Adafruit WINC1500 WiFi Shield with PCB Antenna (SD CS = D4, no RTC)
Product ID: 3653

Adafruit AirLift Shield - ESP32 WiFi Co-Processor (SD CS = D4, no RTC)
Product ID: 4285
*/
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
        extras: 'Precision RTC'
    },
    'picowbell-adalogger': {
        rtc: 'PCF8523',
        sdCardCS: 9,
        extras: 'SD Card, STEMMA QT'
    },
    'datalogger-shield-revb': {
        rtc: 'PCF8523',
        sdCardCS: 10,
        extras: 'SD Card'
    },
    'datalogger-shield-reva': {
        rtc: 'DS1307',
        sdCardCS: 10,
        extras: 'SD Card'
    },
    'audio-bff': {
        rtc: null,
        sdCardCS: 'A0',
        extras: 'Audio'
    },
    'microsd-bff': {
        rtc: null,
        sdCardCS: 'TX',
        extras: 'SD Card'
    },
    'winc1500-shield': {
        rtc: null,
        sdCardCS: 'D4',
        extras: 'WiFi'
    },
    'airlift-shield': {
        rtc: null,
        sdCardCS: 'D4',
        extras: 'WiFi'
    }
};

// Custom boards collection (for boards without definition.json files)
let customBoardsCollection = {};

// Function to add a custom board to the collection
function addCustomBoard(id, config) {
    if (!id || typeof id !== 'string') {
        console.error('Invalid board ID');
        return false;
    }
    
    // Create a new board entry with required fields
    customBoardsCollection[id] = {
        name: config.name || id,
        referenceVoltage: config.referenceVoltage || 3.3,
        totalGPIOPins: config.totalGPIOPins || 0,
        totalAnalogPins: config.totalAnalogPins || 0,
        defaultI2C: {
            scl: config.defaultI2C?.scl || 'SCL',
            sda: config.defaultI2C?.sda || 'SDA'
        },
        pins: config.pins || []
    };
    
    // Add the board to appState.boardsData
    appState.boardsData[id] = customBoardsCollection[id];
    
    // Add the board to the select dropdown if it exists
    const selectElement = document.getElementById('board-select');
    if (selectElement) {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = config.name || `Custom Board: ${id}`;
        selectElement.appendChild(option);
    }
    
    return true;
}

// Use the appState from load-wippersnapper-data.js if it exists
// Otherwise, initialize with default values
if (typeof appState === 'undefined') {
    window.appState = {
        selectedBoard: null,
        companionBoard: null,
        sdCardCS: null,
        rtcType: 'soft',
        statusLEDBrightness: 0.5,
        i2cBuses: [],
        i2cMultiplexers: [],
        selectedComponents: [],
        usedPins: new Set(),
        nextComponentId: 1,
        componentsData: {
            i2c: [],
            ds18x20: [],
            pin: [],
            pixel: [],
            pwm: [],
            servo: [],
            uart: []
        },
        boardsData: {},
        isImporting: false
    };
}

// Reference to componentsData for backward compatibility
let componentsData = appState.componentsData;

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
    const fileInput = document.getElementById('import-file');
    if (!fileInput.files || fileInput.files.length === 0) {
    alert('Please select a file to import.');
    return;
    }
    
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = function(e) {
    try {
    // Read the file content into the text area
    const jsonText = e.target.result;
    document.getElementById('import-json').value = jsonText;
    
    // Trigger the import from text button
    document.getElementById('import-json-btn').click();
    
    // Clear the file input
    fileInput.value = '';
    } catch (error) {
    alert('Error reading file: ' + error.message);
    }
    };
    
    reader.onerror = function() {
    alert('Error reading file.');
    };
    
    reader.readAsText(file);
});
    
    // Import from text button handler
document.getElementById('import-json-btn').addEventListener('click', function() {
    importConfiguration();
});
    
    // Export Configuration button handler
    document.getElementById('export-btn').addEventListener('click', function() {
        downloadConfiguration(true);
    });
    
    // Reset Configurator buttons handler
    document.querySelectorAll('.reset-btn').forEach(button => {
        button.addEventListener('click', function() {
            if (confirm('Are you sure you want to reset the configurator? All your current configuration will be lost.')) {
                resetAppState();
                window.location.reload();
            }
        });
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
    
    // Add custom board button handler
    document.getElementById('add-custom-board-btn').addEventListener('click', function() {
        const boardName = document.getElementById('custom-board-name').value.trim();
        if (!boardName) {
            alert('Please enter a board name');
            return;
        }
        
        // Generate a unique ID for the board
        const boardId = 'custom-' + boardName.toLowerCase().replace(/\s+/g, '-');
        
        // Get the form values
        const refVoltage = parseFloat(document.getElementById('custom-board-ref-voltage').value) || 3.3;
        const gpioPins = parseInt(document.getElementById('custom-board-gpio').value) || 0;
        const analogPins = parseInt(document.getElementById('custom-board-analog').value) || 0;
        const sclPin = document.getElementById('custom-board-scl').value.trim() || 'SCL';
        const sdaPin = document.getElementById('custom-board-sda').value.trim() || 'SDA';
        
        // Create the board configuration
        const boardConfig = {
            name: boardName,
            referenceVoltage: refVoltage,
            totalGPIOPins: gpioPins,
            totalAnalogPins: analogPins,
            defaultI2C: {
                scl: sclPin,
                sda: sdaPin
            },
            pins: [] // Could be expanded to include pin definitions
        };
        
        // Add the custom board
        if (addCustomBoard(boardId, boardConfig)) {
            alert('Custom board added successfully!');
            
            // Reset the form
            document.getElementById('custom-board-name').value = '';
            document.getElementById('custom-board-ref-voltage').value = '3.3';
            document.getElementById('custom-board-gpio').value = '0';
            document.getElementById('custom-board-analog').value = '0';
            document.getElementById('custom-board-scl').value = '';
            document.getElementById('custom-board-sda').value = '';
            
            // Show the custom boards list and add this board to it
            document.getElementById('custom-boards-list').classList.remove('hidden');
            const listItem = document.createElement('li');
            listItem.textContent = `${boardName} (ID: ${boardId})`;
            document.getElementById('custom-boards-items').appendChild(listItem);
        } else {
            alert('Failed to add custom board. Please try again.');
        }
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
    // Populate All Components
    const allList = document.getElementById('all-component-list');
    allList.innerHTML = '';
    
    // Add I2C components to All Components
    appState.componentsData.i2c.forEach(component => {
        const card = createComponentCard(component, 'i2c');
        allList.appendChild(card);
    });
    
    // Add DS18x20 components to All Components
    appState.componentsData.ds18x20.forEach(component => {
        const card = createComponentCard(component, 'ds18x20');
        allList.appendChild(card);
    });
    
    // Add Pin components to All Components
    appState.componentsData.pin.forEach(component => {
        const card = createComponentCard(component, 'pin');
        allList.appendChild(card);
    });
    
    // Add Pixel components to All Components
    appState.componentsData.pixel.forEach(component => {
        const card = createComponentCard(component, 'pixel');
        allList.appendChild(card);
    });
    
    // Add PWM components to All Components
    appState.componentsData.pwm.forEach(component => {
        const card = createComponentCard(component, 'pwm');
        allList.appendChild(card);
    });
    
    // Add Servo components to All Components
    appState.componentsData.servo.forEach(component => {
        const card = createComponentCard(component, 'servo');
        allList.appendChild(card);
    });
    
    // Add UART components to All Components
    appState.componentsData.uart.forEach(component => {
        const card = createComponentCard(component, 'uart');
        allList.appendChild(card);
    });
    
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
    
    // Add search functionality for all components
    document.getElementById('all-search').addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const allComponents = document.querySelectorAll('#all-component-list .component-card');
        
        allComponents.forEach(card => {
            const componentName = card.querySelector('h3').textContent.toLowerCase();
            if (componentName.includes(searchTerm)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    });
}

function createComponentCard(component, type) {
    const card = document.createElement('div');
    card.className = 'component-card';
    card.dataset.id = component.id;
    card.dataset.type = type;
    
    // Add image if available
    if (component.image) {
        const img = document.createElement('img');
        if (!component.image.startsWith('http')) {
            img.src = "https://raw.githubusercontent.com/adafruit/Wippersnapper_Components/refs/heads/main/" + component.image;
        } else {
            img.src = component.image;
        }
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
                <select id="modal-i2c-address" required>
        `;
        
        // Add options for each available I2C address
        if (component.addresses && component.addresses.length > 0) {
            component.addresses.forEach(address => {
                html += `<option value="${address}" ${address === component.address ? 'selected' : ''}>${address}</option>`;
            });
        } else {
            // Fallback to the single address if addresses array is not available
            html += `<option value="${component.address}">${component.address}</option>`;
        }
        
        html += `
                </select>
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
    } else if (type === 'ds18x20') {
        // Pin selection for DS18x20
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
        
        // Additional fields for DS18x20
        html += `
            <div>
                <label for="modal-resolution">Resolution:</label>
                <select id="modal-resolution" required>
                    <option value="9">9-bit</option>
                    <option value="10">10-bit</option>
                    <option value="11">11-bit</option>
                    <option value="12">12-bit</option>
                </select>
            </div>
        `;
    } else if (type === 'pin' || type === 'pwm' || type === 'servo') {
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
    } else if (type === 'pixel') {
        // Pin selection for pixel components
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
            <div>
                <label for="modal-pixel-count">Number of Pixels:</label>
                <input type="number" id="modal-pixel-count" value="1" min="1" required>
            </div>
        `;
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
    
    // Create a modal for selecting a multiplexer type
    const modal = document.getElementById('component-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    
    modalTitle.textContent = 'Add I2C Multiplexer';
    
    // Build the modal content
    let content = `
        <div class="form-group">
            <label for="multiplexer-select">Select Multiplexer Type:</label>
            <select id="multiplexer-select" class="form-control">
    `;
    
    // Add options for each multiplexer type
    multiplexers.forEach(mux => {
        content += `<option value="${mux.id}">${mux.name} (${mux.channels} channels)</option>`;
    });
    
    content += `
            </select>
        </div>
        <div class="form-group mt-3">
            <button id="select-multiplexer-btn" class="btn btn-primary">Continue</button>
            <button id="cancel-multiplexer-btn" class="btn btn-secondary">Cancel</button>
        </div>
    `;
    
    modalContent.innerHTML = content;
    
    // Add event listeners
    document.getElementById('select-multiplexer-btn').addEventListener('click', function() {
        const selectedMuxId = document.getElementById('multiplexer-select').value;
        const selectedMux = multiplexers.find(m => m.id === selectedMuxId);
        
        // Close this modal and open the component config modal for the selected multiplexer
        modal.style.display = 'none';
        showComponentConfigModal(selectedMux, 'i2c');
    });
    
    document.getElementById('cancel-multiplexer-btn').addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
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
    const componentTemplate = appState.componentsData[componentType].find(c => c.id === componentId);
    
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
        const resolution = document.getElementById('modal-resolution').value;
        
        componentConfig.pinName = `D${pin}`;
        componentConfig.sensorResolution = parseInt(resolution);
        
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
        const importSuccess = importConfigObject(config);
        
        // Update the UI (Don't clear the textarea when importing so the user can see what was imported)
        if (!appState.isImporting) {
            if (importSuccess) {
                alert('Configuration imported successfully. Please check the Build tab to see your configuration.');
                // Switch to the Build tab
                openTab(null, 'BuildConfig');
            } else {
                // The alert is now shown in importConfigObject, no need to show it again here
                // Switch to the Build tab so they can select a board
                openTab(null, 'BuildConfig');
                
                // Scroll to the board selection section
                setTimeout(() => {
                    const boardSection = document.querySelector('.section');
                    if (boardSection) {
                        boardSection.scrollIntoView({ behavior: 'smooth' });
                    }
                }, 500);
            }
        }
    } catch (error) {
        alert('Error importing configuration: ' + error.message);
    }
}

// This function has been removed to avoid duplication - see the version below

// We don't need this additional event handler because it's already defined above

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
    appState.isImporting = false;
    
    // Reset UI elements
    document.getElementById('board-select').value = '';
    document.getElementById('companion-board-select').value = '';
    document.getElementById('led-brightness').value = 0.5;
    document.getElementById('brightness-value').textContent = '0.5';
    document.getElementById('add-sd-card').checked = false;
    document.getElementById('add-i2c-bus').checked = false;
    
    // Hide sections
    hideSubsequentSections();
    
    // Clear board details section
    document.getElementById('board-details').classList.add('hidden');
    
    // Reset SD card section
    document.getElementById('sd-missing').classList.remove('hidden');
    document.getElementById('sd-present').classList.add('hidden');
    
    // Reset RTC section
    document.getElementById('rtc-missing').classList.remove('hidden');
    document.getElementById('rtc-present').classList.add('hidden');
    
    // Clear selected components list
    const selectedList = document.getElementById('selected-components-list');
    selectedList.innerHTML = '<p>No components selected yet.</p>';
}

// Function to import a configuration object
function importConfigObject(config) {
    // Set a flag to indicate we're in import mode
    appState.isImporting = true;
    console.log('Importing configuration...');
    
    // Import device details
    const deviceConfig = config.exportedFromDevice;
    let boardMatchFound = false;
    
    // Try to find the board that matches the configuration
    let matchedBoard = null;
    for (const [boardId, boardConfig] of Object.entries(appState.boardsData)) {
        if (boardConfig.referenceVoltage === deviceConfig.referenceVoltage &&
            boardConfig.totalGPIOPins === deviceConfig.totalGPIOPins &&
            boardConfig.totalAnalogPins === deviceConfig.totalAnalogPins) {
            matchedBoard = boardId;
            boardMatchFound = true;
            break;
        }
    }
    
    if (matchedBoard) {
        // Select the matched board
        document.getElementById('board-select').value = matchedBoard;
        const event = new Event('change');
        document.getElementById('board-select').dispatchEvent(event);
    } else {
        // Alert the user they need to select a board (in addition to the visual indication)
        alert('Import successful! To complete the process, please select your microcontroller board from the Build Configuration tab.');
        
        // Highlight the board selector to make it obvious to the user
        setTimeout(() => {
            const boardSelect = document.getElementById('board-select');
            boardSelect.style.boxShadow = '0 0 10px #2e8b57';
            boardSelect.style.border = '2px solid #2e8b57';
            boardSelect.style.animation = 'pulse 1.5s infinite';
            
            // Add a style tag with the pulse animation if it doesn't exist
            if (!document.getElementById('pulse-animation')) {
                const style = document.createElement('style');
                style.id = 'pulse-animation';
                style.textContent = `
                    @keyframes pulse {
                        0% { box-shadow: 0 0 0 0 rgba(46, 139, 87, 0.7); }
                        70% { box-shadow: 0 0 0 10px rgba(46, 139, 87, 0); }
                        100% { box-shadow: 0 0 0 0 rgba(46, 139, 87, 0); }
                    }
                `;
                document.head.appendChild(style);
            }
            
            // Add a helper message
            const boardSection = document.querySelector('.section');
            if (boardSection) {
                const helperMsg = document.createElement('p');
                helperMsg.id = 'board-select-helper';
                helperMsg.style.color = '#2e8b57';
                helperMsg.style.fontWeight = 'bold';
                helperMsg.textContent = 'Please select your microcontroller board to continue the import process.';
                
                // Insert after the board select
                const insertAfter = (el, referenceNode) => {
                    referenceNode.parentNode.insertBefore(el, referenceNode.nextSibling);
                };
                
                // Remove any existing helper message
                const existingMsg = document.getElementById('board-select-helper');
                if (existingMsg) {
                    existingMsg.remove();
                }
                
                insertAfter(helperMsg, boardSelect);
            }
            
            // When a board is selected, remove highlight and helper message
            boardSelect.addEventListener('change', function() {
                if (this.value) {
                    this.style.boxShadow = '';
                    this.style.border = '';
                    this.style.animation = '';
                    
                    const helperMsg = document.getElementById('board-select-helper');
                    if (helperMsg) {
                        helperMsg.remove();
                    }
                }
            });
        }, 500);
    }
    
    // Continue with importing other configuration details regardless of board match
    
    // Import SD card CS pin
    if (deviceConfig.sd_cs_pin !== undefined) {
        appState.sdCardCS = deviceConfig.sd_cs_pin;
        document.getElementById('add-sd-card').checked = true;
        
        // Store the SD card pin for later use after a board is selected
        appState.pendingSDCardPin = deviceConfig.sd_cs_pin;
    }
    
    // Import RTC type
    if (deviceConfig.rtc) {
        appState.rtcType = deviceConfig.rtc;
        appState.pendingRTC = deviceConfig.rtc;
    }
    
    // Import LED brightness
    if (deviceConfig.statusLEDBrightness !== undefined) {
        appState.statusLEDBrightness = deviceConfig.statusLEDBrightness;
        document.getElementById('led-brightness').value = deviceConfig.statusLEDBrightness;
        document.getElementById('brightness-value').textContent = deviceConfig.statusLEDBrightness;
    }
    
    // Store components for later use
    appState.pendingComponents = [];
    
    // Import components
    if (config.components && Array.isArray(config.components)) {
        // Store all components for processing after board selection
        appState.pendingComponents = config.components.map(component => ({...component}));
    }
    
    // Add an event listener to process pending components when a board is selected
    const boardSelect = document.getElementById('board-select');
    boardSelect.removeEventListener('change', processPendingConfig); // Remove existing listener
    boardSelect.addEventListener('change', processPendingConfig);
    
    function processPendingConfig() {
        // Only process if a board is selected
        if (this.value) {
            console.log('Board selected, processing pending configurations...');
            // Process pending SD card pin
            if (appState.pendingSDCardPin !== undefined) {
                setTimeout(() => {
                    document.getElementById('add-sd-card').checked = true;
                    const event = new Event('change');
                    document.getElementById('add-sd-card').dispatchEvent(event);
                    
                    const sdPinSelect = document.getElementById('sd-cs-pin-select');
                    if (sdPinSelect) {
                        sdPinSelect.value = appState.pendingSDCardPin;
                        appState.sdCardCS = appState.pendingSDCardPin;
                        appState.usedPins.add(appState.pendingSDCardPin);
                    }
                    
                    // Show SD card section
                    document.getElementById('sd-missing').classList.add('hidden');
                    document.getElementById('sd-present').classList.remove('hidden');
                    document.getElementById('sd-cs-pin').textContent = appState.pendingSDCardPin;
                }, 100);
            }
            
            // Process pending RTC
            if (appState.pendingRTC) {
                document.getElementById('rtc-select').value = appState.pendingRTC;
                const rtcEvent = new Event('change');
                document.getElementById('rtc-select').dispatchEvent(rtcEvent);
                
                // Update RTC UI
                document.getElementById('rtc-missing').classList.add('hidden');
                document.getElementById('rtc-present').classList.remove('hidden');
                document.getElementById('rtc-type').textContent = appState.pendingRTC;
            }
            
            // Process pending components
            if (appState.pendingComponents && appState.pendingComponents.length > 0) {
                // First pass: find and set up multiplexers
                appState.pendingComponents.forEach(component => {
                    if (component.componentAPI === 'i2c' && 
                        (component.i2cDeviceName === 'pca9546' || component.i2cDeviceName === 'pca9548' ||
                         component.i2cDeviceName === 'tca9546' || component.i2cDeviceName === 'tca9548')) {
                        const channels = component.i2cDeviceName.includes('9548') ? 8 : 4;
                        const muxConfig = {
                            id: appState.nextComponentId++,
                            address: component.i2cMuxAddress || component.i2cDeviceAddress,
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
                appState.pendingComponents.forEach(component => {
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
                    
                    // Handle I2C bus pins
                    if (component.i2cBusScl && component.i2cBusSda) {
                        const sclPin = parseInt(component.i2cBusScl);
                        const sdaPin = parseInt(component.i2cBusSda);
                        
                        // Check if this is a new I2C bus
                        const existingBus = appState.i2cBuses.find(bus => 
                            bus.scl === sclPin && bus.sda === sdaPin);
                        
                        if (!existingBus && sclPin && sdaPin) {
                            const busId = `bus_${appState.i2cBuses.length}`;
                            appState.i2cBuses.push({
                                id: busId,
                                scl: sclPin,
                                sda: sdaPin
                            });
                            
                            // Mark pins as used
                            appState.usedPins.add(sclPin);
                            appState.usedPins.add(sdaPin);
                        }
                    }
                });
                
                // Update selected components list
                updateSelectedComponentsList();
                
                // Update I2C bus options
                updateI2CBusOptions();
                
                // Clear pending components to avoid processing them again
                appState.pendingComponents = [];
            }
            
            // Remove this event listener to avoid duplicate processing
            boardSelect.removeEventListener('change', processPendingConfig);
        }
    }
    
    // Reset the import flag
    setTimeout(() => {
        appState.isImporting = false;
    }, 500);
    
    return boardMatchFound; // Return true if a matching board was found, false otherwise
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
