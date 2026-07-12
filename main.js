'use strict';

const utils = require('./lib/utils');
const adapter = new utils.Adapter('countdowntimer');

// Timer-Laufzeitverwaltung
let timersRuntime = {}; // { index: { endTime, interval, triggerDP } }

// ------------------------------------------------------------
// Adapter ready
// ------------------------------------------------------------
adapter.on('ready', () => {
    adapter.log.info('CountdownTimer Adapter gestartet');
    initObjects();
    subscribeTriggers();
});

// ------------------------------------------------------------
// State Change Listener
// ------------------------------------------------------------
adapter.on('stateChange', (id, state) => {
    if (!state) return;

    const timers = adapter.config.timers || [];

    timers.forEach((t, index) => {
        const dp = resolveTriggerDP(t, index);
        if (!dp || !t.timerActive) return;

        if (id === dp && state.val) {
            startTimer(index, t, dp);
        }
    });
});

// ------------------------------------------------------------
// Adapter unload
// ------------------------------------------------------------
adapter.on('unload', () => {
    Object.values(timersRuntime).forEach(rt => {
        if (rt && rt.interval) clearInterval(rt.interval);
    });
});

// ------------------------------------------------------------
// Trigger-Datenpunkt ermitteln oder neu anlegen
// ------------------------------------------------------------
function resolveTriggerDP(timerConfig, index) {
    // 1. Custom DP hat Vorrang
    if (timerConfig.triggerDP_custom && timerConfig.triggerDP_custom.trim() !== '') {
        const dp = `timer.${index}.trigger`;

        adapter.setObjectNotExists(dp, {
            type: 'state',
            common: {
                name: `Trigger für ${timerConfig.timerName}`,
                type: 'boolean',
                role: 'switch',
                read: true,
                write: true
            },
            native: {}
        });

        return dp;
    }

    // 2. Vorhandener DP
    if (timerConfig.triggerDP_select && timerConfig.triggerDP_select.trim() !== '') {
        return timerConfig.triggerDP_select;
    }

    return null;
}

// ------------------------------------------------------------
// Datenpunkte für alle Timer anlegen
// ------------------------------------------------------------
function initObjects() {
    const timers = adapter.config.timers || [];

    timers.forEach((t, index) => {
        const base = `timer.${index}`;

        adapter.setObjectNotExists(base, {
            type: 'channel',
            common: { name: t.timerName || `Timer ${index + 1}` },
            native: {}
        });

        adapter.setObjectNotExists(`${base}.timerName`, {
            type: 'state',
            common: { name: 'Timer Name', type: 'string', role: 'text', read: true, write: false },
            native: {}
        });

        adapter.setObjectNotExists(`${base}.timerActive`, {
            type: 'state',
            common: { name: 'Timer aktiv', type: 'boolean', role: 'switch', read: true, write: false },
            native: {}
        });

        adapter.setObjectNotExists(`${base}.triggerDP`, {
            type: 'state',
            common: { name: 'Trigger Datenpunkt', type: 'string', role: 'text', read: true, write: false },
            native: {}
        });

        adapter.setObjectNotExists(`${base}.triggerType`, {
            type: 'state',
            common: { name: 'Trigger Typ', type: 'string', role: 'text', read: true, write: false },
            native: {}
        });

        adapter.setObjectNotExists(`${base}.duration`, {
            type: 'state',
            common: { name: 'Dauer (Minuten)', type: 'number', role: 'value', read: true, write: false },
            native: {}
        });

        adapter.setObjectNotExists(`${base}.resttime`, {
            type: 'state',
            common: { name: 'Restzeit (Sekunden)', type: 'number', role: 'value', read: true, write: false },
            native: {}
        });

        adapter.setObjectNotExists(`${base}.status`, {
            type: 'state',
            common: { name: 'Timer läuft', type: 'boolean', role: 'indicator', read: true, write: false },
            native: {}
        });

        // Initialwerte setzen
        adapter.setState(`${base}.timerName`, t.timerName || `Timer ${index + 1}`, true);
        adapter.setState(`${base}.timerActive`, !!t.timerActive, true);
        adapter.setState(`${base}.triggerDP`, t.triggerDP_select || t.triggerDP_custom || '', true);
        adapter.setState(`${base}.triggerType`, t.triggerType || 'button', true);
        adapter.setState(`${base}.duration`, t.duration || 5, true);
        adapter.setState(`${base}.resttime`, 0, true);
        adapter.setState(`${base}.status`, false, true);
    });
}

// ------------------------------------------------------------
// Trigger abonnieren
// ------------------------------------------------------------
function subscribeTriggers() {
    const timers = adapter.config.timers || [];

    timers.forEach((t, index) => {
        const dp = resolveTriggerDP(t, index);
        if (dp) {
            adapter.subscribeForeignStates(dp);
            adapter.log.info(`Trigger abonniert: ${dp}`);
        }
    });
}

// ------------------------------------------------------------
// Timer starten
// ------------------------------------------------------------
function startTimer(index, timerConfig, dp) {
    const base = `timer.${index}`;

    if (!timerConfig.duration || timerConfig.duration <= 0) {
        adapter.log.warn(`Timer ${index}: ungültige Dauer`);
        return;
    }

    adapter.log.info(`Timer ${index} gestartet (${timerConfig.timerName})`);

    const durationMs = timerConfig.duration * 60 * 1000;
    const endTime = Date.now() + durationMs;

    // Button: direkt auf false setzen
    if (timerConfig.triggerType === 'button') {
        adapter.setForeignState(dp, false, true);
    }

    adapter.setState(`${base}.status`, true, true);

    // alten Interval stoppen
    if (timersRuntime[index] && timersRuntime[index].interval) {
        clearInterval(timersRuntime[index].interval);
    }

    const interval = setInterval(() => {
        const rest = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
        adapter.setState(`${base}.resttime`, rest, true);

        if (rest <= 0) {
            stopTimer(index, timerConfig, dp);
        }
    }, 1000);

    timersRuntime[index] = { endTime, interval, triggerDP: dp };
}

// ------------------------------------------------------------
// Timer stoppen
// ------------------------------------------------------------
function stopTimer(index, timerConfig, dp) {
    const base = `timer.${index}`;

    adapter.log.info(`Timer ${index} abgelaufen`);

    if (timersRuntime[index] && timersRuntime[index].interval) {
        clearInterval(timersRuntime[index].interval);
    }
    timersRuntime[index] = null;

    adapter.setState(`${base}.status`, false, true);
    adapter.setState(`${base}.resttime`, 0, true);

    // Switch: nach Ablauf ausschalten
    if (timerConfig.triggerType === 'switch') {
        adapter.setForeignState(dp, false, true);
    }
}
