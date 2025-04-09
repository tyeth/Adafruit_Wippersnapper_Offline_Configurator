// Load Wippersnapper boards and components data

// Configuration
const BOARDS_JSON_URL = 'https://raw.githubusercontent.com/tyeth/Adafruit_Wippersnapper_Offline_Configurator/refs/heads/use_boards_sd_card/wippersnapper_boards.json'; //'wippersnapper_boards.json';
const COMPONENTS_JSON_URL = 'https://raw.githubusercontent.com/tyeth/Adafruit_Wippersnapper_Offline_Configurator/refs/heads/use_boards_sd_card/wippersnapper_components.json'; //'wippersnapper_components.json';

// Global app state
const appState = {
    boardsData: null,
    componentsData: null,
    isLoading: false,
    loadError: null,
    
    // Application state properties (from original code)
    selectedBoard: null,
    companionBoard: null,
    sdCardCS: null,
    rtcType: 'soft',
    statusLEDBrightness: 0.5,
    i2cBuses: [],
    i2cMultiplexers: [],
    selectedComponents: [],
    usedPins: new Set(),
    nextComponentId: 1
};

/**
 * Load the Wippersnapper boards and components data from JSON files
 */
async function loadWippersnapperData() {
    try {
        appState.isLoading = true;
        console.log('Loading Wippersnapper data from local file copy');
        // create <object id="jsonBoardObject" data="data.json" type="application/json"></object> in header
        const jsonObject = document.createElement('script');
        jsonObject.id = 'jsonBoardObject';
        jsonObject.src = 'wippersnapper_boards.js';
        document.body.appendChild(jsonObject);
        console.log('Loaded boards data from local file copy');
        // components
        const componentsObject = document.createElement('script');
        componentsObject.id = 'jsonComponentsObject';
        componentsObject.src = 'wippersnapper_components.js';
        document.body.appendChild(componentsObject);
        console.log('Loaded components data from local file copy');
        // Store data in app state
        await new Promise(resolve => setTimeout(resolve, 1000));
        const boardsData = window['jsonBoardObject'];
        const componentsData = window['jsonComponentsObject'];
        const firmwareData = window['FIRMWARE_DATA'];
        if (firmwareData && firmwareData.releaseInfo) {
            // Update the release name and link in the UI
            document.getElementById('release_name').innerHTML = "(" + firmwareData.releaseInfo.publishedDate + ")<br/>" + firmwareData.releaseInfo.name;
            document.getElementById('release_name').href = firmwareData.releaseInfo.url;
            //TODO: set onchange for the boards to alter the download url in #firmware_file link
        }

        appState.boardsData = boardsData.boards;
        appState.componentsData = componentsData.components;
        document.body.removeChild(componentsObject);
        document.body.removeChild(jsonObject);
        
        // Add I2C multiplexer components manually since they're not in the JSON data
        if (appState.componentsData.i2c) {
            // Add PCA9546 - 4-channel I2C multiplexer
            appState.componentsData.i2c.push({
                id: 'pca9546',
                name: 'PCA9546 I2C Multiplexer',
                displayName: 'PCA9546 I2C Multiplexer',
                address: '0x70',
                addresses: ['0x70', '0x71', '0x72', '0x73', '0x74', '0x75', '0x76', '0x77'],
                dataTypes: [],
                channels: 4
            });
            
            // Add PCA9548 - 8-channel I2C multiplexer
            appState.componentsData.i2c.push({
                id: 'pca9548',
                name: 'PCA9548 I2C Multiplexer',
                displayName: 'PCA9548 I2C Multiplexer',
                address: '0x70',
                addresses: ['0x70', '0x71', '0x72', '0x73', '0x74', '0x75', '0x76', '0x77'],
                dataTypes: [],
                channels: 8
            });
            
            // Add TCA9546 - 4-channel I2C multiplexer
            appState.componentsData.i2c.push({
                id: 'tca9546',
                name: 'TCA9546 I2C Multiplexer',
                displayName: 'TCA9546 I2C Multiplexer',
                address: '0x70',
                addresses: ['0x70', '0x71', '0x72', '0x73', '0x74', '0x75', '0x76', '0x77'],
                dataTypes: [],
                channels: 4
            });
            
            // Add TCA9548 - 8-channel I2C multiplexer
            appState.componentsData.i2c.push({
                id: 'tca9548',
                name: 'TCA9548 I2C Multiplexer',
                displayName: 'TCA9548 I2C Multiplexer',
                address: '0x70',
                addresses: ['0x70', '0x71', '0x72', '0x73', '0x74', '0x75', '0x76', '0x77'],
                dataTypes: [],
                channels: 8
            });
        }
        
        // Initialize the UI with the data
        initializeUI();
        
        console.log('Successfully loaded Wippersnapper data', {
            boards: Object.keys(appState.boardsData).length,
            components: Object.keys(appState.componentsData)
                .filter(key => !key.endsWith('_metadata'))
                .reduce((acc, key) => acc + appState.componentsData[key].length, 0)
        });
        
        appState.isLoading = false;
        return true;
    } catch (error) {
        console.error('Error loading Wippersnapper data:', error);
        appState.loadError = error.message;
        appState.isLoading = false;
        showLoadError(error.message);
        return false;
    }
}

