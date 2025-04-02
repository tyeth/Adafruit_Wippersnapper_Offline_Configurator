import os
import json
import glob
from pathlib import Path

# Base directory for the boards
BOARDS_DIR = r"./Wippersnapper_Boards/boards"
OUTPUT_FILE = r"./wippersnapper_boards.json"

def add_custom_board_definitions(boards):
    """
    Add custom board definitions for boards that don't have definition.json files
    """
    # Adafruit Feather RP2040 Adalogger
    boards["feather-rp2040-adalogger"] = {
        "boardName": "Adafruit Feather RP2040 Adalogger",
        "mcuName": "RP2040",
        "referenceVoltage": 3.3,
        "displayName": "Adafruit Feather RP2040 Adalogger",
        "vendor": "Adafruit",
        "productURL": "https://www.adafruit.com/product/5980",
        "documentationURL": "https://learn.adafruit.com/adafruit-feather-rp2040-adalogger",
        "totalGPIOPins": 22,
        "totalAnalogPins": 4,
        "pins": [
            {"number": 0, "name": "D0", "displayName": "GPIO0", "hasPWM": True, "hasServo": True},
            {"number": 1, "name": "D1", "displayName": "GPIO1", "hasPWM": True, "hasServo": True},
            {"number": 2, "name": "D2", "displayName": "GPIO2", "hasPWM": True, "hasServo": True},
            {"number": 3, "name": "D3", "displayName": "GPIO3", "hasPWM": True, "hasServo": True},
            {"number": 4, "name": "D4", "displayName": "GPIO4", "hasPWM": True, "hasServo": True},
            {"number": 5, "name": "D5", "displayName": "GPIO5", "hasPWM": True, "hasServo": True},
            {"number": 6, "name": "D6", "displayName": "GPIO6", "hasPWM": True, "hasServo": True},
            {"number": 7, "name": "D7", "displayName": "GPIO7", "hasPWM": True, "hasServo": True},
            {"number": 8, "name": "D8", "displayName": "GPIO8", "hasPWM": True, "hasServo": True},
            {"number": 9, "name": "D9", "displayName": "GPIO9", "hasPWM": True, "hasServo": True},
            {"number": 10, "name": "D10", "displayName": "GPIO10", "hasPWM": True, "hasServo": True},
            {"number": 11, "name": "D11", "displayName": "GPIO11", "hasPWM": True, "hasServo": True},
            {"number": 12, "name": "D12", "displayName": "GPIO12", "hasPWM": True, "hasServo": True},
            {"number": 13, "name": "D13", "displayName": "GPIO13 (LED)", "hasPWM": True, "hasServo": True},
            {"number": 16, "name": "D16", "displayName": "GPIO16 (MOSI)", "hasPWM": True, "hasServo": True},
            {"number": 17, "name": "D17", "displayName": "GPIO17 (A1/SCK/SD CS)", "hasPWM": True, "hasServo": True},
            {"number": 18, "name": "D18", "displayName": "GPIO18 (MISO)", "hasPWM": True, "hasServo": True},
            {"number": 19, "name": "D19", "displayName": "GPIO19", "hasPWM": True, "hasServo": True},
            {"number": 20, "name": "D20", "displayName": "GPIO20", "hasPWM": True, "hasServo": True},
            {"number": 24, "name": "D24", "displayName": "GPIO24 (A0)", "hasPWM": True, "hasServo": True},
            {"number": 25, "name": "D25", "displayName": "GPIO25 (A3)", "hasPWM": True, "hasServo": True},
            {"number": 29, "name": "D29", "displayName": "GPIO29 (A2)", "hasPWM": True, "hasServo": True}
        ],
        "analogPins": [
            {"name": "A0", "displayName": "GPIO24 (A0)", "direction": "INPUT"},
            {"name": "A1", "displayName": "GPIO17 (A1/SD CS)", "direction": "INPUT"},
            {"name": "A2", "displayName": "GPIO29 (A2)", "direction": "INPUT"},
            {"name": "A3", "displayName": "GPIO25 (A3)", "direction": "INPUT"}
        ],
        "defaultI2C": {
            "i2cPortId": 0,
            "SCL": "D3",
            "SDA": "D2"
        },
        "sdCardCS": 17,  # GPIO17/A1 is the SD card CS pin
        "rtcType": "PCF8523",  # Built-in RTC chip
        "image": None
    }
    # Generic ESP32-S2 based board
    boards["generic-esp32-s2"] = {
        "boardName": "Generic ESP32-S2",
        "mcuName": "ESP32-S2",
        "referenceVoltage": 3.3,
        "displayName": "Generic ESP32-S2 Board",
        "vendor": "Generic",
        "productURL": "",
        "documentationURL": "",
        "totalGPIOPins": 43,
        "totalAnalogPins": 20,
        "pins": [
            {"number": 1, "name": "D1", "displayName": "GPIO1", "hasPWM": True, "hasServo": True},
            {"number": 2, "name": "D2", "displayName": "GPIO2", "hasPWM": True, "hasServo": True},
            {"number": 3, "name": "D3", "displayName": "GPIO3", "hasPWM": True, "hasServo": True},
            {"number": 4, "name": "D4", "displayName": "GPIO4", "hasPWM": True, "hasServo": True},
            {"number": 5, "name": "D5", "displayName": "GPIO5", "hasPWM": True, "hasServo": True},
            {"number": 6, "name": "D6", "displayName": "GPIO6", "hasPWM": True, "hasServo": True},
            {"number": 7, "name": "D7", "displayName": "GPIO7", "hasPWM": True, "hasServo": True},
            {"number": 8, "name": "D8", "displayName": "GPIO8", "hasPWM": True, "hasServo": True},
            {"number": 9, "name": "D9", "displayName": "GPIO9", "hasPWM": True, "hasServo": True},
            {"number": 10, "name": "D10", "displayName": "GPIO10", "hasPWM": True, "hasServo": True},
            {"number": 11, "name": "D11", "displayName": "GPIO11", "hasPWM": True, "hasServo": True},
            {"number": 12, "name": "D12", "displayName": "GPIO12", "hasPWM": True, "hasServo": True},
            {"number": 13, "name": "D13", "displayName": "GPIO13", "hasPWM": True, "hasServo": True},
            {"number": 14, "name": "D14", "displayName": "GPIO14", "hasPWM": True, "hasServo": True},
            {"number": 15, "name": "D15", "displayName": "GPIO15", "hasPWM": True, "hasServo": True},
            {"number": 16, "name": "D16", "displayName": "GPIO16", "hasPWM": True, "hasServo": True},
            {"number": 17, "name": "D17", "displayName": "GPIO17", "hasPWM": True, "hasServo": True},
            {"number": 18, "name": "D18", "displayName": "GPIO18", "hasPWM": True, "hasServo": True},
            {"number": 21, "name": "D21", "displayName": "GPIO21", "hasPWM": True, "hasServo": True},
            {"number": 33, "name": "D33", "displayName": "GPIO33", "hasPWM": True, "hasServo": True},
            {"number": 34, "name": "D34", "displayName": "GPIO34", "hasPWM": True, "hasServo": True},
            {"number": 35, "name": "D35", "displayName": "GPIO35", "hasPWM": True, "hasServo": True},
            {"number": 36, "name": "D36", "displayName": "GPIO36", "hasPWM": True, "hasServo": True},
            {"number": 37, "name": "D37", "displayName": "GPIO37", "hasPWM": True, "hasServo": True},
            {"number": 38, "name": "D38", "displayName": "GPIO38", "hasPWM": True, "hasServo": True},
            {"number": 39, "name": "D39", "displayName": "GPIO39", "hasPWM": True, "hasServo": True},
            {"number": 40, "name": "D40", "displayName": "GPIO40", "hasPWM": True, "hasServo": True},
            {"number": 41, "name": "D41", "displayName": "GPIO41", "hasPWM": True, "hasServo": True},
            {"number": 42, "name": "D42", "displayName": "GPIO42", "hasPWM": True, "hasServo": True},
            {"number": 43, "name": "D43", "displayName": "GPIO43", "hasPWM": True, "hasServo": True},
            {"number": 44, "name": "D44", "displayName": "GPIO44", "hasPWM": True, "hasServo": True},
            {"number": 45, "name": "D45", "displayName": "GPIO45", "hasPWM": True, "hasServo": True},
            {"number": 46, "name": "D46", "displayName": "GPIO46", "hasPWM": True, "hasServo": True}
        ],
        "analogPins": [
            {"name": "A0", "displayName": "ADC1_CH0", "direction": "INPUT"},
            {"name": "A1", "displayName": "ADC1_CH1", "direction": "INPUT"},
            {"name": "A2", "displayName": "ADC1_CH2", "direction": "INPUT"},
            {"name": "A3", "displayName": "ADC1_CH3", "direction": "INPUT"},
            {"name": "A4", "displayName": "ADC1_CH4", "direction": "INPUT"},
            {"name": "A5", "displayName": "ADC1_CH5", "direction": "INPUT"},
            {"name": "A6", "displayName": "ADC1_CH6", "direction": "INPUT"},
            {"name": "A7", "displayName": "ADC1_CH7", "direction": "INPUT"},
            {"name": "A8", "displayName": "ADC1_CH8", "direction": "INPUT"},
            {"name": "A9", "displayName": "ADC1_CH9", "direction": "INPUT"}
        ],
        "defaultI2C": {
            "i2cPortId": 0,
            "SCL": "D9",
            "SDA": "D8"
        },
        "image": None
    }
    
    # Generic ESP32-S3 based board
    boards["generic-esp32-s3"] = {
        "boardName": "Generic ESP32-S3",
        "mcuName": "ESP32-S3",
        "referenceVoltage": 3.3,
        "displayName": "Generic ESP32-S3 Board",
        "vendor": "Generic",
        "productURL": "",
        "documentationURL": "",
        "totalGPIOPins": 48,
        "totalAnalogPins": 20,
        "pins": [
            {"number": 1, "name": "D1", "displayName": "GPIO1", "hasPWM": True, "hasServo": True},
            {"number": 2, "name": "D2", "displayName": "GPIO2", "hasPWM": True, "hasServo": True},
            {"number": 3, "name": "D3", "displayName": "GPIO3", "hasPWM": True, "hasServo": True},
            {"number": 4, "name": "D4", "displayName": "GPIO4", "hasPWM": True, "hasServo": True},
            {"number": 5, "name": "D5", "displayName": "GPIO5", "hasPWM": True, "hasServo": True},
            {"number": 6, "name": "D6", "displayName": "GPIO6", "hasPWM": True, "hasServo": True},
            {"number": 7, "name": "D7", "displayName": "GPIO7", "hasPWM": True, "hasServo": True},
            {"number": 8, "name": "D8", "displayName": "GPIO8", "hasPWM": True, "hasServo": True},
            {"number": 9, "name": "D9", "displayName": "GPIO9", "hasPWM": True, "hasServo": True},
            {"number": 10, "name": "D10", "displayName": "GPIO10", "hasPWM": True, "hasServo": True},
            {"number": 11, "name": "D11", "displayName": "GPIO11", "hasPWM": True, "hasServo": True},
            {"number": 12, "name": "D12", "displayName": "GPIO12", "hasPWM": True, "hasServo": True},
            {"number": 13, "name": "D13", "displayName": "GPIO13", "hasPWM": True, "hasServo": True},
            {"number": 14, "name": "D14", "displayName": "GPIO14", "hasPWM": True, "hasServo": True},
            {"number": 15, "name": "D15", "displayName": "GPIO15", "hasPWM": True, "hasServo": True},
            {"number": 16, "name": "D16", "displayName": "GPIO16", "hasPWM": True, "hasServo": True},
            {"number": 17, "name": "D17", "displayName": "GPIO17", "hasPWM": True, "hasServo": True},
            {"number": 18, "name": "D18", "displayName": "GPIO18", "hasPWM": True, "hasServo": True},
            {"number": 19, "name": "D19", "displayName": "GPIO19", "hasPWM": True, "hasServo": True},
            {"number": 20, "name": "D20", "displayName": "GPIO20", "hasPWM": True, "hasServo": True},
            {"number": 21, "name": "D21", "displayName": "GPIO21", "hasPWM": True, "hasServo": True},
            {"number": 35, "name": "D35", "displayName": "GPIO35", "hasPWM": True, "hasServo": True},
            {"number": 36, "name": "D36", "displayName": "GPIO36", "hasPWM": True, "hasServo": True},
            {"number": 37, "name": "D37", "displayName": "GPIO37", "hasPWM": True, "hasServo": True},
            {"number": 38, "name": "D38", "displayName": "GPIO38", "hasPWM": True, "hasServo": True},
            {"number": 39, "name": "D39", "displayName": "GPIO39", "hasPWM": True, "hasServo": True},
            {"number": 40, "name": "D40", "displayName": "GPIO40", "hasPWM": True, "hasServo": True},
            {"number": 41, "name": "D41", "displayName": "GPIO41", "hasPWM": True, "hasServo": True},
            {"number": 42, "name": "D42", "displayName": "GPIO42", "hasPWM": True, "hasServo": True},
            {"number": 43, "name": "D43", "displayName": "GPIO43", "hasPWM": True, "hasServo": True},
            {"number": 44, "name": "D44", "displayName": "GPIO44", "hasPWM": True, "hasServo": True},
            {"number": 45, "name": "D45", "displayName": "GPIO45", "hasPWM": True, "hasServo": True},
            {"number": 46, "name": "D46", "displayName": "GPIO46", "hasPWM": True, "hasServo": True},
            {"number": 47, "name": "D47", "displayName": "GPIO47", "hasPWM": True, "hasServo": True},
            {"number": 48, "name": "D48", "displayName": "GPIO48", "hasPWM": True, "hasServo": True}
        ],
        "analogPins": [
            {"name": "A0", "displayName": "ADC1_CH0", "direction": "INPUT"},
            {"name": "A1", "displayName": "ADC1_CH1", "direction": "INPUT"},
            {"name": "A2", "displayName": "ADC1_CH2", "direction": "INPUT"},
            {"name": "A3", "displayName": "ADC1_CH3", "direction": "INPUT"},
            {"name": "A4", "displayName": "ADC1_CH4", "direction": "INPUT"},
            {"name": "A5", "displayName": "ADC1_CH5", "direction": "INPUT"},
            {"name": "A6", "displayName": "ADC1_CH6", "direction": "INPUT"},
            {"name": "A7", "displayName": "ADC1_CH7", "direction": "INPUT"},
            {"name": "A8", "displayName": "ADC1_CH8", "direction": "INPUT"},
            {"name": "A9", "displayName": "ADC1_CH9", "direction": "INPUT"}
        ],
        "defaultI2C": {
            "i2cPortId": 0,
            "SCL": "D9",
            "SDA": "D8"
        },
        "image": None
    }
    
    # Generic RP2040 based board
    boards["generic-rp2040"] = {
        "boardName": "Generic RP2040",
        "mcuName": "RP2040",
        "referenceVoltage": 3.3,
        "displayName": "Generic RP2040 Board",
        "vendor": "Generic",
        "productURL": "",
        "documentationURL": "",
        "totalGPIOPins": 30,
        "totalAnalogPins": 4,
        "pins": [
            {"number": 0, "name": "D0", "displayName": "GPIO0", "hasPWM": True, "hasServo": True},
            {"number": 1, "name": "D1", "displayName": "GPIO1", "hasPWM": True, "hasServo": True},
            {"number": 2, "name": "D2", "displayName": "GPIO2", "hasPWM": True, "hasServo": True},
            {"number": 3, "name": "D3", "displayName": "GPIO3", "hasPWM": True, "hasServo": True},
            {"number": 4, "name": "D4", "displayName": "GPIO4", "hasPWM": True, "hasServo": True},
            {"number": 5, "name": "D5", "displayName": "GPIO5", "hasPWM": True, "hasServo": True},
            {"number": 6, "name": "D6", "displayName": "GPIO6", "hasPWM": True, "hasServo": True},
            {"number": 7, "name": "D7", "displayName": "GPIO7", "hasPWM": True, "hasServo": True},
            {"number": 8, "name": "D8", "displayName": "GPIO8", "hasPWM": True, "hasServo": True},
            {"number": 9, "name": "D9", "displayName": "GPIO9", "hasPWM": True, "hasServo": True},
            {"number": 10, "name": "D10", "displayName": "GPIO10", "hasPWM": True, "hasServo": True},
            {"number": 11, "name": "D11", "displayName": "GPIO11", "hasPWM": True, "hasServo": True},
            {"number": 12, "name": "D12", "displayName": "GPIO12", "hasPWM": True, "hasServo": True},
            {"number": 13, "name": "D13", "displayName": "GPIO13", "hasPWM": True, "hasServo": True},
            {"number": 14, "name": "D14", "displayName": "GPIO14", "hasPWM": True, "hasServo": True},
            {"number": 15, "name": "D15", "displayName": "GPIO15", "hasPWM": True, "hasServo": True},
            {"number": 16, "name": "D16", "displayName": "GPIO16", "hasPWM": True, "hasServo": True},
            {"number": 17, "name": "D17", "displayName": "GPIO17", "hasPWM": True, "hasServo": True},
            {"number": 18, "name": "D18", "displayName": "GPIO18", "hasPWM": True, "hasServo": True},
            {"number": 19, "name": "D19", "displayName": "GPIO19", "hasPWM": True, "hasServo": True},
            {"number": 20, "name": "D20", "displayName": "GPIO20", "hasPWM": True, "hasServo": True},
            {"number": 21, "name": "D21", "displayName": "GPIO21", "hasPWM": True, "hasServo": True},
            {"number": 22, "name": "D22", "displayName": "GPIO22", "hasPWM": True, "hasServo": True},
            {"number": 23, "name": "D23", "displayName": "GPIO23", "hasPWM": True, "hasServo": True},
            {"number": 24, "name": "D24", "displayName": "GPIO24", "hasPWM": True, "hasServo": True},
            {"number": 25, "name": "D25", "displayName": "GPIO25", "hasPWM": True, "hasServo": True},
            {"number": 26, "name": "D26", "displayName": "GPIO26", "hasPWM": True, "hasServo": True},
            {"number": 27, "name": "D27", "displayName": "GPIO27", "hasPWM": True, "hasServo": True},
            {"number": 28, "name": "D28", "displayName": "GPIO28", "hasPWM": True, "hasServo": True},
            {"number": 29, "name": "D29", "displayName": "GPIO29", "hasPWM": True, "hasServo": True}
        ],
        "analogPins": [
            {"name": "A0", "displayName": "ADC0", "direction": "INPUT"},
            {"name": "A1", "displayName": "ADC1", "direction": "INPUT"},
            {"name": "A2", "displayName": "ADC2", "direction": "INPUT"},
            {"name": "A3", "displayName": "ADC3", "direction": "INPUT"}
        ],
        "defaultI2C": {
            "i2cPortId": 0,
            "SCL": "D3",
            "SDA": "D2"
        },
        "image": None
    }
    
    # Generic RP23xx based board
    boards["generic-rp23xx"] = {
        "boardName": "Generic RP23xx",
        "mcuName": "RP23xx",
        "referenceVoltage": 3.3,
        "displayName": "Generic RP23xx Board",
        "vendor": "Generic",
        "productURL": "",
        "documentationURL": "",
        "totalGPIOPins": 30,
        "totalAnalogPins": 4,
        "pins": [
            {"number": 0, "name": "D0", "displayName": "GPIO0", "hasPWM": True, "hasServo": True},
            {"number": 1, "name": "D1", "displayName": "GPIO1", "hasPWM": True, "hasServo": True},
            {"number": 2, "name": "D2", "displayName": "GPIO2", "hasPWM": True, "hasServo": True},
            {"number": 3, "name": "D3", "displayName": "GPIO3", "hasPWM": True, "hasServo": True},
            {"number": 4, "name": "D4", "displayName": "GPIO4", "hasPWM": True, "hasServo": True},
            {"number": 5, "name": "D5", "displayName": "GPIO5", "hasPWM": True, "hasServo": True},
            {"number": 6, "name": "D6", "displayName": "GPIO6", "hasPWM": True, "hasServo": True},
            {"number": 7, "name": "D7", "displayName": "GPIO7", "hasPWM": True, "hasServo": True},
            {"number": 8, "name": "D8", "displayName": "GPIO8", "hasPWM": True, "hasServo": True},
            {"number": 9, "name": "D9", "displayName": "GPIO9", "hasPWM": True, "hasServo": True},
            {"number": 10, "name": "D10", "displayName": "GPIO10", "hasPWM": True, "hasServo": True},
            {"number": 11, "name": "D11", "displayName": "GPIO11", "hasPWM": True, "hasServo": True},
            {"number": 12, "name": "D12", "displayName": "GPIO12", "hasPWM": True, "hasServo": True},
            {"number": 13, "name": "D13", "displayName": "GPIO13", "hasPWM": True, "hasServo": True},
            {"number": 14, "name": "D14", "displayName": "GPIO14", "hasPWM": True, "hasServo": True},
            {"number": 15, "name": "D15", "displayName": "GPIO15", "hasPWM": True, "hasServo": True},
            {"number": 16, "name": "D16", "displayName": "GPIO16", "hasPWM": True, "hasServo": True},
            {"number": 17, "name": "D17", "displayName": "GPIO17", "hasPWM": True, "hasServo": True},
            {"number": 18, "name": "D18", "displayName": "GPIO18", "hasPWM": True, "hasServo": True},
            {"number": 19, "name": "D19", "displayName": "GPIO19", "hasPWM": True, "hasServo": True},
            {"number": 20, "name": "D20", "displayName": "GPIO20", "hasPWM": True, "hasServo": True},
            {"number": 21, "name": "D21", "displayName": "GPIO21", "hasPWM": True, "hasServo": True},
            {"number": 22, "name": "D22", "displayName": "GPIO22", "hasPWM": True, "hasServo": True},
            {"number": 23, "name": "D23", "displayName": "GPIO23", "hasPWM": True, "hasServo": True},
            {"number": 24, "name": "D24", "displayName": "GPIO24", "hasPWM": True, "hasServo": True},
            {"number": 25, "name": "D25", "displayName": "GPIO25", "hasPWM": True, "hasServo": True},
            {"number": 26, "name": "D26", "displayName": "GPIO26", "hasPWM": True, "hasServo": True},
            {"number": 27, "name": "D27", "displayName": "GPIO27", "hasPWM": True, "hasServo": True},
            {"number": 28, "name": "D28", "displayName": "GPIO28", "hasPWM": True, "hasServo": True},
            {"number": 29, "name": "D29", "displayName": "GPIO29", "hasPWM": True, "hasServo": True}
        ],
        "analogPins": [
            {"name": "A0", "displayName": "ADC0", "direction": "INPUT"},
            {"name": "A1", "displayName": "ADC1", "direction": "INPUT"},
            {"name": "A2", "displayName": "ADC2", "direction": "INPUT"},
            {"name": "A3", "displayName": "ADC3", "direction": "INPUT"}
        ],
        "defaultI2C": {
            "i2cPortId": 0,
            "SCL": "D3",
            "SDA": "D2"
        },
        "image": None
    }
    
    # Adafruit Metro RP2350 with SD card
    boards["metro-rp2350-sd"] = {
        "boardName": "Adafruit Metro RP2350",
        "mcuName": "RP2350",
        "referenceVoltage": 3.3,
        "displayName": "Adafruit Metro RP2350 (with SD card)",
        "vendor": "Adafruit",
        "productURL": "https://www.adafruit.com/product/5786",
        "documentationURL": "https://learn.adafruit.com/adafruit-metro-rp2350",
        "totalGPIOPins": 30,
        "totalAnalogPins": 4,
        "pins": [
            {"number": 0, "name": "D0", "displayName": "GPIO0", "hasPWM": True, "hasServo": True},
            {"number": 1, "name": "D1", "displayName": "GPIO1", "hasPWM": True, "hasServo": True},
            {"number": 2, "name": "D2", "displayName": "GPIO2", "hasPWM": True, "hasServo": True},
            {"number": 3, "name": "D3", "displayName": "GPIO3", "hasPWM": True, "hasServo": True},
            {"number": 4, "name": "D4", "displayName": "GPIO4", "hasPWM": True, "hasServo": True},
            {"number": 5, "name": "D5", "displayName": "GPIO5", "hasPWM": True, "hasServo": True},
            {"number": 6, "name": "D6", "displayName": "GPIO6", "hasPWM": True, "hasServo": True},
            {"number": 7, "name": "D7", "displayName": "GPIO7", "hasPWM": True, "hasServo": True},
            {"number": 8, "name": "D8", "displayName": "GPIO8", "hasPWM": True, "hasServo": True},
            {"number": 9, "name": "D9", "displayName": "GPIO9", "hasPWM": True, "hasServo": True},
            {"number": 10, "name": "D10", "displayName": "GPIO10 (SD CS)", "hasPWM": True, "hasServo": True},
            {"number": 11, "name": "D11", "displayName": "GPIO11", "hasPWM": True, "hasServo": True},
            {"number": 12, "name": "D12", "displayName": "GPIO12", "hasPWM": True, "hasServo": True},
            {"number": 13, "name": "D13", "displayName": "GPIO13", "hasPWM": True, "hasServo": True},
            {"number": 14, "name": "D14", "displayName": "GPIO14", "hasPWM": True, "hasServo": True},
            {"number": 15, "name": "D15", "displayName": "GPIO15", "hasPWM": True, "hasServo": True},
            {"number": 16, "name": "D16", "displayName": "GPIO16", "hasPWM": True, "hasServo": True},
            {"number": 17, "name": "D17", "displayName": "GPIO17", "hasPWM": True, "hasServo": True},
            {"number": 18, "name": "D18", "displayName": "GPIO18", "hasPWM": True, "hasServo": True},
            {"number": 19, "name": "D19", "displayName": "GPIO19", "hasPWM": True, "hasServo": True},
            {"number": 20, "name": "D20", "displayName": "GPIO20", "hasPWM": True, "hasServo": True},
            {"number": 21, "name": "D21", "displayName": "GPIO21", "hasPWM": True, "hasServo": True},
            {"number": 22, "name": "D22", "displayName": "GPIO22", "hasPWM": True, "hasServo": True},
            {"number": 23, "name": "D23", "displayName": "GPIO23", "hasPWM": True, "hasServo": True},
            {"number": 24, "name": "D24", "displayName": "GPIO24", "hasPWM": True, "hasServo": True},
            {"number": 25, "name": "D25", "displayName": "GPIO25", "hasPWM": True, "hasServo": True},
            {"number": 26, "name": "D26", "displayName": "GPIO26", "hasPWM": True, "hasServo": True},
            {"number": 27, "name": "D27", "displayName": "GPIO27", "hasPWM": True, "hasServo": True},
            {"number": 28, "name": "D28", "displayName": "GPIO28", "hasPWM": True, "hasServo": True},
            {"number": 29, "name": "D29", "displayName": "GPIO29", "hasPWM": True, "hasServo": True}
        ],
        "analogPins": [
            {"name": "A0", "displayName": "ADC0", "direction": "INPUT"},
            {"name": "A1", "displayName": "ADC1", "direction": "INPUT"},
            {"name": "A2", "displayName": "ADC2", "direction": "INPUT"},
            {"name": "A3", "displayName": "ADC3", "direction": "INPUT"}
        ],
        "defaultI2C": {
            "i2cPortId": 0,
            "SCL": "D3",
            "SDA": "D2"
        },
        "sdCardCS": 10,
        "image": None
    }
    
    return boards

