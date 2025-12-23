
// --- START OF FILE actionRecorder.js ---
import { state } from './state.js';

/**
 * Records a user action to the action history.
 * This is the foundation for a replay/undo system.
 * @param {string} type - The type of action (e.g., 'FINISH_POLYGON', 'MOVE_OBJECT').
 * @param {object} payload - The data associated with the action.
 */
export function recordAction(type, payload) {
    // To keep the payload serializable, we should avoid storing full fabric objects directly.
    // For example, instead of the object itself, store its ID and the new properties.
    // For simplicity in this scaffolding, we'll stringify parts of it.
    
    const serializablePayload = JSON.parse(JSON.stringify(payload));

    state.actionHistory.push({
        timestamp: Date.now(),
        type,
        payload: serializablePayload
    });

    // In a full implementation, you might also want to manage an undo/redo stack here.
    // console.log('Action Recorded:', { type, payload });
}
// --- END OF FILE actionRecorder.js