/**
 * Initialize the UI with the loaded data
 */
function initializeUI() {
    // Populate board select dropdown
    populateBoardSelect();
    
    // Set up event listeners
    attachEventListeners();
}

/**
 * Populate the board select dropdown with available boards
 */
function populateBoardSelect() {
    const boardSelect = document.getElementById('board-select');
    boardSelect.innerHTML = '<option value="">-- Select a Board --</option>';
    
    // Filter boards to only include those with UF2 install method
    const filteredBoards = Object.entries(appState.boardsData)
        .filter(([boardId, board]) => board.installMethod === 'uf2'); //['uf2', 'web-native-usb'].includes(board.installMethod)); //funhouse
    
    // Sort boards by vendor and name
    const sortedBoards = filteredBoards
        .sort((a, b) => {
            const vendorA = a[1].vendor || '';
            const vendorB = b[1].vendor || '';
            if (vendorA === 'Generic') {
                return 1; // Sort Generic to the end
            } else if (vendorB === 'Generic') {
                return -1; // Sort Generic to the end
            } else if (vendorA !== vendorB) {
                // Sort by vendor first
                return vendorA.localeCompare(vendorB);
            }
            
            // Then by display name
            return a[1].displayName.localeCompare(b[1].displayName);
        });
    
    // Group boards by vendor
    const boardsByVendor = {};
    sortedBoards.forEach(([boardId, board]) => {
        const vendor = board.vendor || 'Other';
        if (!boardsByVendor[vendor]) {
            boardsByVendor[vendor] = [];
        }
        boardsByVendor[vendor].push([boardId, board]);
    });
    
    // Add boards to select, grouped by vendor
    Object.entries(boardsByVendor).forEach(([vendor, boards]) => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = vendor;
        
        boards.forEach(([boardId, board]) => {
            const option = document.createElement('option');
            option.value = boardId;
            option.textContent = board.displayName;
            optgroup.appendChild(option);
        });
        
        boardSelect.appendChild(optgroup);
    });
}

/**
 * Convert the loaded board data to the format expected by the application
 * @param {string} boardId The ID of the selected board
 * @returns {Object} The board configuration object
 */
function convertBoardDataToConfig(boardId) {
    const boardData = appState.boardsData[boardId];
    if (!boardData) return null;
    
    // Extract pin numbers from board data
    const pins = boardData.pins.map(pin => pin.number).filter(num => !isNaN(num));
    
    boardConfig = boardData;
    // Create board config
    boardConfig.totalAnalogPins= boardData.totalAnalogPins || 0;
    boardConfig.defaultI2C= {
            scl: boardData.defaultI2C.SCL,
            sda: boardData.defaultI2C.SDA
        };
    boardConfig.pins= pins;
    
    return boardConfig;
}

