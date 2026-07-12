# ioBroker.countdowntimer

Mehrere Countdown-Timer für ioBroker, konfigurierbar über Admin-JSON.

## Features

- Beliebig viele Timer über Tabelle im Admin
- Trigger-Typ: Button oder Switch
- Restzeit und Status als Datenpunkte pro Timer

## Struktur der Datenpunkte

- `countdowntimer.<instanz>.timer.<index>.timerName`
- `countdowntimer.<instanz>.timer.<index>.timerActive`
- `countdowntimer.<instanz>.timer.<index>.triggerDP`
- `countdowntimer.<instanz>.timer.<index>.triggerType`
- `countdowntimer.<instanz>.timer.<index>.duration`
- `countdowntimer.<instanz>.timer.<index>.resttime`
- `countdowntimer.<instanz>.timer.<index>.status`

## Installation

1. Ordner `iobroker.countdowntimer` mit dieser Struktur anlegen  
2. Als ZIP packen (`iobroker.countdowntimer.zip`)  
3. Im ioBroker-Admin als eigene Adapterquelle installieren  
4. Instanz anlegen und Timer im Admin konfigurieren