def convert_boards_to_json():
    """
    Convert all board definition.json files into a single JSON file
    that can be used in the Wippersnapper Configuration Builder.
    """
    boards = {}
    
    # Get all board directories
    board_dirs = [d for d in os.listdir(BOARDS_DIR) if os.path.isdir(os.path.join(BOARDS_DIR, d)) and not d.startswith('.')]
    
    for board_dir in board_dirs:
        board_path = os.path.join(BOARDS_DIR, board_dir)
        definition_file = os.path.join(board_path, "definition.json")
        
        # Skip if the definition.json doesn't exist
        if not os.path.exists(definition_file):
            print(f"Skipping {board_dir} - No definition.json found")
            continue
        
        try:
            # Read the definition.json file
            with open(definition_file, 'r') as f:
                board_data = json.load(f)
            
            # Extract relevant information
            board_info = {
                "boardName": board_data.get("boardName"),
                "mcuName": board_data.get("mcuName"),
                "referenceVoltage": board_data.get("mcuRefVoltage", 3.3),
                "displayName": board_data.get("displayName"),
                "vendor": board_data.get("vendor"),
                "productURL": board_data.get("productURL", ""),
                "documentationURL": board_data.get("documentationURL", ""),
                "pins": [],
                "analogPins": [],
                "defaultI2C": {},
                "image": None
            }
            
            # Get pins
            if "components" in board_data and "digitalPins" in board_data["components"]:
                for pin in board_data["components"]["digitalPins"]:
                    # Extract the numeric part of the pin name (e.g., "D13" -> 13)
                    pin_name = pin.get("name", "")
                    if pin_name.startswith("D"):
                        try:
                            pin_number = int(pin_name[1:])
                            board_info["pins"].append({
                                "number": pin_number,
                                "name": pin_name,
                                "displayName": pin.get("displayName", pin_name),
                                "hasPWM": pin.get("hasPWM", False),
                                "hasServo": pin.get("hasServo", False)
                            })
                        except ValueError:
                            print(f"Skipping pin {pin_name} - Cannot parse pin number")
            
            # Get analog pins
            if "components" in board_data and "analogPins" in board_data["components"]:
                analog_count = 0
                for pin in board_data["components"]["analogPins"]:
                    pin_name = pin.get("name", "")
                    board_info["analogPins"].append({
                        "name": pin_name,
                        "displayName": pin.get("displayName", pin_name),
                        "direction": pin.get("direction", "INPUT")
                    })
                    analog_count += 1
                board_info["totalAnalogPins"] = analog_count
            
            # Get I2C ports
            if "components" in board_data and "i2cPorts" in board_data["components"]:
                i2c_ports = board_data["components"]["i2cPorts"]
                if i2c_ports and len(i2c_ports) > 0:
                    default_i2c = i2c_ports[0]  # Use the first I2C port as default
                    board_info["defaultI2C"] = {
                        "i2cPortId": default_i2c.get("i2cPortId", 0),
                        "SCL": default_i2c.get("SCL"),
                        "SDA": default_i2c.get("SDA")
                    }
                    
                    # Store all I2C ports
                    board_info["i2cPorts"] = i2c_ports
            
            # Count total GPIO pins
            board_info["totalGPIOPins"] = len(board_info["pins"])
            
            # Look for an image file
            image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg']
            for ext in image_extensions:
                image_file = os.path.join(board_path, f"image{ext}")
                if os.path.exists(image_file):
                    # Store relative path to image
                    board_info["image"] = f"boards/{board_dir}/image{ext}"
                    break
            
            # Add to boards dictionary
            boards[board_dir] = board_info
            print(f"Processed {board_dir}")
            
        except Exception as e:
            print(f"Error processing {board_dir}: {str(e)}")
    
    # Add custom board definitions
    boards = add_custom_board_definitions(boards)
    
    # Write the consolidated JSON file
    with open(OUTPUT_FILE, 'w') as f:
        json.dump({"boards": boards}, f, indent=2)
    
    print(f"Successfully created {OUTPUT_FILE} with {len(boards)} boards")
    return boards

# Execute the function
if __name__ == "__main__":
    boards = convert_boards_to_json()
    print(f"Converted {len(boards)} board definitions")