/**
 * Convert the loaded component data to the format expected by the application
 * @returns {Object} The components configuration object
 */
function convertComponentsDataToConfig() {
    const componentsConfig = {
        i2c: [],
        ds18x20: [],
        pin: [],
        pixel: [],
        pwm: [],
        servo: [],
        uart: []
    };
    
    // Process I2C components
    if (appState.componentsData.i2c) {
        appState.componentsData.i2c.forEach(component => {
            componentsConfig.i2c.push({
                id: component.id,
                name: component.name,
                displayName: component.displayName || component.name,
                address: component.address || '0x00',
                addresses: component.addresses || [component.address || '0x00'],
                dataTypes: component.dataTypes || [],
                channels: component.channels || 0
            });
        });
    }
    
    // Process DS18x20 components
    if (appState.componentsData.ds18x20) {
        appState.componentsData.ds18x20.forEach(component => {
            componentsConfig.ds18x20.push({
                id: component.id,
                displayName: component.displayName || component.name,
                name: component.name,
                dataTypes: component.dataTypes || []
            });
        });
    }
    
    // Process Pin components
    if (appState.componentsData.pin) {
        appState.componentsData.pin.forEach(component => {
            componentsConfig.pin.push({
                id: component.id,
                displayName: component.displayName || component.name,
                name: component.name,
                dataTypes: component.dataTypes || []
            });
        });
    }
    
    // Process Pixel components
    if (appState.componentsData.pixel) {
        appState.componentsData.pixel.forEach(component => {
            componentsConfig.pixel.push({
                id: component.id,
                displayName: component.displayName || component.name,
                name: component.name,
                dataTypes: component.dataTypes || []
            });
        });
    }
    
    // Process PWM components
    if (appState.componentsData.pwm) {
        appState.componentsData.pwm.forEach(component => {
            componentsConfig.pwm.push({
                id: component.id,
                displayName: component.displayName || component.name,
                name: component.name,
                dataTypes: component.dataTypes || []
            });
        });
    }
    
    // Process Servo components
    if (appState.componentsData.servo) {
        appState.componentsData.servo.forEach(component => {
            componentsConfig.servo.push({
                id: component.id,
                displayName: component.displayName || component.name,
                name: component.name,
                dataTypes: component.dataTypes || []
            });
        });
    }
    
    // Process UART components
    if (appState.componentsData.uart) {
        appState.componentsData.uart.forEach(component => {
            componentsConfig.uart.push({
                id: component.id,
                displayName: component.displayName || component.name,
                name: component.name,
                dataTypes: component.dataTypes || []
            });
        });
    }
    
    return componentsConfig;
}

/**
 * Attach event listeners to the UI elements
 */
