# Adafruit Wippersnapper Offline Configurator
This web page is for the creation / amending of `config.json` files to support the free and open-source Adafruit "Wippersnapper" Offline Data Logger firmware.

It allows users to select their microcontroller board, automatically (or manually) setup the Real Time Clock (RTC) and an SD card Chip Select pin (uses default SPI bus), or any companion boards with SD cards and/or RTCs, and then the attached components (sensors, analog pins, etc) for data logging.

The page can also be used offline by including the javascript (.js) files, ideally minified (180k > 60k), and index.html (i.e. copy to your device or SD card)


Visit the site here:
[https://adafruit.github.io/Adafruit_Wippersnapper_Offline_Configurator/](https://adafruit.github.io/Adafruit_Wippersnapper_Offline_Configurator/)

See this Learn Guide for more info on using Adafruit Wippersnapper Firmware (offline mode) as a Data Logger, which also has the **Supported Hardware** page:
[No-Code Offline Data Logger with WipperSnapper](https://learn.adafruit.com/no-code-offline-data-logging-with-wippersnapper/)

## Development
We gratefully accept pull-requests and issues (open-source ❤️) although the main [Wippersnapper repository](https://github.com/adafruit/Adafruit_Wippersnapper_Arduino/issues) is better suited for issues (or the [boards](https://github.com/adafruit/Wippersnapper_Boards) or [components](https://github.com/adafruit/Wippersnapper_Components) repos), as this is a stop-gap solution until the main Adafruit IO website performs the desired functionality (Wippersnapper v2), but it has proven useful so maybe will continue to do so.

If you wish to play with the website design / functionality then the main files to edit are:
* index.html
* load-wippersnapper-data.js
* wippersnapper-config-builder.js

The remaining files are involved in updating automatically generated board and component definitions.

#### Adding new components / boards / companion boards / RTCs

If you wish to add companion boards then those are manually defined (search featherwing), but boards and components should be added to Wippersnapper to be picked up automatically.
If you wish to add new RTCs, they must first be added to the offline firmware, and then we/you can add the RTC to the web interface. The repositories are linked above.

#### Running the board+component+firmware fetching/conversion process

To recreate the build process, which processes the boards+component definitions and fetches images + firmware versions, you'll need python installed (and pip) and then to install the requirements:
```shell
pip install -r requirements.txt
```
Then before running you'll need to initialise the submodules with git (or download the submodules and unzip manually)
```shell
git submodule update --init
```

Finally run the convert script:
```shell
python ./convert_all_wippersnapper_definitions.py
```

And you should see output like this:
```
=== Conversion Complete ===
Converted 23 boards and 98 components
Time taken: 24.39 seconds
Output files:
  - C:\dev\js\Adafruit_Wippersnapper_Offline_Configurator\wippersnapper_boards.json
  - C:\dev\js\Adafruit_Wippersnapper_Offline_Configurator\wippersnapper_components.json
  - C:\dev\js\Adafruit_Wippersnapper_Offline_Configurator\firmware-data.js
```

That will have replaced the following files:
* wippersnapper_boards.js + .json
* wippersnapper_components.js + .json
* firmware-data.js


## Attribution
Written by Tyeth Gundry (with some "assistance"🤦 from Claude3.7/Copilot/GPT4), for Adafruit Industries.

Adafruit invests time and resources providing this open source code,
please support Adafruit and open-source hardware by purchasing
products from Adafruit!