function attachEventListeners() {
    // Board selection handler
    document.getElementById('board-select').addEventListener('change', function() {
        const boardId = this.value;
        if (!boardId) {
            document.getElementById('board-details').classList.add('hidden');
            //TODO: consider pop up to reset configurator, or just hide all sections
            hideSubsequentSections();
            return;
        }
        
        // Convert board data to config format
        const boardConfig = convertBoardDataToConfig(boardId);
        appState.selectedBoard = {
            id: boardId,
            ...boardConfig
        };
        
        // Update board details display
        document.getElementById('ref-voltage').textContent = boardConfig.referenceVoltage;
        document.getElementById('total-gpio').textContent = boardConfig.totalGPIOPins;
        document.getElementById('total-analog').textContent = boardConfig.totalAnalogPins;
        document.getElementById('default-scl').textContent = boardConfig.defaultI2C.scl;
        document.getElementById('default-sda').textContent = boardConfig.defaultI2C.sda;
        document.getElementById('board-details').classList.remove('hidden');
        
        // If there's a board image, show it
        const boardImageElem = document.getElementById('board-image');
        if (boardImageElem) {
            if (boardConfig.image) {
                if (!boardConfig.image.startsWith('http')) {
                    boardImageElem.src = "https://raw.githubusercontent.com/adafruit/Wippersnapper_Boards/refs/heads/rp2040_datalogger_feather/" + boardConfig.image;
                } else {
                    boardImageElem.src = boardConfig.image;
                }
                boardImageElem.classList.remove('hidden');
            } else {
                boardImageElem.classList.add('hidden');
            }
        }
        
        // Set up default I2C bus
        appState.i2cBuses = [{
            id: 'default',
            scl: boardConfig.defaultI2C.scl,
            sda: boardConfig.defaultI2C.sda
        }];
        
        // Update default I2C bus display
        document.getElementById('default-i2c-scl').textContent = boardConfig.defaultI2C.scl;
        document.getElementById('default-i2c-sda').textContent = boardConfig.defaultI2C.sda;
        
        // Mark default I2C pins as used
        appState.usedPins.add(boardConfig.defaultI2C.scl);
        appState.usedPins.add(boardConfig.defaultI2C.sda);
        
        // Show companion board section
        document.getElementById('companion-board-section').classList.remove('hidden');
        
        // Reset subsequent sections
        resetSubsequentSelections();
        
        // Initialize SD and RTC sections based on board
        initializeManualConfig(boardConfig);

        // update firmware download url to use installBoardName or fall back to releases page
        // collect the asset names, split on '.' after removing wippersnapper. and take first part.
        const firmwareFile = document.getElementById('firmware_file');
        const firmwareData = window['FIRMWARE_DATA'];
        // TODO: remove once W-variant board targets have assets, and non-w variants exist in boards repo
        const boardInstallName = (boardConfig.installBoardName || "").replaceAll('-','_').replace('picow','pico');
        const assets = firmwareData.firmwareFiles.map(asset => { return {"name":asset.name.replace('wippersnapper.', '').split('.')[0], "url":asset.url}; });
        const asset = assets.find(asset => asset.name === boardInstallName);
        if (asset) {
            firmwareFile.href = asset.url;
        } else {
            firmwareFile.href = firmwareData.releaseInfo.url;
        }

        // Initialize pins lists for SD and I2C configuration
        populatePinsLists();
        
        // Convert component data to config format
        const componentsConfig = convertComponentsDataToConfig();
        
        // Initialize components sections with the loaded data
        populateComponentLists(componentsConfig);
    });
    
    // Remaining event listeners should be added here or in the original script
    // ...
}

/**
 * Display an error message to the user when data loading fails
 * @param {string} message The error message to display
 */
function showLoadError(message) {
    // Create or update an error message element
    let errorElem = document.getElementById('load-error');
    
    if (!errorElem) {
        errorElem = document.createElement('div');
        errorElem.id = 'load-error';
        errorElem.style.backgroundColor = '#ffdddd';
        errorElem.style.color = '#cc0000';
        errorElem.style.padding = '15px';
        errorElem.style.margin = '15px 0';
        errorElem.style.borderRadius = '5px';
        
        // Insert at the top of the body
        document.body.insertBefore(errorElem, document.body.firstChild);
    }
    
    errorElem.innerHTML = `
        <h3>Error Loading Data</h3>
        <p>${message}</p>
        <p>Please check that the JSON files are available and properly formatted.</p>
        <button onclick="retryLoading()">Retry</button>
    `;
}

/**
 * Retry loading the Wippersnapper data
 */
function retryLoading() {
    // Remove the error message
    const errorElem = document.getElementById('load-error');
    if (errorElem) {
        errorElem.remove();
    }
    
    // Try loading again
    loadWippersnapperData();
}

// Initialize the application by loading the data when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    loadWippersnapperData();
});
